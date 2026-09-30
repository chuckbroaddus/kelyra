-- GB-11 AI ingest jobs (syllabus + school policy documents → IngestProposal).
-- Idempotent. RLS: owner, class teacher, or school office admin.
-- Do not apply from the build card — DevOps applies.

create table if not exists public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('syllabus', 'school_policy')),
  owner uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  source_paths jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'proposed', 'accepted', 'discarded', 'failed')),
  proposal jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingest_jobs_scope_chk check (
    (kind = 'syllabus' and class_id is not null)
    or (kind = 'school_policy' and school_id is not null)
  )
);

create index if not exists ingest_jobs_owner_created_idx
  on public.ingest_jobs (owner, created_at desc);

create index if not exists ingest_jobs_class_idx
  on public.ingest_jobs (class_id)
  where class_id is not null;

create index if not exists ingest_jobs_school_idx
  on public.ingest_jobs (school_id)
  where school_id is not null;

alter table public.ingest_jobs enable row level security;

drop policy if exists ingest_jobs_select on public.ingest_jobs;
create policy ingest_jobs_select
  on public.ingest_jobs
  for select
  using (
    owner = auth.uid()
    or (
      class_id is not null
      and exists (
        select 1 from public.class_teachers ct
        where ct.class_id = ingest_jobs.class_id
          and ct.teacher_id = auth.uid()
      )
    )
    or (
      school_id is not null
      and public.is_school_admin()
      and public.my_school_id() is not null
      and school_id is not distinct from public.my_school_id()
    )
  );

drop policy if exists ingest_jobs_insert on public.ingest_jobs;
create policy ingest_jobs_insert
  on public.ingest_jobs
  for insert
  with check (
    owner = auth.uid()
    and (
      (
        kind = 'syllabus'
        and class_id is not null
        and exists (
          select 1 from public.class_teachers ct
          where ct.class_id = class_id
            and ct.teacher_id = auth.uid()
        )
      )
      or (
        kind = 'school_policy'
        and school_id is not null
        and public.is_school_admin()
        and public.my_school_id() is not null
        and school_id is not distinct from public.my_school_id()
      )
    )
  );

drop policy if exists ingest_jobs_update on public.ingest_jobs;
create policy ingest_jobs_update
  on public.ingest_jobs
  for update
  using (
    owner = auth.uid()
    or (
      class_id is not null
      and exists (
        select 1 from public.class_teachers ct
        where ct.class_id = ingest_jobs.class_id
          and ct.teacher_id = auth.uid()
      )
    )
    or (
      school_id is not null
      and public.is_school_admin()
      and public.my_school_id() is not null
      and school_id is not distinct from public.my_school_id()
    )
  )
  with check (
    owner = auth.uid()
    or (
      class_id is not null
      and exists (
        select 1 from public.class_teachers ct
        where ct.class_id = ingest_jobs.class_id
          and ct.teacher_id = auth.uid()
      )
    )
    or (
      school_id is not null
      and public.is_school_admin()
      and public.my_school_id() is not null
      and school_id is not distinct from public.my_school_id()
    )
  );

drop policy if exists ingest_jobs_delete on public.ingest_jobs;
create policy ingest_jobs_delete
  on public.ingest_jobs
  for delete
  using (owner = auth.uid());

drop trigger if exists trg_ingest_jobs_updated on public.ingest_jobs;
create trigger trg_ingest_jobs_updated
  before update on public.ingest_jobs
  for each row execute function public.gb_set_updated_at();

comment on table public.ingest_jobs is
  'GB-11 AI document ingest jobs; proposal jsonb is IngestProposal, never auto-published.';
