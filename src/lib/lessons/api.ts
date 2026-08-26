import { dueLabel } from '@/lib/assignments/api';
import { listRoster } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentRow, ClassRow, LessonPackRow, SubmissionRow } from '@/lib/supabase/types';
import { lessonDevOrigin, useDevLessonServer } from '@/lib/lessons/host';
import { isPracticePackId } from '@/lib/lessons/practicePage';
import {
  asLessonResult,
  lessonWorkLabel,
  packSliceFromRow,
  type LessonIdentity,
  type LessonPackSlice,
  type LessonResult,
  LESSON_IDENTITY_TYPE,
} from '@/lib/lessons/protocol';
import { lessonWorkFromResult, lessonWorkLines } from '@/lib/lessons/work';

export type LessonPack = LessonPackRow;

export type OpenLesson = {
  documentUrl: string;
  identity: LessonIdentity;
  expiresAt: string | null;
};

export type StudentLesson = SubmissionRow & {
  title: string;
  dueAt: string | null;
  classId: string;
  deckId: string | null;
  lessonVersion: string | null;
  workLabel: 'Assigned' | 'Started' | 'Completed' | 'Graded';
};

export type LessonAttempt = StudentLesson & {
  className: string | null;
  studentName: string | null;
};

export type ClassLessonRollup = {
  classId: string;
  className: string;
  title: string;
  done: number;
  total: number;
};

async function authUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user?.id) throw new Error('sign in first');
  return data.user.id;
}

/** Classes this login actually teaches (class_teachers). Not the office dump. */
export async function listTaughtClasses(): Promise<ClassRow[]> {
  const uid = await authUserId();
  const supabase = requireSupabase();
  const { data: links, error } = await supabase.from('class_teachers').select('class_id').eq('teacher_id', uid);
  if (error) throw error;
  const ids = [...new Set((links ?? []).map((row) => row.class_id))];
  if (!ids.length) return [];
  const { data, error: classError } = await supabase.from('classes').select('*').in('id', ids).order('name');
  if (classError) throw classError;
  return data ?? [];
}

export async function assertTaughtClass(classId: string): Promise<void> {
  const uid = await authUserId();
  const { data, error } = await requireSupabase()
    .from('class_teachers')
    .select('class_id')
    .eq('class_id', classId)
    .eq('teacher_id', uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('You can only assign to a class you teach.');
}

export async function listLessonPacks(): Promise<LessonPack[]> {
  const { data, error } = await requireSupabase()
    .from('lesson_packs')
    .select('*')
    .eq('published', true)
    .order('deck_id');
  if (error) throw error;
  return data ?? [];
}

async function loadPackSlice(deckId: string, version: string): Promise<LessonPackSlice> {
  const { data, error } = await requireSupabase()
    .from('lesson_packs')
    .select('deck_id, version, storage_deck_id, beat_start, beat_end')
    .eq('deck_id', deckId)
    .eq('version', version)
    .maybeSingle();
  if (error) throw error;
  const slice = packSliceFromRow(data ?? {});
  if (!slice) throw new Error('Pick a lesson.');
  return slice;
}

export type LessonAssignFields = {
  dueAt?: string | null;
  category?: string;
  weightBand?: string;
  weightPercent?: number | null;
  term?: string;
  scoreScheme?: string;
  includeInAverage?: boolean;
  practiceSetId?: string | null;
  unit?: string | null;
  section?: string | null;
};

export async function assignLesson(input: {
  classIds: string[];
  title: string;
  pack: { deckId: string; version: string };
  dueAt?: string | null;
  studentId?: string | null;
  seedSubmissions?: boolean;
} & LessonAssignFields): Promise<AssignmentRow[]> {
  const classIds = [...new Set(input.classIds.filter(Boolean))];
  if (!classIds.length) throw new Error('Pick a class you teach.');
  const title = input.title.trim() || 'Lesson';
  const created: AssignmentRow[] = [];
  for (const classId of classIds) {
    await assertTaughtClass(classId);
    if (input.studentId) {
      const roster = await listRoster(classId);
      if (!roster.some((row) => row.id === input.studentId)) {
        throw new Error('That student is not in this class.');
      }
    }
    const slice = await loadPackSlice(input.pack.deckId, input.pack.version);
    const { data, error } = await requireSupabase()
      .from('assignments')
      .insert({
        class_id: classId,
        title,
        kind: 'lesson' as const,
        deck_id: slice.deck_id,
        lesson_version: slice.version,
        storage_deck_id: slice.storage_deck_id,
        beat_start: slice.beat_start,
        beat_end: slice.beat_end,
        due_at: input.dueAt ?? null,
        include_in_average: input.includeInAverage ?? false,
        category: input.category ?? 'homework',
        ...(input.weightBand ? { weight_band: input.weightBand } : {}),
        ...(input.weightPercent != null ? { weight_percent: input.weightPercent } : {}),
        ...(input.term ? { term: input.term } : {}),
        ...(input.scoreScheme ? { score_scheme: input.scoreScheme } : {}),
        ...(input.practiceSetId ? { practice_set_id: input.practiceSetId } : {}),
        ...(input.unit != null ? { unit: input.unit } : {}),
        ...(input.section != null ? { section: input.section } : {}),
      })
      .select('*')
      .single();
    if (error) throw error;
    if (input.seedSubmissions !== false) {
      if (input.studentId) {
        const { error: subError } = await requireSupabase().from('submissions').insert({
          assignment_id: data.id,
          student_id: input.studentId,
          status: 'assigned',
        });
        if (subError) throw subError;
      } else {
        const roster = await listRoster(classId);
        if (roster.length) {
          const { error: subError } = await requireSupabase().from('submissions').insert(
            roster.map((student) => ({
              assignment_id: data.id,
              student_id: student.id,
              status: 'assigned' as const,
            })),
          );
          if (subError) throw subError;
        }
      }
    }
    created.push(data);
  }
  return created;
}

export async function assignLessonToStudent(assignmentId: string, studentId: string): Promise<void> {
  const { data: existing, error } = await requireSupabase()
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return;
  const { error: insertError } = await requireSupabase().from('submissions').insert({
    assignment_id: assignmentId,
    student_id: studentId,
    status: 'assigned' as const,
  });
  if (insertError) throw insertError;
}

export async function updateLessonAssignment(
  assignmentId: string,
  input: {
    classId: string;
    title: string;
    pack: { deckId: string; version: string };
    dueAt?: string | null;
  } & LessonAssignFields,
): Promise<void> {
  await assertTaughtClass(input.classId);
  const slice = await loadPackSlice(input.pack.deckId, input.pack.version);
  const { data, error } = await requireSupabase()
    .from('assignments')
    .update({
      title: input.title.trim(),
      due_at: input.dueAt ?? null,
      deck_id: slice.deck_id,
      lesson_version: slice.version,
      storage_deck_id: slice.storage_deck_id,
      beat_start: slice.beat_start,
      beat_end: slice.beat_end,
      ...(input.category ? { category: input.category } : {}),
      ...(input.weightBand ? { weight_band: input.weightBand } : {}),
      ...(input.weightPercent != null ? { weight_percent: input.weightPercent } : {}),
      ...(input.term ? { term: input.term } : {}),
      ...(input.scoreScheme ? { score_scheme: input.scoreScheme } : {}),
      ...(input.includeInAverage != null ? { include_in_average: input.includeInAverage } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.section !== undefined ? { section: input.section } : {}),
    })
    .eq('id', assignmentId)
    .eq('class_id', input.classId)
    .eq('kind', 'lesson')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('You can only edit a lesson on a class you teach.');
}

export async function listStudentLessons(studentId: string): Promise<StudentLesson[]> {
  const supabase = requireSupabase();
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!submissions?.length) return [];
  const { data: assignments, error: assignmentError } = await supabase
    .from('assignments')
    .select('*')
    .in(
      'id',
      submissions.map((row) => row.assignment_id),
    );
  if (assignmentError) throw assignmentError;
  const byId = new Map((assignments ?? []).map((row) => [row.id, row]));
  return submissions.flatMap((row) => {
    const assignment = byId.get(row.assignment_id);
    if (!assignment || assignment.kind !== 'lesson') return [];
    return [
      {
        ...row,
        title: assignment.title,
        dueAt: assignment.due_at,
        classId: assignment.class_id,
        deckId: assignment.deck_id ?? null,
        lessonVersion: assignment.lesson_version ?? null,
        workLabel: lessonWorkLabel(row.status, row.answers),
      },
    ];
  });
}

export async function getLessonAttempt(submissionId: string): Promise<LessonAttempt | null> {
  const supabase = requireSupabase();
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  if (error) throw error;
  if (!submission) return null;
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', submission.assignment_id)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment || assignment.kind !== 'lesson') return null;
  const [{ data: klass }, { data: student }] = await Promise.all([
    supabase.from('classes').select('name').eq('id', assignment.class_id).maybeSingle(),
    supabase.from('students').select('display_name').eq('id', submission.student_id).maybeSingle(),
  ]);
  return {
    ...submission,
    title: assignment.title,
    dueAt: assignment.due_at,
    classId: assignment.class_id,
    deckId: assignment.deck_id ?? null,
    lessonVersion: assignment.lesson_version ?? null,
    workLabel: lessonWorkLabel(submission.status, submission.answers),
    className: klass?.name ?? null,
    studentName: student?.display_name ?? null,
  };
}

export async function listClassLessonCounts(
  classId: string,
): Promise<Record<string, { done: number; total: number }>> {
  const supabase = requireSupabase();
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('id')
    .eq('class_id', classId)
    .eq('kind', 'lesson');
  if (error) throw error;
  const ids = (assignments ?? []).map((row) => row.id);
  if (!ids.length) return {};
  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select('assignment_id, status, answers')
    .in('assignment_id', ids);
  if (subError) throw subError;
  const counts: Record<string, { done: number; total: number }> = {};
  for (const id of ids) counts[id] = { done: 0, total: 0 };
  for (const row of submissions ?? []) {
    const cell = counts[row.assignment_id] ?? { done: 0, total: 0 };
    cell.total += 1;
    if (lessonWorkLabel(row.status, row.answers) === 'Completed' || lessonWorkLabel(row.status, row.answers) === 'Graded') {
      cell.done += 1;
    }
    counts[row.assignment_id] = cell;
  }
  return counts;
}

export async function listGradeLessonRollup(): Promise<ClassLessonRollup[]> {
  const classes = await listTaughtClasses();
  const rows: ClassLessonRollup[] = [];
  for (const klass of classes) {
    const supabase = requireSupabase();
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('id, title, created_at')
      .eq('class_id', klass.id)
      .eq('kind', 'lesson')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const latest = assignments?.[0];
    if (!latest) continue;
    const counts = await listClassLessonCounts(klass.id);
    const cell = counts[latest.id] ?? { done: 0, total: 0 };
    rows.push({
      classId: klass.id,
      className: klass.name,
      title: latest.title,
      done: cell.done,
      total: cell.total,
    });
  }
  return rows;
}

function identityFromOpenRow(row: {
  assignment_id: string;
  title: string;
  class_id: string;
  class_name: string;
  school_name: string;
  teacher_name: string;
  student_id: string;
  student_name: string;
  preview?: boolean;
  deck_id?: string | null;
  lesson_version?: string | null;
  storage_deck_id?: string | null;
  beat_start?: string | null;
  beat_end?: string | null;
}): LessonIdentity {
  const pack = packSliceFromRow(row);
  return {
    type: LESSON_IDENTITY_TYPE,
    school: { name: row.school_name },
    class: { id: row.class_id, name: row.class_name },
    teacher: { name: row.teacher_name },
    student: { id: row.preview ? null : row.student_id, name: row.preview ? 'Preview' : row.student_name },
    assignment: { id: row.assignment_id, title: row.title },
    preview: row.preview,
    ...(pack ? { pack } : {}),
  };
}

function mergeIdentity(primary: LessonIdentity, fallback: LessonIdentity): LessonIdentity {
  return {
    ...fallback,
    ...primary,
    pack: primary.pack ?? fallback.pack,
    student: primary.student ?? fallback.student,
    assignment: primary.assignment ?? fallback.assignment,
  };
}

async function invokeOpenLesson(assignmentId: string, preview: boolean): Promise<OpenLesson | null> {
  try {
    const { data, error } = await requireSupabase().functions.invoke('student-open-lesson', {
      body: { assignmentId, preview },
    });
    if (error) return null;
    if (!data || typeof data !== 'object') return null;
    const payload = data as OpenLesson & { error?: string };
    if (payload.error || !payload.documentUrl || !payload.identity) return null;
    return {
      documentUrl: payload.documentUrl,
      identity: payload.identity,
      expiresAt: payload.expiresAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function openStudentLesson(assignmentId: string): Promise<OpenLesson> {
  const { data, error } = await requireSupabase().rpc('student_open_lesson', {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message || 'Lesson not found');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.assignment_id) throw new Error('Lesson not found');
  const identity = identityFromOpenRow(row);
  const hosted = await invokeOpenLesson(assignmentId, false);
  if (hosted) {
    return { ...hosted, identity: mergeIdentity(hosted.identity ?? identity, identity) };
  }
  const dev = lessonDevOrigin();
  if (useDevLessonServer() && dev && !isPracticePackId(row.storage_deck_id)) {
    return {
      documentUrl: `${dev}/index.html`,
      identity,
      expiresAt: null,
    };
  }
  throw new Error('Could not open the lesson.');
}

export async function openTeacherPreview(assignmentId: string): Promise<OpenLesson> {
  const hosted = await invokeOpenLesson(assignmentId, true);
  if (hosted) {
    const pack = hosted.identity.pack;
    if (pack) return hosted;
  }
  const supabase = requireSupabase();
  const { data: assignment, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle();
  if (error) throw error;
  if (!assignment || assignment.kind !== 'lesson') throw new Error('Lesson not found');
  await assertTaughtClass(assignment.class_id);
  const { data: klass } = await supabase.from('classes').select('*').eq('id', assignment.class_id).maybeSingle();
  const { data: school } = await supabase.from('schools').select('name').limit(1).maybeSingle();
  const { data: teacher } = klass?.teacher_id
    ? await supabase.from('teachers').select('display_name').eq('id', klass.teacher_id).maybeSingle()
    : { data: null };
  const pack =
    packSliceFromRow(assignment) ??
    (assignment.deck_id && assignment.lesson_version
      ? await loadPackSlice(assignment.deck_id, assignment.lesson_version).catch(() => undefined)
      : undefined);
  const identity: LessonIdentity = {
    type: LESSON_IDENTITY_TYPE,
    school: { name: school?.name?.trim() || 'School' },
    class: { id: assignment.class_id, name: klass?.name ?? 'Class' },
    teacher: { name: teacher?.display_name?.trim() || 'Teacher' },
    student: { id: null, name: 'Preview' },
    assignment: { id: assignment.id, title: assignment.title },
    preview: true,
    ...(pack ? { pack } : {}),
  };
  if (hosted) {
    return { ...hosted, identity: mergeIdentity(hosted.identity, identity) };
  }
  const dev = lessonDevOrigin();
  if (useDevLessonServer() && dev && !isPracticePackId(assignment.storage_deck_id ?? assignment.deck_id)) {
    return { documentUrl: `${dev}/index.html`, identity, expiresAt: null };
  }
  throw new Error('Could not open the lesson.');
}

export async function reportLesson(assignmentId: string, payload: LessonResult): Promise<void> {
  const { error } = await requireSupabase().rpc('student_report_lesson', {
    p_assignment_id: assignmentId,
    p_payload: payload,
  });
  if (error) throw new Error(error.message || 'Could not save the lesson');
}

export function lessonDueText(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  return dueLabel(dueAt);
}

export function lessonResultLines(result: LessonResult | null): Array<{ label: string; value: string }> {
  return lessonWorkLines(lessonWorkFromResult(result));
}

export { asLessonResult, lessonWorkLabel };
