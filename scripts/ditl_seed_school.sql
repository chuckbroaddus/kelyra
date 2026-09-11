-- =============================================================================
-- DITL throwaway school seed SQL (PRODUCE ONLY — do NOT apply from bot)
-- =============================================================================
-- Fixture bible: notes/company/ditl-seed-school.md
-- Data model:    docs/data-model.md
-- Ride schema:   supabase/migrations/20260907000000_ride_schema.sql
--
-- School: ditl-Sandbox Academy
-- Logical slug (docs only; schools has NO slug column): ditl-sandbox
-- Isolation: dedicated schools row; never production school_id; synthetic PII;
--            ditl- / F-* naming; no attendance tables; no live apply from this card.
-- Passwords: DITL-*-test placeholders for throwaway only (see apply notes).
-- Apply later: devops-release only — see scripts/ditl_seed_school.md
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Idempotent guard (by school name + ditl-* usernames)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.schools where name = 'ditl-Sandbox Academy'
  ) then
    raise exception 'ditl-Sandbox Academy already exists — aborting seed (idempotent guard)';
  end if;
  if exists (
    select 1 from public.profiles where username like 'ditl-%'
  ) then
    raise exception 'ditl-* profiles already exist — aborting seed (idempotent guard)';
  end if;
end $$;

-- Fixed UUIDs so QE / re-seed docs can bind to stable ids (F-* map below).
-- Variant/version nibbles are RFC-ish (4xxx / axxx).

-- F-SCHOOL
--   school          d1715000-0000-4000-a000-000000000001

-- Logins (auth.users = profiles.id)
--   F-OFFICE super  d1715000-0000-4000-a000-000000000010  ditl-super
--   F-OFFICE admin  d1715000-0000-4000-a000-000000000011  ditl-admin   (F-DH-OP)
--   F-TEACHER-A     d1715000-0000-4000-a000-000000000012  ditl-teacher-a (F-DH-TP)
--   F-TEACHER-B     d1715000-0000-4000-a000-000000000013  ditl-teacher-b
--   F-TEACHER-C     d1715000-0000-4000-a000-000000000014  ditl-teacher-c
--   F-PARENT-1      d1715000-0000-4000-a000-000000000015  ditl-parent-1
--   F-PARENT-2      d1715000-0000-4000-a000-000000000016  ditl-parent-2
--   F-STUDENT-LOGIN S1 d1715000-0000-4000-a000-000000000017 ditl-student-s1
--   F-STUDENT-LOGIN S2 d1715000-0000-4000-a000-000000000018 ditl-student-s2

-- Students S1–S5
--   S1..S5          d1715000-0000-4000-a000-000000000101..105

-- Parents
--   P1 / P2 / P-AVERY / P-ADMIN  ...000201..204

-- Classes C-MATH / C-ENG / C-SPARE  ...000301..303
-- Lines A/B ...000401..402
-- Vehicles V1–V5 ...000501..505
-- Duty curb Line A ...000510

create temporary table ditl_ids (
  k text primary key,
  id uuid not null
) on commit drop;

insert into ditl_ids (k, id) values
  ('school',        'd1715000-0000-4000-a000-000000000001'::uuid),
  ('super',         'd1715000-0000-4000-a000-000000000010'::uuid),
  ('admin',         'd1715000-0000-4000-a000-000000000011'::uuid),
  ('teacher_a',     'd1715000-0000-4000-a000-000000000012'::uuid),
  ('teacher_b',     'd1715000-0000-4000-a000-000000000013'::uuid),
  ('teacher_c',     'd1715000-0000-4000-a000-000000000014'::uuid),
  ('parent1_login', 'd1715000-0000-4000-a000-000000000015'::uuid),
  ('parent2_login', 'd1715000-0000-4000-a000-000000000016'::uuid),
  ('student_s1_l',  'd1715000-0000-4000-a000-000000000017'::uuid),
  ('student_s2_l',  'd1715000-0000-4000-a000-000000000018'::uuid),
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

-- ---------------------------------------------------------------------------
-- Helper: create auth user + identity (service-role / SQL editor path)
-- ---------------------------------------------------------------------------
create or replace function pg_temp.ditl_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_username text
) returns void
language plpgsql
as $$
begin
  perform set_config('kelyra.provision_profile', 'on', true);

  -- Column set matches admin_create_login / q11-apply (GoTrue: tokens must be '' not NULL).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', p_username),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  update auth.users
  set
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, '')
  where id = p_id;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', lower(p_email)),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. F-SCHOOL — ditl-Sandbox Academy
-- ---------------------------------------------------------------------------
insert into public.schools (id, name, feed_icon, created_at)
values (
  (select id from ditl_ids where k = 'school'),
  'ditl-Sandbox Academy',
  'feedSchool',
  now()
);

-- ---------------------------------------------------------------------------
-- 2. Logins + teachers (F-OFFICE / F-TEACHER-* / F-PARENT-* / F-STUDENT-LOGIN)
--    Passwords are throwaway placeholders only (DITL-*-test).
-- ---------------------------------------------------------------------------
select pg_temp.ditl_auth_user(id, 'ditl-super@ditl-sandbox.test', 'DITL-super-test', 'ditl-super')
  from ditl_ids where k = 'super';
select pg_temp.ditl_auth_user(id, 'ditl-admin@ditl-sandbox.test', 'DITL-admin-test', 'ditl-admin')
  from ditl_ids where k = 'admin';
select pg_temp.ditl_auth_user(id, 'ditl-teacher-a@ditl-sandbox.test', 'DITL-teacher-test', 'ditl-teacher-a')
  from ditl_ids where k = 'teacher_a';
select pg_temp.ditl_auth_user(id, 'ditl-teacher-b@ditl-sandbox.test', 'DITL-teacher-test', 'ditl-teacher-b')
  from ditl_ids where k = 'teacher_b';
select pg_temp.ditl_auth_user(id, 'ditl-teacher-c@ditl-sandbox.test', 'DITL-teacher-test', 'ditl-teacher-c')
  from ditl_ids where k = 'teacher_c';
select pg_temp.ditl_auth_user(id, 'ditl-parent-1@ditl-sandbox.test', 'DITL-parent-test', 'ditl-parent-1')
  from ditl_ids where k = 'parent1_login';
select pg_temp.ditl_auth_user(id, 'ditl-parent-2@ditl-sandbox.test', 'DITL-parent-test', 'ditl-parent-2')
  from ditl_ids where k = 'parent2_login';
select pg_temp.ditl_auth_user(id, 'ditl-student-s1@ditl-sandbox.test', 'DITL-student-test', 'ditl-student-s1')
  from ditl_ids where k = 'student_s1_l';
select pg_temp.ditl_auth_user(id, 'ditl-student-s2@ditl-sandbox.test', 'DITL-student-test', 'ditl-student-s2')
  from ditl_ids where k = 'student_s2_l';

-- Staff profiles + teachers rows (admin gets teachers row for parent ownership / dual-hat)
insert into public.profiles (
  id, school_id, username, email, display_name, role,
  must_change_password, also_administrator, also_teacher, created_at
)
values
  ((select id from ditl_ids where k='super'),
   (select id from ditl_ids where k='school'),
   'ditl-super', 'ditl-super@ditl-sandbox.test', 'Ditl Superintendent',
   'superintendent', false, false, false, now()),
  ((select id from ditl_ids where k='admin'),
   (select id from ditl_ids where k='school'),
   'ditl-admin', 'ditl-admin@ditl-sandbox.test', 'Devon Hale',
   'administrator', false, true, false, now()),
  ((select id from ditl_ids where k='teacher_a'),
   (select id from ditl_ids where k='school'),
   'ditl-teacher-a', 'ditl-teacher-a@ditl-sandbox.test', 'Avery Quinn',
   'teacher', false, false, true, now()),
  ((select id from ditl_ids where k='teacher_b'),
   (select id from ditl_ids where k='school'),
   'ditl-teacher-b', 'ditl-teacher-b@ditl-sandbox.test', 'Blake Nguyen',
   'teacher', false, false, true, now()),
  ((select id from ditl_ids where k='teacher_c'),
   (select id from ditl_ids where k='school'),
   'ditl-teacher-c', 'ditl-teacher-c@ditl-sandbox.test', 'Casey Ortiz',
   'teacher', false, false, true, now());

insert into public.teachers (id, email, display_name, created_at)
values
  ((select id from ditl_ids where k='super'), 'ditl-super@ditl-sandbox.test', 'Ditl Superintendent', now()),
  ((select id from ditl_ids where k='admin'), 'ditl-admin@ditl-sandbox.test', 'Devon Hale', now()),
  ((select id from ditl_ids where k='teacher_a'), 'ditl-teacher-a@ditl-sandbox.test', 'Avery Quinn', now()),
  ((select id from ditl_ids where k='teacher_b'), 'ditl-teacher-b@ditl-sandbox.test', 'Blake Nguyen', now()),
  ((select id from ditl_ids where k='teacher_c'), 'ditl-teacher-c@ditl-sandbox.test', 'Casey Ortiz', now());

-- ---------------------------------------------------------------------------
-- 3. Classes (C-MATH / C-ENG / C-SPARE) + class_teachers
-- ---------------------------------------------------------------------------
insert into public.classes (id, teacher_id, name, name_source, feed_icon, created_at)
values
  ((select id from ditl_ids where k='c_math'),
   (select id from ditl_ids where k='teacher_a'),
   'ditl-Math Period 3', 'typed', 'feedClass', now()),
  ((select id from ditl_ids where k='c_eng'),
   (select id from ditl_ids where k='teacher_b'),
   'ditl-English Homeroom', 'typed', 'feedClass', now()),
  ((select id from ditl_ids where k='c_spare'),
   null,
   'ditl-Spare Lab', 'typed', 'feedClass', now());

insert into public.class_teachers (class_id, teacher_id, created_at)
values
  ((select id from ditl_ids where k='c_math'), (select id from ditl_ids where k='teacher_a'), now()),
  ((select id from ditl_ids where k='c_eng'),  (select id from ditl_ids where k='teacher_b'), now());

update public.teachers
set active_class_id = (select id from ditl_ids where k='c_math')
where id = (select id from ditl_ids where k='teacher_a');

update public.teachers
set active_class_id = (select id from ditl_ids where k='c_eng')
where id = (select id from ditl_ids where k='teacher_b');

-- ---------------------------------------------------------------------------
-- 4. Students S1–S5 (baseline metadata; T-05/O-07 card values NOT pre-written)
-- ---------------------------------------------------------------------------
insert into public.students (
  id, teacher_id, display_name, sort_name, name_aliases, metadata, created_via, created_at
)
values
  ((select id from ditl_ids where k='s1'),
   (select id from ditl_ids where k='teacher_a'),
   'Jordan Lee', 'Lee, Jordan', array['Jordan']::text[],
   '{"grade_or_age":"3rd"}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='s2'),
   (select id from ditl_ids where k='teacher_a'),
   'Jamie Lee', 'Lee, Jamie', array['Jamie']::text[],
   '{}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='s3'),
   (select id from ditl_ids where k='teacher_b'),
   'Morgan Patel', 'Patel, Morgan', array['Morgan']::text[],
   '{}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='s4'),
   (select id from ditl_ids where k='teacher_a'),
   'Riley Chen', 'Chen, Riley', array['Riley']::text[],
   '{}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='s5'),
   (select id from ditl_ids where k='teacher_a'),
   'Samira Okonkwo', 'Okonkwo, Samira', array['Samira','Sammy']::text[],
   '{"preferred_name":"Sammy"}'::jsonb, 'typed', now());

-- Enrollments: Math S1,S2,S4,S5; English S3 + S1 (multi-enroll / F-GRADES-HIST)
insert into public.enrollments (class_id, student_id, created_at)
values
  ((select id from ditl_ids where k='c_math'), (select id from ditl_ids where k='s1'), now()),
  ((select id from ditl_ids where k='c_math'), (select id from ditl_ids where k='s2'), now()),
  ((select id from ditl_ids where k='c_math'), (select id from ditl_ids where k='s4'), now()),
  ((select id from ditl_ids where k='c_math'), (select id from ditl_ids where k='s5'), now()),
  ((select id from ditl_ids where k='c_eng'),  (select id from ditl_ids where k='s3'), now()),
  ((select id from ditl_ids where k='c_eng'),  (select id from ditl_ids where k='s1'), now());

-- ---------------------------------------------------------------------------
-- 5. Parents + links (F-PARENT-*, F-DH-TP, F-DH-OP)
-- ---------------------------------------------------------------------------
insert into public.parents (
  id, teacher_id, display_name, sort_name, metadata, created_via, created_at
)
values
  ((select id from ditl_ids where k='p1'),
   (select id from ditl_ids where k='teacher_a'),
   'Taylor Lee', 'Lee, Taylor',
   '{"relationship":"guardian","phone":"555-0201"}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='p2'),
   (select id from ditl_ids where k='teacher_a'),
   'Cameron Brooks', 'Brooks, Cameron',
   '{"relationship":"guardian","phone":"555-0202"}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='p_avery'),
   (select id from ditl_ids where k='teacher_a'),
   'Avery Quinn', 'Quinn, Avery',
   '{"relationship":"guardian"}'::jsonb, 'typed', now()),
  ((select id from ditl_ids where k='p_admin'),
   (select id from ditl_ids where k='admin'),
   'Devon Hale', 'Hale, Devon',
   '{"relationship":"guardian"}'::jsonb, 'typed', now());

insert into public.parent_students (parent_id, student_id, created_at)
values
  ((select id from ditl_ids where k='p1'),      (select id from ditl_ids where k='s1'), now()),
  ((select id from ditl_ids where k='p1'),      (select id from ditl_ids where k='s2'), now()),
  ((select id from ditl_ids where k='p2'),      (select id from ditl_ids where k='s1'), now()),
  ((select id from ditl_ids where k='p_avery'), (select id from ditl_ids where k='s3'), now()),
  ((select id from ditl_ids where k='p_admin'), (select id from ditl_ids where k='s1'), now());

-- Dual-hat seats: Teacher A → P-AVERY (S3 only); Admin → P-ADMIN (S1)
update public.profiles
set parent_id = (select id from ditl_ids where k='p_avery')
where id = (select id from ditl_ids where k='teacher_a');

update public.profiles
set parent_id = (select id from ditl_ids where k='p_admin')
where id = (select id from ditl_ids where k='admin');

-- Parent logins
insert into public.profiles (
  id, school_id, username, email, display_name, role, parent_id,
  must_change_password, also_administrator, also_teacher, created_at
)
values
  ((select id from ditl_ids where k='parent1_login'),
   (select id from ditl_ids where k='school'),
   'ditl-parent-1', 'ditl-parent-1@ditl-sandbox.test', 'Taylor Lee',
   'parent', (select id from ditl_ids where k='p1'),
   false, false, false, now()),
  ((select id from ditl_ids where k='parent2_login'),
   (select id from ditl_ids where k='school'),
   'ditl-parent-2', 'ditl-parent-2@ditl-sandbox.test', 'Cameron Brooks',
   'parent', (select id from ditl_ids where k='p2'),
   false, false, false, now());

-- Student logins
insert into public.profiles (
  id, school_id, username, email, display_name, role, student_id,
  must_change_password, also_administrator, also_teacher, created_at
)
values
  ((select id from ditl_ids where k='student_s1_l'),
   (select id from ditl_ids where k='school'),
   'ditl-student-s1', 'ditl-student-s1@ditl-sandbox.test', 'Jordan Lee',
   'student', (select id from ditl_ids where k='s1'),
   false, false, false, now()),
  ((select id from ditl_ids where k='student_s2_l'),
   (select id from ditl_ids where k='school'),
   'ditl-student-s2', 'ditl-student-s2@ditl-sandbox.test', 'Jamie Lee',
   'student', (select id from ditl_ids where k='s2'),
   false, false, false, now());

-- ---------------------------------------------------------------------------
-- 6. F-RIDE — lines, vehicles V1–V5, curb duty; NO pickup_restrictions
-- ---------------------------------------------------------------------------
insert into public.dismissal_lines (id, school_id, name, sort, status, created_at)
values
  ((select id from ditl_ids where k='line_a'),
   (select id from ditl_ids where k='school'),
   'ditl-Line A Front', 1, 'active', now()),
  ((select id from ditl_ids where k='line_b'),
   (select id from ditl_ids where k='school'),
   'ditl-Line B Side', 2, 'active', now());

insert into public.parent_vehicles (
  id, school_id, parent_id, plate_raw, plate_norm, make, model, label,
  source, status, validity_kind, created_at, updated_at
)
values
  ((select id from ditl_ids where k='v1'),
   (select id from ditl_ids where k='school'),
   (select id from ditl_ids where k='p1'),
   'DITL-AAA1', 'DITLAAA1', 'Blue', 'Sedan', 'Morning car',
   'parent', 'active', 'indefinite', now(), now()),
  ((select id from ditl_ids where k='v2'),
   (select id from ditl_ids where k='school'),
   (select id from ditl_ids where k='p1'),
   'DITL-BBB2', 'DITLBBB2', 'Gray', 'SUV', 'Afternoon car',
   'parent', 'active', 'indefinite', now(), now()),
  ((select id from ditl_ids where k='v3'),
   (select id from ditl_ids where k='school'),
   (select id from ditl_ids where k='p2'),
   'DITL-CCC3', 'DITLCCC3', 'White', 'Hatch', 'Co-parent car',
   'parent', 'active', 'indefinite', now(), now()),
  ((select id from ditl_ids where k='v4'),
   (select id from ditl_ids where k='school'),
   (select id from ditl_ids where k='p_avery'),
   'DITL-DDD4', 'DITLDDD4', 'Green', 'Wagon', 'Teacher dual-hat',
   'parent', 'active', 'indefinite', now(), now()),
  ((select id from ditl_ids where k='v5'),
   (select id from ditl_ids where k='school'),
   (select id from ditl_ids where k='p_admin'),
   'DITL-EEE5', 'DITLEEE5', 'Black', 'Coupe', 'Admin dual-hat',
   'parent', 'active', 'indefinite', now(), now());

insert into public.dismissal_duty (
  id, school_id, profile_id, duty_role, line_id, active, created_at
)
values (
  (select id from ditl_ids where k='duty_curb_a'),
  (select id from ditl_ids where k='school'),
  (select id from ditl_ids where k='teacher_c'),
  'curb',
  (select id from ditl_ids where k='line_a'),
  true,
  now()
);

-- Explicit: no pickup_restrictions rows (O-04 creates/clears at runtime)

-- ---------------------------------------------------------------------------
-- 7. Academic seeds — F-AVG, F-FOCUS, F-ASSIGN, F-QUIZ, F-DRAFTS, F-GRADES-HIST
--    F-DIARY / F-FEED / F-ARTIFACTS / F-AUTHOR: no class-app rows required here
-- ---------------------------------------------------------------------------

-- Skills (focus + eng hist)
insert into public.skills (id, class_id, label, normalized_label)
values
  ((select id from ditl_ids where k='skill_focus'),
   (select id from ditl_ids where k='c_math'),
   'ditl-two-digit regrouping', 'ditl-two-digit regrouping'),
  ((select id from ditl_ids where k='skill_eng'),
   (select id from ditl_ids where k='c_eng'),
   'ditl-topic sentence', 'ditl-topic sentence');

-- F-FOCUS: S4 current focus
update public.students
set current_focus_skill_id = (select id from ditl_ids where k='skill_focus')
where id = (select id from ditl_ids where k='s4');

-- F-AVG: Math syllabus published, weights sum 100, publish_to_family on
insert into public.class_syllabi (
  id, class_id, status, title, calc_mode, term_structure, source,
  publish_to_family, published_at, policies, created_at, updated_at
)
values (
  (select id from ditl_ids where k='syllabus_math'),
  (select id from ditl_ids where k='c_math'),
  'published',
  'ditl-Math Period 3 Syllabus',
  'category_weight',
  'year',
  'manual',
  true,
  now(),
  '{"publish_to_family":true,"extra_credit_allowed":false,"late_penalty_mode":"manual","rounding":"nearest_whole","missing_as_zero":false}'::jsonb,
  now(),
  now()
);

insert into public.syllabus_categories (
  id, syllabus_id, key, label, weight_percent, sort_order, active,
  "group", default_include_in_average, created_at
)
values
  ((select id from ditl_ids where k='syl_cat_hw'),
   (select id from ditl_ids where k='syllabus_math'),
   'homework', 'Homework', 40, 1, true, 'formative', true, now()),
  ((select id from ditl_ids where k='syl_cat_quiz'),
   (select id from ditl_ids where k='syllabus_math'),
   'quiz', 'Quizzes', 40, 2, true, 'summative', true, now()),
  ((select id from ditl_ids where k='syl_cat_part'),
   (select id from ditl_ids where k='syllabus_math'),
   'participation', 'Participation', 20, 3, true, 'formative', true, now());

-- Light Eng syllabus for family book contrast (optional but helps F-GRADES-HIST)
insert into public.class_syllabi (
  id, class_id, status, title, calc_mode, term_structure, source,
  publish_to_family, published_at, policies, created_at, updated_at
)
values (
  (select id from ditl_ids where k='syllabus_eng'),
  (select id from ditl_ids where k='c_eng'),
  'published',
  'ditl-English Homeroom Syllabus',
  'category_weight',
  'year',
  'manual',
  true,
  now(),
  '{"publish_to_family":true}'::jsonb,
  now(),
  now()
);

insert into public.syllabus_categories (
  id, syllabus_id, key, label, weight_percent, sort_order, active,
  default_include_in_average, created_at
)
values (
  (select id from ditl_ids where k='syl_eng_hw'),
  (select id from ditl_ids where k='syllabus_eng'),
  'homework', 'Homework', 100, 1, true, true, now()
);

-- F-FOCUS practice set + assignment on S4 (+ S1 practice for student login)
insert into public.practice_sets (
  id, class_id, skill_id, teacher_prompt, items, status, created_at
)
values (
  (select id from ditl_ids where k='practice_focus'),
  (select id from ditl_ids where k='c_math'),
  (select id from ditl_ids where k='skill_focus'),
  'ditl-focus practice on regrouping',
  '[{"id":"1","prompt":"ditl 37+28"},{"id":"2","prompt":"ditl 45+19"},{"id":"3","prompt":"ditl 66+17"}]'::jsonb,
  'assigned',
  now()
);

insert into public.assignments (
  id, class_id, title, kind, practice_set_id, category, term,
  max_score, include_in_average, weight_band, created_at
)
values (
  (select id from ditl_ids where k='assign_practice'),
  (select id from ditl_ids where k='c_math'),
  'ditl-Focus Practice Regrouping',
  'practice',
  (select id from ditl_ids where k='practice_focus'),
  'homework',
  'year',
  10,
  true,
  'daily',
  now()
);

insert into public.submissions (
  id, assignment_id, student_id, status, created_at
)
values
  ((select id from ditl_ids where k='sub_prac_s1'),
   (select id from ditl_ids where k='assign_practice'),
   (select id from ditl_ids where k='s1'),
   'assigned', now()),
  ((select id from ditl_ids where k='sub_prac_s4'),
   (select id from ditl_ids where k='assign_practice'),
   (select id from ditl_ids where k='s4'),
   'assigned', now());

-- F-ASSIGN / F-GRADES-HIST: approved graded homework on S1 in Math
insert into public.assignments (
  id, class_id, title, kind, category, term,
  max_score, include_in_average, weight_band, created_at
)
values (
  (select id from ditl_ids where k='assign_hw'),
  (select id from ditl_ids where k='c_math'),
  'ditl-HW #1 Place Value',
  'planned',
  'homework',
  'year',
  100,
  true,
  'daily',
  now()
);

insert into public.submissions (
  id, assignment_id, student_id, status, approved_score, approved_at, created_at
)
values (
  (select id from ditl_ids where k='sub_hw_s1'),
  (select id from ditl_ids where k='assign_hw'),
  (select id from ditl_ids where k='s1'),
  'graded',
  92,
  now(),
  now()
);

-- F-QUIZ: quiz category assignment (key photo path is F-ARTIFACTS on disk; placeholder asset)
insert into public.assets (
  id, teacher_id, kind, storage_path, mime_type, created_at
)
values (
  (select id from ditl_ids where k='asset_quiz_key'),
  (select id from ditl_ids where k='teacher_a'),
  'photo',
  'ditl-sandbox/quiz-key-placeholder.jpg',
  'image/jpeg',
  now()
);

insert into public.assignments (
  id, class_id, title, kind, category, term,
  max_score, include_in_average, weight_band,
  key_kind, key_asset_id, key_notes, created_at
)
values (
  (select id from ditl_ids where k='assign_quiz'),
  (select id from ditl_ids where k='c_math'),
  'ditl-Quiz Regrouping',
  'planned',
  'quiz',
  'year',
  20,
  true,
  'major',
  'photo',
  (select id from ditl_ids where k='asset_quiz_key'),
  'ditl answer key — see notes/qa-fixtures/ditl/',
  now()
);

insert into public.submissions (
  id, assignment_id, student_id, status, approved_score, approved_at, created_at
)
values (
  (select id from ditl_ids where k='sub_quiz_s1'),
  (select id from ditl_ids where k='assign_quiz'),
  (select id from ditl_ids where k='s1'),
  'graded',
  18,
  now(),
  now()
);

-- F-GRADES-HIST Eng cell for S1
insert into public.assignments (
  id, class_id, title, kind, category, term,
  max_score, include_in_average, weight_band, created_at
)
values (
  (select id from ditl_ids where k='assign_eng'),
  (select id from ditl_ids where k='c_eng'),
  'ditl-Eng Paragraph 1',
  'planned',
  'homework',
  'year',
  100,
  true,
  'daily',
  now()
);

insert into public.submissions (
  id, assignment_id, student_id, status, approved_score, approved_at, created_at
)
values (
  (select id from ditl_ids where k='sub_eng_s1'),
  (select id from ditl_ids where k='assign_eng'),
  (select id from ditl_ids where k='s1'),
  'graded',
  88,
  now(),
  now()
);

-- F-DRAFTS: matched draft gap on S4 + Unassigned capture
insert into public.assets (
  id, teacher_id, kind, storage_path, mime_type, created_at
)
values
  ((select id from ditl_ids where k='asset_draft_s4'),
   (select id from ditl_ids where k='teacher_a'),
   'photo', 'ditl-sandbox/draft-s4-placeholder.jpg', 'image/jpeg', now()),
  ((select id from ditl_ids where k='asset_unassigned'),
   (select id from ditl_ids where k='teacher_a'),
   'photo', 'ditl-sandbox/unassigned-placeholder.jpg', 'image/jpeg', now());

insert into public.captures (
  id, class_id, student_id, kind, photo_asset_id, input_source, status,
  draft_score, teacher_note, created_at, attached_at
)
values (
  (select id from ditl_ids where k='cap_draft_s4'),
  (select id from ditl_ids where k='c_math'),
  (select id from ditl_ids where k='s4'),
  'homework',
  (select id from ditl_ids where k='asset_draft_s4'),
  'camera',
  'draft',
  70,
  'ditl-draft gap for Riley',
  now(),
  now()
);

insert into public.skill_gaps (
  id, capture_id, student_id, skill_id, label, source, status, sort_order, created_at
)
values (
  (select id from ditl_ids where k='gap_draft_s4'),
  (select id from ditl_ids where k='cap_draft_s4'),
  (select id from ditl_ids where k='s4'),
  (select id from ditl_ids where k='skill_focus'),
  'ditl-regroup across zero',
  'model',
  'draft',
  1,
  now()
);

insert into public.captures (
  id, class_id, student_id, kind, photo_asset_id, input_source, status, created_at
)
values (
  (select id from ditl_ids where k='cap_unassigned'),
  (select id from ditl_ids where k='c_math'),
  null,
  'homework',
  (select id from ditl_ids where k='asset_unassigned'),
  'camera',
  'unassigned',
  now()
);

-- ---------------------------------------------------------------------------
-- 8. Sanity notices (no attendance tables; no production school touched)
-- ---------------------------------------------------------------------------
do $$
declare
  sid uuid := (select id from ditl_ids where k='school');
  n_students int;
  n_vehicles int;
  n_restrict int;
begin
  select count(*) into n_students from public.students
    where id in (
      select id from ditl_ids where k in ('s1','s2','s3','s4','s5')
    );
  select count(*) into n_vehicles from public.parent_vehicles where school_id = sid;
  select count(*) into n_restrict from public.pickup_restrictions where school_id = sid;

  raise notice 'DITL seed complete: school=% students=% vehicles=% pickup_restrictions=% (expect 0)',
    sid, n_students, n_vehicles, n_restrict;
  raise notice 'F-map: F-SCHOOL F-OFFICE F-TEACHER-A/B/C F-PARENT-1/2 F-DH-TP F-DH-OP F-STUDENT-LOGIN F-STUDENTS F-RIDE F-AVG F-FOCUS F-ASSIGN F-QUIZ F-DRAFTS F-GRADES-HIST';
  raise notice 'No DB rows for F-DIARY/F-FEED/F-ARTIFACTS/F-AUTHOR (path/feature only). No attendance tables.';
end $$;

commit;

-- End scripts/ditl_seed_school.sql
