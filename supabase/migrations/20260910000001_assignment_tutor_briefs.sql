-- ASK A-Filing: publish-time student-safe tutor brief (pedagogy pack).
-- Confirm before inject. Teacher-only notes never in safe view / family SELECT.
-- Hermes owns SQL apply. Additive only. No live DB apply from this card.

-- ---------------------------------------------------------------------------
-- Table: full brief (teacher-readable). Safe slice via RPC only for family.
-- ---------------------------------------------------------------------------

create table if not exists public.assignment_tutor_briefs (
  assignment_id uuid primary key references public.assignments (id) on delete cascade,
  status text not null default 'draft',
  objectives jsonb not null default '[]'::jsonb,
  misconceptions jsonb not null default '[]'::jsonb,
  allowed_hint_depth text not null default 'next-step',
  vocabulary jsonb not null default '[]'::jsonb,
  teacher_notes text,
  -- US-T5: last confirmed safe slice kept live while a new Draft is edited.
  live_objectives jsonb,
  live_misconceptions jsonb,
  live_allowed_hint_depth text,
  live_vocabulary jsonb,
  material_fingerprint text,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  draft_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignment_tutor_briefs_status_check'
  ) then
    alter table public.assignment_tutor_briefs
      add constraint assignment_tutor_briefs_status_check
      check (status in ('draft', 'confirmed', 'stale'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'assignment_tutor_briefs_hint_depth_check'
  ) then
    alter table public.assignment_tutor_briefs
      add constraint assignment_tutor_briefs_hint_depth_check
      check (allowed_hint_depth in ('next-step', 'conceptual', 'scaffolding'));
  end if;
end $$;

comment on table public.assignment_tutor_briefs is
  'ASK A-Filing pedagogy pack. Confirm brief before Ask inject. teacher_notes never student/parent.';
comment on column public.assignment_tutor_briefs.teacher_notes is
  'Teacher-only internal notes. Never inject to Ask. Never in safe view / family SELECT.';
comment on column public.assignment_tutor_briefs.status is
  'draft | confirmed | stale. Only confirmed (or live snapshot during re-gen) injects.';

create index if not exists assignment_tutor_briefs_status_idx
  on public.assignment_tutor_briefs (status);

alter table public.assignment_tutor_briefs enable row level security;

drop policy if exists assignment_tutor_briefs_teacher on public.assignment_tutor_briefs;
create policy assignment_tutor_briefs_teacher on public.assignment_tutor_briefs
  for all using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.teaches_class(a.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.teaches_class(a.class_id)
    )
  );

-- Family / student: no direct table SELECT (teacher_notes live here).
revoke all on table public.assignment_tutor_briefs from public, anon;
grant select, insert, update, delete on table public.assignment_tutor_briefs to authenticated;

-- ---------------------------------------------------------------------------
-- Student-safe view projection (no teacher_notes). Underlying RLS = teachers only.
-- Family inject uses SECURITY DEFINER get_tutor_brief_safe — not this view alone.
-- ---------------------------------------------------------------------------

create or replace view public.assignment_tutor_briefs_safe
with (security_invoker = true)
as
select
  assignment_id,
  status,
  objectives,
  misconceptions,
  allowed_hint_depth,
  vocabulary,
  confirmed_at,
  updated_at
from public.assignment_tutor_briefs;

comment on view public.assignment_tutor_briefs_safe is
  'ASK student-safe tutor brief projection. No teacher_notes. Family uses get_tutor_brief_safe.';

revoke all on table public.assignment_tutor_briefs_safe from public, anon;
grant select on table public.assignment_tutor_briefs_safe to authenticated;

-- ---------------------------------------------------------------------------
-- Material fingerprint (title / category / unit / section / key stems — no answers)
-- ---------------------------------------------------------------------------

create or replace function public.assignment_tutor_brief_fingerprint(p_assignment_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.assignments;
  stems text;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    return null;
  end if;
  select string_agg(coalesce(elem->>'stem', ''), '|' order by (elem->>'n')::int nulls last)
    into stems
  from jsonb_array_elements(coalesce(a.key_items, '[]'::jsonb)) elem;
  return md5(
    concat_ws(
      E'\n',
      coalesce(a.title, ''),
      coalesce(a.category, ''),
      coalesce(a.unit, ''),
      coalesce(a.section, ''),
      coalesce(a.kind::text, ''),
      coalesce(a.deck_id, ''),
      coalesce(a.lesson_version, ''),
      coalesce(stems, '')
    )
  );
end;
$$;

revoke all on function public.assignment_tutor_brief_fingerprint(uuid) from public, anon;
grant execute on function public.assignment_tutor_brief_fingerprint(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Authz: may this caller receive a confirmed safe slice?
-- ---------------------------------------------------------------------------

create or replace function public.can_receive_tutor_brief(
  p_assignment_id uuid,
  p_student_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.assignments;
  sid uuid;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    return false;
  end if;

  if public.teaches_class(a.class_id) then
    return true;
  end if;

  sid := p_student_id;

  -- Student seat: bound student must match enrollment + submission cell.
  if public.my_student_id() is not null then
    if sid is not null and sid is distinct from public.my_student_id() then
      return false;
    end if;
    sid := public.my_student_id();
    return exists (
      select 1
      from public.submissions sub
      join public.enrollments e
        on e.student_id = sub.student_id and e.class_id = a.class_id
      where sub.assignment_id = a.id and sub.student_id = sid
    );
  end if;

  -- Parent seat: explicit child required (twins fail closed when omitted).
  if sid is null then
    return false;
  end if;
  if not public.parent_of(sid) then
    return false;
  end if;
  return exists (
    select 1
    from public.submissions sub
    join public.enrollments e
      on e.student_id = sub.student_id and e.class_id = a.class_id
    where sub.assignment_id = a.id and sub.student_id = sid
  );
end;
$$;

revoke all on function public.can_receive_tutor_brief(uuid, uuid) from public, anon;
grant execute on function public.can_receive_tutor_brief(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Safe slice for Ask inject. Confirmed, or live snapshot during re-gen draft.
-- Never teacher_notes / keys / explain_draft.
-- ---------------------------------------------------------------------------

create or replace function public.get_tutor_brief_safe(
  p_assignment_id uuid,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  brief public.assignment_tutor_briefs;
  a_title text;
  use_live boolean;
  objs jsonb;
  misc jsonb;
  depth text;
  vocab jsonb;
begin
  if p_assignment_id is null then
    return null;
  end if;
  if not public.can_receive_tutor_brief(p_assignment_id, p_student_id) then
    return null;
  end if;

  select * into brief
  from public.assignment_tutor_briefs
  where assignment_id = p_assignment_id;
  if not found then
    return null;
  end if;

  -- Stale always stops inject (ASK-P0-11).
  if brief.status = 'stale' then
    return null;
  end if;

  use_live := brief.status = 'draft' and brief.live_objectives is not null;
  if brief.status = 'confirmed' then
    objs := coalesce(brief.objectives, '[]'::jsonb);
    misc := coalesce(brief.misconceptions, '[]'::jsonb);
    depth := brief.allowed_hint_depth;
    vocab := coalesce(brief.vocabulary, '[]'::jsonb);
  elsif use_live then
    objs := coalesce(brief.live_objectives, '[]'::jsonb);
    misc := coalesce(brief.live_misconceptions, '[]'::jsonb);
    depth := coalesce(brief.live_allowed_hint_depth, 'next-step');
    vocab := coalesce(brief.live_vocabulary, '[]'::jsonb);
  else
    return null;
  end if;

  select title into a_title from public.assignments where id = p_assignment_id;

  return jsonb_build_object(
    'assignment_id', brief.assignment_id,
    'title', a_title,
    'status', 'confirmed',
    'objectives', objs,
    'misconceptions', misc,
    'allowed_hint_depth', depth,
    'vocabulary', vocab
  );
end;
$$;

comment on function public.get_tutor_brief_safe(uuid, uuid) is
  'ASK: confirmed student-safe tutor brief only. No teacher_notes. Fail closed.';

revoke all on function public.get_tutor_brief_safe(uuid, uuid) from public, anon;
grant execute on function public.get_tutor_brief_safe(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Teacher RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_tutor_brief_draft(
  p_assignment_id uuid,
  p_objectives jsonb,
  p_misconceptions jsonb,
  p_allowed_hint_depth text,
  p_vocabulary jsonb,
  p_teacher_notes text default null,
  p_as_new_draft boolean default true
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
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found';
  end if;
  if not public.teaches_class(a.class_id) then
    raise exception 'You can only edit a tutor brief for a class you teach.';
  end if;

  depth := coalesce(nullif(trim(p_allowed_hint_depth), ''), 'next-step');
  if depth not in ('next-step', 'conceptual', 'scaffolding') then
    raise exception 'Invalid hint depth';
  end if;

  insert into public.assignment_tutor_briefs as t (
    assignment_id,
    status,
    objectives,
    misconceptions,
    allowed_hint_depth,
    vocabulary,
    teacher_notes,
    material_fingerprint,
    draft_generated_at,
    updated_at
  ) values (
    p_assignment_id,
    'draft',
    coalesce(p_objectives, '[]'::jsonb),
    coalesce(p_misconceptions, '[]'::jsonb),
    depth,
    coalesce(p_vocabulary, '[]'::jsonb),
    nullif(p_teacher_notes, ''),
    public.assignment_tutor_brief_fingerprint(p_assignment_id),
    now(),
    now()
  )
  on conflict (assignment_id) do update set
    live_objectives = case
      when t.status = 'confirmed' then t.objectives
      else t.live_objectives
    end,
    live_misconceptions = case
      when t.status = 'confirmed' then t.misconceptions
      else t.live_misconceptions
    end,
    live_allowed_hint_depth = case
      when t.status = 'confirmed' then t.allowed_hint_depth
      else t.live_allowed_hint_depth
    end,
    live_vocabulary = case
      when t.status = 'confirmed' then t.vocabulary
      else t.live_vocabulary
    end,
    status = 'draft',
    objectives = excluded.objectives,
    misconceptions = excluded.misconceptions,
    allowed_hint_depth = excluded.allowed_hint_depth,
    vocabulary = excluded.vocabulary,
    teacher_notes = case
      when p_teacher_notes is null then t.teacher_notes
      else nullif(p_teacher_notes, '')
    end,
    material_fingerprint = excluded.material_fingerprint,
    draft_generated_at = case when p_as_new_draft then now() else coalesce(t.draft_generated_at, now()) end,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.upsert_tutor_brief_draft(uuid, jsonb, jsonb, text, jsonb, text, boolean)
  from public, anon;
grant execute on function public.upsert_tutor_brief_draft(uuid, jsonb, jsonb, text, jsonb, text, boolean)
  to authenticated;

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

  objs := coalesce(p_objectives, row.objectives, '[]'::jsonb);
  misc := coalesce(p_misconceptions, row.misconceptions, '[]'::jsonb);
  vocab := coalesce(p_vocabulary, row.vocabulary, '[]'::jsonb);
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

create or replace function public.clear_tutor_brief(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found';
  end if;
  if not public.teaches_class(a.class_id) then
    raise exception 'You can only clear a tutor brief for a class you teach.';
  end if;
  delete from public.assignment_tutor_briefs where assignment_id = p_assignment_id;
end;
$$;

revoke all on function public.clear_tutor_brief(uuid) from public, anon;
grant execute on function public.clear_tutor_brief(uuid) to authenticated;

create or replace function public.get_tutor_brief_teacher(p_assignment_id uuid)
returns public.assignment_tutor_briefs
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.assignments;
  row public.assignment_tutor_briefs;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    return null;
  end if;
  if not public.teaches_class(a.class_id) then
    raise exception 'You can only open a tutor brief for a class you teach.';
  end if;
  select * into row from public.assignment_tutor_briefs where assignment_id = p_assignment_id;
  if not found then
    return null;
  end if;
  return row;
end;
$$;

revoke all on function public.get_tutor_brief_teacher(uuid) from public, anon;
grant execute on function public.get_tutor_brief_teacher(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Stale on material edit (ASK-P0-11). Stops inject until re-confirm or clear.
-- ---------------------------------------------------------------------------

create or replace function public.assignment_tutor_brief_mark_stale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fp text;
  brief public.assignment_tutor_briefs;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if (
    new.title is not distinct from old.title
    and new.category is not distinct from old.category
    and new.unit is not distinct from old.unit
    and new.section is not distinct from old.section
    and new.kind is not distinct from old.kind
    and new.deck_id is not distinct from old.deck_id
    and new.lesson_version is not distinct from old.lesson_version
    and new.key_items is not distinct from old.key_items
  ) then
    return new;
  end if;

  select * into brief from public.assignment_tutor_briefs where assignment_id = new.id;
  if not found then
    return new;
  end if;

  fp := public.assignment_tutor_brief_fingerprint(new.id);
  if brief.status = 'confirmed' or brief.live_objectives is not null then
    update public.assignment_tutor_briefs
    set
      status = 'stale',
      live_objectives = null,
      live_misconceptions = null,
      live_allowed_hint_depth = null,
      live_vocabulary = null,
      material_fingerprint = fp,
      updated_at = now()
    where assignment_id = new.id;
  else
    update public.assignment_tutor_briefs
    set material_fingerprint = fp, updated_at = now()
    where assignment_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists assignment_tutor_brief_stale on public.assignments;
create trigger assignment_tutor_brief_stale
  after update on public.assignments
  for each row
  execute function public.assignment_tutor_brief_mark_stale();

-- ---------------------------------------------------------------------------
-- Ground picker titles (student / parent). Titles only — no pack body.
-- ---------------------------------------------------------------------------

create or replace function public.list_tutor_brief_ground_options(
  p_student_id uuid default null,
  p_class_id uuid default null
)
returns table (
  assignment_id uuid,
  title text,
  class_id uuid,
  class_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if public.my_student_id() is not null then
    sid := public.my_student_id();
  else
    sid := p_student_id;
    if sid is null or not public.parent_of(sid) then
      return;
    end if;
  end if;

  return query
  select
    a.id,
    a.title,
    a.class_id,
    c.name
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  join public.enrollments e
    on e.student_id = sub.student_id and e.class_id = a.class_id
  where sub.student_id = sid
    and (p_class_id is null or a.class_id = p_class_id)
  order by a.due_at nulls last, a.created_at desc;
end;
$$;

comment on function public.list_tutor_brief_ground_options(uuid, uuid) is
  'ASK ground picker: assignment titles for enrolled child/self. No pack body.';

revoke all on function public.list_tutor_brief_ground_options(uuid, uuid) from public, anon;
grant execute on function public.list_tutor_brief_ground_options(uuid, uuid) to authenticated;
