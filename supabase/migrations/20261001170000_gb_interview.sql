-- GB-12 setup interview sessions (FR-CHAT-11).
-- Idempotent. RLS: owner only; office admin may manage school-kind rows for their school.
-- Do not apply from the build card — DevOps applies.

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('school', 'syllabus')),
  owner_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  filled jsonb not null default '{}'::jsonb,
  asked jsonb not null default '[]'::jsonb,
  pending_node text,
  next_node text,
  status text not null default 'active'
    check (status in ('active', 'confirm', 'handed_off', 'abandoned')),
  failed_parses jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_sessions_scope_chk check (
    (kind = 'school' and school_id is not null)
    or (kind = 'syllabus' and class_id is not null)
  )
);

create index if not exists interview_sessions_owner_idx
  on public.interview_sessions (owner_id, updated_at desc);

create index if not exists interview_sessions_school_idx
  on public.interview_sessions (school_id)
  where school_id is not null;

create index if not exists interview_sessions_class_idx
  on public.interview_sessions (class_id)
  where class_id is not null;

comment on table public.interview_sessions is
  'GB-12 conversational setup InterviewSession rows. Draft only — never publishes.';

alter table public.interview_sessions enable row level security;

drop policy if exists interview_sessions_owner_select on public.interview_sessions;
create policy interview_sessions_owner_select
  on public.interview_sessions
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (
      kind = 'school'
      and school_id is not null
      and public.is_school_admin()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.school_id = interview_sessions.school_id
      )
    )
  );

drop policy if exists interview_sessions_owner_insert on public.interview_sessions;
create policy interview_sessions_owner_insert
  on public.interview_sessions
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (
      kind = 'syllabus'
      or (
        kind = 'school'
        and public.is_school_admin()
        and school_id is not null
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.school_id = interview_sessions.school_id
        )
      )
    )
  );

drop policy if exists interview_sessions_owner_update on public.interview_sessions;
create policy interview_sessions_owner_update
  on public.interview_sessions
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    or (
      kind = 'school'
      and public.is_school_admin()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.school_id = interview_sessions.school_id
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      kind = 'school'
      and public.is_school_admin()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.school_id = interview_sessions.school_id
      )
    )
  );

drop policy if exists interview_sessions_owner_delete on public.interview_sessions;
create policy interview_sessions_owner_delete
  on public.interview_sessions
  for delete
  to authenticated
  using (owner_id = auth.uid());
