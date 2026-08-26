export type StudentClass = {
  classId: string;
  className: string;
  feedIcon: string | null;
  teacherName?: string | null;
  teacherPhotoPath?: string | null;
  teacherPhotoUrl?: string | null;
};

export type StudentPersonKind = 'classmate' | 'teacher' | 'parent';

export type StudentPerson = {
  kind: StudentPersonKind;
  id: string;
  profileId: string | null;
  displayName: string;
  photoPath: string | null;
  classId: string | null;
  className: string | null;
};

/** Old `student_classes()` has no teacher_name. A missing photo is not a reason to refetch people. */
export function classesNeedTeacherPeople(rows: StudentClass[]): boolean {
  return rows.some((row) => !row.teacherName);
}

export function mergeClassTeachers(rows: StudentClass[], people: StudentPerson[]): StudentClass[] {
  if (!classesNeedTeacherPeople(rows)) return rows;
  const teacherByClass = new Map<string, StudentPerson>();
  for (const person of people) {
    if (person.kind !== 'teacher' || !person.classId || teacherByClass.has(person.classId)) continue;
    teacherByClass.set(person.classId, person);
  }
  return rows.map((row) => {
    const teacher = teacherByClass.get(row.classId);
    if (!teacher) return row;
    return {
      ...row,
      teacherName: row.teacherName || teacher.displayName,
      teacherPhotoPath: row.teacherPhotoPath || teacher.photoPath,
    };
  });
}

export function queryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
