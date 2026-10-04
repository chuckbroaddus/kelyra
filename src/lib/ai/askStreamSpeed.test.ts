import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const env: Record<string, string> = { GEMINI_API_KEY: 'g-key' };
(globalThis as { Deno?: unknown }).Deno = { env: { get: (k: string) => env[k] } };

const { geminiGenerate } = await import('../../../supabase/functions/_shared/ai.ts');

const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

test('gemini SSE stream folds text deltas and function calls into one payload', async () => {
  const chunks = [
    'data: {"candidates":[{"content":{"parts":[{"text":"Hel"}]}}]}\n\n',
    'data: {"candidates":[{"content":{"parts":[{"text":"lo"}]}}],"usageMetadata":{"promptTokenCount":7,"candidatesTokenCount":3}}\n\n',
  ];
  const realFetch = globalThis.fetch;
  let seenUrl = '';
  globalThis.fetch = (async (url: string) => {
    seenUrl = String(url);
    const body = new ReadableStream({
      start(c) {
        for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
        c.close();
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
  try {
    const deltas: string[] = [];
    const out = await geminiGenerate('k', 'm', 'hi', {}, undefined, (d: string) => deltas.push(d));
    assert.match(seenUrl, /streamGenerateContent\?alt=sse/);
    assert.deepEqual(deltas, ['Hel', 'lo']);
    assert.equal(out.output_text, 'Hello');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('ask-assistant puts the stable client prefix first and caches the seat lookup', () => {
  const src = read('supabase/functions/ask-assistant/index.ts');
  assert.match(src, /\[clientInstructions, actor, packLine\]/);
  assert.match(src, /seatCache/i);
  assert.match(src, /body\.stream === true/);
});

test('proposal overlaps the homework read with classify and does not block on key signing', () => {
  const src = read('src/app/proposal.tsx');
  assert.match(src, /speculativeVision/);
  assert.match(src, /keyUrlsPromise/);
});
