-- GB-15 engine Should: retake, attempts, group scores.
-- Idempotent / additive. Do not apply from the build card — DevOps applies.
-- Defaults preserve today's single-score behavior.

-- class_syllabi.retake (null = off)
alter table public.class_syllabi
  add column if not exists retake jsonb;

comment on column public.class_syllabi.retake is
  'GB-15 FR-SYL-12 retake rule JSON; null = off.';

alter table public.assignments
  add column if not exists retake_eligible boolean not null default true;

alter table public.submissions
  add column if not exists score_source text;
alter table public.submissions drop constraint if exists submissions_score_source_check;
alter table public.submissions
  add constraint submissions_score_source_check
  check (
    score_source is null
    or score_source in ('individual', 'group', 'group_override')
  );

alter table public.submissions
  add column if not exists group_score_id uuid;

alter table public.submissions
  add column if not exists score_attempts jsonb not null default '[]'::jsonb;

comment on column public.submissions.score_source is
  'GB-15 FR-ASG-03 provenance; counted value remains approved_score/raw_points.';
comment on column public.submissions.score_attempts is
  'GB-15 attempt list [{raw, at?}]; empty = single score path.';

create table if not exists public.assignment_group_scores (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  label text,
  student_ids uuid[] not null default '{}',
  raw_points numeric not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assignment_group_scores_assignment_idx
  on public.assignment_group_scores (assignment_id);
create index if not exists assignment_group_scores_class_idx
  on public.assignment_group_scores (class_id);

alter table public.assignment_group_scores enable row level security;

drop policy if exists assignment_group_scores_teacher on public.assignment_group_scores;
create policy assignment_group_scores_teacher
  on public.assignment_group_scores
  for all
  using (public.class_teacher_of(class_id))
  with check (public.class_teacher_of(class_id));

comment on table public.assignment_group_scores is
  'GB-15 FR-ASG-03 shared raw for a student group; per-student override wins.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'submissions_group_score_id_fkey'
  ) then
    alter table public.submissions
      add constraint submissions_group_score_id_fkey
      foreign key (group_score_id) references public.assignment_group_scores (id)
      on delete set null;
  end if;
exception when others then
  null;
end $$;

-- syllabus_normalize_v2_fields: include optional retake
create or replace function public.syllabus_normalize_v2_fields(payload jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  src jsonb := coalesce(payload, '{}'::jsonb);
  eng text; book text; ecm text; miss text; rnd text; within text; late jsonb;
  retake jsonb;
begin
  eng := coalesce(nullif(src->>'engine', ''), 'weighted_percent_inside');
  if eng not in ('total_points','weighted_points_inside','weighted_percent_inside','item_weights','none') then
    eng := 'weighted_percent_inside';
  end if;
  book := coalesce(nullif(src->>'book_mode', ''), 'reset_each_marking_period');
  if book not in ('reset_each_marking_period','rolling_year') then
    book := 'reset_each_marking_period';
  end if;
  ecm := coalesce(nullif(src->>'extra_credit_method', ''), 'B');
  if ecm not in ('A','B','C') then ecm := 'B'; end if;
  miss := coalesce(nullif(src->>'missing_rule', ''), 'omit');
  if miss not in ('zero','floor','omit') then miss := 'omit'; end if;
  rnd := coalesce(nullif(src->>'rounding', ''), 'nearest_whole');
  if rnd not in ('nearest_whole','half_up','truncate','none') then rnd := 'nearest_whole'; end if;
  within := nullif(src->>'within_category', '');
  if within is not null and within not in ('points_inside','percent_inside') then within := null; end if;
  late := coalesce(src->'late_rule', '{"type":"none"}'::jsonb);
  if jsonb_typeof(late) <> 'object' then late := '{"type":"none"}'::jsonb; end if;
  retake := case
    when src ? 'retake' and src->'retake' is not null
         and jsonb_typeof(src->'retake') = 'object'
         and src->'retake' <> '{}'::jsonb
      then src->'retake'
    else null
  end;
  return jsonb_build_object(
    'engine', eng,
    'within_category', within,
    'book_mode', book,
    'extra_credit_method', ecm,
    'ec_cap', case when src ? 'ec_cap' and src->>'ec_cap' is not null and src->>'ec_cap' <> ''
      then to_jsonb((src->>'ec_cap')::numeric) else 'null'::jsonb end,
    'late_rule', late,
    'missing_rule', miss,
    'rounding', rnd,
    'floor', case when src ? 'floor' and src->>'floor' is not null and src->>'floor' <> ''
      then to_jsonb((src->>'floor')::numeric) else 'null'::jsonb end,
    'ceiling', case when src ? 'ceiling' and src->>'ceiling' is not null and src->>'ceiling' <> ''
      then to_jsonb((src->>'ceiling')::numeric) else 'null'::jsonb end,
    'exam_weight', case when src ? 'exam_weight' and src->>'exam_weight' is not null and src->>'exam_weight' <> ''
      then to_jsonb((src->>'exam_weight')::numeric) else 'null'::jsonb end,
    'rollup_preset', nullif(src->>'rollup_preset', ''),
    'locks', case when jsonb_typeof(src->'locks') = 'object' then src->'locks' else '{}'::jsonb end,
    'marking_period_scope', nullif(src->>'marking_period_scope', ''),
    'retake', coalesce(to_jsonb(retake), 'null'::jsonb)
  );
end;
$$;

-- save_class_syllabus_draft: persist retake
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

-- publish_class_syllabus: persist retake (body continued below)
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

  if not found then
    insert into public.class_syllabi (
      class_id, status, title, calc_mode, term_structure, active_term,
      policies, terms, publish_to_family, source, published_at, row_version, updated_at,
      engine, within_category, book_mode, extra_credit_method, ec_cap,
      late_rule, missing_rule, rounding, floor, ceiling, exam_weight,
      rollup_preset, locks, marking_period_scope, syllabus_version, retake
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
      v2->>'marking_period_scope', 1, retake_val
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
      retake = retake_val,
      syllabus_version = next_ver, row_version = row.row_version + 1, updated_at = now()
    where id = row.id returning * into row;
  end if;
  perform public.syllabus_replace_categories(row.id, categories);

  select count(*)::int, coalesce(sum(weight_percent), 0)
    into active_count, weight_sum
  from public.syllabus_categories
  where syllabus_id = row.id and active;
  if active_count < 1 then raise exception 'at least one active category required'; end if;
  if abs(weight_sum - 100) > 0.01 then raise exception 'active weights must sum to 100'; end if;

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
      'row_version', row.row_version,
      'syllabus_version', row.syllabus_version,
      'engine', row.engine
    )
  );
  return row;
end;
$$;

-- get_class_syllabus: return retake
create or replace function public.get_class_syllabus(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.class_syllabi;
  cats jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.class_teacher_of(p_class_id) then raise exception 'not allowed'; end if;

  select * into row from public.class_syllabi where class_id = p_class_id;
  if not found then
    return jsonb_build_object('ok', true, 'exists', false);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id, 'key', c.key, 'label', c.label,
      'weight_percent', c.weight_percent, 'sort_order', c.sort_order,
      'active', c.active, 'group', c."group",
      'default_include_in_average', c.default_include_in_average,
      'min_grades_per_term', c.min_grades_per_term, 'rules', c.rules,
      'drop_highest_n', c.drop_highest_n, 'keep_highest_n', c.keep_highest_n,
      'droppable', c.droppable, 'never_drop_flags', c.never_drop_flags,
      'empty_policy', c.empty_policy
    ) order by c.sort_order, c.label
  ), '[]'::jsonb)
  into cats from public.syllabus_categories c where c.syllabus_id = row.id;

  return jsonb_build_object(
    'ok', true, 'exists', true,
    'syllabus', jsonb_build_object(
      'id', row.id, 'class_id', row.class_id, 'status', row.status,
      'title', row.title, 'calc_mode', row.calc_mode,
      'term_structure', row.term_structure, 'active_term', row.active_term,
      'grading_scale', row.grading_scale, 'policies', row.policies,
      'terms', row.terms, 'source', row.source,
      'source_asset_id', row.source_asset_id, 'ask_draft', row.ask_draft,
      'publish_to_family', row.publish_to_family, 'published_at', row.published_at,
      'row_version', row.row_version, 'updated_at', row.updated_at,
      'engine', row.engine, 'within_category', row.within_category,
      'book_mode', row.book_mode, 'extra_credit_method', row.extra_credit_method,
      'ec_cap', row.ec_cap, 'late_rule', row.late_rule,
      'missing_rule', row.missing_rule, 'rounding', row.rounding,
      'floor', row.floor, 'ceiling', row.ceiling, 'exam_weight', row.exam_weight,
      'rollup_preset', row.rollup_preset, 'syllabus_version', row.syllabus_version,
      'locks', row.locks, 'marking_period_scope', row.marking_period_scope,
      'retake', row.retake
    ),
    'categories', cats
  );
end;
$$;
