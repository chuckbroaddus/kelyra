-- Remove parent from class = take their children off this roster.
-- Keep the parent↔child link so they can be added back.

create or replace function public.remove_parent_from_class(p_class_id uuid, p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  klass public.classes;
  kid uuid;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  select * into klass from public.classes where id = p_class_id;
  if klass.id is null then
    raise exception 'not allowed';
  end if;
  if klass.teacher_id is distinct from auth.uid() and not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.parents p
    join public.profiles owner on owner.id = p.teacher_id
    where p.id = p_parent_id
      and owner.school_id is not distinct from public.my_school_id()
  ) then
    raise exception 'not allowed';
  end if;

  for kid in
    select ps.student_id
    from public.parent_students ps
    join public.enrollments e on e.student_id = ps.student_id and e.class_id = p_class_id
    where ps.parent_id = p_parent_id
  loop
    perform public._detach_from_class(p_class_id, kid);
  end loop;
end;
$$;
