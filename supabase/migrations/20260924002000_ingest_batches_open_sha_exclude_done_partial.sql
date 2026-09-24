-- t_ca6ce548 P1: open_sha unique blocks re-import after Confirm+delete.
-- Index excluded only abandoned|failed, so done/partial rows still held the
-- (teacher_id, class_id, original_sha256) lock after accept — same PDF could
-- not be re-uploaded. Widen exclusion to done|partial as well.
-- In-flight uniqueness unchanged: draft/uploading/received/confirming/processing/
-- split_review/retry_remainder (and any other non-excluded status) still unique.
-- Migration in PR only — do not live-apply from Eng.

drop index if exists public.ingest_batches_open_sha_uidx;

create unique index ingest_batches_open_sha_uidx
  on public.ingest_batches (teacher_id, class_id, original_sha256)
  where status not in ('abandoned', 'failed', 'done', 'partial')
    and original_sha256 is not null;

comment on index public.ingest_batches_open_sha_uidx is
  'One in-flight batch per teacher/class/sha; done|partial|abandoned|failed do not lock re-import (t_ca6ce548).';
