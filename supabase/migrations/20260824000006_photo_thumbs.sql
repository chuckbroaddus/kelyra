-- CoS: apply THIS file on aohibokgilxhqwmupdfv.
-- 20260824000005 aborted (42703: message_threads.photo_path does not exist).
-- Live threads have no photo_path; is_thread_photo must not reference that column
-- at CREATE time. Idempotent. Private photos bucket. Does not add photo_path.

alter table public.assets
  add column if not exists thumb_storage_path text;

create or replace function public.photo_original_path(p_path text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when p_path is null then null
    when p_path ~ '_thumb\.[^./]+$' then regexp_replace(p_path, '_thumb(\.[^./]+)$', '\1')
    when p_path ~ '_thumb$' then regexp_replace(p_path, '_thumb$', '')
    else p_path
  end;
$$;

create or replace function public.photo_thumb_path(p_path text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when p_path is null then null
    when p_path ~ '_thumb(\.[^./]+)?$' then p_path
    when p_path ~ '\.[^./]+$' then regexp_replace(p_path, '(\.[^./]+)$', '_thumb\1')
    else p_path || '_thumb'
  end;
$$;

create or replace function public.is_school_profile_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles p on p.school_id = me.school_id
    left join public.teachers t on t.id = p.id
    left join public.parents par on par.id = p.parent_id
    left join public.students s on s.id = p.student_id
    join public.assets a
      on a.id = coalesce(t.photo_asset_id, par.photo_asset_id, s.photo_asset_id)
    where me.id = auth.uid()
      and a.kind = 'photo'
      and (
        a.storage_path = p_path
        or a.thumb_storage_path = p_path
        or a.storage_path = public.photo_original_path(p_path)
        or public.photo_thumb_path(a.storage_path) = p_path
      )
  );
$$;

create or replace function public.profile_photo_assets(p_ids uuid[])
returns table (profile_id uuid, photo_asset_id uuid, storage_path text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    a.id as photo_asset_id,
    coalesce(nullif(a.thumb_storage_path, ''), a.storage_path)
  from public.profiles p
  left join public.teachers t on t.id = p.id
  left join public.parents par on par.id = p.parent_id
  left join public.students s on s.id = p.student_id
  left join public.assets a
    on a.id = coalesce(t.photo_asset_id, par.photo_asset_id, s.photo_asset_id)
   and a.kind = 'photo'
  where auth.uid() is not null
    and p.id = any(p_ids)
    and p.school_id = (select me.school_id from public.profiles me where me.id = auth.uid());
$$;

create or replace function public.is_thread_photo(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean := false;
begin
  -- public.message_threads on this project has no photo_path column.
  -- Do not put t.photo_path in LANGUAGE sql (CREATE fails 42703).
  if p_path is null or btrim(p_path) = '' then
    return false;
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'message_threads'
      and column_name = 'photo_path'
  ) then
    return false;
  end if;
  execute $sql$
    select exists (
      select 1
      from public.message_threads t
      join public.message_thread_members m on m.thread_id = t.id
      where m.profile_id = auth.uid()
        and (
          t.photo_path = $1
          or t.photo_path = public.photo_original_path($1)
          or public.photo_thumb_path(t.photo_path) = $1
        )
    )
  $sql$
  into ok
  using p_path;
  return coalesce(ok, false);
exception
  when undefined_column then
    return false;
end;
$$;

create or replace function public.is_message_attachment(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    join public.message_thread_members mem on mem.thread_id = m.thread_id
    where mem.profile_id = auth.uid()
      and m.payload is not null
      and (
        m.payload->>'storage_path' = p_path
        or m.payload->>'storage_path' = public.photo_original_path(p_path)
        or public.photo_thumb_path(m.payload->>'storage_path') = p_path
      )
  );
$$;

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
      and (
        p.payload->>'storage_path' = p_path
        or p.payload->>'storage_path' = public.photo_original_path(p_path)
        or public.photo_thumb_path(p.payload->>'storage_path') = p_path
      )
      and public.can_see_post(p)
  )
  or exists (
    select 1
    from public.post_replies r
    join public.posts p on p.id = r.post_id
    where r.payload is not null
      and (
        r.payload->>'storage_path' = p_path
        or r.payload->>'storage_path' = public.photo_original_path(p_path)
        or public.photo_thumb_path(r.payload->>'storage_path') = p_path
      )
      and public.can_see_post(p)
  );
$$;

create or replace function public._unref_delete_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  path text;
  thumb text;
  bucket text;
  kind public.asset_kind;
begin
  if p_asset_id is null then
    return;
  end if;
  if exists (select 1 from public.captures where photo_asset_id = p_asset_id or audio_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.students where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.parents where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.teachers where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.roster_imports where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.schools where logo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.assignments where key_asset_id = p_asset_id) then
    return;
  end if;

  select storage_path, thumb_storage_path, assets.kind into path, thumb, kind
  from public.assets
  where id = p_asset_id;
  if path is null then
    return;
  end if;

  bucket := case when kind = 'photo' then 'photos' else 'audio' end;
  delete from storage.objects where bucket_id = bucket and name = path;
  if thumb is not null then
    delete from storage.objects where bucket_id = bucket and name = thumb;
  end if;
  if kind = 'photo' then
    delete from storage.objects
    where bucket_id = bucket
      and name = public.photo_thumb_path(path);
  end if;
  delete from public.assets where id = p_asset_id;
end;
$$;

grant execute on function public.photo_original_path(text) to authenticated, anon;
grant execute on function public.photo_thumb_path(text) to authenticated, anon;
grant execute on function public.is_school_profile_photo(text) to authenticated;
grant execute on function public.profile_photo_assets(uuid[]) to authenticated;
grant execute on function public.is_thread_photo(text) to authenticated;
grant execute on function public.is_message_attachment(text) to authenticated;
grant execute on function public.is_feed_attachment(text) to authenticated;
