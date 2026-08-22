-- Feed posts can carry the same photo / file / link payload as messages.
-- PostgREST cannot resolve overloaded create_post(), so attachments use
-- a uniquely named RPC: create_feed_post.

alter table public.posts
  add column if not exists payload jsonb;

create or replace function public.is_feed_attachment(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.payload is not null
      and p.payload->>'storage_path' = p_path
      and public.can_see_post(p)
  );
$$;

drop policy if exists media_select_feed_files on storage.objects;
create policy media_select_feed_files on storage.objects
  for select to authenticated
  using (
    bucket_id in ('photos', 'files')
    and public.is_feed_attachment(name)
  );

-- Remove the 4-arg overload that PostgREST cannot pick.
drop function if exists public.create_post(uuid, text, text, jsonb);

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

create or replace function public.create_feed_post(
  p_class_id uuid,
  p_kind text,
  p_body text,
  p_payload jsonb
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
  attach text := coalesce(p_payload->>'type', '');
  row public.posts;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if kind not in ('post', 'alert') then
    raise exception 'bad kind';
  end if;
  if p_payload is not null and attach not in ('photo', 'file', 'link') then
    raise exception 'bad attachment';
  end if;
  if body = '' and p_payload is null then
    raise exception 'Type a post';
  end if;
  if body = '' then
    body := case attach
      when 'photo' then 'Photo'
      when 'file' then coalesce(nullif(p_payload->>'name', ''), 'File')
      when 'link' then coalesce(nullif(p_payload->>'title', ''), 'Link')
      else 'Post'
    end;
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
  insert into public.posts (school_id, class_id, author_id, kind, body, payload)
  values (school, p_class_id, me, kind, body, p_payload)
  returning * into row;
  return row;
end;
$$;

drop function if exists public.list_feed();
create function public.list_feed()
returns table (
  id uuid,
  class_id uuid,
  class_name text,
  author_id uuid,
  author_name text,
  author_username text,
  kind text,
  body text,
  payload jsonb,
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
    p.payload,
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

grant execute on function public.is_feed_attachment(text) to authenticated;
grant execute on function public.create_post(uuid, text, text) to authenticated;
grant execute on function public.create_feed_post(uuid, text, text, jsonb) to authenticated;
grant execute on function public.list_feed() to authenticated;

notify pgrst, 'reload schema';
