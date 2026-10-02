-- GB-18 locked fields: null/default payload must not fail Save draft (t_4411b913).
-- Prior assert treated payload exam_weight null vs stored non-null as a teacher edit.
-- Fix: (1) null/absent locked scalars are not edits; (2) force locked scalars from
-- existing row before write so a null payload cannot wipe school values.
-- Idempotent create-or-replace. Do not edit older migrations. devops-release applies.

create or replace function public.gb_force_locked_syllabus_v2(
  p_class_id uuid,
  p_v2 jsonb,
  p_existing public.class_syllabi
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  locks jsonb;
  v2 jsonb := coalesce(p_v2, '{}'::jsonb);
begin
  if p_existing is null then
    return v2;
  end if;
  locks := public.gb_latest_school_locks(public.gb_class_school_id(p_class_id));

  if coalesce((locks->>'engine')::boolean, false) then
    v2 := jsonb_set(v2, '{engine}', to_jsonb(p_existing.engine), true);
  end if;
  if coalesce((locks->>'late')::boolean, false) then
    v2 := jsonb_set(
      v2,
      '{late_rule}',
      coalesce(p_existing.late_rule, '{"type":"none"}'::jsonb),
      true
    );
  end if;
  if coalesce((locks->>'floor')::boolean, false) then
    v2 := jsonb_set(
      v2,
      '{floor}',
      case when p_existing.floor is null then 'null'::jsonb else to_jsonb(p_existing.floor) end,
      true
    );
  end if;
  if coalesce((locks->>'book_mode')::boolean, false) then
    v2 := jsonb_set(v2, '{book_mode}', to_jsonb(p_existing.book_mode), true);
  end if;
  if coalesce((locks->>'rollup')::boolean, false) then
    v2 := jsonb_set(
      v2,
      '{rollup_preset}',
      case
        when p_existing.rollup_preset is null then 'null'::jsonb
        else to_jsonb(p_existing.rollup_preset)
      end,
      true
    );
    v2 := jsonb_set(
      v2,
      '{exam_weight}',
      case
        when p_existing.exam_weight is null then 'null'::jsonb
        else to_jsonb(p_existing.exam_weight)
      end,
      true
    );
  end if;
  if coalesce((locks->>'retake')::boolean, false) then
    v2 := jsonb_set(
      v2,
      '{retake}',
      case when p_existing.retake is null then 'null'::jsonb else to_jsonb(p_existing.retake) end,
      true
    );
  end if;
  return v2;
end;
$$;

comment on function public.gb_force_locked_syllabus_v2(uuid, jsonb, public.class_syllabi) is
  'GB-18: overwrite locked v2 scalars from the existing class syllabus row before save/publish write.';

-- Assert only raises on a *present non-null* locked value that differs from stored.
-- Null/absent locked scalars are treated as "unchanged" (teacher did not edit them).
create or replace function public.gb_assert_syllabus_locked_fields(
  p_class_id uuid,
  p_payload jsonb,
  p_existing public.class_syllabi
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  locks jsonb;
  reasons jsonb;
  v2 jsonb;
  reason text;
  incoming_cats jsonb;
  stored_cats jsonb;
  raw jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  sid := public.gb_class_school_id(p_class_id);
  if sid is null then
    return;
  end if;
  locks := public.gb_latest_school_locks(sid);
  reasons := public.gb_latest_school_lock_reasons(sid);
  v2 := public.syllabus_normalize_v2_fields(raw);

  if p_existing is null then
    return; -- first write: nothing to diverge from yet
  end if;

  if coalesce((locks->>'engine')::boolean, false)
     and raw ? 'engine'
     and nullif(raw->>'engine', '') is not null
     and not public.gb_json_eq(v2->'engine', to_jsonb(p_existing.engine))
  then
    reason := coalesce(nullif(reasons->>'engine', ''), 'School grading policy locks the calculation engine.');
    raise exception 'Locked field "engine" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'late')::boolean, false)
     and raw ? 'late_rule'
     and not public.gb_json_eq(
       coalesce(v2->'late_rule', '{"type":"none"}'::jsonb),
       coalesce(p_existing.late_rule, '{"type":"none"}'::jsonb)
     )
  then
    reason := coalesce(nullif(reasons->>'late', ''), 'Late penalty rule is set by the school grading policy.');
    raise exception 'Locked field "late" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'floor')::boolean, false)
     and raw ? 'floor'
     and raw->'floor' is distinct from 'null'::jsonb
     and p_existing.floor is distinct from (v2->>'floor')::numeric
  then
    reason := coalesce(nullif(reasons->>'floor', ''), 'Period floor is set by the school grading policy.');
    raise exception 'Locked field "floor" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'book_mode')::boolean, false)
     and raw ? 'book_mode'
     and nullif(raw->>'book_mode', '') is not null
     and not public.gb_json_eq(v2->'book_mode', to_jsonb(p_existing.book_mode))
  then
    reason := coalesce(nullif(reasons->>'book_mode', ''), 'Book reset mode is set by the school calendar policy.');
    raise exception 'Locked field "book_mode" cannot be edited by the teacher. %', reason;
  end if;

  -- rollup: only a present non-null rollup_preset / exam_weight that differs is an edit.
  -- payload null defaults (teacher never touched rollup) are not edits.
  if coalesce((locks->>'rollup')::boolean, false) then
    if raw ? 'rollup_preset'
       and nullif(raw->>'rollup_preset', '') is not null
       and p_existing.rollup_preset is distinct from (v2->>'rollup_preset')
    then
      reason := coalesce(nullif(reasons->>'rollup', ''), 'Term rollup / exam weight is set by the school calendar.');
      raise exception 'Locked field "rollup" cannot be edited by the teacher. %', reason;
    end if;
    if raw ? 'exam_weight'
       and raw->'exam_weight' is distinct from 'null'::jsonb
       and p_existing.exam_weight is distinct from (v2->>'exam_weight')::numeric
    then
      reason := coalesce(nullif(reasons->>'rollup', ''), 'Term rollup / exam weight is set by the school calendar.');
      raise exception 'Locked field "rollup" cannot be edited by the teacher. %', reason;
    end if;
  end if;

  if coalesce((locks->>'categories')::boolean, false)
     and raw ? 'categories'
  then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', e->>'key',
          'label', e->>'label',
          'weight_percent', round(coalesce((e->>'weight_percent')::numeric, 0), 4)
        ) order by e->>'key'
      ),
      '[]'::jsonb
    )
    into incoming_cats
    from jsonb_array_elements(coalesce(raw->'categories', '[]'::jsonb)) e
    where coalesce((e->>'active')::boolean, true);

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', c.key,
          'label', c.label,
          'weight_percent', round(c.weight_percent::numeric, 4)
        ) order by c.key
      ),
      '[]'::jsonb
    )
    into stored_cats
    from public.syllabus_categories c
    where c.syllabus_id = p_existing.id
      and c.active;

    if incoming_cats is distinct from stored_cats then
      reason := coalesce(nullif(reasons->>'categories', ''), 'School grading policy locks category structure or weights.');
      raise exception 'Locked field "categories" cannot be edited by the teacher. %', reason;
    end if;
  end if;
end;
$$;

comment on function public.gb_assert_syllabus_locked_fields(uuid, jsonb, public.class_syllabi) is
  'GB-18: reject deliberate teacher edits to school-locked syllabus fields; null/absent locked scalars are not edits.';

-- save: force locked v2 from existing after normalize (and before write).
create or replace function public.save_class_syllabus_draft(
  p_class_id uuid,
  p_payload jsonb
)
returns public.class_syllabi
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.class_syllabi;
  existing public.class_syllabi;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  policies jsonb;
  term_structure text;
  active_term text;
  title text;
  terms jsonb;
  categories jsonb;
  v2 jsonb;
  retake_val jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.class_teacher_of(p_class_id) then raise exception 'not allowed'; end if;

  select * into existing from public.class_syllabi where class_id = p_class_id;
  perform public.gb_assert_syllabus_locked_fields(p_class_id, payload, existing);

  policies := public.syllabus_normalize_policies(payload->'policies');
  term_structure := coalesce(nullif(payload->>'term_structure', ''), 'year');
  if term_structure not in ('quarters', 'semesters', 'year', 'custom') then
    raise exception 'invalid term_structure';
  end if;
  active_term := nullif(payload->>'active_term', '');
  if active_term is not null and active_term not in ('q1','q2','q3','q4','s1','s2','year') then
    raise exception 'invalid active_term';
  end if;
  title := nullif(trim(coalesce(payload->>'title', '')), '');
  terms := coalesce(payload->'terms', '[]'::jsonb);
  categories := coalesce(payload->'categories', '[]'::jsonb);
  v2 := public.syllabus_normalize_v2_fields(payload);
  v2 := public.gb_force_locked_syllabus_v2(p_class_id, v2, existing);
  retake_val := case when v2->'retake' = 'null'::jsonb then null else v2->'retake' end;

  v2 := jsonb_set(
    v2,
    '{locks}',
    public.gb_latest_school_locks(public.gb_class_school_id(p_class_id))
      || coalesce(v2->'locks', '{}'::jsonb)
      || public.gb_latest_school_locks(public.gb_class_school_id(p_class_id)),
    true
  );

  insert into public.class_syllabi as s (
    class_id, status, title, calc_mode, term_structure, active_term,
    policies, terms, publish_to_family, source, updated_at,
    engine, within_category, book_mode, extra_credit_method, ec_cap,
    late_rule, missing_rule, rounding, floor, ceiling, exam_weight,
    rollup_preset, locks, marking_period_scope, retake
  ) values (
    p_class_id, 'draft', title, 'category_weight', term_structure, active_term,
    policies, terms, coalesce((policies->>'publish_to_family')::boolean, true),
    coalesce(nullif(payload->>'source', ''), 'manual'), now(),
    v2->>'engine', v2->>'within_category', v2->>'book_mode', v2->>'extra_credit_method',
    case when v2->'ec_cap' = 'null'::jsonb then null else (v2->>'ec_cap')::numeric end,
    coalesce(v2->'late_rule', '{"type":"none"}'::jsonb),
    v2->>'missing_rule', v2->>'rounding',
    case when v2->'floor' = 'null'::jsonb then null else (v2->>'floor')::numeric end,
    case when v2->'ceiling' = 'null'::jsonb then null else (v2->>'ceiling')::numeric end,
    case when v2->'exam_weight' = 'null'::jsonb then null else (v2->>'exam_weight')::numeric end,
    case when v2->'rollup_preset' = 'null'::jsonb then null else v2->>'rollup_preset' end,
    coalesce(v2->'locks', '{}'::jsonb), v2->>'marking_period_scope',
    retake_val
  )
  on conflict (class_id) do update
    set title = excluded.title,
        term_structure = excluded.term_structure,
        active_term = excluded.active_term,
        policies = excluded.policies,
        terms = excluded.terms,
        publish_to_family = excluded.publish_to_family,
        status = 'draft',
        published_at = null,
        source = coalesce(nullif(payload->>'source', ''), s.source),
        engine = excluded.engine,
        within_category = excluded.within_category,
        book_mode = excluded.book_mode,
        extra_credit_method = excluded.extra_credit_method,
        ec_cap = excluded.ec_cap,
        late_rule = excluded.late_rule,
        missing_rule = excluded.missing_rule,
        rounding = excluded.rounding,
        floor = excluded.floor,
        ceiling = excluded.ceiling,
        exam_weight = excluded.exam_weight,
        rollup_preset = excluded.rollup_preset,
        locks = excluded.locks,
        marking_period_scope = excluded.marking_period_scope,
        retake = excluded.retake,
        updated_at = now()
  returning * into row;

  perform public.syllabus_replace_categories(row.id, categories);
  perform public.write_audit(
    'save_class_syllabus_draft', 'class_syllabus', row.id::text, null, p_class_id, null,
    jsonb_build_object('status', row.status, 'engine', row.engine)
  );
  return row;
end;
$$;

create or replace function public.publish_class_syllabus(
  p_class_id uuid,
  p_payload jsonb,
  p_row_version int
)
returns public.class_syllabi
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.class_syllabi;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  policies jsonb;
  term_structure text;
  active_term text;
  title text;
  terms jsonb;
  categories jsonb;
  weight_sum numeric;
  weights_error text;
  active_count int;
  old_asset uuid;
  v2 jsonb;
  next_ver int;
  snap jsonb;
  cats_snap jsonb;
  retake_val jsonb;
  existing public.class_syllabi;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.class_teacher_of(p_class_id) then raise exception 'not allowed'; end if;

  select * into row from public.class_syllabi where class_id = p_class_id for update;
  if found and row.row_version is distinct from p_row_version then
    raise exception 'syllabus version conflict';
  end if;
  if found then
    existing := row;
  else
    existing := null;
  end if;
  perform public.gb_assert_syllabus_locked_fields(p_class_id, payload, existing);
  old_asset := case when found then row.source_asset_id else null end;
  if payload ? 'rubric_draft' then payload := payload - 'rubric_draft'; end if;
  if payload ? 'source_asset_id_to_delete' then payload := payload - 'source_asset_id_to_delete'; end if;

  policies := public.syllabus_normalize_policies(payload->'policies');
  term_structure := coalesce(nullif(payload->>'term_structure', ''), 'year');
  if term_structure not in ('quarters', 'semesters', 'year', 'custom') then
    raise exception 'invalid term_structure';
  end if;
  active_term := nullif(payload->>'active_term', '');
  if active_term is not null and active_term not in ('q1','q2','q3','q4','s1','s2','year') then
    raise exception 'invalid active_term';
  end if;
  title := nullif(trim(coalesce(payload->>'title', '')), '');
  terms := coalesce(payload->'terms', '[]'::jsonb);
  categories := coalesce(payload->'categories', '[]'::jsonb);
  if jsonb_typeof(categories) <> 'array' or jsonb_array_length(categories) < 1 then
    raise exception 'at least one category required';
  end if;
  v2 := public.syllabus_normalize_v2_fields(payload);
  v2 := public.gb_force_locked_syllabus_v2(p_class_id, v2, existing);
  retake_val := case when v2->'retake' = 'null'::jsonb then null else v2->'retake' end;
  v2 := jsonb_set(
    v2,
    '{locks}',
    public.gb_latest_school_locks(public.gb_class_school_id(p_class_id))
      || coalesce(v2->'locks', '{}'::jsonb)
      || public.gb_latest_school_locks(public.gb_class_school_id(p_class_id)),
    true
  );

  if not found then
    insert into public.class_syllabi (
      class_id, status, title, calc_mode, term_structure, active_term,
      policies, terms, publish_to_family, source, published_at, row_version, updated_at,
      engine, within_category, book_mode, extra_credit_method, ec_cap,
      late_rule, missing_rule, rounding, floor, ceiling, exam_weight,
      rollup_preset, locks, marking_period_scope, syllabus_version, retake
    ) values (
      p_class_id, 'published', publish_class_syllabus.title, 'category_weight',
      publish_class_syllabus.term_structure, publish_class_syllabus.active_term,
      publish_class_syllabus.policies, publish_class_syllabus.terms,
      coalesce((publish_class_syllabus.policies->>'publish_to_family')::boolean, true),
      coalesce(nullif(payload->>'source', ''), 'manual'), now(), 1, now(),
      v2->>'engine', v2->>'within_category', v2->>'book_mode', v2->>'extra_credit_method',
      case when v2->'ec_cap' = 'null'::jsonb then null else (v2->>'ec_cap')::numeric end,
      coalesce(v2->'late_rule', '{"type":"none"}'::jsonb),
      v2->>'missing_rule', v2->>'rounding',
      case when v2->'floor' = 'null'::jsonb then null else (v2->>'floor')::numeric end,
      case when v2->'ceiling' = 'null'::jsonb then null else (v2->>'ceiling')::numeric end,
      case when v2->'exam_weight' = 'null'::jsonb then null else (v2->>'exam_weight')::numeric end,
      case when v2->'rollup_preset' = 'null'::jsonb then null else v2->>'rollup_preset' end,
      coalesce(v2->'locks', '{}'::jsonb),
      v2->>'marking_period_scope', 1, retake_val
    ) returning * into row;
  else
    next_ver := coalesce(row.syllabus_version, 1) + 1;
    update public.class_syllabi set
      title = publish_class_syllabus.title,
      term_structure = publish_class_syllabus.term_structure,
      active_term = publish_class_syllabus.active_term,
      policies = publish_class_syllabus.policies,
      terms = publish_class_syllabus.terms,
      publish_to_family = coalesce((publish_class_syllabus.policies->>'publish_to_family')::boolean, true),
      status = 'published', published_at = now(), ask_draft = null, source_asset_id = null,
      source = coalesce(nullif(payload->>'source', ''), source),
      engine = v2->>'engine', within_category = v2->>'within_category',
      book_mode = v2->>'book_mode', extra_credit_method = v2->>'extra_credit_method',
      ec_cap = case when v2->'ec_cap' = 'null'::jsonb then null else (v2->>'ec_cap')::numeric end,
      late_rule = coalesce(v2->'late_rule', '{"type":"none"}'::jsonb),
      missing_rule = v2->>'missing_rule', rounding = v2->>'rounding',
      floor = case when v2->'floor' = 'null'::jsonb then null else (v2->>'floor')::numeric end,
      ceiling = case when v2->'ceiling' = 'null'::jsonb then null else (v2->>'ceiling')::numeric end,
      exam_weight = case when v2->'exam_weight' = 'null'::jsonb then null else (v2->>'exam_weight')::numeric end,
      rollup_preset = case when v2->'rollup_preset' = 'null'::jsonb then null else v2->>'rollup_preset' end,
      locks = coalesce(v2->'locks', '{}'::jsonb),
      marking_period_scope = v2->>'marking_period_scope',
      retake = retake_val,
      syllabus_version = next_ver, row_version = row.row_version + 1, updated_at = now()
    where id = row.id returning * into row;
  end if;
  perform public.syllabus_replace_categories(row.id, publish_class_syllabus.categories);

  select count(*)::int, coalesce(sum(weight_percent), 0)
    into active_count, weight_sum
  from public.syllabus_categories
  where syllabus_id = row.id and active;
  weights_error := public.syllabus_publish_weights_error(row.id, row.extra_credit_method);
  if weights_error is not null then raise exception '%', weights_error; end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.label), '[]'::jsonb)
    into cats_snap
  from public.syllabus_categories c
  where c.syllabus_id = row.id;

  snap := jsonb_build_object(
    'syllabus', to_jsonb(row),
    'categories', cats_snap,
    'published_at', row.published_at
  );

  insert into public.syllabus_versions (syllabus_id, version, snapshot, published_at, published_by)
  values (row.id, row.syllabus_version, snap, coalesce(row.published_at, now()), auth.uid())
  on conflict (syllabus_id, version) do update
    set snapshot = excluded.snapshot,
        published_at = excluded.published_at,
        published_by = excluded.published_by;

  if old_asset is not null
     and exists (
       select 1 from public.assets a
       where a.id = old_asset and a.teacher_id = auth.uid()
     ) then
    perform public._unref_delete_asset(old_asset);
  end if;

  perform public.write_audit(
    'publish_class_syllabus', 'class_syllabus', row.id::text, null, p_class_id, null,
    jsonb_build_object(
      'status', 'published',
      'publish_to_family', row.publish_to_family,
      'weight_sum', weight_sum,
      'extra_credit_method', row.extra_credit_method,
      'row_version', row.row_version,
      'syllabus_version', row.syllabus_version,
      'engine', row.engine
    )
  );
  return row;
end;
$$;

revoke all on function public.gb_force_locked_syllabus_v2(uuid, jsonb, public.class_syllabi) from public, anon;
grant execute on function public.gb_force_locked_syllabus_v2(uuid, jsonb, public.class_syllabi) to authenticated;
grant execute on function public.gb_assert_syllabus_locked_fields(uuid, jsonb, public.class_syllabi) to authenticated;
revoke all on function public.save_class_syllabus_draft(uuid, jsonb) from public, anon;
grant execute on function public.save_class_syllabus_draft(uuid, jsonb) to authenticated;
revoke all on function public.publish_class_syllabus(uuid, jsonb, int) from public, anon;
grant execute on function public.publish_class_syllabus(uuid, jsonb, int) to authenticated;
