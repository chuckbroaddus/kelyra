-- Teacher profile photo. Same private assets bucket as student/parent faces.
-- Run in the Supabase SQL editor. Safe-ish to re-run.

alter table public.teachers
  add column if not exists photo_asset_id uuid references public.assets (id) on delete set null;

create index if not exists teachers_photo_asset_id_idx on public.teachers (photo_asset_id);

create or replace function public.teacher_clear_profile_photo(p_kind text, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  if p_kind = 'student' then
    select photo_asset_id into photo_id
    from public.students
    where id = p_person_id and teacher_id = auth.uid();
    if not found then
      raise exception 'Not found';
    end if;
    update public.students set photo_asset_id = null where id = p_person_id;
  elsif p_kind = 'parent' then
    select photo_asset_id into photo_id
    from public.parents
    where id = p_person_id and teacher_id = auth.uid();
    if not found then
      raise exception 'Not found';
    end if;
    update public.parents set photo_asset_id = null where id = p_person_id;
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
    update public.teachers set photo_asset_id = null where id = auth.uid();
  else
    raise exception 'Invalid kind';
  end if;
  perform public._unref_delete_asset(photo_id);
end;
$$;
