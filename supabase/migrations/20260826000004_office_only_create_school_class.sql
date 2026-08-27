-- Q3: create_school_class is office-only (is_school_admin).
-- Teachers must not mint unassigned classes. Parents/students cannot create.
-- add_teacher_to_class / remove_teacher_from_class stay office (unchanged).
-- Do not widen is_staff.

create or replace function public.create_school_class(p_name text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  klass public.classes;
  n text;
begin
  if auth.uid() is null or not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  n := nullif(btrim(p_name), '');
  if n is null then
    raise exception 'Class name is required';
  end if;
  insert into public.classes (teacher_id, name, name_source)
  values (null, n, 'typed')
  returning * into klass;
  return klass;
end;
$$;

grant execute on function public.create_school_class(text) to authenticated;
