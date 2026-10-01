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

/** "7", "-3", "+7", "2.5", "3/4", "1 1/2" → exact fraction; anything else → null. */
function parseNumberish(raw: string): Frac | null {
  const t = raw.replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
  // allow a lone leading '+'
  const signed = t.replace(/^\+/, '');
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

/** Strip leading "1." / "Q2)" labels and trailing "= ?" blanks from a printed question. */
export function stripQuestionNoise(question: unknown): string {
  if (typeof question !== 'string') return '';
  return question
    .replace(/^\s*(?:q(?:uestion)?\s*)?\d+\s*[.)]\s*/i, '')
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
  const num = '(-?\\d+(?:\\.\\d+)?(?:\\/\\d+)?)';
  const m = q.match(new RegExp(`^${num}\\s*([+\\-×xX*÷]|\\s\\/\\s)\\s*${num}$`));
  if (!m) return null;
  const a = parseNumberish(m[1]);
  const b = parseNumberish(m[3]);
  if (!a || !b) return null;
  const op = m[2].trim();
  if (op === '+') return frac(a.n * b.d + b.n * a.d, a.d * b.d);
  if (op === '-') return frac(a.n * b.d - b.n * a.d, a.d * b.d);
  if (op === '×' || op === 'x' || op === 'X' || op === '*') return frac(a.n * b.n, a.d * b.d);
  if (op === '÷' || op === '/') return b.n === 0 ? null : frac(a.n * b.d, a.d * b.n);
  return null;
}

function formatFrac(f: Frac): string {
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
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
        .replace(/[\s.,;:!?'"°]+/g, '')
    : '';
}

/** Compare student seen vs code/model expected with light unit/alias tolerance. */
export function answersMatch(expected: unknown, seen: unknown): boolean {
  const e = normAnswer(expected);
  const s = normAnswer(seen);
  if (!e || !s) return false;
  if (e === s) return true;
  // x=5 vs 5
  if (e.replace(/^[a-z]=/, '') === s.replace(/^[a-z]=/, '')) return true;
  // numeric fractions 0.5 vs 1/2
  const ef = parseNumberish(String(expected).replace(/^\s*[a-z]\s*=\s*/i, '').trim());
  const sf = parseNumberish(String(seen).replace(/^\s*[a-z]\s*=\s*/i, '').trim());
  if (ef && sf && ef.n === sf.n && ef.d === sf.d) return true;
  // open short answers: expected token contained in seen sentence (or reverse for short keys)
  if (e.length >= 3 && (s.includes(e) || e.includes(s))) return true;
  return false;
}

/**
 * No-key safety net: for items the code can solve, credit is decided here so a model that copied the
 * student's wrong answer into "expected" cannot rubber-stamp it.
 */
export function verifyArithmeticItems<T extends HomeworkCheckableItem>(items: ReadonlyArray<T>): T[] {
  return items.map((it) => {
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
    if (!truth) return it;
    const of = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    if (isLowConfidence(it.confidence)) return { ...it, question, expected: truth, credit: null };
    if (isBlankStudentAnswer(seen)) return { ...it, question, seen, expected: truth, credit: 0 };
    if (typeof seen !== 'string') return { ...it, question, expected: truth };
    const right = answersMatch(truth, seen);
    return { ...it, question, seen, expected: truth, credit: right ? of : 0 };
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
  let out = verifyArithmeticItems(items).map((it) => {
    const of = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    if (isLowConfidence(it.confidence)) return { ...it, credit: null };
    if (isBlankStudentAnswer(it.seen)) {
      // blank is a real zero when we could read the question; keep code-set 0, else 0
      if (typeof it.credit === 'number') return it;
      return { ...it, credit: 0 };
    }
    const e = normAnswer(it.expected);
    const s = normAnswer(it.seen);
    // Only upgrade partial → full when expected and seen match AND expected is not a pure copy of a
    // long student sentence with no independent signal — still allow short exact matches.
    if (e && e === s && typeof it.credit === 'number' && it.credit < of) return { ...it, credit: of };
    // Soft open-ended: expected phrase inside seen (model was harsh on "community helps")
    if (e && s && typeof it.credit === 'number' && it.credit < of && answersMatch(it.expected, it.seen)) {
      return { ...it, credit: of };
    }
    return it;
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
  return out;
}

/** Shared grading rules appended to every homework vision prompt (evaluate + analyze). */
export const HOMEWORK_GRADING_RULES = `Grading rules (always):
- A missing, blank, cropped, smudged or unreadable name is NOT a reason to reject. Still grade the visible work and return studentName null.
- Work in two mental passes on every item: (1) TRANSCRIBE only — copy the printed question into "question" and the student's handwriting into "seen" with no fixing; (2) GRADE — solve the question yourself into "expected", then set credit. Never let pass (2) rewrite pass (1).
- The student's answer is what the STUDENT wrote (usually handwriting or filled blanks), never the printed question or the printed words being corrected. Read the handwriting next to / under each prompt.
- Copy "seen" letter-for-letter and digit-for-digit exactly as the student wrote it — do NOT fix the student's spelling or arithmetic when transcribing (on a spelling sheet "beleive" stays "beleive" and is wrong; "6b-1" stays "6b-1" even if the correct expand is "6b-3"; "x = 4" stays "x = 4" even if the true root is 7).
- NEVER invent a filled-in answer for a blank. If the blank is empty, "___", "?", or untouched, set seen to null (or "") and credit 0. Do not write the textbook answer into "seen".
- Accept a correct answer written inside a full sentence ("Ice turning to water is called melting" answers "melting"). For "define X" / vocabulary / short open response, credit when the student's words carry the same meaning (a short phrase that matches the key idea is full credit — do not require your own long paraphrase).
- Crossed-out work is not the answer; use the final un-crossed answer. An answer in the margin with an arrow belongs to the item the arrow points to. A faint erased ghost under a darker final answer is not the answer unless no final answer remains.
- For every item put confidence 0–1 (or "high"/"low"): how sure you are that "seen" is a faithful read. If the ink is glared, cropped, motion-blurred or too faint to trust, confidence "low" and credit null — do not guess the digits.
- With no answer key, "expected" is always YOUR own solved answer. Never copy "seen" into "expected". Then credit 1 (correct), 0.5 (partly), or 0 (wrong). Unreadable → credit null.
- Points: use "of": 1 per item unless a different point value is printed for THAT item. A correct final answer gets full credit; "show your work" instructions alone are not a reason to deduct.
- If you cannot grade any item, draftScore must be null. Never default to 100.
- draftScore is recomputed from item credits in code — keep items complete and honest; do not emit example JSON rows as if they were this page's answers.
- More than one student: if two or more students' papers or names are visible (two Name lines, "Left desk / Right desk", "Partner", a second sheet underneath or beside with its name showing), list every readable name in "students" (primary/front paper first), set "multiStudent": true, and grade only the primary paper.
- Never return placeholder text as a name ("Name:", "[redacted]", "First Last", "unknown").`;
