-- Syllabus Save draft + Publish realization fix (t_bb852869).
-- 1) save_class_syllabus_draft: restore retake + full v2 fields (lost after 20261001230000).
-- 2) publish_class_syllabus: keep qualified locals (20261002110000) + retake + EC weights.
-- Idempotent create-or-replace. Do not edit older migrations. Not applied here — devops-release.
-- Also name prior unapplied: 20261002110000_gb_syllabus_publish_qualify.sql (superseded by this for publish body).

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
  retake_val := case when v2->'retake' = 'null'::jsonb then null else v2->'retake' end;

  -- Force school locks onto the stored locks map (teacher cannot unlock).
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
    v2->>'rollup_preset', coalesce(v2->'locks', '{}'::jsonb), v2->>'marking_period_scope',
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
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.class_teacher_of(p_class_id) then raise exception 'not allowed'; end if;

  select * into row from public.class_syllabi where class_id = p_class_id for update;
  if found and row.row_version is distinct from p_row_version then
    raise exception 'syllabus version conflict';
  end if;
  perform public.gb_assert_syllabus_locked_fields(
    p_class_id,
    payload,
    case when found then row else null end
  );
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
      v2->>'rollup_preset', coalesce(v2->'locks', '{}'::jsonb),
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
      rollup_preset = v2->>'rollup_preset', locks = coalesce(v2->'locks', '{}'::jsonb),
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

revoke all on function public.save_class_syllabus_draft(uuid, jsonb) from public, anon;
grant execute on function public.save_class_syllabus_draft(uuid, jsonb) to authenticated;
revoke all on function public.publish_class_syllabus(uuid, jsonb, int) from public, anon;
grant execute on function public.publish_class_syllabus(uuid, jsonb, int) to authenticated;
