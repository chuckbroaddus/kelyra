-- School-wide parent↔student linking for administrators, and per-user alert dismiss.

create or replace function public.my_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_link_parent_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        role in ('superintendent', 'administrator')
        or also_administrator
      )
  );
$$;

create or replace function public.admin_set_parent_link(
  p_parent_id uuid,
  p_student_id uuid,
  p_link boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if not public.can_link_parent_student() then
    raise exception 'not allowed';
  end if;
  if p_parent_id is null or p_student_id is null then
    raise exception 'need a parent and a student';
  end if;
  if not exists (select 1 from public.parents where id = p_parent_id) then
    raise exception 'no such parent';
  end if;
  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'no such student';
  end if;
  if p_link then
    insert into public.parent_students (parent_id, student_id)
    values (p_parent_id, p_student_id)
    on conflict (parent_id, student_id) do nothing;
    perform public.write_audit(
      'link_parent_student',
      'parent_student',
      p_parent_id::text || ':' || p_student_id::text,
      p_student_id,
      null,
      null,
      jsonb_build_object('linked', true)
    );
  else
    delete from public.parent_students
    where parent_id = p_parent_id and student_id = p_student_id;
    perform public.write_audit(
      'unlink_parent_student',
      'parent_student',
      p_parent_id::text || ':' || p_student_id::text,
      p_student_id,
      null,
      jsonb_build_object('linked', true),
      jsonb_build_object('linked', false)
    );
  end if;
end;
$$;

create or replace function public.teacher_unlink_child(p_parent_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_link_parent_student() then
    delete from public.parent_students
    where parent_id = p_parent_id and student_id = p_student_id;
    return;
  end if;
  if not exists (
    select 1 from public.parents
    where id = p_parent_id and teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;
  delete from public.parent_students
  where parent_id = p_parent_id and student_id = p_student_id;
end;
$$;

create or replace function public.teacher_delete_parent(p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  select photo_asset_id into photo_id
  from public.parents
  where id = p_parent_id
    and (teacher_id = auth.uid() or public.can_link_parent_student());
  if not found then
    raise exception 'Not found';
  end if;
  delete from public.parents where id = p_parent_id;
  perform public._unref_delete_asset(photo_id);
end;
$$;

create or replace function public.school_students_for_link()
returns setof public.students
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.students s
  join public.profiles owner on owner.id = s.teacher_id
  where auth.uid() is not null
    and public.is_staff_profile(auth.uid())
    and owner.school_id is not distinct from public.my_school_id()
  order by s.display_name;
$$;

create or replace function public.school_parents_for_link()
returns setof public.parents
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.parents p
  join public.profiles owner on owner.id = p.teacher_id
  where auth.uid() is not null
    and public.is_staff_profile(auth.uid())
    and owner.school_id is not distinct from public.my_school_id()
  order by p.display_name;
$$;

create or replace function public.admin_set_parent_card_link(
  p_profile_id uuid,
  p_parent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if not public.is_school_admin() and not public.can_link_parent_student() then
    raise exception 'not allowed';
  end if;
  select * into prof from public.profiles where id = p_profile_id;
  if prof.id is null then
    raise exception 'no such login';
  end if;
  if prof.role <> 'parent' and prof.parent_id is null then
    raise exception 'that login is not a parent';
  end if;
  if p_parent_id is not null and not exists (select 1 from public.parents where id = p_parent_id) then
    raise exception 'no such parent';
  end if;
  if p_parent_id is not null then
    update public.profiles
    set parent_id = null
    where parent_id = p_parent_id
      and id <> p_profile_id;
  end if;
  update public.profiles
  set parent_id = p_parent_id
  where id = p_profile_id;
end;
$$;

create table if not exists public.post_dismissals (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

alter table public.post_dismissals enable row level security;

drop policy if exists post_dismissals_own on public.post_dismissals;
create policy post_dismissals_own on public.post_dismissals
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function public.dismiss_alert(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.posts;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  select * into post from public.posts where id = p_post_id;
  if post.id is null then
    raise exception 'not found';
  end if;
  if post.kind is distinct from 'alert' then
    raise exception 'not an alert';
  end if;
  if not public.can_see_post(post) then
    raise exception 'not allowed';
  end if;
  insert into public.post_dismissals (profile_id, post_id)
  values (auth.uid(), p_post_id)
  on conflict (profile_id, post_id) do nothing;
end;
$$;

drop function if exists public.list_alerts_for_me();
create function public.list_alerts_for_me()
returns table (
  id uuid,
  title text,
  status text,
  body text,
  created_at timestamptz,
  class_id uuid,
  class_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    left(p.body, 80),
    case
      when c.name is not null then 'Alert · ' || c.name
      else 'Alert · School'
    end,
    p.body,
    p.created_at,
    p.class_id,
    c.name
  from public.posts p
  left join public.classes c on c.id = p.class_id
  where p.kind = 'alert'
    and public.can_see_post(p)
    and not exists (
      select 1 from public.post_dismissals d
      where d.profile_id = auth.uid() and d.post_id = p.id
    )
  order by p.created_at desc
  limit 100;
$$;

create or replace function public.count_alerts_for_me()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.posts p
  where p.kind = 'alert'
    and public.can_see_post(p)
    and not exists (
      select 1 from public.post_dismissals d
      where d.profile_id = auth.uid() and d.post_id = p.id
    );
$$;

create or replace function public.get_alert(p_post_id uuid)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  class_id uuid,
  class_name text,
  author_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.body,
    p.created_at,
    p.class_id,
    c.name,
    coalesce(pr.display_name, pr.username)
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.classes c on c.id = p.class_id
  where p.id = p_post_id
    and p.kind = 'alert'
    and public.can_see_post(p);
$$;

create or replace function public.reply_to_post(p_post_id uuid, p_body text)
returns public.post_replies
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  post public.posts;
  body text := trim(both from coalesce(p_body, ''));
  row public.post_replies;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if body = '' then
    raise exception 'Type a reply';
  end if;
  select * into post from public.posts where id = p_post_id;
  if post.id is null or not public.can_see_post(post) then
    raise exception 'not allowed';
  end if;
  if post.kind = 'alert' then
    raise exception 'Alerts have no replies';
  end if;
  if public.is_student_profile(me) then
    raise exception 'not allowed';
  end if;
  if public.is_parent_profile(me) and not public.is_staff_profile(me) then
    if post.class_id is null then
      raise exception 'not allowed';
    end if;
  end if;
  insert into public.post_replies (post_id, author_id, body)
  values (p_post_id, me, body)
  returning * into row;
  return row;
end;
$$;

grant execute on function public.my_school_id() to authenticated;
grant execute on function public.can_link_parent_student() to authenticated;
grant execute on function public.admin_set_parent_link(uuid, uuid, boolean) to authenticated;
grant execute on function public.school_students_for_link() to authenticated;
grant execute on function public.school_parents_for_link() to authenticated;
grant execute on function public.admin_set_parent_card_link(uuid, uuid) to authenticated;
grant execute on function public.dismiss_alert(uuid) to authenticated;
grant execute on function public.list_alerts_for_me() to authenticated;
grant execute on function public.count_alerts_for_me() to authenticated;
grant execute on function public.get_alert(uuid) to authenticated;
grant execute on function public.reply_to_post(uuid, text) to authenticated;
grant select, insert, delete on public.post_dismissals to authenticated;
