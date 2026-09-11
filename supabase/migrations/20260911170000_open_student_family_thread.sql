-- Teacher → student messaging always includes that student's parents/guardians.
-- One durable group thread per student_id (FERPA: never mix families).
-- Chuck 2026-09-11: every linked parent must have a login; no parents linked → refuse;
-- nobody may remove the student or parent members from a student_id thread.
-- Staff may still add other staff. Mute stays allowed.
-- Apply-needed: parent CoS applies this migration (do not merge from agent).

create or replace function public.open_student_family_thread(p_student_id uuid)
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
  student_name text;
  title text;
  parent_card_ids uuid[];
  parent_n int;
  missing_parent_logins int;
  student_profile uuid;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if p_student_id is null then
    raise exception 'pick a student';
  end if;
  if not public.is_staff_profile(me) then
    raise exception 'not allowed';
  end if;

  -- Staff must teach this student (owner, class_teachers seat, or school admin).
  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and (
        public.is_school_admin()
        or exists (select 1 from public.profiles p where p.id = me and p.also_administrator)
        or s.teacher_id = me
        or exists (
          select 1
          from public.enrollments e
          join public.class_teachers ct on ct.class_id = e.class_id
          where e.student_id = s.id and ct.teacher_id = me
        )
      )
  ) then
    raise exception 'not allowed';
  end if;

  select s.display_name into student_name
  from public.students s
  where s.id = p_student_id;
  if student_name is null then
    raise exception 'student not found';
  end if;

  select array_agg(distinct ps.parent_id) into parent_card_ids
  from public.parent_students ps
  where ps.student_id = p_student_id;
  parent_n := coalesce(array_length(parent_card_ids, 1), 0);
  if parent_n < 1 then
    raise exception 'Link at least one parent or guardian before messaging this student.';
  end if;

  select count(*)::int into missing_parent_logins
  from unnest(parent_card_ids) as pid
  where not exists (
    select 1 from public.profiles p where p.parent_id = pid
  );
  if missing_parent_logins > 0 then
    raise exception 'Every linked parent needs a login before messaging this student.';
  end if;

  select p.id into student_profile
  from public.profiles p
  where p.student_id = p_student_id
  limit 1;
  if student_profile is null then
    raise exception 'That student needs a login first.';
  end if;

  select array_agg(distinct x) into members
  from (
    select me
    union
    select student_profile
    union
    select p.id
    from public.profiles p
    where p.parent_id = any (parent_card_ids)
  ) x(x);

  n := coalesce(array_length(members, 1), 0);
  -- teacher + student + ≥1 parent
  if n < 3 then
    raise exception 'Could not open family chat — student and parent logins are required.';
  end if;

  title := nullif(trim(student_name), '');
  if title is null then
    title := 'Family';
  end if;

  select t.id into tid
  from public.message_threads t
  where t.kind = 'group' and t.student_id = p_student_id
  limit 1;

  if tid is not null then
    insert into public.message_thread_members (thread_id, profile_id)
    select tid, m from unnest(members) m
    on conflict do nothing;
    -- Never drop parents/student; only ensure membership.
    update public.message_threads
    set title = coalesce(nullif(trim(title), ''), title)
    where id = tid and (title is null or trim(title) = '');
    return tid;
  end if;

  select school_id into school from public.profiles where id = me;
  insert into public.message_threads (school_id, kind, title, student_id, created_by)
  values (school, 'group', title, p_student_id, me)
  returning id into tid;

  insert into public.message_thread_members (thread_id, profile_id)
  select tid, m from unnest(members) m;

  return tid;
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
  target public.profiles;
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

  -- Family threads (student_id set): nobody may remove the linked student or any parent.
  if t.student_id is not null then
    select * into target from public.profiles where id = p_profile_id;
    if target.id is not null then
      if target.student_id is not distinct from t.student_id then
        raise exception 'Parents and the student stay on this family chat.';
      end if;
      if target.parent_id is not null and exists (
        select 1
        from public.parent_students ps
        where ps.parent_id = target.parent_id and ps.student_id = t.student_id
      ) then
        raise exception 'Parents and the student stay on this family chat.';
      end if;
    end if;
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

  -- Family threads: only additional staff may be added (parents/student are locked in via open RPC).
  if t.student_id is not null then
    if not public.is_staff_profile(p_profile_id) then
      raise exception 'Only staff can be added to a family chat.';
    end if;
  elsif not (
    public.is_school_admin()
    or exists (select 1 from public.profiles where id = me and also_administrator)
  ) then
    if not (public.is_staff_profile(p_profile_id) or public.is_parent_profile(p_profile_id)) then
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

grant execute on function public.open_student_family_thread(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
