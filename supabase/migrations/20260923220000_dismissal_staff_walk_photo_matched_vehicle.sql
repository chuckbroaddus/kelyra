-- RIDE: staff walk photo returns matched registry vehicle fields for attach form.
-- Prefer registered make/model/parent_id when plate lookup hits (client clears stale LPR fields).
-- Do not apply from bot — name for devops-release / Hermes.

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
  matched_parent_id uuid;
  matched_make text;
  matched_model text;
  matched_plate_norm text;
  out jsonb;
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
  matched_parent_id := null;
  matched_make := null;
  matched_model := null;
  matched_plate_norm := null;

  -- Match existing vehicle — never insert people. Capture make/model for attach form.
  if norm is not null then
    select pv.parent_id, pv.make, pv.model, pv.plate_norm
      into matched_parent_id, matched_make, matched_model, matched_plate_norm
    from public.parent_vehicles pv
    where pv.school_id = school and pv.plate_norm = norm and pv.status = 'active'
      and public.ride_vehicle_valid_on(pv.validity_kind, pv.valid_from, pv.valid_to, today)
    order by pv.updated_at desc
    limit 1;
  end if;

  if p_parent_id is null and matched_parent_id is not null then
    p_parent_id := matched_parent_id;
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

  out := jsonb_build_object('ok', true, 'photo_id', photo.id, 'walk_id', wid, 'staff_seq', p_staff_seq);

  -- When plate lookup hits a registered vehicle, include fields for attach form (registry wins client-side).
  if matched_plate_norm is not null then
    out := out || jsonb_build_object(
      'parent_id', matched_parent_id,
      'make', matched_make,
      'model', matched_model,
      'plate_norm', matched_plate_norm
    );
  end if;

  return out;
end;
$$;

revoke all on function public.dismissal_staff_walk_photo(uuid, text, integer, uuid, text, text, uuid, uuid[], boolean) from public, anon;
grant execute on function public.dismissal_staff_walk_photo(uuid, text, integer, uuid, text, text, uuid, uuid[], boolean) to authenticated;

comment on function public.dismissal_staff_walk_photo(uuid, text, integer, uuid, text, text, uuid, uuid[], boolean) is
  'RIDE: staff walk photo place. Returns matched parent_id/make/model/plate_norm when plate hits registry.';
