function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type StudentWorkClass = {
  classId: string;
  className: string;
  feedIcon: string | null;
};

export type StudentWorkItem = {
  submissionId: string;
  title: string;
  status: string;
  dueAt: string | null;
  submittedAt: string | null;
  classId: string | null;
  className: string | null;
  classIcon: string | null;
  approvedScore: number | null;
  scoreMark: string | null;
};

export type StudentStatusIcon = 'statusAssigned' | 'statusStarted' | 'statusCompleted' | 'statusGraded';

export function studentStatusIcon(status: string | null | undefined): StudentStatusIcon {
  if (status === 'started') return 'statusStarted';
  if (status === 'completed') return 'statusCompleted';
  if (status === 'graded') return 'statusGraded';
  return 'statusAssigned';
}

/** Status glyph sits next to the title for every assignment cell. */
export function showStudentStatusIcon(status: string | null | undefined): boolean {
  return status === 'assigned' || status === 'started' || status === 'completed' || status === 'graded';
}

export function studentWorkDateLine(item: Pick<StudentWorkItem, 'status' | 'dueAt' | 'submittedAt'>): string {
  if ((item.status === 'completed' || item.status === 'graded') && item.submittedAt) {
    return `Turned in ${shortDate(item.submittedAt)}`;
  }
  if (item.dueAt) return `Due ${shortDate(item.dueAt)}`;
  return '';
}

export function sortStudentTodo<T extends StudentWorkItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.title.localeCompare(b.title);
  });
}

export function sortStudentDone<T extends StudentWorkItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aAt = a.submittedAt ? Date.parse(a.submittedAt) : 0;
    const bAt = b.submittedAt ? Date.parse(b.submittedAt) : 0;
    if (aAt !== bAt) return bAt - aAt;
    return a.title.localeCompare(b.title);
  });
}

export function filterStudentWork<T extends StudentWorkItem>(
  items: T[],
  pane: 'todo' | 'done' | 'all',
  classId: string | 'all',
  open: (status: string) => boolean,
  finished: (status: string) => boolean,
): T[] {
  const inPane =
    pane === 'all'
      ? items
      : items.filter((item) => (pane === 'done' ? finished(item.status) : open(item.status)));
  const scoped = classId === 'all' ? inPane : inPane.filter((item) => item.classId === classId);
  return pane === 'done' ? sortStudentDone(scoped) : sortStudentTodo(scoped);
}

export function classesFromWork(classes: StudentWorkClass[], items: StudentWorkItem[]): StudentWorkClass[] {
  if (classes.length) return classes;
  const seen = new Map<string, StudentWorkClass>();
  for (const item of items) {
    if (!item.classId || seen.has(item.classId)) continue;
    seen.set(item.classId, {
      classId: item.classId,
      className: item.className ?? 'Class',
      feedIcon: item.classIcon,
    });
  }
  return [...seen.values()].sort((a, b) => a.className.localeCompare(b.className));
}

export function studentGradeLine(
  item: Pick<StudentWorkItem, 'status' | 'approvedScore' | 'scoreMark'>,
  formatScore: (mark: string | null, score: number | null) => string,
  statusLabel: (status: string) => string,
): string {
  if (item.status === 'graded') {
    const mark = formatScore(item.scoreMark, item.approvedScore);
    return mark || 'Graded';
  }
  return statusLabel(item.status) || '';
}
