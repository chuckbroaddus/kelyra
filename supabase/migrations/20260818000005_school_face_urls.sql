-- Message avatars need the storage path, not just asset id.
-- assets + storage RLS are "own files only", so colleague faces never signed.

create or replace function public.is_school_profile_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles p on p.school_id = me.school_id
    left join public.teachers t on t.id = p.id
    left join public.parents par on par.id = p.parent_id
    left join public.students s on s.id = p.student_id
    join public.assets a
      on a.id = coalesce(t.photo_asset_id, par.photo_asset_id, s.photo_asset_id)
    where me.id = auth.uid()
      and a.kind = 'photo'
      and a.storage_path = p_path
  );
$$;

drop function if exists public.profile_photo_assets(uuid[]);

create function public.profile_photo_assets(p_ids uuid[])
returns table (profile_id uuid, photo_asset_id uuid, storage_path text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    a.id as photo_asset_id,
    a.storage_path
  from public.profiles p
  left join public.teachers t on t.id = p.id
  left join public.parents par on par.id = p.parent_id
  left join public.students s on s.id = p.student_id
  left join public.assets a
    on a.id = coalesce(t.photo_asset_id, par.photo_asset_id, s.photo_asset_id)
   and a.kind = 'photo'
  where auth.uid() is not null
    and p.id = any(p_ids)
    and p.school_id = (select me.school_id from public.profiles me where me.id = auth.uid());
$$;

drop policy if exists assets_select_school_faces on public.assets;
create policy assets_select_school_faces on public.assets
  for select to authenticated
  using (public.is_school_profile_photo(storage_path));

drop policy if exists media_select_school_faces on storage.objects;
create policy media_select_school_faces on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_school_profile_photo(name)
  );

grant execute on function public.is_school_profile_photo(text) to authenticated;
grant execute on function public.profile_photo_assets(uuid[]) to authenticated;
