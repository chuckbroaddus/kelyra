-- Interactive lessons as assignable work (part 1 of 2).
-- Run this file as its own query and wait for Success before
-- 20260824000001_lesson_assignments.sql. Postgres cannot use a new
-- enum value until the ADD VALUE transaction commits.
--
-- Does not grant anyone extra assignment access.

alter type public.assignment_kind add value if not exists 'lesson';
