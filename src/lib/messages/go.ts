import { handleFromInput } from '@/lib/school/roles';
import { openThread } from '@/lib/messages/api';
import { requireSupabase } from '@/lib/supabase/client';

export async function messagesPathForHandle(input: {
  myId: string;
  schoolId: string;
  otherId?: string | null;
  username?: string | null;
}): Promise<string> {
  let otherId = input.otherId ?? null;
  if (!otherId && input.username) {
    const handle = handleFromInput(input.username);
    const { data } = await requireSupabase()
      .from('profiles')
      .select('id')
      .eq('username', handle)
      .maybeSingle();
    otherId = data?.id ?? null;
  }
  if (!otherId || otherId === input.myId) return '/messages';
  const threadId = await openThread(input.myId, otherId, input.schoolId);
  return `/messages/${threadId}`;
}
