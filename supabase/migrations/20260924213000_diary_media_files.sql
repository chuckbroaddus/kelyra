-- JOURNAL-ATTACH (CEO 2026-09-24): Journal entries can carry Files, not only photos.
-- Owner-only RLS and the private `diary` bucket policies are unchanged (path first segment = auth.uid()).
alter table public.diary_media drop constraint if exists diary_media_kind_check;
alter table public.diary_media
  add constraint diary_media_kind_check check (kind in ('photo', 'file'));
alter table public.diary_media add column if not exists file_name text;
