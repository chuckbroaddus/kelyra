-- GB-06 posting layer 2/3: posted_period_grades, term_grades, grade_overrides
-- RPC post_marking_period + override_posted_period_grade
-- Idempotent. Do not apply from the build card — DevOps applies.
-- RLS: teacher of class r/w; family read own student posted/term; office admin read school.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.posted_period_grades (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  marking_period_id uuid references public.marking_periods (id) on delete set null,
  marking_period_code text not null,
  pct numeric,
  letter text,
  syllabus_version text not null,
  source text not null default 'computed'
    check (source in ('computed', 'override')),
  stored_at timestamptz not null default now(),
  stored_by uuid references auth.users (id),
  unique (class_id, student_id, marking_period_code)
);

comment on table public.posted_period_grades is
  'GB-06 layer-2 frozen marking-period grades (report card).';

create index if not exists posted_period_grades_class_idx
  on public.posted_period_grades (class_id);
create index if not exists posted_period_grades_student_idx
  on public.posted_period_grades (student_id);

create table if not exists public.term_grades (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  course text not null,
  course_code text,
  credit_term text not null,
  pct numeric,
  letter text,
  credits_attempted numeric not null default 0,
  credits_earned numeric not null default 0,
  course_level text not null default 'regular',
  quality_points numeric,
  repeat boolean not null default false,
  flags text[] not null default '{}'::text[],
  exam_pct numeric,
  exam_exempt boolean not null default false,
  stored_at timestamptz not null default now(),
  stored_by uuid references auth.users (id),
  unique (class_id, student_id, credit_term)
);

comment on table public.term_grades is
  'GB-06 layer-3 credit-term / transcript rows.';

create index if not exists term_grades_class_idx on public.term_grades (class_id);
create index if not exists term_grades_student_idx on public.term_grades (student_id);

create table if not exists public.grade_overrides (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('posted_period', 'term')),
  target_id uuid not null,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  old_pct numeric,
  old_letter text,
  new_pct numeric,
  new_letter text,
  reason text not null check (length(trim(reason)) > 0),
  overridden_by uuid references auth.users (id),
  overridden_at timestamptz not null default now()
);

comment on table public.grade_overrides is
  'GB-06 audit trail for stored grade overrides (FR-POST-07).';

create index if not exists grade_overrides_target_idx
  on public.grade_overrides (target_kind, target_id);
create index if not exists grade_overrides_class_idx
  on public.grade_overrides (class_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (inline predicates)
-- class owner school via classes.teacher_id → profiles.school_id
-- ---------------------------------------------------------------------------

alter table public.posted_period_grades enable row level security;
alter table public.term_grades enable row level security;
alter table public.grade_overrides enable row level security;

-- posted_period_grades: teacher r/w own class
drop policy if exists posted_period_grades_teacher_all on public.posted_period_grades;
create policy posted_period_grades_teacher_all
  on public.posted_period_grades
  for all to authenticated
  using (public.class_teacher_of(class_id))
  with check (public.class_teacher_of(class_id));

-- family read own student's posted rows only
drop policy if exists posted_period_grades_family_select on public.posted_period_grades;
create policy posted_period_grades_family_select
  on public.posted_period_grades
  for select to authenticated
  using (
    public.parent_of(student_id)
    or student_id is not distinct from public.my_student_id()
  );

-- office admin read school
drop policy if exists posted_period_grades_office_select on public.posted_period_grades;
create policy posted_period_grades_office_select
  on public.posted_period_grades
  for select to authenticated
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and exists (
      select 1
      from public.classes c
      join public.profiles owner on owner.id = c.teacher_id
      where c.id = posted_period_grades.class_id
        and owner.school_id is not distinct from public.my_school_id()
    )
  );

-- term_grades: same pattern
drop policy if exists term_grades_teacher_all on public.term_grades;
create policy term_grades_teacher_all
  on public.term_grades
  for all to authenticated
  using (public.class_teacher_of(class_id))
  with check (public.class_teacher_of(class_id));

drop policy if exists term_grades_family_select on public.term_grades;
create policy term_grades_family_select
  on public.term_grades
  for select to authenticated
  using (
    public.parent_of(student_id)
    or student_id is not distinct from public.my_student_id()
  );

drop policy if exists term_grades_office_select on public.term_grades;
create policy term_grades_office_select
  on public.term_grades
  for select to authenticated
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and exists (
      select 1
      from public.classes c
      join public.profiles owner on owner.id = c.teacher_id
      where c.id = term_grades.class_id
        and owner.school_id is not distinct from public.my_school_id()
    )
  );

-- grade_overrides: teacher r/w; office read; family no (audit is staff)
drop policy if exists grade_overrides_teacher_all on public.grade_overrides;
create policy grade_overrides_teacher_all
  on public.grade_overrides
  for all to authenticated
  using (public.class_teacher_of(class_id))
  with check (public.class_teacher_of(class_id));

drop policy if exists grade_overrides_office_select on public.grade_overrides;
create policy grade_overrides_office_select
  on public.grade_overrides
  for select to authenticated
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and exists (
      select 1
      from public.classes c
      join public.profiles owner on owner.id = c.teacher_id
      where c.id = grade_overrides.class_id
        and owner.school_id is not distinct from public.my_school_id()
    )
  );

-- RPCs below

-- ---------------------------------------------------------------------------
-- post_marking_period: teacher-only; idempotent unless p_reason on repost
-- p_rows: [{ student_id, pct, letter?, syllabus_version }]
-- ---------------------------------------------------------------------------

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
    if v_student is null then
      continue;
    end if;
    v_pct := case
      when r ? 'pct' and (r->>'pct') is not null and (r->>'pct') <> ''
        then (r->>'pct')::numeric
      else null
    end;
    v_letter := nullif(r->>'letter', '');
    v_syl := coalesce(nullif(r->>'syllabus_version', ''), '1');

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
      set
        pct = v_pct,
        letter = v_letter,
        syllabus_version = v_syl,
        source = 'override',
        marking_period_id = p_marking_period_id,
        stored_at = now(),
        stored_by = auth.uid()
      where id = v_existing.id;

      v_overridden := v_overridden + 1;
    else
      insert into public.posted_period_grades (
        class_id, student_id, marking_period_id, marking_period_code,
        pct, letter, syllabus_version, source, stored_at, stored_by
      ) values (
        p_class_id, v_student, p_marking_period_id, v_code,
        v_pct, v_letter, v_syl, 'computed', now(), auth.uid()
      );
      v_posted := v_posted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'marking_period_code', v_code,
    'posted', v_posted,
    'skipped', v_skipped,
    'overridden', v_overridden
  );
end;
$$;

comment on function public.post_marking_period(uuid, uuid, jsonb, text) is
  'GB-06 freeze layer-2 period grades. Idempotent per (class, student, period) unless p_reason set for repost.';

revoke all on function public.post_marking_period(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.post_marking_period(uuid, uuid, jsonb, text) to authenticated;

-- override single posted row
create or replace function public.override_posted_period_grade(
  p_posted_id uuid,
  p_pct numeric,
  p_letter text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.posted_period_grades%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_audit_id uuid;
begin
  if v_reason is null then
    raise exception 'override reason is required';
  end if;

  select * into v_row from public.posted_period_grades where id = p_posted_id;
  if not found then
    raise exception 'posted grade not found';
  end if;
  if not public.class_teacher_of(v_row.class_id) then
    raise exception 'not teacher of class';
  end if;

  insert into public.grade_overrides (
    target_kind, target_id, class_id, student_id,
    old_pct, old_letter, new_pct, new_letter,
    reason, overridden_by, overridden_at
  ) values (
    'posted_period', v_row.id, v_row.class_id, v_row.student_id,
    v_row.pct, v_row.letter, p_pct, p_letter,
    v_reason, auth.uid(), now()
  )
  returning id into v_audit_id;

  update public.posted_period_grades
  set
    pct = p_pct,
    letter = p_letter,
    source = 'override',
    stored_at = now(),
    stored_by = auth.uid()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'row', to_jsonb(v_row),
    'audit', jsonb_build_object(
      'id', v_audit_id,
      'target_kind', 'posted_period',
      'target_id', v_row.id,
      'class_id', v_row.class_id,
      'student_id', v_row.student_id,
      'old_pct', null,
      'reason', v_reason,
      'by', auth.uid(),
      'at', now()
    )
  );
end;
$$;

comment on function public.override_posted_period_grade(uuid, numeric, text, text) is
  'GB-06 audited override of a posted period grade; reason required.';

revoke all on function public.override_posted_period_grade(uuid, numeric, text, text) from public, anon;
grant execute on function public.override_posted_period_grade(uuid, numeric, text, text) to authenticated;
