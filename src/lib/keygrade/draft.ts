import { normalizeKeyItems, type AnswerKeyItem } from '../assignments/keys.ts';
import { scoreKey, type ExtractMark, type ScoredKeyItem, type ScoreKeyResult } from '../assignments/scoreKey.ts';
import type { StoredHomeworkDraft } from '../gaps/api.ts';

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

/** Blank extract marks so Pack B still opens when vision extract is missing. */
export function blankExtractMarks(keyItems: AnswerKeyItem[]): ExtractMark[] {
  return normalizeKeyItems(keyItems).map((item) => ({
    n: item.n,
    extracted: null as string | null,
    confidence: 0.2,
    flag: 'blank' as const,
  }));
}

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

/**
 * Persist path for keyed homework (AC-PACKB-1).
 * Prefer teacher-confirmed packItems; otherwise seed blank extracts from the key
 * so saved-draft review still mounts Pack B Accept.
 */
export function buildKeyedHomeworkPersistDraft(input: {
  keyItems: AnswerKeyItem[];
  assignmentId: string;
  maxScore?: number | null;
  packItems?: ScoredKeyItem[] | null;
  modelTotal?: number | null;
  teacherNote?: string | null;
  studentName?: string | null;
  gaps?: StoredHomeworkDraft['gaps'];
  pageAssetIds?: string[];
  costUsd?: number | null;
  extractModel?: string | null;
  gradeKind?: StoredHomeworkDraft['gradeKind'];
}): { draft: KeyScoreModelDraft; scored: ScoreKeyResult } | null {
  const keyItems = normalizeKeyItems(input.keyItems);
  const pack = Array.isArray(input.packItems) ? input.packItems : [];
  if (!keyItems.length && !pack.length) return null;

  const extract: ExtractMark[] = pack.length
    ? pack.map((item) => ({
        n: item.n,
        extracted: item.extracted,
        confidence: item.confidence,
        flag: item.flag,
      }))
    : blankExtractMarks(keyItems);

  const { draft, scored } = buildKeyScoreDraft({
    keyItems: keyItems.length ? keyItems : pack.map((item) => ({
      n: item.n,
      answer: item.expected,
      points: item.points,
      type: item.type,
    })),
    extract,
    assignmentId: input.assignmentId,
    maxScore: input.maxScore,
    modelTotal: input.modelTotal,
    teacherNote: input.teacherNote ?? null,
    studentName: input.studentName ?? null,
    gaps: input.gaps ?? [],
    pageAssetIds: input.pageAssetIds,
    costUsd: input.costUsd ?? null,
    extractModel: input.extractModel ?? null,
  });

  const items = pack.length
    ? pack
    : scored.items.map((item) => ({ ...item, confirmed: false as const }));

  return {
    scored: { ...scored, items },
    draft: {
      ...draft,
      items,
      residuals: items.filter((item) => item.residual || item.awarded == null).length,
      draftScore: input.modelTotal != null && Number.isFinite(input.modelTotal)
        ? draft.draftScore
        : draftScoreFromItems(items, input.maxScore) ?? draft.draftScore,
      gradeKind: input.gradeKind ?? draft.gradeKind ?? 'homework',
    },
  };
}

/** Seed Pack B rows from an assignment key when draft items are missing. */
export function packItemsFromAssignmentKey(input: {
  keyItems: AnswerKeyItem[];
  assignmentId?: string | null;
  maxScore?: number | null;
  modelTotal?: number | null;
}): ScoredKeyItem[] {
  const keyItems = normalizeKeyItems(input.keyItems);
  if (!keyItems.length) return [];
  const { scored } = buildKeyScoreDraft({
    keyItems,
    extract: blankExtractMarks(keyItems),
    assignmentId: input.assignmentId ?? null,
    maxScore: input.maxScore,
    modelTotal: input.modelTotal,
  });
  return scored.items.map((item) => ({ ...item, confirmed: false }));
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

const KEY_TYPES = new Set(['mc', 'numeric', 'short', 'work']);

/** Read Pack B items from a saved capture model_draft (key_score only). */
export function keyScoreItemsFromDraft(draft: unknown): ScoredKeyItem[] {
  if (!draft || typeof draft !== 'object') return [];
  const row = draft as { method?: unknown; items?: unknown };
  if (row.method !== 'key_score' || !Array.isArray(row.items)) return [];
  const out: ScoredKeyItem[] = [];
  for (const [index, raw] of row.items.entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const n = Number.isFinite(item.n) ? Number(item.n) : index + 1;
    const type = KEY_TYPES.has(String(item.type)) ? (item.type as ScoredKeyItem['type']) : 'short';
    const expected = typeof item.expected === 'string' ? item.expected : '';
    const extracted = typeof item.extracted === 'string' ? item.extracted : item.extracted === null ? null : null;
    const points = Number.isFinite(item.points) ? Number(item.points) : 1;
    const awarded =
      item.awarded == null || item.awarded === ''
        ? null
        : Number.isFinite(Number(item.awarded))
          ? Number(item.awarded)
          : null;
    const confidence =
      typeof item.confidence === 'number' && Number.isFinite(item.confidence) ? item.confidence : null;
    const residual = Boolean(item.residual) || awarded == null;
    const flag = typeof item.flag === 'string' ? item.flag : null;
    const confirmed = Boolean(item.confirmed);
    out.push({ n, type, expected, extracted, points, awarded, confidence, residual, flag, confirmed });
  }
  return out;
}

export function keyScoreAssignmentIdFromDraft(draft: unknown): string | null {
  if (!draft || typeof draft !== 'object') return null;
  const id = (draft as { assignment_id?: unknown }).assignment_id;
  return typeof id === 'string' && id.trim() ? id : null;
}
