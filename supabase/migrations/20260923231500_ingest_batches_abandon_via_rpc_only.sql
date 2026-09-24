-- t_da951800: authenticated UPDATE must not set status=abandoned (or clear
-- open_sha via abandon) without going through abandon_ingest_batch, which
-- enforces capture_id / confirm gates.

create or replace function public.ingest_batches_abandon_via_rpc_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status = 'abandoned'
     and current_setting('kelyra.via_abandon_rpc', true) is distinct from 'on' then
    raise exception 'use abandon_ingest_batch';
  end if;
  return new;
end;
$$;

drop trigger if exists ingest_batches_abandon_via_rpc_only on public.ingest_batches;
create trigger ingest_batches_abandon_via_rpc_only
  before update on public.ingest_batches
  for each row
  execute function public.ingest_batches_abandon_via_rpc_only();

revoke all on function public.ingest_batches_abandon_via_rpc_only() from public, anon, authenticated;

-- Re-assert abandon RPC with session flag so the trigger allows the write.
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

  perform set_config('kelyra.via_abandon_rpc', 'on', true);

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
  'I5+t_da951800: abandon pre-confirm only; status=abandoned only via this RPC (capture_id gate).';
