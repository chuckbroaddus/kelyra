import { buildAssignmentTree, type BookNode } from '@/lib/assignments/tree';
import { asSubmissionStatus, isAwaitingGrade, isGraded, submissionStatusLabel } from '@/lib/assignments/status';
import { formatScoreMark, numericScoreForAverage, parseGradeTerm, type ScoreMark } from '@/lib/grade/marks';
import { lessonWorkLabel } from '@/lib/lessons/protocol';
import { signedProfileUrl } from '@/lib/people/photos';
import { loadStudentSession } from '@/lib/student-session/api';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentKind, AssignmentRow, SubmissionRow } from '@/lib/supabase/types';

export type GradeCell = {
  status: SubmissionRow['status'] | null;
  score: number | null;
  scoreMark: ScoreMark;
  submissionId: string | null;
  kind?: AssignmentKind | null;
  answers?: Record<string, unknown> | null;
};

export type Gradebook = {
  students: RosterStudent[];
  assignments: AssignmentRow[];
  cells: Record<string, GradeCell>;
};

export type StudentGradebook = {
  student: { id: string; displayName: string; photoUrl: string | null };
  classes: Array<{ classId: string; className: string }>;
  assignments: AssignmentRow[];
  cells: Record<string, GradeCell>;
};

function cellKey(assignmentId: string, studentId: string) {
  return `${assignmentId}:${studentId}`;
}

export async function loadGradebook(classId: string): Promise<Gradebook> {
  const supabase = requireSupabase();
  await backfillApprovedCaptures(classId);

  const [students, { data: assignments, error: assignmentError }] = await Promise.all([
    listRoster(classId),
    supabase.from('assignments').select('*').eq('class_id', classId).order('created_at', { ascending: true }),
  ]);
  if (assignmentError) throw assignmentError;

  const columns = assignments ?? [];
  const cells: Record<string, GradeCell> = {};
  if (columns.length) {
    const { data: submissions, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .in(
        'assignment_id',
        columns.map((row) => row.id),
      );
    if (submissionError) throw submissionError;
    for (const row of submissions ?? []) {
      const assignment = columns.find((item) => item.id === row.assignment_id);
      cells[cellKey(row.assignment_id, row.student_id)] = {
        status: row.status,
        score: row.approved_score,
        scoreMark: row.score_mark === 'pass' || row.score_mark === 'fail' ? row.score_mark : 'numeric',
        submissionId: row.id,
        kind: assignment?.kind ?? null,
        answers: row.answers,
      };
    }
  }

  return { students, assignments: columns, cells };
}

function asKind(value: string | null | undefined): AssignmentKind {
  if (value === 'lesson' || value === 'capture' || value === 'practice') return value;
  return 'practice';
}

export async function loadStudentGradebook(): Promise<StudentGradebook> {
  const session = await loadStudentSession();
  if (!session) throw new Error('This login is not assigned to a roster name yet.');
  const { data, error } = await requireSupabase().rpc('student_gradebook');
  if (error) {
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')) {
      throw new Error('Paste supabase/migrations/20260825000006_grade_terms.sql in the Supabase SQL editor, then open Grades again.');
    }
    throw new Error(error.message || 'Could not load grades');
  }

  const classes: StudentGradebook['classes'] = [];
  const assignments: AssignmentRow[] = [];
  const cells: Record<string, GradeCell> = {};
  const seenClass = new Set<string>();
  const seenAssignment = new Set<string>();

  for (const row of data ?? []) {
    if (row.class_id && !seenClass.has(row.class_id)) {
      seenClass.add(row.class_id);
      classes.push({ classId: row.class_id, className: row.class_name ?? 'Class' });
    }
    if (row.assignment_id && !seenAssignment.has(row.assignment_id)) {
      seenAssignment.add(row.assignment_id);
      assignments.push({
        id: row.assignment_id,
        class_id: row.class_id,
        title: row.assignment_title,
        kind: asKind(row.kind),
        capture_id: null,
        practice_set_id: null,
        due_at: null,
        max_score: null,
        created_at: row.created_at,
        unit: row.unit ?? null,
        section: row.section ?? null,
        term: parseGradeTerm(row.term),
      });
    }
    if (row.assignment_id) {
      cells[cellKey(row.assignment_id, session.studentId)] = {
        status: row.status ?? null,
        score: row.approved_score ?? null,
        scoreMark: row.score_mark === 'pass' || row.score_mark === 'fail' ? row.score_mark : 'numeric',
        submissionId: row.submission_id ?? null,
        kind: asKind(row.kind),
        answers: row.answers ?? null,
      };
    }
  }

  const photoUrl = await signedProfileUrl(session.photoPath).catch(() => null);
  return {
    student: { id: session.studentId, displayName: session.displayName, photoUrl },
    assignments,
    cells,
    classes: classes.sort((a, b) => a.className.localeCompare(b.className)),
  };
}

export function gradeCell(
  book: Pick<Gradebook, 'cells'> | Pick<StudentGradebook, 'cells'>,
  assignmentId: string,
  studentId: string,
): GradeCell {
  return book.cells[cellKey(assignmentId, studentId)] ?? { status: null, score: null, scoreMark: 'numeric', submissionId: null };
}

export function studentBookTree(book: StudentGradebook, classId: string | 'all'): BookNode[] {
  const rooms = classId === 'all' ? book.classes : book.classes.filter((row) => row.classId === classId);
  const nodes: BookNode[] = [];
  for (const room of rooms) {
    const columns = book.assignments.filter((row) => row.class_id === room.classId);
    if (!columns.length) continue;
    nodes.push(...buildAssignmentTree(room.className, columns, room.classId));
  }
  return nodes;
}

export function formatCell(cell: GradeCell): string {
  if (!cell.status) return '—';
  if (isGraded(cell.status)) {
    const mark = formatScoreMark(cell.scoreMark, cell.score);
    if (mark) return mark;
    return 'Graded';
  }
  if (cell.kind === 'lesson') return lessonWorkLabel(cell.status, cell.answers);
  return submissionStatusLabel(cell.status) || cell.status;
}

export { numericScoreForAverage };

export function cellTone(cell: GradeCell): 'mute' | 'warn' | 'ink' | 'good' | 'inkBold' {
  if (!cell.status) return 'mute';
  if (isGraded(cell.status) && cell.score != null) return 'inkBold';
  if (isGraded(cell.status)) return 'good';
  if (isAwaitingGrade(cell.status)) return 'warn';
  const next = asSubmissionStatus(cell.status);
  if (next === 'started') return 'warn';
  if (next === 'assigned') return 'warn';
  return 'ink';
}

async function backfillApprovedCaptures(classId: string) {
  const supabase = requireSupabase();
  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .eq('class_id', classId)
    .eq('status', 'approved');
  if (error) throw error;
  if (!captures?.length) return;

  const { data: existing } = await supabase
    .from('assignments')
    .select('capture_id')
    .eq('class_id', classId)
    .eq('kind', 'capture');
  const have = new Set((existing ?? []).map((row) => row.capture_id).filter(Boolean));

  for (const capture of captures) {
    if (!capture.student_id || have.has(capture.id)) continue;
    const title = capture.transcript
      ? `Work: ${capture.transcript.slice(0, 24)}`
      : `Work ${new Date(capture.created_at).toLocaleDateString()}`;
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        title,
        kind: 'capture',
        capture_id: capture.id,
      })
      .select('*')
      .single();
    if (assignmentError) throw assignmentError;
    const draft = (capture.model_draft ?? {}) as { scoreMark?: string };
    const scoreMark: 'numeric' | 'pass' | 'fail' =
      draft.scoreMark === 'pass' || draft.scoreMark === 'fail' ? draft.scoreMark : 'numeric';
    const row = {
      assignment_id: assignment.id,
      student_id: capture.student_id,
      status: 'graded' as const,
      approved_score: scoreMark === 'numeric' ? capture.approved_score : null,
      approved_at: capture.approved_at,
      score_mark: scoreMark,
    };
    const { error: submissionError } = await supabase.from('submissions').insert(row);
    if (submissionError) {
      const { score_mark: _mark, ...rest } = row;
      const retry = await supabase.from('submissions').insert(rest);
      if (retry.error) throw retry.error;
    }
  }
}
