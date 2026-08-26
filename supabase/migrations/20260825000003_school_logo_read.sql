-- School logo is header chrome for every signed-in role. Students and parents
-- must be able to SELECT the logo asset and sign its storage object.
-- The logo is not a profile face and is not a chrome glyph.

create or replace function public.is_school_logo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.schools s on s.id = me.school_id
    join public.assets a on a.id = s.logo_asset_id
    where me.id = auth.uid()
      and a.kind = 'photo'
      and p_path is not null
      and (
        a.storage_path = p_path
        or a.thumb_storage_path = p_path
      )
  );
$$;

comment on function public.is_school_logo(text) is
  'True when p_path is this school’s header logo. Any signed-in member of the school.';

revoke all on function public.is_school_logo(text) from public, anon;
grant execute on function public.is_school_logo(text) to authenticated;

drop policy if exists assets_select_school_logo on public.assets;
create policy assets_select_school_logo on public.assets
  for select to authenticated
  using (public.is_school_logo(storage_path) or public.is_school_logo(thumb_storage_path));

drop policy if exists media_select_school_logo on storage.objects;
create policy media_select_school_logo on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_school_logo(name)
  );

create or replace function public.school_logo_paths()
returns table (
  asset_id uuid,
  storage_path text,
  thumb_storage_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.storage_path,
    a.thumb_storage_path
  from public.profiles me
  join public.schools s on s.id = me.school_id
  join public.assets a on a.id = s.logo_asset_id
  where me.id = auth.uid()
    and a.kind = 'photo'
  limit 1;
$$;

comment on function public.school_logo_paths() is
  'Header logo storage paths for the signed-in person’s school. Empty if none is set.';

revoke all on function public.school_logo_paths() from public, anon;
grant execute on function public.school_logo_paths() to authenticated;
