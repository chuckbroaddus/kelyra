-- teacher_delete_gap used to join only captures. Assignment gaps have capture_id null.

create or replace function public.teacher_delete_gap(p_gap_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.skill_gaps%rowtype;
begin
  select sg.* into g
  from public.skill_gaps sg
  where sg.id = p_gap_id
    and (
      (
        sg.capture_id is not null
        and exists (
          select 1
          from public.captures cap
          where cap.id = sg.capture_id and public.teaches_class(cap.class_id)
        )
      )
      or (
        sg.submission_id is not null
        and exists (
          select 1
          from public.submissions sub
          join public.assignments a on a.id = sub.assignment_id
          where sub.id = sg.submission_id and public.teaches_class(a.class_id)
        )
      )
    );
  if not found then
    raise exception 'Not found';
  end if;
  delete from public.skill_gaps where id = p_gap_id;
  perform public._retarget_student_focus(g.student_id);
end;
$$;
