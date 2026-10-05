-- Explain privacy: expose assignment title/unit/section on gauth_load_explain_capture.
-- Repo-only until applied; authz wall unchanged.

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
  assignment_title text;
  assignment_unit text;
  assignment_section text;
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
    select a.key_items, a.title, a.unit, a.section
      into key_items, assignment_title, assignment_unit, assignment_section
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
    'seat', prof.role,
    'assignment_title', assignment_title,
    'assignment_unit', assignment_unit,
    'assignment_section', assignment_section
  );
end;
$$;

comment on function public.gauth_load_explain_capture(uuid) is
  'GAUTH v1.1+: load explain context for teacher (taught class) or parent (linked child). Includes assignment title/unit/section when bound. Active seat only.';

revoke all on function public.gauth_load_explain_capture(uuid) from public, anon;
grant execute on function public.gauth_load_explain_capture(uuid) to authenticated;
