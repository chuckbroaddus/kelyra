-- Replies can carry the same photo / file / link payload as posts.
-- Unique RPC name so PostgREST does not fight reply_to_post overloads.

alter table public.post_replies
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
  )
  or exists (
    select 1
    from public.post_replies r
    join public.posts p on p.id = r.post_id
    where r.payload is not null
      and r.payload->>'storage_path' = p_path
      and public.can_see_post(p)
  );
$$;

create or replace function public.reply_to_feed_post(
  p_post_id uuid,
  p_body text,
  p_payload jsonb
)
returns public.post_replies
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  post public.posts;
  body text := trim(both from coalesce(p_body, ''));
  attach text := coalesce(p_payload->>'type', '');
  row public.post_replies;
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if p_payload is not null and attach not in ('photo', 'file', 'link') then
    raise exception 'bad attachment';
  end if;
  if body = '' and p_payload is null then
    raise exception 'Type a reply';
  end if;
  if body = '' then
    body := case attach
      when 'photo' then 'Photo'
      when 'file' then coalesce(nullif(p_payload->>'name', ''), 'File')
      when 'link' then coalesce(nullif(p_payload->>'title', ''), 'Link')
      else 'Reply'
    end;
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
  insert into public.post_replies (post_id, author_id, body, payload)
  values (p_post_id, me, body, p_payload)
  returning * into row;
  return row;
end;
$$;

drop function if exists public.list_post_replies(uuid);
create function public.list_post_replies(p_post_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  payload jsonb,
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
    r.payload,
    r.created_at
  from public.post_replies r
  join public.posts p on p.id = r.post_id
  join public.profiles pr on pr.id = r.author_id
  where r.post_id = p_post_id
    and public.can_see_post(p)
  order by r.created_at;
$$;

grant execute on function public.is_feed_attachment(text) to authenticated;
grant execute on function public.reply_to_feed_post(uuid, text, jsonb) to authenticated;
grant execute on function public.list_post_replies(uuid) to authenticated;

notify pgrst, 'reload schema';
