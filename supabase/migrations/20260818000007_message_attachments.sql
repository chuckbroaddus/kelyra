-- Message photos, files, and link cards. Files live in a private bucket.
-- Recipients can sign a path only if they are in that thread.

insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

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
      and m.payload->>'storage_path' = p_path
  );
$$;

drop policy if exists files_select_own on storage.objects;
create policy files_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists files_insert_own on storage.objects;
create policy files_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists files_update_own on storage.objects;
create policy files_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists files_delete_own on storage.objects;
create policy files_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists media_select_message_files on storage.objects;
create policy media_select_message_files on storage.objects
  for select to authenticated
  using (
    bucket_id in ('photos', 'files')
    and public.is_message_attachment(name)
  );

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
  kind text := coalesce(p_payload->>'type', '');
begin
  if not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  if p_payload is not null and kind not in ('work_card', 'photo', 'file', 'link') then
    raise exception 'not allowed';
  end if;
  if text = '' and p_payload is null then
    raise exception 'Type a message';
  end if;
  if text = '' then
    text := case kind
      when 'photo' then 'Photo'
      when 'file' then coalesce(nullif(p_payload->>'name', ''), 'File')
      when 'link' then coalesce(nullif(p_payload->>'title', ''), 'Link')
      else 'Shared work'
    end;
  end if;
  insert into public.messages (thread_id, sender_id, body, payload)
  values (p_thread_id, auth.uid(), text, p_payload)
  returning * into row;
  update public.message_threads set last_message_at = row.created_at where id = p_thread_id;
  return row;
end;
$$;

grant execute on function public.is_message_attachment(text) to authenticated;
