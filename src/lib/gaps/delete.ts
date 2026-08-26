import { requireSupabase } from '@/lib/supabase/client';

export async function deleteGap(gapId: string): Promise<void> {
  const supabase = requireSupabase();
  const rpc = await supabase.rpc('teacher_delete_gap', { p_gap_id: gapId });
  if (!rpc.error) return;
  const { error } = await supabase.from('skill_gaps').delete().eq('id', gapId);
  if (error) throw rpc.error;
}
