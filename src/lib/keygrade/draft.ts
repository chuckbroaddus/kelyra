import type { AnswerKeyItem } from '@/lib/assignments/keys';
import { scoreKey, type ExtractMark, type ScoredKeyItem, type ScoreKeyResult } from '@/lib/assignments/scoreKey';
import type { StoredHomeworkDraft } from '@/lib/gaps/api';

/** A1 §5.1 model_draft score pass — method key_score; never family-visible. */
export type KeyScoreModelDraft = StoredHomeworkDraft & {
  schema_version: 1;
  method: 'key_score';
  assignment_id?: string | null;
  extract_model?: string | null;
  items: ScoredKeyItem[];
  residuals: number;
  costUsd?: number | null;
};

export function buildKeyScoreDraft(input: {
  keyItems: AnswerKeyItem[];
  extract: ExtractMark[];
  assignmentId?: string | null;
  maxScore?: number | null;
  blankCountsZero?: boolean;
  modelTotal?: number | null;
  teacherNote?: string | null;
  studentName?: string | null;
  gaps?: StoredHomeworkDraft['gaps'];
  pageAssetIds?: string[];
  costUsd?: number | null;
  extractModel?: string | null;
}): { draft: KeyScoreModelDraft; scored: ScoreKeyResult } {
  const scored = scoreKey({
    keyItems: input.keyItems,
    extract: input.extract,
    maxScore: input.maxScore,
    blankCountsZero: input.blankCountsZero,
    modelTotal: input.modelTotal,
  });
  const draft: KeyScoreModelDraft = {
    schema_version: 1,
    method: 'key_score',
    assignment_id: input.assignmentId ?? null,
    extract_model: input.extractModel ?? null,
    items: scored.items,
    residuals: scored.residuals,
    gaps: input.gaps ?? [],
    draftScore: scored.draft_score,
    teacherNote: input.teacherNote ?? null,
    studentName: input.studentName ?? null,
    pageAssetIds: input.pageAssetIds,
    costUsd: input.costUsd ?? null,
    scoreMark: 'numeric',
  };
  return { draft, scored };
}

/** Vision `items` from evaluate-homework → extract marks (marks only; credit ignored for award). */
export function extractMarksFromVisionItems(
  items: Array<{ n?: number; seen?: string | null; expected?: string | null; credit?: number | null }> | null | undefined,
): ExtractMark[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    n: Number.isFinite(item.n) ? Number(item.n) : index + 1,
    extracted: item.seen?.trim() ? item.seen.trim() : null,
    confidence: item.seen?.trim() ? 0.7 : 0.2,
    flag: item.seen?.trim() ? null : 'blank',
  }));
}

export function applyItemOverrides(
  items: ScoredKeyItem[],
  overrides: Array<{ n: number; extracted?: string | null; awarded?: number | null; confirmed?: boolean }>,
): ScoredKeyItem[] {
  const byN = new Map(overrides.map((row) => [row.n, row]));
  return items.map((item) => {
    const over = byN.get(item.n);
    if (!over) return item;
    return {
      ...item,
      extracted: over.extracted !== undefined ? over.extracted : item.extracted,
      awarded: over.awarded !== undefined ? over.awarded : item.awarded,
      residual: over.awarded !== undefined ? over.awarded == null : item.residual,
      confirmed: over.confirmed ?? item.confirmed,
    };
  });
}

export function draftScoreFromItems(items: ScoredKeyItem[], maxScore?: number | null): number | null {
  const scored = items.filter((item) => item.awarded != null);
  if (!scored.length) return null;
  const earned = scored.reduce((sum, item) => sum + (item.awarded ?? 0), 0);
  if (maxScore != null && maxScore > 0) {
    return Math.round((earned / maxScore) * 1000) / 10;
  }
  const possible = scored.reduce((sum, item) => sum + item.points, 0);
  return possible > 0 ? Math.round((earned / possible) * 1000) / 10 : null;
}
