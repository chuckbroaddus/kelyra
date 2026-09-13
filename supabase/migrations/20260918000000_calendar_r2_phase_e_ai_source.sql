-- CAL-R2 Phase E: create_calendar_event accepts p_source manual|ai_nl (Ask draft Save).
-- Named only — do not live-apply from this task. devops-release applies later.

drop function if exists public.create_calendar_event(
  text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid
);

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
  p_child_student_id uuid default null,
  p_source text default 'manual'
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
  src text := lower(trim(coalesce(p_source, 'manual')));
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

  if src is null or src not in ('manual', 'ai_nl') then
    raise exception 'Unknown event source';
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
    src
  )
  returning * into rec;

  return rec;
end;
$$;


revoke all on function public.create_calendar_event(
  text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid, text
) from public, anon;

grant execute on function public.create_calendar_event(
  text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid, text
) to authenticated;

comment on function public.create_calendar_event(text, text, text, timestamptz, timestamptz, boolean, text, text, uuid, uuid, text) is
  'CAL-R2 Phase E create. Hat-scoped. p_source manual|ai_nl. Never is_staff / teaches_class.';
