-- Students and parents are assigned, not self-enrolled.
-- Drop class join codes and the anonymous pick-your-name door.
-- Student practice uses the signed-in profile's student_id.

drop trigger if exists classes_join_code_before_insert on public.classes;
drop function if exists public.classes_set_join_code();
drop function if exists public.generate_join_code();

drop function if exists public.student_open_class(text);
drop function if exists public.student_list_todo(text, uuid);
drop function if exists public.student_submit(text, uuid, uuid, jsonb);

alter table public.classes drop column if exists join_code;

create unique index if not exists profiles_one_student_login
  on public.profiles (student_id)
  where student_id is not null;

create or replace function public.my_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select student_id from public.profiles where id = auth.uid();
$$;

create or replace function public.student_me()
returns table (
  class_id uuid,
  class_name text,
  student_id uuid,
  display_name text,
  photo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.class_id,
    c.name,
    s.id,
    s.display_name,
    a.storage_path
  from public.students s
  left join public.enrollments e on e.student_id = s.id
  left join public.classes c on c.id = e.class_id
  left join public.assets a on a.id = s.photo_asset_id
  where s.id = public.my_student_id()
  order by e.created_at nulls last
  limit 1;
$$;

create or replace function public.student_classmates()
returns table (
  student_id uuid,
  display_name text,
  photo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    s.id,
    s.display_name,
    a.storage_path
  from public.enrollments mine
  join public.enrollments peer on peer.class_id = mine.class_id
  join public.students s on s.id = peer.student_id
  left join public.assets a on a.id = s.photo_asset_id
  where mine.student_id = public.my_student_id()
    and s.id <> public.my_student_id()
  order by s.display_name;
$$;

create or replace function public.student_list_todo()
returns table (
  submission_id uuid,
  assignment_title text,
  status public.submission_status,
  items jsonb,
  answers jsonb,
  focus_label text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sub.id,
    a.title,
    sub.status,
    ps.items,
    sub.answers,
    sk.label
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  left join public.practice_sets ps on ps.id = a.practice_set_id
  left join public.students st on st.id = sub.student_id
  left join public.skills sk on sk.id = st.current_focus_skill_id
  where sub.student_id = public.my_student_id()
    and a.kind = 'practice'
  order by sub.created_at desc;
$$;

create or replace function public.student_submit(
  p_submission_id uuid,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
begin
  if sid is null then
    raise exception 'This login is not assigned to a roster name';
  end if;

  update public.submissions sub
  set
    answers = p_answers,
    status = 'submitted',
    submitted_at = now()
  from public.assignments a
  where sub.id = p_submission_id
    and sub.assignment_id = a.id
    and sub.student_id = sid
    and sub.status = 'assigned';

  if not found then
    raise exception 'Submission not found or already submitted';
  end if;

  perform public.write_audit(
    'student_submit',
    'submission',
    p_submission_id::text,
    sid,
    null,
    null,
    jsonb_build_object('submitted', true)
  );
end;
$$;

create or replace function public.admin_set_student_link(
  p_profile_id uuid,
  p_student_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  previous uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  select * into prof from public.profiles where id = p_profile_id;
  if prof.id is null then
    raise exception 'no such login';
  end if;
  if prof.role <> 'student' then
    raise exception 'that login is not a student';
  end if;

  previous := prof.student_id;

  if not public.is_school_admin() then
    if p_student_id is not null then
      if not exists (
        select 1 from public.students s
        where s.id = p_student_id and s.teacher_id = auth.uid()
      ) then
        raise exception 'not allowed';
      end if;
    elsif previous is null or not exists (
      select 1 from public.students s
      where s.id = previous and s.teacher_id = auth.uid()
    ) then
      raise exception 'not allowed';
    end if;
  end if;

  if p_student_id is not null then
    update public.profiles
    set student_id = null
    where student_id = p_student_id
      and id <> p_profile_id;
  end if;

  update public.profiles
  set student_id = p_student_id
  where id = p_profile_id;

  perform public.write_audit(
    case when p_student_id is null then 'unlink_student_login' else 'link_student_login' end,
    'profile',
    p_profile_id::text,
    coalesce(p_student_id, previous),
    null,
    jsonb_build_object('student_id', previous),
    jsonb_build_object('student_id', p_student_id)
  );
end;
$$;

revoke all on function public.my_student_id() from public, anon;
revoke all on function public.student_me() from public, anon;
revoke all on function public.student_classmates() from public, anon;
revoke all on function public.student_list_todo() from public, anon;
revoke all on function public.student_submit(uuid, jsonb) from public, anon;
revoke all on function public.admin_set_student_link(uuid, uuid) from public, anon;

grant execute on function public.my_student_id() to authenticated;
grant execute on function public.student_me() to authenticated;
grant execute on function public.student_classmates() to authenticated;
grant execute on function public.student_list_todo() to authenticated;
grant execute on function public.student_submit(uuid, jsonb) to authenticated;
grant execute on function public.admin_set_student_link(uuid, uuid) to authenticated;
