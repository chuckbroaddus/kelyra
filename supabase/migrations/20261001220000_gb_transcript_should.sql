-- GB-17 transcript Should: conduct, flags, transfer-in, eligibility
-- Idempotent. Additive only. Do not apply from the build card — DevOps applies.

-- posted_period_grades: conduct + absences + flags + transfer source
alter table public.posted_period_grades
  add column if not exists conduct text;
alter table public.posted_period_grades
  add column if not exists absences numeric;
alter table public.posted_period_grades
  add column if not exists flags text[] not null default '{}'::text[];

alter table public.posted_period_grades drop constraint if exists posted_period_grades_source_check;
alter table public.posted_period_grades
  add constraint posted_period_grades_source_check
  check (source in ('computed', 'override', 'transfer'));

comment on column public.posted_period_grades.conduct is
  'GB-17 FR-POST-01 / FR-SYL-17 non-GPA conduct mark at store.';
comment on column public.posted_period_grades.flags is
  'GB-17 row flags e.g. transfer.';

-- class_syllabi: optional conduct scale (default off / null)
alter table public.class_syllabi
  add column if not exists conduct_scale_id text;
comment on column public.class_syllabi.conduct_scale_id is
  'GB-17 FR-SYL-17 optional conduct scale id (E/S/N/U default). Null = off.';

-- eligibility_snapshots (FR-POST-06)
create table if not exists public.eligibility_snapshots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  marking_period_code text not null,
  ineligible boolean not null default false,
  failing_class_ids uuid[] not null default '{}'::uuid[],
  stored_at timestamptz not null default now(),
  stored_by uuid references auth.users (id),
  unique (school_id, student_id, marking_period_code)
);

comment on table public.eligibility_snapshots is
  'GB-17 FR-POST-06 eligibility snapshot (not transcript). Derived at period store.';

create index if not exists eligibility_snapshots_school_idx
  on public.eligibility_snapshots (school_id);
create index if not exists eligibility_snapshots_student_idx
  on public.eligibility_snapshots (student_id);

alter table public.eligibility_snapshots enable row level security;

drop policy if exists eligibility_snapshots_teacher_select on public.eligibility_snapshots;
create policy eligibility_snapshots_teacher_select
  on public.eligibility_snapshots
  for select to authenticated
  using (
    public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
  );

drop policy if exists eligibility_snapshots_office_all on public.eligibility_snapshots;
create policy eligibility_snapshots_office_all
  on public.eligibility_snapshots
  for all to authenticated
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
  )
  with check (
    public.is_school_admin()
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
  );

-- post_marking_period: accept conduct / absences / flags
create or replace function public.post_marking_period(
  p_class_id uuid,
  p_marking_period_id uuid,
  p_rows jsonb default '[]'::jsonb,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_posted int := 0;
  v_skipped int := 0;
  v_overridden int := 0;
  r jsonb;
  v_student uuid;
  v_pct numeric;
  v_letter text;
  v_syl text;
  v_conduct text;
  v_absences numeric;
  v_flags text[];
  v_existing public.posted_period_grades%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if p_class_id is null or p_marking_period_id is null then
    raise exception 'class_id and marking_period_id required';
  end if;
  if not public.class_teacher_of(p_class_id) then
    raise exception 'not teacher of class';
  end if;

  select mp.code into v_code
  from public.marking_periods mp
  where mp.id = p_marking_period_id;
  if v_code is null then
    raise exception 'marking period not found';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a json array';
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    v_student := nullif(r->>'student_id', '')::uuid;
    if v_student is null then continue; end if;
    v_pct := case
      when r ? 'pct' and (r->>'pct') is not null and (r->>'pct') <> ''
        then (r->>'pct')::numeric else null end;
    v_letter := nullif(r->>'letter', '');
    v_syl := coalesce(nullif(r->>'syllabus_version', ''), '1');
    v_conduct := nullif(r->>'conduct', '');
    v_absences := case
      when r ? 'absences' and (r->>'absences') is not null and (r->>'absences') <> ''
        then (r->>'absences')::numeric else null end;
    if r ? 'flags' and jsonb_typeof(r->'flags') = 'array' then
      select coalesce(array_agg(x), '{}'::text[]) into v_flags
      from jsonb_array_elements_text(r->'flags') as t(x);
    else
      v_flags := '{}'::text[];
    end if;

    select * into v_existing
    from public.posted_period_grades ppg
    where ppg.class_id = p_class_id
      and ppg.student_id = v_student
      and ppg.marking_period_code = v_code;

    if found then
      if v_reason is null then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into public.grade_overrides (
        target_kind, target_id, class_id, student_id,
        old_pct, old_letter, new_pct, new_letter,
        reason, overridden_by, overridden_at
      ) values (
        'posted_period', v_existing.id, p_class_id, v_student,
        v_existing.pct, v_existing.letter, v_pct, v_letter,
        v_reason, auth.uid(), now()
      );
      update public.posted_period_grades
      set pct = v_pct, letter = v_letter, conduct = v_conduct, absences = v_absences,
          flags = v_flags, syllabus_version = v_syl, source = 'override',
          marking_period_id = p_marking_period_id, stored_at = now(), stored_by = auth.uid()
      where id = v_existing.id;
      v_overridden := v_overridden + 1;
    else
      insert into public.posted_period_grades (
        class_id, student_id, marking_period_id, marking_period_code,
        pct, letter, conduct, absences, flags,
        syllabus_version, source, stored_at, stored_by
      ) values (
        p_class_id, v_student, p_marking_period_id, v_code,
        v_pct, v_letter, v_conduct, v_absences, v_flags,
        v_syl, 'computed', now(), auth.uid()
      );
      v_posted := v_posted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true, 'marking_period_code', v_code,
    'posted', v_posted, 'skipped', v_skipped, 'overridden', v_overridden
  );
end;
$$;

comment on function public.post_marking_period(uuid, uuid, jsonb, text) is
  'GB-06/17 freeze layer-2 period grades incl. conduct/absences/flags.';

create or replace function public.transfer_in_grade(
  p_kind text,
  p_class_id uuid,
  p_student_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := coalesce(nullif(trim(coalesce(p_payload->>'reason', '')), ''), 'transfer-in');
  v_pct numeric;
  v_letter text;
  v_code text;
  v_row_id uuid;
  v_audit_id uuid;
  v_flags text[] := array['transfer'];
begin
  if p_kind is null or p_kind not in ('period', 'term') then
    raise exception 'kind must be period or term';
  end if;
  if p_class_id is null or p_student_id is null then
    raise exception 'class_id and student_id required';
  end if;
  if not (
    public.class_teacher_of(p_class_id)
    or (
      public.is_school_admin()
      and public.my_school_id() is not null
      and exists (
        select 1 from public.classes c
        join public.profiles owner on owner.id = c.teacher_id
        where c.id = p_class_id
          and owner.school_id is not distinct from public.my_school_id()
      )
    )
  ) then
    raise exception 'not authorized for transfer-in';
  end if;

  v_pct := case
    when p_payload ? 'pct' and (p_payload->>'pct') is not null and (p_payload->>'pct') <> ''
      then (p_payload->>'pct')::numeric else null end;
  v_letter := nullif(p_payload->>'letter', '');

  if p_kind = 'period' then
    v_code := nullif(p_payload->>'marking_period_code', '');
    if v_code is null then raise exception 'marking_period_code required'; end if;

    insert into public.posted_period_grades (
      class_id, student_id, marking_period_id, marking_period_code,
      pct, letter, conduct, absences, flags,
      syllabus_version, source, stored_at, stored_by
    ) values (
      p_class_id, p_student_id,
      nullif(p_payload->>'marking_period_id', '')::uuid,
      v_code, v_pct, v_letter,
      nullif(p_payload->>'conduct', ''),
      case when p_payload ? 'absences' and (p_payload->>'absences') <> ''
        then (p_payload->>'absences')::numeric else null end,
      v_flags,
      coalesce(nullif(p_payload->>'syllabus_version', ''), 'transfer'),
      'transfer', now(), auth.uid()
    )
    on conflict (class_id, student_id, marking_period_code) do update set
      pct = excluded.pct, letter = excluded.letter, conduct = excluded.conduct,
      absences = excluded.absences, flags = excluded.flags, source = 'transfer',
      syllabus_version = excluded.syllabus_version, stored_at = now(), stored_by = auth.uid()
    returning id into v_row_id;

    insert into public.grade_overrides (
      target_kind, target_id, class_id, student_id,
      old_pct, old_letter, new_pct, new_letter,
      reason, overridden_by, overridden_at
    ) values (
      'posted_period', v_row_id, p_class_id, p_student_id,
      null, null, v_pct, v_letter, v_reason, auth.uid(), now()
    ) returning id into v_audit_id;
  else
    v_code := nullif(p_payload->>'credit_term', '');
    if v_code is null then raise exception 'credit_term required'; end if;

    insert into public.term_grades (
      class_id, student_id, course, course_code, credit_term,
      pct, letter, credits_attempted, credits_earned, course_level,
      quality_points, repeat, flags, exam_pct, exam_exempt,
      stored_at, stored_by
    ) values (
      p_class_id, p_student_id,
      coalesce(nullif(p_payload->>'course', ''), 'Transfer course'),
      nullif(p_payload->>'course_code', ''),
      v_code, v_pct, v_letter,
      coalesce((p_payload->>'credits_attempted')::numeric, 0.5),
      coalesce((p_payload->>'credits_earned')::numeric, 0),
      coalesce(nullif(p_payload->>'course_level', ''), 'regular'),
      nullif(p_payload->>'quality_points', '')::numeric,
      false, v_flags, null, false, now(), auth.uid()
    )
    on conflict (class_id, student_id, credit_term) do update set
      course = excluded.course, course_code = excluded.course_code,
      pct = excluded.pct, letter = excluded.letter,
      credits_attempted = excluded.credits_attempted,
      credits_earned = excluded.credits_earned,
      course_level = excluded.course_level, flags = excluded.flags,
      stored_at = now(), stored_by = auth.uid()
    returning id into v_row_id;

    insert into public.grade_overrides (
      target_kind, target_id, class_id, student_id,
      old_pct, old_letter, new_pct, new_letter,
      reason, overridden_by, overridden_at
    ) values (
      'term', v_row_id, p_class_id, p_student_id,
      null, null, v_pct, v_letter, v_reason, auth.uid(), now()
    ) returning id into v_audit_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'kind', p_kind, 'row_id', v_row_id, 'audit_id', v_audit_id
  );
end;
$$;

comment on function public.transfer_in_grade(text, uuid, uuid, jsonb) is
  'GB-17 FR-CR-07 transfer-in period or term grade with audit.';
revoke all on function public.transfer_in_grade(text, uuid, uuid, jsonb) from public, anon;
grant execute on function public.transfer_in_grade(text, uuid, uuid, jsonb) to authenticated;

create or replace function public.set_term_grade_flags(
  p_term_id uuid,
  p_flags text[],
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.term_grades%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_audit_id uuid;
  v_flags text[];
  v_repeat boolean;
begin
  if v_reason is null then
    raise exception 'override reason is required';
  end if;
  select * into v_row from public.term_grades where id = p_term_id;
  if not found then
    raise exception 'term grade not found';
  end if;
  if not (public.class_teacher_of(v_row.class_id) or public.is_school_admin()) then
    raise exception 'not authorized';
  end if;

  select coalesce(array_agg(distinct f), '{}'::text[])
    into v_flags
  from unnest(coalesce(p_flags, '{}'::text[])) as f
  where f in ('transfer', 'cbe', 'pf', 'credit_denied', 'repeat');

  v_flags := v_flags || array(
    select x from unnest(coalesce(v_row.flags, '{}'::text[])) as x
    where x not in ('transfer', 'cbe', 'pf', 'credit_denied', 'repeat')
  );

  v_repeat := 'repeat' = any (v_flags);

  insert into public.grade_overrides (
    target_kind, target_id, class_id, student_id,
    old_pct, old_letter, new_pct, new_letter,
    reason, overridden_by, overridden_at
  ) values (
    'term', v_row.id, v_row.class_id, v_row.student_id,
    v_row.pct, v_row.letter, v_row.pct, v_row.letter,
    v_reason, auth.uid(), now()
  ) returning id into v_audit_id;

  update public.term_grades
  set flags = v_flags, repeat = v_repeat, stored_at = now(), stored_by = auth.uid()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object('row', to_jsonb(v_row), 'audit_id', v_audit_id);
end;
$$;

comment on function public.set_term_grade_flags(uuid, text[], text) is
  'GB-17 admin edit of transcript row flags; reason required.';
revoke all on function public.set_term_grade_flags(uuid, text[], text) from public, anon;
grant execute on function public.set_term_grade_flags(uuid, text[], text) to authenticated;

-- Optional audit columns for flag edits (pure client may still keep flags in reason only)
alter table public.grade_overrides
  add column if not exists old_flags text[];
alter table public.grade_overrides
  add column if not exists new_flags text[];

-- FR-POST-06: upsert eligibility snapshots for a school/period (staff derived)
create or replace function public.store_eligibility_snapshots(
  p_school_id uuid,
  p_marking_period_code text,
  p_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_student uuid;
  v_ineligible boolean;
  v_failing uuid[];
  v_n int := 0;
begin
  if p_school_id is null or nullif(p_marking_period_code, '') is null then
    raise exception 'school_id and marking_period_code required';
  end if;
  if not (
    public.is_school_admin()
    and public.my_school_id() is not null
    and p_school_id is not distinct from public.my_school_id()
  ) and not exists (
    select 1 from public.classes c
    where c.teacher_id = auth.uid()
  ) then
    raise exception 'not authorized for eligibility store';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a json array';
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    v_student := nullif(r->>'student_id', '')::uuid;
    if v_student is null then continue; end if;
    v_ineligible := coalesce((r->>'ineligible')::boolean, false);
    if r ? 'failing_class_ids' and jsonb_typeof(r->'failing_class_ids') = 'array' then
      select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_failing
      from jsonb_array_elements_text(r->'failing_class_ids') as t(x)
      where nullif(x, '') is not null;
    else
      v_failing := '{}'::uuid[];
    end if;

    insert into public.eligibility_snapshots (
      school_id, student_id, marking_period_code, ineligible, failing_class_ids, stored_at, stored_by
    ) values (
      p_school_id, v_student, p_marking_period_code, v_ineligible, v_failing, now(), auth.uid()
    )
    on conflict (school_id, student_id, marking_period_code) do update set
      ineligible = excluded.ineligible,
      failing_class_ids = excluded.failing_class_ids,
      stored_at = now(),
      stored_by = auth.uid();
    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'stored', v_n, 'marking_period_code', p_marking_period_code);
end;
$$;

comment on function public.store_eligibility_snapshots(uuid, text, jsonb) is
  'GB-17 FR-POST-06 store derived eligibility snapshots (never AI-edited).';
revoke all on function public.store_eligibility_snapshots(uuid, text, jsonb) from public, anon;
grant execute on function public.store_eligibility_snapshots(uuid, text, jsonb) to authenticated;
