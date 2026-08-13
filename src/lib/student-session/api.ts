import AsyncStorage from '@react-native-async-storage/async-storage';

import { requireSupabase } from '@/lib/supabase/client';
import type { PracticeItem, SubmissionStatus } from '@/lib/supabase/types';

const STORAGE_KEY = 'kelyra.student-session';

export type StudentSession = {
  joinCode: string;
  classId: string;
  className: string;
  studentId: string;
  displayName: string;
};

export type StudentTodo = {
  submissionId: string;
  title: string;
  status: SubmissionStatus;
  items: PracticeItem[];
  answers: Record<string, string>;
  focusLabel: string | null;
};

export async function loadStudentSession(): Promise<StudentSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudentSession;
  } catch {
    return null;
  }
}

export async function saveStudentSession(session: StudentSession) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function clearStudentSession() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function openClassByJoinCode(joinCode: string) {
  const { data, error } = await requireSupabase().rpc('student_open_class', {
    p_join_code: joinCode.trim(),
  });
  if (error) throw error;
  return data ?? [];
}

export async function listStudentTodo(joinCode: string, studentId: string): Promise<StudentTodo[]> {
  const { data, error } = await requireSupabase().rpc('student_list_todo', {
    p_join_code: joinCode,
    p_student_id: studentId,
  });
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

export async function submitStudentTodo(
  joinCode: string,
  studentId: string,
  submissionId: string,
  answers: Record<string, string>,
) {
  const { error } = await requireSupabase().rpc('student_submit', {
    p_join_code: joinCode,
    p_student_id: studentId,
    p_submission_id: submissionId,
    p_answers: answers,
  });
  if (error) throw error;
}
