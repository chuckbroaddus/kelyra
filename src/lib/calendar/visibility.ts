/** PM lock: quiz/test/midterm/final default hidden; homework/practice/lesson published when due set. */
const HIDDEN_KINDS = new Set(['quiz', 'test', 'midterm', 'final']);

export function defaultCalendarPublished(category: string | null | undefined): boolean {
  const key = (category ?? 'homework').trim().toLowerCase();
  return !HIDDEN_KINDS.has(key);
}

export type CalendarVisibility = 'hidden' | 'published';

export function calendarVisibilityFromPublished(published: boolean): CalendarVisibility {
  return published ? 'published' : 'hidden';
}
