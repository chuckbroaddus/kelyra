/**
 * Pure coerce of model field values into SetupDraft / IngestProposal shapes.
 * No network. Used by parseIngestProposal + edge ingest-grading-doc.
 */
import { ENGINE_VALUES, ROLLUP_PRESETS } from './allowedPaths.ts';
import type {
  IngestAmbiguity,
  IngestEvidence,
  IngestField,
  IngestFieldStatus,
  IngestProposal,
  IngestWarning,
} from './proposalTypes.ts';

const ENGINE_SET = new Set<string>(ENGINE_VALUES);
const PRESET_SET = new Set<string>(ROLLUP_PRESETS);

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function slugKey(label: string, i: number): string {
  const base = String(label ?? '')
    .toLowerCase()
    .replace(/\b(grades?|work|assignments?)\b/g, ' ')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 32);
  return base || `cat_${i + 1}`;
}

function evidenceOk(ev: IngestEvidence | undefined | null): boolean {
  if (!ev) return false;
  const q = typeof ev.quote === 'string' ? ev.quote.trim() : '';
  const r = typeof ev.region === 'string' ? ev.region.trim() : '';
  if (!q && !r) return false;
  if (q && isPlaceholderQuote(q)) return false;
  return true;
}

/** Quotes that are meta / invented, not verbatim page text. */
export function isPlaceholderQuote(quote: string): boolean {
  const q = quote.trim().toLowerCase();
  if (!q) return true;
  if (
    /^(not stated|n\/?a|none|unknown|null|\(not stated\)|no quote|omitted|not on (the )?page)$/i.test(
      q,
    )
  ) {
    return true;
  }
  // Pure meta sentences the model invents when a field is missing
  if (
    /does not (state|say|specify|mention)|not (explicitly )?(stated|specified|defined)|cannot (be )?(determined|read)|unreadable|no (visible|clear) (text|evidence)/i.test(
      q,
    ) &&
    !/\d+\s*%/.test(q)
  ) {
    return true;
  }
  return false;
}

function quoteText(ev: IngestEvidence | undefined | null): string {
  if (!ev) return '';
  return typeof ev.quote === 'string' ? ev.quote : '';
}

function statusFor(conf: number, explicit: unknown): IngestFieldStatus {
  if (
    explicit === 'proposed' ||
    explicit === 'needs_review' ||
    explicit === 'unknown' ||
    explicit === 'conflict'
  ) {
    return explicit;
  }
  if (conf >= 0.8) return 'proposed';
  if (conf >= 0.5) return 'needs_review';
  return 'unknown';
}

// --- coerce helpers continue below ---
export type CoercedCategory = {
  key: string;
  label: string;
  weight_percent: number;
  drop_lowest?: number;
  min_grades?: number | null;
  empty_policy?: 'renormalize' | 'zero' | null;
};

/** Parse free-text / loose late rules into LateRule shape. */
export function coerceLateRule(raw: unknown): {
  type: 'none' | 'flat' | 'per_day' | 'per_hour';
  amount?: number;
  unit?: 'percent' | 'points';
  floor_pct?: number | null;
  hard_deadline_days?: number | null;
  grace_hours?: number;
} | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.toLowerCase().trim();
    if (!s) return null;
    if (
      /not\s*accepted|no\s*late|late\s*work\s*not|none\b|not_accepted|hard\s*deadline/.test(s) &&
      !/\d+\s*%/.test(s) &&
      !/per\s*day|per\s*hour/.test(s)
    ) {
      return { type: 'none' };
    }
    const perDay = s.match(/(-?\d+(?:\.\d+)?)\s*%?\s*(?:points?|pts?)?\s*per\s*day/);
    if (perDay || /per\s*day/.test(s)) {
      const amount = Math.abs(
        num(perDay?.[1]) ?? (s.match(/(\d+(?:\.\d+)?)/) ? Number(RegExp.$1) : 10),
      );
      const unit = /point/.test(s) ? 'points' : 'percent';
      return { type: 'per_day', amount, unit };
    }
    const perHour = s.match(/(-?\d+(?:\.\d+)?)\s*%?\s*(?:points?|pts?)?\s*per\s*hour/);
    if (perHour || /per\s*hour/.test(s)) {
      const amount = Math.abs(num(perHour?.[1]) ?? 5);
      const unit = /point/.test(s) ? 'points' : 'percent';
      return { type: 'per_hour', amount, unit };
    }
    const flat = s.match(/(?:flat|minus|−|-)?\s*(-?\d+(?:\.\d+)?)\s*(%|percent|points?|pts?)/);
    if (flat) {
      const amount = Math.abs(Number(flat[1]));
      const unit = /point/.test(flat[2]) ? 'points' : 'percent';
      return { type: 'flat', amount, unit };
    }
    if (/^none$|^not_accepted$/.test(s)) return { type: 'none' };
    return null;
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let type = typeof o.type === 'string' ? o.type.toLowerCase() : '';
  if (type === 'flat_percent' || type === 'flat_points') type = 'flat';
  if (type === 'percent_per_day' || type === 'per-day') type = 'per_day';
  if (type === 'percent_per_hour' || type === 'per-hour') type = 'per_hour';
  if (type === 'not_accepted' || type === 'no_late' || type === 'hard_deadline') type = 'none';
  if (type !== 'none' && type !== 'flat' && type !== 'per_day' && type !== 'per_hour') {
    if (o.amount != null && (o.per === 'day' || o.unit_time === 'day')) type = 'per_day';
    else if (o.amount != null && (o.per === 'hour' || o.unit_time === 'hour')) type = 'per_hour';
    else if (o.amount != null) type = 'flat';
    else return null;
  }
  const amount = num(o.amount ?? o.percent ?? o.pct);
  let unit: 'percent' | 'points' | undefined;
  if (o.unit === 'points' || o.unit === 'percent') unit = o.unit;
  else if (typeof o.unit === 'string' && /point/.test(o.unit)) unit = 'points';
  else if (typeof o.unit === 'string' && /percent|%/.test(o.unit)) unit = 'percent';
  else if (type !== 'none') unit = 'percent';
  const out: {
    type: 'none' | 'flat' | 'per_day' | 'per_hour';
    amount?: number;
    unit?: 'percent' | 'points';
    floor_pct?: number | null;
    hard_deadline_days?: number | null;
    grace_hours?: number;
  } = { type: type as 'none' | 'flat' | 'per_day' | 'per_hour' };
  if (type !== 'none' && amount != null) out.amount = Math.abs(amount);
  if (unit) out.unit = unit;
  if (o.floor_pct != null) out.floor_pct = num(o.floor_pct);
  if (o.hard_deadline_days != null) out.hard_deadline_days = num(o.hard_deadline_days);
  if (o.grace_hours != null) {
    const g = num(o.grace_hours);
    if (g != null) out.grace_hours = g;
  }
  return out;
}

export function coerceEngine(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  if (ENGINE_SET.has(s)) return s;
  if (s === 'points' || s === 'total' || s === 'point_total' || s === 'sum_points') return 'total_points';
  if (s === 'weighted' || s === 'weights' || s === 'weighted_percent' || s === 'category_weights') {
    return 'weighted_percent_inside';
  }
  if (s === 'weighted_points' || s === 'points_inside_weighted') return 'weighted_points_inside';
  if (s === 'item' || s === 'assignment_weights') return 'item_weights';
  if (s === 'sbg' || s === 'standards' || s === 'ungraded' || s === 'none') return 'none';
  return null;
}

export function coerceMissingRule(
  raw: unknown,
): 'zero' | 'floor' | 'omit' | { type: 'zero' | 'floor' | 'omit'; floor?: number } | null {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const o = raw as { type?: unknown; floor?: unknown; floor_pct?: unknown };
    const t = coerceMissingRule(o.type);
    const base = typeof t === 'string' ? t : t && typeof t === 'object' ? t.type : null;
    if (!base) return null;
    if (base === 'floor') {
      const fl = num(o.floor ?? o.floor_pct);
      if (fl != null && fl === 0) return 'zero';
      return fl != null ? { type: 'floor', floor: fl } : { type: 'floor' };
    }
    return base;
  }
  const s = String(raw).toLowerCase().trim();
  if (s === 'zero' || s === '0' || /count[s]?\s+as\s+zero|missing.*zero|zero\s+for\s+missing/.test(s)) {
    return 'zero';
  }
  if (s === 'floor' || /missing.*floor|floor\s+for\s+missing|floor\s+of\s+\d+/.test(s)) {
    const fl = s.match(/floor\s*(?:of\s*)?(\d+)/);
    if (fl && Number(fl[1]) === 0) return 'zero';
    return fl ? { type: 'floor', floor: Number(fl[1]) } : 'floor';
  }
  if (s === 'omit' || s === 'excuse' || s === 'excused' || /omit|do\s+not\s+count|excused/.test(s)) {
    return 'omit';
  }
  return null;
}

export function coerceWithinCategory(raw: unknown): 'points_inside' | 'percent_inside' | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  if (s === 'points_inside' || s === 'points' || s === 'sum_points' || s === 'total_points_inside') {
    return 'points_inside';
  }
  if (s === 'percent_inside' || s === 'percent' || s === 'average_percent' || s === 'mean_percent') {
    return 'percent_inside';
  }
  return null;
}

export function coerceCategories(raw: unknown): CoercedCategory[] | null {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list) || !list.length) return null;
  const out: CoercedCategory[] = [];
  list.forEach((row, i) => {
    if (!row || typeof row !== 'object') return;
    const o = row as Record<string, unknown>;
    const labelRaw =
      (typeof o.label === 'string' && o.label) ||
      (typeof o.name === 'string' && o.name) ||
      (typeof o.category === 'string' && o.category) ||
      (typeof o.title === 'string' && o.title) ||
      '';
    if (!labelRaw && o.weight == null && o.weight_percent == null && o.pct == null) return;
    const label = String(labelRaw || `Category ${i + 1}`);
    const keyRaw = typeof o.key === 'string' && o.key ? o.key : label;
    let w = num(o.weight_percent ?? o.weight ?? o.pct ?? o.percent);
    if (w == null) w = 0;
    const drop = num(o.drop_lowest ?? o.drop_lowest_n ?? o.drops);
    const minG = num(o.min_grades ?? o.min_grades_per_term);
    const cat: CoercedCategory = {
      key: slugKey(String(keyRaw), i),
      label,
      weight_percent: w,
    };
    if (drop != null && drop > 0) cat.drop_lowest = Math.floor(drop);
    if (minG != null) cat.min_grades = minG;
    if (o.empty_policy === 'zero' || o.empty_policy === 'renormalize') cat.empty_policy = o.empty_policy;
    out.push(cat);
  });
  if (!out.length) return null;
  // Fraction weights (sum near 1) → ×100. Never touch 90/110 sums (FR-AI-21).
  const sum = out.reduce((s, c) => s + c.weight_percent, 0);
  if (sum > 0.4 && sum <= 1.05) {
    for (const c of out) c.weight_percent = Math.round(c.weight_percent * 1000) / 10;
  }
  return out;
}

export type CategoryWeightIssue = {
  sum: number;
  /** 'off' = percent weights that miss 100; 'points' = numbers look like points, not percentages. */
  kind: 'off' | 'points';
  message: string;
  note: string;
};

function fmtNum(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * The extra-credit category. Same test as src/lib/syllabus/extraCreditWeights.ts and
 * SQL public.syllabus_is_extra_credit_category (kept inline so the edge copy stays self-contained).
 */
export function isExtraCreditCategoryLike(c: { key?: string; label?: string; rules?: unknown }): boolean {
  if (c.rules && typeof c.rules === 'object' && (c.rules as { extra_credit?: unknown }).extra_credit === true) return true;
  if (/^(extra_?credit|bonus)(_|$)/.test(String(c.key ?? '').toLowerCase())) return true;
  return /^\s*(extra[\s_-]*credit|bonus)\b/i.test(String(c.label ?? ''));
}

/**
 * Extra credit counted on top: regular categories total exactly 100% and the overage is
 * exactly the extra-credit category (e.g. Tests 60 + Quizzes 40 + Extra credit 10).
 */
export function extraCreditOnTop(
  cats: Array<{ label?: string; key?: string; weight_percent?: number | null; rules?: unknown }>,
): { regular: number; extraCredit: number; labels: string[] } | null {
  let regular = 0;
  let extraCredit = 0;
  const labels: string[] = [];
  for (const c of cats) {
    const w = typeof c.weight_percent === 'number' ? c.weight_percent : 0;
    if (isExtraCreditCategoryLike(c)) {
      extraCredit += w;
      labels.push(String(c.label || c.key || 'Extra credit'));
    } else regular += w;
  }
  if (!(extraCredit > 0) || Math.abs(regular - 100) > 0.01) return null;
  return { regular: Math.round(regular * 1000) / 1000, extraCredit: Math.round(extraCredit * 1000) / 1000, labels };
}

/**
 * FR-AI-21: category weights that don't total 100% are kept exactly as written (never scaled)
 * and flagged in plain words. Points-based engines ('total_points', 'none') have no weights to check.
 * An extra-credit category on top of a 100% total is fine unless the document picks a different
 * extra-credit method (A or B), which can't count a category on top.
 */
export function categoryWeightIssue(
  cats: Array<{ label?: string; key?: string; weight_percent?: number | null; rules?: unknown }>,
  engine: string | null,
  extraCreditMethod: string | null = null,
): CategoryWeightIssue | null {
  if (engine === 'total_points' || engine === 'none') return null;
  const weighted = cats.filter((c) => typeof c.weight_percent === 'number' && c.weight_percent > 0);
  if (!weighted.length) return null;
  const sum = Math.round(weighted.reduce((s, c) => s + (c.weight_percent as number), 0) * 1000) / 1000;
  if (Math.abs(sum - 100) <= 0.01) return null;
  const name = (c: { label?: string; key?: string }) => String(c.label || c.key || 'Category');
  if (sum > 200) {
    const parts = weighted.map((c) => `${name(c)} ${fmtNum(c.weight_percent as number)}`).join(' + ');
    return {
      sum,
      kind: 'points',
      message: `These numbers add up to ${fmtNum(sum)}, not 100%. They look like points, not percentages. If this class adds up points, choose “Total points”. Otherwise change them to percentages that total 100% before publishing.`,
      note: `${parts} = ${fmtNum(sum)}. We kept the numbers as written.`,
    };
  }
  const parts = weighted.map((c) => `${name(c)} ${fmtNum(c.weight_percent as number)}%`).join(' + ');
  const onTop = extraCreditOnTop(weighted);
  if (onTop) {
    if (extraCreditMethod == null || extraCreditMethod === 'C') return null;
    return {
      sum,
      kind: 'off',
      message: `These weights add up to ${fmtNum(sum)}% because ${onTop.labels.join(' and ')} (${fmtNum(onTop.extraCredit)}%) is listed as a category. To count it on top of 100%, choose “Extra credit has its own category”. Otherwise fix the weights so they total 100% before publishing.`,
      note: `${parts} = ${fmtNum(sum)}%. We kept the numbers as written. Without ${onTop.labels.join(' and ')} they total 100%.`,
    };
  }
  return {
    sum,
    kind: 'off',
    message: `These weights add up to ${fmtNum(sum)}%. Fix them so they total 100% before publishing.`,
    note: `${parts} = ${fmtNum(sum)}%. We kept the numbers as written.`,
  };
}

/** Model-written notes about the weight total (e.g. “Weights currently total 110% — do not auto-fix”). */
function isModelWeightTotalWarning(w: IngestWarning): boolean {
  if (w.code === 'weights_total') return false;
  const code = String(w.code || '').toLowerCase();
  if (/weight/.test(code) && /(sum|total|mismatch|100)/.test(code)) return true;
  return /weights?\b[^.]*\b(total|sum|add)/i.test(String(w.message || '')) && /\d+(\.\d+)?\s*%/.test(String(w.message || ''));
}

/** True when retake text names more than one way to count the retake (replace / higher / average). */
export function retakeTextConflicts(text: string): boolean {
  const t = text.toLowerCase();
  const kinds = [
    /replac|new\s+score|overwrit/.test(t),
    /higher|highest|best\s+(score|grade)|keep\s*(the\s*)?highest/.test(t),
    /\baverag|\bavg\b|\bmean\b/.test(t),
  ].filter(Boolean).length;
  return kinds > 1;
}

const RETAKE_NONE_RE = /\bno\s+(retakes?|redos?|re-?tests?)\b|\b(retakes?|redos?|re-?tests?)\s+(are\s+|is\s+)?not\s+(allowed|offered|accepted|permitted)/;
/** Document says retakes are off (“No retakes”, {enabled:false}). */
export function isNoRetake(raw: unknown): boolean {
  if (typeof raw === 'string') return RETAKE_NONE_RE.test(raw.toLowerCase());
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return o.enabled === false || o.allowed === false;
  }
  return false;
}

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };

function retakeFromText(raw: string): Record<string, unknown> | null {
  const s = raw.toLowerCase();
  if (RETAKE_NONE_RE.test(s)) return null;
  if (retakeTextConflicts(s)) return null;
  const capM = s.match(/(?:cap(?:ped)?|max(?:imum)?|up\s+to|no\s+higher\s+than)\s*(?:at|of)?\s*(\d+(?:\.\d+)?)/);
  const method = /higher|highest|best|keep\s*highest/.test(s)
    ? 'higher_of'
    : /replac|new\s+score|overwrit/.test(s)
      ? 'replace'
      : /\baverag|\bavg\b|\bmean\b/.test(s)
        ? 'average'
        : capM
          ? 'higher_of'
          : null;
  if (!method) return null;
  const attM = s.match(/\b(\d+|one|two|three|four)\s+(?:retakes?|attempts?|redos?|re-?tests?)\b/);
  const attempts = attM ? (WORD_NUM[attM[1]!] ?? Number(attM[1])) : 1;
  const winM = s.match(/within\s+(\d+)\s*(?:school\s+)?days?/);
  return {
    eligible_category_ids: [],
    attempts: Math.max(1, Math.floor(attempts || 1)),
    method,
    cap: capM ? Number(capM[1]) : null,
    window_days: winM ? Number(winM[1]) : null,
  };
}

export function coerceRetake(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return retakeFromText(raw);
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.enabled === false || o.allowed === false) return null;
  let method = typeof o.method === 'string' ? o.method.toLowerCase() : '';
  if (method === 'highest' || method === 'max' || method === 'higher' || method === 'keep_highest') {
    method = 'higher_of';
  }
  if (method === 'overwrite') method = 'replace';
  if (method === 'mean' || method === 'avg') method = 'average';
  if (method !== 'replace' && method !== 'higher_of' && method !== 'average') {
    if (o.keep_highest || o.higher_of) method = 'higher_of';
    else if (o.replace) method = 'replace';
    else if (o.cap != null) method = 'higher_of';
    else return null;
  }
  const attempts = num(o.attempts ?? o.max_attempts) ?? 1;
  const cap = o.cap == null ? null : num(o.cap);
  const eligible = Array.isArray(o.eligible_category_ids)
    ? o.eligible_category_ids.map(String)
    : Array.isArray(o.categories)
      ? o.categories.map(String)
      : [];
  return {
    eligible_category_ids: eligible,
    attempts: Math.max(1, Math.floor(attempts)),
    method,
    cap,
    window_days: o.window_days == null ? null : num(o.window_days),
  };
}

export function coerceQpMethod(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'numeric_band' || s === 'band' || s === 'numeric' || s === 'bands') return 'numeric_band';
  if (s === 'letter_map' || s === 'letter') return 'letter_map';
  if (s === 'percent_map' || s === 'percent') return 'percent_map';
  return s || null;
}

const LEVEL_SYNONYMS: Array<{ key: string; label: string; bonus: number; re: RegExp }> = [
  { key: 'ap', label: 'AP', bonus: 1, re: /^(ap|a\.p\.|advanced\s*placement)$/i },
  { key: 'ib_hl', label: 'IB HL', bonus: 1, re: /^(ib[_\s-]?hl|ib\s*higher(\s*level)?|higher\s*level)$/i },
  { key: 'ib_sl', label: 'IB SL', bonus: 0.5, re: /^(ib[_\s-]?sl|ib\s*standard(\s*level)?|standard\s*level)$/i },
  { key: 'preap', label: 'Pre-AP', bonus: 0.5, re: /^(pre[_\s-]?ap|pre[_\s-]?ib|preap)$/i },
  { key: 'honors', label: 'Honors', bonus: 0.5, re: /^(honors?|advanced|h)$/i },
  {
    key: 'dual_credit',
    label: 'Dual Credit',
    bonus: 1,
    re: /^(dual([_\s-]?credit|[_\s-]?enrollment)?|dc|de)$/i,
  },
  { key: 'onramps', label: 'OnRamps', bonus: 1, re: /^(on[_\s-]?ramps?)$/i },
  { key: 'modified', label: 'Modified', bonus: -0.5, re: /^(modified|applied|fundamentals)$/i },
  { key: 'local', label: 'Local credit', bonus: 0, re: /^(local([_\s-]?credit)?)$/i },
  {
    key: 'regular',
    label: 'Regular',
    bonus: 0,
    re: /^(regular|on[_\s-]?level|onlevel|level|standard|college\s*prep|cp)$/i,
  },
];

export function coerceCourseLevelKey(raw: string): {
  key: string;
  label: string;
  weighted_bonus: number;
} {
  const s = raw.trim();
  for (const row of LEVEL_SYNONYMS) {
    if (row.re.test(s) || row.re.test(s.replace(/\s+/g, '_')) || row.re.test(s.replace(/\s+/g, ''))) {
      return { key: row.key, label: row.label, weighted_bonus: row.bonus };
    }
  }
  // partial contains
  const lower = s.toLowerCase();
  if (/\bib\b/.test(lower) && /\bhl\b|higher/.test(lower)) {
    return { key: 'ib_hl', label: 'IB HL', weighted_bonus: 1 };
  }
  if (/\bib\b/.test(lower) && /\bsl\b|standard/.test(lower)) {
    return { key: 'ib_sl', label: 'IB SL', weighted_bonus: 0.5 };
  }
  if (/pre[-\s]?ap|pre[-\s]?ib/.test(lower)) return { key: 'preap', label: 'Pre-AP', weighted_bonus: 0.5 };
  if (/\bap\b|advanced placement/.test(lower)) return { key: 'ap', label: 'AP', weighted_bonus: 1 };
  if (/honors|advanced/.test(lower)) return { key: 'honors', label: 'Honors', weighted_bonus: 0.5 };
  if (/dual|onramps|on-ramps/.test(lower)) {
    if (/onramp/.test(lower)) return { key: 'onramps', label: 'OnRamps', weighted_bonus: 1 };
    return { key: 'dual_credit', label: 'Dual Credit', weighted_bonus: 1 };
  }
  if (/modified|applied/.test(lower)) return { key: 'modified', label: 'Modified', weighted_bonus: -0.5 };
  if (/local/.test(lower)) return { key: 'local', label: 'Local credit', weighted_bonus: 0 };
  if (/regular|on[-\s]?level|on level/.test(lower)) {
    return { key: 'regular', label: 'Regular', weighted_bonus: 0 };
  }
  return { key: slugKey(s, 0), label: s, weighted_bonus: 0 };
}

export function coerceLevelsList(
  raw: unknown,
): Array<{ key: string; label: string; weighted_bonus: number }> | null {
  if (raw == null) return null;
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      list = raw.split(/[,;|/]/).map((x) => x.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(list) || !list.length) return null;
  const out: Array<{ key: string; label: string; weighted_bonus: number }> = [];
  const seen = new Set<string>();
  list.forEach((row, i) => {
    if (typeof row === 'string') {
      const c = coerceCourseLevelKey(row);
      if (seen.has(c.key)) return;
      seen.add(c.key);
      out.push(c);
      return;
    }
    if (!row || typeof row !== 'object') return;
    const o = row as Record<string, unknown>;
    const label = String(o.label ?? o.name ?? o.key ?? `Level ${i + 1}`);
    const fromLabel = coerceCourseLevelKey(label);
    const keyRaw = typeof o.key === 'string' && o.key ? o.key : fromLabel.key;
    const mapped = coerceCourseLevelKey(String(keyRaw));
    const key = mapped.key !== slugKey(String(keyRaw), i) || LEVEL_SYNONYMS.some((x) => x.re.test(String(keyRaw)))
      ? mapped.key
      : fromLabel.key;
    const bonus =
      num(o.weighted_bonus ?? o.bonus ?? o.points) ??
      (key === fromLabel.key ? fromLabel.weighted_bonus : mapped.weighted_bonus);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      key,
      label: label || mapped.label || fromLabel.label,
      weighted_bonus: bonus,
    });
  });
  return out.length ? out : null;
}

function levelKeyFromHeader(h: string): string {
  return coerceCourseLevelKey(h).key;
}

/**
 * Normalize numeric-band / quality-point charts into row list:
 * { min_pct, max_pct, points_by_level } — never a flat +1.0 bonus guess.
 */
export function coerceQpTables(raw: unknown): Array<{
  min_pct: number;
  max_pct: number;
  points_by_level: Record<string, number>;
}> | null {
  if (raw == null) return null;
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  // Single table object with rows/bands
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    const o = list as Record<string, unknown>;
    if (Array.isArray(o.rows)) list = o.rows;
    else if (Array.isArray(o.bands)) list = o.bands;
    else if (Array.isArray(o.tables)) {
      const nested: unknown[] = [];
      for (const t of o.tables) {
        if (t && typeof t === 'object') {
          const to = t as Record<string, unknown>;
          if (Array.isArray(to.bands)) nested.push(...to.bands);
          else if (Array.isArray(to.rows)) nested.push(...to.rows);
          else nested.push(t);
        }
      }
      list = nested;
    }
  }
  if (!Array.isArray(list) || !list.length) return null;

  const rows: Array<{ min_pct: number; max_pct: number; points_by_level: Record<string, number> }> =
    [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;

    // Nested table with bands
    if (Array.isArray(o.bands)) {
      const nested = coerceQpTables(o.bands);
      if (nested) rows.push(...nested);
      continue;
    }
    if (Array.isArray(o.rows) && o.min == null && o.min_pct == null) {
      const nested = coerceQpTables(o.rows);
      if (nested) rows.push(...nested);
      continue;
    }

    const min = num(o.min_pct ?? o.min ?? o.low ?? o.from);
    const max = num(o.max_pct ?? o.max ?? o.high ?? o.to);
    if (min == null || max == null) continue;

    const points_by_level: Record<string, number> = {};
    const ptsObj =
      o.points_by_level && typeof o.points_by_level === 'object'
        ? (o.points_by_level as Record<string, unknown>)
        : o.points && typeof o.points === 'object'
          ? (o.points as Record<string, unknown>)
          : null;

    if (ptsObj) {
      for (const [k, v] of Object.entries(ptsObj)) {
        const n = num(v);
        if (n == null) continue;
        points_by_level[levelKeyFromHeader(k)] = n;
      }
    }

    // Flat level columns on the row
    for (const [k, v] of Object.entries(o)) {
      if (
        /^(min|max|min_pct|max_pct|low|high|from|to|letter|points|points_by_level|bands|rows)$/i.test(
          k,
        )
      ) {
        continue;
      }
      const n = num(v);
      if (n == null) continue;
      if (
        /regular|honors|preap|pre_ap|ap|ib|dual|onramp|modified|local|on_level|onlevel/i.test(k) ||
        LEVEL_SYNONYMS.some((x) => x.re.test(k))
      ) {
        points_by_level[levelKeyFromHeader(k)] = n;
      }
    }

    if (!Object.keys(points_by_level).length) continue;
    rows.push({ min_pct: min, max_pct: max, points_by_level });
  }

  return rows.length ? rows : null;
}

/** Map custom rollup weights onto a preset enum when they match. */
export function mapCustomWeightsToPreset(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string' && PRESET_SET.has(raw)) return raw;
  if (typeof raw !== 'object') {
    if (typeof raw === 'string') {
      const s = raw.toLowerCase();
      if (/2\s*\/\s*7/.test(s) && /1\s*\/\s*7/.test(s)) return '2/7+1/7';
      if (/40\s*\/\s*40\s*\/\s*20/.test(s)) return '40/40/20';
      if (/50\s*\/\s*50/.test(s)) return '50/50';
    }
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.preset === 'string' && PRESET_SET.has(o.preset)) return o.preset;
  const periods = Array.isArray(o.periods) ? o.periods.map((x) => num(x) ?? 0) : null;
  const exam = num(o.exam ?? o.exam_weight ?? o.final);
  const den = num(o.denominator ?? o.den);
  if (periods && periods.length >= 2 && exam != null) {
    const p0 = periods[0]!;
    if (periods.every((p) => Math.abs(p - p0) < 0.01) && den != null) {
      if (Math.abs(p0 - 2) < 0.01 && Math.abs(exam - 1) < 0.01 && Math.abs(den - 7) < 0.01) {
        return '2/7+1/7';
      }
      if (Math.abs(p0 - 3) < 0.01 && Math.abs(exam - 1) < 0.01 && Math.abs(den - 7) < 0.01) {
        return '3/7+3/7+1/7';
      }
    }
  }
  const w = Array.isArray(o.weights) ? o.weights.map((x) => num(x) ?? 0) : periods;
  if (w && w.length === 3) {
    const [a, b, c] = w;
    if (a === 40 && b === 40 && c === 20) return '40/40/20';
    if (a === 45 && b === 45 && c === 10) return '45/45/10';
  }
  if (w && w.length === 2) {
    const [a, b] = w;
    if (a === 50 && b === 50) return '50/50';
    if (a === 85 && b === 15) return '85/15';
  }
  if (w && w.length === 4 && w.every((x) => x === 25)) return '25x4';
  const blob = JSON.stringify(o).toLowerCase();
  if (/2\s*\/\s*7/.test(blob) && /1\s*\/\s*7/.test(blob)) return '2/7+1/7';
  if (/40\s*\/\s*40\s*\/\s*20/.test(blob)) return '40/40/20';
  if (/50\s*\/\s*50/.test(blob)) return '50/50';
  return null;
}

export function coerceRollupPreset(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (PRESET_SET.has(s)) return s;
    const compact = s.replace(/\s+/g, '');
    if (PRESET_SET.has(compact)) return compact;
    if (/2\/7/.test(s) && /1\/7/.test(s)) return '2/7+1/7';
    if (/40\/40\/20/.test(s)) return '40/40/20';
    if (/45\/45\/10/.test(s)) return '45/45/10';
    if (/50\/50/.test(s)) return '50/50';
    if (/year.?mean|simple\s+average|average\s+of\s+periods/.test(s.toLowerCase())) return 'year_mean';
    return mapCustomWeightsToPreset(raw);
  }
  if (typeof raw === 'object') return mapCustomWeightsToPreset(raw);
  return null;
}

export function coerceCalendarTemplate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    tx_six_weeks: 'tx_six_weeks',
    six_weeks: 'tx_six_weeks',
    six_week: 'tx_six_weeks',
    '6_weeks': 'tx_six_weeks',
    texas_six_weeks: 'tx_six_weeks',
    nine_weeks: 'nine_weeks',
    '9_weeks': 'nine_weeks',
    trimester: 'trimester',
    college_term: 'college_term',
    college: 'college_term',
    semester: 'semester',
    elementary_year_4: 'elementary_year_4',
    elementary_year_6: 'elementary_year_6',
  };
  return map[s] ?? null;
}

export function coercePeriodModel(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  if (s === 'six_weeks' || s === 'six_week' || s === '6_weeks' || s === 'tx_six_weeks') return 'six_weeks';
  if (s === 'nine_weeks' || s === '9_weeks') return 'nine_weeks';
  if (s === 'trimester' || s === 'semester' || s === 'year' || s === 'college' || s === 'custom') return s;
  return null;
}

function looksMixedDocument(proposal: {
  document_kind_guess?: string | null;
  fields: IngestField[];
  warnings: IngestWarning[];
  ambiguities: IngestAmbiguity[];
}): boolean {
  const guess = (proposal.document_kind_guess || '').toLowerCase();
  if (guess === 'mixed' || guess.includes('two_doc') || guess.includes('multi')) return true;
  for (const w of proposal.warnings || []) {
    if (!w || typeof w !== 'object') continue;
    const m = `${w.code ?? ''} ${w.message ?? ''}`.toLowerCase();
    if (/mixed|two\s+(syllabi|documents|policies)|multiple\s+documents|two\s+classes/.test(m)) {
      return true;
    }
  }
  const title = proposal.fields.find((f) => f.path === 'syllabus.title' || f.path === 'school.notes');
  if (title && typeof title.value === 'string') {
    const t = title.value;
    // Require two syllabus words — do not treat "PE / Athletics — Ms. Brooks" as mixed
    if (/\bsyllabus\b.*\bsyllabus\b/i.test(t)) return true;
    if (/\bhandbook\b.*\bhandbook\b/i.test(t)) return true;
  }
  return false;
}

/** True when the model (or guess) says this is not a syllabus / grading handbook. */
export function looksWrongGradingDocument(proposal: {
  kind?: string | null;
  wizard?: string | null;
  document_kind_guess?: string | null;
  fields?: IngestField[];
  warnings?: IngestWarning[];
  ambiguities?: IngestAmbiguity[];
}): { hit: boolean; code: string; message: string } {
  const kind = proposal.kind === 'school_policy' || proposal.wizard === 'school' ? 'school_policy' : 'syllabus';
  const guess = String(proposal.document_kind_guess || '').toLowerCase();
  const blobs = [
    guess,
    ...(proposal.warnings || []).map((w) => `${w?.code ?? ''} ${w?.message ?? ''}`),
    ...(proposal.ambiguities || []).map((a) => `${a?.code ?? ''} ${a?.message ?? ''}`),
  ]
    .join('\n')
    .toLowerCase();

  const codeHit =
    /not_a_syllabus|non_syllabus|not_a_handbook|non_handbook|wrong_document|not_grading|not_policy/.test(
      blobs,
    );
  const msgHit =
    /not a (course |class )?syllabus|not a (grading |school )?policy|not a handbook|cafeteria|weekly menu|fundraiser|pto flyer|not grading|menu,? not|flyer,? not|announcement,? not/.test(
      blobs,
    );
  if (!codeHit && !msgHit) return { hit: false, code: '', message: '' };

  if (kind === 'school_policy') {
    return {
      hit: true,
      code: 'not_a_handbook',
      message:
        'This image is not a school grading or reporting policy. Photograph the handbook grading pages instead.',
    };
  }
  return {
    hit: true,
    code: 'not_a_syllabus',
    message:
      'This image is not a course syllabus or class grading contract. Photograph the syllabus instead.',
  };
}

/**
 * Coerce every field value; drop filled values with no evidence;
 * mixed-doc → empty fields + block warning (FR-AI-13).
 * Wrong-document (menu/flyer/etc.) → empty fields + block warning.
 */
export function normalizeProposalFields(proposal: IngestProposal): IngestProposal {
  const warnings = [...proposal.warnings];
  const ambiguities = [...proposal.ambiguities];
  const fields = [...proposal.fields];
  const document_kind_guess = proposal.document_kind_guess;

  const wrongDoc = looksWrongGradingDocument({
    kind: proposal.kind,
    wizard: proposal.wizard,
    document_kind_guess,
    fields,
    warnings,
    ambiguities,
  });
  if (wrongDoc.hit) {
    const kept = warnings.filter((w) => {
      if (!w || typeof w !== 'object') return false;
      const blob = `${w.code ?? ''} ${w.message ?? ''}`.toLowerCase();
      return !/not_a_syllabus|non_syllabus|not_a_handbook|non_handbook|wrong_document|not_grading|not_policy|cafeteria|fundraiser|weekly menu/.test(
        blob,
      );
    });
    kept.push({
      code: wrongDoc.code,
      message: wrongDoc.message,
      severity: 'block',
    });
    return {
      ...proposal,
      fields: [],
      ambiguities: [],
      warnings: kept,
      document_kind_guess: document_kind_guess || 'unknown',
      overall_confidence: 0,
    };
  }

  if (looksMixedDocument({ document_kind_guess, fields, warnings, ambiguities })) {
    const filledCount = fields.filter((f) => f.value != null && f.value !== '').length;
    const guessMixed = (document_kind_guess || '').toLowerCase() === 'mixed';
    // Keep substantial extracts — model sometimes labels single handbooks "mixed"
    if (filledCount >= 2) {
      warnings.push({
        code: 'mixed_document_review',
        message:
          'Document may mix topics; review extracted fields carefully. Photograph pages separately if two policies are on one page.',
        severity: 'warn',
      });
      // fall through to normal coerce (do not wipe)
    } else {
      warnings.push({
        code: 'mixed_document',
        message:
          'This image looks like two documents or two class policies on one page. Retake: photograph each syllabus or handbook page separately.',
        severity: 'block',
      });
      return {
        ...proposal,
        fields: [],
        ambiguities: [
          ...ambiguities,
          {
            code: 'mixed_document',
            message: 'Separate the documents and scan again.',
            paths: [],
            choices: ['retake_separate_pages'],
          },
        ],
        warnings,
        document_kind_guess: document_kind_guess || 'mixed',
        overall_confidence: Math.min(proposal.overall_confidence, 0.2),
      };
    }
    void guessMixed;
  }

  const out: IngestField[] = [];
  const noRetakeFields = new Set<IngestField>();
  let derivedPreset: IngestField | null = null;
  let derivedPeriod: IngestField | null = null;
  let pendingLateFloor: number | null = null;
  let pendingLateFloorEv: IngestEvidence | null = null;
  let pendingLateFloorSrc: string | null = null;
  let pendingMissingFloor: number | null = null;
  let pendingMissingFloorEv: IngestEvidence | null = null;
  let pendingMissingFloorSrc: string | null = null;

  for (const f of fields) {
    const path = f.path;
    let value: unknown = f.value;
    let confidence = f.confidence;
    let status = f.status;
    const ev = f.evidence;

    if (value != null && value !== '' && !evidenceOk(ev) && status !== 'unknown') {
      warnings.push({
        code: 'dropped_no_evidence',
        message: `Dropped ${path}: no evidence quote on page.`,
        severity: 'info',
      });
      continue;
    }

    switch (path) {
      case 'syllabus.late_rule': {
        const lr = coerceLateRule(value);
        if (lr) value = lr;
        else if (value != null && typeof value === 'object' && !Array.isArray(value)) {
          const o = value as Record<string, unknown>;
          // floor-only objects from model
          const fl = num(o.floor_pct ?? o.floor);
          if (fl != null && o.type == null) {
            value = { type: 'none', floor_pct: fl };
          } else {
            status = 'needs_review';
            confidence = Math.min(confidence, 0.6);
          }
        } else if (value != null) {
          status = 'needs_review';
          confidence = Math.min(confidence, 0.6);
        }
        break;
      }
      case 'syllabus.engine': {
        const eng = coerceEngine(value);
        if (eng) {
          value = eng;
          const q = quoteText(ev).toLowerCase();
          const strong =
            /total\s*points|weighted|percent-?inside|points-?inside|item\s*weight|no\s*overall|ungrad|sbg|standards/.test(
              q,
            );
          if (!strong && eng !== 'total_points') {
            confidence = Math.min(confidence, 0.72);
            status = 'needs_review';
          }
        } else if (value != null) {
          status = 'needs_review';
          confidence = Math.min(confidence, 0.55);
        }
        break;
      }
      case 'syllabus.within_category': {
        const w = coerceWithinCategory(value);
        value = w;
        if (w == null) {
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
          if (!ambiguities.some((a) => a.code === 'within_category')) {
            ambiguities.push({
              code: 'within_category',
              message: 'Document does not clearly say how items combine inside a category.',
              paths: ['syllabus.within_category'],
              choices: ['points_inside', 'percent_inside'],
            });
          }
        }
        break;
      }
      case 'syllabus.categories': {
        const cats = coerceCategories(value);
        if (cats) value = cats;
        break;
      }
      case 'syllabus.retake': {
        // Two different retake rules in one document → let the teacher pick, never guess.
        const retakeText = typeof value === 'string' ? value : quoteText(ev);
        if (retakeTextConflicts(retakeText)) {
          value = null;
          status = 'conflict';
          confidence = Math.min(confidence, 0.4);
          ambiguities.push({
            code: 'retake_method',
            message: 'The document gives more than one retake rule (for example “replaces” and “keep the higher score”).',
            paths: ['syllabus.retake'],
            choices: ['replace', 'higher_of', 'average'],
          });
          break;
        }
        value = coerceRetake(value);
        break;
      }
      case 'syllabus.missing_rule': {
        const q = quoteText(ev).toLowerCase();
        // Hard deadline / late language is not a missing-work rule
        if (/hard\s*deadline|no work accepted after|after the unit|late work/.test(q) && !/missing/.test(q)) {
          value = null;
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
          break;
        }
        const m = coerceMissingRule(value);
        if (m) value = m;
        else if (value != null) {
          warnings.push({
            code: 'unmapped_missing_rule',
            message: 'Could not map missing rule; left empty.',
            severity: 'info',
          });
          value = null;
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
        }
        break;
      }
      case 'syllabus.floor': {
        const q = quoteText(ev).toLowerCase();
        // Late floor belongs on late_rule.floor_pct, not period floor
        if (/late/.test(q) && /floor/.test(q) && !/period|average|marking|six-?week|report/.test(q)) {
          const fl = num(value);
          if (fl != null) {
            // Stash via synthetic late patch after loop using warnings side channel
            (f as IngestField & { _late_floor?: number })._late_floor = fl;
          }
          value = null;
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
          break;
        }
        // "Missing work uses a floor of 50" is missing_rule, not period floor
        if (
          /missing/.test(q) &&
          /floor/.test(q) &&
          !/period|average|marking|six-?week|report|semester/.test(q)
        ) {
          const fl = num(value);
          if (fl != null) {
            (f as IngestField & { _missing_floor?: number })._missing_floor = fl;
          }
          value = null;
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
          break;
        }
        value = num(value);
        break;
      }
      case 'syllabus.title': {
        if (typeof value === 'string') {
          const quote = quoteText(ev).trim();
          // Prefer the fuller verbatim title from evidence when the model truncated it
          if (
            quote &&
            quote.length > value.length &&
            !isPlaceholderQuote(quote) &&
            quote.toLowerCase().includes(value.toLowerCase().slice(0, 8))
          ) {
            value = quote.replace(/\s+/g, ' ').trim().slice(0, 160);
          }
        }
        break;
      }
      case 'syllabus.ceiling':
      case 'syllabus.ec_cap':
      case 'syllabus.exam_weight':
      case 'credit.passing_threshold':
      case 'scale.passing_pct': {
        value = num(value);
        break;
      }
      case 'credit.year_link': {
        if (typeof value === 'string') {
          const s = value.toLowerCase().trim();
          if (/^(true|yes|1|paired|required|both|year.?link)$/.test(s) || /pair|both\s+must|fall and spring/.test(s)) {
            value = true;
          } else if (/^(false|no|0|independent|separate)$/.test(s)) {
            value = false;
          }
        } else if (value === 1) value = true;
        else if (value === 0) value = false;
        break;
      }
      case 'syllabus.extra_credit_method': {
        if (value != null) {
          const s = String(value).toUpperCase().trim();
          value = s === 'A' || s === 'B' || s === 'C' ? s : null;
        }
        break;
      }
      case 'syllabus.rollup_preset':
      case 'rollup.preset': {
        const p = coerceRollupPreset(value);
        if (p) value = p;
        else if (value != null) {
          // Invalid invent like texas_70_pass
          value = null;
          status = 'unknown';
          confidence = Math.min(confidence, 0.35);
        }
        break;
      }
      case 'calendar.template': {
        const t = coerceCalendarTemplate(value);
        if (t) value = t;
        break;
      }
      case 'calendar.period_model': {
        const p = coercePeriodModel(value);
        if (p) value = p;
        break;
      }
      case 'rollup.custom_weights': {
        const preset = mapCustomWeightsToPreset(value);
        if (preset) {
          derivedPreset = {
            path: 'rollup.preset',
            value: preset,
            confidence,
            evidence: ev,
            status: statusFor(confidence, status),
            source_doc_id: f.source_doc_id,
          };
          continue;
        }
        break;
      }
      case 'qp.method': {
        const m = coerceQpMethod(value);
        if (m) value = m;
        break;
      }
      case 'qp.tables': {
        const tables = coerceQpTables(value);
        if (tables) {
          value = tables;
          // Ensure method accompanies tables
          if (!fields.some((x) => x.path === 'qp.method' && x.value != null)) {
            // will add after loop if missing
          }
        } else if (value != null) {
          status = 'needs_review';
          confidence = Math.min(confidence, 0.55);
        }
        break;
      }
      case 'levels.list': {
        const levels = coerceLevelsList(value);
        if (levels) value = levels;
        break;
      }
      case 'gpa.include': {
        if (typeof value === 'string') {
          const s = value.toLowerCase();
          const cleaned: Record<string, boolean> = {};
          if (/exclud|not\s+(counted|included)|omit/.test(s)) {
            if (/recovery/.test(s)) cleaned.recovery = false;
            if (/pre[-_\s]?9|pre[-_\s]?grade|before\s+grade\s*9/.test(s)) cleaned.pre_9 = false;
            if (/\bpe\b|physical\s*ed/.test(s)) cleaned.pe = false;
            if (/pass[\s/-]*fail|p\s*\/\s*f/.test(s)) cleaned.pass_fail = false;
            if (/\bcbe\b|credit\s*by\s*exam/.test(s)) cleaned.cbe = false;
            value = Object.keys(cleaned).length
              ? cleaned
              : { recovery: false, pre_9: false };
          } else {
            if (/recovery/.test(s)) cleaned.recovery = true;
            if (/pre[-_\s]?9|pre[-_\s]?grade|before\s+grade\s*9/.test(s)) cleaned.pre_9 = true;
            if (/\bpe\b|physical\s*ed/.test(s) && /includ/.test(s)) cleaned.pe = true;
            if (/\bpe\b|physical\s*ed/.test(s) && /exclud/.test(s)) cleaned.pe = false;
            value = Object.keys(cleaned).length ? cleaned : { recovery: false, pre_9: false };
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          const o = value as Record<string, unknown>;
          const outInc: Record<string, unknown> = {};
          if ('recovery' in o) outInc.recovery = Boolean(o.recovery);
          if ('pre_9' in o) outInc.pre_9 = Boolean(o.pre_9);
          else if ('pre9' in o) outInc.pre_9 = Boolean(o.pre9);
          if ('summer' in o) outInc.summer = Boolean(o.summer);
          if ('pe' in o) outInc.pe = Boolean(o.pe);
          if ('pass_fail' in o) outInc.pass_fail = Boolean(o.pass_fail);
          else if ('passFail' in o) outInc.pass_fail = Boolean(o.passFail);
          if ('cbe' in o) outInc.cbe = Boolean(o.cbe);
          value = Object.keys(outInc).length ? outInc : o;
        }
        break;
      }
      case 'gpa.rank': {
        if (typeof value === 'string') {
          const s = value.toLowerCase();
          if (/unweight/.test(s)) value = { uses: 'unweighted' };
          else if (/weight/.test(s)) value = { uses: 'weighted' };
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          const o = value as Record<string, unknown>;
          const uses = o.uses ?? o.method ?? o.profile;
          if (typeof uses === 'string') {
            const s = uses.toLowerCase();
            if (/unweight/.test(s)) value = { uses: 'unweighted' };
            else if (/weight/.test(s)) value = { uses: 'weighted' };
            else value = { uses: s };
          }
        }
        break;
      }
      case 'gpa.repeat': {
        if (typeof value === 'string') {
          const s = value.toLowerCase();
          if (/forgive|higher|replace/.test(s)) value = { policy: 'forgive_higher' };
          else if (/both|include_both/.test(s)) value = { policy: 'include_both' };
          else if (/average/.test(s)) value = { policy: 'average' };
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          const o = value as Record<string, unknown>;
          if (typeof o.policy === 'string') {
            const s = o.policy.toLowerCase();
            if (/forgive|higher|replace/.test(s)) value = { policy: 'forgive_higher' };
            else if (/both|include_both/.test(s)) value = { policy: 'include_both' };
            else if (/average/.test(s)) value = { policy: 'average' };
            else value = { policy: o.policy };
          } else {
            const blob = JSON.stringify(o).toLowerCase();
            if (/forgive|higher|replace/.test(blob)) value = { policy: 'forgive_higher' };
            else if (/both/.test(blob)) value = { policy: 'include_both' };
            else if (/average/.test(blob)) value = { policy: 'average' };
          }
        }
        break;
      }
      default:
        break;
    }

    if (path === 'calendar.template' && typeof value === 'string') {
      if (value === 'tx_six_weeks') {
        derivedPeriod = {
          path: 'calendar.period_model',
          value: 'six_weeks',
          confidence: Math.min(confidence, 0.75),
          evidence: ev,
          status: 'needs_review',
          source_doc_id: f.source_doc_id,
        };
      } else if (value === 'nine_weeks') {
        derivedPeriod = {
          path: 'calendar.period_model',
          value: 'nine_weeks',
          confidence: Math.min(confidence, 0.75),
          evidence: ev,
          status: 'needs_review',
          source_doc_id: f.source_doc_id,
        };
      } else if (value === 'trimester') {
        derivedPeriod = {
          path: 'calendar.period_model',
          value: 'trimester',
          confidence: Math.min(confidence, 0.75),
          evidence: ev,
          status: 'needs_review',
          source_doc_id: f.source_doc_id,
        };
      } else if (value === 'semester') {
        derivedPeriod = {
          path: 'calendar.period_model',
          value: 'semester',
          confidence: Math.min(confidence, 0.75),
          evidence: ev,
          status: 'needs_review',
          source_doc_id: f.source_doc_id,
        };
      }
    }

    // Capture late floor stash before push
    const lateFloor = (f as IngestField & { _late_floor?: number })._late_floor;
    if (lateFloor != null) {
      pendingLateFloor = lateFloor;
      pendingLateFloorEv = ev;
      pendingLateFloorSrc = f.source_doc_id;
    }
    const missingFloor = (f as IngestField & { _missing_floor?: number })._missing_floor;
    if (missingFloor != null) {
      pendingMissingFloor = missingFloor;
      pendingMissingFloorEv = ev;
      pendingMissingFloorSrc = f.source_doc_id;
    }

    // “No retakes” is an answer (retake off), not noise: keep it as a null value.
    const explicitNoRetake =
      path === 'syllabus.retake' &&
      status !== 'conflict' &&
      (isNoRetake(f.value) || (f.value == null && isNoRetake(quoteText(ev))));
    if (explicitNoRetake) value = null;
    if (value == null && f.value != null && !explicitNoRetake) {
      // Coerced away: only keep explicit unknown/review cards (e.g. within_category)
      if (!(status === 'unknown' || status === 'needs_review' || status === 'conflict')) {
        continue;
      }
      // Drop coerced-away noise that we only marked unknown to skip (floor remap, invalid rollup)
      if (
        path === 'syllabus.floor' ||
        path === 'syllabus.rollup_preset' ||
        path === 'rollup.preset' ||
        path === 'syllabus.missing_rule'
      ) {
        continue;
      }
    }

    const pushed: IngestField = {
      ...f,
      value,
      confidence,
      status: statusFor(confidence, status),
    };
    if (explicitNoRetake) noRetakeFields.add(pushed);
    out.push(pushed);
  }

  const byPath = new Map<string, IngestField>();
  for (const f of out) {
    const prev = byPath.get(f.path);
    if (!prev || f.confidence > prev.confidence) byPath.set(f.path, f);
  }
  if (derivedPreset && !byPath.has('rollup.preset')) byPath.set('rollup.preset', derivedPreset);
  if (derivedPeriod && !byPath.has('calendar.period_model')) {
    byPath.set('calendar.period_model', derivedPeriod);
  }
  // Belt-and-suspenders: template always implies period_model when still missing
  if (!byPath.has('calendar.period_model')) {
    const tmpl = byPath.get('calendar.template');
    const tv = tmpl && typeof tmpl.value === 'string' ? tmpl.value : null;
    const periodFromTemplate =
      tv === 'tx_six_weeks'
        ? 'six_weeks'
        : tv === 'nine_weeks' || tv === 'trimester' || tv === 'semester'
          ? tv
          : null;
    if (periodFromTemplate && tmpl) {
      byPath.set('calendar.period_model', {
        path: 'calendar.period_model',
        value: periodFromTemplate,
        confidence: Math.min(tmpl.confidence, 0.8),
        evidence: tmpl.evidence,
        status: 'needs_review',
        source_doc_id: tmpl.source_doc_id,
      });
    }
  }
  // rollup.exam_enabled from preset when model omitted it
  if (!byPath.has('rollup.exam_enabled')) {
    const presetF = byPath.get('rollup.preset');
    const pv = presetF ? String(presetF.value || '') : '';
    if (pv) {
      const hasExam =
        /2\/7\+1\/7|40\/40\/20|45\/45\/10|exam/i.test(pv) && !/^50\/50$/i.test(pv);
      const noExam = /^50\/50$/i.test(pv) || /no\s*exam/i.test(pv);
      if (hasExam || noExam) {
        byPath.set('rollup.exam_enabled', {
          path: 'rollup.exam_enabled',
          value: hasExam,
          confidence: Math.min(presetF!.confidence, 0.85),
          evidence: presetF!.evidence,
          status: statusFor(Math.min(presetF!.confidence, 0.85), null),
          source_doc_id: presetF!.source_doc_id,
        });
      }
    }
  }

  // Apply late floor onto late_rule when period floor was a late-floor mis-map
  if (pendingLateFloor != null) {
    const late = byPath.get('syllabus.late_rule');
    if (late && late.value && typeof late.value === 'object') {
      const lr = { ...(late.value as Record<string, unknown>), floor_pct: pendingLateFloor };
      byPath.set('syllabus.late_rule', { ...late, value: lr });
    } else if (!late) {
      byPath.set('syllabus.late_rule', {
        path: 'syllabus.late_rule',
        value: { type: 'none', floor_pct: pendingLateFloor },
        confidence: 0.7,
        evidence: pendingLateFloorEv ?? { quote: `floor ${pendingLateFloor}`, page: 1, region: null },
        status: 'needs_review',
        source_doc_id: pendingLateFloorSrc,
      });
    }
  }

  // Missing-work floor mis-mapped to syllabus.floor → missing_rule
  if (pendingMissingFloor != null && !byPath.has('syllabus.missing_rule')) {
    byPath.set('syllabus.missing_rule', {
      path: 'syllabus.missing_rule',
      value: { type: 'floor', floor: pendingMissingFloor },
      confidence: 0.88,
      evidence:
        pendingMissingFloorEv ?? {
          quote: `floor of ${pendingMissingFloor}`,
          page: 1,
          region: null,
        },
      status: 'proposed',
      source_doc_id: pendingMissingFloorSrc,
    });
  }

  // Drop zero-weight "categories" when engine is total_points (assignment point lists)
  const engField = byPath.get('syllabus.engine');
  const catField = byPath.get('syllabus.categories');
  if (
    engField?.value === 'total_points' &&
    catField &&
    Array.isArray(catField.value) &&
    (catField.value as { weight_percent?: number }[]).every((c) => !c.weight_percent)
  ) {
    byPath.delete('syllabus.categories');
  }

  // FR-AI-21: weights that don't total 100% stay as written; mark for review with plain words.
  const weightCat = byPath.get('syllabus.categories');
  if (weightCat && Array.isArray(weightCat.value)) {
    const engVal = byPath.get('syllabus.engine')?.value;
    const ecmField = byPath.get('syllabus.extra_credit_method');
    const ecm = typeof ecmField?.value === 'string' ? ecmField.value : null;
    const engine = typeof engVal === 'string' ? engVal : null;
    const issue = categoryWeightIssue(weightCat.value as CoercedCategory[], engine, ecm);
    // Extra credit listed as its own category on top of 100% and no method stated → method C.
    const onTop = engine === 'total_points' || engine === 'none' ? null : extraCreditOnTop(weightCat.value as CoercedCategory[]);
    if (!issue && onTop && !ecmField) {
      const conf = Math.min(weightCat.confidence, 0.85);
      byPath.set('syllabus.extra_credit_method', {
        path: 'syllabus.extra_credit_method',
        value: 'C',
        confidence: conf,
        evidence: weightCat.evidence,
        status: statusFor(conf, null),
        source_doc_id: weightCat.source_doc_id,
      });
    }
    if (!issue && onTop) {
      // The model may still have noted the 110%; the overage is the extra-credit category, so drop it.
      for (let i = warnings.length - 1; i >= 0; i -= 1) {
        if (isModelWeightTotalWarning(warnings[i]!)) warnings.splice(i, 1);
      }
    }
    if (issue) {
      byPath.set('syllabus.categories', {
        ...weightCat,
        status: weightCat.status === 'conflict' ? 'conflict' : 'needs_review',
        note: issue.note,
      });
      for (let i = warnings.length - 1; i >= 0; i -= 1) {
        if (isModelWeightTotalWarning(warnings[i]!)) warnings.splice(i, 1);
      }
      if (!warnings.some((w) => w.code === 'weights_total')) {
        warnings.push({ code: 'weights_total', message: issue.message, severity: 'warn' });
      }
    }
  }

  // qp.method without tables → drop (letter_map / bonus-guess noise)
  if (byPath.has('qp.method') && !byPath.has('qp.tables')) {
    byPath.delete('qp.method');
  }
  // qp.tables without method → add numeric_band
  if (byPath.has('qp.tables') && !byPath.has('qp.method')) {
    const t = byPath.get('qp.tables')!;
    byPath.set('qp.method', {
      path: 'qp.method',
      value: 'numeric_band',
      confidence: Math.min(t.confidence, 0.9),
      evidence: t.evidence,
      status: statusFor(Math.min(t.confidence, 0.9), null),
      source_doc_id: t.source_doc_id,
    });
  }

  // Derive levels columns from qp.tables when levels missing
  if (!byPath.has('levels.list') && byPath.has('qp.tables')) {
    const t = byPath.get('qp.tables')!;
    const rows = t.value as Array<{ points_by_level?: Record<string, number> }>;
    const keys = new Set<string>();
    for (const r of rows || []) {
      for (const k of Object.keys(r.points_by_level || {})) keys.add(k);
    }
    if (keys.size) {
      const list = [...keys].map((k) => {
        const c = coerceCourseLevelKey(k);
        return { key: c.key, label: c.label, weighted_bonus: c.weighted_bonus };
      });
      byPath.set('levels.list', {
        path: 'levels.list',
        value: list,
        confidence: Math.min(t.confidence, 0.85),
        evidence: t.evidence,
        status: statusFor(Math.min(t.confidence, 0.85), null),
        source_doc_id: t.source_doc_id,
      });
    }
  }

  // Lift sparse policy facts from any evidence quote already on the page.
  // School-only paths must never land on a syllabus proposal (S05 homework-lock note ≠ locks.map).
  {
    const blobs = [...byPath.values()]
      .map((f) => `${quoteText(f.evidence)} ${typeof f.value === 'string' ? f.value : ''}`)
      .join('\n');
    const anySrc = [...byPath.values()][0];
    const liftEv = (q: string): IngestEvidence => ({
      quote: q.slice(0, 240),
      page: 1,
      region: null,
    });
    const isSchool = proposal.wizard === 'school' || proposal.kind === 'school_policy';
    if (isSchool && !byPath.has('locks.map')) {
      const hw =
        blobs.match(
          /homework[^\n.]{0,40}?(?:max(?:imum)?|cap(?:ped)?|no more than|not exceed|at most|≤|<=)\s*(\d{1,2})\s*%/i,
        ) ||
        blobs.match(
          /(?:max(?:imum)?|cap(?:ped)?|no more than|not exceed|at most|≤|<=)\s*(\d{1,2})\s*%[^\n.]{0,20}homework/i,
        ) ||
        blobs.match(/homework[^\n.]{0,20}locked[^\n.]{0,20}(\d{1,2})\s*%/i);
      if (hw) {
        byPath.set('locks.map', {
          path: 'locks.map',
          value: { categories: true, homework_max_percent: Number(hw[1]) },
          confidence: 0.85,
          evidence: liftEv(hw[0]),
          status: 'proposed',
          source_doc_id: anySrc?.source_doc_id ?? null,
        });
      }
    }
    if (isSchool && !byPath.has('gpa.include')) {
      const pe = /PE is excluded|exclude[sd]?\s+from\s+(cumulative\s+)?GPA[^\n.]{0,40}PE|\bPE\b[^\n.]{0,30}exclud/i.test(
        blobs,
      );
      const pf = /pass\s*\/\s*fail|P\/F/i.test(blobs) && /exclud/i.test(blobs);
      const cbe = /\bCBE\b|credit\s*by\s*exam/i.test(blobs) && /exclud/i.test(blobs);
      if (pe || pf || cbe) {
        const v: Record<string, boolean> = {};
        if (pe) v.pe = false;
        if (pf) v.pass_fail = false;
        if (cbe) v.cbe = false;
        byPath.set('gpa.include', {
          path: 'gpa.include',
          value: v,
          confidence: 0.85,
          evidence: liftEv(blobs.match(/[^\n]{0,40}(PE|P\/F|CBE|pass)[^\n]{0,60}/i)?.[0] || 'GPA include'),
          status: 'proposed',
          source_doc_id: anySrc?.source_doc_id ?? null,
        });
      }
    }
    if (isSchool && !byPath.has('school.notes')) {
      const note =
        blobs.match(/[^\n.]{0,20}exam exemption[^\n.]{0,80}/i)?.[0] ||
        blobs.match(/[^\n.]{0,20}UIL eligibility[^\n.]{0,80}/i)?.[0] ||
        blobs.match(/[^\n.]{0,20}Transfer grades[^\n.]{0,100}/i)?.[0] ||
        null;
      if (note) {
        byPath.set('school.notes', {
          path: 'school.notes',
          value: note.trim(),
          confidence: 0.8,
          evidence: liftEv(note.trim()),
          status: 'needs_review',
          source_doc_id: anySrc?.source_doc_id ?? null,
        });
      }
    }
    if (!isSchool && !byPath.has('syllabus.narrative')) {
      const note =
        blobs.match(/[^\n.]{0,10}Conduct mark[^\n.]{0,80}/i)?.[0] ||
        blobs.match(/[^\n.]{0,20}plus\s*\/\s*minus[^\n.]{0,60}/i)?.[0] ||
        null;
      if (note) {
        byPath.set('syllabus.narrative', {
          path: 'syllabus.narrative',
          value: note.trim(),
          confidence: 0.75,
          evidence: liftEv(note.trim()),
          status: 'needs_review',
          source_doc_id: anySrc?.source_doc_id ?? null,
        });
      }
    }
    // Category weights on the page imply a weighted engine when the model omitted it.
    if (!isSchool && !byPath.has('syllabus.engine') && byPath.has('syllabus.categories')) {
      const cats = byPath.get('syllabus.categories')!;
      const rows = Array.isArray(cats.value) ? cats.value : [];
      const hasWeights = rows.some(
        (c) => c && typeof c === 'object' && Number((c as { weight_percent?: number }).weight_percent) > 0,
      );
      if (hasWeights && evidenceOk(cats.evidence)) {
        byPath.set('syllabus.engine', {
          path: 'syllabus.engine',
          value: 'weighted_percent_inside',
          confidence: Math.min(cats.confidence, 0.72),
          evidence: cats.evidence,
          status: 'needs_review',
          source_doc_id: cats.source_doc_id,
        });
      }
    }
  }

  const levels = byPath.get('levels.list');
  if (levels && Array.isArray(levels.value) && !byPath.has('gpa.mode')) {
    const hasBonus = levels.value.some(
      (row) =>
        row && typeof row === 'object' && Number((row as { weighted_bonus?: number }).weighted_bonus) > 0,
    );
    if (hasBonus && evidenceOk(levels.evidence)) {
      byPath.set('gpa.mode', {
        path: 'gpa.mode',
        value: 'unweighted_and_weighted',
        confidence: Math.min(levels.confidence, 0.75),
        evidence: levels.evidence,
        status: 'needs_review',
        source_doc_id: levels.source_doc_id,
      });
    }
  }

  // Drop null/empty noise unless status is an explicit review card
  let finalFields = [...byPath.values()].filter((f) => {
    if (f.value != null && f.value !== '') return true;
    // Explicit “no retakes” is a real answer (retake off), not empty noise.
    if (noRetakeFields.has(f)) return true;
    return f.status === 'unknown' || f.status === 'needs_review' || f.status === 'conflict';
  });

  // Dedupe warnings + ambiguities by normalized meaning
  const { warnings: dedupedW, ambiguities: dedupedA } = dedupeWarningsAndAmbiguities(
    warnings,
    ambiguities,
  );

  const overall =
    finalFields.length > 0
      ? finalFields.reduce((s, f) => s + f.confidence, 0) / finalFields.length
      : proposal.overall_confidence;

  return {
    ...proposal,
    fields: finalFields,
    ambiguities: dedupedA,
    warnings: dedupedW,
    document_kind_guess,
    overall_confidence: overall,
  };
}

function normMsg(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/^ambiguity:\s*/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function dedupeWarningsAndAmbiguities(
  warnings: IngestWarning[],
  ambiguities: IngestAmbiguity[],
): { warnings: IngestWarning[]; ambiguities: IngestAmbiguity[] } {
  const seen = new Set<string>();
  const outA: IngestAmbiguity[] = [];
  for (const a of ambiguities || []) {
    if (!a || typeof a !== 'object') continue;
    const k = `${a.code ?? ''}|${normMsg(a.message)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    // Also reserve message-only so warning with same meaning drops
    seen.add(`msg|${normMsg(a.message)}`);
    outA.push(a);
  }
  const outW: IngestWarning[] = [];
  for (const w of warnings || []) {
    if (!w || typeof w !== 'object') continue;
    const msgKey = `msg|${normMsg(w.message)}`;
    const codeKey = `${w.code ?? ''}|${normMsg(w.message)}`;
    if (seen.has(msgKey) || seen.has(codeKey)) continue;
    // near-dup: within_category warnings when ambiguity exists
    if (
      /within_category|items (inside|within) a category|combine inside/i.test(
        `${w.code ?? ''} ${w.message ?? ''}`,
      ) &&
      outA.some((a) => a.code === 'within_category')
    ) {
      continue;
    }
    seen.add(msgKey);
    seen.add(codeKey);
    outW.push(w);
  }
  return { warnings: outW, ambiguities: outA };
}

/** True when school handbook core fields are present enough to skip retry. */
export function schoolProposalHasCore(proposal: IngestProposal): boolean {
  const paths = new Set(proposal.fields.filter((f) => f.value != null).map((f) => f.path));
  const hasCal = paths.has('calendar.template') || paths.has('calendar.period_model');
  const hasRoll = paths.has('rollup.preset') || paths.has('rollup.custom_weights');
  const hasGpa =
    paths.has('levels.list') ||
    paths.has('gpa.mode') ||
    paths.has('gpa.repeat') ||
    paths.has('gpa.include') ||
    paths.has('qp.tables');
  return (
    proposal.fields.length > 0 &&
    (hasCal || hasRoll || paths.has('credit.passing_threshold') || hasGpa)
  );
}
