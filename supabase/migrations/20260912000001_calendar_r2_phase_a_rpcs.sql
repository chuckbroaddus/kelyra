-- CAL-R2 Phase A RPCs: list_calendars + list_calendar_items.
-- SECURITY DEFINER; search_path=public; auth.uid(); revoke anon; predicates inside.
-- Never teaches_class. Hidden dues: class_teacher_of only. p_seat occupancy-validated.
-- CoS / devops-release applies; do not apply from the build loop.

-- ---------------------------------------------------------------------------
-- Occupancy (CAL-S2-01): wrong seat → empty, never OR hats / is_staff
-- ---------------------------------------------------------------------------

create or replace function public.calendar_seat_occupied(p_seat text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_seat
    when 'teacher' then exists (
      select 1 from public.class_teachers ct where ct.teacher_id = auth.uid()
    )
    when 'parent' then exists (
      select 1
      from public.parent_students ps
      join public.profiles p on p.parent_id = ps.parent_id
      where p.id = auth.uid()
    )
    when 'student' then public.my_student_id() is not null
    when 'office' then public.is_school_admin()
    else false
  end;
$$;

revoke all on function public.calendar_seat_occupied(text) from public, anon;
grant execute on function public.calendar_seat_occupied(text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_calendars
-- ---------------------------------------------------------------------------

create or replace function public.list_calendars(
  p_seat text,
  p_child_student_id uuid default null
)
returns table (
  id uuid,
  kind text,
  name text,
  role_tint text,
  class_id uuid,
  default_enabled boolean,
  is_read_only boolean,
  can_unsubscribe boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  child uuid;
begin
  -- Prefs/cache are not consulted (CAL-S2-07).
  if me is null then
    return;
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent', 'office') then
    return;
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    return; -- wrong seat → empty (CAL-S2-01)
  end if;

  school := public.my_school_id();
  if school is null then
    return;
  end if;

  -- Parent twins: missing/invalid child → empty (CAL-S1-03 / S2-02)
  if p_seat = 'parent' then
    if public.my_parent_student_count() >= 2 then
      if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    elsif p_child_student_id is not null then
      if not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    else
      select ps.student_id into child
      from public.parent_students ps
      join public.profiles p on p.parent_id = ps.parent_id
      where p.id = me
      limit 1;
    end if;
  end if;

  -- Office: school-kind only. No class / class_work / personal / team (CAL-S2-02).
  if p_seat = 'office' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only, false
    from public.calendars c
    where c.school_id = school
      and c.kind = 'school'
      and c.provider = 'kelyra';
    return;
  end if;

  if p_seat = 'teacher' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only, false
    from public.calendars c
    where c.school_id = school
      and c.provider = 'kelyra'
      and (
        c.kind = 'school'
        or (
          c.kind in ('class', 'class_work')
          and c.class_id is not null
          and public.class_teacher_of(c.class_id)
        )
        or (c.kind = 'personal' and c.owner_profile_id = me)
      )
    order by
      case c.kind
        when 'school' then 0
        when 'class' then 1
        when 'class_work' then 2
        when 'personal' then 3
        else 9
      end,
      c.name;
    return;
  end if;

  if p_seat = 'student' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only, false
    from public.calendars c
    where c.school_id = school
      and c.provider = 'kelyra'
      and (
        c.kind = 'school'
        or (
          c.kind in ('class', 'class_work')
          and c.class_id is not null
          and exists (
            select 1 from public.enrollments e
            where e.class_id = c.class_id
              and e.student_id = public.my_student_id()
          )
        )
        or (c.kind = 'personal' and c.owner_profile_id = me)
      )
    order by c.kind, c.name;
    return;
  end if;

  -- parent
  if child is null then
    return;
  end if;

  return query
  select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only, false
  from public.calendars c
  where c.school_id = school
    and c.provider = 'kelyra'
    and (
      c.kind = 'school'
      or (
        c.kind in ('class', 'class_work')
        and c.class_id is not null
        and exists (
          select 1 from public.enrollments e
          where e.class_id = c.class_id
            and e.student_id = child
        )
      )
      or (c.kind = 'personal' and c.owner_profile_id = me)
    )
  order by c.kind, c.name;
end;
$$;

revoke all on function public.list_calendars(text, uuid) from public, anon;
grant execute on function public.list_calendars(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_calendar_items
-- ---------------------------------------------------------------------------

create or replace function public.list_calendar_items(
  p_from timestamptz,
  p_to timestamptz,
  p_seat text,
  p_class_id uuid default null,
  p_child_student_id uuid default null,
  p_categories text[] default null,
  p_calendar_ids uuid[] default null
)
returns table (
  source text,
  id uuid,
  calendar_id uuid,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean,
  category text,
  role_tint text,
  class_id uuid,
  student_id uuid,
  visibility text,
  is_hidden boolean,
  is_read_only boolean,
  is_draft boolean,
  deep_link text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  child uuid;
  lim int := 500;
  cats text[] := null;
begin
  -- Prefs/cache not consulted (CAL-S2-07).
  if me is null then
    return;
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    return;
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent', 'office') then
    return;
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    return; -- student JWT p_seat=teacher → empty (CAL-S2-01)
  end if;

  school := public.my_school_id();
  if school is null then
    return;
  end if;

  if p_categories is not null and cardinality(p_categories) > 0 then
    cats := p_categories;
  end if;

  -- Parent twins fail-closed (CAL-S1-03)
  if p_seat = 'parent' then
    if public.my_parent_student_count() >= 2 then
      if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    elsif p_child_student_id is not null then
      if not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    else
      select ps.student_id into child
      from public.parent_students ps
      join public.profiles p on p.parent_id = ps.parent_id
      where p.id = me
      limit 1;
      if child is null then
        return;
      end if;
    end if;
  end if;

  -- Authorized calendar id set (intersection filter, never elevation) CAL-S2-03
  -- Built per seat below via EXISTS against list_calendars predicates.

  -- ========== TEACHER ==========
  if p_seat = 'teacher' then
    -- Assignment projection: published + hidden of class_teacher_of only (CAL-S1-02).
    -- Never teaches_class (CAL-S1-01). Office hat not OR'd.
    return query
    (
      select
        'assignment'::text as source,
        a.id,
        cw.id as calendar_id,
        a.title,
        a.due_at as starts_at,
        a.due_at as ends_at,
        true as all_day,
        coalesce(nullif(trim(a.category), ''), 'homework') as category,
        'academic'::text as role_tint,
        a.class_id,
        null::uuid as student_id,
        a.calendar_visibility as visibility,
        (a.calendar_visibility = 'hidden') as is_hidden,
        true as is_read_only,
        false as is_draft,
        ('/class/' || a.class_id::text || '/assignment/' || a.id::text) as deep_link
      from public.assignments a
      join public.calendars cw
        on cw.class_id = a.class_id
       and cw.kind = 'class_work'
       and cw.provider = 'kelyra'
      where a.due_at is not null
        and a.due_at >= p_from
        and a.due_at <= p_to
        and a.calendar_visibility in ('hidden', 'published')
        and public.class_teacher_of(a.class_id)
        and (p_class_id is null or a.class_id = p_class_id)
        and (cats is null or coalesce(nullif(trim(a.category), ''), 'homework') = any (cats))
        and (
          p_calendar_ids is null
          or cardinality(p_calendar_ids) = 0
          or cw.id = any (p_calendar_ids)
        )
        -- Drop unknown calendar ids silently (intersection)

      union all

      select
        'event'::text,
        e.id,
        e.calendar_id,
        e.title,
        e.starts_at,
        coalesce(e.ends_at, e.starts_at),
        e.all_day,
        e.category,
        coalesce(cal.role_tint, 'school'),
        e.class_id,
        e.student_id,
        e.visibility_scope,
        false,
        e.is_read_only or cal.is_read_only,
        (e.status = 'draft'),
        ('/calendar?event=' || e.id::text)
      from public.calendar_events e
      join public.calendars cal on cal.id = e.calendar_id
      where e.deleted_at is null
        and e.school_id = school
        and e.starts_at >= p_from
        and e.starts_at <= p_to
        and (
          p_calendar_ids is null
          or cardinality(p_calendar_ids) = 0
          or e.calendar_id = any (p_calendar_ids)
        )
        and (cats is null or e.category = any (cats))
        and (
          -- draft: creator only (CAL-S1-09)
          (e.status = 'draft' and e.owner_profile_id = me)
          or (
            e.status = 'published'
            and (
              (e.visibility_scope = 'school')
              or (
                e.visibility_scope = 'class'
                and e.class_id is not null
                and public.class_teacher_of(e.class_id)
                and (p_class_id is null or e.class_id = p_class_id)
              )
              or (
                e.visibility_scope = 'self'
                and e.owner_profile_id = me
              )
              or (
                e.visibility_scope = 'student_teachers'
                and e.student_id is not null
                and exists (
                  select 1 from public.enrollments en
                  where en.student_id = e.student_id
                    and public.class_teacher_of(en.class_id)
                )
              )
            )
          )
        )
        -- Never return class_work calendar events (none should exist)
        and cal.kind is distinct from 'class_work'
    )
    order by starts_at asc, title asc
    limit lim;
    return;
  end if;

  -- ========== OFFICE ==========
  -- School-layer events only. Zero homework / hidden / absence / self (CAL-S1-01, S2-02).
  if p_seat = 'office' then
    return query
    select
      'event'::text,
      e.id,
      e.calendar_id,
      e.title,
      e.starts_at,
      coalesce(e.ends_at, e.starts_at),
      e.all_day,
      e.category,
      'school'::text,
      e.class_id,
      null::uuid,
      e.visibility_scope,
      false,
      e.is_read_only,
      (e.status = 'draft' and e.owner_profile_id = me),
      ('/calendar?event=' || e.id::text)
    from public.calendar_events e
    join public.calendars cal on cal.id = e.calendar_id and cal.kind = 'school'
    where e.deleted_at is null
      and e.school_id = school
      and e.starts_at >= p_from
      and e.starts_at <= p_to
      and e.visibility_scope = 'school'
      and (
        e.status = 'published'
        or (e.status = 'draft' and e.owner_profile_id = me)
      )
      and (
        p_calendar_ids is null
        or cardinality(p_calendar_ids) = 0
        or e.calendar_id = any (p_calendar_ids)
      )
      and (cats is null or e.category = any (cats))
    order by e.starts_at asc, e.title asc
    limit lim;
    return;
  end if;

  -- ========== STUDENT ==========
  -- Published enrolled dues only. Never hidden. Never scores (projection titles only).
  if p_seat = 'student' then
    return query
    (
      select
        'assignment'::text,
        a.id,
        cw.id,
        a.title,
        a.due_at,
        a.due_at,
        true,
        coalesce(nullif(trim(a.category), ''), 'homework'),
        'academic'::text,
        a.class_id,
        null::uuid,
        a.calendar_visibility,
        false, -- family never isHidden (CAL-S2-04); row absent if hidden
        true,
        false,
        ('/todo')
      from public.assignments a
      join public.calendars cw
        on cw.class_id = a.class_id and cw.kind = 'class_work' and cw.provider = 'kelyra'
      join public.enrollments en
        on en.class_id = a.class_id and en.student_id = public.my_student_id()
      where a.due_at is not null
        and a.due_at >= p_from
        and a.due_at <= p_to
        and a.calendar_visibility = 'published'
        and (cats is null or coalesce(nullif(trim(a.category), ''), 'homework') = any (cats))
        and (
          p_calendar_ids is null
          or cardinality(p_calendar_ids) = 0
          or cw.id = any (p_calendar_ids)
        )

      union all

      select
        'event'::text,
        e.id,
        e.calendar_id,
        e.title,
        e.starts_at,
        coalesce(e.ends_at, e.starts_at),
        e.all_day,
        e.category,
        coalesce(cal.role_tint, 'school'),
        e.class_id,
        e.student_id,
        e.visibility_scope,
        false,
        e.is_read_only or cal.is_read_only,
        false,
        ('/calendar?event=' || e.id::text)
      from public.calendar_events e
      join public.calendars cal on cal.id = e.calendar_id
      where e.deleted_at is null
        and e.school_id = school
        and e.starts_at >= p_from
        and e.starts_at <= p_to
        and e.status = 'published'
        and cal.kind is distinct from 'class_work'
        and (
          e.visibility_scope = 'school'
          or (
            e.visibility_scope = 'class'
            and e.class_id is not null
            and exists (
              select 1 from public.enrollments en2
              where en2.class_id = e.class_id
                and en2.student_id = public.my_student_id()
            )
          )
          or (
            e.visibility_scope = 'self'
            and e.owner_profile_id = me
          )
        )
        and (
          p_calendar_ids is null
          or cardinality(p_calendar_ids) = 0
          or e.calendar_id = any (p_calendar_ids)
        )
        and (cats is null or e.category = any (cats))
    )
    order by starts_at asc, title asc
    limit lim;
    return;
  end if;

  -- ========== PARENT ==========
  -- Published dues for focused child enrollments only. Never hidden titles.
  if p_seat = 'parent' then
    if child is null then
      return;
    end if;

    return query
    (
      select
        'assignment'::text,
        a.id,
        cw.id,
        a.title,
        a.due_at,
        a.due_at,
        true,
        coalesce(nullif(trim(a.category), ''), 'homework'),
        'academic'::text,
        a.class_id,
        null::uuid,
        a.calendar_visibility,
        false,
        true,
        false,
        ('/parent')
      from public.assignments a
      join public.calendars cw
        on cw.class_id = a.class_id and cw.kind = 'class_work' and cw.provider = 'kelyra'
      join public.enrollments en
        on en.class_id = a.class_id and en.student_id = child
      where a.due_at is not null
        and a.due_at >= p_from
        and a.due_at <= p_to
        and a.calendar_visibility = 'published'
        and (cats is null or coalesce(nullif(trim(a.category), ''), 'homework') = any (cats))
        and (
          p_calendar_ids is null
          or cardinality(p_calendar_ids) = 0
          or cw.id = any (p_calendar_ids)
        )

      union all

      select
        'event'::text,
        e.id,
        e.calendar_id,
        e.title,
        e.starts_at,
        coalesce(e.ends_at, e.starts_at),
        e.all_day,
        e.category,
        coalesce(cal.role_tint, 'school'),
        e.class_id,
        e.student_id,
        e.visibility_scope,
        false,
        e.is_read_only or cal.is_read_only,
        false,
        ('/calendar?event=' || e.id::text)
      from public.calendar_events e
      join public.calendars cal on cal.id = e.calendar_id
      where e.deleted_at is null
        and e.school_id = school
        and e.starts_at >= p_from
        and e.starts_at <= p_to
        and e.status = 'published'
        and cal.kind is distinct from 'class_work'
        and (
          e.visibility_scope = 'school'
          or (
            e.visibility_scope = 'class'
            and e.class_id is not null
            and exists (
              select 1 from public.enrollments en2
              where en2.class_id = e.class_id
                and en2.student_id = child
            )
          )
          -- Parent absence for this child (owner parents); student does not see in v1
          or (
            e.visibility_scope = 'student_teachers'
            and e.category = 'absence'
            and e.student_id = child
            and e.owner_profile_id = me
          )
        )
        and (
          p_calendar_ids is null
          or cardinality(p_calendar_ids) = 0
          or e.calendar_id = any (p_calendar_ids)
        )
        and (cats is null or e.category = any (cats))
    )
    order by starts_at asc, title asc
    limit lim;
    return;
  end if;

  return;
end;
$$;

revoke all on function public.list_calendar_items(timestamptz, timestamptz, text, uuid, uuid, text[], uuid[])
  from public, anon;
grant execute on function public.list_calendar_items(timestamptz, timestamptz, text, uuid, uuid, text[], uuid[])
  to authenticated;

comment on function public.list_calendars(text, uuid) is
  'CAL-R2 layers for declared chrome seat. Office=school only. Twins missing child → empty. Never teaches_class.';
comment on function public.list_calendar_items(timestamptz, timestamptz, text, uuid, uuid, text[], uuid[]) is
  'CAL-R2 items. Hidden dues class_teacher_of only. p_seat occupancy. Cap 500. No scores/drafts/classmates.';
