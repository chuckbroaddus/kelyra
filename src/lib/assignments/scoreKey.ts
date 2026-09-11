/**
 * KEYGRADE score-key — pure TS award. No LLM. Ignores model totals.
 * A1 Stage 4 / GAUTH L3: scripts award; Explain never substitutes.
 */
import {
  inferKeyItemType,
  normalizeKeyItems,
  type AnswerKeyItem,
  type KeyItemType,
} from './keys.ts';

export type ExtractMark = {
  n: number;
  extracted: string | null;
  confidence?: number | null;
  flag?: string | null;
};

export type ScoredKeyItem = {
  n: number;
  type: KeyItemType;
  expected: string;
  extracted: string | null;
  points: number;
  awarded: number | null;
  confidence: number | null;
  residual: boolean;
  flag: string | null;
  confirmed?: boolean;
};

export type ScoreKeyResult = {
  method: 'key_score';
  items: ScoredKeyItem[];
  draft_score: number | null;
  residuals: number;
  /** Model-supplied totals are never used for award. */
  ignored_model_total: boolean;
};

const MC_RE = /^[a-e]$/i;
const TF_RE = /^(t|f|true|false|y|n|yes|no)$/i;

export function normalizeMc(value: string): string {
  const raw = value.trim().toLowerCase().replace(/^\(+|\)+$/g, '').replace(/\s+/g, '');
  if (TF_RE.test(raw)) {
    if (raw.startsWith('t') || raw.startsWith('y')) return 't';
    return 'f';
  }
  const letter = raw.replace(/[^a-e]/g, '');
  return letter.slice(0, 1);
}

export function normalizeNumeric(value: string): string {
  return value
    .trim()
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/%$/, '');
}

export function scoreOneItem(
  key: AnswerKeyItem,
  extract: ExtractMark | null | undefined,
  opts?: { blankCountsZero?: boolean },
): ScoredKeyItem {
  const type = inferKeyItemType(key);
  const points = key.points ?? 1;
  const extracted = extract?.extracted?.trim() ? extract.extracted.trim() : null;
  const confidence =
    typeof extract?.confidence === 'number' && Number.isFinite(extract.confidence)
      ? extract.confidence
      : null;
  const flag = extract?.flag?.trim() || null;
  const lowConf = confidence != null && confidence < 0.45;
  const residualForced =
    Boolean(key.needsTeacher) || type === 'short' || type === 'work' || Boolean(flag === 'unreadable');

  if (residualForced) {
    return {
      n: key.n,
      type,
      expected: key.answer,
      extracted,
      points,
      awarded: null,
      confidence,
      residual: true,
      flag,
    };
  }

  if (!extracted || lowConf || flag === 'blank' || flag === 'glare') {
    const awarded =
      opts?.blankCountsZero && (!extracted || flag === 'blank') && !lowConf && flag !== 'glare'
        ? 0
        : null;
    return {
      n: key.n,
      type,
      expected: key.answer,
      extracted,
      points,
      awarded,
      confidence,
      residual: awarded == null,
      flag: flag ?? (lowConf ? 'low_conf' : !extracted ? 'blank' : null),
    };
  }

  let ok = false;
  if (type === 'mc') {
    ok = normalizeMc(extracted) === normalizeMc(key.answer) && Boolean(normalizeMc(key.answer));
  } else if (type === 'numeric') {
    ok = normalizeNumeric(extracted) === normalizeNumeric(key.answer);
  }

  return {
    n: key.n,
    type,
    expected: key.answer,
    extracted,
    points,
    awarded: ok ? points : 0,
    confidence,
    residual: false,
    flag,
  };
}

/**
 * Pure score against key_items. Ignores any model draftScore / total if present on extract payload.
 */
export function scoreKey(input: {
  keyItems: AnswerKeyItem[] | null | undefined;
  extract: ExtractMark[] | null | undefined;
  maxScore?: number | null;
  blankCountsZero?: boolean;
  /** If a model total sneaks in, we note it and still compute from items. */
  modelTotal?: number | null;
}): ScoreKeyResult {
  const keys = normalizeKeyItems(input.keyItems);
  const byN = new Map((input.extract ?? []).map((row) => [row.n, row]));
  const items = keys.map((key) =>
    scoreOneItem(key, byN.get(key.n), { blankCountsZero: input.blankCountsZero }),
  );
  const scored = items.filter((item) => item.awarded != null);
  const residuals = items.filter((item) => item.residual || item.awarded == null).length;
  let draft_score: number | null = null;
  if (scored.length) {
    const earned = scored.reduce((sum, item) => sum + (item.awarded ?? 0), 0);
    if (input.maxScore != null && Number.isFinite(input.maxScore) && input.maxScore > 0) {
      draft_score = Math.round((earned / input.maxScore) * 1000) / 10;
    } else {
      const possible = scored.reduce((sum, item) => sum + item.points, 0);
      draft_score = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : null;
    }
  }
  return {
    method: 'key_score',
    items,
    draft_score,
    residuals,
    ignored_model_total: input.modelTotal != null && Number.isFinite(input.modelTotal),
  };
}

/** Detect MC-looking answers for tests / infer. */
export function looksLikeMc(answer: string): boolean {
  const n = normalizeMc(answer);
  return Boolean(n) && (MC_RE.test(n) || n === 't' || n === 'f');
}
