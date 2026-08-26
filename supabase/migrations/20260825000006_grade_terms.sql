-- Counts toward: drop This year, split Semester into Semester 1 / 2.
-- Student grade book needs term so the same tabs can filter.

alter table public.assignments drop constraint if exists assignments_term_check;

update public.assignments set term = 'year' where term = 'none';
update public.assignments set term = 's1' where term = 'semester';

alter table public.assignments alter column term set default 'year';

alter table public.assignments
  add constraint assignments_term_check
  check (term in ('q1', 'q2', 'q3', 'q4', 's1', 's2', 'year'));

drop function if exists public.student_gradebook();

create function public.student_gradebook()
returns table (
  class_id uuid,
  class_name text,
  assignment_id uuid,
  assignment_title text,
  kind text,
  unit text,
  section text,
  term text,
  created_at timestamptz,
  submission_id uuid,
  status public.submission_status,
  approved_score numeric,
  score_mark text,
  answers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    a.id,
    a.title,
    a.kind::text,
    a.unit,
    a.section,
    a.term,
    a.created_at,
    sub.id,
    sub.status,
    sub.approved_score,
    sub.score_mark::text,
    sub.answers
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  where sub.student_id = public.my_student_id()
  order by c.name, a.created_at, a.title;
$$;

comment on function public.student_gradebook() is
  'Own assignment cells for the student grade book, including Counts toward (term). No classmates. Draft scores stay on the row but the app shows a mark only after graded.';

revoke all on function public.student_gradebook() from public, anon;
grant execute on function public.student_gradebook() to authenticated;
