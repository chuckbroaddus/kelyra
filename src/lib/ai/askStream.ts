import { fetch as expoFetch } from 'expo/fetch';

import { aiDevUrl, supabaseAnonKey, supabaseUrl } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase/client';

export type AskStreamReply = {
  text?: string;
  responseId?: string;
  toolCalls?: Array<{ call_id: string; name: string; arguments: string; thoughtSignature?: string }>;
};

/**
 * Streams one ask-assistant round over SSE so the answer shows up while it is being written.
 * `onText` gets the text so far. Returns null when streaming is not available (local ai:dev,
 * no session, network / non-SSE reply before any text) so the caller can use the JSON path.
 */
export async function streamAskAssistant(
  body: Record<string, unknown>,
  onText: (textSoFar: string) => void,
): Promise<AskStreamReply | null> {
  if (aiDevUrl || !supabaseUrl) return null;
  const { data } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  let text = '';
  let sawEvent = false;
  try {
    const response = await expoFetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/ask-assistant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !response.body) return null;
    if (!type.includes('text/event-stream')) {
      // Older Edge without streaming: it answered with the normal JSON body.
      return (await response.json()) as AskStreamReply;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let event = 'message';
    let done: AskStreamReply | null = null;
    const handleLine = (line: string) => {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
        return;
      }
      if (!line.startsWith('data:')) return;
      sawEvent = true;
      const payload = JSON.parse(line.slice(5).trim()) as AskStreamReply & { error?: string };
      if (event === 'delta' && typeof payload.text === 'string') {
        text += payload.text;
        onText(text);
      } else if (event === 'done') {
        done = payload;
      } else if (event === 'error') {
        throw new Error(payload.error || 'Ask failed');
      }
    };
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        if (line) handleLine(line);
        newline = buffer.indexOf('\n');
      }
    }
    if (buffer.trim()) handleLine(buffer.trim());
    if (done) return done;
    return text ? { text } : null;
  } catch (err) {
    // Nothing shown yet → let the caller retry over the JSON path; otherwise surface the error.
    if (!sawEvent) return null;
    throw err;
  }
}
