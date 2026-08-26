-- Interactive lessons as assignable work (part 2 of 2).
-- Run after 20260824000000_assignment_kind_lesson.sql has committed.
--
-- Privilege wall (fail closed to “work on a student in a class I teach”):
--   * Catalog SELECT: signed-in user who appears in class_teachers.
--     Not is_staff, not is_school_admin, not office-wide.
--   * Assignment INSERT/SELECT/UPDATE: existing assignments_via_class
--     (teaches_class). App assign path also requires a class_teachers
--     row for auth.uid() so a normal teacher cannot attach Class B.
--   * Student open/report: SECURITY DEFINER, but only my_student_id()
--     on that assignment’s submission cell — same width as
--     student_list_todo / student_submit. Anon revoked.
--   * Parent: lesson_status added inside parent_progress, which already
--     lists only parent_students children. Does not ride get_parent_card
--     or school_*_for_link.
--   * lessons bucket: private, no authenticated policies. Students never
--     list. Gateway (lesson-host) reads objects only after verifying a
--     short-lived lesson JWT minted from the user-JWT RPC. Service role
--     is infrastructure for that stream, not the actor.
--
-- Do not copy office dumps. Do not stack on thread-member insert.
-- Ask tools assign_lesson / open_lesson / read_lesson_results are not
-- in this migration.

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table if not exists public.lesson_packs (
  id uuid primary key default gen_random_uuid(),
  deck_id text not null,
  version text not null,
  title text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (deck_id, version),
  constraint lesson_packs_deck_id_check check (deck_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'),
  constraint lesson_packs_version_check check (version ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$')
);

comment on table public.lesson_packs is
  'Teacher catalog of hosted lesson packs. Pick deck_id + version; never a URL. Students have no SELECT.';

alter table public.lesson_packs enable row level security;

drop policy if exists lesson_packs_taught_teacher_read on public.lesson_packs;
create policy lesson_packs_taught_teacher_read on public.lesson_packs
  for select using (
    published
    and auth.uid() is not null
    and exists (
      select 1
      from public.class_teachers ct
      where ct.teacher_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated. Seed / admin SQL only.

revoke all on table public.lesson_packs from public, anon;
grant select on table public.lesson_packs to authenticated;

insert into public.lesson_packs (deck_id, version, title, published)
values ('fom-ch01', 'v4', 'Fundamentals of Math · Chapter 1', true)
on conflict (deck_id, version) do nothing;

-- ---------------------------------------------------------------------------
-- Assignment columns (pack id stored, not a URL)
-- ---------------------------------------------------------------------------

alter table public.assignments
  add column if not exists deck_id text;

alter table public.assignments
  add column if not exists lesson_version text;

comment on column public.assignments.deck_id is
  'Lesson pack deck_id when kind = lesson. Never a URL or storage path.';
comment on column public.assignments.lesson_version is
  'Lesson pack version when kind = lesson. Storage prefix is deck_id/version.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_lesson_pack_check'
  ) then
    alter table public.assignments
      add constraint assignments_lesson_pack_check
      check (
        kind <> 'lesson'
        or (
          deck_id is not null
          and lesson_version is not null
          and deck_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
          and lesson_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
        )
      );
  end if;
end $$;

create index if not exists assignments_lesson_class_idx
  on public.assignments (class_id)
  where kind = 'lesson';

-- ---------------------------------------------------------------------------
-- Private lessons bucket. No authenticated object policies.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('lessons', 'lessons', false)
on conflict (id) do update set public = false;

-- No storage.objects policies for bucket `lessons`.
-- Existing photos/audio/files policies do not include it, so authenticated
-- SELECT/INSERT/UPDATE/DELETE fail closed. Students never list.
-- Upload is an admin script (service role), out of band. lesson-host reads
-- objects only after verifying a short-lived lesson JWT.

-- ---------------------------------------------------------------------------
-- Student to-do includes lessons (own cells only)
-- ---------------------------------------------------------------------------

drop function if exists public.student_list_todo();

create function public.student_list_todo()
returns table (
  submission_id uuid,
  assignment_id uuid,
  assignment_title text,
  kind text,
  status public.submission_status,
  due_at timestamptz,
  deck_id text,
  lesson_version text,
  items jsonb,
  answers jsonb,
  focus_label text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sub.id,
    a.id,
    a.title,
    a.kind::text,
    sub.status,
    a.due_at,
    a.deck_id,
    a.lesson_version,
    ps.items,
    sub.answers,
    sk.label
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  left join public.practice_sets ps on ps.id = a.practice_set_id
  left join public.students st on st.id = sub.student_id
  left join public.skills sk on sk.id = st.current_focus_skill_id
  where sub.student_id = public.my_student_id()
    and a.kind in ('practice', 'lesson')
  order by sub.created_at desc;
$$;

comment on function public.student_list_todo() is
  'Own practice + lesson cells for the signed-in student login. No class roll-up.';

revoke all on function public.student_list_todo() from public, anon;
grant execute on function public.student_list_todo() to authenticated;

-- Practice submit must not touch lesson cells.
create or replace function public.student_submit(
  p_submission_id uuid,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
begin
  if sid is null then
    raise exception 'This login is not assigned to a roster name';
  end if;

  update public.submissions sub
  set
    answers = p_answers,
    status = 'submitted',
    submitted_at = now()
  from public.assignments a
  where sub.id = p_submission_id
    and sub.assignment_id = a.id
    and sub.student_id = sid
    and sub.status = 'assigned'
    and a.kind = 'practice';

  if not found then
    raise exception 'Submission not found or already submitted';
  end if;

  perform public.write_audit(
    'student_submit',
    'submission',
    p_submission_id::text,
    sid,
    null,
    null,
    jsonb_build_object('submitted', true)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- student_open_lesson — identity + pack prefix, no token, no URL
-- ---------------------------------------------------------------------------

create or replace function public.student_open_lesson(p_assignment_id uuid)
returns table (
  assignment_id uuid,
  submission_id uuid,
  title text,
  deck_id text,
  lesson_version text,
  class_id uuid,
  class_name text,
  school_name text,
  teacher_name text,
  student_id uuid,
  student_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if sid is null then
    raise exception 'This login is not assigned to a roster name';
  end if;

  return query
  select
    a.id,
    sub.id,
    a.title,
    a.deck_id,
    a.lesson_version,
    c.id,
    c.name,
    coalesce(sch.name, 'School'),
    coalesce(
      nullif(t.display_name, ''),
      nullif(tp.display_name, ''),
      'Teacher'
    ),
    s.id,
    s.display_name
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  join public.students s on s.id = sub.student_id
  left join public.schools sch on sch.id = public.my_school_id()
  left join public.teachers t on t.id = c.teacher_id
  left join public.profiles tp on tp.id = c.teacher_id
  where a.id = p_assignment_id
    and a.kind = 'lesson'
    and sub.student_id = sid
    and a.deck_id is not null
    and a.lesson_version is not null
  limit 1;

  if not found then
    raise exception 'Lesson not found';
  end if;
end;
$$;

comment on function public.student_open_lesson(uuid) is
  'Own lesson cell only. Returns identity + deck_id/version. Minting the host JWT is the Edge Function using this RPC under the user JWT. No storage path, no URL.';

revoke all on function public.student_open_lesson(uuid) from public, anon;
grant execute on function public.student_open_lesson(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- student_report_lesson — overwrite own cell. Repeat Open overwrites.
-- ---------------------------------------------------------------------------

create or replace function public.student_report_lesson(
  p_assignment_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
  state text;
  prev jsonb;
  attempt int;
  klass uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if sid is null then
    raise exception 'This login is not assigned to a roster name';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Lesson payload required';
  end if;

  state := coalesce(nullif(p_payload->>'state', ''), 'in_progress');
  if state not in ('in_progress', 'abandoned', 'complete') then
    state := 'in_progress';
  end if;

  select sub.answers, a.class_id
    into prev, klass
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.id = p_assignment_id
    and a.kind = 'lesson'
    and sub.student_id = sid;

  if not found then
    raise exception 'Lesson not found';
  end if;

  attempt := coalesce((prev->>'attempt')::int, 0);
  if state = 'complete' then
    if coalesce(prev->>'state', '') = 'complete' then
      attempt := greatest(attempt, 1) + 1;
    else
      attempt := greatest(attempt, 1);
    end if;
  elsif attempt < 1 then
    attempt := 1;
  end if;

  update public.submissions sub
  set
    answers = jsonb_strip_nulls(
      coalesce(p_payload, '{}'::jsonb)
      || jsonb_build_object(
        'kind', 'lesson',
        'state', state,
        'attempt', attempt
      )
    ),
    status = case
      when state = 'complete' and sub.status is distinct from 'approved'
        then 'submitted'::public.submission_status
      else sub.status
    end,
    submitted_at = case
      when state = 'complete' then now()
      else sub.submitted_at
    end
  from public.assignments a
  where sub.assignment_id = a.id
    and a.id = p_assignment_id
    and a.kind = 'lesson'
    and sub.student_id = sid;

  if not found then
    raise exception 'Lesson not found';
  end if;

  perform public.write_audit(
    'student_report_lesson',
    'submission',
    p_assignment_id::text,
    sid,
    klass,
    null,
    jsonb_build_object('state', state, 'attempt', attempt)
  );
end;
$$;

comment on function public.student_report_lesson(uuid, jsonb) is
  'Overwrite the signed-in student’s lesson cell. Repeat Open overwrites the same row (attempt increments on complete). Never writes another student. Metrics are evidence; status submitted is not a grade.';

revoke all on function public.student_report_lesson(uuid, jsonb) from public, anon;
grant execute on function public.student_report_lesson(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Parent progress: linked children only + lesson_status (no scores)
-- ---------------------------------------------------------------------------

create or replace function public.parent_progress(p_parent uuid)
returns table (
  parent_id uuid,
  parent_display_name text,
  parent_photo_path text,
  parent_relationship text,
  parent_relationship_other text,
  parent_phone text,
  parent_email text,
  parent_address text,
  parent_preferred_contact text,
  children jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    pa_asset.storage_path,
    nullif(p.metadata->>'relationship', ''),
    nullif(p.metadata->>'relationship_other', ''),
    nullif(p.metadata->>'phone', ''),
    nullif(p.metadata->>'email', ''),
    nullif(p.metadata->>'address', ''),
    nullif(p.metadata->>'preferred_contact', ''),
    coalesce(
      (
        select jsonb_agg(child.row order by child.sort_name, child.display_name)
        from (
          select
            s.sort_name,
            s.display_name,
            jsonb_build_object(
              'student_id', s.id,
              'display_name', s.display_name,
              'preferred_name', nullif(s.metadata->>'preferred_name', ''),
              'photo_path', st_asset.storage_path,
              'birthday_md',
                case
                  when (s.metadata->>'birthday') ~ '^\d{4}-\d{2}-\d{2}$'
                  then to_char((s.metadata->>'birthday')::date, 'Mon FMDD')
                  else null
                end,
              'class_name', (
                select c.name
                from public.enrollments e
                join public.classes c on c.id = e.class_id
                where e.student_id = s.id
                order by e.created_at
                limit 1
              ),
              'focus_label', sk.label,
              'practice_status', (
                select sub.status::text
                from public.submissions sub
                join public.assignments a on a.id = sub.assignment_id
                where sub.student_id = s.id
                  and a.kind = 'practice'
                order by sub.created_at desc
                limit 1
              ),
              'lesson_status', (
                select
                  case
                    when sub.status in ('submitted', 'approved') then 'done'
                    when coalesce(sub.answers->>'state', '') in ('in_progress', 'abandoned', 'complete')
                      then 'in_progress'
                    else 'assigned'
                  end
                from public.submissions sub
                join public.assignments a on a.id = sub.assignment_id
                where sub.student_id = s.id
                  and a.kind = 'lesson'
                order by sub.created_at desc
                limit 1
              ),
              'parent_sentence', s.parent_sentence
            ) as row
          from public.parent_students ps
          join public.students s on s.id = ps.student_id
          left join public.assets st_asset on st_asset.id = s.photo_asset_id
          left join public.skills sk on sk.id = s.current_focus_skill_id
          where ps.parent_id = p.id
        ) child
      ),
      '[]'::jsonb
    )
  from public.parents p
  left join public.assets pa_asset on pa_asset.id = p.photo_asset_id
  where p.id = p_parent
  limit 1;
$$;
