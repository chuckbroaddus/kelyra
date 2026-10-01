/**
 * Homework grading helpers shared by Edge (analyze-homework, classify-capture) and scripts/ai-dev-server.mjs
 * (evaluate-homework, analyze-homework, classify-capture). Pure TS — no Deno / Node APIs.
 * Client mirror: src/lib/captures/homeworkName.ts (keep cleanHomeworkStudentName in lockstep; test enforces).
 */

/** Strings a model returns when it saw a Name line but no readable name. */
const PLACEHOLDER_NAME_RE =
  /^(?:name|student(?:\s+name)?|first\s+last|first\s+name(?:\s+last\s+name)?|last\s+name|full\s+name|your\s+name|unknown|unknown\s+student|n\/?a|none|null|blank|illegible|unreadable|not\s+visible|no\s+name|anonymous|redacted|\[?\s*redacted\s*\]?|\?+|_+|-+|\.+|x+)$/i;

/**
 * Clean a model-read student name. Strips a leading "Name:" label, rejects placeholders such as
 * "Name:", "[redacted]", "First Last", "Unknown", "____". Returns null when nothing real is left.
 */
export function cleanHomeworkStudentName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/\[\s*(?:redacted|name|student|illegible|unreadable)[^\]]*\]|<\s*name\s*>|\{\s*name\s*\}/i.test(s)) return null;
  s = s.replace(/^(?:student\s+)?name\s*[:\-–—]\s*/i, '').trim();
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (!s || PLACEHOLDER_NAME_RE.test(s)) return null;
  if (!/[\p{L}]{2,}/u.test(s)) return null;
  return s;
}

/** Dedupe + clean a list of names (strings or {name}). */
export function cleanHomeworkNameList(raw: unknown): string[] {
  const rows = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = cleanHomeworkStudentName(
      typeof row === 'string' ? row : (row as { name?: unknown } | null)?.name,
    );
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, 6);
}

export type HomeworkScoredItem = { credit: number | null; of: number | null };

/**
 * Percent 0–100 from per-item credit. Items whose credit is null (unreadable / cropped / not gradable)
 * are left out rather than failed. Returns null when no item has a numeric credit.
 */
export function percentFromItemCredits(items: ReadonlyArray<HomeworkScoredItem> | null | undefined): number | null {
  const rows = (items ?? []).filter((it) => typeof it?.credit === 'number' && Number.isFinite(it.credit));
  if (!rows.length) return null;
  let of = 0;
  let cr = 0;
  for (const it of rows) {
    const max = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    of += max;
    cr += Math.max(0, Math.min(max, it.credit as number));
  }
  return of > 0 ? Math.round((cr / of) * 100) : null;
}

type Frac = { n: number; d: number };

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function frac(n: number, d: number): Frac | null {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
}

/** Strip grouping separators so "3,405" / EU "3.405" can parse as integers when unambiguous. */
function stripGroupingSeparators(raw: string): string {
  let t = raw.replace(/[−–]/g, '-').replace(/\s+/g, '').trim();
  // US/UK thousands: 3,405 or 1,234,567 (also allow 3,405.50)
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return t.replace(/,/g, '');
  // European thousands with optional decimal comma: 3.405 or 1.234.567 or 3.405,5
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return t.replace(/\./g, '').replace(/,/g, '.');
  // lone EU-style thousands without other dots: 3.405 → 3405 when 3 decimal digits (ambiguous with true decimals)
  // Only treat as thousands when compared against an integer expected elsewhere; parseNumberish keeps 3.405 as decimal.
  return t;
}

/** "7", "-3", "+7", "2.5", "3/4", "1 1/2", "3,405" → exact fraction; anything else → null. */
function parseNumberish(raw: string): Frac | null {
  const t0 = raw.replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
  // allow a lone leading '+'
  const signed0 = t0.replace(/^\+/, '');
  // Try grouped integers first (3,405 / 1.234.567)
  const grouped = stripGroupingSeparators(signed0);
  if (grouped !== signed0.replace(/\s+/g, '')) {
    const g = grouped.replace(/^\+/, '');
    if (/^-?\d+$/.test(g)) return frac(Number(g), 1);
    if (/^-?\d+\.\d+$/.test(g)) {
      const places = (g.split('.')[1] ?? '').length;
      return frac(Math.round(Number(g) * 10 ** places), 10 ** places);
    }
  }
  const signed = signed0;
  let m = signed.match(/^(-?)(\d+) (\d+)\/(\d+)$/);
  if (m) {
    const whole = Number(m[2]);
    const f = frac(whole * Number(m[4]) + Number(m[3]), Number(m[4]));
    return f && m[1] ? { n: -f.n, d: f.d } : f;
  }
  m = signed.match(/^(-?\d+)\/(\d+)$/);
  if (m) return frac(Number(m[1]), Number(m[2]));
  m = signed.match(/^-?\d+(?:\.(\d+))?$/);
  if (m) {
    const places = m[1]?.length ?? 0;
    return frac(Math.round(Number(signed) * 10 ** places), 10 ** places);
  }
  return null;
}

/**
 * When the model concatenated a crossed-out attempt with the final answer ("x = 9 x=8", "4/9 4/6"),
 * return every plausible candidate so code-grade can accept the one that matches the truth.
 */
export function answerCandidates(seen: unknown): string[] {
  if (typeof seen !== 'string') return [];
  const s = seen.replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out: string[] = [s];
  // equation-style: x = 9, x=8
  for (const m of s.matchAll(/\b[a-z]\s*=\s*[+-]?\d+(?:\/\d+)?(?:\.\d+)?/gi)) {
    out.push(m[0]!);
  }
  // bare fractions / numbers as separate tokens
  for (const m of s.matchAll(/[+-]?\d+\/\d+|[+-]?\d+(?:\.\d+)?/g)) {
    out.push(m[0]!);
  }
  // clock times (6:40, 12:10) — keep ordered so callers can prefer final vs ghost
  for (const m of s.matchAll(/\b\d{1,2}\s*:\s*\d{2}\b/g)) {
    out.push(m[0]!.replace(/\s+/g, ''));
  }
  // ratio forms 2:3
  for (const m of s.matchAll(/\b\d+\s*:\s*\d+\b/g)) {
    out.push(m[0]!.replace(/\s+/g, ''));
  }
  // last whitespace-separated token often is the final rewrite
  const parts = s.split(' ').map((p) => p.replace(/,/g, '').trim()).filter(Boolean);
  if (parts.length > 1) {
    out.push(parts[parts.length - 1]!);
    // also second-to-last when last looks like a unit
    if (parts.length >= 2 && /^[a-z%]+$/i.test(parts[parts.length - 1]!)) {
      out.push(parts[parts.length - 2]!);
    }
  }
  const seenKeys = new Set<string>();
  const uniq: string[] = [];
  for (const c of out) {
    const k = c.toLowerCase().replace(/\s+/g, '');
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    uniq.push(c);
  }
  return uniq;
}

/** Strip leading "1." / "Q2)" labels and trailing "= ?" blanks from a printed question. */
export function stripQuestionNoise(question: unknown): string {
  if (typeof question !== 'string') return '';
  return question
    // Require whitespace after "1." / "2)" so decimals like "0.4 + 0.35" are not eaten as item numbers.
    .replace(/^\s*(?:q(?:uestion)?\s*)?\d+\s*[.)]\s+/i, '')
    .replace(/[−–]/g, '-')
    .replace(/\s*=\s*(?:\?|_+|\[\s*\]|…+|\.{2,})?\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Exact value of a bare two-operand arithmetic question ("6 × 7 =", "2/3 − 1/6 = ?", "4/5 ÷ 2/5").
 * Returns null for anything else (word problems, algebra, units) so the model's grading stands.
 */
export function solveSimpleArithmetic(question: unknown): Frac | null {
  const q = stripQuestionNoise(question);
  if (!q) return null;
  // Allow optional thousands separators in operands (3,000 + 400 + 5).
  const num = '(-?\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?|-?\\d+(?:\\.\\d+)?(?:\\/\\d+)?)';
  // Two-operand
  let m = q.match(new RegExp(`^${num}\\s*([+\\-×xX*÷]|\\s\\/\\s)\\s*${num}$`));
  if (m) {
    const a = parseNumberish(m[1]!.replace(/,/g, ''));
    const b = parseNumberish(m[3]!.replace(/,/g, ''));
    if (!a || !b) return null;
    const op = m[2]!.trim();
    if (op === '+') return frac(a.n * b.d + b.n * a.d, a.d * b.d);
    if (op === '-') return frac(a.n * b.d - b.n * a.d, a.d * b.d);
    if (op === '×' || op === 'x' || op === 'X' || op === '*') return frac(a.n * b.n, a.d * b.d);
    if (op === '÷' || op === '/') return b.n === 0 ? null : frac(a.n * b.d, a.d * b.n);
    return null;
  }
  // Three-operand sum only: a + b + c (place-value expanded form)
  m = q.match(new RegExp(`^${num}\\s*\\+\\s*${num}\\s*\\+\\s*${num}$`));
  if (m) {
    const a = parseNumberish(m[1]!.replace(/,/g, ''));
    const b = parseNumberish(m[2]!.replace(/,/g, ''));
    const c = parseNumberish(m[3]!.replace(/,/g, ''));
    if (!a || !b || !c) return null;
    const ab = frac(a.n * b.d + b.n * a.d, a.d * b.d);
    if (!ab) return null;
    return frac(ab.n * c.d + c.n * ab.d, ab.d * c.d);
  }
  return null;
}

function formatFrac(f: Frac): string {
  if (f.d === 1) return String(f.n);
  // Prefer a short decimal when the fraction is a terminating decimal (homework decimals).
  const dec = f.n / f.d;
  if (Number.isFinite(dec)) {
    const rounded = Math.round(dec * 1_000_000) / 1_000_000;
    if (Math.abs(rounded - dec) < 1e-12) {
      const s = String(rounded);
      if (/^-?\d+\.\d+$/.test(s) && s.length <= 12) return s;
    }
  }
  return `${f.n}/${f.d}`;
}

/** Linear ax+b term → {a,b} as fractions over a shared scale (exact). */
function parseLinearSide(raw: string): { a: Frac; b: Frac } | null {
  let s = raw.replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (!s) return null;
  // a(x±c) or a(var±c)
  let m = s.match(/^(-?\d+(?:\/\d+)?)?\(([a-z])([+-]\d+(?:\/\d+)?)?\)$/i);
  if (m) {
    const coef = m[1] ? parseNumberish(m[1]) : frac(1, 1);
    const inner = m[3] ? parseNumberish(m[3]) : frac(0, 1);
    if (!coef || !inner) return null;
    return { a: coef, b: frac(coef.n * inner.n, coef.d * inner.d)! };
  }
  // (p/q)x or (p/q)*x
  m = s.match(/^\((-?\d+)\/(\d+)\)([a-z])$/i);
  if (m) return { a: frac(Number(m[1]), Number(m[2]))!, b: frac(0, 1)! };
  // pure number
  const pure = parseNumberish(s);
  if (pure && !/[a-z]/i.test(s)) return { a: frac(0, 1)!, b: pure };
  // ±k var ± c  (one variable only)
  if ((s.match(/[a-z]/gi) || []).length !== 1) return null;
  const varMatch = s.match(/[a-z]/i);
  if (!varMatch) return null;
  const v = varMatch[0];
  // split into signed terms
  const terms = s.replace(/^\+/, '').match(/[+-]?[^+-]+/g);
  if (!terms?.length) return null;
  let a = frac(0, 1)!;
  let b = frac(0, 1)!;
  for (const term of terms) {
    if (term.includes(v) || term.includes(v.toUpperCase())) {
      let coefRaw = term.replace(new RegExp(v, 'i'), '');
      // "(1/2)" or "-(3/4)" wrappers around the coefficient
      const wrap = coefRaw.match(/^\(?([+-]?\d+(?:\/\d+)?)\)?$/);
      if (wrap) coefRaw = wrap[1];
      let coef: Frac | null;
      if (coefRaw === '' || coefRaw === '+') coef = frac(1, 1);
      else if (coefRaw === '-') coef = frac(-1, 1);
      else coef = parseNumberish(coefRaw);
      if (!coef) return null;
      a = frac(a.n * coef.d + coef.n * a.d, a.d * coef.d)!;
    } else {
      const c = parseNumberish(term);
      if (!c) return null;
      b = frac(b.n * c.d + c.n * b.d, b.d * c.d)!;
    }
  }
  return { a, b };
}

/**
 * Solve one-variable linear equations: "3x + 7 = 22", "5(x - 4) = 15", "4x - 8 = 2x + 6", "(1/2)x + 6 = 10".
 * Returns a display string like "x = 5" or null when not a simple linear equation.
 */
export function solveLinearEquation(question: unknown): string | null {
  const q = stripQuestionNoise(question);
  if (!q || !q.includes('=')) return null;
  // Ignore pure arithmetic left=right with no variable
  if (!/[a-z]/i.test(q)) return null;
  const parts = q.split('=');
  if (parts.length !== 2) return null;
  const left = parseLinearSide(parts[0]);
  const right = parseLinearSide(parts[1]);
  if (!left || !right) return null;
  // left.a * x + left.b = right.a * x + right.b
  const a = frac(left.a.n * right.a.d - right.a.n * left.a.d, left.a.d * right.a.d);
  const b = frac(right.b.n * left.b.d - left.b.n * right.b.d, right.b.d * left.b.d);
  if (!a || !b || a.n === 0) return null;
  const x = frac(b.n * a.d, b.d * a.n);
  if (!x) return null;
  const varMatch = q.match(/[a-z]/i);
  const v = varMatch ? varMatch[0].toLowerCase() : 'x';
  return `${v} = ${formatFrac(x)}`;
}

/** "10% of 50" → 5 */
export function solvePercentOf(question: unknown): string | null {
  const q = stripQuestionNoise(question);
  const m = q.match(/^(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const pct = Number(m[1]);
  const base = Number(m[2]);
  if (!Number.isFinite(pct) || !Number.isFinite(base)) return null;
  const val = (pct / 100) * base;
  return Number.isInteger(val) ? String(val) : String(Math.round(val * 1000) / 1000);
}

/** Unit conversion fill-ins: "1 ft = __ in", "24 in = __ ft", "2 yd = __ ft". */
export function solveUnitConversion(question: unknown): string | null {
  const q = stripQuestionNoise(question)
    .replace(/_+/g, '')
    .replace(/\s*=\s*$/, '')
    .trim();
  const m = q.match(
    /^(\d+(?:\.\d+)?)\s*(ft|feet|foot|in|inches?|yd|yards?|yard)\s*(?:=|to|in)?\s*(\d+(?:\.\d+)?)?\s*(ft|feet|foot|in|inches?|yd|yards?|yard)?$/i,
  );
  // Patterns like "1 ft = __ in" or "3 ft =  in" after blank strip → "1 ft = in"
  const m2 = q.match(/^(\d+(?:\.\d+)?)\s*(ft|feet|foot|in|inches?|yd|yards?|yard)\s*=?\s*(ft|feet|foot|in|inches?|yd|yards?|yard)$/i);
  const m3 = q.match(/^(\d+(?:\.\d+)?)\s*(ft|feet|foot|in|inches?|yd|yards?|yard)\s*=\s*__*\s*(ft|feet|foot|in|inches?|yd|yards?|yard)$/i);
  const hit = m3 || m2;
  if (!hit) {
    // "1 ft = 12 in" style question where answer is the middle number — not used
    if (m && m[3] && m[4]) return null;
    return null;
  }
  const n = Number(hit[1]);
  const from = hit[2].toLowerCase();
  const to = hit[3].toLowerCase();
  const toIn = (unit: string, val: number): number | null => {
    if (/^in/.test(unit)) return val;
    if (/^ft|foot|feet/.test(unit)) return val * 12;
    if (/^yd/.test(unit)) return val * 36;
    return null;
  };
  const fromInches = toIn(from, n);
  if (fromInches == null) return null;
  if (/^in/.test(to)) return String(fromInches);
  if (/^ft|foot|feet/.test(to)) {
    const v = fromInches / 12;
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  }
  if (/^yd/.test(to)) {
    const v = fromInches / 36;
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  }
  return null;
}

/** Area / perimeter of rectangle, square, triangle from a short stem. */
export function solveAreaPerimeter(question: unknown): string | null {
  const q = stripQuestionNoise(question).toLowerCase();
  let m = q.match(/area of a (?:(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*by\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*rectangle|rectangle.*?(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*by\s*(\d+(?:\.\d+)?))/i);
  if (!m) m = q.match(/(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*by\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?.*rectangle.*area|area.*rectangle.*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*by\s*(\d+(?:\.\d+)?)/i);
  // simpler: "Area of a 5 cm by 3 cm rectangle"
  m = q.match(/area of a (\d+(?:\.\d+)?)\s*(cm|m|in|ft|inches?)?\s*by\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft|inches?)?\s*rectangle/);
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[3]);
    const unit = (m[2] || m[4] || '').replace(/inches?/, 'in');
    const area = w * h;
    return unit ? `${area} ${unit}²` : String(area);
  }
  m = q.match(/perimeter of (?:the )?same rectangle|perimeter of a (\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*by\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?\s*rectangle/);
  if (m && m[1]) {
    const w = Number(m[1]);
    const h = Number(m[3]);
    const unit = (m[2] || m[4] || '').replace(/inches?/, 'in');
    const p = 2 * (w + h);
    return unit ? `${p} ${unit}` : String(p);
  }
  // same rectangle perimeter — need dimensions from sibling; can't alone. skip.
  m = q.match(/area of a square with side (\d+(?:\.\d+)?)\s*(cm|m|in|ft|inches?)?/);
  if (m) {
    const s = Number(m[1]);
    const unit = (m[2] || '').replace(/inches?/, 'in');
    const area = s * s;
    return unit ? `${area} ${unit}²` : String(area);
  }
  m = q.match(/area of a triangle.*?base\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?.*?height\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?/);
  if (m) {
    const b = Number(m[1]);
    const h = Number(m[3]);
    const unit = (m[2] || m[4] || '').replace(/inches?/, 'in');
    const area = (b * h) / 2;
    const text = Number.isInteger(area) ? String(area) : String(area);
    return unit ? `${text} ${unit}²` : text;
  }
  return null;
}

/** Expand k(a·var ± c) → (k*a)var ± k*c. */
function expandDistribute(expr: string): string | null {
  const m = expr
    .replace(/\s+/g, '')
    .replace(/[−–]/g, '-')
    .match(/^(-?\d+)\(([+-]?\d*)([a-z])([+-]\d+)\)$/i);
  if (!m) return null;
  const k = Number(m[1]);
  const coefRaw = m[2];
  const coef = coefRaw === '' || coefRaw === '+' ? 1 : coefRaw === '-' ? -1 : Number(coefRaw);
  const v = m[3];
  const c = Number(m[4]);
  if (!Number.isFinite(k) || !Number.isFinite(coef) || !Number.isFinite(c)) return null;
  const a = k * coef;
  const b = k * c;
  const bPart = b === 0 ? '' : b > 0 ? `+${b}` : `${b}`;
  return `${a}${v}${bPart}`.replace(/\+-/, '-');
}

/** Parse "h:mm" / "hh:mm" clock times into minutes-from-midnight. */
function parseClockToMinutes(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || min < 0 || min > 59 || h < 0 || h > 23) return null;
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

function formatClock(totalMin: number): string {
  let m = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

/**
 * Elapsed-time arithmetic: "2:00 to 2:45 is how long?", "9:30 + 20 minutes =", "7:15 − 25 minutes =".
 */
export function solveElapsedTime(question: unknown): string | null {
  const q = stripQuestionNoise(question)
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!q) return null;
  // start to end duration
  let m = q.match(
    /^(\d{1,2}\s*:\s*\d{2})\s*(?:to|-|–|until)\s*(\d{1,2}\s*:\s*\d{2})\s*(?:is\s+)?(?:how\s+long)?\??$/i,
  );
  if (m) {
    const a = parseClockToMinutes(m[1]!);
    const b = parseClockToMinutes(m[2]!);
    if (a == null || b == null) return null;
    let diff = b - a;
    if (diff < 0) diff += 24 * 60;
    return `${diff} min`;
  }
  // clock ± N minutes
  m = q.match(/^(\d{1,2}\s*:\s*\d{2})\s*([+-])\s*(\d+)\s*(?:minutes?|mins?)?$/i);
  if (m) {
    const base = parseClockToMinutes(m[1]!);
    const n = Number(m[3]);
    if (base == null || !Number.isFinite(n)) return null;
    const delta = m[2] === '-' ? -n : n;
    return formatClock(base + delta);
  }
  return null;
}

/** Simplify ratios / write ratio as fraction: "12 : 18" → "2:3"; "5 : 20 as a fraction" → "1/4". */
export function solveRatioSimplify(question: unknown): string | null {
  const q = stripQuestionNoise(question).replace(/\s+/g, ' ').trim();
  if (!q) return null;
  const asFraction = /fraction|lowest\s+terms|simplest\s+form/i.test(q);
  // a : b  or  a/b  ratio pair in the stem
  let m = q.match(/(\d+)\s*:\s*(\d+)/);
  if (!m) m = q.match(/(?:ratio|fraction)\s+(\d+)\s*\/\s*(\d+)/i);
  if (!m) m = q.match(/\b(\d+)\s*\/\s*(\d+)\b/);
  if (!m) return null;
  // Avoid hijacking pure fraction arithmetic already handled elsewhere ("2/3 − 1/6")
  if (/[+\-×*÷]|of\b|percent|%/i.test(q) && !/ratio|fraction in lowest|as a fraction/i.test(q)) return null;
  if (!/ratio|simplify|lowest\s+terms|as a fraction|write\s+\d/i.test(q) && !/^\d+\s*:\s*\d+$/.test(q)) {
    // only act when the stem is clearly a ratio prompt
    if (!/simplify|ratio|lowest/i.test(q)) return null;
  }
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  const g = gcd(a, b);
  const n = a / g;
  const d = b / g;
  if (asFraction || /as a fraction|fraction in lowest/i.test(q)) return `${n}/${d}`;
  return `${n}:${d}`;
}

/**
 * Unit price / rate word stems: "3 apples cost $1.50. Cost of 1 apple?", "60 miles in 2 hours. Rate?",
 * "Unit price: $4.80 for 6 pens".
 */
export function solveUnitRate(question: unknown): string | null {
  const q0 = stripQuestionNoise(question).replace(/\s+/g, ' ').trim();
  if (!q0) return null;
  const q = q0.replace(/\$/g, '');
  // N items cost X. Cost of 1 …?
  let m = q.match(
    /^(\d+)\s+[a-z][a-z\s]*?\s+cost\s+(\d+(?:\.\d+)?)\s*[.!]?\s*(?:cost\s+of\s+1|each|per)\b/i,
  );
  if (!m) {
    m = q.match(/^(\d+)\s+[a-z][a-z\s]*?\s+cost\s+(\d+(?:\.\d+)?)/i);
  }
  if (m && /cost of 1|each|per|1 apple|unit/i.test(q0)) {
    const n = Number(m[1]);
    const total = Number(m[2]);
    if (n > 0 && Number.isFinite(total)) {
      const unit = total / n;
      const moneyish = q0.includes('$') || /cost|price|\$/i.test(q0);
      const text = moneyish
        ? unit.toFixed(2).replace(/(\.\d)0$/, '$1').replace(/\.00$/, '')
        : Number.isInteger(unit)
          ? String(unit)
          : unit.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      // Always keep two cents for money when the source had cents (1.50 → 0.50)
      const moneyText =
        moneyish && /\.\d/.test(String(m[2]))
          ? unit.toFixed(2)
          : text;
      return moneyish ? `$${moneyText}` : text;
    }
  }
  // Unit price: $4.80 for 6 pens
  m = q.match(/(?:unit\s+price|price)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:for|\/)\s*(\d+)/i);
  if (m) {
    const total = Number(m[1]);
    const n = Number(m[2]);
    if (n > 0 && Number.isFinite(total)) {
      const unit = total / n;
      const moneyText = /\.\d/.test(String(m[1])) ? unit.toFixed(2) : String(unit);
      return `$${moneyText}`;
    }
  }
  // 60 miles in 2 hours. Rate?
  m = q.match(/^(\d+(?:\.\d+)?)\s*(miles?|km|meters?|m|feet|ft)\s+in\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min|seconds?|sec)/i);
  if (m && /rate|speed|mph|per\b/i.test(q0)) {
    const dist = Number(m[1]);
    const time = Number(m[3]);
    if (time > 0 && Number.isFinite(dist)) {
      const rate = dist / time;
      const text = Number.isInteger(rate) ? String(rate) : String(Math.round(rate * 1000) / 1000);
      const dUnit = m[2]!.toLowerCase();
      const tUnit = m[4]!.toLowerCase();
      if (/mile/.test(dUnit) && /hour|hr/.test(tUnit)) return `${text} mph`;
      return `${text}`;
    }
  }
  return null;
}

/** Expand a simple product like 3(2b-1) → 6b-3; full "3(2b-1)=…" uses the left side. */
export function solveSimplifyExpression(question: unknown): string | null {
  const q = stripQuestionNoise(question);
  // Do not treat solve-for-x equations as simplify (e.g. "4x - 8 = 2x + 6").
  if (/=/.test(q) && solveLinearEquation(q)) return null;
  const sides = q.split('=');
  // Two-sided with variables on both sides and not a distribute-left form → leave to linear solver
  if (sides.length === 2) {
    const L = sides[0].trim();
    const R = sides[1].trim();
    if (/[a-z]/i.test(L) && /[a-z]/i.test(R) && !/^\d+\s*\(/i.test(L.replace(/\s+/g, ''))) {
      return null;
    }
  }
  const left = (sides[0] || q).trim();
  const expanded = expandDistribute(left);
  if (expanded) return expanded;
  // like-terms: 3x+2x → 5x ; 4y-y → 3y ; 5m+3-2m → 3m+3
  const like = left.replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (/^[+-]?\d*[a-z](?:[+-]\d*[a-z])+$/i.test(like) && !like.includes('(')) {
    // only variable terms, one var
    const vars = like.match(/[a-z]/gi) || [];
    if (!vars.length || new Set(vars.map((x) => x.toLowerCase())).size !== 1) return null;
    const v = (vars[0] ?? 'x').toLowerCase();
    const side = parseLinearSide(like);
    if (!side || side.b.n !== 0) return null;
    return `${formatFrac(side.a)}${v}`;
  }
  if (/^[+-]?(?:\d*[a-z]|\d+)(?:[+-](?:\d*[a-z]|\d+))+$/i.test(like) && !like.includes('(')) {
    const vars = like.match(/[a-z]/gi) || [];
    if (!vars.length || new Set(vars.map((x) => x.toLowerCase())).size !== 1) return null;
    const v = (vars[0] ?? 'x').toLowerCase();
    const side = parseLinearSide(like);
    if (!side) return null;
    const aStr = side.a.n === 0 ? '' : `${formatFrac(side.a)}${v}`;
    const bStr =
      side.b.n === 0 ? '' : side.b.n > 0 && aStr ? `+${formatFrac(side.b)}` : formatFrac(side.b);
    return `${aStr}${bStr}` || '0';
  }
  return null;
}

function hasAlgebraVar(s: string): boolean {
  // Strip common unit words so "1 ft = __ in" is not treated as algebra.
  const cleaned = s.replace(
    /\b(ft|feet|foot|in|inch|inches|yd|yard|yards|cm|mm|m|kg|lb|lbs|min|mins|minute|minutes|hr|hrs|hour|hours)\b/gi,
    ' ',
  );
  return /[a-z]/i.test(cleaned);
}

/**
 * When the model stuffed the whole student equation into "question" ("3(2b-1)=6b-1"), recover the
 * printed left side as the problem and the right-hand side as what the student wrote on the page.
 */
export function splitStudentEquation(item: {
  question?: string | null;
  seen?: string | null;
}): { question: string; equationSeen: string } | null {
  if (typeof item.question !== 'string' || !item.question.includes('=')) return null;
  const q = stripQuestionNoise(item.question);
  const parts = q.split('=');
  if (parts.length !== 2) return null;
  const left = parts[0].trim();
  const right = parts[1].trim();
  if (!left || !right) return null;
  // Only treat as "student wrote both sides" when the RHS looks like an algebraic answer
  // (has a variable), not a pure number solve like "5(x-4)=15" or a unit fill-in.
  const leftCompact = left.replace(/\s+/g, '');
  const isSimplify =
    (/^\d+\([^)]+\)$/i.test(leftCompact) && hasAlgebraVar(right)) ||
    (hasAlgebraVar(left) && hasAlgebraVar(right) && !/^[a-z]\s*=/i.test(right));
  if (!isSimplify) return null;
  return { question: left, equationSeen: right };
}

/**
 * Best-effort code answer for a printed question. Returns a canonical expected string, or null when
 * the item is not something we should override the model on.
 */
export function solveHomeworkQuestion(question: unknown): string | null {
  const arith = solveSimpleArithmetic(question);
  if (arith) return formatFrac(arith);
  const linear = solveLinearEquation(question);
  if (linear) return linear;
  const pct = solvePercentOf(question);
  if (pct) return pct;
  const unit = solveUnitConversion(question);
  if (unit) return unit;
  const area = solveAreaPerimeter(question);
  if (area) return area;
  const simp = solveSimplifyExpression(question);
  if (simp) return simp;
  const elapsed = solveElapsedTime(question);
  if (elapsed) return elapsed;
  const ratio = solveRatioSimplify(question);
  if (ratio) return ratio;
  const rate = solveUnitRate(question);
  if (rate) return rate;
  return null;
}

export type HomeworkCheckableItem = HomeworkScoredItem & {
  question?: string | null;
  expected?: string | null;
  seen?: string | null;
  /** Model self-reported confidence 0–1 or "low"|"high". Low/unreadable → credit null. */
  confidence?: number | string | null;
};

const BLANK_SEEN_RE =
  /^(?:\?+|_+|…+|\.{2,}|n\/?a|none|null|blank|empty|illegible|unreadable|not\s+visible|cannot\s+read|can'?t\s+read|no\s+answer|left\s+blank|\[\s*\]|\(\s*\)|-)$/i;

/** True when the model reported a blank / placeholder instead of a real student answer. */
export function isBlankStudentAnswer(seen: unknown): boolean {
  if (seen == null) return true;
  if (typeof seen !== 'string') return true;
  const s = seen.replace(/\s+/g, ' ').trim();
  if (!s) return true;
  if (BLANK_SEEN_RE.test(s)) return true;
  // bare underscore/question blanks mixed with spaces
  if (/^[_\s?….-]+$/u.test(s)) return true;
  return false;
}

function isLowConfidence(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw < 0.45;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    if (t === 'low' || t === 'unreadable' || t === 'uncertain') return true;
    const n = Number(t);
    return Number.isFinite(n) && n < 0.45;
  }
  return false;
}

function normAnswer(v: unknown): string {
  return typeof v === 'string'
    ? v
        .toLowerCase()
        .replace(/[−–]/g, '-')
        .replace(/^\s*[a-z]\s*=\s*/i, '')
        .replace(/cm\s*2\b/g, 'cm²')
        .replace(/in\s*2\b/g, 'in²')
        .replace(/m\s*2\b/g, 'm²')
        .replace(/(\d)\s*(cm|m|in|ft)\s*²/g, '$1$2²')
        .replace(/(\d)\s*(cm|m|in|ft)\b/g, '$1$2')
        .replace(/minutes?|mins?/g, 'min')
        // Keep decimal points and fraction slashes between digits; strip other punctuation.
        .replace(/(?<=\d),(?=\d{3}\b)/g, '') // drop thousands commas
        .replace(/[^\d.a-z²³%/+\-]+/gi, '')
        .replace(/\.(?!\d)/g, '') // trailing/odd dots only
    : '';
}

/** True when expected looks like a rubric instruction rather than a concrete key answer. */
function isRubricStyleExpected(raw: string): boolean {
  return (
    /\b(e\.g\.|for example|or equivalent|or similar|supporting the|clear statement of|central (?:event|message)|textual evidence)\b/i.test(
      raw,
    ) || /^(?:a |an |the )?(?:specific|clear|accurate|brief)\b/i.test(raw.trim())
  );
}

/** Compare student seen vs code/model expected with light unit/alias tolerance. */
export function answersMatch(expected: unknown, seen: unknown): boolean {
  const eRaw = typeof expected === 'string' ? expected : '';
  const sRaw = typeof seen === 'string' ? seen : '';
  const e = normAnswer(expected);
  const s = normAnswer(seen);
  if (!e || !s) return false;

  // Numeric with grouping: "3,405" vs "3405" vs misread "3.405" (comma→dot under blur).
  // Run BEFORE the e===s short-circuit so normAnswer's leftover comma/dot cannot block it.
  {
    const eNumRaw = eRaw.replace(/^\s*[a-z]\s*=\s*/i, '').trim();
    const sNumRaw = sRaw.replace(/^\s*[a-z]\s*=\s*/i, '').trim();
    const eGrouped = stripGroupingSeparators(eNumRaw);
    const sGrouped = stripGroupingSeparators(sNumRaw);
    // Ambiguous single-dot thousands: "3.405" (could be 3.405 decimal OR 3405). Prefer integer match
    // when the other side is a whole number with/without commas: 3,405 / 3405.
    const coerceThousands = (raw: string, other: string): string => {
      const t = raw.replace(/,/g, '').trim();
      const o = other.replace(/,/g, '').replace(/\./g, '').trim();
      const m = raw.trim().match(/^(-?\d+)\.(\d{3})$/);
      if (m && /^-?\d+$/.test(o) && o === `${m[1]}${m[2]}`) return `${m[1]}${m[2]}`;
      return t;
    };
    const eCoerced = coerceThousands(eGrouped, sGrouped);
    const sCoerced = coerceThousands(sGrouped, eGrouped);
    if (/^-?\d+$/.test(eCoerced) && /^-?\d+$/.test(sCoerced) && eCoerced === sCoerced) return true;
    const ef0 = parseNumberish(eCoerced);
    const sf0 = parseNumberish(sCoerced);
    if (ef0 && sf0 && ef0.n === sf0.n && ef0.d === sf0.d) return true;
  }

  if (e === s) {
    // Comma / list punctuation is meaningful on rewrite items (commas practice).
    // But thousand-separators in numbers (3,405 vs 3405) are not.
    if (/,/.test(eRaw) || /,/.test(sRaw)) {
      const stripThousands = (t: string) =>
        t.replace(/(\d),(\d{3})\b/g, '$1$2').replace(/(\d),(\d{3})\b/g, '$1$2');
      const eComma = stripThousands(eRaw)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.’'"]/g, '')
        .trim();
      const sComma = stripThousands(sRaw)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.’'"]/g, '')
        .trim();
      // pure numeric with optional grouping commas / European thousands dots
      const eNum = eComma.replace(/,/g, '');
      let sNum = sComma.replace(/,/g, '');
      // European thousands: 3.405 → 3405 when expected is 3,405 / 3405
      const euThousands = sRaw.trim().match(/^(-?\d+)\.(\d{3})$/);
      if (euThousands && /^-?\d+$/.test(eNum)) sNum = `${euThousands[1]}${euThousands[2]}`;
      const usThousands = eRaw.trim().match(/^(-?\d+)\.(\d{3})$/);
      let eNum2 = eNum;
      if (usThousands && /^-?\d+$/.test(sNum) && eRaw.includes('.')) eNum2 = `${usThousands[1]}${usThousands[2]}`;
      if (/^-?\d+(\.\d+)?$/.test(eNum2) && /^-?\d+(\.\d+)?$/.test(sNum) && eNum2 === sNum) return true;
      if (/^-?\d+(\.\d+)?$/.test(eNum) && /^-?\d+(\.\d+)?$/.test(sNum) && eNum === sNum) return true;
      return eComma === sComma;
    }
    return true;
  }
  // x=5 vs 5
  if (e.replace(/^[a-z]=/, '') === s.replace(/^[a-z]=/, '')) return true;
  // clock times: 6:40 vs 06:40; 45 min vs 45 minutes vs 45
  {
    const eClock = parseClockToMinutes(eRaw.replace(/^\s*[a-z]\s*=\s*/i, '').trim());
    const sClock = parseClockToMinutes(sRaw.replace(/^\s*[a-z]\s*=\s*/i, '').trim());
    if (eClock != null && sClock != null && eClock === sClock) return true;
    const eMin = eRaw.match(/^(\d+)\s*(?:min(?:utes?)?)?$/i);
    const sMin = sRaw.match(/^(\d+)\s*(?:min(?:utes?)?)?$/i);
    if (eMin && sMin && eMin[1] === sMin[1] && /min/i.test(eRaw + sRaw)) return true;
  }
  // ratios 2:3 vs 2/3 vs 2 to 3 (when both sides look like ratio forms)
  {
    const ratioParts = (raw: string): { a: number; b: number } | null => {
      const m = raw.trim().match(/^(\d+)\s*[:\/]\s*(\d+)$/) || raw.trim().match(/^(\d+)\s+to\s+(\d+)$/i);
      if (!m) return null;
      return { a: Number(m[1]), b: Number(m[2]) };
    };
    const er = ratioParts(eRaw.replace(/\$/g, '').trim());
    const sr = ratioParts(sRaw.replace(/\$/g, '').trim());
    if (er && sr && er.a === sr.a && er.b === sr.b) return true;
    if (er && sr) {
      const g1 = gcd(er.a, er.b);
      const g2 = gcd(sr.a, sr.b);
      if (er.a / g1 === sr.a / g2 && er.b / g1 === sr.b / g2) return true;
    }
  }
  // money $0.50 vs 0.50 vs 0.5
  {
    const money = (raw: string): number | null => {
      const m = raw.trim().match(/^\$?\s*(\d+(?:\.\d+)?)\s*(?:each)?$/i);
      if (!m) return null;
      return Number(m[1]);
    };
    const em = money(eRaw);
    const sm = money(sRaw);
    if (em != null && sm != null && Math.abs(em - sm) < 1e-9) return true;
  }
  // numeric fractions / decimals
  const ef = parseNumberish(String(expected).replace(/^\s*[a-z]\s*=\s*/i, '').trim());
  const sf = parseNumberish(String(seen).replace(/^\s*[a-z]\s*=\s*/i, '').trim());
  if (ef && sf && ef.n === sf.n && ef.d === sf.d) return true;
  // Open short answers only (not math): expected token contained in seen sentence (or reverse).
  // Treat "x" as math only when it looks like a multiply/variable operator, not the letter inside "textual".
  const mathish =
    /[\d=+\-×*÷\/]|cm²|in²|m²|ft\b|mph|\$|(?:^|[^a-z])x(?:[^a-z]|$)/i.test(eRaw + sRaw);
  if (!mathish && !/,/.test(eRaw) && e.length >= 3 && (s.includes(e) || e.includes(s))) return true;
  // Rubric-style expected ("Specific textual evidence… e.g. …"): credit a non-empty short student phrase
  // that matches an e.g. example, or that is a real multi-word answer (not a blank).
  if (!mathish && isRubricStyleExpected(eRaw)) {
    const eg = eRaw.match(/e\.g\.?\s*[:=]?\s*([^)]+?)(?:\)|$)/i);
    if (eg) {
      const examples = eg[1]!.split(/,|\/|;|\bor\b/i).map((p) => p.trim()).filter((p) => p.length >= 3);
      if (examples.some((ex) => answersMatch(ex.replace(/\.$/, ''), seen))) return true;
    }
    // parenthetical examples: (or equivalent accurate summary of the central event)
    const paren = eRaw.match(/\(([^)]{6,})\)/);
    if (paren && !/e\.g/i.test(paren[1]!)) {
      // ignore pure instruction parens
    }
    // substantive student phrase (3+ letters) on open response — accept when expected is instructional
    if (s.length >= 8 && /[a-z]{3,}/i.test(sRaw) && !isBlankStudentAnswer(sRaw)) return true;
  }
  // "bacteria or fungi" / "the frog" soft alternatives
  if (!mathish && /\bor\b/i.test(eRaw)) {
    const parts = eRaw.split(/\s+or\s+/i).map((p) => p.trim()).filter(Boolean);
    if (parts.some((p) => answersMatch(p, seen))) return true;
  }
  // light science synonyms
  const syn: Record<string, string[]> = {
    fungi: ['mushroom', 'mushrooms', 'fungus', 'mold', 'yeast'],
    bacteria: ['bacterium', 'germs', 'microbes'],
    frog: ['the frog', 'frogs'],
    sun: ['the sun', 'solar'],
  };
  for (const [key, vals] of Object.entries(syn)) {
    if (e.includes(key) && vals.some((v) => s.includes(normAnswer(v)) || normAnswer(v) === s)) return true;
    if (s.includes(key) && vals.some((v) => e.includes(normAnswer(v)))) return true;
  }
  // Extract trailing number from "3 x 8 = 24 marbles"
  if (ef) {
    const tail = String(seen).match(/(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*(?:[a-z%]+)?\s*$/i);
    if (tail) {
      const tf = parseNumberish(tail[1] ?? '');
      if (tf && tf.n === ef.n && tf.d === ef.d) return true;
    }
  }
  return false;
}

/**
 * No-key safety net: for items the code can solve, credit is decided here so a model that copied the
 * student's wrong answer into "expected" cannot rubber-stamp it.
 */
export function verifyArithmeticItems<T extends HomeworkCheckableItem>(items: ReadonlyArray<T>): T[] {
  const mapped = items.map((it) => {
    // Prefer solving the full question (linear eq, arithmetic). Only split "expr = expr"
    // simplify forms when the full stem is not itself a solvable equation.
    let question = it.question;
    let seen = it.seen;
    let truth = solveHomeworkQuestion(question);
    const split = splitStudentEquation(it);
    if (!truth && split) {
      question = split.question;
      truth = solveHomeworkQuestion(question);
    }
    // Stuffed simplify equations ("3(2b-1)=6b-1"): if the model "corrected" seen to the key,
    // recover the RHS as the real student writing.
    if (split && truth) {
      const seenNorm = normAnswer(it.seen);
      const rhsNorm = normAnswer(split.equationSeen);
      const truthNorm = normAnswer(truth);
      if (seenNorm && truthNorm && seenNorm === truthNorm && rhsNorm && rhsNorm !== truthNorm) {
        seen = split.equationSeen;
        question = split.question;
      } else if (isBlankStudentAnswer(seen)) {
        seen = split.equationSeen;
        question = split.question;
      }
    }
    if (!truth) return { ...it, question, seen, expected: it.expected, _truth: null as string | null };
    const of = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    if (isLowConfidence(it.confidence)) {
      return { ...it, question, expected: truth, credit: null, _truth: truth };
    }
    if (isBlankStudentAnswer(seen)) {
      return { ...it, question, seen, expected: truth, credit: 0, _truth: truth };
    }
    if (typeof seen !== 'string') return { ...it, question, expected: truth, _truth: truth };
    // Clock answers with a ghost+final pair (e.g. "6:40 6:50"): the FIRST clock is the darker
    // final answer; later lighter ghosts must not earn credit just because they match the key.
    const clockCands = [...String(seen).matchAll(/\b\d{1,2}\s*:\s*\d{2}\b/g)].map((m) =>
      m[0]!.replace(/\s+/g, ''),
    );
    const truthIsClock = parseClockToMinutes(String(truth).trim()) != null;
    if (truthIsClock && clockCands.length >= 2) {
      const finalClock = clockCands[0]!;
      const rightFinal = answersMatch(truth, finalClock);
      return {
        ...it,
        question,
        seen: finalClock,
        expected: truth,
        credit: rightFinal ? of : 0,
        _truth: truth,
      };
    }
    // Prefer any candidate inside a multi-answer / cross-out blob ("x = 9 x=8", "4/9 4/6").
    const right = answerCandidates(seen).some((c) => answersMatch(truth, c));
    return { ...it, question, seen, expected: truth, credit: right ? of : 0, _truth: truth };
  });

  // Adjacent-row OCR swap: when two consecutive code-solvable items are both wrong, but each
  // "seen" matches the other's truth (68+14 read as 85 and 39+46 as 82), unswap credits.
  for (let i = 0; i < mapped.length - 1; i++) {
    const a = mapped[i]!;
    const b = mapped[i + 1]!;
    if (!a._truth || !b._truth) continue;
    if (typeof a.seen !== 'string' || typeof b.seen !== 'string') continue;
    if (isBlankStudentAnswer(a.seen) || isBlankStudentAnswer(b.seen)) continue;
    if (isLowConfidence(a.confidence) || isLowConfidence(b.confidence)) continue;
    const aOf = typeof a.of === 'number' && a.of > 0 ? a.of : 1;
    const bOf = typeof b.of === 'number' && b.of > 0 ? b.of : 1;
    const aRight = typeof a.credit === 'number' && a.credit >= aOf;
    const bRight = typeof b.credit === 'number' && b.credit >= bOf;
    if (aRight || bRight) continue;
    const aMatchesB = answerCandidates(a.seen).some((c) => answersMatch(b._truth, c));
    const bMatchesA = answerCandidates(b.seen).some((c) => answersMatch(a._truth, c));
    if (aMatchesB && bMatchesA) {
      mapped[i] = { ...a, seen: b.seen, credit: aOf };
      mapped[i + 1] = { ...b, seen: a.seen, credit: bOf };
      i++; // skip the pair
    }
  }

  return mapped.map((it) => {
    const { _truth: _drop, ...rest } = it as T & { _truth?: string | null };
    void _drop;
    return rest as T;
  });
}

/**
 * Final pass over model items before scoring (no-key paths):
 * 1. code-solvable items re-checked (verifyArithmeticItems / solveHomeworkQuestion);
 * 2. blank / "?" / "___" seen → credit 0 (not invented full credit);
 * 3. low confidence → credit null (unreadable, do not guess);
 * 4. when expected was independently set and matches seen, full credit (no "show your work" dock);
 * 5. every seen empty/unreadable ⇒ null score (unread page), not a confident 0.
 */
export function settleHomeworkItems<T extends HomeworkCheckableItem>(items: ReadonlyArray<T>): T[] {
  // Recover "Perimeter of the same rectangle" using dimensions from the prior area stem.
  const withContext = items.map((it, idx) => {
    if (solveHomeworkQuestion(it.question)) return it;
    const q = stripQuestionNoise(it.question).toLowerCase();
    if (!/perimeter of (?:the )?same rectangle/.test(q)) return it;
    for (let j = idx - 1; j >= 0; j--) {
      const prevQ = stripQuestionNoise(items[j]?.question).toLowerCase();
      const m = prevQ.match(
        /area of a (\d+(?:\.\d+)?)\s*(cm|m|in|ft|inches?)?\s*by\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft|inches?)?\s*rectangle/,
      );
      if (!m) continue;
      const w = Number(m[1]);
      const h = Number(m[3]);
      const unit = (m[2] || m[4] || '').replace(/inches?/, 'in');
      const synthetic = unit
        ? `Perimeter of a ${w} ${unit} by ${h} ${unit} rectangle`
        : `Perimeter of a ${w} by ${h} rectangle`;
      return { ...it, question: synthetic };
    }
    return it;
  });
  let out = verifyArithmeticItems(withContext).map((it) => {
    const of = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    if (isLowConfidence(it.confidence)) return { ...it, credit: null };

    // Recover partial fill-in when the model stuffed "solid, liquid, ___" into the question
    // and left seen blank (H11-class incomplete list answers).
    let seen = it.seen;
    let question = it.question;
    if (isBlankStudentAnswer(seen) && typeof question === 'string') {
      const qm = question.match(/^(\s*(?:q(?:uestion)?\s*)?\d+\s*[.)]?\s*)?(.*?):\s*(.+\b(?:___|_+|…|\?)\b.*)$/i);
      if (qm && /[a-z]{2,}/i.test(qm[3] ?? '')) {
        question = `${qm[1] ?? ''}${qm[2]}`.trim();
        seen = qm[3]!.trim();
      }
    }

    // Incomplete list with remaining blanks ("solid, liquid, ___"): partial credit when some
    // slots are filled and the missing token matches expected (or expected is the missing word).
    if (typeof seen === 'string' && /___|_+|…/.test(seen) && /[a-z]{2,}/i.test(seen)) {
      const tokens = seen
        .split(/[,/]|and/i)
        .map((t) => t.replace(/[_?…]+/g, '').replace(/\s+/g, ' ').trim())
        .filter((t) => t.length >= 2);
      const exp = typeof it.expected === 'string' ? it.expected.trim() : '';
      const missingIsExpected =
        !!exp &&
        tokens.every((t) => normAnswer(t) !== normAnswer(exp)) &&
        !tokens.some((t) => answersMatch(exp, t));
      if (tokens.length >= 1 && missingIsExpected) {
        // One blank left in a short list → half credit (e.g. 1 of 2 pts).
        const half = of >= 2 ? Math.floor(of / 2) : 0.5;
        return { ...it, question, seen, credit: half };
      }
      if (tokens.length >= 1) {
        const half = of >= 2 ? Math.floor(of / 2) : 0.5;
        return { ...it, question, seen, credit: half };
      }
    }

    if (isBlankStudentAnswer(seen)) {
      // blank is a real zero when we could read the question; keep code-set 0, else 0
      if (typeof it.credit === 'number' && seen === it.seen) return it;
      return { ...it, question, seen, credit: 0 };
    }
    const e = normAnswer(it.expected);
    const s = normAnswer(seen);
    // Multi-answer blob: any candidate matching expected earns full credit.
    // Clock ghosts: if multiple clocks, only the first (final) may match.
    if (typeof it.expected === 'string' && typeof seen === 'string') {
      const clocks = [...seen.matchAll(/\b\d{1,2}\s*:\s*\d{2}\b/g)].map((m) => m[0]!.replace(/\s+/g, ''));
      if (clocks.length >= 2 && parseClockToMinutes(String(it.expected).trim()) != null) {
        if (answersMatch(it.expected, clocks[0]!)) {
          if (typeof it.credit !== 'number' || it.credit < of) return { ...it, question, seen: clocks[0], credit: of };
          return { ...it, question, seen: clocks[0] };
        }
        // first clock is the final answer and it disagrees with expected → zero
        if (typeof it.credit === 'number' && it.credit > 0) return { ...it, question, seen: clocks[0], credit: 0 };
      } else if (answerCandidates(seen).some((c) => answersMatch(it.expected, c))) {
        if (typeof it.credit !== 'number' || it.credit < of) return { ...it, question, seen, credit: of };
        return { ...it, question, seen };
      }
    }
    // Only upgrade partial → full when expected and seen match AND expected is not a pure copy of a
    // long student sentence with no independent signal — still allow short exact matches.
    if (e && e === s && typeof it.credit === 'number' && it.credit < of) {
      // still respect comma-sensitive equality
      if (answersMatch(it.expected, seen)) return { ...it, question, seen, credit: of };
    }
    // Soft open-ended: expected phrase inside seen (model was harsh on "community helps")
    if (e && s && typeof it.credit === 'number' && it.credit < of && answersMatch(it.expected, seen)) {
      return { ...it, question, seen, credit: of };
    }
    // Model rubber-stamped full credit but answers clearly disagree (missing comma, wrong spelling kept).
    if (
      typeof it.expected === 'string' &&
      typeof seen === 'string' &&
      typeof it.credit === 'number' &&
      it.credit > 0 &&
      !answersMatch(it.expected, seen) &&
      (/,/.test(it.expected) || /spelling|because|friend|believe|tomorrow|necessary|library/i.test(String(question ?? '')))
    ) {
      return { ...it, question, seen, credit: 0 };
    }
    // General: if expected/seen both present and disagree on a short closed answer, trust mismatch over model 1
    if (
      typeof it.expected === 'string' &&
      typeof seen === 'string' &&
      typeof it.credit === 'number' &&
      it.credit >= of &&
      !answersMatch(it.expected, seen) &&
      normAnswer(it.expected).length <= 40 &&
      (/,/.test(it.expected) || Math.abs(normAnswer(it.expected).length - normAnswer(seen).length) <= 6)
    ) {
      return { ...it, question, seen, credit: 0 };
    }
    return { ...it, question, seen };
  });
  // All blank/unread with no independent expected solve → needs review (null), not 0.
  // If every item is blank AND none were code-solved to a real expected, treat as unread.
  if (out.length && out.every((it) => isBlankStudentAnswer(it.seen) && !solveHomeworkQuestion(it.question))) {
    out = out.map((it) => ({ ...it, credit: null }));
  } else if (out.length && out.every((it) => isBlankStudentAnswer(it.seen) || isLowConfidence(it.confidence))) {
    // mixed blanks still score (zeros); pure-unread without questions stays null above
  }
  // If every credit is null (all unreadable), percentFromItemCredits already returns null.
  if (out.length && out.every((it) => !normAnswer(it.seen) && it.credit == null)) {
    out = out.map((it) => ({ ...it, credit: null }));
  }
  // Drop trailing blank rows the model invented after the last real answer on the page
  // (e.g. Spanish cognates sheet with 4 items → model adds 6 empty "elephant →" rows as zeros).
  while (
    out.length > 1 &&
    isBlankStudentAnswer(out[out.length - 1]?.seen) &&
    (out[out.length - 1]?.credit === 0 || out[out.length - 1]?.credit == null) &&
    !solveHomeworkQuestion(out[out.length - 1]?.question)
  ) {
    out = out.slice(0, -1);
  }
  return out;
}

/** Shared grading rules appended to every homework vision prompt (evaluate + analyze). */
export const HOMEWORK_GRADING_RULES = `Grading rules (always):
- A missing, blank, cropped, smudged or unreadable name is NOT a reason to reject. Still grade the visible work and return studentName null.
- Work in two mental passes on every item: (1) TRANSCRIBE only — copy the printed question into "question" and the student's handwriting into "seen" with no fixing; (2) GRADE — solve the question yourself into "expected", then set credit. Never let pass (2) rewrite pass (1).
- The student's answer is what the STUDENT wrote (usually handwriting or filled blanks), never the printed question or the printed words being corrected. Read the handwriting next to / under each prompt.
- Copy "seen" letter-for-letter and digit-for-digit exactly as the student wrote it — do NOT fix the student's spelling or arithmetic when transcribing (on a spelling sheet "beleive" stays "beleive" and is wrong; "6b-1" stays "6b-1" even if the correct expand is "6b-3"; "x = 4" stays "x = 4" even if the true root is 7).
- Spelling / "fix the word" / "write each word correctly" sheets: the LEFT (often misspelled) word is the prompt only. "seen" is ONLY the handwriting on the right of the arrow or on the blank. If the student rewrote the same misspelling or a different wrong spelling, "seen" keeps that wrong spelling and credit is 0. Never put the dictionary-correct spelling into "seen" unless those exact letters are written.
- Digit rows (addition/subtraction facts): read EACH digit of the student's sum on ITS row. Do not borrow digits from the problem above or below (68+14=82 is not 85; 39+46=85 is not 82). When blurry, set confidence low rather than guessing a nearby fact.
- Crossed-out work is not the answer; use the final un-crossed answer only. If the model would otherwise concatenate both, put only the final answer in "seen". An answer in the margin with an arrow belongs to the item the arrow points to. A faint erased ghost under a darker final answer is not the answer unless no final answer remains.
- Elapsed time / clocks: when a light gray erased ghost sits under or beside a darker final time (e.g. final 6:40 with ghost 6:50), "seen" is ONLY the darker final writing — never the mathematically-correct ghost. If the darker final is wrong and the ghost is right, still put the darker final in "seen" and credit 0. Prefer wrong dark ink over correct faint ghost.
- Ratios and rates: solve yourself — simplify 12:18 → 2:3; write 5:20 as a fraction → 1/4 (not 1/5); unit price and mph from the given numbers. Never copy a wrong simplified ratio into expected.
- NEVER invent a filled-in answer for a blank. If the blank is empty, "___", "?", or untouched, set seen to null (or "") and credit 0. Do not write the textbook answer into "seen" (science facts, freeze/boil points, third state of matter, percent-of answers, unit rates, etc.). A lone "?" the student wrote means they did not know — keep seen as "?" and credit 0 (never replace "?" with the computed answer).
- Partial lists / fill-in blanks: if the student wrote "solid, liquid, ___" leaving a blank, put that whole string in "seen" (not empty) and give partial credit; do not move the filled words into "question" only.
- Accept a correct answer written inside a full sentence ("Ice turning to water is called melting" answers "melting"). For "define X" / vocabulary / short open response / reading evidence+theme, credit when the student's words carry the same meaning (a short phrase that matches the key idea is full credit — do not require your own long paraphrase or a multi-sentence essay).
- For every item put confidence 0–1 (or "high"/"low"): how sure you are that "seen" is a faithful read. If the ink is glared, cropped, motion-blurred or too faint to trust, confidence "low" and credit null — do not guess the digits.
- With no answer key, "expected" is always YOUR own solved answer. Never copy "seen" into "expected". Then credit 1 (correct), 0.5 (partly), or 0 (wrong). Unreadable → credit null.
- Points: use "of": 1 per item unless a different point value is printed for THAT item. A correct final answer gets full credit; "show your work" instructions alone are not a reason to deduct.
- Only emit one items[] row per question actually printed on THIS page. Do not invent extra later questions, extra vocab rows, or textbook follow-ons that are not visible.
- If you cannot grade any item, draftScore must be null. Never default to 100.
- draftScore is recomputed from item credits in code — keep items complete and honest; do not emit example JSON rows as if they were this page's answers.
- More than one student: if two or more students' papers or names are visible (two Name lines, "Left desk / Right desk", "Partner", a second sheet underneath or beside with its name showing), list every readable name in "students" (primary/front paper first), set "multiStudent": true, and grade only the primary paper.`;
