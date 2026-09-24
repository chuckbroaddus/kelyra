-- t_06dd401c: freeze ingest_files.storage_path after insert so RLS FOR ALL
-- cannot retarget a received file to an unbound prefix (service_role workers
-- trust storage_path). register_ingest_file prefix bind is FL-19 / 20260923090000.

create or replace function public.ingest_files_freeze_storage_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.storage_path is distinct from old.storage_path then
    raise exception 'storage_path_frozen';
  end if;
  return new;
end;
$$;

drop trigger if exists ingest_files_freeze_storage_path on public.ingest_files;
create trigger ingest_files_freeze_storage_path
  before update on public.ingest_files
  for each row
  execute function public.ingest_files_freeze_storage_path();

revoke all on function public.ingest_files_freeze_storage_path() from public, anon, authenticated;

comment on function public.ingest_files_freeze_storage_path() is
  't_06dd401c: reject UPDATE that changes ingest_files.storage_path after insert.';
