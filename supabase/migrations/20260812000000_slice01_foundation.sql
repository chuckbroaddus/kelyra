-- Slice 01 foundation: roster + captures + gaps.
-- No practice_sets, assignments, submissions, parent_accesses, or roster_imports.

create extension if not exists pgcrypto;

-- Enums

create type public.class_name_source as enum ('voice', 'typed');
create type public.student_created_via as enum ('voice', 'photo_list', 'typed');
create type public.asset_kind as enum ('photo', 'audio');
create type public.capture_kind as enum ('homework', 'voice_note');
create type public.capture_input_source as enum ('voice', 'camera', 'typed');
create type public.capture_status as enum (
  'unassigned',
  'attached',
  'draft',
  'approved',
  'note_only'
);
create type public.gap_source as enum ('model', 'teacher');
create type public.gap_status as enum ('draft', 'approved', 'dismissed');

-- Tables

create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  active_class_id uuid,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  name text not null,
  join_code text not null unique,
  name_source public.class_name_source not null default 'typed',
  created_at timestamptz not null default now()
);

alter table public.teachers
  add constraint teachers_active_class_id_fkey
  foreign key (active_class_id) references public.classes (id) on delete set null;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  label text not null,
  normalized_label text not null,
  unique (class_id, normalized_label)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  display_name text not null,
  sort_name text,
  name_aliases text[] not null default '{}',
  current_focus_skill_id uuid references public.skills (id) on delete set null,
  parent_sentence text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_via public.student_created_via not null default 'typed'
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  mime_type text,
  byte_size integer,
  created_at timestamptz not null default now()
);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  kind public.capture_kind not null,
  photo_asset_id uuid references public.assets (id) on delete set null,
  audio_asset_id uuid references public.assets (id) on delete set null,
  transcript text,
  input_source public.capture_input_source not null,
  status public.capture_status not null default 'unassigned',
  guessed_student_id uuid references public.students (id) on delete set null,
  match_confidence real,
  model_draft jsonb,
  draft_score numeric,
  approved_score numeric,
  teacher_note text,
  parent_sentence text,
  created_at timestamptz not null default now(),
  attached_at timestamptz,
  approved_at timestamptz,
  constraint captures_unassigned_has_no_student check (
    (status = 'unassigned' and student_id is null)
    or (status <> 'unassigned')
  )
);

create table public.skill_gaps (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete set null,
  label text not null,
  source public.gap_source not null,
  status public.gap_status not null default 'draft',
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create index captures_class_status_idx on public.captures (class_id, status);
create index captures_student_created_idx on public.captures (student_id, created_at desc);
create index enrollments_class_idx on public.enrollments (class_id);
create index skill_gaps_capture_idx on public.skill_gaps (capture_id);
create index students_metadata_gin on public.students using gin (metadata);

-- Join codes

create or replace function public.generate_join_code()
returns text
language sql
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (1 + floor(random() * 32))::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;

create or replace function public.classes_set_join_code()
returns trigger
language plpgsql
as $$
declare
  candidate text;
begin
  if new.join_code is not null and length(new.join_code) > 0 then
    return new;
  end if;
  loop
    candidate := public.generate_join_code();
    exit when not exists (select 1 from public.classes where join_code = candidate);
  end loop;
  new.join_code := candidate;
  return new;
end;
$$;

create trigger classes_join_code_before_insert
  before insert on public.classes
  for each row
  execute function public.classes_set_join_code();

-- New auth user → teacher row

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teachers (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.skills enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.assets enable row level security;
alter table public.captures enable row level security;
alter table public.skill_gaps enable row level security;

create policy teachers_own on public.teachers
  for all using (id = auth.uid())
  with check (id = auth.uid());

create policy classes_own on public.classes
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy students_own on public.students
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy skills_via_class on public.skills
  for all using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

create policy enrollments_via_class on public.enrollments
  for all using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.teacher_id = auth.uid()
    )
  );

create policy assets_own on public.assets
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy captures_via_class on public.captures
  for all using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

create policy skill_gaps_via_capture on public.skill_gaps
  for all using (
    exists (
      select 1
      from public.captures cap
      join public.classes c on c.id = cap.class_id
      where cap.id = capture_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.captures cap
      join public.classes c on c.id = cap.class_id
      where cap.id = capture_id and c.teacher_id = auth.uid()
    )
  );

-- Private media buckets

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false), ('audio', 'audio', false)
on conflict (id) do nothing;

create policy media_select_own on storage.objects
  for select using (
    bucket_id in ('photos', 'audio')
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy media_insert_own on storage.objects
  for insert with check (
    bucket_id in ('photos', 'audio')
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy media_update_own on storage.objects
  for update using (
    bucket_id in ('photos', 'audio')
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy media_delete_own on storage.objects
  for delete using (
    bucket_id in ('photos', 'audio')
    and split_part(name, '/', 1) = auth.uid()::text
  );
