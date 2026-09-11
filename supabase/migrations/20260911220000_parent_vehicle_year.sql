-- RIDE: model year on parent_vehicles (nullable, same optionality as make/model).
-- Do not apply from bot — CoS / devops apply before or with merge.

alter table public.parent_vehicles
  add column if not exists year integer;

alter table public.parent_vehicles
  drop constraint if exists parent_vehicles_year_ok;

alter table public.parent_vehicles
  add constraint parent_vehicles_year_ok check (
    year is null
    or (
      year >= 1950
      and year <= (extract(year from current_date)::int + 1)
    )
  );

comment on column public.parent_vehicles.year is
  'Optional model year (nullable integer). Same optionality as make/model.';

-- Postgres cannot CREATE OR REPLACE with a changed signature — drop old arities first.
drop function if exists public.parent_upsert_vehicle(uuid, text, text, text, text, text, date, date, boolean);
drop function if exists public.staff_attach_vehicle(uuid, text, text, text, text, text);

create function public.parent_upsert_vehicle(
  p_id uuid default null,
  p_plate_raw text default null,
  p_make text default null,
  p_model text default null,
  p_year integer default null,
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
      school_id, parent_id, plate_raw, plate_norm, make, model, year, label,
      source, validity_kind, valid_from, valid_to
    ) values (
      school, pid, trim(p_plate_raw), norm, nullif(trim(p_make), ''), nullif(trim(p_model), ''),
      p_year, nullif(trim(p_label), ''), 'parent', coalesce(p_validity_kind, 'indefinite'),
      p_valid_from, p_valid_to
    ) returning * into v;
  else
    update public.parent_vehicles
    set
      plate_raw = trim(p_plate_raw),
      plate_norm = norm,
      make = nullif(trim(p_make), ''),
      model = nullif(trim(p_model), ''),
      year = p_year,
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

create function public.staff_attach_vehicle(
  p_parent_id uuid,
  p_plate_raw text,
  p_plate_source text default 'typed',
  p_make text default null,
  p_model text default null,
  p_year integer default null,
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
    school_id, parent_id, plate_raw, plate_norm, make, model, year, label, source, validity_kind
  ) values (
    school, p_parent_id, trim(p_plate_raw), norm,
    nullif(trim(p_make), ''), nullif(trim(p_model), ''), p_year, nullif(trim(p_label), ''),
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
      'year', v.year,
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

revoke all on function public.parent_upsert_vehicle(uuid, text, text, text, integer, text, text, date, date, boolean) from public, anon;
revoke all on function public.staff_attach_vehicle(uuid, text, text, text, text, integer, text) from public, anon;
revoke all on function public.parent_list_vehicles() from public, anon;

grant execute on function public.parent_upsert_vehicle(uuid, text, text, text, integer, text, text, date, date, boolean) to authenticated;
grant execute on function public.staff_attach_vehicle(uuid, text, text, text, text, integer, text) to authenticated;
grant execute on function public.parent_list_vehicles() to authenticated;
