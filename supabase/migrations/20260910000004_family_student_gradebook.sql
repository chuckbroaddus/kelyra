-- Family-safe grade book for parent (linked child) or student (own id).
-- Strips answers / draft payloads. Own cells only — never classmates.
-- Do not extend student_gradebook() (answers stay on that row).

create or replace function public.family_student_gradebook(p_student_id uuid)
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
  score_mark text
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
    sub.id,
    sub.status,
    sub.approved_score,
    sub.score_mark::text
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  where sub.student_id = p_student_id
  order by c.name, a.created_at, a.title;
end;
$$;

comment on function public.family_student_gradebook(uuid) is
  'Own/child assignment cells for family grades book. No classmates. No answers/draft_score. Parent requires parent_students link.';

revoke all on function public.family_student_gradebook(uuid) from public, anon;
grant execute on function public.family_student_gradebook(uuid) to authenticated;
