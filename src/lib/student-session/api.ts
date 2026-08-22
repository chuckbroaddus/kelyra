import AsyncStorage from '@react-native-async-storage/async-storage';

import { requireSupabase } from '@/lib/supabase/client';
import type { PracticeItem, SubmissionStatus } from '@/lib/supabase/types';

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
  title: string;
  status: SubmissionStatus;
  items: PracticeItem[];
  answers: Record<string, string>;
  focusLabel: string | null;
};

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
  const { data, error } = await requireSupabase().rpc('student_list_todo');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    submissionId: row.submission_id,
    title: row.assignment_title,
    status: row.status,
    items: row.items ?? [],
    answers: row.answers ?? {},
    focusLabel: row.focus_label,
  }));
}

export async function submitStudentTodo(submissionId: string, answers: Record<string, string>) {
  const { error } = await requireSupabase().rpc('student_submit', {
    p_submission_id: submissionId,
    p_answers: answers,
  });
  if (error) throw error;
}
