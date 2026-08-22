-- Anyone in a group may leave. Only administrators / superintendents may remove others.
-- Admins may add anyone; other staff still add within the existing member rules.

create or replace function public.add_group_member(p_thread_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  t public.message_threads;
  n int;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  if not (public.is_staff_profile(me) or public.is_school_admin()) then
    raise exception 'not allowed';
  end if;
  select * into t from public.message_threads where id = p_thread_id;
  if t.id is null or t.kind <> 'group' then
    raise exception 'not a group';
  end if;
  if p_profile_id is null or p_profile_id = me then
    raise exception 'pick someone else';
  end if;
  if not (
    public.is_school_admin()
    or exists (select 1 from public.profiles where id = me and also_administrator)
  ) then
    if t.student_id is not null then
      if not (
        public.is_staff_profile(p_profile_id)
        or exists (
          select 1
          from public.profiles p
          join public.parent_students ps on ps.parent_id = p.parent_id
          where p.id = p_profile_id and ps.student_id = t.student_id
        )
      ) then
        raise exception 'not allowed';
      end if;
    elsif not (public.is_staff_profile(p_profile_id) or public.is_parent_profile(p_profile_id)) then
      raise exception 'not allowed';
    end if;
  end if;

  select count(*) into n from public.message_thread_members where thread_id = p_thread_id;
  if n >= 12 then
    raise exception 'Group chats stay small. At most 12 people.';
  end if;

  insert into public.message_thread_members (thread_id, profile_id)
  values (p_thread_id, p_profile_id)
  on conflict do nothing;
end;
$$;

create or replace function public.remove_group_member(p_thread_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  t public.message_threads;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  select * into t from public.message_threads where id = p_thread_id;
  if t.id is null or t.kind <> 'group' then
    raise exception 'not a group';
  end if;
  if p_profile_id is distinct from me and not (
    public.is_school_admin()
    or exists (select 1 from public.profiles where id = me and also_administrator)
  ) then
    raise exception 'not allowed';
  end if;

  delete from public.message_thread_members
  where thread_id = p_thread_id and profile_id = p_profile_id;
end;
$$;
