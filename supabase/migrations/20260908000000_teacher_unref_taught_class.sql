-- F01 / Q11 follow-up: co-teacher photo replace orphans prior assets.
-- setProfilePhoto updated photo_asset_id via taught-class UPDATE, then called
-- teacher_unref_asset which required assets.teacher_id = auth.uid(). Co-teacher
-- replacing another teacher's upload left the old asset orphaned; RPC errors were ignored.
--
-- 1) Widen teacher_unref_asset: own asset OR asset still attached to a student/parent
--    the actor may update (owner / office / student_on_taught_class / parent_on_taught_class).
-- 2) Add teacher_set_profile_photo: authorize like teacher_clear_profile_photo, swap
--    photo_asset_id, then _unref_delete_asset the previous (no uploader ownership check).
-- Migration is write-only; do not apply here (Chief of Staff applies).

create or replace function public.teacher_unref_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_asset_id is null then
    return;
  end if;

  -- Uploader may always unref their own asset (temp frames, logos, keys, etc.).
  if exists (
    select 1 from public.assets
    where id = p_asset_id and teacher_id = auth.uid()
  ) then
    perform public._unref_delete_asset(p_asset_id);
    return;
  end if;

  -- Co-teacher / office: asset still linked to a person they may update.
  if exists (
    select 1
    from public.students s
    where s.photo_asset_id = p_asset_id
      and (
        s.teacher_id = auth.uid()
        or public.is_school_admin()
        or public.student_on_taught_class(s.id)
      )
  ) or exists (
    select 1
    from public.parents p
    where p.photo_asset_id = p_asset_id
      and (
        p.teacher_id = auth.uid()
        or public.is_school_admin()
        or public.parent_on_taught_class(p.id)
      )
  ) then
    perform public._unref_delete_asset(p_asset_id);
    return;
  end if;

  raise exception 'Not found';
end;
$$;

create or replace function public.teacher_set_profile_photo(
  p_kind text,
  p_person_id uuid,
  p_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  if p_asset_id is null then
    raise exception 'Invalid asset';
  end if;
  -- New photo must be an asset the actor uploaded (co-teacher upload uses their uid).
  if not exists (
    select 1 from public.assets
    where id = p_asset_id and teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;

  if p_kind = 'student' then
    select photo_asset_id into photo_id
    from public.students
    where id = p_person_id
      and (
        teacher_id = auth.uid()
        or public.is_school_admin()
        or public.student_on_taught_class(p_person_id)
      );
    if not found then
      raise exception 'Not found';
    end if;
    update public.students set photo_asset_id = p_asset_id where id = p_person_id;
  elsif p_kind = 'parent' then
    select photo_asset_id into photo_id
    from public.parents
    where id = p_person_id
      and (
        teacher_id = auth.uid()
        or public.is_school_admin()
        or public.parent_on_taught_class(p_person_id)
      );
    if not found then
      raise exception 'Not found';
    end if;
    update public.parents set photo_asset_id = p_asset_id where id = p_person_id;
  elsif p_kind = 'teacher' then
    if p_person_id <> auth.uid() then
      raise exception 'Not found';
    end if;
    select photo_asset_id into photo_id
    from public.teachers
    where id = auth.uid();
    if not found then
      raise exception 'Not found';
    end if;
    update public.teachers set photo_asset_id = p_asset_id where id = auth.uid();
  else
    raise exception 'Invalid kind';
  end if;

  if photo_id is not null and photo_id is distinct from p_asset_id then
    perform public._unref_delete_asset(photo_id);
  end if;
end;
$$;

revoke all on function public.teacher_unref_asset(uuid) from public, anon;
grant execute on function public.teacher_unref_asset(uuid) to authenticated;

revoke all on function public.teacher_set_profile_photo(text, uuid, uuid) from public, anon;
grant execute on function public.teacher_set_profile_photo(text, uuid, uuid) to authenticated;
