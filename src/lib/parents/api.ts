import { requireSupabase } from '@/lib/supabase/client';

export type ParentProgress = {
  displayName: string;
  className: string;
  focusLabel: string | null;
  practiceStatus: string | null;
  sentence: string | null;
};

export async function createParentInvite(studentId: string): Promise<string> {
  const token = Array.from({ length: 24 }, () =>
    'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)],
  ).join('');

  const { error } = await requireSupabase().from('parent_accesses').insert({
    student_id: studentId,
    token,
  });
  if (error) throw error;
  return token;
}

export async function loadParentProgress(token: string): Promise<ParentProgress | null> {
  const { data, error } = await requireSupabase().rpc('parent_open', { p_token: token.trim() });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    displayName: row.display_name,
    className: row.class_name,
    focusLabel: row.focus_label,
    practiceStatus: row.practice_status,
    sentence: row.parent_sentence,
  };
}

export function parentInviteUrl(token: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/parent?t=${token}`;
  }
  return `/parent?t=${token}`;
}

export function formatPracticeStatus(status: string | null): string {
  if (status === 'submitted' || status === 'approved') return 'Done';
  if (status === 'assigned' || status === 'draft_scored') return 'Assigned';
  return 'No practice yet';
}
