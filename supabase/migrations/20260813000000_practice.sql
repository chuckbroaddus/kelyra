-- Practice sets, assignments, and student to-do.

create type public.practice_set_status as enum ('preview', 'assigned', 'discarded');
create type public.assignment_kind as enum ('capture', 'practice');
create type public.submission_status as enum ('assigned', 'submitted', 'draft_scored', 'approved');

create table public.practice_sets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  source_capture_id uuid references public.captures (id) on delete set null,
  teacher_prompt text,
  items jsonb not null default '[]'::jsonb,
  status public.practice_set_status not null default 'preview',
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  kind public.assignment_kind not null,
  capture_id uuid references public.captures (id) on delete set null,
  practice_set_id uuid references public.practice_sets (id) on delete set null,
  due_at timestamptz,
  max_score numeric,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status public.submission_status not null default 'assigned',
  answers jsonb,
  draft_score numeric,
  approved_score numeric,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create index submissions_student_status_idx on public.submissions (student_id, status);

alter table public.practice_sets enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

create policy practice_sets_via_class on public.practice_sets
  for all using (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

create policy assignments_via_class on public.assignments
  for all using (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

create policy submissions_via_class on public.submissions
  for all using (
    exists (
      select 1
      from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = assignment_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = assignment_id and c.teacher_id = auth.uid()
    )
  );

-- Student class-link access (join code + picked roster name).

create or replace function public.student_open_class(p_join_code text)
returns table (class_id uuid, class_name text, student_id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, s.id, s.display_name
  from public.classes c
  join public.enrollments e on e.class_id = c.id
  join public.students s on s.id = e.student_id
  where upper(c.join_code) = upper(trim(p_join_code));
$$;

create or replace function public.student_list_todo(p_join_code text, p_student_id uuid)
returns table (
  submission_id uuid,
  assignment_title text,
  status public.submission_status,
  items jsonb,
  answers jsonb,
  focus_label text
)
language sql
security definer
set search_path = public
as $$
  select
    sub.id,
    a.title,
    sub.status,
    ps.items,
    sub.answers,
    sk.label
  from public.classes c
  join public.assignments a on a.class_id = c.id
  join public.submissions sub on sub.assignment_id = a.id
  left join public.practice_sets ps on ps.id = a.practice_set_id
  left join public.students st on st.id = sub.student_id
  left join public.skills sk on sk.id = st.current_focus_skill_id
  where upper(c.join_code) = upper(trim(p_join_code))
    and sub.student_id = p_student_id
    and a.kind = 'practice'
  order by sub.created_at desc;
$$;

create or replace function public.student_submit(
  p_join_code text,
  p_student_id uuid,
  p_submission_id uuid,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.submissions sub
  set
    answers = p_answers,
    status = 'submitted',
    submitted_at = now()
  from public.assignments a
  join public.classes c on c.id = a.class_id
  where sub.id = p_submission_id
    and sub.assignment_id = a.id
    and sub.student_id = p_student_id
    and sub.status = 'assigned'
    and upper(c.join_code) = upper(trim(p_join_code));

  if not found then
    raise exception 'Submission not found or already submitted';
  end if;
end;
$$;

grant execute on function public.student_open_class(text) to anon, authenticated;
grant execute on function public.student_list_todo(text, uuid) to anon, authenticated;
grant execute on function public.student_submit(text, uuid, uuid, jsonb) to anon, authenticated;
