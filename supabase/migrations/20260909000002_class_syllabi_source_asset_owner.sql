-- t_4232624d / t_6544d445: reject class_syllabi.source_asset_id unless owned by auth.uid().
-- Belt-and-suspenders over RLS class_syllabi_teacher_all (direct UPDATE could point at foreign assets).

create or replace function public.class_syllabi_source_asset_owned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_asset_id is null then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'source_asset_id requires authenticated owner';
  end if;
  if not exists (
    select 1
    from public.assets a
    where a.id = new.source_asset_id
      and a.teacher_id = auth.uid()
  ) then
    raise exception 'source_asset_id must reference an asset owned by the caller';
  end if;
  return new;
end;
$$;

drop trigger if exists class_syllabi_source_asset_owned on public.class_syllabi;
create trigger class_syllabi_source_asset_owned
  before insert or update of source_asset_id on public.class_syllabi
  for each row
  execute function public.class_syllabi_source_asset_owned();

revoke all on function public.class_syllabi_source_asset_owned() from public, anon;
