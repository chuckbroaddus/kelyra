-- Class avatar photo. Teachers of the class and the office set it from Settings
-- (same wall as set_class_feed_icon). PhotoSheet camera / library / remove.
-- Devops: apply 20260911000003_class_avatar.sql

alter table public.classes
  add column if not exists avatar_asset_id uuid references public.assets (id) on delete set null;

create or replace function public._unref_delete_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  path text;
begin
  if p_asset_id is null then
    return;
  end if;
  if exists (select 1 from public.captures where photo_asset_id = p_asset_id or audio_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.students where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.parents where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.teachers where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.roster_imports where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.schools where logo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.classes where avatar_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.assignments where key_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.class_syllabi where source_asset_id = p_asset_id) then
    return;
  end if;

  -- Confirm the row exists (and capture path for diagnostics). Do NOT delete
  -- storage.objects here — Supabase platform protect_delete rejects that and
  -- rolls back the whole teacher_delete_capture / people-photo RPC.
  select storage_path into path
  from public.assets
  where id = p_asset_id;
  if path is null then
    return;
  end if;

  delete from public.assets where id = p_asset_id;
end;
$$;

comment on function public._unref_delete_asset(uuid) is
  'Unref-guarded DELETE from public.assets only. Storage object GC via Storage API (client/Edge), not storage.objects SQL.';

revoke all on function public._unref_delete_asset(uuid) from public, anon, authenticated;

create or replace function public.set_class_avatar(p_class_id uuid, p_asset_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  prev uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  if p_class_id is null then
    raise exception 'Missing class';
  end if;
  if not (public.is_school_admin() or public.teaches_class(p_class_id)) then
    raise exception 'Only a teacher of this class or the office can change its avatar';
  end if;
  if p_asset_id is not null and not exists (
    select 1 from public.assets where id = p_asset_id and teacher_id = auth.uid()
  ) then
    raise exception 'Unknown photo';
  end if;

  select avatar_asset_id into prev from public.classes where id = p_class_id;
  if not found then
    raise exception 'Class not found';
  end if;

  update public.classes set avatar_asset_id = p_asset_id where id = p_class_id;

  if prev is not null and prev is distinct from p_asset_id then
    perform public._unref_delete_asset(prev);
  end if;

  perform public.write_audit(
    'set_class_avatar',
    'class',
    p_class_id::text,
    null,
    p_class_id,
    jsonb_build_object('avatar_asset_id', prev),
    jsonb_build_object('avatar_asset_id', p_asset_id)
  );
  return p_asset_id;
end;
$$;

revoke all on function public.set_class_avatar(uuid, uuid) from public, anon;
grant execute on function public.set_class_avatar(uuid, uuid) to authenticated;

drop function if exists public.student_classes();

create function public.student_classes()
returns table (
  class_id uuid,
  class_name text,
  feed_icon text,
  teacher_id uuid,
  teacher_name text,
  teacher_photo_path text,
  avatar_photo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.feed_icon,
    t.id,
    coalesce(nullif(t.display_name, ''), nullif(tp.display_name, ''), 'Teacher'),
    t_asset.storage_path,
    c_asset.storage_path
  from public.enrollments e
  join public.classes c on c.id = e.class_id
  left join lateral (
    select ct.teacher_id
    from public.class_teachers ct
    where ct.class_id = c.id
    order by ct.created_at
    limit 1
  ) first_teacher on true
  left join public.teachers t on t.id = coalesce(c.teacher_id, first_teacher.teacher_id)
  left join public.profiles tp on tp.id = t.id
  left join public.assets t_asset on t_asset.id = t.photo_asset_id
  left join public.assets c_asset on c_asset.id = c.avatar_asset_id
  where e.student_id = public.my_student_id()
  order by c.name;
$$;

comment on function public.student_classes() is
  'Enrolled classes plus the class teacher face and class avatar path.';

revoke all on function public.student_classes() from public, anon;
grant execute on function public.student_classes() to authenticated;

create or replace function public._delete_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  enr record;
  cap record;
  imp record;
  other_count int;
  avatar_id uuid;
begin
  select avatar_asset_id into avatar_id from public.classes where id = p_class_id;

  for enr in select student_id from public.enrollments where class_id = p_class_id
  loop
    select count(*) into other_count
    from public.enrollments
    where student_id = enr.student_id;

    if other_count <= 1 then
      perform public._delete_student(enr.student_id);
    else
      perform public._detach_from_class(p_class_id, enr.student_id);
    end if;
  end loop;

  for cap in select id from public.captures where class_id = p_class_id
  loop
    perform public._delete_capture(cap.id);
  end loop;

  for imp in select id from public.roster_imports where class_id = p_class_id
  loop
    perform public._delete_roster_import(imp.id);
  end loop;

  delete from public.classes where id = p_class_id;

  if avatar_id is not null then
    perform public._unref_delete_asset(avatar_id);
  end if;
end;
$$;
