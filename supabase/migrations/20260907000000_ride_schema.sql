-- RIDE v1: photo/LPR car-rider dismissal queue (t_b11cfea2).
-- Hermes owns SQL apply. Additive only. Do NOT apply from the bot.
-- Laws: L1–L12, C-09..H-10, RIDE-S1-01…21. No placard/GPS/auto-release.
-- Duty wall (not is_staff). No client INSERT of order/seq. Token /parent deny. Student deny.
-- LPR never inserts people. Parent fail copy has no reason. Success XX only (no total).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.dismissal_lines (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.parent_vehicles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  plate_raw text not null,
  plate_norm text not null,
  make text,
  model text,
  label text,
  source text not null default 'parent'
    check (source in ('parent', 'staff')),
  status text not null default 'active'
    check (status in ('active', 'void')),
  validity_kind text not null default 'indefinite'
    check (validity_kind in ('today', 'range', 'indefinite')),
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz,
  constraint parent_vehicles_range_ok check (
    validity_kind <> 'range'
    or (valid_from is not null and valid_to is not null and valid_from <= valid_to)
  ),
  constraint parent_vehicles_today_ok check (
    validity_kind <> 'today' or valid_from is not null
  )
);

create index if not exists parent_vehicles_school_plate_idx
  on public.parent_vehicles (school_id, plate_norm)
  where status = 'active';

create index if not exists parent_vehicles_parent_idx
  on public.parent_vehicles (parent_id)
  where status = 'active';

create table if not exists public.pickup_restrictions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  parent_id uuid references public.parents (id) on delete cascade,
  vehicle_id uuid references public.parent_vehicles (id) on delete set null,
  reason text,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pickup_restrictions_lookup_idx
  on public.pickup_restrictions (school_id, student_id, parent_id)
  where active;

create table if not exists public.dismissal_duty (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  duty_role text not null check (duty_role in ('curb', 'stage')),
  line_id uuid references public.dismissal_lines (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, profile_id, duty_role, line_id)
);

create index if not exists dismissal_duty_profile_idx
  on public.dismissal_duty (profile_id)
  where active;

create table if not exists public.line_photos (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  line_id uuid not null references public.dismissal_lines (id) on delete cascade,
  school_date date not null,
  storage_path text not null,
  asset_id uuid references public.assets (id) on delete set null,
  kind text not null
    check (kind in ('parent_ahead', 'parent_first', 'staff_walk')),
  staff_seq integer,
  walk_id uuid,
  plate_raw text,
  plate_norm text,
  plate_source text
    check (plate_source is null or plate_source in ('lpr', 'typed', 'stt', 'unknown')),
  unreadable boolean not null default false,
  unknown_flag boolean not null default false,
  ahead_vehicle_id uuid references public.parent_vehicles (id) on delete set null,
  captured_by uuid references public.profiles (id) on delete set null,
  parent_id uuid references public.parents (id) on delete set null,
  archived_at timestamptz,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint line_photos_staff_seq_ok check (
    kind <> 'staff_walk' or staff_seq is not null
  )
);

create index if not exists line_photos_line_day_idx
  on public.line_photos (school_id, line_id, school_date, occurred_at);

create index if not exists line_photos_purge_idx
  on public.line_photos (school_date, archived_at);

create table if not exists public.queue_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  line_id uuid not null references public.dismissal_lines (id) on delete cascade,
  school_date date not null,
  kind text not null
    check (kind in (
      'check_in', 'im_first', 'ahead_insert', 'staff_place', 'order_fix',
      'left', 'released', 'nudge', 'restrict_block', 'attach_vehicle',
      'plate_typed', 'plate_stt', 'conflict_first'
    )),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  parent_id uuid references public.parents (id) on delete set null,
  student_ids uuid[] not null default '{}',
  vehicle_id uuid references public.parent_vehicles (id) on delete set null,
  ahead_vehicle_id uuid references public.parent_vehicles (id) on delete set null,
  line_photo_id uuid references public.line_photos (id) on delete set null,
  position_xx integer,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists queue_events_line_day_idx
  on public.queue_events (school_id, line_id, school_date, occurred_at);

create index if not exists queue_events_parent_day_idx
  on public.queue_events (parent_id, school_date, occurred_at)
  where parent_id is not null;

create index if not exists queue_events_purge_idx
  on public.queue_events (school_date);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.ride_plate_norm(p_raw text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_raw, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.ride_school_date()
returns date
language sql
stable
as $$
  select (timezone('America/Chicago', now()))::date;
$$;

create or replace function public.ride_my_parent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select parent_id from public.profiles where id = auth.uid();
$$;

create or replace function public.ride_is_superintendent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superintendent'
  );
$$;

create or replace function public.ride_is_office()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        role in ('superintendent', 'administrator')
        or also_administrator
      )
  );
$$;

create or replace function public.ride_deny_student()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prof public.profiles;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  select * into prof from public.profiles where id = auth.uid();
  if not found then
    raise exception 'sign in first';
  end if;
  if prof.role = 'student' or prof.student_id is not null then
    raise exception 'not allowed';
  end if;
end;
$$;

create or replace function public.ride_has_duty(p_line_id uuid, p_duty_role text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dismissal_duty d
    where d.profile_id = auth.uid()
      and d.active
      and d.school_id is not distinct from public.my_school_id()
      and (p_duty_role is null or d.duty_role = p_duty_role)
      and (
        p_line_id is null
        or d.line_id is null
        or d.line_id = p_line_id
      )
  )
  or public.ride_is_office();
$$;

create or replace function public.ride_vehicle_valid_on(
  p_kind text,
  p_from date,
  p_to date,
  p_on date
)
returns boolean
language sql
immutable
as $$
  select case
    when p_kind = 'indefinite' then true
    when p_kind = 'today' then p_from is not null and p_from = p_on
    when p_kind = 'range' then p_from is not null and p_to is not null and p_on between p_from and p_to
    else false
  end;
$$;

create or replace function public.ride_is_restricted(
  p_school uuid,
  p_parent uuid,
  p_student_ids uuid[],
  p_vehicle uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pickup_restrictions r
    where r.school_id = p_school
      and r.active
      and r.student_id = any (p_student_ids)
      and (r.parent_id is null or r.parent_id = p_parent)
      and (r.vehicle_id is null or p_vehicle is null or r.vehicle_id = p_vehicle)
  );
$$;

create or replace function public.ride_parent_linked_students(p_parent uuid, p_student_ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ps.student_id), '{}'::uuid[])
  from public.parent_students ps
  where ps.parent_id = p_parent
    and ps.student_id = any (coalesce(p_student_ids, '{}'::uuid[]));
$$;

create or replace function public.is_ride_line_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.line_photos lp
    where lp.storage_path = p_path
      and lp.school_id is not distinct from public.my_school_id()
      and (
        public.ride_has_duty(lp.line_id, 'curb')
        or public.ride_is_office()
        or (lp.archived_at is not null and public.ride_is_superintendent())
        or lp.parent_id = public.ride_my_parent_id()
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: no client INSERT of order/seq; duty wall (not is_staff).
-- ---------------------------------------------------------------------------

alter table public.dismissal_lines enable row level security;
alter table public.parent_vehicles enable row level security;
alter table public.pickup_restrictions enable row level security;
alter table public.dismissal_duty enable row level security;
alter table public.line_photos enable row level security;
alter table public.queue_events enable row level security;

drop policy if exists dismissal_lines_select on public.dismissal_lines;
create policy dismissal_lines_select on public.dismissal_lines
  for select to authenticated
  using (
    school_id is not distinct from public.my_school_id()
    and (
      public.ride_is_office()
      or exists (
        select 1 from public.dismissal_duty d
        where d.profile_id = auth.uid() and d.active
          and d.school_id = dismissal_lines.school_id
          and (d.line_id is null or d.line_id = dismissal_lines.id)
      )
      or public.ride_my_parent_id() is not null
    )
  );

drop policy if exists parent_vehicles_select on public.parent_vehicles;
create policy parent_vehicles_select on public.parent_vehicles
  for select to authenticated
  using (
    school_id is not distinct from public.my_school_id()
    and (
      parent_id = public.ride_my_parent_id()
      or public.ride_has_duty(null, 'curb')
      or public.ride_is_office()
    )
  );

drop policy if exists pickup_restrictions_select on public.pickup_restrictions;
create policy pickup_restrictions_select on public.pickup_restrictions
  for select to authenticated
  using (
    school_id is not distinct from public.my_school_id()
    and (public.ride_is_office() or public.ride_has_duty(null, 'curb'))
  );

drop policy if exists dismissal_duty_select on public.dismissal_duty;
create policy dismissal_duty_select on public.dismissal_duty
  for select to authenticated
  using (
    school_id is not distinct from public.my_school_id()
    and (profile_id = auth.uid() or public.ride_is_office())
  );

drop policy if exists line_photos_select on public.line_photos;
create policy line_photos_select on public.line_photos
  for select to authenticated
  using (
    school_id is not distinct from public.my_school_id()
    and (
      public.ride_has_duty(line_id, 'curb')
      or public.ride_is_office()
      or (archived_at is not null and public.ride_is_superintendent())
      or (parent_id = public.ride_my_parent_id() and kind in ('parent_ahead', 'parent_first'))
    )
  );

drop policy if exists queue_events_select on public.queue_events;
create policy queue_events_select on public.queue_events
  for select to authenticated
  using (
    school_id is not distinct from public.my_school_id()
    and (
      public.ride_has_duty(line_id, null)
      or public.ride_is_office()
      or parent_id = public.ride_my_parent_id()
    )
  );

drop policy if exists media_select_ride_line_photos on storage.objects;
create policy media_select_ride_line_photos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_ride_line_photo(name)
  );

grant execute on function public.ride_plate_norm(text) to authenticated;
grant execute on function public.ride_school_date() to authenticated;
grant execute on function public.ride_my_parent_id() to authenticated;
grant execute on function public.ride_is_superintendent() to authenticated;
grant execute on function public.ride_is_office() to authenticated;
grant execute on function public.ride_has_duty(uuid, text) to authenticated;
grant execute on function public.ride_vehicle_valid_on(text, date, date, date) to authenticated;
grant execute on function public.is_ride_line_photo(text) to authenticated;

comment on table public.dismissal_lines is 'RIDE: physical dismissal lines (grade bands).';
comment on table public.parent_vehicles is 'RIDE: vehicles on parent person with today/range/indefinite validity.';
comment on table public.pickup_restrictions is 'RIDE: office blacklist; parent never sees reason.';
comment on table public.dismissal_duty is 'RIDE: curb/stage duty wall — not is_staff.';
comment on table public.line_photos is 'RIDE: private line photos; 7-day purge unless superintendent archived.';
comment on table public.queue_events is 'RIDE: queue events; 7-day purge always.';
