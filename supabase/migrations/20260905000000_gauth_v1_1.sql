-- GAUTH v1.1 (P parent co-teacher + G4 Practice Help): parent_of helper,
-- seat-aware explain load, student_list_todo.help_mode + strip answer keys.
-- Hermes owns SQL apply. Additive / replace functions only. No live DB apply from this card.
--
-- Seat law: profiles.role is the wall.
--   teacher → class_teacher_of only
--   parent  → parent_of(student_id) only (linked child; twins never mix)
-- Dual-hat follows active seat (not OR of hats).

-- ---------------------------------------------------------------------------
-- parent_of: linked child via profiles.parent_id → parent_students
-- ---------------------------------------------------------------------------

create or replace function public.parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_student_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.profiles pr
      join public.parent_students ps on ps.parent_id = pr.parent_id
      where pr.id = auth.uid()
        and pr.parent_id is not null
        and ps.student_id = p_student_id
    );
$$;

comment on function public.parent_of(uuid) is
  'GAUTH: true iff auth.uid() parent_id is linked to p_student_id in parent_students. Fail closed.';

revoke all on function public.parent_of(uuid) from public, anon;
grant execute on function public.parent_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Seat-aware explain context loader (teacher park path still class_teacher_of).
-- Parents get ephemeral context; never widens family SELECT * on captures.
-- ---------------------------------------------------------------------------

create or replace function public.gauth_load_explain_capture(p_capture_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cap public.captures;
  prof public.profiles;
  key_items jsonb;
  extract_marks jsonb;
  model_draft jsonb;
  photo_path text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;

  select * into prof from public.profiles where id = auth.uid();
  if not found or prof.role is null then
    raise exception 'Sign in required.';
  end if;

  select * into cap from public.captures where id = p_capture_id;
  if not found then
    raise exception 'Capture not found';
  end if;

  if prof.role = 'teacher' then
    if not public.class_teacher_of(cap.class_id) then
      raise exception 'You can only explain a capture for a class you teach.';
    end if;
  elsif prof.role = 'parent' then
    if cap.student_id is null or not public.parent_of(cap.student_id) then
      raise exception 'You can only explain work for a linked child.';
    end if;
  else
    raise exception 'Explain is not available for this seat.';
  end if;

  model_draft := coalesce(cap.model_draft, '{}'::jsonb);
  extract_marks := coalesce(
    model_draft->'extract',
    model_draft->'items',
    model_draft->'marks',
    'null'::jsonb
  );

  if cap.assignment_id is not null then
    select a.key_items into key_items
    from public.assignments a
    where a.id = cap.assignment_id;
  end if;

  if cap.photo_asset_id is not null then
    select a.storage_path into photo_path
    from public.assets a
    where a.id = cap.photo_asset_id;
  end if;

  return jsonb_build_object(
    'id', cap.id,
    'class_id', cap.class_id,
    'student_id', cap.student_id,
    'assignment_id', cap.assignment_id,
    'photo_asset_id', cap.photo_asset_id,
    'photo_storage_path', photo_path,
    'draft_score', cap.draft_score,
    'key_items', key_items,
    'extract', extract_marks,
    'seat', prof.role
  );
end;
$$;

comment on function public.gauth_load_explain_capture(uuid) is
  'GAUTH v1.1: load explain context for teacher (taught class) or parent (linked child). Active seat only.';

revoke all on function public.gauth_load_explain_capture(uuid) from public, anon;
grant execute on function public.gauth_load_explain_capture(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- student_list_todo: expose help_mode; strip answer keys from practice items
-- (no bulk key in client — GAUTH-S1-16).
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
  submitted_at timestamptz,
  class_id uuid,
  class_name text,
  class_icon text,
  approved_score numeric,
  score_mark text,
  deck_id text,
  lesson_version text,
  items jsonb,
  answers jsonb,
  focus_label text,
  help_mode text
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
    sub.submitted_at,
    c.id,
    c.name,
    c.feed_icon,
    sub.approved_score,
    sub.score_mark::text,
    a.deck_id,
    a.lesson_version,
    case
      when ps.items is null then '[]'::jsonb
      else coalesce(
        (
          select jsonb_agg(elem - 'answerKey' - 'answer_key' - 'worked_example' - 'workedExample')
          from jsonb_array_elements(ps.items) as elem
        ),
        '[]'::jsonb
      )
    end,
    sub.answers,
    sk.label,
    coalesce(a.help_mode, 'off')
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  left join public.practice_sets ps on ps.id = a.practice_set_id
  left join public.students st on st.id = sub.student_id
  left join public.skills sk on sk.id = st.current_focus_skill_id
  where sub.student_id = public.my_student_id()
  order by sub.created_at desc;
$$;

comment on function public.student_list_todo() is
  'Own assignment cells. help_mode for Practice Help UI. Answer keys stripped from items.';

revoke all on function public.student_list_todo() from public, anon;
grant execute on function public.student_list_todo() to authenticated;
