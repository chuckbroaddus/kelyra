/**
 * Weight-total rule shared by the syllabus form, the client publish check, and the
 * import normalizer’s twin (supabase migration syllabus_publish_weights_error mirrors it).
 *
 * Regular categories must total exactly 100%. When extra credit has its own category
 * (method C), only that category may push the total over 100%; its weight is added on top.
 * Pure, relative imports only (node:test loads it directly).
 */

export type WeightCategory = {
  key?: string | null;
  label?: string | null;
  weight_percent?: number | string | null;
  active?: boolean | null;
  rules?: { extra_credit?: boolean } | Record<string, unknown> | null;
};

/** Same test as SQL public.syllabus_is_extra_credit_category(key, label, rules). */
export function isExtraCreditCategory(c: WeightCategory): boolean {
  if (c.rules && (c.rules as { extra_credit?: unknown }).extra_credit === true) return true;
  const key = String(c.key ?? '').toLowerCase();
  if (/^(extra_?credit|bonus)(_|$)/.test(key)) return true;
  return /^\s*(extra[\s_-]*credit|bonus)\b/i.test(String(c.label ?? ''));
}

export type WeightSplit = {
  /** Sum of all active weights. */
  total: number;
  /** Active weights that must total 100%. */
  regular: number;
  /** Extra-credit weight added on top of 100% (method C only; otherwise 0). */
  extraCredit: number;
  regularCount: number;
  extraCreditLabels: string[];
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function splitWeights(categories: WeightCategory[], extraCreditMethod: string | null | undefined): WeightSplit {
  const active = categories.filter((c) => c.active !== false);
  const methodC = extraCreditMethod === 'C';
  let total = 0;
  let extraCredit = 0;
  let regularCount = 0;
  const extraCreditLabels: string[] = [];
  for (const c of active) {
    const w = Number(c.weight_percent || 0);
    total += w;
    if (methodC && isExtraCreditCategory(c)) {
      extraCredit += w;
      extraCreditLabels.push(String(c.label || c.key || 'Extra credit'));
    } else {
      regularCount += 1;
    }
  }
  return {
    total: round3(total),
    regular: round3(total - extraCredit),
    extraCredit: round3(extraCredit),
    regularCount,
    extraCreditLabels,
  };
}

/** Regular weights total 100% (±0.01); with method C the extra-credit category may add more on top. */
export function weightsTotalOk(categories: WeightCategory[], extraCreditMethod: string | null | undefined): boolean {
  const s = splitWeights(categories, extraCreditMethod);
  if (s.regularCount < 1) return false;
  return Math.abs(s.regular - 100) <= 0.01;
}

/** Plain Review line, e.g. “Extra credit adds up to 10% on top of 100%.” (null when there is none). */
export function extraCreditOnTopSentence(
  categories: WeightCategory[],
  extraCreditMethod: string | null | undefined,
): string | null {
  const s = splitWeights(categories, extraCreditMethod);
  if (s.extraCredit <= 0) return null;
  return `Extra credit adds up to ${s.extraCredit}% on top of 100%.`;
}
