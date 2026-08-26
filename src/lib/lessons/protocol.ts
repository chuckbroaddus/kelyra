/** postMessage contract between the native player and the hosted lesson page. */

import { asSubmissionStatus } from '@/lib/assignments/status';
import { scoreFromLessonResult } from '@/lib/lessons/score';

export const LESSON_IDENTITY_TYPE = 'kelyra.identity';
export const LESSON_EVENT_TYPE = 'kelyra.lesson';

export type LessonPackSlice = {
  deck_id: string;
  version: string;
  storage_deck_id: string;
  beat_start: string;
  beat_end: string;
};

export type LessonIdentity = {
  type: typeof LESSON_IDENTITY_TYPE;
  school: { name: string };
  class: { id: string; name: string };
  teacher: { name: string };
  student: { id: string | null; name: string };
  assignment: { id: string; title: string };
  preview?: boolean;
  /** Beat window + catalog id. Host prefix is storage_deck_id/version, not catalog deck_id. */
  pack?: LessonPackSlice;
};

export type LessonMetrics = {
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  correct: number | null;
  incorrect: number | null;
  marks: unknown;
  hints: number | { beats?: unknown } | null;
  audio_used: boolean | null;
  kinetic_used: boolean | null;
  extras: Record<string, unknown>;
};

export type LessonState = 'in_progress' | 'abandoned' | 'complete';

export type LessonPageEvent = {
  type: typeof LESSON_EVENT_TYPE;
  state: LessonState;
  metrics: LessonMetrics;
};

export type LessonResult = {
  kind: 'lesson';
  state: LessonState;
  attempt?: number;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  correct?: number | null;
  incorrect?: number | null;
  marks?: unknown;
  hints?: unknown;
  audio_used?: boolean | null;
  kinetic_used?: boolean | null;
  extras?: Record<string, unknown>;
  [key: string]: unknown;
};

export function isLessonIdentity(value: unknown): value is LessonIdentity {
  if (!value || typeof value !== 'object') return false;
  const row = value as LessonIdentity;
  return row.type === LESSON_IDENTITY_TYPE && Boolean(row.student && row.assignment);
}

export function isLessonPageEvent(value: unknown): value is LessonPageEvent {
  if (!value || typeof value !== 'object') return false;
  const row = value as LessonPageEvent;
  return row.type === LESSON_EVENT_TYPE && (row.state === 'in_progress' || row.state === 'abandoned' || row.state === 'complete');
}

/** True when the student finished during this Open, not a restored complete cell. */
export function isThisVisitComplete(event: LessonPageEvent): boolean {
  return event.state === 'complete' && event.metrics?.extras?.complete_kind === 'this_visit';
}

export function parseWebMessage(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function packKey(deckId: string, version: string): string {
  return `${deckId}::${version}`;
}

export function lessonHostPrefix(storageDeckId: string, version: string): string {
  return `${storageDeckId}/${version}`;
}

export function lessonProgressKey(deckId: string, version: string): string {
  return `kelyra-${deckId}-${version}`;
}

export function rosterNameLocked(identity: Pick<LessonIdentity, 'student' | 'preview'>): boolean {
  return Boolean(identity.student?.id) && identity.preview !== true;
}

export function sliceBeats<T extends { id: string }>(beats: T[], start: string, end: string): T[] {
  const from = beats.findIndex((beat) => beat.id === start);
  const to = beats.findIndex((beat) => beat.id === end);
  if (from < 0 || to < from) return beats;
  return beats.slice(from, to + 1);
}

export function packSliceFromRow(row: {
  deck_id?: string | null;
  lesson_version?: string | null;
  version?: string | null;
  storage_deck_id?: string | null;
  beat_start?: string | null;
  beat_end?: string | null;
}): LessonPackSlice | undefined {
  const deckId = row.deck_id?.trim();
  const version = (row.lesson_version ?? row.version)?.trim();
  const storage = row.storage_deck_id?.trim() || deckId;
  const beatStart = row.beat_start?.trim();
  const beatEnd = row.beat_end?.trim();
  if (!deckId || !version || !storage || !beatStart || !beatEnd) return undefined;
  return {
    deck_id: deckId,
    version,
    storage_deck_id: storage,
    beat_start: beatStart,
    beat_end: beatEnd,
  };
}

export function parsePackKey(key: string): { deckId: string; version: string } | null {
  const i = key.indexOf('::');
  if (i <= 0) return null;
  const deckId = key.slice(0, i).trim();
  const version = key.slice(i + 2).trim();
  if (!deckId || !version) return null;
  return { deckId, version };
}

export function emptyMetrics(): LessonMetrics {
  return {
    started_at: null,
    completed_at: null,
    duration_ms: null,
    correct: null,
    incorrect: null,
    marks: null,
    hints: null,
    audio_used: null,
    kinetic_used: null,
    extras: {},
  };
}

export function resultFromEvent(event: LessonPageEvent): LessonResult {
  const extras = { ...(event.metrics.extras ?? {}) };
  const result: LessonResult = {
    kind: 'lesson',
    state: event.state,
    started_at: event.metrics.started_at,
    completed_at: event.metrics.completed_at,
    duration_ms: event.metrics.duration_ms,
    correct: event.metrics.correct,
    incorrect: event.metrics.incorrect,
    marks: event.metrics.marks,
    hints: event.metrics.hints,
    audio_used: event.metrics.audio_used,
    kinetic_used: event.metrics.kinetic_used,
    extras,
  };
  const scored = scoreFromLessonResult(result);
  if (scored) {
    result.correct = scored.correct;
    result.incorrect = scored.incorrect;
    extras.skipped_count = scored.skipped;
  }
  return result;
}

export function asLessonResult(answers: unknown): LessonResult | null {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null;
  const row = answers as Record<string, unknown>;
  if (row.kind === 'lesson' || row.state === 'in_progress' || row.state === 'abandoned' || row.state === 'complete') {
    return row as LessonResult;
  }
  return null;
}

export function lessonWorkLabel(
  status: string,
  answers: unknown,
): 'Assigned' | 'Started' | 'Completed' | 'Graded' {
  const next = asSubmissionStatus(status);
  if (next === 'graded') return 'Graded';
  if (next === 'completed') return 'Completed';
  const result = asLessonResult(answers);
  if (result?.state === 'complete') return 'Completed';
  if (next === 'started' || result?.state === 'in_progress' || result?.state === 'abandoned') return 'Started';
  return 'Assigned';
}
