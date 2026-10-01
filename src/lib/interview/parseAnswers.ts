/**
 * Deterministic free-text parsers for the guided setup interview.
 * Each returns canonical draft values (same shapes the document ingest
 * mapper writes) or null when the text does not answer the question.
 * Pure TS — no AI. The LLM path is normalized through these same shapes.
 */
import type { LateRule, RetakeRule } from '../grade/engine/types.ts';

export type CategoryAnswer = { key: string; label: string; weight_percent: number };

const NUM = '(\\d+(?:\\.\\d+)?)';

export function num(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function isNotSure(text: string): boolean {
  return /\b(not sure|unsure|no idea|don'?t know|dunno|idk|school default|use (the )?default|whatever (the )?school|you pick|skip)\b/i.test(
    text,
  );
}

export function slugKey(label: string, used: Set<string>): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  if (!/^[a-z]/.test(base)) base = `cat_${base}`.slice(0, 32);
  if (!base || base === 'cat_') base = 'other';
  let key = base;
  let n = 2;
  while (used.has(key)) {
    key = `${base.slice(0, 29)}_${n}`;
    n += 1;
  }
  used.add(key);
  return key;
}

const CAT_STOP = /^(and|with|plus|then|is|are|at|the|for|of|my|our|a|an|percent|pct|weights?|categories|buckets?)$/i;

/** "Tests 50, Quizzes 30, Homework 20" / "50% tests, 50% daily" → categories. */
export function parseCategories(text: string): CategoryAnswer[] | null {
  const out: CategoryAnswer[] = [];
  const used = new Set<string>();
  const t = text.replace(/\band\b/gi, ',').replace(/;/g, ',');
  // label then number
  const reA = /([A-Za-z][A-Za-z &/'-]{1,40}?)\s*(?:[:=\-–—]|at|is|are|count(?:s)?(?: for)?|worth)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent|pct)?(?=\s*(?:,|$|\.|\)))/g;
  let m: RegExpExecArray | null;
  while ((m = reA.exec(t))) {
    const label = cleanLabel(m[1]!);
    if (!label) continue;
    out.push({ key: slugKey(label, used), label, weight_percent: Number(m[2]) });
  }
  if (out.length === 0) {
    // number then label: "50% tests, 30% quizzes"
    const reB = /(\d+(?:\.\d+)?)\s*(?:%|percent|pct)\s*(?:for\s+|on\s+)?([A-Za-z][A-Za-z &/'-]{1,40}?)(?=\s*(?:,|$|\.))/g;
    while ((m = reB.exec(t))) {
      const label = cleanLabel(m[2]!);
      if (!label) continue;
      out.push({ key: slugKey(label, used), label, weight_percent: Number(m[1]) });
    }
  }
  return out.length ? out : null;
}

function cleanLabel(raw: string): string {
  const words = raw
    .trim()
    .split(/\s+/)
    .filter((w) => !CAT_STOP.test(w));
  const label = words.join(' ').replace(/[-–—:=]+$/, '').trim();
  if (!label || label.length < 2) return '';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weightSum(cats: Array<{ weight_percent: number }>): number {
  return Math.round(cats.reduce((a, c) => a + Number(c.weight_percent || 0), 0) * 1000) / 1000;
}

/** Late work → canonical LateRule (engine shape). */
export function parseLateRule(text: string): LateRule | null {
  const s = text.toLowerCase();
  const grace = num(s, /grace(?: period)?(?: of)?\s*(\d+)\s*(?:hours?|hrs?)/) ?? (/grace(?: period)?(?: of)?\s*(?:one|a|1)\s*day/.test(s) ? 24 : null);
  const deadline =
    num(s, /(?:up to|within|until|no (?:later|more) than|accepted for|for)\s*(\d+)\s*(?:school\s*)?days?/) ??
    (/not accepted|no late work|won'?t accept|isn'?t accepted|no credit after|zero after/.test(s) ? 0 : null);
  const floorPct =
    num(s, /(?:max(?:imum)?|up to|no more than|capped at|cap(?:ped)?)\s*(\d+)\s*%?\s*(?:off|penalty|deduction|max)/) ??
    num(s, /(?:no lower than|floor(?: of)?|minimum(?: of)?|lowest(?: is)?|not below)\s*(\d+)/);
  const unit: 'percent' | 'points' = /points?|pts?\b/.test(s) && !/%|percent/.test(s) ? 'points' : 'percent';
  const extra = (r: LateRule): LateRule => {
    const out: LateRule = { ...r };
    if (floorPct != null) out.floor_pct = floorPct;
    if (deadline != null && deadline > 0) out.hard_deadline_days = deadline;
    if (grace != null) out.grace_hours = grace;
    return out;
  };
  const perDay = s.match(new RegExp(`${NUM}\\s*(?:%|percent|points?|pts?)?\\s*(?:off\\s*)?(?:per|a|each|every)\\s*(?:school\\s*)?day`));
  if (perDay) return extra({ type: 'per_day', amount: Number(perDay[1]), unit });
  const perHour = s.match(new RegExp(`${NUM}\\s*(?:%|percent|points?|pts?)?\\s*(?:off\\s*)?(?:per|an|each|every)\\s*hour`));
  if (perHour) return extra({ type: 'per_hour', amount: Number(perHour[1]), unit });
  if (/no (?:auto(?:matic)?\s*)?penalt|without penalty|full credit|no deduction|teacher decides|case by case/.test(s)) {
    return extra({ type: 'none' });
  }
  if (deadline === 0) return { type: 'none', hard_deadline_days: 0 };
  const flat = s.match(new RegExp(`(?:lose|loses|minus|off|deduct|deduction of|penalty of|docked)?\\s*${NUM}\\s*(%|percent|points?|pts?)\\s*(?:off|penalty|deduction)?`));
  if (flat && /late|off|penalt|deduct|lose|minus|dock|flat/.test(s)) {
    return extra({ type: 'flat', amount: Number(flat[1]), unit: /point|pt/.test(flat[2]!) ? 'points' : 'percent' });
  }
  if (deadline != null) return extra({ type: 'none' });
  return null;
}

export type MissingAnswer = { missing_rule: 'zero' | 'floor' | 'omit'; floor?: number };

export function parseMissing(text: string): MissingAnswer | null {
  const s = text.toLowerCase();
  const floor = num(s, /(?:counts? as|floor(?: of)?|minimum(?: of)?|gets? an?|worth|=)\s*(?:a\s*)?(\d+)/);
  if (floor != null && floor > 0) return { missing_rule: 'floor', floor };
  if (/\bzero\b|\b0\b|counts? as nothing|no credit/.test(s)) return { missing_rule: 'zero' };
  if (/omit|doesn'?t count|don'?t count|not count|excluded|leave (it )?out|blank|ignore|skip(ped)? in the average/.test(s)) {
    return { missing_rule: 'omit' };
  }
  return null;
}

export type ExtraCreditAnswer = {
  extra_credit_method?: 'A' | 'B' | 'C';
  extra_credit_allowed?: boolean;
  ec_cap?: number | null;
  ceiling?: number | null;
};

export function parseExtraCredit(text: string): ExtraCreditAnswer | null {
  const s = text.toLowerCase();
  const out: ExtraCreditAnswer = {};
  if (/no extra credit|don'?t (give|do|offer) extra credit|no ec\b|no bonus/.test(s)) {
    out.extra_credit_method = 'A';
    out.extra_credit_allowed = false;
    out.ec_cap = null;
  } else if (/own category|separate category|its own bucket|method c\b|\bc\b method/.test(s)) {
    out.extra_credit_method = 'C';
    out.extra_credit_allowed = true;
  } else if (/method a\b|replace|boost (a|an|the) (low|existing)/.test(s)) {
    out.extra_credit_method = 'A';
    out.extra_credit_allowed = true;
  } else if (/method b\b|bonus|extra credit|adds? (to )?points|on top/.test(s)) {
    out.extra_credit_method = 'B';
    out.extra_credit_allowed = true;
  }
  const cap = num(s, /(?:cap(?:ped)?|limit(?:ed)?|max(?:imum)?|up to|no more than)\s*(?:at\s*|of\s*)?(\d+(?:\.\d+)?)\s*(?:%|percent|points?)/);
  if (cap != null && cap !== 100) out.ec_cap = cap;
  if (/no cap|uncapped|unlimited/.test(s)) out.ec_cap = null;
  if (/(?:can'?t|cannot|never|not) (?:go )?(?:over|above|exceed|past) 100|max(?:imum)? (?:grade |average )?(?:is )?100|cap(?:ped)? at 100/.test(s)) {
    out.ceiling = 100;
  } else {
    const ceil = num(s, /(?:ceiling|average (?:can'?t|cannot) (?:go )?(?:over|above|exceed))\s*(?:of\s*|at\s*)?(\d+)/);
    if (ceil != null) out.ceiling = ceil;
  }
  return Object.keys(out).length ? out : null;
}

const WORD_N: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, a: 1, the: 1, single: 1 };

/** "drop the 2 lowest quizzes", "drop one homework", "no drops". Returns key → n. */
export function parseDrops(
  text: string,
  categories: Array<{ key: string; label: string }>,
): Record<string, number> | null {
  const s = text.toLowerCase();
  if (/\bno drops?\b|don'?t drop|nothing (gets )?dropped|no dropping|none\b/.test(s)) return {};
  if (!/drop/.test(s)) return null;
  const nMatch = s.match(/drop(?:s|ping)?\s+(?:the\s+)?(\d+|one|two|three|four|a|single)?\s*(?:lowest|worst|low)?/);
  const nRaw = nMatch?.[1];
  const n = nRaw == null ? 1 : /^\d+$/.test(nRaw) ? Number(nRaw) : (WORD_N[nRaw] ?? 1);
  const out: Record<string, number> = {};
  const every = /every|each|all categor/.test(s);
  for (const c of categories) {
    const label = c.label.toLowerCase();
    const stem = label.replace(/(zes|es|s)$/, '');
    if (every || s.includes(label) || (stem.length >= 3 && s.includes(stem))) out[c.key] = n;
  }
  if (!Object.keys(out).length && categories.length === 1) out[categories[0]!.key] = n;
  return Object.keys(out).length ? out : null;
}

export function parseRetake(
  text: string,
  categories: Array<{ key: string; label: string }> = [],
): { retake: RetakeRule | null } | null {
  const s = text.toLowerCase();
  if (/no (retakes?|redos?|re-?dos?|corrections?)|not allowed|don'?t allow|never|no second/.test(s)) return { retake: null };
  if (!/retake|redo|re-?do|re-?test|correction|second (try|chance)|again|higher|replace|average|best score|yes/.test(s)) return null;
  let method: RetakeRule['method'] = 'higher_of';
  if (/replace|new score (counts|replaces)|latest|most recent/.test(s)) method = 'replace';
  else if (/average|avg|mean/.test(s)) method = 'average';
  const cap = num(s, /(?:cap(?:ped)?|max(?:imum)?|up to|no (?:more|higher) than|at most)\s*(?:at\s*|of\s*)?(?:an?\s*)?(\d+)/);
  const attempts =
    num(s, /(\d+)\s*(?:attempts?|retakes?|tries|times)/) ?? (/twice|two (retakes|tries|attempts)/.test(s) ? 2 : 1);
  const windowDays = num(s, /within\s*(\d+)\s*(?:school\s*)?days?/) ?? (/within (a|one) week/.test(s) ? 7 : null);
  const eligible: string[] = [];
  for (const c of categories) {
    const label = c.label.toLowerCase();
    const stem = label.replace(/(zes|es|s)$/, '');
    if (s.includes(label) || (stem.length >= 3 && s.includes(stem))) eligible.push(c.key);
  }
  return {
    retake: {
      eligible_category_ids: eligible,
      attempts: Math.max(1, Math.floor(attempts)),
      method,
      cap: cap != null && cap > 1 && cap <= 100 ? cap : null,
      window_days: windowDays,
    },
  };
}

export function parseFloor(text: string): { floor: number | null } | null {
  const s = text.toLowerCase();
  if (/no (minimum|floor|lowest)|none|whatever they earn|real grade/.test(s)) return { floor: null };
  const n = num(s, /(\d+)/);
  if (n != null && n >= 0 && n <= 100) return { floor: n };
  return null;
}

export function parseRounding(text: string): { rounding: 'nearest_whole' | 'half_up' | 'truncate' | 'none' } | null {
  const s = text.toLowerCase();
  if (/no rounding|don'?t round|exact|two decimals|decimals/.test(s)) return { rounding: 'none' };
  if (/truncat|drop (the )?decimal|round down|cut off/.test(s)) return { rounding: 'truncate' };
  if (/half.?up|\.5 (rounds |goes )?up|89\.5.*90|round up/.test(s)) return { rounding: 'half_up' };
  if (/nearest|whole number|round/.test(s)) return { rounding: 'nearest_whole' };
  return null;
}

export function parseTerms(text: string): {
  term_structure?: 'quarters' | 'semesters' | 'year' | 'custom';
  book_mode?: 'reset_each_marking_period' | 'rolling_year';
} | null {
  const s = text.toLowerCase();
  const out: ReturnType<typeof parseTerms> & object = {};
  if (/quarter|nine.?weeks?|9.?weeks?/.test(s)) out.term_structure = 'quarters';
  else if (/semester/.test(s)) out.term_structure = 'semesters';
  else if (/six.?weeks?|6.?weeks?|trimester|custom/.test(s)) out.term_structure = 'custom';
  else if (/whole year|full year|all year|year.?long|one grade for the year/.test(s)) out.term_structure = 'year';
  if (/rolling|carr(y|ies) over|continuous|running|all year|whole year|year.?long|doesn'?t reset/.test(s)) {
    out.book_mode = 'rolling_year';
  } else if (/reset|fresh|start over|clean slate|each (grading|marking) period|separate/.test(s)) {
    out.book_mode = 'reset_each_marking_period';
  }
  return Object.keys(out).length ? out : null;
}

export function parseExam(text: string): { exam_weight: number | null; rollup_preset: string | null } | null {
  const s = text.toLowerCase();
  if (/no (final|semester|midterm)?\s*exams?|no final/.test(s)) return { exam_weight: null, rollup_preset: '50/50' };
  if (/2\/7|1\/7|seventh/.test(s)) return { exam_weight: 14.3, rollup_preset: '2/7+1/7' };
  const w = num(s, /(\d+(?:\.\d+)?)\s*(?:%|percent)/) ?? num(s, /exam\D{0,20}(\d+)/);
  if (w == null) return null;
  const preset = w === 20 ? '40/40/20' : w === 10 ? '45/45/10' : w === 15 ? '85/15' : null;
  return { exam_weight: w, rollup_preset: preset };
}

export function parseEngine(text: string): {
  engine: 'total_points' | 'weighted_points_inside' | 'weighted_percent_inside' | 'item_weights' | 'none';
  within_category?: 'points_inside' | 'percent_inside' | null;
} | null {
  const s = text.toLowerCase();
  if (/no (overall|average|final) grade|standards|sbg|just track|no average/.test(s)) return { engine: 'none', within_category: null };
  if (/each assignment (has|gets|carries) its own weight|item weights?|per.?assignment weight/.test(s)) {
    return { engine: 'item_weights', within_category: null };
  }
  if (/total points|points earned|add (up )?(all )?(the )?points|straight points|points.?based|points system/.test(s)) {
    return { engine: 'total_points', within_category: null };
  }
  if (/weight|categor|bucket|percent of the grade|%/.test(s)) {
    if (/equal|same|each (assignment|grade) counts the same|average (of )?(the )?percent/.test(s)) {
      return { engine: 'weighted_percent_inside', within_category: 'percent_inside' };
    }
    if (/points (matter|inside|count)|bigger (tests|assignments) count more/.test(s)) {
      return { engine: 'weighted_points_inside', within_category: 'points_inside' };
    }
    return { engine: 'weighted_percent_inside' };
  }
  return null;
}

export function parseWithin(text: string): { within_category: 'points_inside' | 'percent_inside' } | null {
  const s = text.toLowerCase();
  if (/equal|same|each (assignment|grade) (is|counts) (the )?same|no\b/.test(s)) return { within_category: 'percent_inside' };
  if (/points|bigger|yes|more/.test(s)) return { within_category: 'points_inside' };
  return null;
}

export function parseEmptyCategory(text: string): { empty_category: 'renormalize' | 'zero' } | null {
  const s = text.toLowerCase();
  if (/zero|0\b|counts? against/.test(s)) return { empty_category: 'zero' };
  if (/leave (it )?out|skip|renormal|re-?weight|ignore|doesn'?t count|other categories/.test(s)) {
    return { empty_category: 'renormalize' };
  }
  return null;
}

export function parseTitle(text: string): { title: string } | null {
  const t = text
    .trim()
    .replace(/^(it'?s|it is|the (class|course) is|call it|called|title:?)\s+/i, '')
    .replace(/[.!]+$/, '')
    .trim();
  if (!t || t.length > 80) return null;
  return { title: t };
}

/** "Aug 14 2026 to May 27 2027" or ISO dates → year_start/year_end. */
export function parseYearDates(text: string, now: Date = new Date()): { year_start: string; year_end: string } | null {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})\D+(\d{4}-\d{2}-\d{2})/);
  if (iso) return { year_start: iso[1]!, year_end: iso[2]! };
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/gi;
  const found: Array<{ m: number; d: number; y: number | null }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    found.push({ m: MONTHS.indexOf(m[1]!.toLowerCase().slice(0, 3)) + 1, d: Number(m[2]), y: m[3] ? Number(m[3]) : null });
  }
  if (found.length < 2) return null;
  const a = found[0]!;
  const b = found[1]!;
  const y0 = a.y ?? (a.m >= 7 ? now.getFullYear() : now.getFullYear());
  const y1 = b.y ?? (b.m < a.m ? y0 + 1 : y0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { year_start: `${y0}-${pad(a.m)}-${pad(a.d)}`, year_end: `${y1}-${pad(b.m)}-${pad(b.d)}` };
}
