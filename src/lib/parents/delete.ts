import { requireSupabase } from '@/lib/supabase/client';

export async function deleteParent(parentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_parent', { p_parent_id: parentId });
  if (error) throw error;
}

export async function unlinkChild(parentId: string, studentId: string): Promise<void> {
  const supabase = requireSupabase();
  const admin = await supabase.rpc('admin_set_parent_link', {
    p_parent_id: parentId,
    p_student_id: studentId,
    p_link: false,
  });
  if (!admin.error) return;
  const { error } = await supabase.rpc('teacher_unlink_child', {
    p_parent_id: parentId,
    p_student_id: studentId,
  });
  if (error) throw new Error(admin.error.message || error.message || 'Could not unlink');
}

export async function revokeInvite(accessId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_revoke_invite', { p_access_id: accessId });
  if (error) throw error;
}
