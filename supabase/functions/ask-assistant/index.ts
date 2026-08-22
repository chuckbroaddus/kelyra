import { functionCalls, outputText, requireXaiKey, xaiResponses } from '../_shared/ai.ts';

const FALLBACK = "I can’t tell from what’s saved. Open Inbox or the student’s page.";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function hydrateAskImages(input: unknown): Promise<unknown> {
  if (!Array.isArray(input)) return input;
  const next = [];
  for (const item of input) {
    const row = item as { content?: unknown };
    if (!row || !Array.isArray(row.content)) {
      next.push(item);
      continue;
    }
    const content = [];
    for (const part of row.content as Array<{ type?: string; image_url?: string; text?: string; detail?: string }>) {
      if (part?.type === 'input_image' && typeof part.image_url === 'string' && !part.image_url.startsWith('data:')) {
        try {
          const response = await fetch(part.image_url);
          if (!response.ok) throw new Error(String(response.status));
          const bytes = new Uint8Array(await response.arrayBuffer());
          const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
          content.push({
            type: 'input_image',
            image_url: `data:${mime};base64,${bytesToBase64(bytes)}`,
            detail: part.detail === 'high' || part.detail === 'low' ? part.detail : 'auto',
          });
        } catch {
          content.push({ type: 'input_text', text: '(A photo was attached but could not be opened.)' });
        }
      } else {
        content.push(part);
      }
    }
    next.push({ ...row, content });
  }
  return next;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  try {
    const body = await req.json();
    const apiKey = requireXaiKey();
    const tools = Array.isArray(body.tools) ? body.tools : [];
    const extra: Record<string, unknown> = {};
    if (tools.length) extra.tools = tools;
    if (typeof body.instructions === 'string' && body.instructions.trim()) {
      extra.instructions = body.instructions;
    }
    const raw = Array.isArray(body.input) && body.input.length
      ? body.input
      : Array.isArray(body.messages)
        ? body.messages
            .map((item: { from?: string; text?: string }) => ({
              role: item?.from === 'assistant' ? 'assistant' : 'user',
              content: String(item?.text ?? '').trim(),
            }))
            .filter((item: { content: string }) => item.content)
        : [{ role: 'user', content: 'Hello' }];
    const input = await hydrateAskImages(raw);
    const payload = await xaiResponses(apiKey, 'grok-4.6', input, extra);
    const calls = functionCalls(payload);
    const responseId = typeof payload.id === 'string' ? payload.id : undefined;
    if (calls.length) return Response.json({ toolCalls: calls, responseId });
    const text = outputText(payload).trim();
    return Response.json({ text: text || FALLBACK, responseId });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Ask failed' }, { status: 400 });
  }
});
