-- AVG v1: class syllabus gradebook (categories + weights + policies).
-- Gate: CEO AVG-GATE t_eea9ba55 (2026-09-02).
-- Privilege wall: class_teacher_of (class_teachers row only — NOT is_school_admin).
-- Family never SELECTs class_syllabi / syllabus_categories (ask_draft leak).
-- Does not touch publish_lesson_pack. Does not invent students or grades.

-- ---------------------------------------------------------------------------
-- Prefer _unref_delete_asset so logos / still-referenced faces/keys cannot be force-deleted.
-- Extend ref checks to class_syllabi.source_asset_id (belt-and-suspenders after nulling).
-- ---------------------------------------------------------------------------

create or replace function public._unref_delete_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  path text;
  thumb text;
  bucket text;
  kind public.asset_kind;
begin
  if p_asset_id is null then
    return;
  end if;
  if exists (select 1 from public.captures where photo_asset_id = p_asset_id or audio_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.students where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.parents where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.teachers where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.roster_imports where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.schools where logo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.assignments where key_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.class_syllabi where source_asset_id = p_asset_id) then
    return;
  end if;

  select storage_path, thumb_storage_path, assets.kind into path, thumb, kind
  from public.assets
  where id = p_asset_id;
  if path is null then
    return;
  end if;

  bucket := case when kind = 'photo' then 'photos' else 'audio' end;
  delete from storage.objects where bucket_id = bucket and name = path;
  if thumb is not null then
    delete from storage.objects where bucket_id = bucket and name = thumb;
  end if;
  if kind = 'photo' then
    delete from storage.objects
    where bucket_id = bucket
      and name = public.photo_thumb_path(path);
  end if;
  delete from public.assets where id = p_asset_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: taught-class seat only (co-teachers with a class_teachers row OK)
-- ---------------------------------------------------------------------------

create or replace function public.class_teacher_of(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_class_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.class_teachers ct
      where ct.class_id = p_class_id
        and ct.teacher_id = auth.uid()
    );
$$;

comment on function public.class_teacher_of(uuid) is
  'True iff auth.uid() has a class_teachers row. Unlike teaches_class, office/is_school_admin does not pass.';

revoke all on function public.class_teacher_of(uuid) from public, anon;
grant execute on function public.class_teacher_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.class_syllabi (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  title text,
  calc_mode text not null default 'category_weight'
    check (calc_mode = 'category_weight'),
  term_structure text not null default 'year'
    check (term_structure in ('quarters', 'semesters', 'year', 'custom')),
  active_term text,
  grading_scale jsonb,
  policies jsonb not null default '{}'::jsonb,
  terms jsonb not null default '[]'::jsonb,
  source text not null default 'manual'
    check (source in ('manual', 'ask_import', 'copied')),
  source_asset_id uuid references public.assets (id) on delete set null,
  ask_draft jsonb,
  publish_to_family boolean not null default true,
  published_at timestamptz,
  row_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.class_syllabi is
  'One syllabus per class. Teacher CRUD via class_teacher_of. Family uses RPCs only.';
comment on column public.class_syllabi.ask_draft is
  'Teacher-only Ask/photo draft. Never family-visible.';
comment on column public.class_syllabi.publish_to_family is
  'Denormalized from policies for RLS/RPC predicates without jsonb ops.';
comment on column public.class_syllabi.source_asset_id is
  'Syllabus photo. Teacher-only. Delete on discard/confirm by default.';

create table if not exists public.syllabus_categories (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.class_syllabi (id) on delete cascade,
  key text not null,
  label text not null,
  weight_percent numeric(6,3) not null,
  sort_order int not null default 0,
  active boolean not null default true,
  "group" text check ("group" is null or "group" in ('formative', 'summative')),
  default_include_in_average boolean not null default false,
  min_grades_per_term int,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (syllabus_id, key),
  constraint syllabus_categories_key_check check (key ~ '^[a-z][a-z0-9_]{0,31}$'),
  constraint syllabus_categories_weight_check check (weight_percent >= 0 and weight_percent <= 100)
);

comment on table public.syllabus_categories is
  'Category weights toward the final. include default seeds columns; never quiz→true shortcut.';

create index if not exists syllabus_categories_syllabus_sort_idx
  on public.syllabus_categories (syllabus_id, sort_order);

alter table public.assignments
  add column if not exists is_makeup boolean not null default false;

comment on column public.assignments.is_makeup is
  'Makeup replace vehicle for syllabus rules. Engine ignores when rule disabled. No title-regex.';

-- ---------------------------------------------------------------------------
-- RLS — teacher of class only; no family/office table SELECT
-- ---------------------------------------------------------------------------

alter table public.class_syllabi enable row level security;
alter table public.syllabus_categories enable row level security;

drop policy if exists class_syllabi_teacher_all on public.class_syllabi;
create policy class_syllabi_teacher_all on public.class_syllabi
  for all
  using (public.class_teacher_of(class_id))
  with check (public.class_teacher_of(class_id));

drop policy if exists syllabus_categories_teacher_all on public.syllabus_categories;
create policy syllabus_categories_teacher_all on public.syllabus_categories
  for all
  using (
    exists (
      select 1
      from public.class_syllabi s
      where s.id = syllabus_id
        and public.class_teacher_of(s.class_id)
    )
  )
  with check (
    exists (
      select 1
      from public.class_syllabi s
      where s.id = syllabus_id
        and public.class_teacher_of(s.class_id)
    )
  );

revoke all on table public.class_syllabi from public, anon;
revoke all on table public.syllabus_categories from public, anon;
grant select, insert, update, delete on table public.class_syllabi to authenticated;
grant select, insert, update, delete on table public.syllabus_categories to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.syllabus_normalize_policies(p jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  src jsonb := coalesce(p, '{}'::jsonb);
  out jsonb;
begin
  out := jsonb_build_object(
    'extra_credit_allowed', coalesce((src->>'extra_credit_allowed')::boolean, false),
    'late_penalty_mode', case
      when src->>'late_penalty_mode' in ('none', 'manual') then src->>'late_penalty_mode'
      else 'manual'
    end,
    'makeup_window_days', case
      when src ? 'makeup_window_days' and src->>'makeup_window_days' is not null
        and src->>'makeup_window_days' <> ''
        then (src->>'makeup_window_days')::int
      else null
    end,
    'redo_max_percent', case
      when src ? 'redo_max_percent' and src->>'redo_max_percent' is not null
        and src->>'redo_max_percent' <> ''
        then (src->>'redo_max_percent')::numeric
      else null
    end,
    'min_floor_percent', case
      when src ? 'min_floor_percent' and src->>'min_floor_percent' is not null
        and src->>'min_floor_percent' <> ''
        then (src->>'min_floor_percent')::numeric
      else null
    end,
    'rounding', case
      when src->>'rounding' in ('nearest_whole', 'none') then src->>'rounding'
      else 'nearest_whole'
    end,
    'missing_as_zero', coalesce((src->>'missing_as_zero')::boolean, false),
    'publish_to_family', coalesce((src->>'publish_to_family')::boolean, true)
  );
  return out;
end;
$$;

create or replace function public.syllabus_policies_public(p jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'extra_credit_allowed', coalesce((p->>'extra_credit_allowed')::boolean, false),
    'late_penalty_mode', coalesce(p->>'late_penalty_mode', 'manual'),
    'makeup_window_days', p->'makeup_window_days',
    'redo_max_percent', p->'redo_max_percent',
    'min_floor_percent', p->'min_floor_percent',
    'rounding', coalesce(p->>'rounding', 'nearest_whole'),
    'missing_as_zero', coalesce((p->>'missing_as_zero')::boolean, false)
  );
$$;

create or replace function public.syllabus_validate_category_key(p_key text)
returns text
language plpgsql
immutable
as $$
begin
  if p_key is null or p_key !~ '^[a-z][a-z0-9_]{0,31}$' then
    raise exception 'invalid category key';
  end if;
  return p_key;
end;
$$;

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
begin
  delete from public.syllabus_categories where syllabus_id = p_syllabus_id;
  if p_categories is null or jsonb_typeof(p_categories) <> 'array' then
    return;
  end if;
  for item in select * from jsonb_array_elements(p_categories)
  loop
    v_key := public.syllabus_validate_category_key(lower(trim(coalesce(item->>'key', ''))));
    v_label := trim(coalesce(item->>'label', ''));
    if v_label = '' then
      raise exception 'category label required';
    end if;
    v_weight := coalesce((item->>'weight_percent')::numeric, 0);
    if v_weight < 0 or v_weight > 100 then
      raise exception 'category weight out of range';
    end if;
    v_active := coalesce((item->>'active')::boolean, true);
    v_group := nullif(item->>'group', '');
    if v_group is not null and v_group not in ('formative', 'summative') then
      v_group := null;
    end if;
    -- Never quiz/test → include shortcut. Default false unless teacher sets true.
    v_default_include := coalesce((item->>'default_include_in_average')::boolean, false);
    v_min := case
      when item ? 'min_grades_per_term' and item->>'min_grades_per_term' is not null
        and item->>'min_grades_per_term' <> ''
        then (item->>'min_grades_per_term')::int
      else null
    end;
    v_rules := coalesce(item->'rules', '{}'::jsonb);
    v_sort := coalesce((item->>'sort_order')::int, i);
    insert into public.syllabus_categories (
      syllabus_id, key, label, weight_percent, sort_order, active,
      "group", default_include_in_average, min_grades_per_term, rules
    ) values (
      p_syllabus_id, v_key, v_label, v_weight, v_sort, v_active,
      v_group, v_default_include, v_min, v_rules
    );
    i := i + 1;
  end loop;
end;
$$;

create or replace function public.syllabus_active_weight_sum(p_syllabus_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(weight_percent), 0)
  from public.syllabus_categories
  where syllabus_id = p_syllabus_id
    and active;
$$;

create or replace function public.family_may_read_class(p_class_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_class_id is not null
    and p_student_id is not null
    and exists (
      select 1 from public.enrollments e
      where e.class_id = p_class_id and e.student_id = p_student_id
    )
    and (
      p_student_id = public.my_student_id()
      or exists (
        select 1
        from public.parents p
        join public.parent_students ps on ps.parent_id = p.id
        where p.id = (
          select pr.parent_id from public.profiles pr where pr.id = auth.uid()
        )
          and ps.student_id = p_student_id
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Teacher RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_syllabus_ask_draft(
  p_class_id uuid,
  p_draft jsonb,
  p_source_asset_id uuid default null
)
returns public.class_syllabi
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.class_syllabi;
  draft jsonb := coalesce(p_draft, '{}'::jsonb);
  prev_asset uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not allowed';
  end if;
  if coalesce((draft->>'schema_version')::int, 0) <> 1 then
    raise exception 'unsupported ask_draft schema_version';
  end if;
  -- Reject client-supplied asset ids the caller does not own.
  if p_source_asset_id is not null and not exists (
    select 1 from public.assets a
    where a.id = p_source_asset_id
      and a.teacher_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  select s.source_asset_id into prev_asset
  from public.class_syllabi s
  where s.class_id = p_class_id;

  insert into public.class_syllabi as s (
    class_id, status, source, ask_draft, source_asset_id, updated_at
  ) values (
    p_class_id, 'draft', 'ask_import', draft, p_source_asset_id, now()
  )
  on conflict (class_id) do update
    set ask_draft = excluded.ask_draft,
        source = 'ask_import',
        source_asset_id = coalesce(excluded.source_asset_id, s.source_asset_id),
        updated_at = now()
  returning * into row;

  -- Drop prior owned draft photo when replaced by a new one.
  if prev_asset is not null
     and p_source_asset_id is not null
     and prev_asset is distinct from p_source_asset_id
     and exists (
       select 1 from public.assets a
       where a.id = prev_asset and a.teacher_id = auth.uid()
     ) then
    perform public._unref_delete_asset(prev_asset);
  end if;

  perform public.write_audit(
    'upsert_syllabus_ask_draft',
    'class_syllabus',
    row.id::text,
    null,
    p_class_id,
    null,
    jsonb_build_object('has_draft', true)
  );
  return row;
end;
$$;

create or replace function public.discard_syllabus_ask_draft(p_class_id uuid)
returns public.class_syllabi
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.class_syllabi;
  old_asset uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not allowed';
  end if;

  select * into row from public.class_syllabi where class_id = p_class_id;
  if not found then
    raise exception 'syllabus not found';
  end if;
  -- Only the syllabus row's own source_asset_id may be deleted — never a client-supplied id.
  old_asset := row.source_asset_id;

  update public.class_syllabi
    set ask_draft = null,
        source_asset_id = null,
        updated_at = now()
  where id = row.id
  returning * into row;

  if old_asset is not null
     and exists (
       select 1 from public.assets a
       where a.id = old_asset and a.teacher_id = auth.uid()
     ) then
    perform public._unref_delete_asset(old_asset);
  end if;

  perform public.write_audit(
    'discard_syllabus_ask_draft',
    'class_syllabus',
    row.id::text,
    null,
    p_class_id,
    null,
    jsonb_build_object('cleared', true)
  );
  return row;
end;
$$;

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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not allowed';
  end if;

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

  insert into public.class_syllabi as s (
    class_id, status, title, calc_mode, term_structure, active_term,
    policies, terms, publish_to_family, source, updated_at
  ) values (
    p_class_id,
    'draft',
    title,
    'category_weight',
    term_structure,
    active_term,
    policies,
    terms,
    coalesce((policies->>'publish_to_family')::boolean, true),
    coalesce(nullif(payload->>'source', ''), 'manual'),
    now()
  )
  on conflict (class_id) do update
    set title = excluded.title,
        term_structure = excluded.term_structure,
        active_term = excluded.active_term,
        policies = excluded.policies,
        terms = excluded.terms,
        publish_to_family = excluded.publish_to_family,
        -- Always draft. Incomplete weights must never stay family-visible.
        -- Live weight edits go only through publish_class_syllabus (sum + lock).
        status = 'draft',
        published_at = null,
        source = coalesce(nullif(payload->>'source', ''), s.source),
        updated_at = now()
  returning * into row;

  perform public.syllabus_replace_categories(row.id, categories);

  perform public.write_audit(
    'save_class_syllabus_draft',
    'class_syllabus',
    row.id::text,
    null,
    p_class_id,
    null,
    jsonb_build_object('status', row.status)
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not allowed';
  end if;

  select * into row from public.class_syllabi where class_id = p_class_id for update;
  if found and row.row_version is distinct from p_row_version then
    raise exception 'syllabus version conflict';
  end if;

  -- Only the syllabus row's own source may be deleted — never a client-supplied id.
  old_asset := case when found then row.source_asset_id else null end;

  -- Rubric drafts never become weights.
  if payload ? 'rubric_draft' then
    payload := payload - 'rubric_draft';
  end if;
  -- Ignore any client-supplied delete id (attack surface).
  if payload ? 'source_asset_id_to_delete' then
    payload := payload - 'source_asset_id_to_delete';
  end if;

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

  if not found then
    insert into public.class_syllabi (
      class_id, status, title, calc_mode, term_structure, active_term,
      policies, terms, publish_to_family, source, published_at, row_version, updated_at
    ) values (
      p_class_id, 'published', title, 'category_weight', term_structure, active_term,
      policies, terms, coalesce((policies->>'publish_to_family')::boolean, true),
      coalesce(nullif(payload->>'source', ''), 'manual'),
      now(), 1, now()
    )
    returning * into row;
  else
    update public.class_syllabi
      set title = title,
          term_structure = term_structure,
          active_term = active_term,
          policies = policies,
          terms = terms,
          publish_to_family = coalesce((policies->>'publish_to_family')::boolean, true),
          status = 'published',
          published_at = now(),
          ask_draft = null,
          source_asset_id = null,
          source = coalesce(nullif(payload->>'source', ''), source),
          row_version = row.row_version + 1,
          updated_at = now()
    where id = row.id
    returning * into row;
  end if;

  perform public.syllabus_replace_categories(row.id, categories);

  select count(*)::int, coalesce(sum(weight_percent), 0)
    into active_count, weight_sum
  from public.syllabus_categories
  where syllabus_id = row.id and active;

  if active_count < 1 then
    raise exception 'at least one active category required';
  end if;
  if abs(weight_sum - 100) > 0.01 then
    raise exception 'active weights must sum to 100';
  end if;

  -- Confirm default: drop this syllabus's own source bytes after structured policy is saved.
  -- Never delete a client-supplied asset id.
  if old_asset is not null
     and exists (
       select 1 from public.assets a
       where a.id = old_asset and a.teacher_id = auth.uid()
     ) then
    perform public._unref_delete_asset(old_asset);
  end if;

  perform public.write_audit(
    'publish_class_syllabus',
    'class_syllabus',
    row.id::text,
    null,
    p_class_id,
    null,
    jsonb_build_object(
      'status', 'published',
      'publish_to_family', row.publish_to_family,
      'weight_sum', weight_sum,
      'row_version', row.row_version
    )
  );
  return row;
end;
$$;

create or replace function public.unpublish_class_syllabus(
  p_class_id uuid,
  p_row_version int
)
returns public.class_syllabi
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.class_syllabi;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not allowed';
  end if;

  select * into row from public.class_syllabi where class_id = p_class_id for update;
  if not found then
    raise exception 'syllabus not found';
  end if;
  if row.row_version is distinct from p_row_version then
    raise exception 'syllabus version conflict';
  end if;

  update public.class_syllabi
    set status = 'draft',
        published_at = null,
        row_version = row.row_version + 1,
        updated_at = now()
  where id = row.id
  returning * into row;

  perform public.write_audit(
    'unpublish_class_syllabus',
    'class_syllabus',
    row.id::text,
    null,
    p_class_id,
    null,
    jsonb_build_object('status', 'draft', 'row_version', row.row_version)
  );
  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Family / student read RPCs (no base-table SELECT; strip drafts)
-- ---------------------------------------------------------------------------

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
    -- Parent: any linked child enrolled in the class.
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
      'key', c.key,
      'label', c.label,
      'weight_percent', c.weight_percent,
      'sort_order', c.sort_order,
      'rules', c.rules
    ) order by c.sort_order, c.label
  ), '[]'::jsonb)
  into cats
  from public.syllabus_categories c
  where c.syllabus_id = row.id and c.active;

  return jsonb_build_object(
    'ok', true,
    'published', true,
    'title', row.title,
    'calc_mode', row.calc_mode,
    'term_structure', row.term_structure,
    'active_term', row.active_term,
    'categories', cats,
    'policies_public', public.syllabus_policies_public(row.policies)
  );
end;
$$;

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
      'id', a.id,
      'title', a.title,
      'category', a.category,
      'term', a.term,
      'include_in_average', a.include_in_average,
      'due_at', a.due_at,
      'is_makeup', a.is_makeup,
      'score_scheme', a.score_scheme,
      'max_score', a.max_score,
      'weight_percent', a.weight_percent,
      'weight_band', a.weight_band
    ) order by a.created_at, a.title
  ), '[]'::jsonb)
  into assignments
  from public.assignments a
  where a.class_id = p_class_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assignment_id', sub.assignment_id,
      'approved_score', sub.approved_score,
      'score_mark', sub.score_mark,
      'status', sub.status,
      'approved_at', sub.approved_at
    )
  ), '[]'::jsonb)
  into cells
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.class_id = p_class_id
    and sub.student_id = sid
    and sub.approved_at is not null;

  return jsonb_build_object(
    'ok', true,
    'student_id', sid,
    'class_id', p_class_id,
    'syllabus', syllabus,
    'assignments', assignments,
    'cells', cells
  );
end;
$$;

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
  -- Parent path must not use student session id; require parent_students link.
  if public.my_student_id() is not null and public.my_student_id() is distinct from p_student_id then
    return jsonb_build_object('ok', false, 'reason', 'not_linked');
  end if;
  if public.my_student_id() is null then
    if not exists (
      select 1
      from public.profiles pr
      join public.parent_students ps on ps.parent_id = pr.parent_id
      where pr.id = auth.uid()
        and pr.parent_id is not null
        and ps.student_id = p_student_id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'not_linked');
    end if;
  end if;

  -- Recompute syllabus visibility for this child enrollment (not sibling blend).
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = p_student_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  end if;

  select case
    when s.status = 'published' and s.publish_to_family then
      jsonb_build_object(
        'ok', true,
        'published', true,
        'title', s.title,
        'calc_mode', s.calc_mode,
        'term_structure', s.term_structure,
        'active_term', s.active_term,
        'categories', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'key', c.key,
              'label', c.label,
              'weight_percent', c.weight_percent,
              'sort_order', c.sort_order,
              'rules', c.rules
            ) order by c.sort_order, c.label
          ), '[]'::jsonb)
          from public.syllabus_categories c
          where c.syllabus_id = s.id and c.active
        ),
        'policies_public', public.syllabus_policies_public(s.policies)
      )
    else jsonb_build_object('ok', true, 'published', false)
  end
  into syllabus
  from public.class_syllabi s
  where s.class_id = p_class_id;

  if syllabus is null then
    syllabus := jsonb_build_object('ok', true, 'published', false);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'category', a.category,
      'term', a.term,
      'include_in_average', a.include_in_average,
      'due_at', a.due_at,
      'is_makeup', a.is_makeup,
      'score_scheme', a.score_scheme,
      'max_score', a.max_score,
      'weight_percent', a.weight_percent,
      'weight_band', a.weight_band
    ) order by a.created_at, a.title
  ), '[]'::jsonb)
  into assignments
  from public.assignments a
  where a.class_id = p_class_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assignment_id', sub.assignment_id,
      'approved_score', sub.approved_score,
      'score_mark', sub.score_mark,
      'status', sub.status,
      'approved_at', sub.approved_at
    )
  ), '[]'::jsonb)
  into cells
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.class_id = p_class_id
    and sub.student_id = p_student_id
    and sub.approved_at is not null;

  return jsonb_build_object(
    'ok', true,
    'student_id', p_student_id,
    'class_id', p_class_id,
    'syllabus', syllabus,
    'assignments', assignments,
    'cells', cells
  );
end;
$$;

-- Teacher read helper (full row via table SELECT is fine; this is for clients that prefer RPC)
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
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not allowed';
  end if;

  select * into row from public.class_syllabi where class_id = p_class_id;
  if not found then
    return jsonb_build_object('ok', true, 'exists', false);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'key', c.key,
      'label', c.label,
      'weight_percent', c.weight_percent,
      'sort_order', c.sort_order,
      'active', c.active,
      'group', c."group",
      'default_include_in_average', c.default_include_in_average,
      'min_grades_per_term', c.min_grades_per_term,
      'rules', c.rules
    ) order by c.sort_order, c.label
  ), '[]'::jsonb)
  into cats
  from public.syllabus_categories c
  where c.syllabus_id = row.id;

  return jsonb_build_object(
    'ok', true,
    'exists', true,
    'syllabus', jsonb_build_object(
      'id', row.id,
      'class_id', row.class_id,
      'status', row.status,
      'title', row.title,
      'calc_mode', row.calc_mode,
      'term_structure', row.term_structure,
      'active_term', row.active_term,
      'grading_scale', row.grading_scale,
      'policies', row.policies,
      'terms', row.terms,
      'source', row.source,
      'source_asset_id', row.source_asset_id,
      'ask_draft', row.ask_draft,
      'publish_to_family', row.publish_to_family,
      'published_at', row.published_at,
      'row_version', row.row_version,
      'updated_at', row.updated_at
    ),
    'categories', cats
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.upsert_syllabus_ask_draft(uuid, jsonb, uuid) from public, anon;
revoke all on function public.discard_syllabus_ask_draft(uuid) from public, anon;
revoke all on function public.save_class_syllabus_draft(uuid, jsonb) from public, anon;
revoke all on function public.publish_class_syllabus(uuid, jsonb, int) from public, anon;
revoke all on function public.unpublish_class_syllabus(uuid, int) from public, anon;
revoke all on function public.published_class_syllabus(uuid) from public, anon;
revoke all on function public.student_class_average_explain(uuid) from public, anon;
revoke all on function public.parent_class_average_explain(uuid, uuid) from public, anon;
revoke all on function public.get_class_syllabus(uuid) from public, anon;
revoke all on function public.family_may_read_class(uuid, uuid) from public, anon;
revoke all on function public.syllabus_replace_categories(uuid, jsonb) from public, anon;
revoke all on function public.syllabus_normalize_policies(jsonb) from public, anon;
revoke all on function public.syllabus_policies_public(jsonb) from public, anon;
revoke all on function public.syllabus_validate_category_key(text) from public, anon;
revoke all on function public.syllabus_active_weight_sum(uuid) from public, anon;

grant execute on function public.upsert_syllabus_ask_draft(uuid, jsonb, uuid) to authenticated;
grant execute on function public.discard_syllabus_ask_draft(uuid) to authenticated;
grant execute on function public.save_class_syllabus_draft(uuid, jsonb) to authenticated;
grant execute on function public.publish_class_syllabus(uuid, jsonb, int) to authenticated;
grant execute on function public.unpublish_class_syllabus(uuid, int) to authenticated;
grant execute on function public.published_class_syllabus(uuid) to authenticated;
grant execute on function public.student_class_average_explain(uuid) to authenticated;
grant execute on function public.parent_class_average_explain(uuid, uuid) to authenticated;
grant execute on function public.get_class_syllabus(uuid) to authenticated;

-- Parent Home: enrolled classes for one linked child (no sibling blend).
create or replace function public.parent_child_classes(p_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;
  if not exists (
    select 1
    from public.profiles pr
    join public.parent_students ps on ps.parent_id = pr.parent_id
    where pr.id = auth.uid()
      and pr.parent_id is not null
      and ps.student_id = p_student_id
  ) then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('class_id', c.id, 'class_name', c.name)
        order by c.name
      )
      from public.enrollments e
      join public.classes c on c.id = e.class_id
      where e.student_id = p_student_id
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.parent_child_classes(uuid) from public, anon;
grant execute on function public.parent_child_classes(uuid) to authenticated;
