-- Submission lifecycle: assigned → started → completed → graded.
-- Started when the student opens/views. Completed on submit. Graded only
-- after the teacher grades. AI draft scores do not change status.
--
-- Maps existing rows:
--   submitted, draft_scored → completed
--   approved → graded

drop function if exists public.student_list_todo();
drop function if exists public.student_submit(uuid, jsonb);
drop function if exists public.student_report_lesson(uuid, jsonb);
drop function if exists public.student_open_lesson(uuid);
drop function if exists public.student_mark_started(uuid);

alter table public.submissions alter column status drop default;

alter table public.submissions
  alter column status type text using (
    case status::text
      when 'submitted' then 'completed'
      when 'draft_scored' then 'completed'
      when 'approved' then 'graded'
      else status::text
    end
  );

drop type public.submission_status cascade;

create type public.submission_status as enum ('assigned', 'started', 'completed', 'graded');

alter table public.submissions
  alter column status type public.submission_status using status::public.submission_status;

alter table public.submissions
  alter column status set default 'assigned'::public.submission_status;

comment on column public.submissions.status is
  'assigned after the teacher assigns; started when the student opens; completed on submit; graded after the teacher grades. Nothing is a grade until graded.';

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

create function public.student_mark_started(p_submission_id uuid)
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
  set status = 'started'
  where sub.id = p_submission_id
    and sub.student_id = sid
    and sub.status = 'assigned';
end;
$$;

comment on function public.student_mark_started(uuid) is
  'Own cell only. assigned → started when the student opens or begins the work. No-op if already started, completed, or graded.';

revoke all on function public.student_mark_started(uuid) from public, anon;
grant execute on function public.student_mark_started(uuid) to authenticated;

create function public.student_submit(
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
    status = 'completed',
    submitted_at = now()
  from public.assignments a
  where sub.id = p_submission_id
    and sub.assignment_id = a.id
    and sub.student_id = sid
    and sub.status in ('assigned', 'started')
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

revoke all on function public.student_submit(uuid, jsonb) from public, anon;
grant execute on function public.student_submit(uuid, jsonb) to authenticated;

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

  update public.submissions sub
  set status = 'started'
  from public.assignments a
  where a.id = p_assignment_id
    and sub.assignment_id = a.id
    and sub.student_id = sid
    and a.kind = 'lesson'
    and sub.status = 'assigned';

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
  'Own lesson cell only. Marks assigned → started. Returns identity and beat window. Prefix is storage_deck_id/version.';

revoke all on function public.student_open_lesson(uuid) from public, anon;
grant execute on function public.student_open_lesson(uuid) to authenticated;

create function public.student_report_lesson(
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
  'Overwrite the signed-in student’s lesson cell. Opening sets started. Complete sets completed. Never writes graded.';

revoke all on function public.student_report_lesson(uuid, jsonb) from public, anon;
grant execute on function public.student_report_lesson(uuid, jsonb) to authenticated;

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
                select sub.status::text
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
