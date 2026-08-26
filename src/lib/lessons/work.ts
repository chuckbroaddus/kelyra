import type { LessonResult } from './protocol';

const SKIP_MARK_IDS = new Set(['slider37', 'who']);

export type LessonItemOutcome = 'correct' | 'incorrect' | 'skipped' | 'open';

export type LessonWorkItem = {
  id: string;
  prompt: string;
  answer: string;
  outcome: LessonItemOutcome;
  tries: number;
  hints: number;
  laterCorrected: boolean;
  guesses: string[];
  worthPractice: boolean;
  note: string | null;
};

export type LessonWork = {
  status: 'Done' | 'In progress' | 'Abandoned';
  attempt: number | null;
  durationLabel: string | null;
  startedLabel: string | null;
  completedLabel: string | null;
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  hints: number;
  audioUsed: boolean | null;
  kineticUsed: boolean | null;
  items: LessonWorkItem[];
  laterCorrected: number;
  retried: number;
  hinted: number;
  worthPracticeCount: number;
  headline: string;
  sessionLine: string | null;
  struggleSummary: string | null;
  practiceNote: string | null;
};

type RawMark = {
  ok?: unknown;
  user?: unknown;
  tries?: unknown;
  first_ok?: unknown;
  later_corrected?: unknown;
  hints?: unknown;
  guesses?: unknown;
  places?: unknown;
};

export function lessonWorkFromResult(result: LessonResult | null | undefined): LessonWork | null {
  if (!result) return null;
  const extras = (result.extras ?? {}) as Record<string, unknown>;
  const rawMarks = rawMarkMap(result.marks);
  const stems = stringMap(extras.item_stems);
  const laterSet = stringIdSet(extras.later_corrected);
  const retriedSet = stringIdSet(extras.retried);
  const hintedSet = stringIdSet(extras.hinted);
  const finished = result.state === 'complete';
  const ids = itemIds(extras, rawMarks);
  const items: LessonWorkItem[] = ids.map((id, index) => {
    const mark = rawMarks[id];
    const hasOk = typeof mark?.ok === 'boolean';
    const ok = hasOk ? Boolean(mark?.ok) : null;
    const answer = answerDisplay(mark);
    const tries = finiteInt(mark?.tries);
    const hints = Math.max(finiteInt(mark?.hints), hintedSet.has(id) ? 1 : 0);
    const firstOk = mark?.first_ok;
    const laterCorrected =
      Boolean(mark?.later_corrected) ||
      laterSet.has(id) ||
      (ok === true && firstOk === false);
    const guesses = guessList(mark?.guesses, answer);
    let outcome: LessonItemOutcome;
    if (ok === true) outcome = 'correct';
    else if (ok === false) outcome = 'incorrect';
    else outcome = finished ? 'skipped' : 'open';
    const worthPractice =
      finished &&
      (outcome === 'incorrect' ||
        outcome === 'skipped' ||
        laterCorrected ||
        tries >= 3 ||
        hints >= 2);
    return {
      id,
      prompt: stems[id] || FOM_ITEM_STEMS[id] || `Question ${index + 1}`,
      answer,
      outcome,
      tries,
      hints,
      laterCorrected,
      guesses,
      worthPractice,
      note: itemNote({
        outcome,
        answer,
        tries,
        laterCorrected,
        hints,
      }),
    };
  });

  const correct = items.filter((item) => item.outcome === 'correct').length;
  const incorrect = items.filter((item) => item.outcome === 'incorrect').length;
  const skipped = finished ? items.filter((item) => item.outcome === 'skipped').length : 0;
  const total = ids.length;
  const laterCorrected = items.filter((item) => item.laterCorrected).length;
  const retried = items.filter((item) => item.tries > 1 || retriedSet.has(item.id)).length;
  const hintedItems = items.filter((item) => item.hints > 0).length;
  const hints = Math.max(hintTotal(result.hints), items.reduce((n, item) => n + item.hints, 0));
  const worthPracticeCount = items.filter((item) => item.worthPractice).length;
  const status =
    result.state === 'complete' ? 'Done' : result.state === 'abandoned' ? 'Abandoned' : 'In progress';
  const durationLabel =
    typeof result.duration_ms === 'number' && result.duration_ms >= 0
      ? durationMs(result.duration_ms)
      : null;

  return {
    status,
    attempt: typeof result.attempt === 'number' && result.attempt > 0 ? result.attempt : null,
    durationLabel,
    startedLabel: stamp(result.started_at),
    completedLabel: stamp(result.completed_at),
    correct,
    incorrect,
    skipped,
    total,
    hints,
    audioUsed: typeof result.audio_used === 'boolean' ? result.audio_used : null,
    kineticUsed: typeof result.kinetic_used === 'boolean' ? result.kinetic_used : null,
    items,
    laterCorrected,
    retried,
    hinted: hintedItems,
    worthPracticeCount,
    headline: headline({ finished, status, correct, incorrect, skipped, total }),
    sessionLine: sessionLine({
      durationLabel,
      audioUsed: typeof result.audio_used === 'boolean' ? result.audio_used : null,
      kineticUsed: typeof result.kinetic_used === 'boolean' ? result.kinetic_used : null,
      attempt: typeof result.attempt === 'number' ? result.attempt : null,
    }),
    struggleSummary: struggleSummary({
      finished,
      incorrect,
      skipped,
      laterCorrected,
      retried,
      hints,
    }),
    practiceNote:
      finished && worthPracticeCount
        ? worthPracticeCount === 1
          ? 'This question may need extra practice — extra tries, a skip, or hints can mean the skill is still forming.'
          : 'These questions may need extra practice — extra tries, skips, and hints can mean the skill is still forming.'
        : null,
  };
}

export function lessonWorkLines(work: LessonWork | null | undefined): Array<{ label: string; value: string }> {
  if (!work) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | null | undefined) => {
    if (!value) return;
    rows.push({ label, value });
  };
  push('Status', work.status);
  if (work.attempt && work.attempt > 1) {
    push('Attempt', `Latest of ${work.attempt} (this cell is overwritten)`);
  }
  push('Score', work.headline);
  push('Time', work.durationLabel);
  if (work.startedLabel) push('Started', work.startedLabel);
  if (work.completedLabel) push('Completed', work.completedLabel);
  if (work.hints) push('Hints', work.hints === 1 ? '1 hint' : `${work.hints} hints`);
  if (work.audioUsed != null) push('Audio', work.audioUsed ? 'Heard this' : 'Did not play audio');
  if (work.kineticUsed) push('Manipulative', 'Used a slider or drag');
  push('Look closer', work.struggleSummary);
  for (const [index, item] of work.items.entries()) {
    push(`${index + 1}. ${item.prompt}`, itemLine(item));
  }
  return rows;
}

export function formatLessonWorkForPrompt(work: LessonWork | null | undefined): string {
  if (!work) return '';
  const lines: string[] = [work.headline];
  if (work.sessionLine) lines.push(work.sessionLine);
  if (work.struggleSummary) lines.push(`Struggle: ${work.struggleSummary}`);
  if (work.practiceNote) lines.push(work.practiceNote);
  for (const [index, item] of work.items.entries()) {
    lines.push(`${index + 1}. ${item.prompt}`);
    lines.push(`   ${itemLine(item)}`);
    if (item.guesses.length) lines.push(`   Earlier tries: ${item.guesses.join(', ')}`);
    if (item.note) lines.push(`   Note: ${item.note}`);
  }
  return lines.join('\n');
}

function itemLine(item: LessonWorkItem): string {
  const bits = [outcomeLabel(item.outcome)];
  if (item.answer) bits.push(item.answer);
  else if (item.outcome === 'skipped' || item.outcome === 'open') bits.push('no answer');
  if (item.tries > 1) bits.push(`${item.tries} tries`);
  if (item.laterCorrected) bits.push('corrected after a miss');
  if (item.hints === 1) bits.push('1 hint');
  else if (item.hints > 1) bits.push(`${item.hints} hints`);
  return bits.join(' · ');
}

export function outcomeLabel(outcome: LessonItemOutcome): string {
  if (outcome === 'correct') return 'Correct';
  if (outcome === 'incorrect') return 'Incorrect';
  if (outcome === 'open') return 'Not yet';
  return 'Skipped';
}

function itemNote(input: {
  outcome: LessonItemOutcome;
  answer: string;
  tries: number;
  laterCorrected: boolean;
  hints: number;
}): string | null {
  if (input.outcome === 'open') return null;
  if (input.outcome === 'skipped' && input.answer) {
    return 'Typed something, then moved on without checking.';
  }
  if (input.outcome === 'skipped') return 'Left this one blank.';
  if (input.outcome === 'incorrect') return 'Still incorrect when they finished.';
  if (input.laterCorrected && input.tries >= 3) {
    return 'Guessed several times before it was correct.';
  }
  if (input.laterCorrected) return 'Missed at first, then corrected.';
  if (input.tries >= 3) return 'Took several tries.';
  if (input.hints >= 2) return 'Asked for more than one hint.';
  return null;
}

function headline(input: {
  finished: boolean;
  status: string;
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
}): string {
  if (!input.finished) {
    const checked = input.correct + input.incorrect;
    if (!checked) return input.status;
    return `${input.status} · ${checked} checked`;
  }
  if (!input.total) return 'No check items';
  const bits = [`${input.correct} of ${input.total} correct`];
  if (input.incorrect) bits.push(`${input.incorrect} incorrect`);
  if (input.skipped) bits.push(`${input.skipped} skipped`);
  return bits.join(' · ');
}

function sessionLine(input: {
  durationLabel: string | null;
  audioUsed: boolean | null;
  kineticUsed: boolean | null;
  attempt: number | null;
}): string | null {
  const bits: string[] = [];
  if (input.durationLabel) bits.push(input.durationLabel);
  if (input.audioUsed === true) bits.push('Heard this');
  else if (input.audioUsed === false) bits.push('Did not play audio');
  if (input.kineticUsed) bits.push('Used a slider or drag');
  if (input.attempt && input.attempt > 1) bits.push(`Attempt ${input.attempt}`);
  return bits.length ? bits.join(' · ') : null;
}

function struggleSummary(input: {
  finished: boolean;
  incorrect: number;
  skipped: number;
  laterCorrected: number;
  retried: number;
  hints: number;
}): string | null {
  if (!input.finished) return null;
  const bits: string[] = [];
  if (input.incorrect) {
    bits.push(input.incorrect === 1 ? '1 still incorrect' : `${input.incorrect} still incorrect`);
  }
  if (input.skipped) {
    bits.push(input.skipped === 1 ? '1 skipped' : `${input.skipped} skipped`);
  }
  if (input.laterCorrected) {
    bits.push(
      input.laterCorrected === 1
        ? '1 corrected after a miss'
        : `${input.laterCorrected} corrected after a miss`,
    );
  }
  if (input.retried) {
    bits.push(input.retried === 1 ? '1 needed extra tries' : `${input.retried} needed extra tries`);
  }
  if (input.hints) {
    bits.push(input.hints === 1 ? '1 hint' : `${input.hints} hints`);
  }
  return bits.length ? bits.join(' · ') : null;
}

function rawMarkMap(marks: unknown): Record<string, RawMark> {
  if (!marks || typeof marks !== 'object' || Array.isArray(marks)) return {};
  const row = marks as Record<string, unknown>;
  const inner = row.answers;
  const source =
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : row;
  const out: Record<string, RawMark> = {};
  for (const [id, value] of Object.entries(source)) {
    if (SKIP_MARK_IDS.has(id)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    out[id] = value as RawMark;
  }
  return out;
}

function itemIds(extras: Record<string, unknown>, marks: Record<string, RawMark>): string[] {
  const listed = extras.item_ids;
  if (Array.isArray(listed) && listed.every((id) => typeof id === 'string') && listed.length) {
    return listed.filter((id) => !SKIP_MARK_IDS.has(id));
  }
  return Object.keys(marks);
}

function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text === 'string' && text.trim()) out[key] = text.trim();
  }
  return out;
}

function stringIdSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())));
}

function finiteInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

function answerDisplay(mark: RawMark | undefined): string {
  if (!mark) return '';
  if (typeof mark.user === 'string') return mark.user.trim();
  if (typeof mark.user === 'number' && Number.isFinite(mark.user)) return String(mark.user);
  if (mark.places && typeof mark.places === 'object' && !Array.isArray(mark.places)) {
    return Object.values(mark.places as Record<string, unknown>)
      .map((part) => (part == null ? '' : String(part)))
      .join('')
      .trim();
  }
  return '';
}

function guessList(value: unknown, finalAnswer: string): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const text = entry.trim();
    if (!text) continue;
    if (out[out.length - 1] === text) continue;
    out.push(text);
  }
  if (finalAnswer && out[out.length - 1] === finalAnswer) out.pop();
  return out.slice(-8);
}

function hintTotal(hints: unknown): number {
  if (typeof hints === 'number' && Number.isFinite(hints) && hints > 0) return Math.round(hints);
  if (!hints || typeof hints !== 'object' || Array.isArray(hints)) return 0;
  const beats = (hints as { beats?: unknown }).beats;
  if (Array.isArray(beats)) return beats.length;
  if (beats && typeof beats === 'object') return Object.keys(beats as object).length;
  return 0;
}

function stamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function durationMs(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem ? `${min}m ${rem}s` : `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

const FOM_ITEM_STEMS: Record<string, string> = {
  houses: 'Drag each digit onto 29.108',
  a1: 'Word form of 506.209',
  a2: 'Expanded form of 29.108 (use +)',
  a3: '674.820 ____ 674.82',
  a4: '75,010.02 ____ 75,010.2',
  a5: 'Increasing: 7.203; 7.302; 7.03; 7.215',
  a6: 'Round 408,293.561 to the nearest hundred',
  a7: 'Round 590.045 to the nearest hundredth',
  b1: '4468 − 2397',
  b2: '8.949 − 8.701',
  b3: '26.4 − 8.3596',
  b4: '$65 − $8.97',
  b5: '308.231 + 42.07 + 12.6',
  b6: 'Addition and subtraction are…',
  c1: '627 × 9',
  c2: '8.3 × 0.27 = 2241 (digits). Product?',
  c3: '0.465 × 0.09',
  c4: '0.47 × 3.9',
  d1: '2494 ÷ 5 (quotient and remainder)',
  d2: '5 ÷ 8 as a decimal',
  d3: 'Round 15 ÷ 32 to the nearest tenth',
  d4: '7 ÷ 0 equals',
  m0: 'minuend',
  m1: 'subtrahend',
  m2: 'dividend',
  m3: 'divisor',
  m4: 'exponent',
  m5: 'rational number',
  e1: 'Exponential form of five squared',
  e2: '6 · 6 · 6 · 6 in exponential form',
  e3: '2⁶ in standard form',
  e4: '4 · 3³',
  e5: '2.34 × 10³',
  e6: '(3×10⁶)+(7×10⁵)+(2×10³)+(8×10¹)',
  f1: '√121',
  f2: '√256',
  f3: 'Nearest whole number to √24',
  f4: 'Nearest whole to √120',
  g1: '7 + 3 × 5',
  g2: '27 ÷ 3 + 6 × 2',
  g3: '36 ÷ (3 + 6) × 2',
  g4: '[(2+8)÷2] + 2³',
  g5: '[2(2+1)]² − 2² · 3',
};
