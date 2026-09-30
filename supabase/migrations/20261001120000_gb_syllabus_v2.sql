-- GB-05 syllabus schema v2 + explain RPC engine fields (CEO rapid 2026-09-30).
-- Idempotent. Do not apply from the build card — DevOps applies.

-- class_syllabi: relax calc_mode + v2 columns (continued below)
alter table public.class_syllabi
  drop constraint if exists class_syllabi_calc_mode_check;

alter table public.class_syllabi
  add constraint class_syllabi_calc_mode_check
  check (
    calc_mode in (
      'category_weight',
      'total_points',
      'weighted_points_inside',
      'weighted_percent_inside',
      'item_weights',
      'none'
    )
  );

alter table public.class_syllabi
  add column if not exists engine text not null default 'weighted_percent_inside';
alter table public.class_syllabi drop constraint if exists class_syllabi_engine_check;
alter table public.class_syllabi
  add constraint class_syllabi_engine_check
  check (engine in (
    'total_points', 'weighted_points_inside', 'weighted_percent_inside', 'item_weights', 'none'
  ));

alter table public.class_syllabi add column if not exists within_category text;
alter table public.class_syllabi drop constraint if exists class_syllabi_within_category_check;
alter table public.class_syllabi
  add constraint class_syllabi_within_category_check
  check (within_category is null or within_category in ('points_inside', 'percent_inside'));

alter table public.class_syllabi
  add column if not exists book_mode text not null default 'reset_each_marking_period';
alter table public.class_syllabi drop constraint if exists class_syllabi_book_mode_check;
alter table public.class_syllabi
  add constraint class_syllabi_book_mode_check
  check (book_mode in ('reset_each_marking_period', 'rolling_year'));

alter table public.class_syllabi
  add column if not exists extra_credit_method text not null default 'B';
alter table public.class_syllabi drop constraint if exists class_syllabi_ec_method_check;
alter table public.class_syllabi
  add constraint class_syllabi_ec_method_check
  check (extra_credit_method in ('A', 'B', 'C'));

alter table public.class_syllabi add column if not exists ec_cap numeric;
alter table public.class_syllabi
  add column if not exists late_rule jsonb not null default '{"type":"none"}'::jsonb;
alter table public.class_syllabi
  add column if not exists missing_rule text not null default 'omit';
alter table public.class_syllabi drop constraint if exists class_syllabi_missing_rule_check;
alter table public.class_syllabi
  add constraint class_syllabi_missing_rule_check
  check (missing_rule in ('zero', 'floor', 'omit'));

alter table public.class_syllabi
  add column if not exists rounding text not null default 'nearest_whole';
alter table public.class_syllabi drop constraint if exists class_syllabi_rounding_check;
alter table public.class_syllabi
  add constraint class_syllabi_rounding_check
  check (rounding in ('nearest_whole', 'half_up', 'truncate', 'none'));

alter table public.class_syllabi add column if not exists floor numeric;
alter table public.class_syllabi add column if not exists ceiling numeric;
alter table public.class_syllabi add column if not exists exam_weight numeric;
alter table public.class_syllabi add column if not exists rollup_preset text;
alter table public.class_syllabi
  add column if not exists syllabus_version int not null default 1;
alter table public.class_syllabi
  add column if not exists locks jsonb not null default '{}'::jsonb;
alter table public.class_syllabi add column if not exists marking_period_scope text;

comment on column public.class_syllabi.engine is
  'GB-05 FR-SYL-01 calculation engine (default weighted_percent_inside = today).';
comment on column public.class_syllabi.syllabus_version is
  'GB-05 FR-SYL-20 live version; bumps on publish; snapshots in syllabus_versions.';

-- syllabus_categories v2
alter table public.syllabus_categories
  add column if not exists drop_highest_n int not null default 0;
alter table public.syllabus_categories
  add column if not exists keep_highest_n int;
alter table public.syllabus_categories
  add column if not exists droppable boolean not null default true;
alter table public.syllabus_categories
  add column if not exists never_drop_flags jsonb not null default '[]'::jsonb;
alter table public.syllabus_categories
  add column if not exists empty_policy text;
alter table public.syllabus_categories drop constraint if exists syllabus_categories_empty_policy_check;
alter table public.syllabus_categories
  add constraint syllabus_categories_empty_policy_check
  check (empty_policy is null or empty_policy in ('renormalize', 'zero'));

-- assignments / submissions
alter table public.assignments add column if not exists max_points numeric;
alter table public.assignments add column if not exists item_weight numeric;
alter table public.assignments
  add column if not exists extra_credit boolean not null default false;
alter table public.assignments
  add column if not exists droppable boolean not null default true;
comment on column public.assignments.max_points is
  'GB-05 FR-ASG-01 points possible; null = legacy percent-on-100 via approved_score.';

alter table public.submissions add column if not exists raw_points numeric;
alter table public.submissions add column if not exists late_applied_at timestamptz;
alter table public.submissions add column if not exists grade_status text;
comment on column public.submissions.raw_points is
  'GB-05 entered points; null falls back to approved_score on 100-scale.';
comment on column public.submissions.grade_status is
  'GB-05 cell status: incomplete|dropped|excused|missing|late|graded|ungraded…';

-- syllabus_versions
create table if not exists public.syllabus_versions (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.class_syllabi (id) on delete cascade,
  version int not null,
  snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (syllabus_id, version)
);
comment on table public.syllabus_versions is
  'GB-05 FR-SYL-20 published syllabus snapshots for stored grade history.';
create index if not exists syllabus_versions_syllabus_idx
  on public.syllabus_versions (syllabus_id, version desc);

alter table public.syllabus_versions enable row level security;

drop policy if exists syllabus_versions_teacher_all on public.syllabus_versions;
create policy syllabus_versions_teacher_all on public.syllabus_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.class_syllabi s
      where s.id = syllabus_id and public.class_teacher_of(s.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_syllabi s
      where s.id = syllabus_id and public.class_teacher_of(s.class_id)
    )
  );

drop policy if exists syllabus_versions_family_select on public.syllabus_versions;
create policy syllabus_versions_family_select on public.syllabus_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.class_syllabi s
      where s.id = syllabus_versions.syllabus_id
        and s.status = 'published'
        and s.publish_to_family = true
        and (
          exists (
            select 1 from public.enrollments e
            where e.class_id = s.class_id and e.student_id = public.my_student_id()
          )
          or exists (
            select 1
            from public.profiles pr
            join public.parent_students ps on ps.parent_id = pr.parent_id
            join public.enrollments e on e.student_id = ps.student_id
            where pr.id = auth.uid()
              and pr.parent_id is not null
              and e.class_id = s.class_id
          )
        )
    )
  );

revoke all on table public.syllabus_versions from public, anon;
grant select, insert, update, delete on table public.syllabus_versions to authenticated;
-- part2 helpers (appended by build)
create or replace function public.syllabus_replace_categories(
  p_syllabus_id uuid,
  p_categories jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  i int := 0;
  v_key text;
  v_label text;
  v_weight numeric;
  v_active boolean;
  v_group text;
  v_default_include boolean;
  v_min int;
  v_rules jsonb;
  v_sort int;
  v_drop_high int;
  v_keep_high int;
  v_droppable boolean;
  v_never jsonb;
  v_empty text;
begin
  delete from public.syllabus_categories where syllabus_id = p_syllabus_id;
  if p_categories is null or jsonb_typeof(p_categories) <> 'array' then
    return;
  end if;
  for item in select * from jsonb_array_elements(p_categories)
  loop
    v_key := public.syllabus_validate_category_key(lower(trim(coalesce(item->>'key', ''))));
    v_label := trim(coalesce(item->>'label', ''));
    if v_label = '' then raise exception 'category label required'; end if;
    v_weight := coalesce((item->>'weight_percent')::numeric, 0);
    if v_weight < 0 or v_weight > 100 then raise exception 'category weight out of range'; end if;
    v_active := coalesce((item->>'active')::boolean, true);
    v_group := nullif(item->>'group', '');
    if v_group is not null and v_group not in ('formative', 'summative') then v_group := null; end if;
    v_default_include := coalesce((item->>'default_include_in_average')::boolean, false);
    v_min := case
      when item ? 'min_grades_per_term' and item->>'min_grades_per_term' is not null
        and item->>'min_grades_per_term' <> '' then (item->>'min_grades_per_term')::int
      else null end;
    v_rules := coalesce(item->'rules', '{}'::jsonb);
    v_sort := coalesce((item->>'sort_order')::int, i);
    v_drop_high := greatest(0, coalesce((item->>'drop_highest_n')::int, 0));
    v_keep_high := case
      when item ? 'keep_highest_n' and item->>'keep_highest_n' is not null
        and item->>'keep_highest_n' <> '' then (item->>'keep_highest_n')::int
      else null end;
    v_droppable := coalesce((item->>'droppable')::boolean, true);
    v_never := coalesce(item->'never_drop_flags', '[]'::jsonb);
    if jsonb_typeof(v_never) <> 'array' then v_never := '[]'::jsonb; end if;
    v_empty := nullif(item->>'empty_policy', '');
    if v_empty is not null and v_empty not in ('renormalize', 'zero') then v_empty := null; end if;
    insert into public.syllabus_categories (
      syllabus_id, key, label, weight_percent, sort_order, active,
      "group", default_include_in_average, min_grades_per_term, rules,
      drop_highest_n, keep_highest_n, droppable, never_drop_flags, empty_policy
    ) values (
      p_syllabus_id, v_key, v_label, v_weight, v_sort, v_active,
      v_group, v_default_include, v_min, v_rules,
      v_drop_high, v_keep_high, v_droppable, v_never, v_empty
    );
    i := i + 1;
  end loop;
end;
$$;
-- v2 field normalizer
create or replace function public.syllabus_normalize_v2_fields(payload jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  src jsonb := coalesce(payload, '{}'::jsonb);
  eng text; book text; ecm text; miss text; rnd text; within text; late jsonb;
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
    'marking_period_scope', nullif(src->>'marking_period_scope', '')
  );
end;
$$;
-- save_class_syllabus_draft with v2 columns
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

  insert into public.class_syllabi as s (
    class_id, status, title, calc_mode, term_structure, active_term,
    policies, terms, publish_to_family, source, updated_at,
    engine, within_category, book_mode, extra_credit_method, ec_cap,
    late_rule, missing_rule, rounding, floor, ceiling, exam_weight,
    rollup_preset, locks, marking_period_scope
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
    v2->>'rollup_preset', coalesce(v2->'locks', '{}'::jsonb), v2->>'marking_period_scope'
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
-- publish_class_syllabus part A
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
-- get_class_syllabus: include v2 syllabus + category fields (keep ok/exists shape)
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
      'locks', row.locks, 'marking_period_scope', row.marking_period_scope
    ),
    'categories', cats
  );
end;
$$;
-- published_class_syllabus: add engine v2 public fields
create or replace function public.published_class_syllabus(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sid uuid;
  row public.class_syllabi;
  cats jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  sid := public.my_student_id();
  if sid is not null then
    if not exists (
      select 1 from public.enrollments e
      where e.class_id = p_class_id and e.student_id = sid
    ) then
      return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
    end if;
  else
    if not exists (
      select 1
      from public.profiles pr
      join public.parent_students ps on ps.parent_id = pr.parent_id
      join public.enrollments e on e.student_id = ps.student_id
      where pr.id = auth.uid()
        and pr.parent_id is not null
        and e.class_id = p_class_id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'not_linked');
    end if;
  end if;

  select * into row
  from public.class_syllabi s
  where s.class_id = p_class_id
    and s.status = 'published'
    and s.publish_to_family = true;
  if not found then
    return jsonb_build_object('ok', true, 'published', false);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', c.key, 'label', c.label, 'weight_percent', c.weight_percent,
      'sort_order', c.sort_order, 'rules', c.rules,
      'drop_highest_n', c.drop_highest_n, 'keep_highest_n', c.keep_highest_n,
      'droppable', c.droppable, 'never_drop_flags', c.never_drop_flags,
      'empty_policy', c.empty_policy, 'min_grades_per_term', c.min_grades_per_term
    ) order by c.sort_order, c.label
  ), '[]'::jsonb)
  into cats from public.syllabus_categories c
  where c.syllabus_id = row.id and c.active;

  return jsonb_build_object(
    'ok', true, 'published', true,
    'title', row.title, 'calc_mode', row.calc_mode,
    'term_structure', row.term_structure, 'active_term', row.active_term,
    'categories', cats,
    'policies_public', public.syllabus_policies_public(row.policies),
    'engine', row.engine, 'within_category', row.within_category,
    'book_mode', row.book_mode, 'extra_credit_method', row.extra_credit_method,
    'ec_cap', row.ec_cap, 'late_rule', row.late_rule,
    'missing_rule', row.missing_rule, 'rounding', row.rounding,
    'floor', row.floor, 'ceiling', row.ceiling,
    'exam_weight', row.exam_weight, 'rollup_preset', row.rollup_preset,
    'syllabus_version', row.syllabus_version,
    'marking_period_scope', row.marking_period_scope
  );
end;
$$;
-- student_class_average_explain: keep old columns; add v2 assignment/cell fields
create or replace function public.student_class_average_explain(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
  syllabus jsonb;
  assignments jsonb;
  cells jsonb;
begin
  if auth.uid() is null or sid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_student');
  end if;
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = sid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  end if;

  syllabus := public.published_class_syllabus(p_class_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id, 'title', a.title, 'category', a.category, 'term', a.term,
      'include_in_average', a.include_in_average, 'due_at', a.due_at,
      'is_makeup', a.is_makeup, 'score_scheme', a.score_scheme,
      'max_score', a.max_score, 'weight_percent', a.weight_percent,
      'weight_band', a.weight_band,
      'max_points', a.max_points, 'item_weight', a.item_weight,
      'extra_credit', a.extra_credit, 'droppable', a.droppable,
      'marking_period_id', a.marking_period_id
    ) order by a.created_at, a.title
  ), '[]'::jsonb)
  into assignments from public.assignments a where a.class_id = p_class_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assignment_id', sub.assignment_id,
      'approved_score', case when sub.approved_at is not null then sub.approved_score else null end,
      'score_mark', case when sub.approved_at is not null then sub.score_mark else null end,
      'status', sub.status,
      'approved_at', sub.approved_at,
      'raw_points', case when sub.approved_at is not null then sub.raw_points else null end,
      'late_applied_at', sub.late_applied_at,
      'grade_status', sub.grade_status
    )
  ), '[]'::jsonb)
  into cells
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.class_id = p_class_id and sub.student_id = sid;

  return jsonb_build_object(
    'ok', true,
    'student_id', sid,
    'class_id', p_class_id,
    'syllabus', syllabus,
    'assignments', assignments,
    'cells', cells,
    'engine_breakdown', jsonb_build_object(
      'schema', 'v2',
      'note', 'Client maps syllabus+cells through engine v2 (computePeriod); RPC supplies inputs only.'
    )
  );
end;
$$;
-- parent_class_average_explain: same v2 assignment/cell columns
create or replace function public.parent_class_average_explain(
  p_class_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  syllabus jsonb;
  assignments jsonb;
  cells jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.family_may_read_class(p_class_id, p_student_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_linked');
  end if;
  if public.my_student_id() is not null and public.my_student_id() is distinct from p_student_id then
    return jsonb_build_object('ok', false, 'reason', 'not_linked');
  end if;
  if public.my_student_id() is null then
    if not exists (
      select 1 from public.profiles pr
      join public.parent_students ps on ps.parent_id = pr.parent_id
      where pr.id = auth.uid() and pr.parent_id is not null and ps.student_id = p_student_id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'not_linked');
    end if;
  end if;
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = p_student_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  end if;

  syllabus := public.published_class_syllabus(p_class_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id, 'title', a.title, 'category', a.category, 'term', a.term,
      'include_in_average', a.include_in_average, 'due_at', a.due_at,
      'is_makeup', a.is_makeup, 'score_scheme', a.score_scheme,
      'max_score', a.max_score, 'weight_percent', a.weight_percent,
      'weight_band', a.weight_band,
      'max_points', a.max_points, 'item_weight', a.item_weight,
      'extra_credit', a.extra_credit, 'droppable', a.droppable,
      'marking_period_id', a.marking_period_id
    ) order by a.created_at, a.title
  ), '[]'::jsonb)
  into assignments from public.assignments a where a.class_id = p_class_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assignment_id', sub.assignment_id,
      'approved_score', case when sub.approved_at is not null then sub.approved_score else null end,
      'score_mark', case when sub.approved_at is not null then sub.score_mark else null end,
      'status', sub.status, 'approved_at', sub.approved_at,
      'raw_points', case when sub.approved_at is not null then sub.raw_points else null end,
      'late_applied_at', sub.late_applied_at, 'grade_status', sub.grade_status
    )
  ), '[]'::jsonb)
  into cells
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.class_id = p_class_id and sub.student_id = p_student_id;

  return jsonb_build_object(
    'ok', true, 'student_id', p_student_id, 'class_id', p_class_id,
    'syllabus', syllabus, 'assignments', assignments, 'cells', cells,
    'engine_breakdown', jsonb_build_object(
      'schema', 'v2',
      'note', 'Client maps syllabus+cells through engine v2 (computePeriod); RPC supplies inputs only.'
    )
  );
end;
$$;

comment on function public.student_class_average_explain(uuid) is
  'Own class average explain. Cells include statuses + raw_points/grade_status for engine v2.';
comment on function public.parent_class_average_explain(uuid, uuid) is
  'Parent/child class average explain. Cells include statuses + raw_points/grade_status for engine v2.';

revoke all on function public.syllabus_normalize_v2_fields(jsonb) from public, anon;
grant execute on function public.syllabus_normalize_v2_fields(jsonb) to authenticated;
