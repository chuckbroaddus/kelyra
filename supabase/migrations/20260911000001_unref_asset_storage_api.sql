-- t_f733297e / DITL P2 T-01-UI-01: stop DELETE FROM storage.objects inside
-- _unref_delete_asset (platform protect_delete: "Use the Storage API instead").
-- DB unref + DELETE public.assets still happens here. Object GC is best-effort
-- via Supabase Storage API from the teacher client (src/lib/captures/delete.ts).
-- Orphan files are OK if Storage API fails — blocking the teacher is not.
-- Devops: apply 20260911000001_unref_asset_storage_api.sql

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
