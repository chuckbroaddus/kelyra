-- BATCH-v1 I5: abandon_ingest_batch may clear pre-confirm partial/retry_remainder
-- (no capture_id rows) so open_sha lock releases. Additive replace.
-- DevOps applies later — do not apply from the build loop.

create or replace function public.abandon_ingest_batch(p_batch_id uuid)
returns public.ingest_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.ingest_batches;
  has_minted boolean;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;

  select * into b from public.ingest_batches where id = p_batch_id for update;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status not in (
    'draft', 'receiving', 'received', 'rasterizing', 'split_review', 'failed',
    'partial', 'retry_remainder'
  ) then
    raise exception 'cannot abandon after confirm';
  end if;

  select exists (
    select 1
    from public.ingest_packets p
    where p.batch_id = p_batch_id
      and p.capture_id is not null
  ) into has_minted;
  if has_minted then
    raise exception 'cannot abandon after confirm';
  end if;

  update public.ingest_batches
  set
    status = 'abandoned',
    abandoned_at = now(),
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  begin
    perform public.write_audit(
      'ingest_abandon',
      'ingest_batch',
      p_batch_id::text,
      null,
      b.class_id,
      null,
      null
    );
  exception when others then
    null;
  end;

  return b;
end;
$$;

revoke all on function public.abandon_ingest_batch(uuid) from public, anon;
grant execute on function public.abandon_ingest_batch(uuid) to authenticated;

comment on function public.abandon_ingest_batch(uuid) is
  'I5: abandon pre-confirm partial/retry_remainder when no capture_id; releases open_sha.';
