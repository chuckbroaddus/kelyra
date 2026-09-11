-- Hotfix: dual-hat teacher+parent (same profile) made distinct members = 2
-- (teacher/parent + student), but open_student_family_thread required n < 3.
-- Jacquee messaging Colton failed with "Could not open family chat — student and
-- parent logins are required". Keep all parent/student login gates; require n >= 2,
-- student_profile in members, and at least one linked parent profile in members
-- (covers dual-hat when me is that parent). CoS already applied live 2026-09-11.

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
  -- Dual-hat teacher+parent: me may already be a linked parent profile, so
  -- distinct members can be 2 (parent/teacher + student). Require student in
  -- members and at least one linked parent profile in members.
  if n < 2 or not (student_profile = any (members)) then
    raise exception 'Could not open family chat — student and parent logins are required.';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = any (members)
      and p.parent_id = any (parent_card_ids)
  ) then
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

grant execute on function public.open_student_family_thread(uuid) to authenticated;
