-- Lesson struggle → draft skill_gaps on complete. Optional AI queue via submission_id.
-- Paste in the SQL editor. Do not invent students. Never write graded. Never set focus on draft.

-- ---------------------------------------------------------------------------
-- ai_jobs: allow submission-scoped review jobs (capture_id was NOT NULL).
-- ---------------------------------------------------------------------------

alter table public.ai_jobs
  alter column capture_id drop not null;

alter table public.ai_jobs
  add column if not exists submission_id uuid references public.submissions (id) on delete cascade;

alter table public.ai_jobs drop constraint if exists ai_jobs_source_row;
alter table public.ai_jobs
  add constraint ai_jobs_source_row
  check (capture_id is not null or submission_id is not null);

create index if not exists ai_jobs_submission_idx on public.ai_jobs (submission_id);

-- ---------------------------------------------------------------------------
-- Labels from worthPractice-style struggle signals (item stems, cap 3).
-- ---------------------------------------------------------------------------

create or replace function public.lesson_struggle_gap_labels(p_payload jsonb)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  extras jsonb;
  marks jsonb;
  mark jsonb;
  ids text[];
  id text;
  stem text;
  labels text[] := '{}';
  later_ids text[];
  hinted_ids text[];
  ok_is_bool boolean;
  ok_val boolean;
  tries int;
  hints int;
  later_corrected boolean;
  worth boolean;
  seen text[] := '{}';
  key text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return '{}';
  end if;
  if coalesce(nullif(p_payload->>'state', ''), '') <> 'complete' then
    return '{}';
  end if;

  extras := case
    when jsonb_typeof(p_payload->'extras') = 'object' then p_payload->'extras'
    else '{}'::jsonb
  end;

  if jsonb_typeof(p_payload->'marks') = 'object' then
    if jsonb_typeof(p_payload->'marks'->'answers') = 'object' then
      marks := p_payload->'marks'->'answers';
    else
      marks := p_payload->'marks';
    end if;
  else
    marks := '{}'::jsonb;
  end if;

  select coalesce(array_agg(x), '{}')
    into later_ids
  from jsonb_array_elements_text(coalesce(extras->'later_corrected', '[]'::jsonb)) as x
  where length(trim(x)) > 0;

  select coalesce(array_agg(x), '{}')
    into hinted_ids
  from jsonb_array_elements_text(coalesce(extras->'hinted', '[]'::jsonb)) as x
  where length(trim(x)) > 0;

  if jsonb_typeof(extras->'item_ids') = 'array' and jsonb_array_length(extras->'item_ids') > 0 then
    select coalesce(array_agg(x), '{}')
      into ids
    from jsonb_array_elements_text(extras->'item_ids') as x
    where x not in ('slider37', 'who') and length(trim(x)) > 0;
  else
    select coalesce(array_agg(k), '{}')
      into ids
    from jsonb_object_keys(marks) as k
    where k not in ('slider37', 'who');
  end if;

  foreach id in array ids
  loop
    mark := marks->id;
    ok_is_bool := coalesce(
      mark is not null
        and jsonb_typeof(mark) = 'object'
        and (mark ? 'ok')
        and jsonb_typeof(mark->'ok') = 'boolean',
      false
    );
    ok_val := case when ok_is_bool then (mark->>'ok')::boolean else null end;
    tries := coalesce(nullif(mark->>'tries', '')::int, 0);
    if tries < 0 then tries := 0; end if;
    hints := greatest(
      coalesce(nullif(mark->>'hints', '')::int, 0),
      case when id = any (hinted_ids) then 1 else 0 end
    );
    if hints < 0 then hints := 0; end if;
    later_corrected := coalesce((mark->>'later_corrected')::boolean, false)
      or id = any (later_ids)
      or (ok_val is true and coalesce((mark->>'first_ok')::boolean, true) is false);

    worth := (ok_is_bool and ok_val is false)
      or (not ok_is_bool)
      or later_corrected
      or tries >= 3
      or hints >= 2;

    if not worth then
      continue;
    end if;

    stem := nullif(trim(coalesce(extras->'item_stems'->>id, '')), '');
    if stem is null then
      stem := 'Question ' || id;
    end if;
    if char_length(stem) > 48 then
      stem := left(stem, 48);
    end if;
    key := lower(stem);
    if key = any (seen) then
      continue;
    end if;
    seen := array_append(seen, key);
    labels := array_append(labels, stem);
    exit when coalesce(array_length(labels, 1), 0) >= 3;
  end loop;

  return labels;
end;
$$;

comment on function public.lesson_struggle_gap_labels(jsonb) is
  'worthPractice-style struggle labels from a lesson payload. Cap 3. Empty when clean first-try complete.';

revoke all on function public.lesson_struggle_gap_labels(jsonb) from public, anon;

-- ---------------------------------------------------------------------------
-- student_report_lesson: complete → draft skill_gaps; optional AI queue.
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
  sub_id uuid;
  school uuid;
  labels text[] := '{}';
  i int;
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

  select sub.id, sub.answers, a.class_id
    into sub_id, prev, klass
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
      when sub.status = 'graded' then sub.status
      when state = 'complete' then 'completed'::public.submission_status
      when sub.status = 'assigned' then 'started'::public.submission_status
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
    and sub.student_id = sid
    and sub.id = sub_id;

  if not found then
    raise exception 'Lesson not found';
  end if;

  if state = 'complete' then
    -- Replace model drafts only. Never touch teacher / approved rows. Never set focus.
    delete from public.skill_gaps
    where submission_id = sub_id
      and source = 'model'
      and status = 'draft';

    labels := public.lesson_struggle_gap_labels(
      coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('state', state)
    );

    if coalesce(array_length(labels, 1), 0) > 0 then
      for i in 1 .. least(array_length(labels, 1), 3) loop
        insert into public.skill_gaps (
          capture_id,
          submission_id,
          student_id,
          label,
          source,
          status,
          sort_order
        ) values (
          null,
          sub_id,
          sid,
          labels[i],
          'model',
          'draft',
          i
        );
      end loop;

      school := public.my_school_id();
      if school is not null
         and not exists (
           select 1
           from public.ai_jobs j
           where j.submission_id = sub_id
             and j.kind = 'submission_review'
             and j.status in ('pending', 'running')
         )
      then
        insert into public.ai_jobs (
          school_id,
          teacher_id,
          capture_id,
          submission_id,
          kind,
          pass,
          status
        ) values (
          school,
          null,
          null,
          sub_id,
          'submission_review',
          'cheap',
          'pending'
        );
      end if;
    end if;
  end if;

  perform public.write_audit(
    'student_report_lesson',
    'submission',
    p_assignment_id::text,
    sid,
    klass,
    null,
    jsonb_build_object(
      'state', state,
      'attempt', attempt,
      'gap_count', coalesce(array_length(labels, 1), 0)
    )
  );
end;
$$;

comment on function public.student_report_lesson(uuid, jsonb) is
  'Overwrite the signed-in student’s lesson cell. Complete sets completed and upserts draft skill_gaps on struggle. Never writes graded. Never sets focus.';

revoke all on function public.student_report_lesson(uuid, jsonb) from public, anon;
grant execute on function public.student_report_lesson(uuid, jsonb) to authenticated;
