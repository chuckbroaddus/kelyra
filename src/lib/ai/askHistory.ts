import { requireSupabase } from '@/lib/supabase/client';
import type { AskMessageRow, MessagePayload } from '@/lib/supabase/types';

export const ASK_DISPLAY_LIMIT = 100;
export const ASK_MODEL_TURNS = 20;

/** Seat-scoped Ask transcript key (not profiles.role job-of-record). */
export type AskTranscriptSeat = 'teacher' | 'parent' | 'office' | 'student';

/** Map active chrome.role → transcript seat. Walls follow the seat, not the job. */
export function askSeatFromChromeRole(role: string | null | undefined): AskTranscriptSeat | null {
  if (role === 'parent') return 'parent';
  if (role === 'teacher') return 'teacher';
  if (role === 'student') return 'student';
  if (role === 'superintendent' || role === 'administrator') return 'office';
  return null;
}

/** Teacher-desk / class-stack routes — parent-seat Ask must not navigate here. */
export function isTeacherAskHref(href: string | null | undefined): boolean {
  if (!href || typeof href !== 'string') return false;
  const path = href.split('?')[0] ?? href;
  return (
    path === '/inbox' ||
    path === '/capture' ||
    path === '/' ||
    path.startsWith('/class/') ||
    path.startsWith('/admin/class/')
  );
}

export async function listAskMessages(seat: AskTranscriptSeat): Promise<AskMessageRow[]> {
  const { data, error } = await requireSupabase().rpc('ask_list_messages', {
    p_limit: ASK_DISPLAY_LIMIT,
    p_seat: seat,
  });
  if (error) throw new Error(error.message || 'Could not load Kelyra chat');
  return (data ?? []).map(asAskMessage);
}

export async function appendAskMessage(
  role: 'user' | 'assistant',
  body: string,
  payload: MessagePayload | null | undefined,
  seat: AskTranscriptSeat,
): Promise<string> {
  // Seat is required — never default to teacher (dual-hat parent must not write teach thread).
  const { data, error } = await requireSupabase().rpc('ask_append_message', {
    p_role: role,
    p_body: body,
    p_payload: payload ?? null,
    p_seat: seat,
  });
  if (error) throw new Error(error.message || 'Could not save this chat');
  return data;
}

export async function startAskThread(seat: AskTranscriptSeat): Promise<void> {
  const { error } = await requireSupabase().rpc('ask_new_thread', { p_seat: seat });
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
