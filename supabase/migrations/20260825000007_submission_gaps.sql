-- Gaps on turned-in assignments (no homework capture). capture_id may be null.

alter table public.skill_gaps
  alter column capture_id drop not null;

alter table public.skill_gaps
  add column if not exists submission_id uuid references public.submissions (id) on delete cascade;

alter table public.skill_gaps drop constraint if exists skill_gaps_source_row;
alter table public.skill_gaps
  add constraint skill_gaps_source_row
  check (capture_id is not null or submission_id is not null);

create index if not exists skill_gaps_submission_idx on public.skill_gaps (submission_id);

drop policy if exists skill_gaps_via_capture on public.skill_gaps;
create policy skill_gaps_via_class on public.skill_gaps
  for all using (
    (
      capture_id is not null
      and exists (
        select 1
        from public.captures cap
        where cap.id = capture_id and public.teaches_class(cap.class_id)
      )
    )
    or (
      submission_id is not null
      and exists (
        select 1
        from public.submissions sub
        join public.assignments a on a.id = sub.assignment_id
        where sub.id = submission_id and public.teaches_class(a.class_id)
      )
    )
  )
  with check (
    (
      capture_id is not null
      and exists (
        select 1
        from public.captures cap
        where cap.id = capture_id and public.teaches_class(cap.class_id)
      )
    )
    or (
      submission_id is not null
      and exists (
        select 1
        from public.submissions sub
        join public.assignments a on a.id = sub.assignment_id
        where sub.id = submission_id and public.teaches_class(a.class_id)
      )
    )
  );
