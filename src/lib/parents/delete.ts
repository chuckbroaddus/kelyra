import { requireSupabase } from '@/lib/supabase/client';

export async function deleteParent(parentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_parent', { p_parent_id: parentId });
  if (error) throw error;
}

export async function unlinkChild(parentId: string, studentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_unlink_child', {
    p_parent_id: parentId,
    p_student_id: studentId,
  });
  if (error) throw error;
}

export async function revokeInvite(accessId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_revoke_invite', { p_access_id: accessId });
  if (error) throw error;
}
