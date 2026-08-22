-- Messaging v1: group threads, mute, work cards, posts/replies/alerts.
-- Does not replace 1:1 tables. Creating threads is security-definer only.

alter table public.message_threads
  add column if not exists kind text not null default 'direct'
    check (kind in ('direct', 'group')),
  add column if not exists title text,
  add column if not exists student_id uuid references public.students (id) on delete set null,
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.message_thread_members
  add column if not exists muted_at timestamptz;

alter table public.messages
  add column if not exists payload jsonb;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('post', 'alert')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_school_created_idx on public.posts (school_id, created_at desc);
create index if not exists posts_class_created_idx on public.posts (class_id, created_at desc);

create table if not exists public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists post_replies_post_idx on public.post_replies (post_id, created_at);

create table if not exists public.post_audience_mutes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  muted_at timestamptz not null default now()
);

create unique index if not exists post_audience_mutes_one
  on public.post_audience_mutes (profile_id, coalesce(class_id, '00000000-0000-0000-0000-000000000000'));

alter table public.posts enable row level security;
alter table public.post_replies enable row level security;
alter table public.post_audience_mutes enable row level security;

create or replace function public.is_staff_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id
      and (
        p.role in ('superintendent', 'administrator', 'teacher')
        or p.also_teacher
        or p.also_administrator
      )
  );
$$;

create or replace function public.is_parent_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id
      and (p.role = 'parent' or p.parent_id is not null)
  );
$$;

create or replace function public.is_student_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id and p.role = 'student'
  );
$$;

create or replace function public.can_message(p_from uuid, p_to uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  from_staff boolean := public.is_staff_profile(p_from);
  to_staff boolean := public.is_staff_profile(p_to);
  from_parent boolean := public.is_parent_profile(p_from);
  to_parent boolean := public.is_parent_profile(p_to);
  from_student boolean := public.is_student_profile(p_from);
  to_student boolean := public.is_student_profile(p_to);
begin
  if p_from is null or p_to is null or p_from = p_to then
    return false;
  end if;
  if from_staff and to_staff then
    return true;
  end if;
  if from_staff and to_parent then
    return true;
  end if;
  if from_staff and to_student then
    return false;
  end if;
  if from_parent and to_staff then
    if exists (
      select 1
      from public.profiles p
      where p.id = p_to
        and (p.role in ('superintendent', 'administrator') or p.also_administrator)
    ) then
      return true;
    end if;
    return exists (
      select 1
      from public.profiles me
      join public.parent_students ps on ps.parent_id = me.parent_id
      join public.students s on s.id = ps.student_id
      where me.id = p_from
        and (
          s.teacher_id = p_to
          or exists (
            select 1 from public.enrollments e
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
    return exists (
      select 1
      from public.profiles me
      join public.enrollments e on e.student_id = me.student_id
      join public.classes c on c.id = e.class_id
      where me.id = p_from and c.teacher_id = p_to
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
  order by p.display_name, p.username;
$$;

create or replace function public.open_direct_thread(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  tid uuid;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if not public.can_message(me, p_other) then
    raise exception 'not allowed';
  end if;

  select t.id into tid
  from public.message_threads t
  join public.message_thread_members a on a.thread_id = t.id and a.profile_id = me
  join public.message_thread_members b on b.thread_id = t.id and b.profile_id = p_other
  where t.kind = 'direct'
    and (
      select count(*) from public.message_thread_members m where m.thread_id = t.id
    ) = 2
  limit 1;
  if tid is not null then
    return tid;
  end if;

  select school_id into school from public.profiles where id = me;
  insert into public.message_threads (school_id, kind, created_by)
  values (school, 'direct', me)
  returning id into tid;
  insert into public.message_thread_members (thread_id, profile_id)
  values (tid, me), (tid, p_other);
  return tid;
end;
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
  all_staff boolean;
  others_parents boolean;
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
    select bool_and(public.is_staff_profile(id)) into all_staff
    from unnest(members) as id;
    select bool_and(m = me or public.is_parent_profile(m)) into others_parents
    from unnest(members) as m;
    if not coalesce(all_staff, false)
       and not (public.is_staff_profile(me) and coalesce(others_parents, false))
    then
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

create or replace function public.set_thread_muted(p_thread_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  update public.message_thread_members
  set muted_at = case when p_muted then now() else null end
  where thread_id = p_thread_id and profile_id = auth.uid();
end;
$$;

create or replace function public.send_message(
  p_thread_id uuid,
  p_body text,
  p_payload jsonb default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.messages;
  text text := trim(both from coalesce(p_body, ''));
begin
  if not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  if text = '' and p_payload is null then
    raise exception 'Type a message';
  end if;
  if text = '' then
    text := 'Shared work';
  end if;
  insert into public.messages (thread_id, sender_id, body, payload)
  values (p_thread_id, auth.uid(), text, p_payload)
  returning * into row;
  update public.message_threads set last_message_at = row.created_at where id = p_thread_id;
  return row;
end;
$$;

create or replace function public.share_work_card(
  p_student_id uuid,
  p_assignment_id uuid,
  p_practice_set_id uuid,
  p_notify_parents boolean,
  p_thread_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  card jsonb;
  parent_thread uuid;
  dest uuid;
begin
  if me is null or not public.is_staff_profile(me) then
    raise exception 'not allowed';
  end if;
  if p_student_id is null then
    raise exception 'need a student';
  end if;
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id
      and (s.teacher_id = me or public.is_school_admin())
  ) then
    raise exception 'not allowed';
  end if;

  card := jsonb_build_object(
    'type', 'work_card',
    'student_id', p_student_id,
    'assignment_id', p_assignment_id,
    'practice_set_id', p_practice_set_id,
    'notify_parents', coalesce(p_notify_parents, true)
  );

  dest := p_thread_id;
  if dest is not null then
    if not public.is_thread_member(dest) then
      raise exception 'not allowed';
    end if;
    perform public.send_message(dest, 'Shared work', card);
  end if;

  if coalesce(p_notify_parents, true) then
    parent_thread := public.open_group_thread('Parents', array[]::uuid[], p_student_id);
    if dest is null or dest is distinct from parent_thread then
      perform public.send_message(parent_thread, 'Shared work', card);
    end if;
    dest := coalesce(dest, parent_thread);
  end if;

  if dest is null then
    raise exception 'Parents will not be notified';
  end if;
  return dest;
end;
$$;

create or replace function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select count(*)::int
    from public.messages m
    join public.message_thread_members mem on mem.thread_id = m.thread_id
    where mem.profile_id = auth.uid()
      and mem.muted_at is null
      and m.sender_id <> auth.uid()
      and (mem.last_read_at is null or m.created_at > mem.last_read_at)
  ), 0);
$$;

create or replace function public.can_see_post(p_post public.posts)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if p_post.author_id = auth.uid() then
    return true;
  end if;
  if public.is_school_admin() then
    return true;
  end if;
  if p_post.class_id is null then
    return public.is_staff_profile(auth.uid()) or public.is_parent_profile(auth.uid());
  end if;
  if public.is_staff_profile(auth.uid()) then
    return exists (
      select 1 from public.classes c
      where c.id = p_post.class_id
        and (c.teacher_id = auth.uid() or public.is_school_admin())
    );
  end if;
  if public.is_parent_profile(auth.uid()) then
    return exists (
      select 1
      from public.profiles me
      join public.parent_students ps on ps.parent_id = me.parent_id
      join public.enrollments e on e.student_id = ps.student_id
      where me.id = auth.uid() and e.class_id = p_post.class_id
    );
  end if;
  return false;
end;
$$;

create or replace function public.create_post(
  p_class_id uuid,
  p_kind text,
  p_body text
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  kind text := coalesce(nullif(trim(p_kind), ''), 'post');
  body text := trim(both from coalesce(p_body, ''));
  row public.posts;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if kind not in ('post', 'alert') then
    raise exception 'bad kind';
  end if;
  if body = '' then
    raise exception 'Type a post';
  end if;
  if public.is_student_profile(me) then
    raise exception 'not allowed';
  end if;
  select school_id into school from public.profiles where id = me;
  if p_class_id is null then
    if not public.is_school_admin() then
      raise exception 'not allowed';
    end if;
  else
    if not public.is_staff_profile(me) then
      raise exception 'not allowed';
    end if;
    if not exists (
      select 1 from public.classes c
      where c.id = p_class_id
        and (c.teacher_id = me or public.is_school_admin())
    ) then
      raise exception 'not allowed';
    end if;
  end if;
  insert into public.posts (school_id, class_id, author_id, kind, body)
  values (school, p_class_id, me, kind, body)
  returning * into row;
  return row;
end;
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

create or replace function public.list_feed()
returns table (
  id uuid,
  class_id uuid,
  class_name text,
  author_id uuid,
  author_name text,
  author_username text,
  kind text,
  body text,
  created_at timestamptz,
  reply_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.class_id,
    c.name,
    p.author_id,
    coalesce(pr.display_name, pr.username),
    pr.username,
    p.kind,
    p.body,
    p.created_at,
    (select count(*)::int from public.post_replies r where r.post_id = p.id)
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.classes c on c.id = p.class_id
  where public.can_see_post(p)
    and not exists (
      select 1 from public.post_audience_mutes m
      where m.profile_id = auth.uid()
        and m.class_id is not distinct from p.class_id
    )
  order by p.created_at desc
  limit 80;
$$;

create or replace function public.list_post_replies(p_post_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.author_id,
    coalesce(pr.display_name, pr.username),
    r.body,
    r.created_at
  from public.post_replies r
  join public.posts p on p.id = r.post_id
  join public.profiles pr on pr.id = r.author_id
  where r.post_id = p_post_id
    and public.can_see_post(p)
  order by r.created_at;
$$;

create or replace function public.set_feed_muted(p_class_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  delete from public.post_audience_mutes
  where profile_id = auth.uid()
    and class_id is not distinct from p_class_id;
  if p_muted then
    insert into public.post_audience_mutes (profile_id, class_id)
    values (auth.uid(), p_class_id);
  end if;
end;
$$;

create or replace function public.list_alerts_for_me()
returns table (
  id uuid,
  title text,
  status text,
  created_at timestamptz,
  class_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    case when p.kind = 'alert' then 'Alert' else 'Post' end,
    left(p.body, 80),
    p.created_at,
    p.class_id
  from public.posts p
  where p.kind = 'alert'
    and public.can_see_post(p)
    and p.created_at > now() - interval '14 days'
    and not exists (
      select 1 from public.post_audience_mutes m
      where m.profile_id = auth.uid()
        and m.class_id is not distinct from p.class_id
    )
  order by p.created_at desc
  limit 20;
$$;

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts
  for select using (public.can_see_post(posts));

drop policy if exists post_replies_read on public.post_replies;
create policy post_replies_read on public.post_replies
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and public.can_see_post(p))
  );

drop policy if exists post_mutes_own on public.post_audience_mutes;
create policy post_mutes_own on public.post_audience_mutes
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant execute on function public.is_staff_profile(uuid) to authenticated;
grant execute on function public.is_parent_profile(uuid) to authenticated;
grant execute on function public.is_student_profile(uuid) to authenticated;
grant execute on function public.can_message(uuid, uuid) to authenticated;
grant execute on function public.message_directory() to authenticated;
grant execute on function public.open_direct_thread(uuid) to authenticated;
grant execute on function public.open_group_thread(text, uuid[], uuid) to authenticated;
grant execute on function public.set_thread_muted(uuid, boolean) to authenticated;
grant execute on function public.send_message(uuid, text, jsonb) to authenticated;
grant execute on function public.share_work_card(uuid, uuid, uuid, boolean, uuid) to authenticated;
grant execute on function public.create_post(uuid, text, text) to authenticated;
grant execute on function public.reply_to_post(uuid, text) to authenticated;
grant execute on function public.list_feed() to authenticated;
grant execute on function public.list_post_replies(uuid) to authenticated;
grant execute on function public.set_feed_muted(uuid, boolean) to authenticated;
grant execute on function public.list_alerts_for_me() to authenticated;
grant execute on function public.can_see_post(public.posts) to authenticated;
grant select on public.posts to authenticated;
grant select on public.post_replies to authenticated;
grant select, insert, delete on public.post_audience_mutes to authenticated;
