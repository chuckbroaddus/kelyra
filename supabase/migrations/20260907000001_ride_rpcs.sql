-- RIDE v1 RPCs + purge + archive (t_b11cfea2). Hermes applies. Do not apply from bot.
-- Parent copy: success XX only; fail "Check in failed" (no reason). Token/student deny.
-- No client-forged seq/occurred_at. LPR never inserts people (no people INSERT here).

-- ---------------------------------------------------------------------------
-- Live order builder (server seq). Walk spine > order_fix > predecessor/I'm-first.
-- ---------------------------------------------------------------------------

create or replace function public.ride_compute_line_order(
  p_line_id uuid,
  p_school_date date
)
returns table (
  slot_ord integer,
  parent_id uuid,
  student_ids uuid[],
  event_id uuid,
  plate_norm text,
  unknown_flag boolean,
  conflict_first boolean,
  source_kind text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  walk_open boolean := false;
begin
  -- Open walk: any staff_walk photo today for this line with a walk_id still "active"
  -- (no later order_fix that closes — simplify: if any staff_walk exists today, prefer staff_seq spine).
  select exists (
    select 1 from public.line_photos lp
    where lp.line_id = p_line_id and lp.school_date = p_school_date and lp.kind = 'staff_walk'
  ) into walk_open;

  if walk_open then
    return query
    with walk as (
      select
        lp.staff_seq as slot_ord,
        lp.parent_id,
        coalesce(
          (
            select e.student_ids
            from public.queue_events e
            where e.line_photo_id = lp.id
            order by e.occurred_at desc
            limit 1
          ),
          '{}'::uuid[]
        ) as student_ids,
        (
          select e.id from public.queue_events e
          where e.line_id = p_line_id and e.school_date = p_school_date
            and e.parent_id is not distinct from lp.parent_id
            and e.kind in ('staff_place', 'check_in', 'im_first', 'order_fix')
          order by e.occurred_at desc limit 1
        ) as event_id,
        lp.plate_norm,
        lp.unknown_flag,
        false as conflict_first,
        'staff_walk'::text as source_kind
      from public.line_photos lp
      where lp.line_id = p_line_id
        and lp.school_date = p_school_date
        and lp.kind = 'staff_walk'
        and lp.staff_seq is not null
        and not exists (
          select 1 from public.queue_events r
          where r.line_id = p_line_id
            and r.school_date = p_school_date
            and r.kind in ('released', 'left')
            and r.parent_id is not distinct from lp.parent_id
            and r.occurred_at >= lp.occurred_at
        )
    )
    select w.slot_ord, w.parent_id, w.student_ids, w.event_id, w.plate_norm, w.unknown_flag, w.conflict_first, w.source_kind
    from walk w
    order by w.slot_ord;
    return;
  end if;

  -- Graph / I'm-first path
  return query
  with opens as (
    select e.*
    from public.queue_events e
    where e.line_id = p_line_id
      and e.school_date = p_school_date
      and e.kind in ('check_in', 'im_first', 'ahead_insert', 'staff_place', 'order_fix')
      and not exists (
        select 1 from public.queue_events r
        where r.line_id = e.line_id
          and r.school_date = e.school_date
          and r.parent_id is not distinct from e.parent_id
          and r.kind in ('released', 'left')
          and r.occurred_at >= e.occurred_at
          and r.student_ids && e.student_ids
      )
  ),
  latest as (
    select distinct on (o.parent_id) o.*
    from opens o
    order by o.parent_id, o.occurred_at desc
  ),
  firsts as (
    select count(*)::int as n from latest l where l.kind = 'im_first'
  ),
  ranked as (
    select
      row_number() over (
        order by
          case when l.kind = 'im_first' then 0 else 1 end,
          coalesce(l.position_xx, 999999),
          l.occurred_at
      )::int as slot_ord,
      l.parent_id,
      l.student_ids,
      l.id as event_id,
      (
        select pv.plate_norm from public.parent_vehicles pv
        where pv.id = l.vehicle_id
        limit 1
      ) as plate_norm,
      coalesce((l.payload->>'unknown_flag')::boolean, false) as unknown_flag,
      (select f.n > 1 from firsts f) as conflict_first,
      l.kind::text as source_kind
    from latest l
  )
  select r.slot_ord, r.parent_id, r.student_ids, r.event_id, r.plate_norm, r.unknown_flag, r.conflict_first, r.source_kind
  from ranked r
  order by r.slot_ord;
end;
$$;

-- ---------------------------------------------------------------------------
-- Office: lines + duty
-- ---------------------------------------------------------------------------

create or replace function public.office_upsert_dismissal_line(
  p_id uuid default null,
  p_name text default null,
  p_sort integer default 0,
  p_status text default 'active'
)
returns public.dismissal_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  row public.dismissal_lines;
begin
  perform public.ride_deny_student();
  if not public.ride_is_office() then
    raise exception 'not allowed';
  end if;
  if school is null then
    raise exception 'no school';
  end if;
  if p_id is null then
    if coalesce(trim(p_name), '') = '' then
      raise exception 'name required';
    end if;
    insert into public.dismissal_lines (school_id, name, sort, status)
    values (school, trim(p_name), coalesce(p_sort, 0), coalesce(nullif(p_status, ''), 'active'))
    returning * into row;
  else
    update public.dismissal_lines
    set
      name = coalesce(nullif(trim(p_name), ''), name),
      sort = coalesce(p_sort, sort),
      status = coalesce(nullif(p_status, ''), status)
    where id = p_id and school_id = school
    returning * into row;
    if not found then
      raise exception 'line not found';
    end if;
  end if;
  return row;
end;
$$;

create or replace function public.office_ensure_default_dismissal_lines()
returns setof public.dismissal_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
begin
  perform public.ride_deny_student();
  if not public.ride_is_office() then
    raise exception 'not allowed';
  end if;
  if school is null then raise exception 'no school'; end if;
  insert into public.dismissal_lines (school_id, name, sort)
  values (school, 'K–2', 1), (school, '3–5', 2)
  on conflict (school_id, name) do nothing;
  return query
    select * from public.dismissal_lines
    where school_id = school and status = 'active'
    order by sort, name;
end;
$$;

create or replace function public.office_set_dismissal_duty(
  p_profile_id uuid,
  p_duty_role text,
  p_line_id uuid default null,
  p_active boolean default true
)
returns public.dismissal_duty
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  row public.dismissal_duty;
begin
  perform public.ride_deny_student();
  if not public.ride_is_office() then
    raise exception 'not allowed';
  end if;
  if p_duty_role not in ('curb', 'stage') then
    raise exception 'duty_role must be curb or stage';
  end if;
  if p_line_id is not null and not exists (
    select 1 from public.dismissal_lines where id = p_line_id and school_id = school
  ) then
    raise exception 'line not found';
  end if;
  insert into public.dismissal_duty (school_id, profile_id, duty_role, line_id, active)
  values (school, p_profile_id, p_duty_role, p_line_id, coalesce(p_active, true))
  on conflict (school_id, profile_id, duty_role, line_id)
  do update set active = excluded.active
  returning * into row;
  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------

create or replace function public.parent_upsert_vehicle(
  p_id uuid default null,
  p_plate_raw text default null,
  p_make text default null,
  p_model text default null,
  p_label text default null,
  p_validity_kind text default 'indefinite',
  p_valid_from date default null,
  p_valid_to date default null,
  p_void boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  pid uuid := public.ride_my_parent_id();
  norm text;
  today date := public.ride_school_date();
  v public.parent_vehicles;
  other uuid;
begin
  perform public.ride_deny_student();
  if pid is null then
    raise exception 'not allowed';
  end if;
  if school is null then raise exception 'no school'; end if;

  if p_void and p_id is not null then
    update public.parent_vehicles
    set status = 'void', voided_at = now(), updated_at = now()
    where id = p_id and parent_id = pid and school_id = school
    returning * into v;
    if not found then raise exception 'vehicle not found'; end if;
    return jsonb_build_object('ok', true, 'vehicle', to_jsonb(v));
  end if;

  norm := public.ride_plate_norm(p_plate_raw);
  if norm is null or norm = '' then
    raise exception 'plate required';
  end if;

  if coalesce(p_validity_kind, 'indefinite') = 'today' then
    p_valid_from := coalesce(p_valid_from, today);
    p_valid_to := p_valid_from;
  end if;

  -- Active unique plate among currently valid rows — void other on conflict (staff judgment later).
  select pv.id into other
  from public.parent_vehicles pv
  where pv.school_id = school
    and pv.plate_norm = norm
    and pv.status = 'active'
    and (p_id is null or pv.id <> p_id)
    and public.ride_vehicle_valid_on(pv.validity_kind, pv.valid_from, pv.valid_to, today)
  limit 1;
  if other is not null then
    update public.parent_vehicles
    set status = 'void', voided_at = now(), updated_at = now()
    where id = other;
  end if;

  if p_id is null then
    insert into public.parent_vehicles (
      school_id, parent_id, plate_raw, plate_norm, make, model, label,
      source, validity_kind, valid_from, valid_to
    ) values (
      school, pid, trim(p_plate_raw), norm, nullif(trim(p_make), ''), nullif(trim(p_model), ''),
      nullif(trim(p_label), ''), 'parent', coalesce(p_validity_kind, 'indefinite'),
      p_valid_from, p_valid_to
    ) returning * into v;
  else
    update public.parent_vehicles
    set
      plate_raw = trim(p_plate_raw),
      plate_norm = norm,
      make = nullif(trim(p_make), ''),
      model = nullif(trim(p_model), ''),
      label = nullif(trim(p_label), ''),
      validity_kind = coalesce(p_validity_kind, validity_kind),
      valid_from = p_valid_from,
      valid_to = p_valid_to,
      updated_at = now()
    where id = p_id and parent_id = pid and school_id = school and status = 'active'
    returning * into v;
    if not found then raise exception 'vehicle not found'; end if;
  end if;

  return jsonb_build_object('ok', true, 'vehicle', to_jsonb(v));
end;
$$;

create or replace function public.staff_attach_vehicle(
  p_parent_id uuid,
  p_plate_raw text,
  p_plate_source text default 'typed',
  p_make text default null,
  p_model text default null,
  p_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  norm text;
  today date := public.ride_school_date();
  v public.parent_vehicles;
  other uuid;
  src text := coalesce(p_plate_source, 'typed');
begin
  perform public.ride_deny_student();
  if not public.ride_has_duty(null, 'curb') and not public.ride_is_office() then
    raise exception 'not allowed';
  end if;
  if p_parent_id is null then raise exception 'parent required'; end if;
  norm := public.ride_plate_norm(p_plate_raw);
  if norm = '' then raise exception 'plate required'; end if;
  if src not in ('lpr', 'typed', 'stt') then src := 'typed'; end if;

  select pv.id into other
  from public.parent_vehicles pv
  where pv.school_id = school and pv.plate_norm = norm and pv.status = 'active'
    and public.ride_vehicle_valid_on(pv.validity_kind, pv.valid_from, pv.valid_to, today)
    and pv.parent_id is distinct from p_parent_id
  limit 1;
  if other is not null then
    update public.parent_vehicles
    set status = 'void', voided_at = now(), updated_at = now()
    where id = other;
  end if;

  insert into public.parent_vehicles (
    school_id, parent_id, plate_raw, plate_norm, make, model, label, source, validity_kind
  ) values (
    school, p_parent_id, trim(p_plate_raw), norm,
    nullif(trim(p_make), ''), nullif(trim(p_model), ''), nullif(trim(p_label), ''),
    'staff', 'indefinite'
  ) returning * into v;

  insert into public.queue_events (
    school_id, line_id, school_date, kind, actor_profile_id, parent_id, vehicle_id, payload
  )
  select school, dl.id, today,
    case when src = 'stt' then 'plate_stt' when src = 'typed' then 'plate_typed' else 'attach_vehicle' end,
    auth.uid(), p_parent_id, v.id,
    jsonb_build_object('plate_norm', norm, 'plate_source', src)
  from public.dismissal_lines dl
  where dl.school_id = school and dl.status = 'active'
  order by dl.sort
  limit 1;

  -- LPR / attach never inserts people — only vehicles on existing parent_id.
  return jsonb_build_object('ok', true, 'vehicle', to_jsonb(v));
end;
$$;

-- ---------------------------------------------------------------------------
-- Parent check-in / my trip
-- ---------------------------------------------------------------------------

create or replace function public.dismissal_parent_check_in(
  p_line_id uuid,
  p_student_ids uuid[],
  p_im_first boolean default false,
  p_storage_path text default null,
  p_ahead_plate_raw text default null,
  p_ahead_plate_source text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  pid uuid := public.ride_my_parent_id();
  today date := public.ride_school_date();
  linked uuid[];
  ahead_norm text;
  ahead_v public.parent_vehicles;
  photo public.line_photos;
  xx integer;
  first_count integer;
  ev_kind text;
begin
  perform public.ride_deny_student();
  if pid is null then
    -- Token /parent or unsigned — deny
    return jsonb_build_object('ok', false, 'message', 'Check in failed');
  end if;
  if school is null or p_line_id is null then
    return jsonb_build_object('ok', false, 'message', 'Check in failed');
  end if;
  if not exists (
    select 1 from public.dismissal_lines
    where id = p_line_id and school_id = school and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'message', 'Check in failed');
  end if;

  linked := public.ride_parent_linked_students(pid, p_student_ids);
  -- Twins unlabeled empty / must pick linked children this stop
  if linked is null or cardinality(linked) = 0 or cardinality(linked) <> cardinality(coalesce(p_student_ids, '{}'::uuid[])) then
    return jsonb_build_object('ok', false, 'message', 'Check in failed');
  end if;

  -- Restriction fail-closed — never leak reason
  if public.ride_is_restricted(school, pid, linked, null) then
    insert into public.queue_events (
      school_id, line_id, school_date, kind, actor_profile_id, parent_id, student_ids
    ) values (
      school, p_line_id, today, 'restrict_block', auth.uid(), pid, linked
    );
    return jsonb_build_object('ok', false, 'message', 'Check in failed');
  end if;

  if not coalesce(p_im_first, false) and coalesce(p_storage_path, '') = '' and coalesce(p_ahead_plate_raw, '') = '' then
    return jsonb_build_object('ok', false, 'message', 'Check in failed');
  end if;

  -- Path must be under caller folder (private upload)
  if p_storage_path is not null and p_storage_path <> '' then
    if split_part(p_storage_path, '/', 1) is distinct from auth.uid()::text then
      return jsonb_build_object('ok', false, 'message', 'Check in failed');
    end if;
  end if;

  ahead_norm := nullif(public.ride_plate_norm(p_ahead_plate_raw), '');
  if ahead_norm is not null then
    select * into ahead_v
    from public.parent_vehicles pv
    where pv.school_id = school
      and pv.plate_norm = ahead_norm
      and pv.status = 'active'
      and public.ride_vehicle_valid_on(pv.validity_kind, pv.valid_from, pv.valid_to, today)
    order by pv.updated_at desc
    limit 1;
  end if;

  if coalesce(p_im_first, false) then
    ev_kind := 'im_first';
    insert into public.line_photos (
      school_id, line_id, school_date, storage_path, kind, captured_by, parent_id,
      plate_raw, plate_norm, plate_source, unreadable
    ) values (
      school, p_line_id, today,
      coalesce(nullif(p_storage_path, ''), auth.uid()::text || '/ride/first-placeholder'),
      'parent_first', auth.uid(), pid,
      null, null, null, p_storage_path is null
    ) returning * into photo;
  else
    ev_kind := 'check_in';
    insert into public.line_photos (
      school_id, line_id, school_date, storage_path, kind, captured_by, parent_id,
      plate_raw, plate_norm, plate_source, unreadable, unknown_flag, ahead_vehicle_id
    ) values (
      school, p_line_id, today,
      coalesce(nullif(p_storage_path, ''), auth.uid()::text || '/ride/ahead-placeholder'),
      'parent_ahead', auth.uid(), pid,
      nullif(trim(p_ahead_plate_raw), ''), ahead_norm,
      case
        when p_ahead_plate_source in ('lpr', 'typed', 'stt') then p_ahead_plate_source
        when ahead_norm is not null then 'typed'
        else 'unknown'
      end,
      ahead_norm is null,
      ahead_v.id is null and ahead_norm is not null,
      ahead_v.id
    ) returning * into photo;

    -- If known plate not yet in this line, insert them ahead (ahead_insert) — never mint people
    if ahead_v.id is not null and ahead_v.parent_id is distinct from pid then
      if not exists (
        select 1 from public.ride_compute_line_order(p_line_id, today) o
        where o.parent_id = ahead_v.parent_id
      ) then
        insert into public.queue_events (
          school_id, line_id, school_date, kind, actor_profile_id, parent_id,
          vehicle_id, ahead_vehicle_id, line_photo_id, payload
        ) values (
          school, p_line_id, today, 'ahead_insert', auth.uid(), ahead_v.parent_id,
          ahead_v.id, ahead_v.id, photo.id,
          jsonb_build_object('inserted_by_parent', pid)
        );
      end if;
    end if;
  end if;

  select count(*)::int into first_count
  from public.queue_events e
  where e.line_id = p_line_id and e.school_date = today and e.kind = 'im_first'
    and not exists (
      select 1 from public.queue_events r
      where r.line_id = e.line_id and r.school_date = e.school_date
        and r.parent_id = e.parent_id and r.kind in ('released', 'left')
        and r.occurred_at >= e.occurred_at
    );

  if coalesce(p_im_first, false) then
    xx := 1;
    if first_count >= 1 then
      insert into public.queue_events (
        school_id, line_id, school_date, kind, actor_profile_id, parent_id, student_ids, line_photo_id, position_xx
      ) values (
        school, p_line_id, today, 'conflict_first', auth.uid(), pid, linked, photo.id, 1
      );
    end if;
  else
    select coalesce(max(o.slot_ord), 0) + 1 into xx
    from public.ride_compute_line_order(p_line_id, today) o;
    if ahead_v.id is not null then
      select o.slot_ord + 1 into xx
      from public.ride_compute_line_order(p_line_id, today) o
      where o.parent_id = ahead_v.parent_id
      limit 1;
      xx := coalesce(xx, 2);
    end if;
  end if;

  insert into public.queue_events (
    school_id, line_id, school_date, kind, actor_profile_id, parent_id, student_ids,
    ahead_vehicle_id, line_photo_id, position_xx, payload
  ) values (
    school, p_line_id, today, ev_kind, auth.uid(), pid, linked,
    ahead_v.id, photo.id, xx,
    jsonb_build_object(
      'unknown_flag', coalesce(photo.unknown_flag, false),
      'im_first', coalesce(p_im_first, false)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message', format('Check in successful, you are %s vehicle in line', xx),
    'position_xx', xx,
    'line_id', p_line_id,
    'student_ids', to_jsonb(linked)
  );
end;
$$;

create or replace function public.dismissal_my_trip(p_line_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  pid uuid := public.ride_my_parent_id();
  today date := public.ride_school_date();
  line uuid;
  xx integer;
  kids uuid[];
begin
  perform public.ride_deny_student();
  if pid is null then
    return jsonb_build_object('ok', false, 'message', 'not allowed');
  end if;

  if p_line_id is not null then
    line := p_line_id;
    select x.slot_ord, x.student_ids into xx, kids
    from public.ride_compute_line_order(line, today) x
    where x.parent_id = pid
    limit 1;
  else
    select dl.id, x.slot_ord, x.student_ids
    into line, xx, kids
    from public.dismissal_lines dl
    cross join lateral public.ride_compute_line_order(dl.id, today) x
    where dl.school_id = school and dl.status = 'active' and x.parent_id = pid
    order by dl.sort
    limit 1;
  end if;

  if line is null or xx is null then
    return jsonb_build_object(
      'ok', true,
      'status', 'none',
      'position_xx', null,
      'line_id', p_line_id,
      'student_ids', '[]'::jsonb
    );
  end if;

  -- Own XX only — no total; plates of others omitted
  return jsonb_build_object(
    'ok', true,
    'status', 'in_line',
    'position_xx', xx,
    'line_id', line,
    'student_ids', to_jsonb(coalesce(kids, '{}'::uuid[])),
    'message', format('Check in successful, you are %s vehicle in line', xx)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff curb
-- ---------------------------------------------------------------------------

create or replace function public.dismissal_queue_live(p_line_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  today date := public.ride_school_date();
  slots jsonb := '[]'::jsonb;
  conflict boolean := false;
begin
  perform public.ride_deny_student();
  if not public.ride_has_duty(p_line_id, null) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.dismissal_lines where id = p_line_id and school_id = school
  ) then
    raise exception 'line not found';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.slot_ord), '[]'::jsonb),
         coalesce(bool_or(t.conflict_first), false)
  into slots, conflict
  from (
    select
      o.slot_ord,
      o.parent_id,
      o.student_ids,
      o.plate_norm,
      o.unknown_flag,
      o.conflict_first,
      o.source_kind,
      (
        select p.display_name from public.parents p where p.id = o.parent_id
      ) as parent_name,
      (
        select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'display_name', s.display_name)), '[]'::jsonb)
        from public.students s
        where s.id = any (o.student_ids)
      ) as students
    from public.ride_compute_line_order(p_line_id, today) o
  ) t;

  return jsonb_build_object(
    'ok', true,
    'line_id', p_line_id,
    'school_date', today,
    'conflict_first', conflict,
    'slots', slots
  );
end;
$$;

create or replace function public.dismissal_staff_walk_photo(
  p_line_id uuid,
  p_storage_path text,
  p_staff_seq integer,
  p_walk_id uuid default null,
  p_plate_raw text default null,
  p_plate_source text default null,
  p_parent_id uuid default null,
  p_student_ids uuid[] default null,
  p_unknown_flag boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  today date := public.ride_school_date();
  photo public.line_photos;
  norm text;
  wid uuid := coalesce(p_walk_id, gen_random_uuid());
  src text := coalesce(p_plate_source, 'lpr');
begin
  perform public.ride_deny_student();
  if not public.ride_has_duty(p_line_id, 'curb') then
    raise exception 'not allowed';
  end if;
  if p_staff_seq is null or p_staff_seq < 1 then
    raise exception 'staff_seq required';
  end if;
  if coalesce(p_storage_path, '') = '' then
    raise exception 'photo required';
  end if;
  if split_part(p_storage_path, '/', 1) is distinct from auth.uid()::text then
    raise exception 'not allowed';
  end if;

  norm := nullif(public.ride_plate_norm(p_plate_raw), '');
  -- Match existing vehicle — never insert people
  if p_parent_id is null and norm is not null then
    select pv.parent_id into p_parent_id
    from public.parent_vehicles pv
    where pv.school_id = school and pv.plate_norm = norm and pv.status = 'active'
      and public.ride_vehicle_valid_on(pv.validity_kind, pv.valid_from, pv.valid_to, today)
    order by pv.updated_at desc
    limit 1;
  end if;

  insert into public.line_photos (
    school_id, line_id, school_date, storage_path, kind, staff_seq, walk_id,
    plate_raw, plate_norm, plate_source, unreadable, unknown_flag,
    captured_by, parent_id
  ) values (
    school, p_line_id, today, p_storage_path, 'staff_walk', p_staff_seq, wid,
    nullif(trim(p_plate_raw), ''), norm,
    case when src in ('lpr', 'typed', 'stt') then src else 'unknown' end,
    norm is null, coalesce(p_unknown_flag, norm is null),
    auth.uid(), p_parent_id
  ) returning * into photo;

  insert into public.queue_events (
    school_id, line_id, school_date, kind, actor_profile_id, parent_id, student_ids,
    line_photo_id, position_xx, payload
  ) values (
    school, p_line_id, today, 'staff_place', auth.uid(), p_parent_id,
    coalesce(p_student_ids, '{}'::uuid[]), photo.id, p_staff_seq,
    jsonb_build_object('walk_id', wid, 'unknown_flag', photo.unknown_flag)
  );

  return jsonb_build_object('ok', true, 'photo_id', photo.id, 'walk_id', wid, 'staff_seq', p_staff_seq);
end;
$$;

create or replace function public.dismissal_order_fix(
  p_line_id uuid,
  p_ordered_parent_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  today date := public.ride_school_date();
  i integer;
  pid uuid;
begin
  perform public.ride_deny_student();
  if not public.ride_has_duty(p_line_id, 'curb') then
    raise exception 'not allowed';
  end if;
  if p_ordered_parent_ids is null or cardinality(p_ordered_parent_ids) = 0 then
    raise exception 'order required';
  end if;

  for i in 1 .. cardinality(p_ordered_parent_ids) loop
    pid := p_ordered_parent_ids[i];
    insert into public.queue_events (
      school_id, line_id, school_date, kind, actor_profile_id, parent_id, position_xx, payload
    ) values (
      school, p_line_id, today, 'order_fix', auth.uid(), pid, i,
      jsonb_build_object('ordered_parent_ids', to_jsonb(p_ordered_parent_ids))
    );
  end loop;

  perform public.write_audit(
    'ride_order_fix',
    'dismissal_line',
    p_line_id::text,
    null, null,
    null,
    jsonb_build_object('ordered_parent_ids', p_ordered_parent_ids, 'school_date', today)
  );

  return public.dismissal_queue_live(p_line_id);
end;
$$;

create or replace function public.dismissal_release(
  p_line_id uuid,
  p_parent_id uuid,
  p_student_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  today date := public.ride_school_date();
  kids uuid[];
begin
  perform public.ride_deny_student();
  if not public.ride_has_duty(p_line_id, 'curb') then
    raise exception 'not allowed';
  end if;
  -- Parents cannot checkout themselves
  if public.ride_my_parent_id() is not null
     and public.ride_my_parent_id() = p_parent_id
     and not public.ride_has_duty(p_line_id, 'curb') then
    raise exception 'not allowed';
  end if;

  kids := coalesce(p_student_ids, '{}'::uuid[]);
  if cardinality(kids) = 0 then
    select o.student_ids into kids
    from public.ride_compute_line_order(p_line_id, today) o
    where o.parent_id = p_parent_id
    limit 1;
    kids := coalesce(kids, '{}'::uuid[]);
  end if;

  insert into public.queue_events (
    school_id, line_id, school_date, kind, actor_profile_id, parent_id, student_ids
  ) values (
    school, p_line_id, today, 'released', auth.uid(), p_parent_id, kids
  );

  return jsonb_build_object('ok', true, 'line_id', p_line_id, 'parent_id', p_parent_id, 'student_ids', to_jsonb(kids));
end;
$$;

create or replace function public.dismissal_nudge(
  p_line_id uuid,
  p_parent_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  today date := public.ride_school_date();
begin
  perform public.ride_deny_student();
  if not public.ride_has_duty(p_line_id, 'curb') then
    raise exception 'not allowed';
  end if;
  -- No neighbor PII in payload
  insert into public.queue_events (
    school_id, line_id, school_date, kind, actor_profile_id, parent_id, payload
  ) values (
    school, p_line_id, today, 'nudge', auth.uid(), p_parent_id,
    jsonb_build_object('copy', 'Your line is moving — please check in when you arrive.')
  );
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Restrictions + archive + purge
-- ---------------------------------------------------------------------------

create or replace function public.office_set_pickup_restriction(
  p_id uuid default null,
  p_student_id uuid default null,
  p_parent_id uuid default null,
  p_vehicle_id uuid default null,
  p_reason text default null,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  row public.pickup_restrictions;
begin
  perform public.ride_deny_student();
  if not public.ride_is_office() then
    raise exception 'not allowed';
  end if;

  if p_id is null then
    if p_student_id is null then raise exception 'student required'; end if;
    insert into public.pickup_restrictions (
      school_id, student_id, parent_id, vehicle_id, reason, active, created_by
    ) values (
      school, p_student_id, p_parent_id, p_vehicle_id, p_reason, coalesce(p_active, true), auth.uid()
    ) returning * into row;
  else
    update public.pickup_restrictions
    set
      student_id = coalesce(p_student_id, student_id),
      parent_id = coalesce(p_parent_id, parent_id),
      vehicle_id = coalesce(p_vehicle_id, vehicle_id),
      reason = coalesce(p_reason, reason),
      active = coalesce(p_active, active),
      updated_at = now()
    where id = p_id and school_id = school
    returning * into row;
    if not found then raise exception 'not found'; end if;
  end if;

  perform public.write_audit(
    'ride_set_restriction',
    'pickup_restriction',
    row.id::text,
    row.student_id, null,
    null,
    jsonb_build_object('active', row.active, 'parent_id', row.parent_id)
  );

  return jsonb_build_object('ok', true, 'restriction', to_jsonb(row));
end;
$$;

create or replace function public.superintendent_archive_day_photos(p_school_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  n integer;
begin
  perform public.ride_deny_student();
  -- Administrators cannot archive — superintendent only
  if not public.ride_is_superintendent() then
    raise exception 'not allowed';
  end if;
  if p_school_date is null then
    raise exception 'school_date required';
  end if;

  update public.line_photos
  set archived_at = coalesce(archived_at, now())
  where school_id = school
    and school_date = p_school_date
    and archived_at is null;

  get diagnostics n = row_count;

  perform public.write_audit(
    'ride_archive_day_photos',
    'line_photos',
    p_school_date::text,
    null, null,
    null,
    jsonb_build_object('school_date', p_school_date, 'archived_count', n)
  );

  return jsonb_build_object('ok', true, 'archived_count', n, 'school_date', p_school_date);
end;
$$;

create or replace function public.dismissal_purge_old()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := public.ride_school_date() - 7;
  n_events integer := 0;
  n_photos integer := 0;
  paths text[];
begin
  -- Callable by authenticated office/duty; also safe for scheduled job with service role.
  if auth.uid() is not null and not public.ride_is_office() and not public.ride_has_duty(null, null) then
    raise exception 'not allowed';
  end if;

  delete from public.queue_events
  where school_date < cutoff;
  get diagnostics n_events = row_count;

  select coalesce(array_agg(storage_path), '{}') into paths
  from public.line_photos
  where school_date < cutoff and archived_at is null;

  delete from public.line_photos
  where school_date < cutoff and archived_at is null;
  get diagnostics n_photos = row_count;

  -- Storage object deletes are best-effort via Edge/cron; return paths for the job.
  return jsonb_build_object(
    'ok', true,
    'cutoff', cutoff,
    'deleted_events', n_events,
    'deleted_photos', n_photos,
    'storage_paths', to_jsonb(paths)
  );
end;
$$;

-- List lines for parent/staff
create or replace function public.dismissal_list_lines()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
begin
  perform public.ride_deny_student();
  if school is null then raise exception 'no school'; end if;
  if public.ride_my_parent_id() is null
     and not public.ride_has_duty(null, null)
     and not public.ride_is_office() then
    raise exception 'not allowed';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id, 'name', l.name, 'sort', l.sort, 'status', l.status
    ) order by l.sort, l.name)
    from public.dismissal_lines l
    where l.school_id = school and l.status = 'active'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.parent_list_vehicles()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pid uuid := public.ride_my_parent_id();
  today date := public.ride_school_date();
begin
  perform public.ride_deny_student();
  if pid is null then raise exception 'not allowed'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', v.id,
      'plate_raw', v.plate_raw,
      'plate_norm', v.plate_norm,
      'make', v.make,
      'model', v.model,
      'label', v.label,
      'validity_kind', v.validity_kind,
      'valid_from', v.valid_from,
      'valid_to', v.valid_to,
      'status', v.status,
      'valid_today', public.ride_vehicle_valid_on(v.validity_kind, v.valid_from, v.valid_to, today)
    ) order by v.created_at desc)
    from public.parent_vehicles v
    where v.parent_id = pid and v.status = 'active'
  ), '[]'::jsonb);
end;
$$;

-- Grants
revoke all on function public.office_upsert_dismissal_line(uuid, text, integer, text) from public, anon;
revoke all on function public.office_ensure_default_dismissal_lines() from public, anon;
revoke all on function public.office_set_dismissal_duty(uuid, text, uuid, boolean) from public, anon;
revoke all on function public.parent_upsert_vehicle(uuid, text, text, text, text, text, date, date, boolean) from public, anon;
revoke all on function public.staff_attach_vehicle(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.dismissal_parent_check_in(uuid, uuid[], boolean, text, text, text) from public, anon;
revoke all on function public.dismissal_my_trip(uuid) from public, anon;
revoke all on function public.dismissal_queue_live(uuid) from public, anon;
revoke all on function public.dismissal_staff_walk_photo(uuid, text, integer, uuid, text, text, uuid, uuid[], boolean) from public, anon;
revoke all on function public.dismissal_order_fix(uuid, uuid[]) from public, anon;
revoke all on function public.dismissal_release(uuid, uuid, uuid[]) from public, anon;
revoke all on function public.dismissal_nudge(uuid, uuid) from public, anon;
revoke all on function public.office_set_pickup_restriction(uuid, uuid, uuid, uuid, text, boolean) from public, anon;
revoke all on function public.superintendent_archive_day_photos(date) from public, anon;
revoke all on function public.dismissal_purge_old() from public, anon;
revoke all on function public.dismissal_list_lines() from public, anon;
revoke all on function public.parent_list_vehicles() from public, anon;
revoke all on function public.ride_compute_line_order(uuid, date) from public, anon;

grant execute on function public.office_upsert_dismissal_line(uuid, text, integer, text) to authenticated;
grant execute on function public.office_ensure_default_dismissal_lines() to authenticated;
grant execute on function public.office_set_dismissal_duty(uuid, text, uuid, boolean) to authenticated;
grant execute on function public.parent_upsert_vehicle(uuid, text, text, text, text, text, date, date, boolean) to authenticated;
grant execute on function public.staff_attach_vehicle(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.dismissal_parent_check_in(uuid, uuid[], boolean, text, text, text) to authenticated;
grant execute on function public.dismissal_my_trip(uuid) to authenticated;
grant execute on function public.dismissal_queue_live(uuid) to authenticated;
grant execute on function public.dismissal_staff_walk_photo(uuid, text, integer, uuid, text, text, uuid, uuid[], boolean) to authenticated;
grant execute on function public.dismissal_order_fix(uuid, uuid[]) to authenticated;
grant execute on function public.dismissal_release(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.dismissal_nudge(uuid, uuid) to authenticated;
grant execute on function public.office_set_pickup_restriction(uuid, uuid, uuid, uuid, text, boolean) to authenticated;
grant execute on function public.superintendent_archive_day_photos(date) to authenticated;
grant execute on function public.dismissal_purge_old() to authenticated;
grant execute on function public.dismissal_list_lines() to authenticated;
grant execute on function public.parent_list_vehicles() to authenticated;
