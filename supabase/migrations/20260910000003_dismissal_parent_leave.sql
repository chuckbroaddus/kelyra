-- RIDE parent leave-line (CEO-2 / Option A). Parent writes kind=left only; never released.
-- Do not apply from bot — name for devops-release / Hermes.

create or replace function public.dismissal_parent_leave(p_line_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid := public.my_school_id();
  pid uuid := public.ride_my_parent_id();
  today date := public.ride_school_date();
  kids uuid[];
  xx integer;
begin
  perform public.ride_deny_student();
  if pid is null then
    -- Token /parent or unsigned — deny (no reason leak)
    return jsonb_build_object('ok', false, 'message', 'Leave failed');
  end if;
  if school is null or p_line_id is null then
    return jsonb_build_object('ok', false, 'message', 'Leave failed');
  end if;
  if not exists (
    select 1 from public.dismissal_lines
    where id = p_line_id and school_id = school and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'message', 'Leave failed');
  end if;

  -- Live waiting trip for this parent on this line only (trip children from server order)
  select o.slot_ord, o.student_ids into xx, kids
  from public.ride_compute_line_order(p_line_id, today) o
  where o.parent_id = pid
  limit 1;

  if xx is null or kids is null or cardinality(kids) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Leave failed');
  end if;

  -- Parent path writes left only — never mint released (occurred_at is server default)
  insert into public.queue_events (
    school_id, line_id, school_date, kind, actor_profile_id, parent_id, student_ids
  ) values (
    school, p_line_id, today, 'left', auth.uid(), pid, kids
  );

  return jsonb_build_object(
    'ok', true,
    'kind', 'left',
    'line_id', p_line_id,
    'student_ids', to_jsonb(kids)
  );
end;
$$;

revoke all on function public.dismissal_parent_leave(uuid) from public, anon;
grant execute on function public.dismissal_parent_leave(uuid) to authenticated;

comment on function public.dismissal_parent_leave(uuid) is
  'RIDE: parent ends waiting on this line (queue_events.kind=left). Never released. Trip children only.';
