-- GB-09 PolicyView snapshots (FR-VIEW-01)
-- policy_views: kind school|syllabus, ref_id, version, snapshot, rendered
-- Filled on publish via upsert_policy_view RPC (client/trigger callers).
-- Idempotent. Do not apply from the build card — DevOps applies.

create table if not exists public.policy_views (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('school', 'syllabus')),
  ref_id uuid not null,
  version int not null check (version >= 1),
  snapshot jsonb not null default '{}'::jsonb,
  rendered jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, ref_id, version)
);

comment on table public.policy_views is
  'GB-09 FR-VIEW published plain-language policy/syllabus snapshots.';

create index if not exists policy_views_kind_ref_idx
  on public.policy_views (kind, ref_id, version desc);

create index if not exists policy_views_ref_idx
  on public.policy_views (ref_id);

alter table public.policy_views enable row level security;

-- School members read school views for their school (ref_id = school_id).
drop policy if exists policy_views_school_read on public.policy_views;
create policy policy_views_school_read
  on public.policy_views
  for select to authenticated
  using (
    kind = 'school'
    and public.my_school_id() is not null
    and ref_id is not distinct from public.my_school_id()
  );

-- Teacher of the class (ref_id = class_id) reads syllabus views.
drop policy if exists policy_views_syllabus_teacher on public.policy_views;
create policy policy_views_syllabus_teacher
  on public.policy_views
  for select to authenticated
  using (
    kind = 'syllabus'
    and public.class_teacher_of(ref_id)
  );

-- Enrolled student or linked parent reads syllabus views for that class.
drop policy if exists policy_views_syllabus_family on public.policy_views;
create policy policy_views_syllabus_family
  on public.policy_views
  for select to authenticated
  using (
    kind = 'syllabus'
    and (
      exists (
        select 1 from public.enrollments e
        where e.class_id = policy_views.ref_id
          and e.student_id = public.my_student_id()
      )
      or exists (
        select 1
        from public.profiles pr
        join public.parent_students ps on ps.parent_id = pr.parent_id
        join public.enrollments e on e.student_id = ps.student_id
        where pr.id = auth.uid()
          and pr.parent_id is not null
          and e.class_id = policy_views.ref_id
      )
    )
  );

-- Office admin write/read all kinds for own school.
drop policy if exists policy_views_office_all on public.policy_views;
create policy policy_views_office_all
  on public.policy_views
  for all to authenticated
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and (
      (kind = 'school' and ref_id is not distinct from public.my_school_id())
      or (
        kind = 'syllabus'
        and exists (
          select 1
          from public.classes c
          join public.profiles t on t.id = c.teacher_id
          where c.id = policy_views.ref_id
            and t.school_id is not distinct from public.my_school_id()
        )
      )
    )
  )
  with check (
    public.is_school_admin()
    and public.my_school_id() is not null
    and (
      (kind = 'school' and ref_id is not distinct from public.my_school_id())
      or (
        kind = 'syllabus'
        and exists (
          select 1
          from public.classes c
          join public.profiles t on t.id = c.teacher_id
          where c.id = policy_views.ref_id
            and t.school_id is not distinct from public.my_school_id()
        )
      )
    )
  );

-- Teachers may upsert syllabus views for their own classes.
drop policy if exists policy_views_syllabus_teacher_write on public.policy_views;
create policy policy_views_syllabus_teacher_write
  on public.policy_views
  for insert to authenticated
  with check (
    kind = 'syllabus'
    and public.class_teacher_of(ref_id)
  );

drop policy if exists policy_views_syllabus_teacher_update on public.policy_views;
create policy policy_views_syllabus_teacher_update
  on public.policy_views
  for update to authenticated
  using (
    kind = 'syllabus'
    and public.class_teacher_of(ref_id)
  )
  with check (
    kind = 'syllabus'
    and public.class_teacher_of(ref_id)
  );

revoke all on table public.policy_views from public, anon;
grant select, insert, update, delete on table public.policy_views to authenticated;

drop trigger if exists trg_policy_views_updated on public.policy_views;
create trigger trg_policy_views_updated
  before update on public.policy_views
  for each row execute function public.gb_set_updated_at();

-- Upsert rendered snapshot (called after publish from client or future trigger).
create or replace function public.upsert_policy_view(
  p_kind text,
  p_ref_id uuid,
  p_version int,
  p_snapshot jsonb,
  p_rendered jsonb,
  p_published_at timestamptz default now()
)
returns public.policy_views
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.policy_views;
begin
  if p_kind not in ('school', 'syllabus') then
    raise exception 'invalid policy_view kind';
  end if;
  if p_version is null or p_version < 1 then
    raise exception 'invalid policy_view version';
  end if;

  insert into public.policy_views as pv (kind, ref_id, version, snapshot, rendered, published_at)
  values (
    p_kind,
    p_ref_id,
    p_version,
    coalesce(p_snapshot, '{}'::jsonb),
    coalesce(p_rendered, '{}'::jsonb),
    coalesce(p_published_at, now())
  )
  on conflict (kind, ref_id, version) do update
    set snapshot = excluded.snapshot,
        rendered = excluded.rendered,
        published_at = excluded.published_at,
        updated_at = now()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.upsert_policy_view(text, uuid, int, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.upsert_policy_view(text, uuid, int, jsonb, jsonb, timestamptz) to authenticated;

-- When a grading_policies row becomes published, seed a school policy_views row
-- with the raw payload as snapshot (rendered filled later by upsert_policy_view).
create or replace function public.trg_grading_policy_seed_policy_view()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and new.school_id is not null then
    insert into public.policy_views (kind, ref_id, version, snapshot, rendered, published_at)
    values (
      'school',
      new.school_id,
      new.version,
      coalesce(new.payload, '{}'::jsonb),
      '{}'::jsonb,
      coalesce(new.published_at, now())
    )
    on conflict (kind, ref_id, version) do update
      set snapshot = excluded.snapshot,
          published_at = excluded.published_at,
          updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grading_policies_policy_view on public.grading_policies;
create trigger trg_grading_policies_policy_view
  after insert or update of status, payload, version, published_at
  on public.grading_policies
  for each row
  execute function public.trg_grading_policy_seed_policy_view();

-- When a syllabus_versions row is inserted, seed a syllabus policy_views row
-- (ref_id = class_id from class_syllabi).
create or replace function public.trg_syllabus_version_seed_policy_view()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
begin
  select s.class_id into v_class_id
  from public.class_syllabi s
  where s.id = new.syllabus_id;
  if v_class_id is null then
    return new;
  end if;

  insert into public.policy_views (kind, ref_id, version, snapshot, rendered, published_at)
  values (
    'syllabus',
    v_class_id,
    new.version,
    coalesce(new.snapshot, '{}'::jsonb),
    '{}'::jsonb,
    coalesce(new.published_at, now())
  )
  on conflict (kind, ref_id, version) do update
    set snapshot = excluded.snapshot,
        published_at = excluded.published_at,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_syllabus_versions_policy_view on public.syllabus_versions;
create trigger trg_syllabus_versions_policy_view
  after insert or update of snapshot, version, published_at
  on public.syllabus_versions
  for each row
  execute function public.trg_syllabus_version_seed_policy_view();
