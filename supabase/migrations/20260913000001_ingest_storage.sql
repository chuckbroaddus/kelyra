-- BATCH-v1 I0 storage: files bucket ingest-prefix policies.
-- Path: {uid}/ingest/{batch_id}/** — authenticated uid prefix + batch owner.
-- Worker uses service_role only (never Expo / never user JWT in pdfium).
-- Photos convention (raster JPEGs in photos bucket via assets):
--   {teacher_id}/ingest/{batch_id}/p-{n}.jpg + _thumb (assets.thumb_storage_path).
-- Never sign the original PDF into a model request (ADR-016; I0 has no model code).
-- Create files bucket ONLY if missing. Additive — do not break message attachment paths.
-- DevOps applies later. Do not apply from the build loop.

insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

-- Ensure private if the row already existed with a different public flag.
update storage.buckets
set public = false
where id = 'files' and public is distinct from false;

-- ---------------------------------------------------------------------------
-- Helper: path is {uid}/ingest/{batch_id}/... and caller owns that batch
-- ---------------------------------------------------------------------------

create or replace function public.is_ingest_batch_storage_owner(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid_part text;
  kind_part text;
  batch_part text;
  batch_uuid uuid;
begin
  if p_path is null or auth.uid() is null then
    return false;
  end if;
  uid_part := split_part(p_path, '/', 1);
  kind_part := split_part(p_path, '/', 2);
  batch_part := split_part(p_path, '/', 3);
  if uid_part is distinct from auth.uid()::text then
    return false;
  end if;
  if kind_part is distinct from 'ingest' then
    return false;
  end if;
  begin
    batch_uuid := batch_part::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1
    from public.ingest_batches b
    where b.id = batch_uuid
      and b.teacher_id = auth.uid()
  );
end;
$$;

comment on function public.is_ingest_batch_storage_owner(text) is
  'files bucket ingest paths: uid prefix + ingest_batches.teacher_id = auth.uid(). Worker = service_role.';

revoke all on function public.is_ingest_batch_storage_owner(text) from public, anon;
grant execute on function public.is_ingest_batch_storage_owner(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Carve ingest out of generic files_*_own so ingest requires batch ownership.
-- Message attachment paths (no /ingest/ segment) keep uid-prefix policies.
-- ---------------------------------------------------------------------------

drop policy if exists files_select_own on storage.objects;
create policy files_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) is distinct from 'ingest'
  );

drop policy if exists files_insert_own on storage.objects;
create policy files_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) is distinct from 'ingest'
  );

drop policy if exists files_update_own on storage.objects;
create policy files_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) is distinct from 'ingest'
  )
  with check (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) is distinct from 'ingest'
  );

drop policy if exists files_delete_own on storage.objects;
create policy files_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) is distinct from 'ingest'
  );

-- Ingest-specific: uid prefix AND batch owner
drop policy if exists files_select_ingest on storage.objects;
create policy files_select_ingest on storage.objects
  for select to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) = 'ingest'
    and public.is_ingest_batch_storage_owner(name)
  );

drop policy if exists files_insert_ingest on storage.objects;
create policy files_insert_ingest on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) = 'ingest'
    and public.is_ingest_batch_storage_owner(name)
  );

drop policy if exists files_update_ingest on storage.objects;
create policy files_update_ingest on storage.objects
  for update to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) = 'ingest'
    and public.is_ingest_batch_storage_owner(name)
  )
  with check (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) = 'ingest'
    and public.is_ingest_batch_storage_owner(name)
  );

drop policy if exists files_delete_ingest on storage.objects;
create policy files_delete_ingest on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) = 'ingest'
    and public.is_ingest_batch_storage_owner(name)
  );

-- Message attachment paths: media_select_message_files (thread recipients) left
-- unchanged from 20260818000007. Do not drop or rewrite non-ingest files policies.
