-- GB-CONDUCT-SAVE: working conduct marks per class+student+period (pre-store).
-- Idempotent. DevOps applies via rapid_ship / apply_sql_by_filename.
-- RLS mirrors posted_period_grades: teacher r/w; student+parent read own; school admin read.

create table if not exists public.class_conduct_marks (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  period_key text not null check (length(trim(period_key)) > 0),
  mark text check (mark is null or length(trim(mark)) > 0),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id, period_key)
);

comment on table public.class_conduct_marks is
  'Working FR-SYL-17 conduct marks by class+student+period before post_marking_period freeze.';

create index if not exists class_conduct_marks_class_idx
  on public.class_conduct_marks (class_id);
create index if not exists class_conduct_marks_student_idx
  on public.class_conduct_marks (student_id);

alter table public.class_conduct_marks enable row level security;

drop policy if exists class_conduct_marks_teacher_all on public.class_conduct_marks;
create policy class_conduct_marks_teacher_all
  on public.class_conduct_marks
  for all to authenticated
  using (public.class_teacher_of(class_id))
  with check (public.class_teacher_of(class_id));

drop policy if exists class_conduct_marks_family_select on public.class_conduct_marks;
create policy class_conduct_marks_family_select
  on public.class_conduct_marks
  for select to authenticated
  using (
    public.parent_of(student_id)
    or student_id is not distinct from public.my_student_id()
  );

drop policy if exists class_conduct_marks_office_select on public.class_conduct_marks;
create policy class_conduct_marks_office_select
  on public.class_conduct_marks
  for select to authenticated
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and exists (
      select 1
      from public.classes c
      join public.profiles owner on owner.id = c.teacher_id
      where c.id = class_conduct_marks.class_id
        and owner.school_id is not distinct from public.my_school_id()
    )
  );

grant select, insert, update, delete on public.class_conduct_marks to authenticated;
