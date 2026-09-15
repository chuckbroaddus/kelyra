-- BATCH-v1 I0: ingest_batches / files / pages / packets + captures.ingest_batch_id.
-- RLS: creator (teacher_id = auth.uid()) AND class_teacher_of — NEVER teaches_class /
-- is_school_admin / is_staff / my_school_id() alone. Confirm ≠ Approve; student_id null.
-- DevOps applies later. Do not apply from the build loop.

-- ---------------------------------------------------------------------------
-- Enum: capture_input_source += batch
-- ---------------------------------------------------------------------------

alter type public.capture_input_source add value if not exists 'batch';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.ingest_batches (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete set null,
  pages_per_student int not null default 1
    check (pages_per_student >= 1 and pages_per_student <= 20),
  ignore_blank_backs boolean not null default true,
  split_method text not null default 'fixed_n'
    check (split_method = 'fixed_n'),
  teacher_confirmed_split boolean not null default false,
  status text not null default 'draft'
    check (status in (
      'draft', 'receiving', 'received', 'rasterizing', 'split_review',
      'confirming', 'processing', 'partial', 'done', 'failed',
      'abandoned', 'retry_remainder'
    )),
  original_sha256 text,
  bytes_total bigint not null default 0,
  page_count int,
  file_count int not null default 0,
  roster_count int,
  error_code text,
  error_message text,
  split_draft_version int not null default 1,
  abandoned_at timestamptz,
  confirmed_at timestamptz,
  ttl_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingest_batches_bytes_cap_check check (
    status = 'draft' or bytes_total <= 262144000
  )
);

comment on table public.ingest_batches is
  'BATCH-v1 class-stack job. Creator-owned. Confirm mints unassigned captures; never auto-Approve.';

create index if not exists ingest_batches_teacher_status_created_idx
  on public.ingest_batches (teacher_id, status, created_at desc);

create index if not exists ingest_batches_class_created_idx
  on public.ingest_batches (class_id, created_at desc);

create unique index if not exists ingest_batches_open_sha_uidx
  on public.ingest_batches (teacher_id, class_id, original_sha256)
  where status not in ('abandoned','failed')
    and original_sha256 is not null;

create table if not exists public.ingest_files (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.ingest_batches (id) on delete cascade,
  sort_index int not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  sha256 text not null,
  storage_path text not null,
  tus_upload_id text,
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'received', 'failed', 'abandoned')),
  page_count int,
  error_code text,
  created_at timestamptz not null default now(),
  unique (batch_id, sort_index),
  unique (batch_id, sha256)
);

create index if not exists ingest_files_batch_sort_idx
  on public.ingest_files (batch_id, sort_index);

create table if not exists public.ingest_pages (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.ingest_batches (id) on delete cascade,
  file_id uuid not null references public.ingest_files (id) on delete cascade,
  page_index int not null,
  file_page_index int not null,
  asset_id uuid references public.assets (id) on delete set null,
  -- Thumbs: use assets.thumb_storage_path on asset_id (no separate thumb FK).
  blank boolean not null default false,
  quality text check (quality is null or quality in ('ok', 'low_contrast', 'unreadable')),
  status text not null default 'pending'
    check (status in ('pending', 'rasterized', 'failed', 'skipped_blank')),
  error_code text,
  byte_size int,
  created_at timestamptz not null default now(),
  unique (batch_id, page_index)
);

create index if not exists ingest_pages_batch_idx on public.ingest_pages (batch_id, page_index);
create index if not exists ingest_pages_file_idx on public.ingest_pages (file_id);

create table if not exists public.ingest_packets (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.ingest_batches (id) on delete cascade,
  ordinal int not null,
  page_ids uuid[] not null default '{}',
  blank boolean not null default false,
  capture_id uuid references public.captures (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'minted', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  unique (batch_id, ordinal)
);

create index if not exists ingest_packets_batch_idx on public.ingest_packets (batch_id, ordinal);

-- captures additive only
alter table public.captures
  add column if not exists ingest_batch_id uuid references public.ingest_batches (id) on delete set null;

create index if not exists captures_ingest_batch_id_idx
  on public.captures (ingest_batch_id)
  where ingest_batch_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at touch
-- ---------------------------------------------------------------------------

create or replace function public.ingest_batches_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ingest_batches_touch_updated_at on public.ingest_batches;
create trigger ingest_batches_touch_updated_at
  before update on public.ingest_batches
  for each row execute function public.ingest_batches_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — creator + class_teacher_of ONLY
-- Forbidden: teaches_class, is_school_admin, is_staff, my_school_id() alone
-- ---------------------------------------------------------------------------

alter table public.ingest_batches enable row level security;
alter table public.ingest_files enable row level security;
alter table public.ingest_pages enable row level security;
alter table public.ingest_packets enable row level security;

drop policy if exists ingest_batches_select on public.ingest_batches;
create policy ingest_batches_select on public.ingest_batches
  for select to authenticated
  using (
    teacher_id = auth.uid()
    and public.class_teacher_of(class_id)
  );

drop policy if exists ingest_batches_insert on public.ingest_batches;
create policy ingest_batches_insert on public.ingest_batches
  for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.class_teacher_of(class_id)
  );

drop policy if exists ingest_batches_update on public.ingest_batches;
create policy ingest_batches_update on public.ingest_batches
  for update to authenticated
  using (
    teacher_id = auth.uid()
    and public.class_teacher_of(class_id)
  )
  with check (
    teacher_id = auth.uid()
    and public.class_teacher_of(class_id)
  );

drop policy if exists ingest_batches_delete on public.ingest_batches;
create policy ingest_batches_delete on public.ingest_batches
  for delete to authenticated
  using (
    teacher_id = auth.uid()
    and public.class_teacher_of(class_id)
  );

drop policy if exists ingest_files_all on public.ingest_files;
create policy ingest_files_all on public.ingest_files
  for all to authenticated
  using (
    exists (
      select 1 from public.ingest_batches b
      where b.id = batch_id
        and b.teacher_id = auth.uid()
        and public.class_teacher_of(b.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.ingest_batches b
      where b.id = batch_id
        and b.teacher_id = auth.uid()
        and public.class_teacher_of(b.class_id)
    )
  );

drop policy if exists ingest_pages_all on public.ingest_pages;
create policy ingest_pages_all on public.ingest_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.ingest_batches b
      where b.id = batch_id
        and b.teacher_id = auth.uid()
        and public.class_teacher_of(b.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.ingest_batches b
      where b.id = batch_id
        and b.teacher_id = auth.uid()
        and public.class_teacher_of(b.class_id)
    )
  );

drop policy if exists ingest_packets_all on public.ingest_packets;
create policy ingest_packets_all on public.ingest_packets
  for all to authenticated
  using (
    exists (
      select 1 from public.ingest_batches b
      where b.id = batch_id
        and b.teacher_id = auth.uid()
        and public.class_teacher_of(b.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.ingest_batches b
      where b.id = batch_id
        and b.teacher_id = auth.uid()
        and public.class_teacher_of(b.class_id)
    )
  );

revoke all on table public.ingest_batches from public, anon;
revoke all on table public.ingest_files from public, anon;
revoke all on table public.ingest_pages from public, anon;
revoke all on table public.ingest_packets from public, anon;

grant select, insert, update, delete on table public.ingest_batches to authenticated;
grant select, insert, update, delete on table public.ingest_files to authenticated;
grant select, insert, update, delete on table public.ingest_pages to authenticated;
grant select, insert, update, delete on table public.ingest_packets to authenticated;

-- ---------------------------------------------------------------------------
-- Internal: teacher profile wall (role=teacher OR also_teacher + class_teachers)
-- ---------------------------------------------------------------------------

create or replace function public.ingest_caller_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'teacher' or p.also_teacher = true)
    );
$$;

comment on function public.ingest_caller_is_teacher() is
  'True iff auth.uid() is teacher or also_teacher. Office-only fails. Used with class_teacher_of.';

revoke all on function public.ingest_caller_is_teacher() from public, anon;
grant execute on function public.ingest_caller_is_teacher() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create_ingest_batch
-- ---------------------------------------------------------------------------

create or replace function public.create_ingest_batch(
  p_class_id uuid,
  p_assignment_id uuid default null,
  p_pages_per_student int default 1
)
returns public.ingest_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.ingest_batches;
  pages int := coalesce(p_pages_per_student, 1);
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not public.ingest_caller_is_teacher() then
    raise exception 'not_teacher';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not_class_teacher';
  end if;
  if pages < 1 or pages > 20 then
    raise exception 'pages_per_student out of range';
  end if;
  if p_assignment_id is not null and not exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and a.class_id = p_class_id
  ) then
    raise exception 'assignment not in class';
  end if;

  insert into public.ingest_batches (
    teacher_id, class_id, assignment_id, pages_per_student, status, ttl_at
  ) values (
    auth.uid(), p_class_id, p_assignment_id, pages, 'draft', now() + interval '24 hours'
  )
  returning * into row;

  return row;
end;
$$;

revoke all on function public.create_ingest_batch(uuid, uuid, int) from public, anon;
grant execute on function public.create_ingest_batch(uuid, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: register_ingest_file
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPC: ingest_mark_received
-- original_sha256 = sha256(hex hashes in sort_index order joined by newline)
-- ---------------------------------------------------------------------------

create or replace function public.ingest_mark_received(p_batch_id uuid)
returns public.ingest_batches
language plpgsql
security definer
set search_path = public
as $$
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
  if not public.class_teacher_of(b.class_id) then
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

  -- No captures at mark-received.
  return b;
end;
$$;

revoke all on function public.ingest_mark_received(uuid) from public, anon;
grant execute on function public.ingest_mark_received(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: save_ingest_split
-- p_packets: [{id, ordinal, page_ids, blank}, ...]
-- Atomic under batch lock: park ordinals → upsert payload → delete absent drafts.
-- (Client also inserts with temp ordinals before RPC for older update-only deploys.)
-- ---------------------------------------------------------------------------

create or replace function public.save_ingest_split(
  p_batch_id uuid,
  p_packets jsonb,
  p_version int
)
returns public.ingest_batches
language plpgsql
security definer
set search_path = public
as $$
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
  if not public.class_teacher_of(b.class_id) then
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

  -- Free unique (batch_id, ordinal) before dense renumber / upsert.
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

  -- Drop draft packets removed by Merge only after upsert under the same lock.
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
$$;

revoke all on function public.save_ingest_split(uuid, jsonb, int) from public, anon;
grant execute on function public.save_ingest_split(uuid, jsonb, int) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: confirm_ingest_batch
-- Mints unassigned captures. NEVER matcher / analyze / INSERT students /
-- skill_gaps / approved_* / guessed_student_id. Confirm ≠ Approve.
-- ---------------------------------------------------------------------------

create or replace function public.confirm_ingest_batch(
  p_batch_id uuid,
  p_version int
)
returns public.ingest_batches
language plpgsql
security definer
set search_path = public
as $$
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
  if b.status is distinct from 'split_review' then
    raise exception 'batch not in split_review';
  end if;
  if b.split_draft_version is distinct from p_version then
    raise exception 'confirm_conflict';
  end if;

  select count(*)::int into eligible
  from public.ingest_packets p
  where p.batch_id = p_batch_id
    and p.blank = false
    and p.capture_id is null;

  if eligible < 1 then
    raise exception 'no eligible packets';
  end if;

  -- Precondition: at least one non-blank packet with all pages rasterized
  if not exists (
    select 1
    from public.ingest_packets p
    where p.batch_id = p_batch_id
      and p.blank = false
      and p.capture_id is null
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

  /* Confirm ≠ Approve; student_id null */
  -- Mint shape lock (Inbox unassigned; no Approve / students / skill_gaps).
  perform jsonb_build_object('student_id', null);

  for pkt in
    select * from public.ingest_packets
    where batch_id = p_batch_id
      and blank = false
      and capture_id is null
    order by ordinal
  loop
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
$$;

revoke all on function public.confirm_ingest_batch(uuid, int) from public, anon;
grant execute on function public.confirm_ingest_batch(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: abandon_ingest_batch — pre-confirm only → abandoned; 0 captures
-- I5: also allow partial/retry_remainder when no packet has capture_id
-- (releases open_sha lock). Confirm-partial with minted captures still blocked.
-- ---------------------------------------------------------------------------

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

  -- Confirm-partial leaves capture_id on packets; refuse so Inbox captures stay.
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

-- ---------------------------------------------------------------------------
-- RPC: retry_ingest_remainder — partial → retry_remainder
-- ---------------------------------------------------------------------------

create or replace function public.retry_ingest_remainder(p_batch_id uuid)
returns public.ingest_batches
language plpgsql
security definer
set search_path = public
as $$
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
  if not public.class_teacher_of(b.class_id) then
    raise exception 'not_class_teacher';
  end if;
  if b.status is distinct from 'partial' then
    raise exception 'batch not partial';
  end if;

  -- Only pages pending/failed and packets draft/failed without capture are in scope
  -- for the worker; this RPC only flips batch status.
  update public.ingest_batches
  set
    status = 'retry_remainder',
    updated_at = now()
  where id = p_batch_id
  returning * into b;

  return b;
end;
$$;

revoke all on function public.retry_ingest_remainder(uuid) from public, anon;
grant execute on function public.retry_ingest_remainder(uuid) to authenticated;
