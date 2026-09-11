-- =============================================================================
-- DITL throwaway school PUBLIC seed (chunked execute_sql only; no auth.users)
-- =============================================================================
-- Fixture bible: notes/company/ditl-seed-school.md
-- Apply notes: PR 48 scripts/ditl_seed_school.md
-- Split from original: public tables + people/classes/ride/syllabus/grades only.
-- No auth.users, no auth schema, no attendance, no one-shot 23k.
-- Persist school_id via real table ditl_seed_state (survives across MCP calls).
-- Fixed F-* UUIDs for QE binding (public only).
-- Lane A: this file via execute_sql chunks.
-- Lane B: admin_create_login RPC + hat attach (separate).
-- =============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Idempotent guard (public only)
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.schools where name = 'ditl-Sandbox Academy') then
    raise exception 'ditl-Sandbox Academy already exists — aborting seed';
  end if;
  if exists (select 1 from public.profiles where username like 'ditl-%') then
    raise exception 'ditl-* profiles already exist — aborting seed';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Persist school_id (real table, survives calls; fixed F-SCHOOL UUID)
-- ----------------------------------------------------------------------------
create table if not exists public.ditl_seed_state (
  k text primary key,
  v text not null
);

-- F-SCHOOL
insert into public.schools (id, name, feed_icon, created_at)
values ('d1715000-0000-4000-a000-000000000001'::uuid, 'ditl-Sandbox Academy', 'feedSchool', now())
on conflict (id) do nothing;

insert into public.ditl_seed_state (k, v)
values ('school_id', 'd1715000-0000-4000-a000-000000000001')
on conflict (k) do update set v = excluded.v;

-- ----------------------------------------------------------------------------
-- 2. Public F-* IDs (people, classes, ride, syllabus, grades; fixed for QE)
--    (login UUIDs excluded — created by admin_create_login in Lane B)
-- ----------------------------------------------------------------------------
create temporary table ditl_public_ids (
  k text primary key,
  id uuid not null
) on commit drop;

insert into ditl_public_ids (k, id) values
  ('s1',            'd1715000-0000-4000-a000-000000000101'::uuid),
  ('s2',            'd1715000-0000-4000-a000-000000000102'::uuid),
  ('s3',            'd1715000-0000-4000-a000-000000000103'::uuid),
  ('s4',            'd1715000-0000-4000-a000-000000000104'::uuid),
  ('s5',            'd1715000-0000-4000-a000-000000000105'::uuid),
  ('p1',            'd1715000-0000-4000-a000-000000000201'::uuid),
  ('p2',            'd1715000-0000-4000-a000-000000000202'::uuid),
  ('p_avery',       'd1715000-0000-4000-a000-000000000203'::uuid),
  ('p_admin',       'd1715000-0000-4000-a000-000000000204'::uuid),
  ('c_math',        'd1715000-0000-4000-a000-000000000301'::uuid),
  ('c_eng',         'd1715000-0000-4000-a000-000000000302'::uuid),
  ('c_spare',       'd1715000-0000-4000-a000-000000000303'::uuid),
  ('line_a',        'd1715000-0000-4000-a000-000000000401'::uuid),
  ('line_b',        'd1715000-0000-4000-a000-000000000402'::uuid),
  ('v1',            'd1715000-0000-4000-a000-000000000501'::uuid),
  ('v2',            'd1715000-0000-4000-a000-000000000502'::uuid),
  ('v3',            'd1715000-0000-4000-a000-000000000503'::uuid),
  ('v4',            'd1715000-0000-4000-a000-000000000504'::uuid),
  ('v5',            'd1715000-0000-4000-a000-000000000505'::uuid),
  ('duty_curb_a',   'd1715000-0000-4000-a000-000000000510'::uuid),
  ('skill_focus',   'd1715000-0000-4000-a000-000000000601'::uuid),
  ('skill_eng',     'd1715000-0000-4000-a000-000000000602'::uuid),
  ('practice_focus','d1715000-0000-4000-a000-000000000610'::uuid),
  ('assign_practice','d1715000-0000-4000-a000-000000000620'::uuid),
  ('assign_hw',     'd1715000-0000-4000-a000-000000000621'::uuid),
  ('assign_quiz',   'd1715000-0000-4000-a000-000000000622'::uuid),
  ('assign_eng',    'd1715000-0000-4000-a000-000000000623'::uuid),
  ('sub_prac_s1',   'd1715000-0000-4000-a000-000000000701'::uuid),
  ('sub_hw_s1',     'd1715000-0000-4000-a000-000000000702'::uuid),
  ('sub_quiz_s1',   'd1715000-0000-4000-a000-000000000703'::uuid),
  ('sub_eng_s1',    'd1715000-0000-4000-a000-000000000704'::uuid),
  ('sub_prac_s4',   'd1715000-0000-4000-a000-000000000705'::uuid),
  ('asset_draft_s4','d1715000-0000-4000-a000-000000000901'::uuid),
  ('asset_unassigned','d1715000-0000-4000-a000-000000000902'::uuid),
  ('asset_quiz_key','d1715000-0000-4000-a000-000000000903'::uuid),
  ('cap_draft_s4',  'd1715000-0000-4000-a000-000000000801'::uuid),
  ('cap_unassigned','d1715000-0000-4000-a000-000000000802'::uuid),
  ('gap_draft_s4',  'd1715000-0000-4000-a000-000000000a01'::uuid),
  ('syllabus_math', 'd1715000-0000-4000-a000-000000000b01'::uuid),
  ('syl_cat_hw',    'd1715000-0000-4000-a000-000000000b11'::uuid),
  ('syl_cat_quiz',  'd1715000-0000-4000-a000-000000000b12'::uuid),
  ('syl_cat_part',  'd1715000-0000-4000-a000-000000000b13'::uuid),
  ('syllabus_eng',  'd1715000-0000-4000-a000-000000000b21'::uuid),
  ('syl_eng_hw',    'd1715000-0000-4000-a000-000000000b22'::uuid);

-- (patch 1 complete; next adds parents/students inserts)

-- ----------------------------------------------------------------------------
-- 3. Teachers (F-TEACHER-*) — Lane A public only (logins via RPC Lane B)
--    Note: admin_create_login also inserts into teachers for staff roles.
--    Using only live columns: id, email, display_name, active_class_id, photo_asset_id, created_at
-- ----------------------------------------------------------------------------
insert into public.teachers (id, email, display_name, created_at)
values
  ('d1715000-0000-4000-a000-0000000000a1'::uuid, 'ditl-teacher-a@example.test', 'Avery Quinn', now()),
  ('d1715000-0000-4000-a000-0000000000a2'::uuid, 'ditl-teacher-b@example.test', 'Blake Rivera', now()),
  ('d1715000-0000-4000-a000-0000000000a3'::uuid, 'ditl-teacher-c@example.test', 'Casey Torres', now())
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Students (F-STUDENTS) — teacher_id bind, no school_id column exists
--    Using live columns only.
-- ----------------------------------------------------------------------------
insert into public.students (id, teacher_id, display_name, sort_name, name_aliases, metadata, created_via, created_at)
values
  ('d1715000-0000-4000-a000-000000000101'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Jordan Lee', 'Lee, Jordan', array['Jordan'], jsonb_build_object('grade_or_age', '3rd'), 'manual', now()),
  ('d1715000-0000-4000-a000-000000000102'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Jamie Lee', 'Lee, Jamie', array['Jamie'], jsonb_build_object('grade_or_age', '3rd'), 'manual', now()),
  ('d1715000-0000-4000-a000-000000000103'::uuid, 'd1715000-0000-4000-a000-0000000000a2'::uuid, 'Morgan Patel', 'Patel, Morgan', array['Morgan'], '{}', 'manual', now()),
  ('d1715000-0000-4000-a000-000000000104'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Riley Chen', 'Chen, Riley', array['Riley'], '{}', 'manual', now()),
  ('d1715000-0000-4000-a000-000000000105'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Samira Okonkwo', 'Okonkwo, Samira', array['Samira','Sammy'], jsonb_build_object('preferred_name', 'Sammy'), 'manual', now())
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 5. Parents (F-PARENT-*) — teacher_id bind (P-AVERY dual-hat to S3 only)
--    Using live columns: id, teacher_id, display_name, sort_name, metadata, created_via
-- ----------------------------------------------------------------------------
insert into public.parents (id, teacher_id, display_name, sort_name, metadata, created_via, created_at)
values
  ('d1715000-0000-4000-a000-000000000201'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Taylor Lee', 'Lee, Taylor', jsonb_build_object('relationship', 'guardian', 'phone', '555-0201'), 'manual', now()),
  ('d1715000-0000-4000-a000-000000000202'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Cameron Brooks', 'Brooks, Cameron', jsonb_build_object('relationship', 'guardian', 'phone', '555-0202'), 'manual', now()),
  ('d1715000-0000-4000-a000-000000000203'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'Avery Quinn', 'Quinn, Avery', jsonb_build_object('relationship', 'guardian'), 'manual', now()),  -- P-AVERY dual-hat
  ('d1715000-0000-4000-a000-000000000204'::uuid, 'd1715000-0000-4000-a000-0000000000a2'::uuid, 'Devon Hale', 'Hale, Devon', jsonb_build_object('relationship', 'guardian'), 'manual', now())   -- P-ADMIN dual-hat
 on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 6. Classes (F-CLASSES) — bind via teacher_id (no school_id column)
-- ----------------------------------------------------------------------------
insert into public.classes (id, teacher_id, name, name_source, feed_icon, created_at)
values
  ('d1715000-0000-4000-a000-000000000301'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid, 'ditl-Math Period 3', 'manual', 'feedClass', now()),
  ('d1715000-0000-4000-a000-000000000302'::uuid, 'd1715000-0000-4000-a000-0000000000a2'::uuid, 'ditl-English Homeroom', 'manual', 'feedClass', now()),
  ('d1715000-0000-4000-a000-000000000303'::uuid, null, 'ditl-Spare Lab', 'manual', null, now())
on conflict (id) do nothing;

insert into public.class_teachers (class_id, teacher_id)
values
  ('d1715000-0000-4000-a000-000000000301'::uuid, 'd1715000-0000-4000-a000-0000000000a1'::uuid),
  ('d1715000-0000-4000-a000-000000000302'::uuid, 'd1715000-0000-4000-a000-0000000000a2'::uuid)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 7. Enrollments + parent_students
-- ----------------------------------------------------------------------------
insert into public.enrollments (class_id, student_id)
values
  ('d1715000-0000-4000-a000-000000000301'::uuid, 'd1715000-0000-4000-a000-000000000101'::uuid),
  ('d1715000-0000-4000-a000-000000000301'::uuid, 'd1715000-0000-4000-a000-000000000102'::uuid),
  ('d1715000-0000-4000-a000-000000000301'::uuid, 'd1715000-0000-4000-a000-000000000104'::uuid),
  ('d1715000-0000-4000-a000-000000000301'::uuid, 'd1715000-0000-4000-a000-000000000105'::uuid),
  ('d1715000-0000-4000-a000-000000000302'::uuid, 'd1715000-0000-4000-a000-000000000103'::uuid)
on conflict do nothing;

insert into public.parent_students (parent_id, student_id)
values
  ('d1715000-0000-4000-a000-000000000201'::uuid, 'd1715000-0000-4000-a000-000000000101'::uuid),
  ('d1715000-0000-4000-a000-000000000201'::uuid, 'd1715000-0000-4000-a000-000000000102'::uuid),
  ('d1715000-0000-4000-a000-000000000202'::uuid, 'd1715000-0000-4000-a000-000000000101'::uuid),
  ('d1715000-0000-4000-a000-000000000203'::uuid, 'd1715000-0000-4000-a000-000000000103'::uuid),  -- P-AVERY -> S3 only
  ('d1715000-0000-4000-a000-000000000204'::uuid, 'd1715000-0000-4000-a000-000000000101'::uuid)   -- P-ADMIN -> S1
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 8. Ride: dismissal_lines (2 for school), parent_vehicles (F-RIDE), dismissal_duty
--    Using live columns only. pickup_restrictions empty.
-- ----------------------------------------------------------------------------
insert into public.dismissal_lines (id, school_id, name, sort, status, created_at)
values
  ('d1715000-0000-4000-a000-000000000401'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'ditl-Line A Front', 1, 'active', now()),
  ('d1715000-0000-4000-a000-000000000402'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'ditl-Line B Side', 2, 'active', now())
on conflict (id) do nothing;

insert into public.parent_vehicles (id, school_id, parent_id, plate_raw, plate_norm, make, model, label, source, status, validity_kind, valid_from, created_at)
values
  ('d1715000-0000-4000-a000-000000000501'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'd1715000-0000-4000-a000-000000000201'::uuid, 'DITL-AAA1', 'DITLAAA1', 'Blue Sedan', null, 'Morning car', 'manual', 'active', 'indefinite', '2026-01-01', now()),
  ('d1715000-0000-4000-a000-000000000502'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'd1715000-0000-4000-a000-000000000201'::uuid, 'DITL-BBB2', 'DITLBBB2', 'Gray SUV', null, 'Afternoon car', 'manual', 'active', 'indefinite', '2026-01-01', now()),
  ('d1715000-0000-4000-a000-000000000503'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'd1715000-0000-4000-a000-000000000202'::uuid, 'DITL-CCC3', 'DITLCCC3', 'White Hatch', null, 'Co-parent car', 'manual', 'active', 'indefinite', '2026-01-01', now()),
  ('d1715000-0000-4000-a000-000000000504'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'd1715000-0000-4000-a000-000000000203'::uuid, 'DITL-DDD4', 'DITLDDD4', 'Green Wagon', null, 'Teacher dual-hat', 'manual', 'active', 'indefinite', '2026-01-01', now()),
  ('d1715000-0000-4000-a000-000000000505'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'd1715000-0000-4000-a000-000000000204'::uuid, 'DITL-EEE5', 'DITLEEE5', 'Black Coupe', null, 'Admin dual-hat', 'manual', 'active', 'indefinite', '2026-01-01', now())
on conflict (id) do nothing;

insert into public.dismissal_duty (id, school_id, profile_id, duty_role, line_id, active, created_at)
values
  ('d1715000-0000-4000-a000-000000000510'::uuid, 'd1715000-0000-4000-a000-000000000001'::uuid, 'd1715000-0000-4000-a000-0000000000a3'::uuid, 'curb', 'd1715000-0000-4000-a000-000000000401'::uuid, true, now())
on conflict (id) do nothing;