-- Journal upload guard (t_2afbbd20).
-- Path bind + mime allowlist + 10 MiB cap for the private diary bucket.
-- Do not edit 20260910000000_diary_ledger.sql in place.
-- Do not edit 20260924213000_diary_media_files.sql in place.
-- DevOps applies later (dry run first). Do not apply from this card.
-- Does not touch diary_media_gc_storage.
-- SELECT/DELETE storage policies stay the uid-prefix policies from 20260910000000.

-- True when p_path is {auth.uid()}/{entry.seat}/{entry_id}/{media_id}.{ext}
-- for an entry the caller owns. When p_entry_id is set, segment 3 must equal it.
-- Rejects .., backslash, %, empty segments, and a 5th segment.
create or replace function public.diary_storage_path_bound(
  p_path text,
  p_entry_id uuid default null
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid_seg text;
  seat_seg text;
  entry_seg text;
  object_seg text;
  stem text;
  ext text;
  entry_uuid uuid;
  entry_seat text;
begin
  if auth.uid() is null or p_path is null or p_path = '' then
    return false;
  end if;

  if position('..' in p_path) > 0
     or position('%' in p_path) > 0
     or position(chr(92) in p_path) > 0
     or position(chr(0) in p_path) > 0
     or left(p_path, 1) = '/'
     or right(p_path, 1) = '/'
     or position('//' in p_path) > 0
  then
    return false;
  end if;

  uid_seg := split_part(p_path, '/', 1);
  seat_seg := split_part(p_path, '/', 2);
  entry_seg := split_part(p_path, '/', 3);
  object_seg := split_part(p_path, '/', 4);

  if uid_seg = '' or seat_seg = '' or entry_seg = '' or object_seg = '' then
    return false;
  end if;
  if split_part(p_path, '/', 5) <> '' then
    return false;
  end if;

  if uid_seg is distinct from auth.uid()::text then
    return false;
  end if;
  if seat_seg not in ('teacher', 'staff', 'parent') then
    return false;
  end if;
  if entry_seg !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  entry_uuid := entry_seg::uuid;
  if p_entry_id is not null and entry_uuid is distinct from p_entry_id then
    return false;
  end if;

  stem := split_part(object_seg, '.', 1);
  ext := split_part(object_seg, '.', 2);
  if split_part(object_seg, '.', 3) <> '' then
    return false;
  end if;
  if stem !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  if ext !~ '^[a-z0-9]{1,8}$' then
    return false;
  end if;

  select e.seat into entry_seat
  from public.diary_entries e
  where e.id = entry_uuid
    and e.owner_profile_id = auth.uid();

  if entry_seat is null or entry_seat is distinct from seat_seg then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.diary_storage_path_bound(text, uuid) from public, anon;
grant execute on function public.diary_storage_path_bound(text, uuid) to authenticated;

comment on function public.diary_storage_path_bound(text, uuid) is
  'Journal path must be {auth.uid()}/{entry.seat}/{entry_id}/{media_id}.{ext} for an owned entry.';

-- diary_media writes must be the caller's row and a path bound to that entry.
drop policy if exists diary_media_insert_own on public.diary_media;
create policy diary_media_insert_own on public.diary_media
  for insert to authenticated
  with check (
    owner_profile_id = auth.uid()
    and public.diary_storage_path_bound(storage_path, entry_id)
  );

drop policy if exists diary_media_update_own on public.diary_media;
create policy diary_media_update_own on public.diary_media
  for update to authenticated
  using (
    owner_profile_id = auth.uid()
    and public.diary_storage_path_bound(storage_path, entry_id)
  )
  with check (
    owner_profile_id = auth.uid()
    and public.diary_storage_path_bound(storage_path, entry_id)
  );

-- Bucket diary inserts and updates use the same path bind.
-- entry id = split_part 3, seat = split_part 2, owned entry (inside the helper).
-- SELECT/DELETE stay uid-prefix. Do not drop diary_storage_select_own or diary_storage_delete_own.
drop policy if exists diary_storage_insert_own on storage.objects;
create policy diary_storage_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'diary'
    and public.diary_storage_path_bound(name, null)
  );

drop policy if exists diary_storage_update_own on storage.objects;
create policy diary_storage_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'diary'
    and public.diary_storage_path_bound(name, null)
  )
  with check (
    bucket_id = 'diary'
    and public.diary_storage_path_bound(name, null)
  );

-- Photos share this bucket, so image types are on the allowlist.
-- Do not infer a type from the filename. octet-stream is not allowed.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    'text/rtf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
where id = 'diary';
