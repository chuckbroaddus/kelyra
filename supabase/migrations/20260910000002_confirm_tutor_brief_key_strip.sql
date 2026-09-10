-- ASK P3: strip/reject answer-key / write-this heuristics at confirm_tutor_brief.
-- Student-safe slice must not carry key stems even if generation or teacher paste slipped.

create or replace function public.tutor_brief_text_looks_like_key(p_text text)
returns boolean
language sql
immutable
as $$
  select case
    when p_text is null or length(trim(p_text)) = 0 then false
    else lower(p_text) ~ '(answer[[:space:]_-]*key|write[[:space:]_-]*this|worked[[:space:]_-]*solution|the[[:space:]]+answer[[:space:]]+is|final[[:space:]]+answer[[:space:]]*:)'
  end;
$$;

comment on function public.tutor_brief_text_looks_like_key(text) is
  'ASK: heuristic for answer-key / write-this lines in tutor brief free text.';

revoke all on function public.tutor_brief_text_looks_like_key(text) from public, anon;
grant execute on function public.tutor_brief_text_looks_like_key(text) to authenticated;

create or replace function public.tutor_brief_strip_key_patterns(p_items jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(to_jsonb(trim(elem)))
      from jsonb_array_elements_text(coalesce(p_items, '[]'::jsonb)) as elem
      where length(trim(elem)) > 0
        and not public.tutor_brief_text_looks_like_key(elem)
    ),
    '[]'::jsonb
  );
$$;

comment on function public.tutor_brief_strip_key_patterns(jsonb) is
  'ASK: drop answer-key / write-this strings from tutor brief jsonb string arrays.';

revoke all on function public.tutor_brief_strip_key_patterns(jsonb) from public, anon;
grant execute on function public.tutor_brief_strip_key_patterns(jsonb) to authenticated;

create or replace function public.confirm_tutor_brief(
  p_assignment_id uuid,
  p_objectives jsonb default null,
  p_misconceptions jsonb default null,
  p_allowed_hint_depth text default null,
  p_vocabulary jsonb default null,
  p_teacher_notes text default null
)
returns public.assignment_tutor_briefs
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.assignments;
  row public.assignment_tutor_briefs;
  depth text;
  objs jsonb;
  misc jsonb;
  vocab jsonb;
  objs_raw jsonb;
  misc_raw jsonb;
  vocab_raw jsonb;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found';
  end if;
  if not public.teaches_class(a.class_id) then
    raise exception 'You can only confirm a tutor brief for a class you teach.';
  end if;

  select * into row from public.assignment_tutor_briefs where assignment_id = p_assignment_id;
  if not found then
    raise exception 'No tutor brief to confirm.';
  end if;

  objs_raw := coalesce(p_objectives, row.objectives, '[]'::jsonb);
  misc_raw := coalesce(p_misconceptions, row.misconceptions, '[]'::jsonb);
  vocab_raw := coalesce(p_vocabulary, row.vocabulary, '[]'::jsonb);

  objs := public.tutor_brief_strip_key_patterns(objs_raw);
  misc := public.tutor_brief_strip_key_patterns(misc_raw);
  vocab := public.tutor_brief_strip_key_patterns(vocab_raw);

  -- Reject when free-text was only key/write-this content (nothing safe left to confirm).
  if (
    jsonb_array_length(objs_raw) > 0
    or jsonb_array_length(misc_raw) > 0
    or jsonb_array_length(vocab_raw) > 0
  )
  and jsonb_array_length(objs) = 0
  and jsonb_array_length(misc) = 0
  and jsonb_array_length(vocab) = 0
  then
    raise exception 'Brief looks like an answer key — remove key / write-this lines before confirming.';
  end if;

  depth := coalesce(nullif(trim(p_allowed_hint_depth), ''), row.allowed_hint_depth, 'next-step');
  if depth not in ('next-step', 'conceptual', 'scaffolding') then
    raise exception 'Invalid hint depth';
  end if;

  -- ~800 tokens ≈ 3200 chars of serialized safe slice.
  if char_length(
    coalesce(objs::text, '') || coalesce(misc::text, '') || coalesce(vocab::text, '') || coalesce(depth, '')
  ) > 3200 then
    raise exception 'Brief is too long to confirm — shorten or re-generate.';
  end if;

  update public.assignment_tutor_briefs
  set
    status = 'confirmed',
    objectives = objs,
    misconceptions = misc,
    allowed_hint_depth = depth,
    vocabulary = vocab,
    teacher_notes = case
      when p_teacher_notes is null then teacher_notes
      else nullif(p_teacher_notes, '')
    end,
    live_objectives = null,
    live_misconceptions = null,
    live_allowed_hint_depth = null,
    live_vocabulary = null,
    material_fingerprint = public.assignment_tutor_brief_fingerprint(p_assignment_id),
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    updated_at = now()
  where assignment_id = p_assignment_id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.confirm_tutor_brief(uuid, jsonb, jsonb, text, jsonb, text)
  from public, anon;
grant execute on function public.confirm_tutor_brief(uuid, jsonb, jsonb, text, jsonb, text)
  to authenticated;
