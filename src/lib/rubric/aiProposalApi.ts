/**
 * GB-14 AiGradeProposal client helpers (persist + confirm).
 */
import { requireSupabase } from '@/lib/supabase/client';
import {
  isProposalOpen,
  statusAfterConfirm,
  toDraftAssessment,
  type AiGradeProposal,
  type AiGradeProposalCell,
  type AiGradeProposalStatus,
} from './aiProposal.ts';
import { saveRubricAssessment } from './api.ts';
import type { RubricAssessment, RubricAssociation } from './types.ts';

function sb() {
  return requireSupabase();
}

function rowToProposal(row: Record<string, unknown>): AiGradeProposal {
  const cells = (Array.isArray(row.cells) ? row.cells : []) as AiGradeProposalCell[];
  const lowest =
    cells.length === 0
      ? null
      : Math.min(...cells.map((c) => (c.na ? 1 : Number(c.confidence) || 0)));
  return {
    id: row.id ? String(row.id) : undefined,
    assignment_id: row.assignment_id ? String(row.assignment_id) : '',
    student_id: row.student_id ? String(row.student_id) : '',
    submission_id: String(row.submission_id),
    association_id: String(row.association_id),
    rubric_version: Number(row.rubric_version ?? 1),
    cells,
    proposed_total: row.proposed_total == null ? null : Number(row.proposed_total),
    proposed_max: row.proposed_max == null ? null : Number(row.proposed_max),
    model: row.model ? String(row.model) : null,
    status: (row.status as AiGradeProposalStatus) ?? 'proposed',
    lowest_confidence: lowest,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function getAiGradeProposal(
  submissionId: string,
  associationId?: string,
): Promise<AiGradeProposal | null> {
  let q = sb()
    .from('ai_grade_proposals' as never)
    .select('*')
    .eq('submission_id', submissionId);
  if (associationId) q = q.eq('association_id', associationId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToProposal(data as Record<string, unknown>);
}

export async function updateAiGradeProposalStatus(
  proposalId: string,
  status: AiGradeProposalStatus,
  cells?: AiGradeProposalCell[],
): Promise<void> {
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (cells) payload.cells = cells;
  const { error } = await sb()
    .from('ai_grade_proposals' as never)
    .update(payload as never)
    .eq('id', proposalId);
  if (error) throw error;
}

/** Confirm AI proposal → RubricAssessment (teacher source). AI never posts alone. */
export async function confirmAiGradeProposal(input: {
  proposal: AiGradeProposal;
  association: RubricAssociation;
  cells: AiGradeProposalCell[];
  studentId: string;
  submissionId: string;
  assignmentMax?: number | null;
  confirmedBy?: string | null;
  writeScore?: boolean;
}): Promise<RubricAssessment> {
  const rubric = input.association.snapshot;
  if (!rubric) throw new Error('Association has no snapshot.');
  const draft = toDraftAssessment(
    { cells: input.cells },
    rubric,
    {
      map: input.association.map_to_assignment,
      assignmentMax: input.assignmentMax,
    },
  );
  const edited = JSON.stringify(input.proposal.cells) !== JSON.stringify(input.cells);
  const assessment = await saveRubricAssessment({
    association: input.association,
    submissionId: input.submissionId,
    studentId: input.studentId,
    selections: draft.selections,
    holisticLevelId: draft.holistic_level_id,
    assignmentMax: input.assignmentMax,
    confirm: true,
    confirmedBy: input.confirmedBy,
    writeScore: input.writeScore !== false,
  });
  if (input.proposal.id) {
    await updateAiGradeProposalStatus(
      input.proposal.id,
      statusAfterConfirm(edited),
      input.cells,
    );
  }
  return assessment;
}

export async function discardAiGradeProposal(proposalId: string): Promise<void> {
  await updateAiGradeProposalStatus(proposalId, 'rejected');
}

export { isProposalOpen };
