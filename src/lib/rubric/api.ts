/**
 * GB-13 rubric client wrappers. AI never publishes — human confirm only.
 */
import { requireSupabase } from '@/lib/supabase/client';
import {
  mapToAssignmentScore,
  scoreRubric,
  snapshotRubric,
  type AssessmentSelection,
  type MapToAssignment,
  type Rubric,
  type RubricAssessment,
  type RubricAssociation,
  type RubricCriterion,
  type RubricKind,
  type RubricScoring,
  type RubricStatus,
} from './index.ts';

type RubricRow = {
  id: string;
  owner_id: string;
  school_id: string | null;
  class_id: string | null;
  scope: Rubric['scope'];
  title: string;
  kind: RubricKind;
  scoring: RubricScoring;
  levels: Rubric['levels'];
  criteria: Rubric['criteria'];
  cells: Rubric['cells'];
  version: number;
  status: RubricStatus;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
};

function rowToRubric(row: RubricRow): Rubric {
  return {
    id: row.id,
    owner_id: row.owner_id,
    school_id: row.school_id,
    class_id: row.class_id,
    scope: row.scope,
    title: row.title,
    kind: row.kind,
    scoring: row.scoring ?? {
      method: 'sum_points',
      use_for_grading: true,
      hide_score_from_family: false,
    },
    levels: Array.isArray(row.levels) ? row.levels : [],
    criteria: Array.isArray(row.criteria) ? row.criteria : [],
    cells: Array.isArray(row.cells) ? row.cells : [],
    version: row.version ?? 1,
    status: row.status,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sb() {
  return requireSupabase();
}

export async function listMyRubrics(): Promise<Rubric[]> {
  const { data, error } = await sb()
    .from('rubrics' as never)
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data as RubricRow[] | null) ?? []).map(rowToRubric);
}

export async function getRubric(id: string): Promise<Rubric | null> {
  const { data, error } = await sb()
    .from('rubrics' as never)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRubric(data as RubricRow) : null;
}

export async function saveRubric(rubric: Rubric): Promise<Rubric> {
  const payload = {
    id: rubric.id,
    owner_id: rubric.owner_id,
    school_id: rubric.school_id,
    class_id: rubric.class_id,
    scope: rubric.scope,
    title: rubric.title,
    kind: rubric.kind,
    scoring: rubric.scoring,
    levels: rubric.levels,
    criteria: rubric.criteria,
    cells: rubric.cells,
    version: rubric.version,
    status: rubric.status,
    published_at: rubric.published_at,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb()
    .from('rubrics' as never)
    .upsert(payload as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToRubric(data as RubricRow);
}

export async function publishRubric(id: string): Promise<Rubric> {
  const existing = await getRubric(id);
  if (!existing) throw new Error('Rubric not found.');
  existing.status = 'published';
  existing.published_at = new Date().toISOString();
  return saveRubric(existing);
}

// association + assessment helpers below

export async function getAssociationForAssignment(
  assignmentId: string,
): Promise<RubricAssociation | null> {
  const { data, error } = await sb()
    .from('rubric_associations' as never)
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    rubric_id: String(row.rubric_id),
    rubric_version: Number(row.rubric_version ?? 1),
    assignment_id: String(row.assignment_id),
    use_for_grading: Boolean(row.use_for_grading),
    map_to_assignment: (row.map_to_assignment as MapToAssignment) ?? 'set_max',
    snapshot_id: row.snapshot_id ? String(row.snapshot_id) : null,
    snapshot: (row.snapshot as Rubric | null) ?? null,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function attachRubricToAssignment(input: {
  assignmentId: string;
  rubric: Rubric;
  useForGrading?: boolean;
  mapToAssignment?: MapToAssignment;
  setAssignmentMax?: boolean;
}): Promise<RubricAssociation> {
  const snap = snapshotRubric(input.rubric);
  if (snap.status !== 'published') {
    snap.status = 'published';
    snap.published_at = snap.published_at ?? new Date().toISOString();
  }
  const map = input.mapToAssignment ?? 'set_max';
  const payload = {
    rubric_id: input.rubric.id,
    rubric_version: input.rubric.version,
    assignment_id: input.assignmentId,
    use_for_grading: input.useForGrading ?? input.rubric.scoring.use_for_grading,
    map_to_assignment: map,
    snapshot: snap,
  };
  const { data, error } = await sb()
    .from('rubric_associations' as never)
    .upsert(payload as never, { onConflict: 'assignment_id' } as never)
    .select('*')
    .single();
  if (error) throw error;
  const assocId = String((data as { id: string }).id);
  await sb()
    .from('assignments')
    .update({ rubric_association_id: assocId } as never)
    .eq('id', input.assignmentId);

  if (input.setAssignmentMax !== false && map === 'set_max') {
    const max = snap.criteria
      .filter((c: RubricCriterion) => !c.extra_credit)
      .reduce((s: number, c: RubricCriterion) => s + (c.max_points || 0), 0);
    if (max > 0) {
      await sb().from('assignments').update({ max_score: max } as never).eq('id', input.assignmentId);
    }
  }
  return (await getAssociationForAssignment(input.assignmentId))!;
}

export async function detachRubricFromAssignment(assignmentId: string): Promise<void> {
  await sb()
    .from('assignments')
    .update({ rubric_association_id: null } as never)
    .eq('id', assignmentId);
}

function rowToAssessment(row: Record<string, unknown>): RubricAssessment {
  const cells = (Array.isArray(row.cells) ? row.cells : []) as AssessmentSelection[];
  return {
    id: String(row.id),
    association_id: String(row.association_id),
    submission_id: String(row.submission_id),
    student_id: String(row.student_id),
    selections: cells,
    cells,
    holistic_level_id: row.holistic_level_id ? String(row.holistic_level_id) : null,
    override_total: row.override_total == null ? null : Number(row.override_total),
    total_points: row.total == null ? null : Number(row.total),
    max_points: row.max_points == null ? null : Number(row.max_points),
    percent: row.percent == null ? null : Number(row.percent),
    mapped_raw_points: row.mapped_raw_points == null ? null : Number(row.mapped_raw_points),
    status: (row.status as RubricAssessment['status']) ?? 'draft',
    posted_to_gradebook: Boolean(row.posted_to_gradebook),
    source: (row.source as RubricAssessment['source']) ?? 'teacher',
    confirmed_by: row.confirmed_by ? String(row.confirmed_by) : null,
    confirmed_at: row.confirmed_at ? String(row.confirmed_at) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getAssessmentForSubmission(
  submissionId: string,
  associationId?: string,
): Promise<RubricAssessment | null> {
  let q = sb()
    .from('rubric_assessments' as never)
    .select('*')
    .eq('submission_id', submissionId);
  if (associationId) q = q.eq('association_id', associationId);
  const { data, error } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data as Record<string, unknown>);
}

export type SaveAssessmentInput = {
  association: RubricAssociation;
  submissionId: string;
  studentId: string;
  selections: AssessmentSelection[];
  holisticLevelId?: string | null;
  overrideTotal?: number | null;
  assignmentMax?: number | null;
  confirm?: boolean;
  confirmedBy?: string | null;
  writeScore?: boolean;
};

export async function saveRubricAssessment(input: SaveAssessmentInput): Promise<RubricAssessment> {
  const rubric = input.association.snapshot;
  if (!rubric) throw new Error('Association has no snapshot.');
  const scored = scoreRubric(rubric, input.selections, {
    holistic_level_id: input.holisticLevelId,
    override_total: input.overrideTotal,
  });
  const mapped = mapToAssignmentScore(
    scored,
    input.assignmentMax,
    input.association.map_to_assignment,
  );
  const now = new Date().toISOString();
  const confirm = Boolean(input.confirm);
  const payload = {
    association_id: input.association.id,
    submission_id: input.submissionId,
    student_id: input.studentId,
    cells: input.selections,
    holistic_level_id: input.holisticLevelId ?? null,
    override_total: input.overrideTotal ?? null,
    total: scored.earned,
    max_points: scored.max,
    percent: scored.percent,
    mapped_raw_points: mapped.raw_points,
    status: confirm ? 'confirmed' : 'draft',
    posted_to_gradebook: false,
    source: 'teacher',
    confirmed_by: confirm ? input.confirmedBy ?? null : null,
    confirmed_at: confirm ? now : null,
    updated_at: now,
  };
  const { data, error } = await sb()
    .from('rubric_assessments' as never)
    .upsert(payload as never, { onConflict: 'submission_id,association_id' } as never)
    .select('*')
    .single();
  if (error) throw error;

  if (
    confirm &&
    input.writeScore !== false &&
    input.association.use_for_grading &&
    rubric.scoring.use_for_grading
  ) {
    await sb()
      .from('submissions')
      .update({
        approved_score: mapped.raw_points,
        score_mark: 'numeric',
        approved_at: now,
        status: 'graded',
      } as never)
      .eq('id', input.submissionId);
    await sb()
      .from('rubric_assessments' as never)
      .update({ posted_to_gradebook: true } as never)
      .eq('id', (data as { id: string }).id);
  }

  return rowToAssessment(data as Record<string, unknown>);
}

/** Definition for family view: association snapshot only (FR-RUB-07). */
export function familyRubricDefinition(assoc: RubricAssociation | null): Rubric | null {
  if (!assoc?.snapshot) return null;
  return assoc.snapshot;
}