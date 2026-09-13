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

/** Honest "who can see this" (CAL-23). Client copy; server caption is SoT on get. */
export function visibilityCaption(scope: string | null | undefined, category?: string | null): string {
  if ((category ?? '').toLowerCase() === 'absence' || scope === 'student_teachers') {
    return "You and this child's teachers. Not the school, not other children, not the student.";
  }
  if (scope === 'school') return 'Everyone at the school can see this.';
  if (scope === 'class') return 'Students and parents in this class, plus teachers of this class.';
  if (scope === 'self') return 'Only you can see this.';
  if (scope === 'team') return 'Members of this team can see this.';
  return 'Visibility follows your seat.';
}

export function defaultKindForSeat(
  seat: string,
  opts?: { classId?: string | null; childStudentId?: string | null },
): 'school' | 'class' | 'personal' | 'absence' | null {
  if (seat === 'office') return 'school';
  if (seat === 'teacher') return opts?.classId ? 'class' : 'personal';
  if (seat === 'student') return 'personal';
  if (seat === 'parent') return opts?.childStudentId ? 'absence' : 'personal';
  return null;
}

export function kindsForSeat(seat: string): Array<'school' | 'class' | 'personal' | 'absence'> {
  if (seat === 'office') return ['school'];
  if (seat === 'teacher') return ['class', 'personal'];
  if (seat === 'student') return ['personal'];
  if (seat === 'parent') return ['absence', 'personal'];
  return [];
}

export function categoriesForKind(kind: 'school' | 'class' | 'personal' | 'absence'): string[] {
  if (kind === 'school') return ['school'];
  if (kind === 'class') return ['class', 'lesson'];
  if (kind === 'personal') return ['personal', 'study'];
  return ['absence'];
}

export function scopeForKind(kind: 'school' | 'class' | 'personal' | 'absence'): string {
  if (kind === 'school') return 'school';
  if (kind === 'class') return 'class';
  if (kind === 'personal') return 'self';
  return 'student_teachers';
}

/** Compose timestamptz for Save. All-day uses noon UTC to keep the civil day stable. */
export function composeEventInstant(dateIso: string, timeHm: string | null, allDay: boolean): string {
  const parts = dateIso.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error('Start is required');
  }
  const [y, m, d] = parts as [number, number, number];
  if (allDay) {
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
  }
  let hh = 9;
  let mm = 0;
  if (timeHm && /^\d{1,2}:\d{2}$/.test(timeHm.trim())) {
    const [h, min] = timeHm.trim().split(':').map(Number);
    hh = h;
    mm = min;
  }
  return new Date(y, m - 1, d, hh, mm, 0).toISOString();
}

export function datePart(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function timePart(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
