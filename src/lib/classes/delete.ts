import { writeAudit } from '@/lib/school/api';
import { requireSupabase } from '@/lib/supabase/client';

export async function deleteClass(classId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_class', { p_class_id: classId });
  if (error) throw error;
  await writeAudit({
    action: 'delete_class',
    entityType: 'class',
    entityId: classId,
    classId,
  }).catch(() => undefined);
}
