import type { PracticeItem } from '@/lib/supabase/types';

export type FollowUpDraft = {
  classId: string;
  studentId: string;
  sourceAssignmentId: string;
  sourceSubmissionId: string;
  sourceTitle: string;
  skillLabel: string;
  items: PracticeItem[];
  assignmentId?: string;
};

let draft: FollowUpDraft | null = null;

export function setFollowUpDraft(next: FollowUpDraft | null) {
  draft = next;
}

export function getFollowUpDraft(): FollowUpDraft | null {
  return draft;
}

export function followUpItems(items: PracticeItem[]): PracticeItem[] {
  return items
    .map((item, index) => ({
      id: item.id?.trim() || `item-${index + 1}`,
      prompt: item.prompt.trim(),
      ...(item.answerKey?.trim() ? { answerKey: item.answerKey.trim() } : {}),
    }))
    .filter((item) => item.prompt);
}

export function followUpTitle(skillLabel: string, sourceTitle?: string): string {
  const skill = skillLabel.trim() || 'practice';
  const source = sourceTitle?.trim();
  return source ? `${source} · ${skill}` : `Practice: ${skill}`;
}
