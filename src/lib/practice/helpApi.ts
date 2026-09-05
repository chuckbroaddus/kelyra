import { requireSupabase } from '@/lib/supabase/client';
import { invokeAi } from '@/lib/ai/invoke';

import {
  formatHelpUsedRowSummary,
  formatItemHelpUsed,
  parseHelpUsed,
  type HelpUsedMap,
} from '@/lib/practice/helpUsed';

export type PracticeHelpAction = 'hint' | 'next_step' | 'isomorphic' | 'full_item' | 'check_work';
export type PracticeHelpMode = 'off' | 'hints' | 'steps_after_try' | 'check_work';

export type PracticeHelpResult = {
  ok?: boolean;
  text?: string;
  error?: string;
  refused?: boolean;
  help_mode?: PracticeHelpMode;
  attempt_gate?: boolean;
  approved_score_written?: boolean;
  help_used?: HelpUsedMap;
};

export {
  formatHelpUsedRowSummary,
  formatItemHelpUsed,
  parseHelpUsed,
  type HelpUsedMap,
};

export async function requestPracticeHelp(input: {
  assignmentId: string;
  studentId: string;
  itemId: string;
  action: PracticeHelpAction;
  attemptText?: string;
}): Promise<PracticeHelpResult> {
  return invokeAi<PracticeHelpResult>('practice-help', {
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    itemId: input.itemId,
    action: input.action,
    attemptText: input.attemptText ?? '',
  });
}

/** Teacher-only read of help_used (class_teacher_of wall in SQL). */
export async function fetchTeacherHelpUsed(
  assignmentId: string,
  studentId: string,
): Promise<HelpUsedMap> {
  const { data, error } = await requireSupabase().rpc('teacher_get_practice_help_used', {
    p_assignment_id: assignmentId,
    p_student_id: studentId,
  });
  if (error) throw error;
  return parseHelpUsed(data);
}
