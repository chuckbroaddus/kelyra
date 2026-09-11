-- Family S-G4 / P-G4 detail fields: due_at, category, include_in_average, submitted_at.
-- Fail-closed Counts toward needs explicit include; Submitted uses submissions.submitted_at only.
-- Still strips answers / draft_score / classmates on family path.

drop function if exists public.family_student_gradebook(uuid);
drop function if exists public.student_gradebook();

create function public.family_student_gradebook(p_student_id uuid)
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
  due_at timestamptz,
  category text,
  include_in_average boolean,
  submission_id uuid,
  status public.submission_status,
  approved_score numeric,
  score_mark text,
  submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_student_id is null then
    return;
  end if;

  -- Session student may read own book; parent may read linked children only.
  if public.my_student_id() is distinct from p_student_id then
    if not exists (
      select 1
      from public.profiles pr
      join public.parent_students ps on ps.parent_id = pr.parent_id
      where pr.id = auth.uid()
        and pr.parent_id is not null
        and ps.student_id = p_student_id
    ) then
      return;
    end if;
  end if;

  return query
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
    a.due_at,
    a.category,
    a.include_in_average,
    sub.id,
    sub.status,
    sub.approved_score,
    sub.score_mark::text,
    sub.submitted_at
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  where sub.student_id = p_student_id
  order by c.name, a.created_at, a.title;
end;
$$;

comment on function public.family_student_gradebook(uuid) is
  'Own/child assignment cells for family grades book. Includes due/category/include/submitted_at for S-G4/P-G4. No classmates. No answers/draft_score. Parent requires parent_students link.';

revoke all on function public.family_student_gradebook(uuid) from public, anon;
grant execute on function public.family_student_gradebook(uuid) to authenticated;

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
  due_at timestamptz,
  category text,
  include_in_average boolean,
  submission_id uuid,
  status public.submission_status,
  approved_score numeric,
  score_mark text,
  answers jsonb,
  submitted_at timestamptz
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
    a.due_at,
    a.category,
    a.include_in_average,
    sub.id,
    sub.status,
    sub.approved_score,
    sub.score_mark::text,
    sub.answers,
    sub.submitted_at
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  where sub.student_id = public.my_student_id()
  order by c.name, a.created_at, a.title;
$$;

comment on function public.student_gradebook() is
  'Own assignment cells for the student grade book, including term/due/category/include/submitted_at. No classmates. Draft scores stay on the row but the app shows a mark only after graded.';

revoke all on function public.student_gradebook() from public, anon;
grant execute on function public.student_gradebook() to authenticated;
