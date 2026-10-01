/**
 * In-memory hand-off from the interview route to the form route (same JS
 * runtime; router.replace keeps the module alive). Consumed once.
 */
import type { InterviewSession } from './types.ts';

const store = new Map<string, { session: InterviewSession; at: number }>();

function key(wizard: 'school' | 'syllabus', id: string): string {
  return `${wizard}:${id}`;
}

export function putInterviewHandoff(wizard: 'school' | 'syllabus', id: string, session: InterviewSession): void {
  store.set(key(wizard, id), { session, at: Date.now() });
}

/** Returns and clears the pending hand-off (ignores entries older than 30 min). */
export function takeInterviewHandoff(wizard: 'school' | 'syllabus', id: string): InterviewSession | null {
  const k = key(wizard, id);
  const hit = store.get(k);
  store.delete(k);
  if (!hit) return null;
  if (Date.now() - hit.at > 30 * 60 * 1000) return null;
  return hit.session;
}
