-- GAUTH v1 (G0+G1+G3+G2 field): teacher Explain draft columns + assignments.help_mode.
-- Hermes owns SQL apply. Additive only. No live DB apply from this card.
--
-- Privilege wall for Explain writes: class_teacher_of (class_teachers row only —
-- NOT teaches_class / is_school_admin / also_administrator).
-- Family must never SELECT explain_draft / extract / draft_score / originals via
-- fat SELECT *; family RPCs omit these columns (Postgres RLS is row-level).

-- ---------------------------------------------------------------------------
-- Captures: Explain draft (teacher work product — not a grade)
-- ---------------------------------------------------------------------------

alter table public.captures
  add column if not exists explain_draft jsonb;

alter table public.captures
  add column if not exists explain_status text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'captures_explain_status_check'
  ) then
    alter table public.captures
      add constraint captures_explain_status_check
      check (explain_status in ('none', 'draft', 'noted'));
  end if;
end $$;

comment on column public.captures.explain_draft is
  'GAUTH teacher Explain draft jsonb {schema_version, steps[], reteach, source, capture_id}. Never a grade. Family RPCs omit.';
comment on column public.captures.explain_status is
  'none | draft | noted (attached as teacher note). Never approved-as-grade.';

-- ---------------------------------------------------------------------------
-- Assignments: Student help policy field (G2). Default off. No Help UI in v1.
-- Graded original captures must not inherit On.
-- ---------------------------------------------------------------------------

alter table public.assignments
  add column if not exists help_mode text not null default 'off';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_help_mode_check'
  ) then
    alter table public.assignments
      add constraint assignments_help_mode_check
      check (help_mode in ('off', 'hints', 'steps_after_try', 'check_work'));
  end if;
end $$;

comment on column public.assignments.help_mode is
  'GAUTH Practice Help policy: off|hints|steps_after_try|check_work. Default off. Player UI is v1.1 (G4).';

-- ---------------------------------------------------------------------------
-- Teacher RPCs: park / discard / attach Explain (class_teacher_of wall)
-- ---------------------------------------------------------------------------

create or replace function public.park_explain_draft(
  p_capture_id uuid,
  p_draft jsonb
)
returns public.captures
language plpgsql
security definer
set search_path = public
as $$
declare
  cap public.captures;
begin
  select * into cap from public.captures where id = p_capture_id;
  if not found then
    raise exception 'Capture not found';
  end if;
  if not public.class_teacher_of(cap.class_id) then
    raise exception 'You can only explain a capture for a class you teach.';
  end if;
  -- Never write scores from Explain.
  update public.captures
  set
    explain_draft = p_draft,
    explain_status = 'draft'
  where id = p_capture_id
  returning * into cap;
  return cap;
end;
$$;

comment on function public.park_explain_draft(uuid, jsonb) is
  'GAUTH: teacher parks explain_draft on taught-class capture. Writes draft fields only.';

revoke all on function public.park_explain_draft(uuid, jsonb) from public, anon;
grant execute on function public.park_explain_draft(uuid, jsonb) to authenticated;

create or replace function public.discard_explain_draft(p_capture_id uuid)
returns public.captures
language plpgsql
security definer
set search_path = public
as $$
declare
  cap public.captures;
begin
  select * into cap from public.captures where id = p_capture_id;
  if not found then
    raise exception 'Capture not found';
  end if;
  if not public.class_teacher_of(cap.class_id) then
    raise exception 'You can only discard an explain draft for a class you teach.';
  end if;
  update public.captures
  set
    explain_draft = null,
    explain_status = 'none'
  where id = p_capture_id
  returning * into cap;
  return cap;
end;
$$;

revoke all on function public.discard_explain_draft(uuid) from public, anon;
grant execute on function public.discard_explain_draft(uuid) to authenticated;

create or replace function public.attach_explain_as_note(p_capture_id uuid)
returns public.captures
language plpgsql
security definer
set search_path = public
as $$
declare
  cap public.captures;
  note text;
  steps jsonb;
  reteach text;
  line text;
  i int;
begin
  select * into cap from public.captures where id = p_capture_id;
  if not found then
    raise exception 'Capture not found';
  end if;
  if not public.class_teacher_of(cap.class_id) then
    raise exception 'You can only attach an explain note for a class you teach.';
  end if;
  if cap.explain_draft is null or cap.explain_status = 'none' then
    raise exception 'No parked explain draft to attach.';
  end if;
  -- Copy parked draft only — not a live model bubble / not a grade.
  steps := coalesce(cap.explain_draft->'steps', '[]'::jsonb);
  reteach := nullif(trim(coalesce(cap.explain_draft->>'reteach', '')), '');
  note := '';
  for i in 0 .. greatest(jsonb_array_length(steps) - 1, -1) loop
    line := nullif(trim(coalesce(steps->>i, '')), '');
    if line is not null then
      note := note || (i + 1)::text || '. ' || line || E'\n';
    end if;
  end loop;
  if reteach is not null then
    note := note || E'\nRe-teach: ' || reteach;
  end if;
  note := nullif(trim(note), '');
  if note is null then
    raise exception 'Parked explain draft is empty.';
  end if;
  update public.captures
  set
    teacher_note = case
      when teacher_note is null or trim(teacher_note) = '' then note
      else teacher_note || E'\n\n' || note
    end,
    explain_status = 'noted'
  where id = p_capture_id
  returning * into cap;
  return cap;
end;
$$;

comment on function public.attach_explain_as_note(uuid) is
  'GAUTH: copies parked explain_draft into teacher_note. Confirm in UI; default Keep private. Not a grade.';

revoke all on function public.attach_explain_as_note(uuid) from public, anon;
grant execute on function public.attach_explain_as_note(uuid) to authenticated;

-- Family-facing note: parent_progress / student_gradebook / digests must not
-- project explain_draft, explain_status, model_draft extract, draft_score, or
-- originals. Existing RPCs already omit these columns; do not add them later.
