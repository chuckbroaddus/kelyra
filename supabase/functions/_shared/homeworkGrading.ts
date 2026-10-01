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

/** "7", "-3", "2.5", "3/4", "1 1/2" → exact fraction; anything else → null. */
function parseNumberish(raw: string): Frac | null {
  const t = raw.replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
  let m = t.match(/^(-?)(\d+) (\d+)\/(\d+)$/);
  if (m) {
    const whole = Number(m[2]);
    const f = frac(whole * Number(m[4]) + Number(m[3]), Number(m[4]));
    return f && m[1] ? { n: -f.n, d: f.d } : f;
  }
  m = t.match(/^(-?\d+)\/(\d+)$/);
  if (m) return frac(Number(m[1]), Number(m[2]));
  m = t.match(/^-?\d+(?:\.(\d+))?$/);
  if (m) {
    const places = m[1]?.length ?? 0;
    return frac(Math.round(Number(t) * 10 ** places), 10 ** places);
  }
  return null;
}

/**
 * Exact value of a bare two-operand arithmetic question ("6 × 7 =", "2/3 − 1/6 = ?", "4/5 ÷ 2/5").
 * Returns null for anything else (word problems, algebra, units) so the model's grading stands.
 */
export function solveSimpleArithmetic(question: unknown): Frac | null {
  if (typeof question !== 'string') return null;
  const q = question
    .replace(/^\s*(?:q(?:uestion)?\s*)?\d+\s*[.)]\s*/i, '')
    .replace(/[−–]/g, '-')
    .replace(/\s*=\s*(?:\?|_+|\[\s*\]|)?\s*$/, '')
    .trim();
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

export type HomeworkCheckableItem = HomeworkScoredItem & { question?: string | null; expected?: string | null; seen?: string | null };

/**
 * No-key safety net: for bare arithmetic items the code (not the model) decides right/wrong, so a model that
 * copied the student's wrong answer into "expected" cannot rubber-stamp it. Other items pass through untouched.
 */
export function verifyArithmeticItems<T extends HomeworkCheckableItem>(items: ReadonlyArray<T>): T[] {
  return items.map((it) => {
    const truth = solveSimpleArithmetic(it.question);
    if (!truth || typeof it.seen !== 'string') return it;
    const seenText = it.seen.replace(/^\s*[a-z]\s*=\s*/i, '').trim();
    const seen = parseNumberish(seenText);
    if (!seen) return it;
    const of = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    const right = seen.n === truth.n && seen.d === truth.d;
    return { ...it, expected: formatFrac(truth), credit: right ? of : 0 };
  });
}

function normAnswer(v: unknown): string {
  return typeof v === 'string'
    ? v.toLowerCase().replace(/[−–]/g, '-').replace(/^\s*[a-z]\s*=\s*/, '').replace(/[\s.,;:!?'"]+/g, '')
    : '';
}

/**
 * Final pass over model items before scoring (no-key paths):
 * 1. bare arithmetic re-checked in code (verifyArithmeticItems);
 * 2. "seen" identical to "expected" earns full credit (models dock "show your work" points on correct answers);
 * 3. every "seen" empty ⇒ the answers were not read (tiny print, glare), not a blank paper — credits null so the
 *    draft score is null ("needs review") instead of a confident 0.
 */
export function settleHomeworkItems<T extends HomeworkCheckableItem>(items: ReadonlyArray<T>): T[] {
  let out = verifyArithmeticItems(items).map((it) => {
    const of = typeof it.of === 'number' && it.of > 0 ? it.of : 1;
    const e = normAnswer(it.expected);
    if (e && e === normAnswer(it.seen) && typeof it.credit === 'number' && it.credit < of) return { ...it, credit: of };
    return it;
  });
  if (out.length && out.every((it) => !normAnswer(it.seen))) out = out.map((it) => ({ ...it, credit: null }));
  return out;
}

/** Shared grading rules appended to every homework vision prompt (evaluate + analyze). */
export const HOMEWORK_GRADING_RULES = `Grading rules (always):
- A missing, blank, cropped, smudged or unreadable name is NOT a reason to reject. Still grade the visible work and return studentName null.
- The student's answer is what the STUDENT wrote (usually handwriting or filled blanks), never the printed question or the printed words being corrected. Read the handwriting next to / under each prompt.
- Copy "seen" letter-for-letter and digit-for-digit exactly as the student wrote it — do NOT fix the student's spelling or arithmetic when transcribing (on a spelling sheet "beleive" stays "beleive" and is wrong).
- Accept a correct answer written inside a full sentence ("Ice turning to water is called melting" answers "melting"). For "define X" / vocabulary items the printed word is the question and the student's definition is the answer: give credit when the meaning is right in the student's own words.
- Crossed-out work is not the answer; use the final un-crossed answer. An answer in the margin with an arrow belongs to the item the arrow points to.
- For every item, first copy the printed question into "question", then SOLVE IT YOURSELF and put YOUR answer in "expected", then read the student's answer into "seen". With no answer key, "expected" is always your own answer. Never copy the student's answer into "expected". Work carefully (re-read the numbers, redo the arithmetic) before you mark a student wrong. Then give credit 1 (correct), 0.5 (partly), or 0 (wrong). If you cannot solve an item or cannot read the student's answer (glare, crop, blur, too small), set credit null for that item — do not guess 0.
- Points: use "of": 1 per item unless a different point value is printed for THAT item. A correct final answer gets full credit; "show your work" instructions alone are not a reason to deduct.
- An item the student clearly left blank gets credit 0; an answer you just cannot make out gets credit null.
- If you cannot grade any item, draftScore must be null. Never default to 100.
- draftScore is computed from item credits, so make items complete and honest.
- More than one student: if two or more students' papers or names are visible (two Name lines, "Left desk / Right desk", "Partner", a second sheet underneath or beside with its name showing), list every readable name in "students" (primary/front paper first), set "multiStudent": true, and grade only the primary paper.
- Never return placeholder text as a name ("Name:", "[redacted]", "First Last", "unknown").`;
