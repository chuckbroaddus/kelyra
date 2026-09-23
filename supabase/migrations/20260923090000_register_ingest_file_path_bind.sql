-- FL-19: register_ingest_file refuses storage paths outside
-- {auth.uid()}/ingest/{batch_id}/. Additive CREATE OR REPLACE only —
-- do not edit 20260913000000_ingest_batches.sql in place.
-- DevOps applies later. Do not apply from the build loop.

create or replace function public.register_ingest_file(
  p_batch_id uuid,
  p_sort_index int,
  p_original_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text,
  p_storage_path text,
  p_tus_upload_id text default null
)
returns public.ingest_files
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.ingest_batches;
  existing public.ingest_files;
  row public.ingest_files;
  mime text := lower(trim(both from coalesce(p_mime_type, '')));
  allowed boolean;
  is_image boolean;
  new_total bigint;
  expected_prefix text;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;

  select * into b from public.ingest_batches where id = p_batch_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status not in ('draft', 'receiving') then
    raise exception 'batch not accepting files';
  end if;

  -- FL-19 path bind: only {auth.uid()}/ingest/{batch_id}/**
  expected_prefix := auth.uid()::text || '/ingest/' || p_batch_id::text || '/';
  if p_storage_path is null
     or length(p_storage_path) <= length(expected_prefix)
     or left(p_storage_path, length(expected_prefix)) is distinct from expected_prefix then
    raise exception 'invalid_storage_path';
  end if;

  allowed := mime in (
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/heic', 'image/heif'
  );
  if not allowed then
    raise exception 'unsupported_type';
  end if;

  is_image := mime like 'image/%';
  if is_image and coalesce(p_byte_size, 0) > 15728640 then
    raise exception 'image_too_large';
  end if;

  -- Idempotent on (batch_id, sha256)
  select * into existing
  from public.ingest_files
  where batch_id = p_batch_id and sha256 = p_sha256;
  if found then
    return existing;
  end if;

  new_total := coalesce(b.bytes_total, 0) + coalesce(p_byte_size, 0);
  if new_total > 262144000 then
    raise exception 'too_large_bytes';
  end if;

  insert into public.ingest_files (
    batch_id, sort_index, original_filename, mime_type, byte_size,
    sha256, storage_path, tus_upload_id, status
  ) values (
    p_batch_id, p_sort_index, coalesce(p_original_filename, 'file'),
    mime, coalesce(p_byte_size, 0), p_sha256, p_storage_path,
    p_tus_upload_id, 'received'
  )
  returning * into row;

  update public.ingest_batches
  set
    bytes_total = new_total,
    file_count = file_count + 1,
    status = case when status = 'draft' then 'receiving' else status end,
    updated_at = now()
  where id = p_batch_id;

  return row;
end;
$$;

revoke all on function public.register_ingest_file(uuid, int, text, text, bigint, text, text, text)
  from public, anon;
grant execute on function public.register_ingest_file(uuid, int, text, text, bigint, text, text, text)
  to authenticated;

comment on function public.register_ingest_file(uuid, int, text, text, bigint, text, text, text) is
  'FL-19: storage_path must be under {auth.uid()}/ingest/{batch_id}/; else invalid_storage_path.';
