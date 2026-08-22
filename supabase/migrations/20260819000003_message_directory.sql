-- Directory lists everyone the sender may message: admins → whole school;
-- teachers → staff + own students + those students' parents.

create or replace function public.can_message(p_from uuid, p_to uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  from_row public.profiles;
  to_row public.profiles;
  from_staff boolean;
  to_staff boolean;
  from_parent boolean;
  to_parent boolean;
  from_student boolean;
  to_student boolean;
  from_admin boolean;
begin
  if p_from is null or p_to is null or p_from = p_to then
    return false;
  end if;

  select * into from_row from public.profiles where id = p_from;
  select * into to_row from public.profiles where id = p_to;
  if from_row.id is null or to_row.id is null then
    return false;
  end if;
  if from_row.school_id is distinct from to_row.school_id then
    return false;
  end if;

  from_staff := public.is_staff_profile(p_from);
  to_staff := public.is_staff_profile(p_to);
  from_parent := public.is_parent_profile(p_from);
  to_parent := public.is_parent_profile(p_to);
  from_student := public.is_student_profile(p_from);
  to_student := public.is_student_profile(p_to);
  from_admin := from_row.role in ('superintendent', 'administrator') or from_row.also_administrator;

  if from_admin then
    return true;
  end if;

  if from_staff and to_staff then
    return true;
  end if;

  if from_staff and to_student then
    return exists (
      select 1
      from public.students s
      where s.id = to_row.student_id
        and (
          s.teacher_id = p_from
          or exists (
            select 1
            from public.enrollments e
            join public.classes c on c.id = e.class_id
            where e.student_id = s.id and c.teacher_id = p_from
          )
        )
    );
  end if;

  if from_staff and to_parent then
    return exists (
      select 1
      from public.parent_students ps
      join public.students s on s.id = ps.student_id
      where ps.parent_id = to_row.parent_id
        and (
          s.teacher_id = p_from
          or exists (
            select 1
            from public.enrollments e
            join public.classes c on c.id = e.class_id
            where e.student_id = s.id and c.teacher_id = p_from
          )
        )
    );
  end if;

  if from_parent and to_staff then
    if to_row.role in ('superintendent', 'administrator') or to_row.also_administrator then
      return true;
    end if;
    return exists (
      select 1
      from public.parent_students ps
      join public.students s on s.id = ps.student_id
      where ps.parent_id = from_row.parent_id
        and (
          s.teacher_id = p_to
          or exists (
            select 1
            from public.enrollments e
            join public.classes c on c.id = e.class_id
            where e.student_id = s.id and c.teacher_id = p_to
          )
        )
    );
  end if;

  if from_parent and (to_parent or to_student) then
    return false;
  end if;

  if from_student and to_staff then
    if to_row.role in ('superintendent', 'administrator') or to_row.also_administrator then
      return true;
    end if;
    return exists (
      select 1
      from public.enrollments e
      join public.classes c on c.id = e.class_id
      where e.student_id = from_row.student_id and c.teacher_id = p_to
    );
  end if;

  return false;
end;
$$;

create or replace function public.message_directory()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id <> auth.uid()
    and public.can_message(auth.uid(), p.id)
  order by
    case
      when p.role in ('superintendent', 'administrator', 'teacher')
        or p.also_teacher
        or p.also_administrator
      then 0
      when p.role = 'parent' or p.parent_id is not null then 1
      else 2
    end,
    coalesce(nullif(p.display_name, ''), p.username);
$$;

create or replace function public.open_group_thread(
  p_title text,
  p_member_ids uuid[],
  p_student_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  tid uuid;
  members uuid[];
  n int;
begin
  if me is null then
    raise exception 'sign in first';
  end if;

  select array_agg(distinct x) into members
  from unnest(array_append(p_member_ids, me)) as x
  where x is not null;
  n := coalesce(array_length(members, 1), 0);
  if n < 2 then
    raise exception 'need at least two people';
  end if;
  if n > 12 then
    raise exception 'Group chats stay small. Pick at most 12 people.';
  end if;

  if p_student_id is not null then
    if not public.is_staff_profile(me) then
      raise exception 'not allowed';
    end if;
    if not exists (
      select 1 from public.students s
      where s.id = p_student_id
        and (s.teacher_id = me or public.is_school_admin())
    ) then
      raise exception 'not allowed';
    end if;
    select array_agg(distinct x) into members
    from (
      select me
      union
      select p.id
      from public.profiles p
      join public.parent_students ps on ps.parent_id = p.parent_id
      where ps.student_id = p_student_id
    ) x(x);
    n := coalesce(array_length(members, 1), 0);
    if n < 2 then
      raise exception 'Link a parent login to this student first';
    end if;
  else
    if exists (
      select 1 from unnest(members) m
      where m is distinct from me
        and not public.can_message(me, m)
    ) then
      raise exception 'not allowed';
    end if;
  end if;

  if p_student_id is not null then
    select t.id into tid
    from public.message_threads t
    where t.kind = 'group' and t.student_id = p_student_id
    limit 1;
    if tid is not null then
      insert into public.message_thread_members (thread_id, profile_id)
      select tid, m from unnest(members) m
      on conflict do nothing;
      return tid;
    end if;
  end if;

  select school_id into school from public.profiles where id = me;
  insert into public.message_threads (school_id, kind, title, student_id, created_by)
  values (
    school,
    'group',
    nullif(trim(p_title), ''),
    p_student_id,
    me
  )
  returning id into tid;
  insert into public.message_thread_members (thread_id, profile_id)
  select tid, m from unnest(members) m;
  return tid;
end;
$$;

grant execute on function public.can_message(uuid, uuid) to authenticated;
grant execute on function public.message_directory() to authenticated;
grant execute on function public.open_group_thread(text, uuid[], uuid) to authenticated;
