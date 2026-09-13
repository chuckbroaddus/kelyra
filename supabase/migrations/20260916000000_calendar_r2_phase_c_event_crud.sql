-- CAL-R2 Phase C: calendar_events CRUD (school / class / personal / absence).
-- Hat walls: office school; teacher class + personal; student personal; parent
-- absence for focused child + personal. Never teaches_class / is_staff.
-- Absence audience = owner parents of C + teachers of C's enrollments.
-- Student does NOT see own absence (list student branch unchanged).
-- Teacher cannot edit/delete office school events.
-- Parent edits/deletes own absence only. Unlink deletes absence rows (S1-05).
-- Named file only — do not apply live from the build loop.

-- ---------------------------------------------------------------------------
-- Consistency: absence notes live on personal calendar (not a subscribed layer)
-- ---------------------------------------------------------------------------

create or replace function public.calendar_events_calendar_id_consistent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cal public.calendars;
begin
  select * into cal from public.calendars where id = new.calendar_id;
  if not found then
    raise exception 'calendar_id not found';
  end if;
  if cal.school_id is distinct from new.school_id then
    raise exception 'calendar_id school mismatch';
  end if;
  if cal.kind = 'class_work' then
    raise exception 'class_work layers have no calendar_events';
  end if;
  if cal.kind = 'school' and new.visibility_scope is distinct from 'school' then
    raise exception 'school calendar requires visibility_scope=school';
  end if;
  if cal.kind = 'class' then
    if new.class_id is distinct from cal.class_id then
      raise exception 'class calendar_id class mismatch';
    end if;
  end if;
  if cal.kind = 'personal' then
    if new.owner_profile_id is distinct from cal.owner_profile_id then
      raise exception 'personal calendar owner mismatch';
    end if;
    -- Absence is items on personal/child with category=absence (A1).
    if new.category = 'absence' then
      if new.visibility_scope is distinct from 'student_teachers' then
        raise exception 'absence requires visibility_scope=student_teachers';
      end if;
      if new.student_id is null then
        raise exception 'absence requires student_id';
      end if;
    elsif new.visibility_scope is distinct from 'self' then
      raise exception 'personal calendar requires visibility_scope=self';
    end if;
  end if;
  if cal.kind = 'team' and new.team_id is distinct from cal.team_id then
    raise exception 'team calendar_id team mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_events_calendar_id_consistent on public.calendar_events;
create trigger calendar_events_calendar_id_consistent
  before insert or update of calendar_id, school_id, class_id, team_id,
    owner_profile_id, visibility_scope, category, student_id
  on public.calendar_events
  for each row execute function public.calendar_events_calendar_id_consistent();

-- ---------------------------------------------------------------------------
-- Honest "who can see this" (CAL-23)
-- ---------------------------------------------------------------------------

create or replace function public.calendar_visibility_caption(
  p_scope text,
  p_category text
)
returns text
language sql
immutable
as $$
  select case
    when p_category = 'absence' or p_scope = 'student_teachers' then
      'You and this child''s teachers. Not the school, not other children, not the student.'
    when p_scope = 'school' then
      'Everyone at the school can see this.'
    when p_scope = 'class' then
      'Students and parents in this class, plus teachers of this class.'
    when p_scope = 'self' then
      'Only you can see this.'
    when p_scope = 'team' then
      'Members of this team can see this.'
    else
      'Visibility follows your seat.'
  end;
$$;

revoke all on function public.calendar_visibility_caption(text, text) from public, anon;
grant execute on function public.calendar_visibility_caption(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Write permission (owner / office-school / class_teacher_of). Never is_staff.
-- ---------------------------------------------------------------------------

create or replace function public.calendar_event_write_allowed(
  p_seat text,
  p_event public.calendar_events
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or p_event.id is null then
    return false;
  end if;
  if p_event.deleted_at is not null then
    return false;
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    return false;
  end if;

  -- Office: school events only
  if p_seat = 'office' then
    return p_event.visibility_scope = 'school'
      and public.is_school_admin();
  end if;

  -- Teacher: own class events they still teach; own personal. Never school.
  if p_seat = 'teacher' then
    if p_event.visibility_scope = 'school' then
      return false; -- Managed by office
    end if;
    if p_event.visibility_scope = 'class' then
      return p_event.owner_profile_id = me
        and p_event.class_id is not null
        and public.class_teacher_of(p_event.class_id);
    end if;
    if p_event.visibility_scope = 'self' then
      return p_event.owner_profile_id = me;
    end if;
    return false; -- parent absence: view only
  end if;

  -- Student: own personal only
  if p_seat = 'student' then
    return p_event.visibility_scope = 'self'
      and p_event.owner_profile_id = me;
  end if;

  -- Parent: own absence for a linked child; own personal
  if p_seat = 'parent' then
    if p_event.category = 'absence'
      and p_event.visibility_scope = 'student_teachers' then
      return p_event.owner_profile_id = me
        and p_event.student_id is not null
        and public.i_parent_of(p_event.student_id);
    end if;
    if p_event.visibility_scope = 'self' then
      return p_event.owner_profile_id = me;
    end if;
    return false;
  end if;

  return false;
end;
$$;

revoke all on function public.calendar_event_write_allowed(text, public.calendar_events)
  from public, anon;
grant execute on function public.calendar_event_write_allowed(text, public.calendar_events)
  to authenticated;

-- ---------------------------------------------------------------------------
-- create_calendar_event
-- ---------------------------------------------------------------------------

create or replace function public.create_calendar_event(
  p_seat text,
  p_kind text,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_all_day boolean default true,
  p_category text default null,
  p_body text default null,
  p_class_id uuid default null,
  p_child_student_id uuid default null
)
returns public.calendar_events
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  kind text := lower(trim(p_kind));
  cat text := lower(trim(coalesce(p_category, '')));
  title text := trim(p_title);
  cal_id uuid;
  rec public.calendar_events;
  vis text;
  sid uuid := null;
  cid uuid := null;
begin
  if me is null then
    raise exception 'Sign in to save';
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent', 'office') then
    raise exception 'Unknown calendar seat';
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    raise exception 'This seat cannot create calendar events';
  end if;
  if title is null or title = '' then
    raise exception 'Title is required';
  end if;
  if p_starts_at is null then
    raise exception 'Start is required';
  end if;
  if kind is null or kind not in ('school', 'class', 'personal', 'absence') then
    raise exception 'Unknown event kind';
  end if;

  school := public.my_school_id();
  if school is null then
    raise exception 'No school on this profile';
  end if;

  -- Hat × kind matrix. Never is_staff / teaches_class.
  if kind = 'school' then
    if p_seat is distinct from 'office' or not public.is_school_admin() then
      raise exception 'Only office can create school events';
    end if;
    cat := 'school';
    vis := 'school';
    cal_id := public.provision_school_calendar(school);
  elsif kind = 'class' then
    if p_seat is distinct from 'teacher' then
      raise exception 'Only teachers can create class events';
    end if;
    if p_class_id is null or not public.class_teacher_of(p_class_id) then
      raise exception 'Class event must bind a class you teach';
    end if;
    if cat not in ('class', 'lesson') then
      cat := 'class';
    end if;
    vis := 'class';
    cid := p_class_id;
    perform public.provision_class_calendars(p_class_id);
    select c.id into cal_id
    from public.calendars c
    where c.class_id = p_class_id and c.kind = 'class' and c.provider = 'kelyra'
    limit 1;
  elsif kind = 'personal' then
    if p_seat not in ('teacher', 'student', 'parent') then
      raise exception 'Office cannot create personal events';
    end if;
    if cat not in ('personal', 'study') then
      cat := case when p_seat = 'student' then 'study' else 'personal' end;
    end if;
    vis := 'self';
    cal_id := public.provision_personal_calendar(me);
  elsif kind = 'absence' then
    if p_seat is distinct from 'parent' then
      raise exception 'Only a parent can create an absence';
    end if;
    if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
      raise exception 'Pick a linked child before adding an absence';
    end if;
    -- Twin wall: focused child only. Never other sibling.
    cat := 'absence';
    vis := 'student_teachers';
    sid := p_child_student_id;
    cal_id := public.provision_personal_calendar(me);
  end if;

  if cal_id is null then
    raise exception 'Could not resolve calendar layer';
  end if;

  insert into public.calendar_events (
    school_id,
    calendar_id,
    class_id,
    student_id,
    owner_profile_id,
    seat,
    category,
    title,
    body,
    starts_at,
    ends_at,
    all_day,
    visibility_scope,
    status,
    source
  ) values (
    school,
    cal_id,
    cid,
    sid,
    me,
    p_seat,
    cat,
    title,
    nullif(trim(p_body), ''),
    p_starts_at,
    p_ends_at,
    coalesce(p_all_day, true),
    vis,
    'published',
    'manual'
  )
  returning * into rec;

  return rec;
end;
$$;

revoke all on function public.create_calendar_event(
  text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid
) from public, anon;
grant execute on function public.create_calendar_event(
  text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_calendar_event
-- ---------------------------------------------------------------------------

create or replace function public.update_calendar_event(
  p_seat text,
  p_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_all_day boolean default true,
  p_category text default null,
  p_body text default null
)
returns public.calendar_events
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  rec public.calendar_events;
  cat text;
begin
  if me is null then
    raise exception 'Sign in to save';
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    raise exception 'This seat cannot edit calendar events';
  end if;

  select * into rec
  from public.calendar_events e
  where e.id = p_id
    and e.deleted_at is null
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if rec.visibility_scope = 'school' and p_seat is distinct from 'office' then
    raise exception 'Managed by office';
  end if;

  if not public.calendar_event_write_allowed(p_seat, rec) then
    raise exception 'You cannot edit this event';
  end if;

  if trim(p_title) = '' or p_title is null then
    raise exception 'Title is required';
  end if;
  if p_starts_at is null then
    raise exception 'Start is required';
  end if;

  cat := lower(trim(coalesce(p_category, rec.category)));
  -- Kind locks: absence stays absence; school stays school; do not retarget walls.
  if rec.category = 'absence' then
    cat := 'absence';
  elsif rec.visibility_scope = 'school' then
    cat := 'school';
  elsif rec.visibility_scope = 'class' and cat not in ('class', 'lesson') then
    cat := rec.category;
  elsif rec.visibility_scope = 'self' and cat not in ('personal', 'study') then
    cat := rec.category;
  end if;

  update public.calendar_events
  set
    title = trim(p_title),
    body = nullif(trim(p_body), ''),
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    all_day = coalesce(p_all_day, rec.all_day),
    category = cat
  where id = p_id
  returning * into rec;

  return rec;
end;
$$;

revoke all on function public.update_calendar_event(
  text, uuid, text, timestamptz, timestamptz, boolean, text, text
) from public, anon;
grant execute on function public.update_calendar_event(
  text, uuid, text, timestamptz, timestamptz, boolean, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_calendar_event (hard delete; absence unlink also hard-deletes)
-- ---------------------------------------------------------------------------

create or replace function public.delete_calendar_event(
  p_seat text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  rec public.calendar_events;
begin
  if me is null then
    raise exception 'Sign in to delete';
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    raise exception 'This seat cannot delete calendar events';
  end if;

  select * into rec
  from public.calendar_events e
  where e.id = p_id
    and e.deleted_at is null
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if rec.visibility_scope = 'school' and p_seat is distinct from 'office' then
    raise exception 'Managed by office';
  end if;

  if not public.calendar_event_write_allowed(p_seat, rec) then
    raise exception 'You cannot delete this event';
  end if;

  -- Hard delete. Assignment dues are never deleted here (projection only).
  delete from public.calendar_events where id = p_id;
end;
$$;

revoke all on function public.delete_calendar_event(text, uuid) from public, anon;
grant execute on function public.delete_calendar_event(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_calendar_event (body + write flags). Visibility ⊆ list walls.
-- ---------------------------------------------------------------------------

create or replace function public.get_calendar_event(
  p_seat text,
  p_id uuid,
  p_class_id uuid default null,
  p_child_student_id uuid default null
)
returns table (
  id uuid,
  title text,
  body text,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean,
  category text,
  visibility_scope text,
  visibility_caption text,
  class_id uuid,
  student_id uuid,
  owner_profile_id uuid,
  can_edit boolean,
  can_delete boolean,
  delete_disabled_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  rec public.calendar_events;
  child uuid;
  visible boolean := false;
  write_ok boolean := false;
  reason text := null;
begin
  if me is null then
    return;
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent', 'office') then
    return;
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    return;
  end if;

  select * into rec
  from public.calendar_events e
  where e.id = p_id
    and e.deleted_at is null;
  if not found then
    return;
  end if;
  if rec.school_id is distinct from public.my_school_id() then
    return;
  end if;

  if p_seat = 'parent' then
    if public.my_parent_student_count() >= 2 then
      if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
        return; -- twins: missing child → empty, never merge
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

  -- Visibility (same walls as list_calendar_items). Never is_staff.
  if rec.status = 'draft' and rec.owner_profile_id = me then
    visible := true;
  elsif rec.status = 'published' then
    if p_seat = 'office' then
      visible := rec.visibility_scope = 'school';
    elsif p_seat = 'teacher' then
      visible :=
        rec.visibility_scope = 'school'
        or (
          rec.visibility_scope = 'class'
          and rec.class_id is not null
          and public.class_teacher_of(rec.class_id)
          and (p_class_id is null or rec.class_id = p_class_id)
        )
        or (rec.visibility_scope = 'self' and rec.owner_profile_id = me)
        or (
          rec.visibility_scope = 'student_teachers'
          and rec.student_id is not null
          and exists (
            select 1 from public.enrollments en
            where en.student_id = rec.student_id
              and public.class_teacher_of(en.class_id)
          )
        );
    elsif p_seat = 'student' then
      -- Student does not see own absence (CEO-4 / A1).
      visible :=
        rec.visibility_scope = 'school'
        or (
          rec.visibility_scope = 'class'
          and rec.class_id is not null
          and exists (
            select 1 from public.enrollments en
            where en.class_id = rec.class_id
              and en.student_id = public.my_student_id()
          )
        )
        or (rec.visibility_scope = 'self' and rec.owner_profile_id = me);
    elsif p_seat = 'parent' then
      visible :=
        rec.visibility_scope = 'school'
        or (
          rec.visibility_scope = 'class'
          and rec.class_id is not null
          and child is not null
          and exists (
            select 1 from public.enrollments en
            where en.class_id = rec.class_id
              and en.student_id = child
          )
        )
        or (
          rec.visibility_scope = 'student_teachers'
          and rec.category = 'absence'
          and rec.student_id is not null
          and rec.student_id = child
        )
        or (rec.visibility_scope = 'self' and rec.owner_profile_id = me);
    end if;
  end if;

  if not visible then
    return;
  end if;

  write_ok := public.calendar_event_write_allowed(p_seat, rec);
  if rec.visibility_scope = 'school' and p_seat is distinct from 'office' then
    reason := 'Managed by office';
  elsif rec.visibility_scope = 'student_teachers' and p_seat = 'teacher' then
    reason := 'Parent-owned absence';
  elsif rec.category = 'absence' and p_seat = 'parent' and rec.owner_profile_id is distinct from me then
    reason := 'You can view this absence. Only the parent who added it can edit or delete it.';
  end if;

  id := rec.id;
  title := rec.title;
  body := rec.body;
  starts_at := rec.starts_at;
  ends_at := rec.ends_at;
  all_day := rec.all_day;
  category := rec.category;
  visibility_scope := rec.visibility_scope;
  visibility_caption := public.calendar_visibility_caption(rec.visibility_scope, rec.category);
  class_id := rec.class_id;
  student_id := rec.student_id;
  owner_profile_id := rec.owner_profile_id;
  can_edit := write_ok;
  can_delete := write_ok;
  delete_disabled_reason := case when write_ok then null else reason end;
  return next;
end;
$$;

revoke all on function public.get_calendar_event(text, uuid, uuid, uuid) from public, anon;
grant execute on function public.get_calendar_event(text, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- S1-05: parent unlink / student delete → DELETE absence rows (not SET NULL)
-- ---------------------------------------------------------------------------

create or replace function public.calendar_events_on_parent_unlink()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete absences owned by the unlinking parent for this child.
  -- Do not SET NULL student_id (would orphan into a school firehose).
  -- Do not use deleted_at tombstone for absences (CAL-S2-05).
  delete from public.calendar_events e
  using public.profiles p
  where p.parent_id = old.parent_id
    and e.owner_profile_id = p.id
    and e.student_id = old.student_id
    and e.category = 'absence'
    and e.visibility_scope = 'student_teachers';
  return old;
end;
$$;

drop trigger if exists calendar_events_on_parent_unlink on public.parent_students;
create trigger calendar_events_on_parent_unlink
  before delete on public.parent_students
  for each row execute function public.calendar_events_on_parent_unlink();

create or replace function public.calendar_events_on_student_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.calendar_events
  where student_id = old.id
    and category = 'absence';
  return old;
end;
$$;

drop trigger if exists calendar_events_on_student_delete on public.students;
create trigger calendar_events_on_student_delete
  before delete on public.students
  for each row execute function public.calendar_events_on_student_delete();

comment on function public.create_calendar_event(text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid) is
  'CAL-R2 Phase C create. Hat-scoped. Never is_staff / teaches_class. Absence → student_teachers.';
comment on function public.delete_calendar_event(text, uuid) is
  'CAL-R2 Phase C hard-delete owner/office event. Never deletes assignment projections.';
