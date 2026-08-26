import type { PracticeItem } from '@/lib/supabase/types';

export type ReviewGap = {
  label: string;
  sortOrder: number;
};

export type SubmissionReviewDraft = {
  summary: string | null;
  gaps: ReviewGap[];
  draftScore: number | null;
  teacherNote: string | null;
  items: PracticeItem[];
};

export type PracticeWorkLine = {
  id: string;
  prompt: string;
  answer: string;
  expected?: string;
};

export function submissionReviewPath(classId: string, submissionId: string): string {
  return `/class/${classId}/review/${submissionId}`;
}

export function asDraftScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampScore(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return clampScore(n);
  }
  return null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function parsePracticeItemsFromUnknown(raw: unknown): PracticeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = (item ?? {}) as { id?: unknown; prompt?: unknown; answerKey?: unknown };
      const prompt = String(row.prompt ?? '').trim();
      const answerKey = String(row.answerKey ?? '').trim();
      return {
        id: String(row.id ?? `item-${index + 1}`).trim() || `item-${index + 1}`,
        prompt,
        ...(answerKey ? { answerKey } : {}),
      };
    })
    .filter((item) => item.prompt)
    .slice(0, 8);
}

export function parseReviewGaps(raw: unknown): ReviewGap[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = (item ?? {}) as { label?: unknown; sortOrder?: unknown };
      return {
        label: String(row.label ?? '').trim(),
        sortOrder: Number(row.sortOrder ?? index + 1) || index + 1,
      };
    })
    .filter((item) => item.label)
    .slice(0, 3);
}

function asReviewObject(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return {};
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

export function parseSubmissionReview(raw: unknown): SubmissionReviewDraft {
  const parsed = asReviewObject(raw);
  const gaps = parseReviewGaps(parsed.gaps);
  const summary = typeof parsed.summary === 'string' ? parsed.summary.replace(/\s+/g, ' ').trim() : '';
  const teacherNote =
    typeof parsed.teacherNote === 'string' ? parsed.teacherNote.replace(/\s+/g, ' ').trim() : '';
  return {
    summary: summary || null,
    gaps,
    draftScore: asDraftScore(parsed.draftScore),
    teacherNote: teacherNote || null,
    items: parsePracticeItemsFromUnknown(parsed.items),
  };
}

export function emptyReviewDraft(): SubmissionReviewDraft {
  return { summary: null, gaps: [], draftScore: null, teacherNote: null, items: [] };
}

/** Teacher-typed gaps win; AI fills in new labels. Cap 3. */
export function mergeReviewGaps(prior: ReviewGap[], incoming: ReviewGap[]): ReviewGap[] {
  const out: ReviewGap[] = [];
  const seen = new Set<string>();
  for (const gap of [...prior, ...incoming]) {
    const key = gap.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: gap.label.trim(), sortOrder: out.length + 1 });
    if (out.length >= 3) break;
  }
  return out;
}

export function mergeReviewItems(prior: PracticeItem[], incoming: PracticeItem[]): PracticeItem[] {
  const out: PracticeItem[] = [];
  const seen = new Set<string>();
  for (const item of [...prior, ...incoming]) {
    const prompt = item.prompt.trim();
    if (!prompt) continue;
    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: item.id?.trim() || `item-${out.length + 1}`,
      prompt,
      ...(item.answerKey?.trim() ? { answerKey: item.answerKey.trim() } : {}),
    });
    if (out.length >= 8) break;
  }
  return out;
}

export function mergeReviewDraft(
  prior: SubmissionReviewDraft | null | undefined,
  incoming: SubmissionReviewDraft,
): SubmissionReviewDraft {
  const prev = prior ?? emptyReviewDraft();
  const unfinished = prev.items.filter((item) => !item.prompt.trim());
  return {
    summary: incoming.summary || prev.summary,
    teacherNote: incoming.teacherNote || prev.teacherNote,
    draftScore: incoming.draftScore ?? prev.draftScore,
    gaps: mergeReviewGaps(prev.gaps, incoming.gaps),
    items: [...mergeReviewItems(prev.items, incoming.items), ...unfinished].slice(0, 8),
  };
}

/** Fold a typed-but-not-added gap into the draft so Ask AI cannot drop it. */
export function withPendingGap(
  draft: SubmissionReviewDraft,
  pendingLabel: string | null | undefined,
): SubmissionReviewDraft {
  const label = pendingLabel?.trim() ?? '';
  if (!label) return draft;
  return {
    ...draft,
    gaps: mergeReviewGaps(draft.gaps, [{ label, sortOrder: draft.gaps.length + 1 }]),
  };
}

export function teacherDraftPrompt(draft: SubmissionReviewDraft | null | undefined): string {
  if (!draft) return '';
  const gaps = draft.gaps.map((gap) => gap.label).filter(Boolean);
  const items = draft.items.map((item) => item.prompt).filter(Boolean);
  if (!gaps.length && !items.length && !draft.teacherNote) return '';
  const lines = [
    '',
    'The teacher already started a draft. Keep their gap labels and practice questions. You may add more, not delete theirs.',
  ];
  if (gaps.length) lines.push(`Teacher gaps: ${gaps.join('; ')}`);
  if (items.length) {
    lines.push('Teacher questions:');
    items.forEach((prompt, index) => lines.push(`  ${index + 1}. ${prompt}`));
  }
  if (draft.teacherNote) lines.push(`Teacher note: ${draft.teacherNote}`);
  return `\n${lines.join('\n')}`;
}

export function reviewDraftIsEmpty(draft: SubmissionReviewDraft | null | undefined): boolean {
  return !reviewDraftHasWork(draft);
}

export function reviewHasGap(draft: SubmissionReviewDraft | null | undefined): boolean {
  return Boolean(draft?.gaps.some((gap) => gap.label.trim()));
}

export function reviewDraftHasWork(draft: SubmissionReviewDraft | null | undefined): boolean {
  return Boolean(
    draft &&
      (draft.summary ||
        draft.teacherNote ||
        draft.draftScore != null ||
        draft.gaps.some((gap) => gap.label.trim()) ||
        draft.items.some((item) => item.prompt.trim())),
  );
}

export function answerText(answers: Record<string, unknown> | null | undefined, itemId: string): string {
  const value = answers?.[itemId];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value == null) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

export function practiceWorkLines(
  items: PracticeItem[],
  answers: Record<string, unknown> | null | undefined,
): PracticeWorkLine[] {
  return items.map((item, index) => ({
    id: item.id || `item-${index + 1}`,
    prompt: item.prompt,
    answer: answerText(answers, item.id) || answerText(answers, String(index + 1)) || answerText(answers, String(index)),
    ...(item.answerKey?.trim() ? { expected: item.answerKey.trim() } : {}),
  }));
}

export function formatWorkForPrompt(input: {
  title: string;
  kind: string;
  lines?: PracticeWorkLine[];
  lessonLines?: Array<{ label: string; value: string }>;
  keyNotes?: string | null;
}): string {
  const parts = [`Assignment: ${input.title.trim() || 'Work'}`, `Kind: ${input.kind}`];
  if (input.keyNotes?.trim()) parts.push(`Teacher key note: ${input.keyNotes.trim()}`);
  if (input.lines?.length) {
    parts.push('');
    for (const [index, line] of input.lines.entries()) {
      parts.push(`${index + 1}. ${line.prompt}`);
      if (line.expected) parts.push(`   Expected: ${line.expected}`);
      parts.push(`   Student: ${line.answer || '(blank)'}`);
    }
  }
  if (input.lessonLines?.length) {
    parts.push('');
    for (const row of input.lessonLines) {
      parts.push(`${row.label}: ${row.value}`);
    }
  }
  return parts.join('\n');
}

export const SUBMISSION_REVIEW_PROMPT = `You are helping a K-12 teacher review one student's submitted work.
Return JSON only, no markdown:
{"summary":"one or two sentences","draftScore":null,"teacherNote":"short Glow/Grow or null","gaps":[{"label":"short skill name","sortOrder":1}],"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"short key"}]}
Rules:
- summary is what they turned in, not a biography.
- draftScore is 0-100 when you can grade the work, otherwise null.
- 0 to 3 gaps. Labels are short, like "two-digit regrouping". Empty if there is no skill gap worth follow-up.
- If there is at least one gap, items must be 4 to 6 short follow-up practice questions for the first gap.
- If there is no gap, items must be [].
- Keep any teacher-typed gap labels and practice questions listed below. You may add more, not delete theirs.
- Age-appropriate. No student names. No images.
- For lessons, skipped items, extra tries, answers that were wrong first then corrected, and hints can show a skill gap even when the last answer is right. Prefer a gap when those cluster. Do not invent a gap from clean first-try work.`;
