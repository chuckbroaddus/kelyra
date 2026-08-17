import { requireSupabase } from '@/lib/supabase/client';

export async function deleteCapture(captureId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_capture', { p_capture_id: captureId });
  if (error) throw error;
}
