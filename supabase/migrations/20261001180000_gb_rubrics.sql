-- GB-13 rubrics: rubrics, rubric_associations, rubric_assessments
-- Idempotent. Do not apply from the build card — DevOps applies.
-- RLS: teacher of class r/w; student/family read confirmed assessments of own submissions only.

create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  scope text not null default 'user'
    check (scope in ('user', 'class', 'school')),
  title text not null default '',
  kind text not null default 'analytic'
    check (kind in ('analytic', 'holistic', 'single_point', 'checklist')),
  scoring jsonb not null default '{"method":"sum_points","use_for_grading":true,"hide_score_from_family":false}'::jsonb,
  levels jsonb not null default '[]'::jsonb,
  criteria jsonb not null default '[]'::jsonb,
  cells jsonb not null default '[]'::jsonb,
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rubrics is
  'GB-13 Rubric library definitions (FR-RUB-04). Versioned; publish is human.';

create index if not exists rubrics_owner_idx on public.rubrics (owner_id);
create index if not exists rubrics_school_idx on public.rubrics (school_id);
create index if not exists rubrics_class_idx on public.rubrics (class_id);

create table if not exists public.rubric_associations (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics (id) on delete cascade,
  rubric_version int not null default 1,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  use_for_grading boolean not null default true,
  map_to_assignment text not null default 'set_max'
    check (map_to_assignment in ('set_max', 'scale')),
  snapshot_id uuid,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  unique (assignment_id)
);

comment on table public.rubric_associations is
  'GB-13 assignment ↔ rubric pin + published snapshot (FR-RUB-07).';

create index if not exists rubric_associations_rubric_idx
  on public.rubric_associations (rubric_id);

create table if not exists public.rubric_assessments (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references public.rubric_associations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  cells jsonb not null default '[]'::jsonb,
  holistic_level_id text,
  override_total numeric,
  total numeric,
  max_points numeric,
  percent numeric,
  mapped_raw_points numeric,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed')),
  posted_to_gradebook boolean not null default false,
  source text not null default 'teacher'
    check (source in ('teacher', 'ai_draft')),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, association_id)
);

comment on table public.rubric_assessments is
  'GB-13 student cell marks; confirmed only path when use_for_grading (FR-RUB-04).';

create index if not exists rubric_assessments_submission_idx
  on public.rubric_assessments (submission_id);
create index if not exists rubric_assessments_student_idx
  on public.rubric_assessments (student_id);
create index if not exists rubric_assessments_association_idx
  on public.rubric_assessments (association_id);

alter table public.assignments
  add column if not exists rubric_association_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_rubric_association_id_fkey'
  ) then
    alter table public.assignments
      add constraint assignments_rubric_association_id_fkey
      foreign key (rubric_association_id)
      references public.rubric_associations (id)
      on delete set null;
  end if;
end $$;

comment on column public.assignments.rubric_association_id is
  'GB-13 optional rubric attach (FR-RUB-00). Null = no rubric.';

-- RLS
alter table public.rubrics enable row level security;
alter table public.rubric_associations enable row level security;
alter table public.rubric_assessments enable row level security;

drop policy if exists rubrics_owner_all on public.rubrics;
create policy rubrics_owner_all
  on public.rubrics for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists rubrics_class_teacher_select on public.rubrics;
create policy rubrics_class_teacher_select
  on public.rubrics for select to authenticated
  using (
    class_id is not null and public.class_teacher_of(class_id)
  );

drop policy if exists rubrics_school_member_select on public.rubrics;
create policy rubrics_school_member_select
  on public.rubrics for select to authenticated
  using (
    school_id is not null
    and public.my_school_id() is not null
    and school_id = public.my_school_id()
  );

drop policy if exists rubric_associations_teacher_all on public.rubric_associations;
create policy rubric_associations_teacher_all
  on public.rubric_associations for all to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.class_teacher_of(a.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.class_teacher_of(a.class_id)
    )
  );

drop policy if exists rubric_associations_family_select on public.rubric_associations;
create policy rubric_associations_family_select
  on public.rubric_associations for select to authenticated
  using (
    exists (
      select 1
      from public.assignments a
      join public.submissions s on s.assignment_id = a.id
      where a.id = assignment_id
        and (
          public.parent_of(s.student_id)
          or s.student_id is not distinct from public.my_student_id()
        )
    )
  );

drop policy if exists rubric_assessments_teacher_all on public.rubric_assessments;
create policy rubric_assessments_teacher_all
  on public.rubric_assessments for all to authenticated
  using (
    exists (
      select 1
      from public.rubric_associations ra
      join public.assignments a on a.id = ra.assignment_id
      where ra.id = association_id and public.class_teacher_of(a.class_id)
    )
  )
  with check (
    exists (
      select 1
      from public.rubric_associations ra
      join public.assignments a on a.id = ra.assignment_id
      where ra.id = association_id and public.class_teacher_of(a.class_id)
    )
  );

-- student/family: confirmed assessments of own submissions only
drop policy if exists rubric_assessments_family_confirmed_select on public.rubric_assessments;
create policy rubric_assessments_family_confirmed_select
  on public.rubric_assessments for select to authenticated
  using (
    status = 'confirmed'
    and (
      public.parent_of(student_id)
      or student_id is not distinct from public.my_student_id()
    )
  );