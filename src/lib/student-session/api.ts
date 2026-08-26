import AsyncStorage from '@react-native-async-storage/async-storage';

import { asSubmissionStatus } from '@/lib/assignments/status';
import { signedProfileUrls } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';
import type { PracticeItem, SubmissionStatus } from '@/lib/supabase/types';
import {
  classesNeedTeacherPeople,
  mergeClassTeachers,
  type StudentClass,
  type StudentPerson,
  type StudentPersonKind,
} from '@/lib/student-session/classes';

export type { StudentClass, StudentPerson, StudentPersonKind };

const LEGACY_STORAGE_KEY = 'kelyra.student-session';

export type StudentSession = {
  classId: string | null;
  className: string | null;
  studentId: string;
  displayName: string;
  photoPath?: string | null;
};

export type StudentTodo = {
  submissionId: string;
  assignmentId: string;
  title: string;
  kind: string;
  status: SubmissionStatus;
  dueAt: string | null;
  submittedAt: string | null;
  classId: string | null;
  className: string | null;
  classIcon: string | null;
  approvedScore: number | null;
  scoreMark: string | null;
  items: PracticeItem[];
  answers: Record<string, unknown>;
  focusLabel: string | null;
};

type CacheBox<T> = { value: T | null; inflight: Promise<T> | null };

const classesCache: CacheBox<StudentClass[]> = { value: null, inflight: null };
const peopleCache: CacheBox<StudentPerson[]> = { value: null, inflight: null };
const todoCache: CacheBox<StudentTodo[]> = { value: null, inflight: null };

export function peekStudentClasses(): StudentClass[] | null {
  return classesCache.value;
}

export function peekStudentPeople(): StudentPerson[] | null {
  return peopleCache.value;
}

export function peekStudentTodo(): StudentTodo[] | null {
  return todoCache.value;
}

export function clearStudentSessionCache() {
  classesCache.value = null;
  classesCache.inflight = null;
  peopleCache.value = null;
  peopleCache.inflight = null;
  todoCache.value = null;
  todoCache.inflight = null;
}

async function remember<T>(box: CacheBox<T>, load: () => Promise<T>): Promise<T> {
  if (box.inflight) return box.inflight;
  const work = load()
    .then((rows) => {
      box.value = rows;
      return rows;
    })
    .finally(() => {
      if (box.inflight === work) box.inflight = null;
    });
  box.inflight = work;
  return work;
}

export type StudentClassmate = {
  studentId: string;
  displayName: string;
  photoPath: string | null;
};

export async function clearLegacyStudentSession() {
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function loadStudentSession(): Promise<StudentSession | null> {
  await clearLegacyStudentSession();
  const { data, error } = await requireSupabase().rpc('student_me');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.student_id) return null;
  return {
    classId: row.class_id ?? null,
    className: row.class_name ?? null,
    studentId: row.student_id,
    displayName: row.display_name,
    photoPath: row.photo_path ?? null,
  };
}

export async function listStudentClassmates(): Promise<StudentClassmate[]> {
  const { data, error } = await requireSupabase().rpc('student_classmates');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    studentId: row.student_id,
    displayName: row.display_name,
    photoPath: row.photo_path ?? null,
  }));
}

export async function listStudentTodo(): Promise<StudentTodo[]> {
  return remember(todoCache, async () => {
    const { data, error } = await requireSupabase().rpc('student_list_todo');
    if (error) throw error;
    return (data ?? []).map((row) => ({
      submissionId: row.submission_id,
      assignmentId: row.assignment_id,
      title: row.assignment_title,
      kind: row.kind ?? 'practice',
      status: asSubmissionStatus(row.status) ?? 'assigned',
      dueAt: row.due_at ?? null,
      submittedAt: row.submitted_at ?? null,
      classId: row.class_id ?? null,
      className: row.class_name ?? null,
      classIcon: row.class_icon ?? null,
      approvedScore: row.approved_score ?? null,
      scoreMark: row.score_mark ?? null,
      items: row.items ?? [],
      answers: row.answers ?? {},
      focusLabel: row.focus_label,
    }));
  });
}

async function fetchStudentPeople(): Promise<StudentPerson[]> {
  const { data, error } = await requireSupabase().rpc('student_people');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    kind: row.kind === 'teacher' || row.kind === 'parent' ? row.kind : 'classmate',
    id: row.id,
    profileId: row.profile_id ?? null,
    displayName: row.display_name,
    photoPath: row.photo_path ?? null,
    classId: row.class_id ?? null,
    className: row.class_name ?? null,
  }));
}

export async function listStudentPeople(): Promise<StudentPerson[]> {
  return remember(peopleCache, fetchStudentPeople);
}

export async function studentPhotoUrls(people: StudentPerson[]): Promise<Record<string, string | null>> {
  const urls = await signedProfileUrls(people.map((row) => row.photoPath));
  const out: Record<string, string | null> = {};
  for (const person of people) {
    out[person.id] = person.photoPath ? urls.get(person.photoPath) ?? null : null;
  }
  return out;
}

async function fetchStudentClasses(): Promise<StudentClass[]> {
  const { data, error } = await requireSupabase().rpc('student_classes');
  if (error) throw error;
  let rows: StudentClass[] = (data ?? []).map((row) => ({
    classId: row.class_id,
    className: row.class_name,
    feedIcon: row.feed_icon ?? null,
    teacherName: row.teacher_name ?? null,
    teacherPhotoPath: row.teacher_photo_path ?? null,
    teacherPhotoUrl: null,
  }));
  if (classesNeedTeacherPeople(rows)) {
    const people = await listStudentPeople().catch(() => [] as StudentPerson[]);
    rows = mergeClassTeachers(rows, people);
  }
  const urls = await signedProfileUrls(rows.map((row) => row.teacherPhotoPath));
  return rows.map((row) => ({
    ...row,
    teacherPhotoUrl: row.teacherPhotoPath ? urls.get(row.teacherPhotoPath) ?? null : null,
  }));
}

export async function listStudentClasses(): Promise<StudentClass[]> {
  return remember(classesCache, fetchStudentClasses);
}

export async function markStudentWorkStarted(submissionId: string) {
  const { error } = await requireSupabase().rpc('student_mark_started', {
    p_submission_id: submissionId,
  });
  if (error) throw error;
  todoCache.value = null;
}

export async function submitStudentTodo(submissionId: string, answers: Record<string, string>) {
  const { error } = await requireSupabase().rpc('student_submit', {
    p_submission_id: submissionId,
    p_answers: answers,
  });
  if (error) throw error;
  todoCache.value = null;
}
