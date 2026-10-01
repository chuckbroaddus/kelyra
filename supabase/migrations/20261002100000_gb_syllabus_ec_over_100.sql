-- Extra credit as its own category may push published weights over 100%.
-- Regular categories still have to total exactly 100%; only the extra-credit category
-- (method C) is added on top. Mirrors src/lib/syllabus/extraCreditWeights.ts.
-- Replaces the plain 'active weights must sum to 100' check in publish_class_syllabus
-- (last defined in 20261001230000_gb_syllabus_should.sql). Idempotent. Do not edit older migrations.

-- 1) Which category is the extra-credit one. Same test as isExtraCreditCategory() in TS:
--    rules.extra_credit = true, or key is / starts with extra_credit_, extracredit_, bonus_,
--    or label starts "Extra credit" / "Extra-credit" / "Bonus" (whole word).
create or replace function public.syllabus_is_extra_credit_category(
  p_key text,
  p_label text,
  p_rules jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce((p_rules->>'extra_credit') = 'true', false)
      or lower(coalesce(p_key, '')) ~ '^(extra_?credit|bonus)(_|$)'
      or coalesce(p_label, '') ~* '^[[:space:]]*(extra[[:space:]_-]*credit|bonus)\M';
$$;

-- 2) Publish weight rule. Returns null when OK, else the error text.
--    Error texts keep the 'active weights must sum to 100' prefix the app already maps to plain words.
create or replace function public.syllabus_publish_weights_error(
  p_syllabus_id uuid,
  p_extra_credit_method text
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_count int;
  regular_count int;
  total numeric;
  ec_total numeric;
begin
  select
    count(*)::int,
    count(*) filter (
      where not (p_extra_credit_method = 'C'
        and public.syllabus_is_extra_credit_category(key, label, rules))
    )::int,
    coalesce(sum(weight_percent), 0),
    coalesce(sum(weight_percent) filter (
      where p_extra_credit_method = 'C'
        and public.syllabus_is_extra_credit_category(key, label, rules)
    ), 0)
    into active_count, regular_count, total, ec_total
  from public.syllabus_categories
  where syllabus_id = p_syllabus_id and active;

  if active_count < 1 then return 'at least one active category required'; end if;
  if p_extra_credit_method = 'C' then
    if regular_count < 1 then
      return 'active weights must sum to 100 (add at least one regular category besides extra credit)';
    end if;
    if abs((total - ec_total) - 100) > 0.01 then
      return 'active weights must sum to 100 (not counting the extra credit category)';
    end if;
    return null;
  end if;
  if abs(total - 100) > 0.01 then return 'active weights must sum to 100'; end if;
  return null;
end;
$$;

revoke all on function public.syllabus_is_extra_credit_category(text, text, jsonb) from public, anon;
revoke all on function public.syllabus_publish_weights_error(uuid, text) from public, anon, authenticated;

-- 3) publish_class_syllabus: same as 20261001230000 except the weight check (and audit adds
--    extra_credit_method). create or replace keeps the existing grants.
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
      rollup_preset, locks, marking_period_scope, syllabus_version
    ) values (
      p_class_id, 'published', title, 'category_weight', term_structure, active_term,
      policies, terms, coalesce((policies->>'publish_to_family')::boolean, true),
      coalesce(nullif(payload->>'source', ''), 'manual'), now(), 1, now(),
      v2->>'engine', v2->>'within_category', v2->>'book_mode', v2->>'extra_credit_method',
      case when v2->'ec_cap' = 'null'::jsonb then null else (v2->>'ec_cap')::numeric end,
      coalesce(v2->'late_rule', '{"type":"none"}'::jsonb),
      v2->>'missing_rule', v2->>'rounding',
      case when v2->'floor' = 'null'::jsonb then null else (v2->>'floor')::numeric end,
      case when v2->'ceiling' = 'null'::jsonb then null else (v2->>'ceiling')::numeric end,
      case when v2->'exam_weight' = 'null'::jsonb then null else (v2->>'exam_weight')::numeric end,
      v2->>'rollup_preset', coalesce(v2->'locks', '{}'::jsonb),
      v2->>'marking_period_scope', 1
    ) returning * into row;
  else
    next_ver := coalesce(row.syllabus_version, 1) + 1;
    update public.class_syllabi set
      title = title, term_structure = term_structure, active_term = active_term,
      policies = policies, terms = terms,
      publish_to_family = coalesce((policies->>'publish_to_family')::boolean, true),
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
      syllabus_version = next_ver, row_version = row.row_version + 1, updated_at = now()
    where id = row.id returning * into row;
  end if;
  perform public.syllabus_replace_categories(row.id, categories);

  select count(*)::int, coalesce(sum(weight_percent), 0)
    into active_count, weight_sum
  from public.syllabus_categories
  where syllabus_id = row.id and active;
  -- Regular weights total 100; with extra credit as its own category (method C) only that
  -- category may push the total over 100 (its weight is added on top).
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
