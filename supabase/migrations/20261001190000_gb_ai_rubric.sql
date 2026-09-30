-- GB-14 AI rubric proposals: ai_grade_proposals
-- Idempotent. Do not apply from the build card — DevOps applies.
-- RLS: teacher of class only (no family/student read of AI drafts).

create table if not exists public.ai_grade_proposals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  association_id uuid not null references public.rubric_associations (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  cells jsonb not null default '[]'::jsonb,
  proposed_total numeric,
  proposed_max numeric,
  model text,
  status text not null default 'proposed'
    check (status in (
      'proposed',
      'accepted',
      'edited',
      'rejected',
      'needs_manual',
      'processing'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, association_id)
);

comment on table public.ai_grade_proposals is
  'GB-14 AiGradeProposal drafts (FR-AI-GRADE-02). Human confirm only; families never read.';

create index if not exists ai_grade_proposals_submission_idx
  on public.ai_grade_proposals (submission_id);
create index if not exists ai_grade_proposals_association_idx
  on public.ai_grade_proposals (association_id);
create index if not exists ai_grade_proposals_status_idx
  on public.ai_grade_proposals (status);

alter table public.ai_grade_proposals enable row level security;

drop policy if exists ai_grade_proposals_teacher_all on public.ai_grade_proposals;
create policy ai_grade_proposals_teacher_all
  on public.ai_grade_proposals for all to authenticated
  using (
    exists (
      select 1
      from public.rubric_associations ra
      join public.assignments a on a.id = ra.assignment_id
      where ra.id = association_id
        and public.class_teacher_of(a.class_id)
    )
  )
  with check (
    exists (
      select 1
      from public.rubric_associations ra
      join public.assignments a on a.id = ra.assignment_id
      where ra.id = association_id
        and public.class_teacher_of(a.class_id)
    )
  );
