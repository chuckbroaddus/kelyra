import { requireSupabase } from '@/lib/supabase/client';
import type { AskMessageRow, MessagePayload } from '@/lib/supabase/types';

export const ASK_DISPLAY_LIMIT = 100;
export const ASK_MODEL_TURNS = 20;

export async function listAskMessages(): Promise<AskMessageRow[]> {
  const { data, error } = await requireSupabase().rpc('ask_list_messages', { p_limit: ASK_DISPLAY_LIMIT });
  if (error) throw new Error(error.message || 'Could not load Kelyra chat');
  return (data ?? []).map(asAskMessage);
}

export async function appendAskMessage(
  role: 'user' | 'assistant',
  body: string,
  payload?: MessagePayload | null,
): Promise<string> {
  const { data, error } = await requireSupabase().rpc('ask_append_message', {
    p_role: role,
    p_body: body,
    p_payload: payload ?? null,
  });
  if (error) throw new Error(error.message || 'Could not save this chat');
  return data;
}

export async function startAskThread(): Promise<void> {
  const { error } = await requireSupabase().rpc('ask_new_thread');
  if (error) throw new Error(error.message || 'Could not start a new chat');
}

function asAskMessage(row: AskMessageRow): AskMessageRow {
  return {
    id: row.id,
    role: row.role === 'assistant' ? 'assistant' : 'user',
    body: row.body ?? '',
    payload: row.payload ?? null,
    created_at: row.created_at,
  };
}
