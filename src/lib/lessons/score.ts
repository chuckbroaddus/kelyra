import type { LessonResult } from '@/lib/lessons/protocol';

export const SKIP_MARK_IDS = new Set(['slider37', 'who']);

export type LessonScore = {
  correct: number;
  incorrect: number;
  skipped: number;
};

export type AnswerMark = {
  ok?: boolean;
  user?: unknown;
  tries?: number;
  first_ok?: boolean;
  later_corrected?: boolean;
  hints?: number;
  guesses?: unknown;
};

export function asMarkMap(marks: unknown): Record<string, AnswerMark> | null {
  if (!marks || typeof marks !== 'object' || Array.isArray(marks)) return null;
  const row = marks as Record<string, unknown>;
  const inner = row.answers;
  const source =
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : row;
  const out: Record<string, AnswerMark> = {};
  for (const [id, value] of Object.entries(source)) {
    if (SKIP_MARK_IDS.has(id)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const mark = value as AnswerMark;
    if (typeof mark.ok !== 'boolean') continue;
    out[id] = mark;
  }
  return Object.keys(out).length ? out : null;
}

function idsFromExtras(extras: Record<string, unknown> | undefined): string[] | null {
  if (!extras) return null;
  const listed = extras.item_ids;
  if (Array.isArray(listed) && listed.every((id) => typeof id === 'string') && listed.length) {
    return listed as string[];
  }
  return null;
}

/** One count per check item. Retries and the name field do not add extra incorrect. */
export function scoreFromLessonResult(result: LessonResult | null | undefined): LessonScore | null {
  if (!result) return null;
  const extras = (result.extras ?? {}) as Record<string, unknown>;
  const marks = asMarkMap(result.marks);
  const packIds = idsFromExtras(extras);

  if (packIds) {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    for (const id of packIds) {
      const mark = marks?.[id];
      if (!mark || typeof mark.ok !== 'boolean') skipped += 1;
      else if (mark.ok) correct += 1;
      else incorrect += 1;
    }
    return { correct, incorrect, skipped };
  }

  if (marks) {
    let correct = 0;
    let incorrect = 0;
    for (const mark of Object.values(marks)) {
      if (mark.ok) correct += 1;
      else incorrect += 1;
    }
    return { correct, incorrect, skipped: 0 };
  }

  if (typeof result.correct !== 'number' && typeof result.incorrect !== 'number') return null;
  return {
    correct: typeof result.correct === 'number' ? result.correct : 0,
    incorrect: typeof result.incorrect === 'number' ? result.incorrect : 0,
    skipped: 0,
  };
}
