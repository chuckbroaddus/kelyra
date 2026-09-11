-- Class delete is office-only (is_school_admin). Teachers must not delete classes.
-- Keep teacher_delete_class name for client deleteClass RPC.
-- Dual-hat also_administrator is not office (role-of-record only).
-- Teachers / parents / students / anon get Not found.

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
  if not public.is_school_admin() then
    raise exception 'Not found';
  end if;
  perform public._delete_class(p_class_id);
end;
$$;

grant execute on function public.teacher_delete_class(uuid) to authenticated;
