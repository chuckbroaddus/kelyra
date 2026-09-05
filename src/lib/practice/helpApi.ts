import { invokeAi } from '@/lib/ai/invoke';

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
