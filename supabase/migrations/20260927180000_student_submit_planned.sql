-- Student Turn in: teacher Assign writes kind planned; practice sets use practice.
-- Own open planned rows must submit the same way as practice. Lessons stay on
-- student_report_lesson. Capture and other kinds stay rejected.

create or replace function public.student_submit(
  p_submission_id uuid,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
begin
  if sid is null then
    raise exception 'This login is not assigned to a roster name';
  end if;

  update public.submissions sub
  set
    answers = p_answers,
    status = 'completed',
    submitted_at = now()
  from public.assignments a
  where sub.id = p_submission_id
    and sub.assignment_id = a.id
    and sub.student_id = sid
    and sub.status in ('assigned', 'started')
    and a.kind in ('practice', 'planned');

  if not found then
    raise exception 'Submission not found or already submitted';
  end if;

  perform public.write_audit(
    'student_submit',
    'submission',
    p_submission_id::text,
    sid,
    null,
    null,
    jsonb_build_object('submitted', true)
  );
end;
$$;

comment on function public.student_submit(uuid, jsonb) is
  'Own open practice or planned cell only. assigned/started → completed. Empty answers allowed. Never writes graded.';

revoke all on function public.student_submit(uuid, jsonb) from public, anon;
grant execute on function public.student_submit(uuid, jsonb) to authenticated;
