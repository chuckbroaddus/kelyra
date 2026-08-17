-- Answer keys on planned assignments.
-- Photo of a blank or filled worksheet, typed items, print-signature for match.
-- Run in the Supabase SQL editor. Safe-ish to re-run.

alter table public.assignments
  add column if not exists key_kind text not null default 'none';

alter table public.assignments
  add column if not exists key_notes text;

alter table public.assignments
  add column if not exists key_pass_at numeric;

alter table public.assignments
  add column if not exists key_items jsonb not null default '[]'::jsonb;

alter table public.assignments
  add column if not exists key_asset_id uuid references public.assets (id) on delete set null;

alter table public.assignments
  add column if not exists key_phash text;

alter table public.assignments
  add column if not exists key_layout jsonb;

alter table public.assignments
  add column if not exists key_header text;

alter table public.assignments
  add column if not exists key_blank_map jsonb;

alter table public.assignments
  add column if not exists key_ready_at timestamptz;

create index if not exists assignments_key_asset_id_idx on public.assignments (key_asset_id);
create index if not exists assignments_class_key_idx on public.assignments (class_id) where key_kind <> 'none';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assignments_key_kind_check') then
    alter table public.assignments
      add constraint assignments_key_kind_check
      check (key_kind in ('none', 'photo', 'items', 'both'));
  end if;
end $$;
