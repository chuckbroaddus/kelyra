-- Office can delete a class with no teacher. Assigned teachers still can too.

create or replace function public.teacher_delete_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  if not public.teaches_class(p_class_id) then
    raise exception 'Not found';
  end if;
  perform public._delete_class(p_class_id);
end;
$$;

grant execute on function public.teacher_delete_class(uuid) to authenticated;
