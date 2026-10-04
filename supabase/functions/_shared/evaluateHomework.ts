/**
 * evaluate-homework prompt assembly + post-processing (shared by Edge evaluate-homework,
 * and ai:dev evaluate-homework / analyze-homework). Edit here only.
 */
import { firstNameOnly } from './aiPolicy.ts';
import { evaluatePrompt } from './homeworkPrompts.ts';
import {
  cleanHomeworkNameList,
  cleanHomeworkStudentName,
  percentFromItemCredits,
  settleHomeworkItems,
} from './homeworkGrading.ts';

// deno-lint-ignore no-explicit-any
type Json = any;

export type ScoredItem = {
  n: number;
  question?: string | null;
  expected: string | null;
  seen: string | null;
  credit: number | null;
  of: number;
  gap: string | null;
  confidence?: number | string | null;
};

export function formatKeyForPrompt(
  items: Json[],
  notes: string,
  scoreScheme: string,
  maxScore: number | null,
): string {
  if (!items.length && !notes) return '';
  const lines = items.map((item, index) => {
    const n = item?.n ?? index + 1;
    const stem = String(item?.stem ?? '').trim();
    const answer = String(item?.answer ?? item?.expected ?? '').trim();
    const points = Number(item?.points ?? 1);
    const extra = String(item?.note ?? '').trim();
    return `${n}. ${stem ? `${stem} → ` : ''}${answer || '(needs teacher)'}${Number.isFinite(points) ? ` (${points} pt)` : ''}${extra ? ` — ${extra}` : ''}`;
  });
  return `\n\nANSWER KEY (score only against this):\nScheme: ${scoreScheme}${
    maxScore != null ? `\nMax: ${maxScore}` : ''
  }${notes ? `\nTeacher note: ${notes}` : ''}\n${lines.join('\n') || '(photo key only)'}`;
}

export function parseScoredItems(raw: Json, keyItems: Json[]): ScoredItem[] {
  const rows: Json[] = Array.isArray(raw) ? raw : [];
  if (!rows.length && keyItems.length) {
    return keyItems.map((item, index) => ({
      n: item?.n ?? index + 1,
      expected: String(item?.answer ?? ''),
      seen: null,
      credit: null,
      of: Number(item?.points ?? 1),
      gap: null,
    }));
  }
  return rows
    .map((row, index) => ({
      n: Number(row?.n ?? index + 1),
      question: typeof row?.question === 'string' ? row.question : null,
      expected: row?.expected != null ? String(row.expected) : null,
      seen: row?.seen != null ? String(row.seen) : null,
      credit: typeof row?.credit === 'number' ? row.credit : null,
      of: typeof row?.of === 'number' ? row.of : 1,
      gap: typeof row?.gap === 'string' && row.gap.trim() ? row.gap.trim() : null,
      confidence:
        typeof row?.confidence === 'number' || typeof row?.confidence === 'string' ? row.confidence : null,
    }))
    .slice(0, 40);
}

/** gaps / draftScore / teacherNote from an already-parsed model object. */
export function homeworkDraftFromParsed(parsed: Json): {
  gaps: Array<{ label: string; sortOrder: number }>;
  draftScore: number | null;
  teacherNote: string | null;
} {
  const gaps = Array.isArray(parsed?.gaps)
    ? (parsed.gaps as Json[])
        .map((gap, index) => ({
          label: String(gap?.label ?? '').trim(),
          sortOrder: Number(gap?.sortOrder ?? index + 1),
        }))
        .filter((gap) => gap.label)
        .slice(0, 3)
    : [];
  let draftScore = typeof parsed?.draftScore === 'number' ? parsed.draftScore : null;
  // Clamp absurd values only.
  if (typeof draftScore === 'number' && Number.isFinite(draftScore)) {
    if (draftScore < 0) draftScore = 0;
    if (draftScore > 100) draftScore = 100;
  }
  return {
    gaps,
    draftScore,
    teacherNote: typeof parsed?.teacherNote === 'string' ? parsed.teacherNote : null,
  };
}

export type EvaluateRequest = {
  rosterNames?: unknown;
  keyItems?: unknown;
  keyNotes?: unknown;
  scoreScheme?: unknown;
  maxScore?: unknown;
};

/** The text part sent after the page images (and key photos, when hasKeyPhotos). */
export function evaluatePromptText(body: EvaluateRequest, hasKeyPhotos: boolean): string {
  const rosterHint = Array.isArray(body.rosterNames)
    ? body.rosterNames.map((name) => firstNameOnly(String(name ?? ''))).filter(Boolean).join(', ')
    : '';
  const keyItems = Array.isArray(body.keyItems) ? body.keyItems : [];
  const keyNotes = String(body.keyNotes ?? '').trim();
  const scoreScheme = String(body.scoreScheme ?? 'numeric');
  const bodyMaxScore = Number(body.maxScore);
  const keyBlock = formatKeyForPrompt(
    keyItems,
    keyNotes,
    scoreScheme,
    Number.isFinite(bodyMaxScore) ? bodyMaxScore : null,
  );
  return `${evaluatePrompt}${
    rosterHint ? `\n\nIf a name on the page matches this roster, return that roster spelling: ${rosterHint}` : ''
  }${keyBlock}${hasKeyPhotos ? '\n\nThe last image(s) after the student work are the answer key photo(s).' : ''}`;
}

/** Model JSON → teacher-facing evaluate result (score recomputed from item credits when unkeyed). */
export function finalizeEvaluateHomework(parsed: Json, body: EvaluateRequest) {
  const keyItems = Array.isArray(body.keyItems) ? body.keyItems : [];
  const bodyMaxScore = Number(body.maxScore);
  const draft = homeworkDraftFromParsed(parsed);
  // Placeholder names ("Name:", "[redacted]", "First Last") → null; two-student frames keep every name.
  const studentName = cleanHomeworkStudentName(parsed?.studentName);
  const students = cleanHomeworkNameList([
    studentName,
    ...(Array.isArray(parsed?.students) ? parsed.students : []),
  ]);
  const multiStudent = parsed?.multiStudent === true || students.length > 1;
  let items = parseScoredItems(parsed?.items, keyItems);
  let draftScore = draft.draftScore;
  let maxScore: number | null =
    typeof parsed?.maxScore === 'number' ? parsed.maxScore : Number.isFinite(bodyMaxScore) ? bodyMaxScore : null;
  // No teacher key: the score is ALWAYS the item credits (never the model's free-floating number).
  // Items present but none gradable → null (no rubber-stamped 100). Keyed scoring stays in keygrade.
  // Empty items (reject / answer key / not student work) → null, never a bare 0 from the model.
  if (!keyItems.length && items.length) {
    items = settleHomeworkItems(items) as ScoredItem[];
    draftScore = percentFromItemCredits(items);
    maxScore = draftScore == null ? null : 100;
  } else if (!keyItems.length && !items.length) {
    draftScore = null;
    maxScore = null;
  }
  return { ...draft, draftScore, studentName, students, multiStudent, maxScore, items };
}
