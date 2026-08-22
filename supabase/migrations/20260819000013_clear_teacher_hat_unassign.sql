-- Clearing "also a teacher" drops that person from every class they were assigned to.

create or replace function public.admin_set_also_hat(
  p_profile_id uuid,
  p_hat text,
  p_also boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  hat text := lower(trim(p_hat));
begin
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if not public.can_edit_profile(p_profile_id) then
    raise exception 'not allowed';
  end if;
  select * into prof from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'no such profile';
  end if;
  if prof.role in ('student', 'parent') then
    raise exception 'only staff can wear extra staff hats';
  end if;

  if hat = 'administrator' then
    if prof.role <> 'superintendent' then
      raise exception 'only the superintendent can also be an administrator';
    end if;
    update public.profiles
    set also_administrator = coalesce(p_also, false)
    where id = p_profile_id;
  elsif hat = 'teacher' then
    if prof.role not in ('superintendent', 'administrator') then
      raise exception 'only a superintendent or administrator can also be a teacher';
    end if;
    if coalesce(p_also, false) then
      insert into public.teachers (id, email, display_name)
      values (p_profile_id, prof.email, prof.display_name)
      on conflict (id) do update
        set email = coalesce(excluded.email, public.teachers.email),
            display_name = coalesce(excluded.display_name, public.teachers.display_name);
    else
      delete from public.class_teachers where teacher_id = p_profile_id;
      update public.classes
      set teacher_id = null
      where teacher_id = p_profile_id;
    end if;
    update public.profiles
    set also_teacher = coalesce(p_also, false)
    where id = p_profile_id;
  else
    raise exception 'unknown hat';
  end if;

  perform public.write_audit(
    case when coalesce(p_also, false) then 'set_also_hat' else 'clear_also_hat' end,
    'profile',
    p_profile_id::text,
    null,
    null,
    jsonb_build_object('hat', hat, 'on', not coalesce(p_also, false)),
    jsonb_build_object('hat', hat, 'on', coalesce(p_also, false))
  );
end;
$$;

grant execute on function public.admin_set_also_hat(uuid, text, boolean) to authenticated;

-- Anyone who already lost the teacher hat stays off those classes.
delete from public.class_teachers ct
using public.profiles p
where ct.teacher_id = p.id
  and p.role in ('superintendent', 'administrator')
  and p.also_teacher = false;

update public.classes c
set teacher_id = null
from public.profiles p
where c.teacher_id = p.id
  and p.role in ('superintendent', 'administrator')
  and p.also_teacher = false;
