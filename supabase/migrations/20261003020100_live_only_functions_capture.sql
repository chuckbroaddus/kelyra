-- Capture of live-only public functions (2026-10-02). Repo-only: NOT applied live.
-- Bodies verbatim from pg_get_functiondef; create or replace + live grants, so a
-- no-op on the live DB. Depends on 20261003010800 + 20261003020000.
--
-- Ingest: accept/decline name suggestions, attach_ingest_batch_key_to_assignment,
-- bind_ingest_batch_class, heartbeat/pair_ingest_agent_device, ingest_storage_path_allowed,
-- kick_ingest_drive, list_ingest_waiting_split, list_my_ingest_source_bindings,
-- set_ingest_batch_key_in_stack, set_ingest_source_status, upsert_ingest_source_binding.
-- Non-ingest: count_needs_attention, list_calendar_day_tints, public.lesson_host_secret.

CREATE OR REPLACE FUNCTION public.ingest_storage_path_allowed(p_storage_path text, p_teacher_id uuid, p_batch_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  expected_prefix text;
begin
  if p_storage_path is null or length(trim(both from p_storage_path)) = 0 then
    return false;
  end if;
  -- Reject absolute, traversal, and empty segments
  if left(p_storage_path, 1) = '/' then
    return false;
  end if;
  if position('..' in p_storage_path) > 0 then
    return false;
  end if;
  if position('//' in p_storage_path) > 0 then
    return false;
  end if;
  if p_teacher_id is null or p_batch_id is null then
    return false;
  end if;
  expected_prefix := p_teacher_id::text || '/ingest/' || p_batch_id::text || '/';
  if left(p_storage_path, length(expected_prefix)) is distinct from expected_prefix then
    return false;
  end if;
  -- Require a non-empty remainder under the batch prefix
  if length(p_storage_path) <= length(expected_prefix) then
    return false;
  end if;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_ingest_name_suggestion(p_suggestion_id uuid)
 RETURNS ingest_packet_name_suggestions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sug public.ingest_packet_name_suggestions;
  b public.ingest_batches;
  pkt public.ingest_packets;
  sid uuid;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  select * into sug from public.ingest_packet_name_suggestions where id = p_suggestion_id;
  if not found then
    raise exception 'not allowed';
  end if;

  select * into b from public.ingest_batches where id = sug.batch_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;

  if sug.status is distinct from 'suggested' then
    raise exception 'suggestion_not_open';
  end if;

  sid := sug.candidate_student_id;
  if sid is null then
    raise exception 'no_candidate_student';
  end if;

  -- Roster member of bound class only — never invent / never other-class id
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = b.class_id and e.student_id = sid
  ) then
    raise exception 'student_not_on_roster';
  end if;

  -- Never INSERT into students. Never Approve.
  update public.ingest_packet_name_suggestions
  set
    status = 'accepted',
    accepted_at = now(),
    accepted_by = auth.uid()
  where id = p_suggestion_id
  returning * into sug;

  -- Supersede sibling open suggestions on the same packet
  update public.ingest_packet_name_suggestions
  set status = 'superseded'
  where packet_id = sug.packet_id
    and id is distinct from sug.id
    and status = 'suggested';

  -- Accept after Confirm: attach already-minted capture. Confirm itself is not Accept.
  select * into pkt from public.ingest_packets where id = sug.packet_id;
  if found and pkt.capture_id is not null then
    update public.captures
    set
      student_id = sid,
      status = 'attached',
      attached_at = coalesce(attached_at, now())
    where id = pkt.capture_id
      and class_id = b.class_id
      and status is distinct from 'approved';
  end if;

  return sug;
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_ingest_name_suggestions(p_suggestion_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sid uuid;
  accepted int := 0;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  -- Explicit list required; empty → 0 (no implicit all-high-conf)
  if p_suggestion_ids is null or coalesce(cardinality(p_suggestion_ids), 0) = 0 then
    return 0;
  end if;

  foreach sid in array p_suggestion_ids
  loop
    begin
      perform public.accept_ingest_name_suggestion(sid);
      accepted := accepted + 1;
    exception when others then
      -- Skip ids the caller cannot accept; count only successes
      null;
    end;
  end loop;

  return accepted;
end;
$function$;

CREATE OR REPLACE FUNCTION public.decline_ingest_name_suggestion(p_suggestion_id uuid)
 RETURNS ingest_packet_name_suggestions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sug public.ingest_packet_name_suggestions;
  b public.ingest_batches;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  select * into sug from public.ingest_packet_name_suggestions where id = p_suggestion_id;
  if not found then
    raise exception 'not allowed';
  end if;

  select * into b from public.ingest_batches where id = sug.batch_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;

  if sug.status is distinct from 'suggested' then
    raise exception 'suggestion_not_open';
  end if;

  update public.ingest_packet_name_suggestions
  set status = 'declined'
  where id = p_suggestion_id
  returning * into sug;

  return sug;
end;
$function$;

CREATE OR REPLACE FUNCTION public.count_needs_attention()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  waiting int := 0;
  inbox int := 0;
  turned_in int := 0;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  select count(*)::int into waiting
  from public.ingest_batches b
  where b.teacher_id = auth.uid()
    and b.teacher_confirmed_split = false
    and (
      b.status in ('received', 'rasterizing', 'split_review')
      or (
        b.status = 'receiving'
        and (coalesce(b.file_count, 0) > 0 or coalesce(b.bytes_total, 0) > 0)
      )
    );

  -- Existing Needs: unassigned/attached/draft captures on classes this teacher teaches
  select count(*)::int into inbox
  from public.captures c
  where c.status in ('unassigned', 'attached', 'draft')
    and public.class_teacher_of(c.class_id);

  select count(*)::int into turned_in
  from public.submissions s
  join public.assignments a on a.id = s.assignment_id
  where s.status = 'completed'
    and public.class_teacher_of(a.class_id);

  return waiting + inbox + turned_in;
end;
$function$;

CREATE OR REPLACE FUNCTION public.kick_ingest_drive()
 RETURNS ingest_source_bindings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  row public.ingest_source_bindings;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  update public.ingest_source_bindings
  set
    kick_requested_at = now(),
    updated_at = now()
  where teacher_id = auth.uid()
    and kind = 'google_drive'
    and status not in ('disconnected', 'revoked')
  returning * into row;

  if not found then
    raise exception 'drive_binding_not_found';
  end if;

  -- Must not download Drive or return refresh token (column not selected from vault).
  return row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_calendar_day_tints(p_from timestamp with time zone, p_to timestamp with time zone, p_seat text, p_class_id uuid DEFAULT NULL::uuid, p_child_student_id uuid DEFAULT NULL::uuid, p_categories text[] DEFAULT NULL::text[], p_calendar_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(starts_at timestamp with time zone, role_tint text, category text, calendar_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    i.starts_at,
    i.role_tint,
    i.category,
    i.calendar_id
  from public.list_calendar_items(
    p_from,
    p_to,
    p_seat,
    p_class_id,
    p_child_student_id,
    p_categories,
    p_calendar_ids
  ) as i;
$function$;

CREATE OR REPLACE FUNCTION public.list_ingest_waiting_split()
 RETURNS SETOF ingest_batches
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  return query
  select b.*
  from public.ingest_batches b
  where b.teacher_id = auth.uid()
    and b.teacher_confirmed_split = false
    and (
      b.status in ('received', 'rasterizing', 'split_review')
      or (
        b.status = 'receiving'
        and (coalesce(b.file_count, 0) > 0 or coalesce(b.bytes_total, 0) > 0)
      )
    )
  order by b.created_at desc, b.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_my_ingest_source_bindings(p_kind text DEFAULT NULL::text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF ingest_source_bindings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  kind_filter text := nullif(trim(both from coalesce(p_kind, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if kind_filter is not null and kind_filter not in (
    'agent_folder', 'google_drive', 'session_dir', 'mobile_foreground_folder'
  ) then
    raise exception 'invalid_binding_kind';
  end if;

  -- Settings binds are class-null; Teach ownership only (no class_teacher_of).
  return query
  select b.*
  from public.ingest_source_bindings b
  where b.teacher_id = auth.uid()
    and (kind_filter is null or b.kind = kind_filter)
    and (p_class_id is null or b.class_id = p_class_id)
    and b.status not in ('disconnected', 'revoked')
  order by b.updated_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.attach_ingest_batch_key_to_assignment(p_batch_id uuid)
 RETURNS assignments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.ingest_batches;
  v_key text;
  v_first_ord int;
  v_last_ord int;
  v_packet public.ingest_packets;
  v_page public.ingest_pages;
  v_asset uuid;
  a public.assignments;
  v_kind text;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  select * into b from public.ingest_batches where id = p_batch_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if b.class_id is null or not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.assignment_id is null then
    raise exception 'assignment_required';
  end if;

  v_key := coalesce(nullif(trim(both from b.key_in_stack), ''), 'none');
  if v_key not in ('first', 'last') then
    raise exception 'key_not_in_stack';
  end if;

  select min(p.ordinal), max(p.ordinal)
  into v_first_ord, v_last_ord
  from public.ingest_packets p
  where p.batch_id = p_batch_id
    and p.blank = false;

  select * into v_packet
  from public.ingest_packets p
  where p.batch_id = p_batch_id
    and p.blank = false
    and (
      (v_key = 'first' and p.ordinal is not distinct from v_first_ord)
      or (v_key = 'last' and p.ordinal is not distinct from v_last_ord)
    )
  order by p.ordinal
  limit 1;

  if not found then
    raise exception 'key_packet_missing';
  end if;

  if coalesce(cardinality(v_packet.page_ids), 0) < 1 then
    raise exception 'key_packet_empty';
  end if;

  select * into v_page
  from public.ingest_pages
  where id = v_packet.page_ids[1]
    and batch_id = p_batch_id;
  if not found or v_page.asset_id is null then
    raise exception 'key_asset_missing';
  end if;
  v_asset := v_page.asset_id;

  select * into a
  from public.assignments
  where id = b.assignment_id
    and class_id = b.class_id
  for update;
  if not found then
    raise exception 'assignment not in class';
  end if;

  v_kind := coalesce(nullif(trim(both from a.key_kind), ''), 'none');
  if v_kind = 'items' then
    v_kind := 'both';
  elsif v_kind = 'both' then
    v_kind := 'both';
  else
    v_kind := 'photo';
  end if;

  -- Existing key path only — never invent students / Approve / second key store.
  update public.assignments
  set
    key_asset_id = v_asset,
    key_kind = v_kind,
    key_ready_at = coalesce(key_ready_at, now())
  where id = a.id
  returning * into a;

  return a;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bind_ingest_batch_class(p_batch_id uuid, p_class_id uuid, p_assignment_id uuid DEFAULT NULL::uuid)
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
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if p_class_id is null then
    raise exception 'class_required';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not_class_teacher';
  end if;

  select * into b from public.ingest_batches where id = p_batch_id for update;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if b.teacher_confirmed_split then
    raise exception 'already_confirmed';
  end if;
  if b.status in ('done', 'abandoned', 'confirming') then
    raise exception 'batch not bindable';
  end if;
  if p_assignment_id is not null and not exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and a.class_id = p_class_id
  ) then
    raise exception 'assignment not in class';
  end if;

  -- Must not Confirm; mint captures; invent students.
  update public.ingest_batches
  set
    class_id = p_class_id,
    assignment_id = p_assignment_id,
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  return b;
end;
$function$;

CREATE OR REPLACE FUNCTION public.heartbeat_ingest_agent_device(p_device_public_id text, p_binding_id uuid DEFAULT NULL::uuid, p_set_watching boolean DEFAULT true)
 RETURNS TABLE(device_id uuid, device_status text, last_seen_at timestamp with time zone, binding_id uuid, binding_status text, binding_last_heartbeat_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pub text := trim(both from coalesce(p_device_public_id, ''));
  dev public.ingest_agent_devices;
  bind public.ingest_source_bindings;
  now_ts timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if length(pub) < 8 then
    raise exception 'invalid_device_public_id';
  end if;

  select * into dev
  from public.ingest_agent_devices d
  where d.teacher_id = auth.uid()
    and d.device_public_id = pub
  for update;
  if not found then
    raise exception 'device_not_found';
  end if;
  if dev.status = 'revoked' then
    raise exception 'device_revoked';
  end if;

  update public.ingest_agent_devices
  set
    status = 'active',
    last_seen_at = now_ts,
    updated_at = now_ts
  where id = dev.id
  returning * into dev;

  device_id := dev.id;
  device_status := dev.status;
  last_seen_at := dev.last_seen_at;
  binding_id := null;
  binding_status := null;
  binding_last_heartbeat_at := null;

  if p_binding_id is not null then
    select * into bind
    from public.ingest_source_bindings b
    where b.id = p_binding_id
    for update;
    if not found then
      raise exception 'not allowed';
    end if;
    if bind.teacher_id is distinct from auth.uid() then
      raise exception 'not allowed';
    end if;
    -- DRIVE-NEEDS: Settings agent binds are class-null — Teach ownership only.
    if bind.class_id is not null and not public.class_teacher_of(bind.class_id) then
      raise exception 'not_class_teacher';
    end if;
    if bind.agent_device_id is distinct from dev.id then
      raise exception 'binding_device_mismatch';
    end if;
    if bind.kind is distinct from 'agent_folder' then
      raise exception 'binding_kind_mismatch';
    end if;
    if bind.status in ('disconnected', 'revoked') then
      raise exception 'binding_inactive';
    end if;

    update public.ingest_source_bindings
    set
      status = case
        when coalesce(p_set_watching, true) and status in ('armed', 'watching', 'paused', 'error')
          then 'watching'
        else status
      end,
      last_heartbeat_at = now_ts,
      last_error_code = null,
      updated_at = now_ts
    where id = bind.id
    returning * into bind;

    binding_id := bind.id;
    binding_status := bind.status;
    binding_last_heartbeat_at := bind.last_heartbeat_at;
  end if;

  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.pair_ingest_agent_device(p_device_public_id text, p_platform text, p_display_name text DEFAULT NULL::text, p_refresh_token_hash text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, teacher_id uuid, device_public_id text, display_name text, platform text, status text, last_seen_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pub text := trim(both from coalesce(p_device_public_id, ''));
  plat text := lower(trim(both from coalesce(p_platform, '')));
  nm text := nullif(trim(both from coalesce(p_display_name, '')), '');
  hash text := nullif(trim(both from coalesce(p_refresh_token_hash, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if length(pub) < 8 then
    raise exception 'invalid_device_public_id';
  end if;
  -- Win/Mac only — never chromebook / linux / ios / android agent SKU
  if plat not in ('win', 'mac') then
    raise exception 'invalid_platform';
  end if;

  insert into public.ingest_agent_devices (
    teacher_id, device_public_id, display_name, platform, status, refresh_token_hash
  ) values (
    auth.uid(), pub, nm, plat, 'paired', hash
  )
  on conflict (teacher_id, device_public_id) do update
  set
    display_name = coalesce(excluded.display_name, public.ingest_agent_devices.display_name),
    platform = excluded.platform,
    -- Re-pair keeps paired unless already active; never auto-revoke
    status = case
      when public.ingest_agent_devices.status = 'revoked' then 'paired'
      when public.ingest_agent_devices.status = 'active' then 'active'
      else 'paired'
    end,
    refresh_token_hash = coalesce(excluded.refresh_token_hash, public.ingest_agent_devices.refresh_token_hash),
    updated_at = now()
  returning
    public.ingest_agent_devices.id,
    public.ingest_agent_devices.teacher_id,
    public.ingest_agent_devices.device_public_id,
    public.ingest_agent_devices.display_name,
    public.ingest_agent_devices.platform,
    public.ingest_agent_devices.status,
    public.ingest_agent_devices.last_seen_at,
    public.ingest_agent_devices.created_at,
    public.ingest_agent_devices.updated_at
  into
    id, teacher_id, device_public_id, display_name, platform, status,
    last_seen_at, created_at, updated_at;

  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_ingest_batch_key_in_stack(p_batch_id uuid, p_key_in_stack text)
 RETURNS ingest_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.ingest_batches;
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;

  v_key := lower(coalesce(nullif(trim(both from p_key_in_stack), ''), 'none'));
  if v_key not in ('none', 'first', 'last') then
    raise exception 'invalid_key_in_stack';
  end if;

  select * into b from public.ingest_batches where id = p_batch_id for update;
  if not found then
    raise exception 'not allowed';
  end if;
  if b.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  if b.teacher_confirmed_split then
    raise exception 'already_confirmed';
  end if;
  if b.status in ('done', 'abandoned', 'confirming') then
    raise exception 'batch not bindable';
  end if;
  if b.class_id is not null and not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;

  -- Must not Confirm, mint captures, invent students, or Approve.
  update public.ingest_batches
  set
    key_in_stack = v_key,
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  return b;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_ingest_source_status(p_binding_id uuid, p_status text)
 RETURNS ingest_source_bindings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  row public.ingest_source_bindings;
  new_status text := trim(both from coalesce(p_status, ''));
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if new_status not in (
    'armed', 'watching', 'paused', 'error', 'disconnected', 'revoked'
  ) then
    raise exception 'invalid_status';
  end if;

  select * into row from public.ingest_source_bindings where id = p_binding_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if row.teacher_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  -- class may be null — Teach ownership only (no class_teacher_of required)

  -- Must NOT delete Confirmed captures (or any captures / batches / pre-split rows)
  update public.ingest_source_bindings
  set
    status = new_status,
    last_error_code = case when new_status = 'error' then last_error_code else null end,
    updated_at = now()
  where id = p_binding_id
  returning * into row;

  -- Disconnect Google: clear vault only when no other active Drive binds remain.
  -- Existing Confirmed captures stay. Pre-split batches stay (source-lost chip later).
  if new_status in ('disconnected', 'revoked')
     and row.kind = 'google_drive'
     and not exists (
       select 1 from public.ingest_source_bindings b
       where b.teacher_id = auth.uid()
         and b.kind = 'google_drive'
         and b.id is distinct from p_binding_id
         and b.status not in ('disconnected', 'revoked')
     )
  then
    delete from public.ingest_google_tokens where teacher_id = auth.uid();
  end if;

  return row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_ingest_source_binding(p_class_id uuid, p_kind text, p_assignment_id uuid DEFAULT NULL::uuid, p_display_name text DEFAULT NULL::text, p_agent_device_id uuid DEFAULT NULL::uuid, p_local_folder_bookmark text DEFAULT NULL::text, p_google_folder_id text DEFAULT NULL::text, p_google_drive_id text DEFAULT NULL::text, p_move_originals boolean DEFAULT false, p_binding_id uuid DEFAULT NULL::uuid)
 RETURNS ingest_source_bindings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  row public.ingest_source_bindings;
  v_kind text := trim(both from coalesce(p_kind, ''));
  agent_owner uuid;
  v_class_id uuid := p_class_id;
  v_assignment_id uuid := p_assignment_id;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if v_kind not in (
    'agent_folder', 'google_drive', 'session_dir', 'mobile_foreground_folder'
  ) then
    raise exception 'invalid_binding_kind';
  end if;

  -- Settings Drive/folder binds write null class; assignment stays null at bind.
  if v_kind in ('google_drive', 'agent_folder', 'mobile_foreground_folder', 'session_dir') then
    v_class_id := null;
    v_assignment_id := null;
  end if;

  if v_class_id is not null and not public.class_teacher_of(v_class_id) then
    raise exception 'not_class_teacher';
  end if;
  if v_assignment_id is not null then
    if v_class_id is null then
      raise exception 'assignment_requires_class';
    end if;
    if not exists (
      select 1 from public.assignments a
      where a.id = v_assignment_id and a.class_id = v_class_id
    ) then
      raise exception 'assignment not in class';
    end if;
  end if;

  -- Agent device must belong to the same Teach user.
  if p_agent_device_id is not null then
    select d.teacher_id into agent_owner
    from public.ingest_agent_devices d
    where d.id = p_agent_device_id;
    if agent_owner is null then
      raise exception 'agent_device_not_found';
    end if;
    if agent_owner is distinct from auth.uid() then
      raise exception 'agent_device_not_owned';
    end if;
  end if;
  if v_kind = 'agent_folder' and p_agent_device_id is null and p_binding_id is null then
    raise exception 'agent_device_required';
  end if;

  if p_binding_id is not null then
    -- Verify ownership + kind BEFORE any supersede. Invalid id must not
    -- disconnect the sticky Drive bind or fall through to INSERT.
    select * into row
    from public.ingest_source_bindings
    where id = p_binding_id;
    if not found
       or row.teacher_id is distinct from auth.uid()
       or row.kind is distinct from v_kind then
      raise exception 'binding_not_found';
    end if;

    -- One sticky Drive: only after verified target, supersede other active binds.
    if v_kind = 'google_drive' then
      update public.ingest_source_bindings
      set
        status = 'disconnected',
        last_error_code = 'superseded_settings_bind',
        updated_at = now()
      where teacher_id = auth.uid()
        and kind = 'google_drive'
        and id is distinct from p_binding_id
        and status not in ('disconnected', 'revoked');
    end if;

    update public.ingest_source_bindings
    set
      class_id = v_class_id,
      assignment_id = v_assignment_id,
      display_name = p_display_name,
      agent_device_id = coalesce(p_agent_device_id, agent_device_id),
      local_folder_bookmark = coalesce(p_local_folder_bookmark, local_folder_bookmark),
      google_folder_id = p_google_folder_id,
      google_drive_id = p_google_drive_id,
      move_originals = coalesce(p_move_originals, false),
      status = case
        when status in ('disconnected', 'revoked') then 'armed'
        else status
      end,
      last_error_code = case
        when status in ('disconnected', 'revoked') then null
        else last_error_code
      end,
      updated_at = now()
    where id = p_binding_id
      and teacher_id = auth.uid()
      and public.ingest_source_bindings.kind = v_kind
    returning * into row;

    return row;
  end if;

  -- Re-arm existing active row for teacher-level kind (Drive/mobile) or agent device.
  if v_kind = 'google_drive' then
    update public.ingest_source_bindings
    set
      class_id = null,
      assignment_id = null,
      display_name = p_display_name,
      google_folder_id = p_google_folder_id,
      google_drive_id = p_google_drive_id,
      move_originals = coalesce(p_move_originals, false),
      updated_at = now()
    where teacher_id = auth.uid()
      and public.ingest_source_bindings.kind = 'google_drive'
      and status not in ('disconnected', 'revoked')
    returning * into row;
  elsif v_kind = 'mobile_foreground_folder' then
    update public.ingest_source_bindings
    set
      class_id = null,
      assignment_id = null,
      display_name = p_display_name,
      local_folder_bookmark = coalesce(p_local_folder_bookmark, local_folder_bookmark),
      move_originals = coalesce(p_move_originals, false),
      updated_at = now()
    where teacher_id = auth.uid()
      and public.ingest_source_bindings.kind = 'mobile_foreground_folder'
      and status not in ('disconnected', 'revoked')
    returning * into row;
  elsif v_kind = 'agent_folder' and p_agent_device_id is not null then
    update public.ingest_source_bindings
    set
      class_id = null,
      assignment_id = null,
      display_name = p_display_name,
      agent_device_id = coalesce(p_agent_device_id, agent_device_id),
      local_folder_bookmark = coalesce(p_local_folder_bookmark, local_folder_bookmark),
      move_originals = coalesce(p_move_originals, false),
      updated_at = now()
    where teacher_id = auth.uid()
      and public.ingest_source_bindings.kind = 'agent_folder'
      and agent_device_id = p_agent_device_id
      and status not in ('disconnected', 'revoked')
    returning * into row;
  elsif v_kind = 'session_dir' then
    -- Touch exactly one active row (teacher-level sticky). Avoid multi-row RETURNING.
    update public.ingest_source_bindings
    set
      class_id = null,
      assignment_id = null,
      display_name = p_display_name,
      local_folder_bookmark = coalesce(p_local_folder_bookmark, local_folder_bookmark),
      move_originals = coalesce(p_move_originals, false),
      updated_at = now()
    where id = (
      select b.id
      from public.ingest_source_bindings b
      where b.teacher_id = auth.uid()
        and b.kind = 'session_dir'
        and b.status not in ('disconnected', 'revoked')
      order by b.updated_at desc nulls last, b.created_at desc nulls last, b.id
      limit 1
    )
    returning * into row;
  end if;

  if found then
    return row;
  end if;

  insert into public.ingest_source_bindings (
    teacher_id, class_id, assignment_id, kind, status, display_name,
    agent_device_id, local_folder_bookmark, google_folder_id, google_drive_id,
    move_originals
  ) values (
    auth.uid(), v_class_id, v_assignment_id, v_kind, 'armed', p_display_name,
    p_agent_device_id, p_local_folder_bookmark, p_google_folder_id, p_google_drive_id,
    coalesce(p_move_originals, false)
  )
  returning * into row;

  return row;
end;
$function$;

comment on function public.upsert_ingest_source_binding(uuid, text, uuid, text, uuid, text, text, text, boolean, uuid) is
  'DRIVE-NEEDS: upsert Teach source bind. Class null at Settings. One active Drive/mobile per teacher; agent per device. Never writes tokens.';

-- Public-schema twin of private.lesson_host_secret() (20260828000000), live-only.
-- Reads the Vault secret named LESSON_HOST_SECRET (HMAC for lesson-host JWTs).
-- The secret itself is NOT created here; it must already exist in Vault.
-- service_role only.
CREATE OR REPLACE FUNCTION public.lesson_host_secret()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'vault', 'pg_temp'
AS $function$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'LESSON_HOST_SECRET'
  limit 1;
$function$;

-- ---------------------------------------------------------------------------
-- Grants (match live ACLs)
-- ---------------------------------------------------------------------------
revoke all on function public.lesson_host_secret() from public, anon, authenticated;
grant execute on function public.lesson_host_secret() to service_role;

do $$
declare
  sig text;
begin
  foreach sig in array array[
    'public.accept_ingest_name_suggestion(uuid)',
    'public.accept_ingest_name_suggestions(uuid[])',
    'public.attach_ingest_batch_key_to_assignment(uuid)',
    'public.bind_ingest_batch_class(uuid, uuid, uuid)',
    'public.count_needs_attention()',
    'public.decline_ingest_name_suggestion(uuid)',
    'public.heartbeat_ingest_agent_device(text, uuid, boolean)',
    'public.ingest_storage_path_allowed(text, uuid, uuid)',
    'public.kick_ingest_drive()',
    'public.list_calendar_day_tints(timestamptz, timestamptz, text, uuid, uuid, text[], uuid[])',
    'public.list_ingest_waiting_split()',
    'public.list_my_ingest_source_bindings(text, uuid)',
    'public.pair_ingest_agent_device(text, text, text, text)',
    'public.set_ingest_batch_key_in_stack(uuid, text)',
    'public.set_ingest_source_status(uuid, text)',
    'public.upsert_ingest_source_binding(uuid, text, uuid, text, uuid, text, text, text, boolean, uuid)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated, service_role', sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Comments (verbatim from live)
-- ---------------------------------------------------------------------------
comment on function public.accept_ingest_name_suggestion(uuid) is
  'Accept NAME-V2 suggestion. Roster-only. Never INSERT students. Never auto-Approve.';
comment on function public.accept_ingest_name_suggestions(uuid[]) is
  'Bulk Accept by explicit suggestion id list. Empty list returns 0. Never invent students. Never auto-Approve.';
comment on function public.attach_ingest_batch_key_to_assignment(uuid) is
  'AK-A: attach first/last key packet JPEG asset to assignments.key_asset_id / key_kind. Fail-open from client if missing. Never invent students or Approve.';
comment on function public.bind_ingest_batch_class(uuid, uuid, uuid) is
  'SC-A: set class (+ optional assignment) on pre-Confirm batch. Must not Confirm or mint captures.';
comment on function public.count_needs_attention() is
  'NB-A: teacher-wide waiting-split + existing Needs. Parent/non-teacher rejected.';
comment on function public.heartbeat_ingest_agent_device(text, uuid, boolean) is
  'DRIVE-NEEDS: agent heartbeat. Null-class binds use Teach ownership; class_teacher_of only when class set.';
comment on function public.ingest_storage_path_allowed(text, uuid, uuid) is
  'True iff storage_path is under {teacher_id}/ingest/{batch_id}/ with no traversal.';
comment on function public.kick_ingest_drive() is
  'Teach on-open kick: set kick_requested_at on active Drive bind. Never downloads Drive or returns tokens.';
comment on function public.lesson_host_secret() is
  'Edge-only HMAC secret. EXECUTE revoked from anon/authenticated; service_role only.';
comment on function public.list_calendar_day_tints(timestamptz, timestamptz, text, uuid, uuid, text[], uuid[]) is
  'CAL-R3 PERF compact year dots. Same walls as list_calendar_items; no titles/bodies.';
comment on function public.list_ingest_waiting_split() is
  'Teacher-wide pre-split Needs rows. Not Parent/Student; not other teachers.';
comment on function public.list_my_ingest_source_bindings(text, uuid) is
  'DRIVE-NEEDS: list Teach-owned bindings (class may be null). No token vault columns.';
comment on function public.pair_ingest_agent_device(text, text, text, text) is
  'I3 agent pair. Returns safe device columns only — never refresh_token_hash.';
comment on function public.set_ingest_batch_key_in_stack(uuid, text) is
  'AK-A: set ingest_batches.key_in_stack (none|first|last) pre-Confirm. Must not Confirm, mint, Approve, or invent students.';
comment on function public.set_ingest_source_status(uuid, text) is
  'Pause/stop/disconnect a binding. Must NOT delete Confirmed captures or silent-delete pre-split rows.';

-- ---------------------------------------------------------------------------
-- External dependencies (described, not created here)
-- ---------------------------------------------------------------------------
-- * Vault: one secret, LESSON_HOST_SECRET (read by public/private.lesson_host_secret()).
--   Created out-of-band; never stored in migrations.
-- * Storage: ingest uploads live in the existing private "files" bucket under
--   {teacher_id}/ingest/{batch_id}/ (files_*_ingest policies, 20260913000001).
-- * Drive refresh tokens: public.ingest_google_tokens.encrypted_refresh, written only by
--   service_role Edge/worker code. No pg_cron / pg_net jobs exist for ingest on live;
--   Drive polling / kick handling runs outside Postgres.
