-- GAUTH G5: Help-used counts on practice submissions (per assignment/student/item).
-- Hermes owns SQL apply. Additive only. No keystroke log. No live DB apply from this card.
--
-- Shape of submissions.help_used jsonb:
--   { "<item_id>": { "hint": 2, "next_step": 1, "check_work": 1 } }
-- Counts only — never attempt text, never keystrokes, never bulk key.

alter table public.submissions
  add column if not exists help_used jsonb not null default '{}'::jsonb;

comment on column public.submissions.help_used is
  'GAUTH G5: per-item Practice Help turn counts {item_id: {action: n}}. No keystroke payload. Teacher-visible via class_teacher_of RPC; never project to parent/family RPCs.';

-- ---------------------------------------------------------------------------
-- Student: record one successful Help turn (own cell; help_mode re-read fail-closed)
-- ---------------------------------------------------------------------------

create or replace function public.record_practice_help_use(
  p_assignment_id uuid,
  p_item_id text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
  asg public.assignments;
  sub public.submissions;
  action_key text;
  item_key text;
  prev jsonb;
  item_counts jsonb;
  next_n int;
  next_help jsonb;
begin
  if sid is null then
    raise exception 'This login is not assigned to a roster name';
  end if;
  if p_assignment_id is null then
    raise exception 'assignment_id required';
  end if;
  item_key := nullif(btrim(coalesce(p_item_id, '')), '');
  if item_key is null then
    raise exception 'item_id required';
  end if;
  action_key := nullif(btrim(coalesce(p_action, '')), '');
  if action_key is null or action_key not in ('hint', 'next_step', 'isomorphic', 'full_item', 'check_work') then
    raise exception 'Invalid help action';
  end if;

  select * into asg from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found';
  end if;
  if asg.kind is distinct from 'practice' then
    raise exception 'Practice Help is only for practice sets';
  end if;
  -- Re-read help_mode every turn — revoke / off fail-closed (no new counts).
  if coalesce(asg.help_mode, 'off') = 'off' then
    raise exception 'Help is off for this assignment.';
  end if;

  select * into sub
  from public.submissions
  where assignment_id = p_assignment_id
    and student_id = sid
  for update;
  if not found then
    raise exception 'No practice submission cell for this student.';
  end if;

  prev := coalesce(sub.help_used, '{}'::jsonb);
  item_counts := coalesce(prev -> item_key, '{}'::jsonb);
  next_n := coalesce((item_counts ->> action_key)::int, 0) + 1;
  item_counts := jsonb_set(item_counts, array[action_key], to_jsonb(next_n), true);
  next_help := jsonb_set(prev, array[item_key], item_counts, true);

  update public.submissions
  set help_used = next_help
  where id = sub.id
  returning help_used into next_help;

  return next_help;
end;
$$;

comment on function public.record_practice_help_use(uuid, text, text) is
  'GAUTH G5: student increments own help_used count for one item/action. Re-reads help_mode fail-closed. Never writes approved_score.';

revoke all on function public.record_practice_help_use(uuid, text, text) from public, anon;
grant execute on function public.record_practice_help_use(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Teacher: read help_used (class_teacher_of only — not office via teaches_class)
-- ---------------------------------------------------------------------------

create or replace function public.teacher_get_practice_help_used(
  p_assignment_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  asg public.assignments;
  used jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  if p_assignment_id is null or p_student_id is null then
    raise exception 'assignment_id and student_id required';
  end if;

  select * into asg from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found';
  end if;
  if not public.class_teacher_of(asg.class_id) then
    raise exception 'You can only view Help used for a class you teach.';
  end if;

  select coalesce(sub.help_used, '{}'::jsonb) into used
  from public.submissions sub
  where sub.assignment_id = p_assignment_id
    and sub.student_id = p_student_id;

  return coalesce(used, '{}'::jsonb);
end;
$$;

comment on function public.teacher_get_practice_help_used(uuid, uuid) is
  'GAUTH G5: class_teacher_of only. Returns help_used counts (no keystroke payload). Parents/office without class_teachers row denied.';

revoke all on function public.teacher_get_practice_help_used(uuid, uuid) from public, anon;
grant execute on function public.teacher_get_practice_help_used(uuid, uuid) to authenticated;
