-- Section-sized FoM Ch01 packs + storage prefix / beat window.
-- Chief of Staff: apply this migration. Do not upload the deck folder
-- (lessons/fom-ch01/v4/) unless Chuck confirms Storage quota.
--
-- Catalog deck_id is the assignable pack (fom-ch01-s13). Storage objects
-- stay at lessons/fom-ch01/v4/. JWT/host prefix is storage_deck_id/version.
-- Beat window is copied onto the assignment at assign and returned at open.
-- Do not reuse assignments.section (practice gradebook grouping).

-- ---------------------------------------------------------------------------
-- Pack metadata
-- ---------------------------------------------------------------------------

alter table public.lesson_packs
  add column if not exists storage_deck_id text;

alter table public.lesson_packs
  add column if not exists beat_start text;

alter table public.lesson_packs
  add column if not exists beat_end text;

update public.lesson_packs
set
  storage_deck_id = coalesce(nullif(storage_deck_id, ''), deck_id),
  beat_start = coalesce(nullif(beat_start, ''), 'hook'),
  beat_end = coalesce(nullif(beat_end, ''), 'done')
where storage_deck_id is null
   or beat_start is null
   or beat_end is null;

alter table public.lesson_packs
  alter column storage_deck_id set not null;

alter table public.lesson_packs
  alter column beat_start set not null;

alter table public.lesson_packs
  alter column beat_end set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lesson_packs_storage_deck_id_check'
  ) then
    alter table public.lesson_packs
      add constraint lesson_packs_storage_deck_id_check
      check (storage_deck_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$');
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'lesson_packs_beat_start_check'
  ) then
    alter table public.lesson_packs
      add constraint lesson_packs_beat_start_check
      check (beat_start ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$');
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'lesson_packs_beat_end_check'
  ) then
    alter table public.lesson_packs
      add constraint lesson_packs_beat_end_check
      check (beat_end ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$');
  end if;
end $$;

comment on column public.lesson_packs.deck_id is
  'Assignable pack id (e.g. fom-ch01-s13). Not always the storage folder.';
comment on column public.lesson_packs.storage_deck_id is
  'Storage folder. JWT/host prefix is storage_deck_id/version. Section packs share fom-ch01.';
comment on column public.lesson_packs.beat_start is
  'First beat id in this pack (inclusive). Hook rides with 1.1.';
comment on column public.lesson_packs.beat_end is
  'Last beat id in this pack (inclusive). Finished rides with 1.7.';

-- published is the picker flag. Taught teachers may still SELECT unpublished
-- review packs (Chapter 1 all) so open/update can copy the window.
drop policy if exists lesson_packs_taught_teacher_read on public.lesson_packs;
create policy lesson_packs_taught_teacher_read on public.lesson_packs
  for select using (
    auth.uid() is not null
    and exists (
      select 1
      from public.class_teachers ct
      where ct.teacher_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Snapshot on the assignment (looked up at open as fallback)
-- ---------------------------------------------------------------------------

alter table public.assignments
  add column if not exists storage_deck_id text;

alter table public.assignments
  add column if not exists beat_start text;

alter table public.assignments
  add column if not exists beat_end text;

comment on column public.assignments.deck_id is
  'Lesson pack id when kind = lesson (e.g. fom-ch01-s13). Never a URL or storage path.';
comment on column public.assignments.lesson_version is
  'Lesson pack version when kind = lesson.';
comment on column public.assignments.storage_deck_id is
  'Copied from lesson_packs at assign. Host prefix is storage_deck_id/version, not catalog deck_id.';
comment on column public.assignments.beat_start is
  'Copied from lesson_packs at assign. Inclusive first beat id for this assignment.';
comment on column public.assignments.beat_end is
  'Copied from lesson_packs at assign. Inclusive last beat id for this assignment.';

-- Chapter 1 (all) stays for review; default picker is published sections only.
update public.lesson_packs
set
  title = 'FoM · Chapter 1 (all)',
  published = false,
  storage_deck_id = 'fom-ch01',
  beat_start = 'hook',
  beat_end = 'done'
where deck_id = 'fom-ch01'
  and version = 'v4';

insert into public.lesson_packs (
  deck_id, version, title, published, storage_deck_id, beat_start, beat_end
)
values
  ('fom-ch01-s11', 'v4', 'FoM · 1.1 Ordering and Rounding', true, 'fom-ch01', 'hook', 's11c'),
  ('fom-ch01-s12', 'v4', 'FoM · 1.2 Addition and Subtraction', true, 'fom-ch01', 's12t', 's12c'),
  ('fom-ch01-s13', 'v4', 'FoM · 1.3 Multiplication', true, 'fom-ch01', 's13t', 's13c'),
  ('fom-ch01-s14', 'v4', 'FoM · 1.4 Division', true, 'fom-ch01', 's14t', 's14c'),
  ('fom-ch01-s15', 'v4', 'FoM · 1.5 Exponents', true, 'fom-ch01', 's15t', 's15c'),
  ('fom-ch01-s16', 'v4', 'FoM · 1.6 Square Roots', true, 'fom-ch01', 's16t', 's16t'),
  ('fom-ch01-s17', 'v4', 'FoM · 1.7 Order of Operations', true, 'fom-ch01', 's17t', 'done')
on conflict (deck_id, version) do update set
  title = excluded.title,
  published = excluded.published,
  storage_deck_id = excluded.storage_deck_id,
  beat_start = excluded.beat_start,
  beat_end = excluded.beat_end;

-- Existing lesson columns keep the chapter window until reassigned.
update public.assignments a
set
  storage_deck_id = coalesce(nullif(a.storage_deck_id, ''), lp.storage_deck_id, a.deck_id),
  beat_start = coalesce(nullif(a.beat_start, ''), lp.beat_start),
  beat_end = coalesce(nullif(a.beat_end, ''), lp.beat_end)
from public.lesson_packs lp
where a.kind = 'lesson'
  and a.deck_id = lp.deck_id
  and a.lesson_version = lp.version
  and (
    a.storage_deck_id is null
    or a.beat_start is null
    or a.beat_end is null
  );

update public.assignments
set
  storage_deck_id = coalesce(nullif(storage_deck_id, ''), deck_id),
  beat_start = coalesce(nullif(beat_start, ''), 'hook'),
  beat_end = coalesce(nullif(beat_end, ''), 'done')
where kind = 'lesson'
  and (
    storage_deck_id is null
    or beat_start is null
    or beat_end is null
  );

alter table public.assignments
  drop constraint if exists assignments_lesson_pack_check;

alter table public.assignments
  add constraint assignments_lesson_pack_check
  check (
    kind <> 'lesson'
    or (
      deck_id is not null
      and lesson_version is not null
      and storage_deck_id is not null
      and beat_start is not null
      and beat_end is not null
      and deck_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
      and lesson_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
      and storage_deck_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
      and beat_start ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
      and beat_end ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    )
  );

-- ---------------------------------------------------------------------------
-- student_open_lesson — identity + storage prefix + beat window
-- ---------------------------------------------------------------------------

drop function if exists public.student_open_lesson(uuid);

create function public.student_open_lesson(p_assignment_id uuid)
returns table (
  assignment_id uuid,
  submission_id uuid,
  title text,
  deck_id text,
  lesson_version text,
  storage_deck_id text,
  beat_start text,
  beat_end text,
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
    coalesce(a.storage_deck_id, lp.storage_deck_id, a.deck_id),
    coalesce(a.beat_start, lp.beat_start),
    coalesce(a.beat_end, lp.beat_end),
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
  left join public.lesson_packs lp
    on lp.deck_id = a.deck_id
   and lp.version = a.lesson_version
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
  'Own lesson cell only. Returns identity, catalog deck_id/version, storage_deck_id, and beat window. Minting the host JWT is the Edge Function using this RPC under the user JWT. Prefix is storage_deck_id/version. No URL.';

revoke all on function public.student_open_lesson(uuid) from public, anon;
grant execute on function public.student_open_lesson(uuid) to authenticated;
