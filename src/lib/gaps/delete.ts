import { requireSupabase } from '@/lib/supabase/client';

export async function deleteGap(gapId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_gap', { p_gap_id: gapId });
  if (error) throw error;
}
