-- Multi-student shared family group (Chuck 2026-09-11 product):
-- Teacher multi-select Message N → ONE group = teacher + all selected student
-- logins + all linked parent logins. Parents + students locked (family_lock).
-- Single-student Message still uses open_student_family_thread (student_id).
-- Chuck chose shared multi-family over separate threads (FERPA note in docs).
-- CoS apply authorized; do not merge without apply.

alter table public.message_threads
  add column if not exists family_lock boolean not null default false;

comment on column public.message_threads.family_lock is
  'True for multi-student family groups: students and parents cannot be removed.';

create or replace function public.open_multi_student_family_thread(p_student_ids uuid[])
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
  student_ids uuid[];
  sid uuid;
  student_profile uuid;
  parent_card_ids uuid[];
  parent_n int;
  parent_login_n int;
  student_name text;
  thread_title text;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if not public.is_staff_profile(me) then
    raise exception 'not allowed';
  end if;

  -- Dedupe, drop nulls, preserve stable order for title.
  select array_agg(distinct x order by x) into student_ids
  from unnest(coalesce(p_student_ids, array[]::uuid[])) as x
  where x is not null;

  if coalesce(array_length(student_ids, 1), 0) < 2 then
    raise exception 'Pick at least two students, or use the single-student family chat.';
  end if;

  foreach sid in array student_ids loop
    -- Staff must teach this student (same walls as open_student_family_thread).
    if not exists (
      select 1
      from public.students s
      where s.id = sid
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
    where s.id = sid;
    if student_name is null then
      raise exception 'student not found';
    end if;

    select array_agg(distinct ps.parent_id) into parent_card_ids
    from public.parent_students ps
    where ps.student_id = sid;
    parent_n := coalesce(array_length(parent_card_ids, 1), 0);
    if parent_n < 1 then
      raise exception 'Link at least one parent or guardian before messaging %.',
        coalesce(nullif(trim(student_name), ''), 'that student');
    end if;

    select count(*)::int into parent_login_n
    from public.profiles p
    where p.parent_id = any (parent_card_ids);
    if parent_login_n < 1 then
      raise exception 'At least one linked parent needs a login before messaging %.',
        coalesce(nullif(trim(student_name), ''), 'that student');
    end if;

    select p.id into student_profile
    from public.profiles p
    where p.student_id = sid
    limit 1;
    if student_profile is null then
      raise exception '% needs a login first.',
        coalesce(nullif(trim(student_name), ''), 'That student');
    end if;

  end loop;

  -- members = me ∪ all student profiles ∪ all parent profiles with logins
  select array_agg(distinct x) into members
  from (
    select me
    union
    select p.id
    from public.profiles p
    where p.student_id = any (student_ids)
    union
    select p.id
    from public.profiles p
    join public.parent_students ps on ps.parent_id = p.parent_id
    where ps.student_id = any (student_ids)
  ) x(x);

  n := coalesce(array_length(members, 1), 0);
  -- Dual-hat OK (teacher may also be a parent). Typically n >= 3.
  if n < 2 then
    raise exception 'Could not open family chat — student and parent logins are required.';
  end if;
  if n > 12 then
    raise exception 'Group chats stay small. At most 12 people (this pick would be %).', n;
  end if;

  select nullif(trim(string_agg(split_part(trim(s.display_name), ' ', 1), ', ' order by s.display_name)), '')
    into thread_title
  from public.students s
  where s.id = any (student_ids);
  if thread_title is null then
    thread_title := 'Students';
  end if;

  -- v1: always create a new thread (optional member-set reuse later).
  select school_id into school from public.profiles where id = me;
  insert into public.message_threads (school_id, kind, title, student_id, family_lock, created_by)
  values (school, 'group', thread_title, null, true, me)
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

  -- Family threads: nobody may remove student or parent profiles.
  if coalesce(t.family_lock, false) or t.student_id is not null then
    select * into target from public.profiles where id = p_profile_id;
    if target.id is not null then
      if t.student_id is not null then
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
      if coalesce(t.family_lock, false)
         and (target.student_id is not null or target.parent_id is not null) then
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

  -- Family threads (student_id or family_lock): only additional staff may be added.
  if t.student_id is not null or coalesce(t.family_lock, false) then
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

grant execute on function public.open_multi_student_family_thread(uuid[]) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
