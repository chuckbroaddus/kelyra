import type { SubmissionStatus } from '@/lib/supabase/types';

export type WorkStatusLabel = 'Assigned' | 'Started' | 'Completed' | 'Graded';

const LEGACY: Record<string, SubmissionStatus> = {
  submitted: 'completed',
  draft_scored: 'completed',
  approved: 'graded',
  complete: 'completed',
  in_progress: 'started',
  abandoned: 'started',
  done: 'graded',
};

export function asSubmissionStatus(value: string | null | undefined): SubmissionStatus | null {
  if (!value) return null;
  if (value === 'assigned' || value === 'started' || value === 'completed' || value === 'graded') {
    return value;
  }
  return LEGACY[value] ?? null;
}

export function submissionStatusLabel(status: string | null | undefined): WorkStatusLabel | '' {
  const next = asSubmissionStatus(status);
  if (next === 'assigned') return 'Assigned';
  if (next === 'started') return 'Started';
  if (next === 'completed') return 'Completed';
  if (next === 'graded') return 'Graded';
  return '';
}

/** Student can still work this cell. */
export function isOpenWork(status: string | null | undefined): boolean {
  const next = asSubmissionStatus(status);
  return next === 'assigned' || next === 'started';
}

/** Turned in, waiting on the teacher. */
export function isAwaitingGrade(status: string | null | undefined): boolean {
  return asSubmissionStatus(status) === 'completed';
}

export function isGraded(status: string | null | undefined): boolean {
  return asSubmissionStatus(status) === 'graded';
}

/** Grade-book glyph before a mark exists. Assigned = empty circle, started = circle+dot, completed = circle+check. */
export type GradebookStatusIcon = 'statusAssigned' | 'statusStarted' | 'statusCompleted';

export function gradebookStatusIcon(status: string | null | undefined): GradebookStatusIcon | null {
  const next = asSubmissionStatus(status);
  if (next === 'assigned') return 'statusAssigned';
  if (next === 'started') return 'statusStarted';
  if (next === 'completed') return 'statusCompleted';
  return null;
}

/** Student finished the work (submitted or already graded). */
export function isFinishedWork(status: string | null | undefined): boolean {
  const next = asSubmissionStatus(status);
  return next === 'completed' || next === 'graded';
}

export const OPEN_WORK_STATUSES: SubmissionStatus[] = ['assigned', 'started'];
export const AWAITING_GRADE_STATUSES: SubmissionStatus[] = ['completed'];
export const FINISHED_WORK_STATUSES: SubmissionStatus[] = ['completed', 'graded'];
