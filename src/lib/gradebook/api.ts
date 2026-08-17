import { formatScoreMark, numericScoreForAverage, type ScoreMark } from '@/lib/grade/marks';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentRow, SubmissionRow } from '@/lib/supabase/types';

export type GradeCell = {
  status: SubmissionRow['status'] | null;
  score: number | null;
  scoreMark: ScoreMark;
  submissionId: string | null;
};

export type Gradebook = {
  students: RosterStudent[];
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
      cells[cellKey(row.assignment_id, row.student_id)] = {
        status: row.status,
        score: row.approved_score,
        scoreMark: row.score_mark === 'pass' || row.score_mark === 'fail' ? row.score_mark : 'numeric',
        submissionId: row.id,
      };
    }
  }

  return { students, assignments: columns, cells };
}

export function gradeCell(
  book: Gradebook,
  assignmentId: string,
  studentId: string,
): GradeCell {
  return book.cells[cellKey(assignmentId, studentId)] ?? { status: null, score: null, scoreMark: 'numeric', submissionId: null };
}

export function formatCell(cell: GradeCell): string {
  if (!cell.status) return '—';
  if (cell.status === 'assigned') return 'Assigned';
  if (cell.status === 'submitted') return 'In';
  if (cell.status === 'approved') {
    const mark = formatScoreMark(cell.scoreMark, cell.score);
    if (mark) return mark;
    return 'Done';
  }
  if (cell.status === 'draft_scored') return 'Draft';
  return cell.status;
}

export { numericScoreForAverage };

export function cellTone(cell: GradeCell): 'mute' | 'warn' | 'ink' | 'good' | 'inkBold' {
  if (!cell.status) return 'mute';
  if (cell.status === 'assigned' || cell.status === 'draft_scored') return 'warn';
  if (cell.status === 'approved' && cell.score != null) return 'inkBold';
  if (cell.status === 'approved') return 'good';
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
      status: 'approved' as const,
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
