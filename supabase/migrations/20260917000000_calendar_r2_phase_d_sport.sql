-- CAL-R2 Phase D: thin sport (calendar_teams + members), list_calendars team layers,
-- unsubscribe_team. Sport default_enabled=false. Filters ≠ security.
-- Named file only — devops-release applies; eng does not live-apply.

-- ---------------------------------------------------------------------------
-- calendar_teams + calendar_team_members (opt-in only — never roster-copy)
-- ---------------------------------------------------------------------------

create table if not exists public.calendar_teams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_teams_school_idx
  on public.calendar_teams (school_id);

create table if not exists public.calendar_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.calendar_teams (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'coach')),
  created_at timestamptz not null default now(),
  constraint calendar_team_members_subject check (
    student_id is not null or profile_id is not null
  )
);

create unique index if not exists calendar_team_members_team_student_uidx
  on public.calendar_team_members (team_id, student_id)
  where student_id is not null;

create unique index if not exists calendar_team_members_team_profile_uidx
  on public.calendar_team_members (team_id, profile_id)
  where profile_id is not null;

create index if not exists calendar_team_members_student_idx
  on public.calendar_team_members (student_id)
  where student_id is not null;

create index if not exists calendar_team_members_profile_idx
  on public.calendar_team_members (profile_id)
  where profile_id is not null;

alter table public.calendar_teams enable row level security;
alter table public.calendar_team_members enable row level security;

revoke all on table public.calendar_teams from anon, authenticated;
revoke all on table public.calendar_team_members from anon, authenticated;
-- Reads go through list_calendars / list_calendar_items DEFINER RPCs only.

-- One team layer per team (default off — sport opt-in).
create unique index if not exists calendars_team_kind_uidx
  on public.calendars (team_id)
  where kind = 'team' and team_id is not null;

-- Soft FK: calendars.team_id → calendar_teams (additive; existing nulls OK).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendars_team_id_fkey'
  ) then
    alter table public.calendars
      add constraint calendars_team_id_fkey
      foreign key (team_id) references public.calendar_teams (id) on delete cascade;
  end if;
exception
  when others then
    -- If orphan team_ids exist in a weird env, skip; devops can heal.
    raise notice 'calendars_team_id_fkey skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Membership helper (CAL-S2-07 / CAL-08). Prefs never consulted.
-- ---------------------------------------------------------------------------

create or replace function public.i_calendar_team_member(
  p_team_id uuid,
  p_student_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or p_team_id is null then
    return false;
  end if;

  if p_student_id is not null then
    return exists (
      select 1 from public.calendar_team_members m
      where m.team_id = p_team_id
        and m.student_id = p_student_id
    );
  end if;

  return exists (
    select 1 from public.calendar_team_members m
    where m.team_id = p_team_id
      and (
        m.profile_id = me
        or m.student_id = public.my_student_id()
      )
  );
end;
$$;

revoke all on function public.i_calendar_team_member(uuid, uuid) from public, anon;
grant execute on function public.i_calendar_team_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Provision team calendar layer (default_enabled = false)
-- ---------------------------------------------------------------------------

create or replace function public.provision_team_calendar(p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  tname text;
  cid uuid;
begin
  if p_team_id is null then
    return null;
  end if;
  select school_id, name into sid, tname from public.calendar_teams where id = p_team_id;
  if sid is null then
    return null;
  end if;
  perform public.provision_school_calendar(sid);
  select id into cid from public.calendars
  where kind = 'team' and team_id = p_team_id
  limit 1;
  if cid is not null then
    return cid;
  end if;
  insert into public.calendars (
    school_id, provider, kind, team_id, name, role_tint, is_read_only, default_enabled
  )
  values (
    sid, 'kelyra', 'team', p_team_id,
    coalesce(nullif(trim(tname), ''), 'Team'),
    'sport', false, false
  )
  on conflict do nothing
  returning id into cid;
  if cid is null then
    select id into cid from public.calendars
    where kind = 'team' and team_id = p_team_id
    limit 1;
  end if;
  return cid;
end;
$$;

revoke all on function public.provision_team_calendar(uuid) from public, anon, authenticated;

create or replace function public.calendars_on_team_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_team_calendar(new.id);
  return new;
end;
$$;

drop trigger if exists calendars_on_team_insert on public.calendar_teams;
create trigger calendars_on_team_insert
  after insert on public.calendar_teams
  for each row execute function public.calendars_on_team_insert();

-- Backfill layers for any existing teams
do $$
declare
  r record;
begin
  for r in select id from public.calendar_teams loop
    perform public.provision_team_calendar(r.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- list_calendars (Phase D: + opted team layers, can_unsubscribe)
-- ---------------------------------------------------------------------------

create or replace function public.list_calendars(
  p_seat text,
  p_child_student_id uuid default null
)
returns table (
  id uuid,
  kind text,
  name text,
  role_tint text,
  class_id uuid,
  default_enabled boolean,
  is_read_only boolean,
  can_unsubscribe boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  child uuid;
begin
  -- Prefs/cache are not consulted (CAL-S2-07).
  if me is null then
    return;
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent', 'office') then
    return;
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    return; -- wrong seat → empty (CAL-S2-01)
  end if;

  school := public.my_school_id();
  if school is null then
    return;
  end if;

  -- Parent twins: missing/invalid child → empty (CAL-S1-03 / S2-02)
  if p_seat = 'parent' then
    if public.my_parent_student_count() >= 2 then
      if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    elsif p_child_student_id is not null then
      if not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    else
      select ps.student_id into child
      from public.parent_students ps
      join public.profiles p on p.parent_id = ps.parent_id
      where p.id = me
      limit 1;
    end if;
  end if;

  -- Office: school-kind only. No class / class_work / personal / team (CAL-S2-02).
  if p_seat = 'office' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only, false
    from public.calendars c
    where c.school_id = school
      and c.kind = 'school'
      and c.provider = 'kelyra';
    return;
  end if;

  if p_seat = 'teacher' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only,
      (c.kind = 'team') as can_unsubscribe
    from public.calendars c
    where c.school_id = school
      and c.provider = 'kelyra'
      and (
        c.kind = 'school'
        or (
          c.kind in ('class', 'class_work')
          and c.class_id is not null
          and public.class_teacher_of(c.class_id)
        )
        or (c.kind = 'personal' and c.owner_profile_id = me)
        or (
          c.kind = 'team'
          and c.team_id is not null
          and public.i_calendar_team_member(c.team_id, null)
        )
      )
    order by
      case c.kind
        when 'school' then 0
        when 'class' then 1
        when 'class_work' then 2
        when 'team' then 3
        when 'personal' then 4
        else 9
      end,
      c.name;
    return;
  end if;

  if p_seat = 'student' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only,
      (c.kind = 'team') as can_unsubscribe
    from public.calendars c
    where c.school_id = school
      and c.provider = 'kelyra'
      and (
        c.kind = 'school'
        or (
          c.kind in ('class', 'class_work')
          and c.class_id is not null
          and exists (
            select 1 from public.enrollments e
            where e.class_id = c.class_id
              and e.student_id = public.my_student_id()
          )
        )
        or (c.kind = 'personal' and c.owner_profile_id = me)
        or (
          c.kind = 'team'
          and c.team_id is not null
          and public.i_calendar_team_member(c.team_id, public.my_student_id())
        )
      )
    order by
      case c.kind
        when 'school' then 0
        when 'class' then 1
        when 'class_work' then 2
        when 'team' then 3
        when 'personal' then 4
        else 9
      end,
      c.name;
    return;
  end if;

  -- parent
  if child is null then
    return;
  end if;

  return query
  select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only,
    (c.kind = 'team') as can_unsubscribe
  from public.calendars c
  where c.school_id = school
    and c.provider = 'kelyra'
    and (
      c.kind = 'school'
      or (
        c.kind in ('class', 'class_work')
        and c.class_id is not null
        and exists (
          select 1 from public.enrollments e
          where e.class_id = c.class_id
            and e.student_id = child
        )
      )
      or (c.kind = 'personal' and c.owner_profile_id = me)
      or (
        c.kind = 'team'
        and c.team_id is not null
        and public.i_calendar_team_member(c.team_id, child)
      )
    )
  order by
    case c.kind
      when 'school' then 0
      when 'class' then 1
      when 'class_work' then 2
      when 'team' then 3
      when 'personal' then 4
      else 9
    end,
    c.name;
end;
$$;

revoke all on function public.list_calendars(text, uuid) from public, anon;
grant execute on function public.list_calendars(text, uuid) to authenticated;

comment on function public.list_calendars(text, uuid) is
  'CAL-R2 LF-A layers. Prefs not consulted. Team rows only if opted; can_unsubscribe for teams.';

-- ---------------------------------------------------------------------------
-- unsubscribe_team — membership delete only; never Delete events / labeled Delete
-- ---------------------------------------------------------------------------

create or replace function public.unsubscribe_team(
  p_seat text,
  p_calendar_id uuid,
  p_child_student_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  cal public.calendars;
  child uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent') then
    raise exception 'invalid seat';
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    raise exception 'seat not occupied';
  end if;
  if p_calendar_id is null then
    raise exception 'calendar required';
  end if;

  select * into cal from public.calendars where id = p_calendar_id;
  if cal.id is null or cal.kind is distinct from 'team' or cal.team_id is null then
    raise exception 'not a team calendar';
  end if;

  if p_seat = 'student' then
    delete from public.calendar_team_members m
    where m.team_id = cal.team_id
      and (
        m.student_id = public.my_student_id()
        or m.profile_id = me
      );
    return;
  end if;

  if p_seat = 'teacher' then
    delete from public.calendar_team_members m
    where m.team_id = cal.team_id
      and m.profile_id = me;
    return;
  end if;

  -- parent: unsubscribe focused child from team (never twin mash)
  if public.my_parent_student_count() >= 2 then
    if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
      raise exception 'child required';
    end if;
    child := p_child_student_id;
  elsif p_child_student_id is not null then
    if not public.i_parent_of(p_child_student_id) then
      raise exception 'not your child';
    end if;
    child := p_child_student_id;
  else
    select ps.student_id into child
    from public.parent_students ps
    join public.profiles p on p.parent_id = ps.parent_id
    where p.id = me
    limit 1;
  end if;

  if child is null then
    raise exception 'child required';
  end if;

  delete from public.calendar_team_members m
  where m.team_id = cal.team_id
    and m.student_id = child;
end;
$$;

revoke all on function public.unsubscribe_team(text, uuid, uuid) from public, anon;
grant execute on function public.unsubscribe_team(text, uuid, uuid) to authenticated;

comment on function public.unsubscribe_team(text, uuid, uuid) is
  'CAL-08 Leave team membership. Events remain for others. Never Delete.';

comment on table public.calendar_teams is
  'CAL-R2 thin sport teams. Opt-in via calendar_team_members; never class roster copy.';
comment on table public.calendar_team_members is
  'Sport opt-in membership. Unsubscribe deletes row; games stay for others.';
