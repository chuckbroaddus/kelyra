-- Capture of live ingest schema (2026-10-02). NOT applied via apply_migration:
-- the live DB is ahead of the repo for ingest (sources / bindings work landed live
-- without migration files). Everything here is idempotent and a no-op on live.
--
-- Captures: ingest_source_bindings table (+ indexes, RLS, policies, trigger, grants),
-- the ingest_batches / ingest_files columns the live RPCs depend on, and the live
-- bodies of create_ingest_batch (7-arg), save_ingest_split, confirm_ingest_batch,
-- ingest_mark_received, retry_ingest_remainder.
--
-- The remaining live-only ingest schema (ingest_agent_devices, ingest_google_tokens,
-- ingest_packet_name_suggestions, ingest_source_seen, and their RPCs) is captured in
-- 20261003020000 / 20261003020100.

-- ---------------------------------------------------------------------------
-- ingest_source_bindings
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_source_bindings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete set null,
  kind text not null
    constraint ingest_source_bindings_kind_check
    check (kind = any (array['agent_folder'::text, 'google_drive'::text, 'session_dir'::text, 'mobile_foreground_folder'::text])),
  status text not null default 'armed'
    constraint ingest_source_bindings_status_check
    check (status = any (array['armed'::text, 'watching'::text, 'paused'::text, 'error'::text, 'disconnected'::text, 'revoked'::text])),
  display_name text,
  agent_device_id uuid,
  local_folder_bookmark text,
  google_folder_id text,
  google_drive_id text,
  last_heartbeat_at timestamptz,
  last_error_code text,
  move_originals boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  drive_changes_page_token text,
  drive_webhook_channel_id text,
  drive_webhook_resource_id text,
  drive_webhook_expiration timestamptz,
  kick_requested_at timestamptz,
  last_poll_at timestamptz
);

-- agent_device_id FK only when ingest_agent_devices exists. On a fresh DB that table is
-- created later (20261003020000), which adds this FK itself; keep the guard.
do $$
begin
  if to_regclass('public.ingest_agent_devices') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'ingest_source_bindings_agent_device_id_fkey'
         and conrelid = 'public.ingest_source_bindings'::regclass
     ) then
    alter table public.ingest_source_bindings
      add constraint ingest_source_bindings_agent_device_id_fkey
      foreign key (agent_device_id) references public.ingest_agent_devices (id) on delete set null;
  end if;
end $$;

create index if not exists ingest_source_bindings_teacher_class_idx
  on public.ingest_source_bindings using btree (teacher_id, class_id);
create unique index if not exists ingest_source_bindings_active_drive_uidx
  on public.ingest_source_bindings using btree (teacher_id)
  where ((kind = 'google_drive'::text) and (status <> all (array['disconnected'::text, 'revoked'::text])));
create unique index if not exists ingest_source_bindings_active_agent_uidx
  on public.ingest_source_bindings using btree (teacher_id, agent_device_id)
  where ((kind = 'agent_folder'::text) and (agent_device_id is not null) and (status <> all (array['disconnected'::text, 'revoked'::text])));
create unique index if not exists ingest_source_bindings_active_mobile_uidx
  on public.ingest_source_bindings using btree (teacher_id)
  where ((kind = 'mobile_foreground_folder'::text) and (status <> all (array['disconnected'::text, 'revoked'::text])));
create unique index if not exists ingest_source_bindings_active_session_uidx
  on public.ingest_source_bindings using btree (teacher_id)
  where ((kind = 'session_dir'::text) and (status <> all (array['disconnected'::text, 'revoked'::text])));

alter table public.ingest_source_bindings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ingest_source_bindings' and policyname = 'ingest_source_bindings_select') then
    create policy ingest_source_bindings_select on public.ingest_source_bindings
      for select to authenticated
      using ((teacher_id = auth.uid()) and public.ingest_caller_is_teacher());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ingest_source_bindings' and policyname = 'ingest_source_bindings_insert') then
    create policy ingest_source_bindings_insert on public.ingest_source_bindings
      for insert to authenticated
      with check ((teacher_id = auth.uid()) and public.ingest_caller_is_teacher());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ingest_source_bindings' and policyname = 'ingest_source_bindings_update') then
    create policy ingest_source_bindings_update on public.ingest_source_bindings
      for update to authenticated
      using ((teacher_id = auth.uid()) and public.ingest_caller_is_teacher())
      with check ((teacher_id = auth.uid()) and public.ingest_caller_is_teacher());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ingest_source_bindings' and policyname = 'ingest_source_bindings_delete') then
    create policy ingest_source_bindings_delete on public.ingest_source_bindings
      for delete to authenticated
      using ((teacher_id = auth.uid()) and public.ingest_caller_is_teacher());
  end if;
end $$;

-- Live ACL: postgres, authenticated, service_role = all; anon none.
revoke all on table public.ingest_source_bindings from anon;
grant all on table public.ingest_source_bindings to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ingest_source_bindings_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists ingest_source_bindings_touch_updated_at on public.ingest_source_bindings;
create trigger ingest_source_bindings_touch_updated_at
  before update on public.ingest_source_bindings
  for each row execute function public.ingest_source_bindings_touch_updated_at();

-- ---------------------------------------------------------------------------
-- ingest_batches / ingest_files columns used by the live RPCs
-- ---------------------------------------------------------------------------
alter table public.ingest_batches alter column class_id drop not null;
alter table public.ingest_batches add column if not exists source_kind text not null default 'upload'::text;
alter table public.ingest_batches add column if not exists source_binding_id uuid;
alter table public.ingest_batches add column if not exists files_expected integer;
alter table public.ingest_batches add column if not exists packets_expected integer;
alter table public.ingest_batches add column if not exists key_in_stack text not null default 'none'::text;
alter table public.ingest_files add column if not exists external_id text;
alter table public.ingest_files add column if not exists bytes_stable_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.ingest_batches'::regclass and conname = 'ingest_batches_source_binding_id_fkey') then
    alter table public.ingest_batches add constraint ingest_batches_source_binding_id_fkey
      foreign key (source_binding_id) references public.ingest_source_bindings (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.ingest_batches'::regclass and conname = 'ingest_batches_files_expected_nonneg') then
    alter table public.ingest_batches add constraint ingest_batches_files_expected_nonneg
      check (((files_expected is null) or (files_expected >= 0)));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.ingest_batches'::regclass and conname = 'ingest_batches_packets_expected_nonneg') then
    alter table public.ingest_batches add constraint ingest_batches_packets_expected_nonneg
      check (((packets_expected is null) or (packets_expected >= 0)));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.ingest_batches'::regclass and conname = 'ingest_batches_key_in_stack_check') then
    alter table public.ingest_batches add constraint ingest_batches_key_in_stack_check
      check ((key_in_stack = any (array['none'::text, 'first'::text, 'last'::text])));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.ingest_batches'::regclass and conname = 'ingest_batches_source_kind_check') then
    alter table public.ingest_batches add constraint ingest_batches_source_kind_check
      check ((source_kind = any (array['upload'::text, 'agent_folder'::text, 'google_drive'::text, 'session_dir'::text, 'mobile_foreground_folder'::text, 'scan'::text])));
  end if;
end $$;

create index if not exists ingest_batches_source_binding_idx
  on public.ingest_batches using btree (source_binding_id) where (source_binding_id is not null);
create index if not exists ingest_files_batch_external_idx
  on public.ingest_files using btree (batch_id, external_id) where (external_id is not null);

-- ---------------------------------------------------------------------------
-- RPCs (live bodies, verbatim from pg_get_functiondef)
-- ---------------------------------------------------------------------------

-- Live has only the 7-arg create_ingest_batch; drop the repo's 3-arg overload
-- (20260913000000) so 3-arg calls are not ambiguous. No-op on live.
drop function if exists public.create_ingest_batch(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.create_ingest_batch(p_class_id uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_pages_per_student integer DEFAULT 1, p_source_kind text DEFAULT 'upload'::text, p_source_binding_id uuid DEFAULT NULL::uuid, p_files_expected integer DEFAULT NULL::integer, p_packets_expected integer DEFAULT NULL::integer)
 RETURNS ingest_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  row public.ingest_batches;
  pages int := coalesce(p_pages_per_student, 1);
  kind text := coalesce(nullif(trim(both from p_source_kind), ''), 'upload');
  bind public.ingest_source_bindings;
  class_optional boolean;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if pages < 1 or pages > 20 then
    raise exception 'pages_per_student out of range';
  end if;
  if kind not in (
    'upload', 'agent_folder', 'google_drive', 'session_dir',
    'mobile_foreground_folder', 'scan'
  ) then
    raise exception 'invalid_source_kind';
  end if;
  if p_files_expected is not null and p_files_expected < 0 then
    raise exception 'invalid_files_expected';
  end if;
  if p_packets_expected is not null and p_packets_expected < 0 then
    raise exception 'invalid_packets_expected';
  end if;

  class_optional := kind in (
    'google_drive', 'agent_folder', 'mobile_foreground_folder', 'scan', 'session_dir'
  );

  if kind = 'upload' and p_class_id is null then
    raise exception 'class_required';
  end if;
  if p_class_id is null and not class_optional then
    raise exception 'class_required';
  end if;
  if p_class_id is not null and not public.class_teacher_of(p_class_id) then
    raise exception 'not_class_teacher';
  end if;
  if p_assignment_id is not null then
    if p_class_id is null then
      raise exception 'assignment_requires_class';
    end if;
    if not exists (
      select 1 from public.assignments a
      where a.id = p_assignment_id and a.class_id = p_class_id
    ) then
      raise exception 'assignment not in class';
    end if;
  end if;

  -- Binding required except upload and scan.
  if p_source_binding_id is not null then
    select * into bind from public.ingest_source_bindings where id = p_source_binding_id;
    if not found then
      raise exception 'binding_not_found';
    end if;
    if bind.teacher_id is distinct from auth.uid() then
      raise exception 'not allowed';
    end if;
    if kind = 'upload' then
      raise exception 'upload_has_no_binding';
    end if;
    if kind = 'scan' then
      raise exception 'scan_has_no_binding';
    end if;
    if bind.kind is distinct from kind then
      raise exception 'binding_kind_mismatch';
    end if;
    -- Settings binds are class-null; tolerate null/null. Reject mismatched non-null.
    if bind.class_id is not null
       and p_class_id is not null
       and bind.class_id is distinct from p_class_id then
      raise exception 'binding_class_mismatch';
    end if;
  elsif kind not in ('upload', 'scan') then
    raise exception 'binding_required';
  end if;

  insert into public.ingest_batches (
    teacher_id, class_id, assignment_id, pages_per_student, status, ttl_at,
    source_kind, source_binding_id, files_expected, packets_expected, key_in_stack
  ) values (
    auth.uid(), p_class_id, p_assignment_id, pages, 'draft', now() + interval '24 hours',
    kind, p_source_binding_id, p_files_expected, p_packets_expected, 'none'
  )
  returning * into row;

  return row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_ingest_split(p_batch_id uuid, p_packets jsonb, p_version integer)
 RETURNS ingest_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.ingest_batches;
  elem jsonb;
  pkt_id uuid;
  pkt_ordinal int;
  pkt_page_ids uuid[];
  pkt_blank boolean;
  keep_ids uuid[] := '{}';
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
  if b.class_id is not null and not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status is distinct from 'split_review' then
    raise exception 'batch not in split_review';
  end if;
  if b.split_draft_version is distinct from p_version then
    raise exception 'confirm_conflict';
  end if;
  if p_packets is null or jsonb_typeof(p_packets) is distinct from 'array' then
    raise exception 'invalid packets';
  end if;

  update public.ingest_packets
  set ordinal = ordinal + 1000000
  where batch_id = p_batch_id
    and capture_id is null
    and status = 'draft';

  for elem in select value from jsonb_array_elements(p_packets)
  loop
    pkt_id := nullif(elem->>'id', '')::uuid;
    pkt_ordinal := coalesce((elem->>'ordinal')::int, 0);
    pkt_blank := coalesce((elem->>'blank')::boolean, false);
    select coalesce(array_agg(x::uuid), '{}'::uuid[])
      into pkt_page_ids
    from jsonb_array_elements_text(coalesce(elem->'page_ids', '[]'::jsonb)) as t(x);

    if pkt_id is null then
      continue;
    end if;

    keep_ids := array_append(keep_ids, pkt_id);

    update public.ingest_packets
    set
      ordinal = pkt_ordinal,
      page_ids = pkt_page_ids,
      blank = pkt_blank
    where id = pkt_id
      and batch_id = p_batch_id
      and capture_id is null
      and status = 'draft';

    if not found then
      insert into public.ingest_packets (
        id, batch_id, ordinal, page_ids, blank, status
      ) values (
        pkt_id, p_batch_id, pkt_ordinal, pkt_page_ids, pkt_blank, 'draft'
      );
    end if;
  end loop;

  delete from public.ingest_packets p
  where p.batch_id = p_batch_id
    and p.capture_id is null
    and p.status = 'draft'
    and not (p.id = any (keep_ids));

  update public.ingest_batches
  set
    split_draft_version = split_draft_version + 1,
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  return b;
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_ingest_batch(p_batch_id uuid, p_version integer)
 RETURNS ingest_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.ingest_batches;
  pkt public.ingest_packets;
  page_row public.ingest_pages;
  first_asset uuid;
  rest_ids uuid[] := '{}';
  eligible int := 0;
  minted int := 0;
  failed_mint int := 0;
  new_capture_id uuid;
  all_rasterized boolean;
  i int;
  pid uuid;
  v_key text;
  v_first_ord int;
  v_last_ord int;
  skip_key boolean;
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
  -- DRIVE-NEEDS: Confirm requires class
  if b.class_id is null then
    raise exception 'class_required';
  end if;
  if not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status is distinct from 'split_review' then
    raise exception 'batch not in split_review';
  end if;
  if b.split_draft_version is distinct from p_version then
    raise exception 'confirm_conflict';
  end if;

  v_key := coalesce(nullif(trim(both from b.key_in_stack), ''), 'none');
  if v_key not in ('none', 'first', 'last') then
    v_key := 'none';
  end if;

  select min(p.ordinal), max(p.ordinal)
  into v_first_ord, v_last_ord
  from public.ingest_packets p
  where p.batch_id = p_batch_id
    and p.blank = false
    and p.capture_id is null;

  select count(*)::int into eligible
  from public.ingest_packets p
  where p.batch_id = p_batch_id
    and p.blank = false
    and p.capture_id is null
    and not (
      (v_key = 'first' and p.ordinal is not distinct from v_first_ord)
      or (v_key = 'last' and p.ordinal is not distinct from v_last_ord)
    );

  if eligible < 1 then
    raise exception 'no eligible packets';
  end if;

  if not exists (
    select 1
    from public.ingest_packets p
    where p.batch_id = p_batch_id
      and p.blank = false
      and p.capture_id is null
      and not (
        (v_key = 'first' and p.ordinal is not distinct from v_first_ord)
        or (v_key = 'last' and p.ordinal is not distinct from v_last_ord)
      )
      and coalesce(cardinality(p.page_ids), 0) > 0
      and not exists (
        select 1
        from unnest(p.page_ids) as u(pid)
        left join public.ingest_pages pg on pg.id = u.pid and pg.batch_id = p_batch_id
        where pg.id is null
           or pg.status is distinct from 'rasterized'
           or pg.asset_id is null
      )
  ) then
    raise exception 'no rasterized packets';
  end if;

  update public.ingest_batches
  set status = 'confirming', updated_at = now()
  where id = p_batch_id;

  /* Confirm ≠ Approve; student_id null; never invent students */
  perform jsonb_build_object('student_id', null);

  for pkt in
    select * from public.ingest_packets
    where batch_id = p_batch_id
      and blank = false
      and capture_id is null
    order by ordinal
  loop
    skip_key := (
      (v_key = 'first' and pkt.ordinal is not distinct from v_first_ord)
      or (v_key = 'last' and pkt.ordinal is not distinct from v_last_ord)
    );
    if skip_key then
      -- Key-in-stack: no student capture. Leave packet unminted.
      continue;
    end if;

    all_rasterized := true;
    first_asset := null;
    rest_ids := '{}';

    if coalesce(cardinality(pkt.page_ids), 0) = 0 then
      update public.ingest_packets
      set status = 'failed', error_code = 'empty_packet'
      where id = pkt.id;
      failed_mint := failed_mint + 1;
      continue;
    end if;

    i := 0;
    foreach pid in array pkt.page_ids
    loop
      select * into page_row
      from public.ingest_pages
      where id = pid and batch_id = p_batch_id;
      if not found
         or page_row.status is distinct from 'rasterized'
         or page_row.asset_id is null then
        all_rasterized := false;
        exit;
      end if;
      i := i + 1;
      if i = 1 then
        first_asset := page_row.asset_id;
      else
        rest_ids := array_append(rest_ids, page_row.asset_id);
      end if;
    end loop;

    if not all_rasterized or first_asset is null then
      update public.ingest_packets
      set status = 'failed', error_code = 'page_not_rasterized'
      where id = pkt.id;
      failed_mint := failed_mint + 1;
      continue;
    end if;

    insert into public.captures (
      class_id,
      assignment_id,
      student_id,
      kind,
      photo_asset_id,
      input_source,
      status,
      model_draft,
      ingest_batch_id
    ) values (
      b.class_id,
      b.assignment_id,
      null,
      'homework',
      first_asset,
      'batch',
      'unassigned',
      case
        when cardinality(rest_ids) > 0 then jsonb_build_object('pageAssetIds', to_jsonb(rest_ids))
        else null
      end,
      p_batch_id
    )
    returning id into new_capture_id;

    update public.ingest_packets
    set capture_id = new_capture_id, status = 'minted', error_code = null
    where id = pkt.id;

    minted := minted + 1;
  end loop;

  update public.ingest_batches
  set
    teacher_confirmed_split = true,
    confirmed_at = now(),
    status = case
      when failed_mint = 0 and minted > 0 then 'done'
      when minted > 0 then 'partial'
      else 'failed'
    end,
    error_code = case when minted = 0 then 'confirm_failed' else null end,
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  begin
    perform public.write_audit(
      'ingest_confirm',
      'ingest_batch',
      p_batch_id::text,
      null,
      b.class_id,
      null,
      jsonb_build_object('minted', minted, 'status', b.status)
    );
  exception when others then
    null;
  end;

  return b;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ingest_mark_received(p_batch_id uuid)
 RETURNS ingest_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.ingest_batches;
  pending_count int;
  file_hashes text;
  batch_hash text;
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
  if b.class_id is not null and not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status not in ('draft', 'receiving') then
    raise exception 'batch not receiving';
  end if;

  select count(*)::int into pending_count
  from public.ingest_files f
  where f.batch_id = p_batch_id and f.status is distinct from 'received';
  if pending_count > 0 then
    raise exception 'files not received';
  end if;
  if not exists (select 1 from public.ingest_files where batch_id = p_batch_id) then
    raise exception 'no files';
  end if;

  select string_agg(f.sha256, E'\n' order by f.sort_index)
    into file_hashes
  from public.ingest_files f
  where f.batch_id = p_batch_id;

  batch_hash := encode(extensions.digest(convert_to(file_hashes, 'UTF8'), 'sha256'), 'hex');

  update public.ingest_batches
  set
    status = 'received',
    original_sha256 = batch_hash,
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  return b;
end;
$function$;

CREATE OR REPLACE FUNCTION public.retry_ingest_remainder(p_batch_id uuid)
 RETURNS ingest_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.ingest_batches;
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
  if b.class_id is not null and not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status is distinct from 'partial' then
    raise exception 'batch not partial';
  end if;

  update public.ingest_batches
  set
    status = 'retry_remainder',
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  return b;
end;
$function$;

-- Live ACL on these RPCs: authenticated + service_role EXECUTE; no anon / PUBLIC.
revoke all on function public.create_ingest_batch(uuid, uuid, integer, text, uuid, integer, integer) from public, anon;
revoke all on function public.save_ingest_split(uuid, jsonb, integer) from public, anon;
revoke all on function public.confirm_ingest_batch(uuid, integer) from public, anon;
revoke all on function public.ingest_mark_received(uuid) from public, anon;
revoke all on function public.retry_ingest_remainder(uuid) from public, anon;
grant execute on function public.create_ingest_batch(uuid, uuid, integer, text, uuid, integer, integer) to authenticated, service_role;
grant execute on function public.save_ingest_split(uuid, jsonb, integer) to authenticated, service_role;
grant execute on function public.confirm_ingest_batch(uuid, integer) to authenticated, service_role;
grant execute on function public.ingest_mark_received(uuid) to authenticated, service_role;
grant execute on function public.retry_ingest_remainder(uuid) to authenticated, service_role;
