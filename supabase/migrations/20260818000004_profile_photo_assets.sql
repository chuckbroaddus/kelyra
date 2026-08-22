-- Faces for anyone you may already see in messages. RLS on students/parents/teachers
-- otherwise hides a colleague's photo_asset_id from non-admins.

create or replace function public.profile_photo_assets(p_ids uuid[])
returns table (profile_id uuid, photo_asset_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(t.photo_asset_id, par.photo_asset_id, s.photo_asset_id) as photo_asset_id
  from public.profiles p
  left join public.teachers t on t.id = p.id
  left join public.parents par on par.id = p.parent_id
  left join public.students s on s.id = p.student_id
  where auth.uid() is not null
    and p.id = any(p_ids)
    and p.school_id = (select me.school_id from public.profiles me where me.id = auth.uid());
$$;

grant execute on function public.profile_photo_assets(uuid[]) to authenticated;
