-- DB gap-fill (2026-10-02): 20260819000002_thread_photo_storage.sql was never applied live.
-- Policy only; is_thread_photo stays on the newer 20260909000001 version.
-- Applied live via apply_migration; this file records it so repo matches DB.

drop policy if exists photos_select_thread on storage.objects;
create policy photos_select_thread on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_thread_photo(name)
  );
