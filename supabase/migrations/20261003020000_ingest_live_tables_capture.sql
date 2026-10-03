-- Capture of live-only ingest tables (2026-10-02). Repo-only: NOT applied live.
-- Idempotent; a no-op on the live DB. Schema only: no token / secret data.
--
-- Tables: ingest_agent_devices, ingest_google_tokens, ingest_packet_name_suggestions,
-- ingest_source_seen (+ constraints, indexes, RLS, policies, grants, comments), and the
-- ingest_source_bindings.agent_device_id FK that 20261003010800 could only add when
-- ingest_agent_devices already existed (on a fresh DB it is added here instead).

-- ---------------------------------------------------------------------------
-- ingest_agent_devices
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_agent_devices (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  device_public_id text not null,
  display_name text,
  platform text not null
    constraint ingest_agent_devices_platform_check
    check ((platform = any (array['win'::text, 'mac'::text]))),
  status text not null default 'paired'::text
    constraint ingest_agent_devices_status_check
    check ((status = any (array['paired'::text, 'active'::text, 'stale'::text, 'revoked'::text]))),
  refresh_token_hash text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingest_agent_devices_teacher_id_device_public_id_key unique (teacher_id, device_public_id)
);

create index if not exists ingest_agent_devices_teacher_idx
  on public.ingest_agent_devices using btree (teacher_id);

comment on table public.ingest_agent_devices is
  'BATCH-v2 agent device registry. Teacher may list name+status; never raw refresh_token_hash.';

alter table public.ingest_agent_devices enable row level security;

drop policy if exists ingest_agent_devices_select on public.ingest_agent_devices;
create policy ingest_agent_devices_select on public.ingest_agent_devices
  for select to authenticated
  using ((teacher_id = auth.uid()));

drop policy if exists ingest_agent_devices_update on public.ingest_agent_devices;
create policy ingest_agent_devices_update on public.ingest_agent_devices
  for update to authenticated
  using ((teacher_id = auth.uid()))
  with check ((teacher_id = auth.uid()));

-- Live ACL: postgres + service_role only (no authenticated/anon table grant; access via RPCs).
revoke all on table public.ingest_agent_devices from public, anon, authenticated;
grant all on table public.ingest_agent_devices to service_role;

-- FK from ingest_source_bindings (see 20261003010800 guard).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ingest_source_bindings_agent_device_id_fkey'
      and conrelid = 'public.ingest_source_bindings'::regclass
  ) then
    alter table public.ingest_source_bindings
      add constraint ingest_source_bindings_agent_device_id_fkey
      foreign key (agent_device_id) references public.ingest_agent_devices (id) on delete set null;
  end if;
end $$;

comment on table public.ingest_source_bindings is
  'BATCH-v2 durable agent/Drive/session/mobile bind. One active per teacher+class+kind. Tokens live in vault tables, not here.';

-- ---------------------------------------------------------------------------
-- ingest_google_tokens  (encrypted Drive refresh tokens; service_role only)
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_google_tokens (
  teacher_id uuid primary key references public.profiles (id) on delete cascade,
  encrypted_refresh text not null,
  expiry_at timestamptz,
  scopes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ingest_google_tokens is
  'BATCH-v2 Drive refresh vault. Edge/worker (service_role) only. No authenticated SELECT.';

alter table public.ingest_google_tokens enable row level security;
-- No policies on live (deny-all for API roles).
revoke all on table public.ingest_google_tokens from public, anon, authenticated;
grant all on table public.ingest_google_tokens to service_role;

-- ---------------------------------------------------------------------------
-- ingest_packet_name_suggestions
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_packet_name_suggestions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.ingest_batches (id) on delete cascade,
  packet_id uuid not null references public.ingest_packets (id) on delete cascade,
  raw_text text,
  candidate_student_id uuid references public.students (id) on delete set null,
  confidence real not null default 0
    constraint ingest_packet_name_suggestions_confidence_check
    check (((confidence >= (0)::double precision) and (confidence <= (1)::double precision))),
  status text not null default 'suggested'::text
    constraint ingest_packet_name_suggestions_status_check
    check ((status = any (array['suggested'::text, 'accepted'::text, 'declined'::text, 'superseded'::text]))),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ingest_packet_name_suggestions_batch_idx
  on public.ingest_packet_name_suggestions using btree (batch_id);
create index if not exists ingest_packet_name_suggestions_packet_idx
  on public.ingest_packet_name_suggestions using btree (packet_id, status);

comment on table public.ingest_packet_name_suggestions is
  'NAME-V2 assist. Client SELECT/INSERT suggested only. Only accept_ingest_name_suggestion (DEFINER) may set accepted. Never INSERT students. Never auto-Approve.';

alter table public.ingest_packet_name_suggestions enable row level security;

drop policy if exists ingest_packet_name_suggestions_select on public.ingest_packet_name_suggestions;
create policy ingest_packet_name_suggestions_select on public.ingest_packet_name_suggestions
  for select to authenticated
  using ((exists ( select 1
   from public.ingest_batches b
  where ((b.id = ingest_packet_name_suggestions.batch_id) and (b.teacher_id = auth.uid()) and public.class_teacher_of(b.class_id)))));

drop policy if exists ingest_packet_name_suggestions_insert on public.ingest_packet_name_suggestions;
create policy ingest_packet_name_suggestions_insert on public.ingest_packet_name_suggestions
  for insert to authenticated
  with check (((status = 'suggested'::text) and (accepted_at is null) and (accepted_by is null) and (exists ( select 1
   from public.ingest_batches b
  where ((b.id = ingest_packet_name_suggestions.batch_id) and (b.teacher_id = auth.uid()) and public.class_teacher_of(b.class_id))))));

-- Live ACL: authenticated SELECT + INSERT only.
revoke all on table public.ingest_packet_name_suggestions from public, anon, authenticated;
grant select, insert on table public.ingest_packet_name_suggestions to authenticated;
grant all on table public.ingest_packet_name_suggestions to service_role;

-- ---------------------------------------------------------------------------
-- ingest_source_seen
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_source_seen (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    constraint ingest_source_seen_kind_check
    check ((kind = any (array['agent_folder'::text, 'google_drive'::text, 'session_dir'::text, 'mobile_foreground_folder'::text]))),
  external_id text not null,
  sha256 text,
  batch_id uuid not null references public.ingest_batches (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ingest_source_seen_teacher_id_kind_external_id_key unique (teacher_id, kind, external_id)
);

create index if not exists ingest_source_seen_batch_idx
  on public.ingest_source_seen using btree (batch_id);

comment on table public.ingest_source_seen is
  'DRIVE-NEEDS: one external_id per teacher+kind → one batch. Worker consults before create.';

alter table public.ingest_source_seen enable row level security;

drop policy if exists ingest_source_seen_select on public.ingest_source_seen;
create policy ingest_source_seen_select on public.ingest_source_seen
  for select to authenticated
  using (((teacher_id = auth.uid()) and public.ingest_caller_is_teacher()));

drop policy if exists ingest_source_seen_insert on public.ingest_source_seen;
create policy ingest_source_seen_insert on public.ingest_source_seen
  for insert to authenticated
  with check (((teacher_id = auth.uid()) and public.ingest_caller_is_teacher()));

drop policy if exists ingest_source_seen_update on public.ingest_source_seen;
create policy ingest_source_seen_update on public.ingest_source_seen
  for update to authenticated
  using (((teacher_id = auth.uid()) and public.ingest_caller_is_teacher()))
  with check (((teacher_id = auth.uid()) and public.ingest_caller_is_teacher()));

drop policy if exists ingest_source_seen_delete on public.ingest_source_seen;
create policy ingest_source_seen_delete on public.ingest_source_seen
  for delete to authenticated
  using (((teacher_id = auth.uid()) and public.ingest_caller_is_teacher()));

-- Live ACL: authenticated + service_role all; no anon.
revoke all on table public.ingest_source_seen from public, anon;
grant all on table public.ingest_source_seen to authenticated, service_role;
