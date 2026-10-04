/**
 * review-submission draftScore guard (shared by Edge and the review eval).
 * Flash-Lite wrote draftScore 75 for 1-of-4-correct work. When every item has a short exact key
 * (numbers, fractions, decimals, percents) we can count correct answers ourselves; if the model's
 * score is more than SCORE_TOLERANCE off that count, the counted score wins. Free-text keys
 * ("plentiful") are never auto-graded — the model score stands.
 */
export const SCORE_TOLERANCE = 15;

export type ScoredItem = { id?: string; answerKey?: string | null };

function clean(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]\s*=\s*/, '')
    .replace(/[\s$,]/g, '')
    .replace(/\.$/, '');
}

/** Number for "5", "-10", "0.25", ".25", "5/6", "25%"; null for anything else. */
export function exactValue(v: unknown): number | null {
  const s = clean(v);
  if (!s) return null;
  let m = /^([-+]?\d*\.?\d+)%$/.exec(s);
  if (m) return Number(m[1]) / 100;
  m = /^([-+]?\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  m = /^[-+]?\d*\.?\d+$/.exec(s);
  return m ? Number(s) : null;
}

function sameAnswer(key: unknown, student: unknown): boolean {
  const k = exactValue(key);
  const a = exactValue(student);
  if (k == null || a == null) return false;
  return Math.abs(k - a) < 1e-9;
}

/** Percent correct when all (≥2) items have exact keys; otherwise null (not auto-gradable). */
export function keyedScore(items: ScoredItem[], answers: Record<string, unknown>): number | null {
  if (!Array.isArray(items) || items.length < 2) return null;
  if (!items.every((it) => exactValue(it?.answerKey) != null)) return null;
  const correct = items.filter((it, i) => sameAnswer(it.answerKey, answers[String(it.id ?? `item-${i + 1}`)])).length;
  return Math.round((100 * correct) / items.length);
}

export function reconcileDraftScore(model: number | null, keyed: number | null): number | null {
  if (keyed == null) return model;
  if (model == null) return keyed;
  return Math.abs(model - keyed) > SCORE_TOLERANCE ? keyed : model;
}
