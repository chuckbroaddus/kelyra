-- BATCH-v1 I2: page progress on ingest_batches for rasterize worker UI ("12/120 rasterized").
-- Additive only. DevOps applies later — do not apply from the build loop.

alter table public.ingest_batches
  add column if not exists pages_done int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ingest_batches_pages_done_nonneg'
  ) then
    alter table public.ingest_batches
      add constraint ingest_batches_pages_done_nonneg check (pages_done >= 0);
  end if;
end $$;

comment on column public.ingest_batches.pages_done is
  'I2 worker: count of pages written to ingest_pages (rasterized or skipped_blank). UI: pages_done/page_count.';
