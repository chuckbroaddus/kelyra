/**
 * GB-15 retake / multi-attempt score selection (FR-SYL-12).
 * Defaults off: empty/missing retake rule → first (or only) raw wins unchanged.
 */
import type { RetakeMethod, RetakeRule } from './types.ts';

export type AttemptInput = {
  raw: number;
  at?: string | null;
  /** Attempt index 1-based for notes. */
  index?: number;
};

export type RetakePick = {
  raw: number;
  method: RetakeMethod | 'single';
  attempt_index: number;
  attempt_count: number;
  capped: boolean;
  note: string;
};

function clampAttempts(attempts: AttemptInput[], max: number | null | undefined): AttemptInput[] {
  const list = attempts.filter((a) => a != null && Number.isFinite(a.raw));
  if (max == null || !Number.isFinite(max) || max <= 0) return list;
  return list.slice(0, Math.floor(max));
}

/** Cap a raw score so resulting percent cannot exceed cap_pct of max_points. */
export function applyRetakeCap(
  raw: number,
  max_points: number,
  cap_pct: number | null | undefined,
): { raw: number; capped: boolean } {
  if (cap_pct == null || !Number.isFinite(cap_pct) || max_points <= 0) {
    return { raw, capped: false };
  }
  const maxAllowed = (cap_pct / 100) * max_points;
  if (raw > maxAllowed) return { raw: maxAllowed, capped: true };
  return { raw, capped: false };
}

/**
 * Pick the counted raw from multiple attempts.
 * replace = last attempt; higher_of = max; average = mean of attempts.
 */
export function pickRetakeScore(
  attempts: AttemptInput[],
  rule: RetakeRule | null | undefined,
  max_points: number,
  categoryKey?: string | null,
): RetakePick | null {
  if (!attempts.length) return null;

  const enabled =
    rule != null &&
    (rule.eligible_category_ids == null ||
      rule.eligible_category_ids.length === 0 ||
      (categoryKey != null && rule.eligible_category_ids.includes(categoryKey)));

  if (!enabled || !rule) {
    const first = attempts[0]!;
    const capped = applyRetakeCap(first.raw, max_points, null);
    return {
      raw: capped.raw,
      method: 'single',
      attempt_index: first.index ?? 1,
      attempt_count: attempts.length,
      capped: false,
      note: attempts.length > 1 ? 'Retake rule off — first attempt counted' : 'Single attempt',
    };
  }

  const limited = clampAttempts(attempts, rule.attempts);
  if (!limited.length) return null;

  const method: RetakeMethod = rule.method ?? 'replace';
  let chosenRaw = limited[0]!.raw;
  let attempt_index = limited[0]!.index ?? 1;

  if (method === 'replace') {
    const last = limited[limited.length - 1]!;
    chosenRaw = last.raw;
    attempt_index = last.index ?? limited.length;
  } else if (method === 'higher_of') {
    let best = limited[0]!;
    for (const a of limited) {
      if (a.raw > best.raw) best = a;
    }
    chosenRaw = best.raw;
    attempt_index = best.index ?? limited.indexOf(best) + 1;
  } else if (method === 'average') {
    const sum = limited.reduce((s, a) => s + a.raw, 0);
    chosenRaw = sum / limited.length;
    attempt_index = limited.length;
  }

  const capped = applyRetakeCap(chosenRaw, max_points, rule.cap);
  const capNote = capped.capped && rule.cap != null ? ` (capped at ${rule.cap}%)` : '';
  const methodNote =
    method === 'replace'
      ? `Attempt ${attempt_index} of ${limited.length} (replace)`
      : method === 'higher_of'
        ? `Attempt ${attempt_index} of ${limited.length} (higher_of)`
        : `Average of ${limited.length} attempts`;

  return {
    raw: capped.raw,
    method,
    attempt_index,
    attempt_count: limited.length,
    capped: capped.capped,
    note: `${methodNote}${capNote}`,
  };
}

export function defaultRetakeRule(): RetakeRule {
  return {
    eligible_category_ids: [],
    attempts: 1,
    method: 'replace',
    cap: null,
    window_days: null,
  };
}

export function parseRetakeRule(raw: unknown): RetakeRule | null {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  // Explicit off
  if (o.enabled === false) return null;
  const method =
    o.method === 'higher_of' || o.method === 'average' || o.method === 'replace'
      ? o.method
      : null;
  const eligible = Array.isArray(o.eligible_category_ids)
    ? o.eligible_category_ids.map(String).filter(Boolean)
    : [];
  const hasAttempts = o.attempts != null && o.attempts !== '';
  const attempts = hasAttempts ? Math.max(1, Number(o.attempts) || 1) : null;
  const cap = o.cap == null || o.cap === '' ? null : Number(o.cap);
  const window_days = o.window_days == null || o.window_days === '' ? null : Number(o.window_days);
  const hasCap = cap != null && Number.isFinite(cap);
  const hasWindow = window_days != null && Number.isFinite(window_days);
  // Nothing configured → off (today's single-score behavior)
  if (
    o.enabled !== true &&
    method == null &&
    eligible.length === 0 &&
    !hasAttempts &&
    !hasCap &&
    !hasWindow
  ) {
    return null;
  }
  return {
    eligible_category_ids: eligible,
    attempts: attempts ?? 2,
    method: method ?? 'replace',
    cap: hasCap ? cap : null,
    window_days: hasWindow ? window_days : null,
  };
}
