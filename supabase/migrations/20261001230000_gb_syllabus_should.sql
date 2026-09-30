-- GB-18 Syllabus Should: school syllabus templates + locked-field save rejection.
-- Idempotent / additive. Do not edit older migrations.

-- 1) Named school syllabus templates (FR-TPL-02)
create table if not exists public.school_syllabus_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, key)
);

-- System seeds use school_id null; one row per key.
create unique index if not exists school_syllabus_templates_system_key_uidx
  on public.school_syllabus_templates (key)
  where school_id is null;

alter table public.school_syllabus_templates enable row level security;

drop policy if exists school_syllabus_templates_read on public.school_syllabus_templates;
create policy school_syllabus_templates_read
  on public.school_syllabus_templates
  for select
  using (
    published = true
    and (
      school_id is null
      or (
        public.my_school_id() is not null
        and school_id is not distinct from public.my_school_id()
      )
    )
  );

drop policy if exists school_syllabus_templates_admin_write on public.school_syllabus_templates;
create policy school_syllabus_templates_admin_write
  on public.school_syllabus_templates
  for all
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
    and is_system = false
  )
  with check (
    public.is_school_admin()
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
    and is_system = false
  );

drop trigger if exists trg_school_syllabus_templates_updated on public.school_syllabus_templates;
create trigger trg_school_syllabus_templates_updated
  before update on public.school_syllabus_templates
  for each row execute function public.gb_set_updated_at();

comment on table public.school_syllabus_templates is
  'GB-18 school syllabus templates (FR-TPL-02). System seeds + per-school publishes.';

-- Seed FR-TPL-02 examples (system, school_id null)
insert into public.school_syllabus_templates (school_id, key, name, description, payload, is_system, published)
values
  (
    null,
    'spring_isd_50_50',
    'Spring ISD style 50/50 major-daily',
    'Major grades 50%, daily 50%, equal-percent inside, no late decay by default.',
    '{"engine":"weighted_percent_inside","within_category":"percent_inside","categories":[{"key":"major","label":"Major","weight_percent":50},{"key":"daily","label":"Daily","weight_percent":50}],"late_rule":{"type":"none"},"missing_rule":"zero","floor":null,"book_mode":"reset_each_marking_period","extra_credit_method":"B","retake":null,"scale_hint":"texas_no_d","notes":"Common Spring ISD secondary split."}'::jsonb,
    true,
    true
  ),
  (
    null,
    'homework_cap_10',
    'Homework ≤10%',
    'Tests 60 / quizzes 30 / homework 10 with drop-1 on homework.',
    '{"engine":"weighted_percent_inside","within_category":"percent_inside","categories":[{"key":"tests","label":"Tests","weight_percent":60},{"key":"quizzes","label":"Quizzes","weight_percent":30},{"key":"homework","label":"Homework","weight_percent":10,"drop_lowest_n":1,"max_weight_hint":10}],"late_rule":{"type":"per_day","amount":10,"unit":"percent"},"missing_rule":"omit","floor":null,"book_mode":"reset_each_marking_period","extra_credit_method":"B","retake":null,"scale_hint":"us_10","notes":"Homework weight capped at 10%."}'::jsonb,
    true,
    true
  ),
  (
    null,
    'texas_70_retake_cap',
    'Texas 70-pass + retake cap 70',
    'Texas secondary defaults with retake scores capped at 70.',
    '{"engine":"weighted_percent_inside","within_category":"percent_inside","categories":[{"key":"tests","label":"Tests","weight_percent":50},{"key":"daily","label":"Daily","weight_percent":50}],"late_rule":{"type":"none"},"missing_rule":"zero","floor":50,"book_mode":"reset_each_marking_period","extra_credit_method":"B","retake":{"enabled":true,"cap_pct":70,"method":"cap_at_N"},"scale_hint":"texas_no_d","notes":"Texas template default retake cap is 70 (FR-SYL-12)."}'::jsonb,
    true,
    true
  )
on conflict (key) where school_id is null do nothing;

-- 2) Server-side lock enforcement (FR-SYL-18 / §11.9)
-- Reject teacher writes that change school-locked syllabus fields.
create or replace function public.gb_class_school_id(p_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.school_id
  from public.classes c
  join public.profiles p on p.id = c.teacher_id
  where c.id = p_class_id
  limit 1;
$$;

create or replace function public.gb_latest_school_locks(p_school_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(gp.payload->'locks') = 'object' then gp.payload->'locks'
        else '{}'::jsonb
      end
      from public.grading_policies gp
      where gp.school_id = p_school_id
        and gp.status = 'published'
      order by gp.version desc
      limit 1
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.gb_latest_school_lock_reasons(p_school_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(gp.payload->'lock_reasons') = 'object' then gp.payload->'lock_reasons'
        else '{}'::jsonb
      end
      from public.grading_policies gp
      where gp.school_id = p_school_id
        and gp.status = 'published'
      order by gp.version desc
      limit 1
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.gb_json_eq(a jsonb, b jsonb)
returns boolean
language sql
immutable
as $$
  select a is not distinct from b;
$$;

-- Raises when payload tries to change a locked field vs existing row.
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
begin
  sid := public.gb_class_school_id(p_class_id);
  if sid is null then
    return;
  end if;
  locks := public.gb_latest_school_locks(sid);
  reasons := public.gb_latest_school_lock_reasons(sid);
  v2 := public.syllabus_normalize_v2_fields(coalesce(p_payload, '{}'::jsonb));

  if p_existing is null then
    return; -- first write: nothing to diverge from yet
  end if;

  if coalesce((locks->>'engine')::boolean, false)
     and not public.gb_json_eq(v2->'engine', to_jsonb(p_existing.engine))
  then
    reason := coalesce(nullif(reasons->>'engine', ''), 'School grading policy locks the calculation engine.');
    raise exception 'Locked field "engine" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'late')::boolean, false)
     and not public.gb_json_eq(
       coalesce(v2->'late_rule', '{"type":"none"}'::jsonb),
       coalesce(p_existing.late_rule, '{"type":"none"}'::jsonb)
     )
  then
    reason := coalesce(nullif(reasons->>'late', ''), 'Late penalty rule is set by the school grading policy.');
    raise exception 'Locked field "late" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'floor')::boolean, false)
     and (
       (v2->'floor' = 'null'::jsonb and p_existing.floor is not null)
       or (v2->'floor' is distinct from 'null'::jsonb
           and p_existing.floor is distinct from (v2->>'floor')::numeric)
     )
  then
    reason := coalesce(nullif(reasons->>'floor', ''), 'Period floor is set by the school grading policy.');
    raise exception 'Locked field "floor" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'book_mode')::boolean, false)
     and not public.gb_json_eq(v2->'book_mode', to_jsonb(p_existing.book_mode))
  then
    reason := coalesce(nullif(reasons->>'book_mode', ''), 'Book reset mode is set by the school calendar policy.');
    raise exception 'Locked field "book_mode" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'rollup')::boolean, false)
     and (
       not public.gb_json_eq(v2->'rollup_preset', to_jsonb(p_existing.rollup_preset))
       or (v2->'exam_weight' = 'null'::jsonb and p_existing.exam_weight is not null)
       or (v2->'exam_weight' is distinct from 'null'::jsonb
           and p_existing.exam_weight is distinct from (v2->>'exam_weight')::numeric)
     )
  then
    reason := coalesce(nullif(reasons->>'rollup', ''), 'Term rollup / exam weight is set by the school calendar.');
    raise exception 'Locked field "rollup" cannot be edited by the teacher. %', reason;
  end if;

  if coalesce((locks->>'categories')::boolean, false)
     and coalesce(p_payload, '{}'::jsonb) ? 'categories'
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
    from jsonb_array_elements(coalesce(p_payload->'categories', '[]'::jsonb)) e
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
  'GB-18: reject teacher edits to school-locked syllabus fields (server-side).';

-- 3) Hook assert into save + publish (recreate with lock guard at top).
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
