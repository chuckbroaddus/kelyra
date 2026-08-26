export function reusablePracticeKey(studentId: string, skillId: string): string {
  return `${studentId}:${skillId}`;
}

export function isReusableOpenPractice(
  row: {
    studentId: string;
    classId: string;
    skillId: string | null;
    kind: string;
    status: string;
  },
  want: { studentId: string; classId: string; skillId: string },
): boolean {
  return (
    row.studentId === want.studentId &&
    row.classId === want.classId &&
    row.kind === 'practice' &&
    row.skillId === want.skillId &&
    (row.status === 'assigned' || row.status === 'started')
  );
}
