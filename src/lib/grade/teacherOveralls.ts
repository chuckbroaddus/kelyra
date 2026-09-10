/**
 * Teacher gradebook overalls — same engine as family (syllabusAverage).
 * Blank when syllabus is not published with weights.
 */

import {
  computeSyllabusAverage,
  type AverageAssignment,
  type AverageCell,
  type SyllabusCategoryInput,
  type SyllabusInput,
  type SyllabusPolicies,
} from './syllabusAverage.ts';

export type TeacherOverallAssignment = {
  id: string;
  title: string;
  category?: string | null;
  term?: string | null;
  include_in_average?: boolean;
  due_at?: string | null;
  is_makeup?: boolean;
  score_scheme?: string | null;
};

export type TeacherOverallCell = {
  assignmentId: string;
  approvedScore: number | null;
  scoreMark?: 'numeric' | 'pass' | 'fail' | null;
  status?: string | null;
  approved?: boolean;
};

export function computeTeacherStudentOveralls(input: {
  studentIds: string[];
  assignments: TeacherOverallAssignment[];
  cellsForStudent: (studentId: string) => TeacherOverallCell[];
  syllabus:
    | {
        status: string | null | undefined;
        categories: SyllabusCategoryInput[];
        policies?: SyllabusPolicies | null;
      }
    | null
    | undefined;
  termFilter?: string;
}): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const published =
    input.syllabus != null &&
    input.syllabus.status === 'published' &&
    input.syllabus.categories.some((c) => c.active !== false && Number(c.weight_percent) > 0);

  if (!published) {
    for (const id of input.studentIds) out[id] = null;
    return out;
  }

  const syllabus: SyllabusInput = {
    status: 'published',
    categories: input.syllabus!.categories,
    policies: input.syllabus!.policies ?? null,
  };
  const assignments: AverageAssignment[] = input.assignments.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category ?? '',
    term: row.term ?? null,
    include_in_average: row.include_in_average,
    due_at: row.due_at ?? null,
    is_makeup: row.is_makeup,
    score_scheme: row.score_scheme ?? null,
  }));

  for (const studentId of input.studentIds) {
    const cells: AverageCell[] = input.cellsForStudent(studentId).map((cell) => ({
      assignmentId: cell.assignmentId,
      approvedScore: cell.approvedScore,
      scoreMark: cell.scoreMark ?? 'numeric',
      status: cell.status ?? null,
      approvedAt: cell.approved ? 'graded' : null,
    }));
    const result = computeSyllabusAverage(syllabus, assignments, cells, {
      termFilter: input.termFilter ?? 'all',
    });
    out[studentId] = result.overall;
  }
  return out;
}
