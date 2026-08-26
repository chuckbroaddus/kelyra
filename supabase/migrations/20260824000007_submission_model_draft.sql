-- Draft AI review of a turned-in submission. Never a grade until the teacher Approves.
-- Students do not select this column (student_list_todo returns answers only).

alter table public.submissions
  add column if not exists model_draft jsonb;
