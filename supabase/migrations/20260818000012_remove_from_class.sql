-- Teachers may take a student off this class even if it is their only class.
-- The student stays at the school (All students) and can be added again.

create or replace function public.teacher_remove_enrollment(p_class_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  klass public.classes;
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  select * into klass from public.classes where id = p_class_id;
  if klass.id is null then
    raise exception 'Not found';
  end if;
  if klass.teacher_id is distinct from auth.uid() and not public.is_school_admin() then
    raise exception 'Not found';
  end if;
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id
      and (
        s.teacher_id = auth.uid()
        or public.is_school_admin()
        or exists (
          select 1 from public.enrollments e
          where e.student_id = s.id and e.class_id = p_class_id
        )
      )
  ) then
    raise exception 'Not found';
  end if;
  perform public._detach_from_class(p_class_id, p_student_id);
end;
$$;
