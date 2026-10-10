import assert from 'node:assert/strict';
import test from 'node:test';

// _shared/ai.ts reads Deno.env; stub it before import.
const env: Record<string, string> = { GEMINI_API_KEY: 'g-key', XAI_API_KEY: 'x-key' };
(globalThis as { Deno?: unknown }).Deno = { env: { get: (k: string) => env[k] } };

const { callMetered, geminiContentsFromInput } = await import('../../../supabase/functions/_shared/ai.ts');
const { mediaResolutionFor, modelTimeoutMsFor } = await import('../../../supabase/functions/_shared/aiPolicy.ts');

type Call = { url: string; body: Record<string, unknown> | null; at: number };

function fakeSupabase(opts: { spent?: number; cap?: number; meterDelayMs?: number } = {}) {
  const log: string[] = [];
  return {
    log,
    rpc: async (name: string) => {
      log.push(`rpc:${name}`);
      if (name === 'ai_spend_this_month') return { data: [{ usd: opts.spent ?? 0, cap_usd: opts.cap ?? 50 }], error: null };
      if (name === 'my_role') return { data: 'teacher', error: null };
      await new Promise((r) => setTimeout(r, opts.meterDelayMs ?? 0));
      return { data: 'school-1', error: null };
    },
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => {
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'u1' }, error: null }),
            }),
          }),
        };
      }
      return { insert: async () => { log.push('insert'); return { error: null }; } };
    },
  };
}

function geminiOk(text = '{"ok":true}') {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }),
    { status: 200 },
  );
}

// AbortSignal.timeout() uses an unref'd timer, so while a fake fetch is "hung"
// nothing keeps Node's event loop alive and node:test cancels the file. Hold a
// ref'd keep-alive timer for the duration of the hung-call cases (test-only;
// ai.ts behavior is unchanged).
async function withKeepAlive<T>(fn: () => Promise<T>): Promise<T> {
  const keepAlive = setInterval(() => {}, 1_000);
  try {
    return await fn();
  } finally {
    clearInterval(keepAlive);
  }
}

function installFetch(handler: (url: string, init: RequestInit | undefined, n: number) => Promise<Response>) {
  const calls: Call[] = [];
  const t0 = Date.now();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null, at: Date.now() - t0 });
    return handler(url, init, calls.length);
  }) as typeof fetch;
  return calls;
}

test('Gemini 429 falls back to xAI once (no billing change, same job model)', async () => {
  const calls = installFetch(async (url) =>
    url.includes('generativelanguage')
      ? new Response('RESOURCE_EXHAUSTED', { status: 429 })
      : new Response(JSON.stringify({ output_text: '{"ok":true}', usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }),
  );
  const sb = fakeSupabase();
  const out = await callMetered(sb, 'g-key', { job: 'classify', functionName: 'classify-capture', payload: 'hi' });
  assert.equal(calls.length, 2);
  assert.match(calls[1]!.url, /api\.x\.ai/);
  assert.equal(out.__kelyraModel, 'grok-4.20-0309-non-reasoning');
});

test('timeout aborts a hung model call and retries once', () => withKeepAlive(async () => {
  const calls = installFetch((url, init, n) =>
    n === 1
      ? new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)))
      : Promise.resolve(geminiOk()),
  );
  const started = Date.now();
  const out = await callMetered(fakeSupabase(), 'g-key', {
    job: 'classify',
    functionName: 'classify-capture',
    payload: 'hi',
    timeoutMs: 150,
  });
  assert.equal(calls.length, 2);
  assert.ok(Date.now() - started < 2000, 'must not hang');
  assert.equal(out.output_text, '{"ok":true}');
}));

test('two hung attempts surface a clear timeout error', () => withKeepAlive(async () => {
  installFetch((_url, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))));
  await assert.rejects(
    callMetered(fakeSupabase(), 'g-key', { job: 'classify', functionName: 'x', payload: 'hi', timeoutMs: 80 }),
    /timed out/,
  );
}));

test('400 is not retried', async () => {
  const calls = installFetch(async () => new Response('bad', { status: 400 }));
  await assert.rejects(callMetered(fakeSupabase(), 'g-key', { job: 'classify', functionName: 'x', payload: 'hi' }), /Gemini failed: 400/);
  assert.equal(calls.length, 1);
});

test('over-cap school is refused', async () => {
  installFetch(async () => geminiOk());
  await assert.rejects(
    callMetered(fakeSupabase({ spent: 60, cap: 50 }), 'g-key', { job: 'classify', functionName: 'x', payload: 'hi' }),
    /over its monthly AI budget/,
  );
});

test('metering does not block the response', async () => {
  installFetch(async () => geminiOk());
  const sb = fakeSupabase({ meterDelayMs: 400 });
  const started = Date.now();
  await callMetered(sb, 'g-key', { job: 'classify', functionName: 'x', payload: 'hi' });
  assert.ok(Date.now() - started < 300, `returned in ${Date.now() - started}ms`);
});

test('schema + media resolution + max tokens reach Gemini generationConfig', async () => {
  const calls = installFetch(async () => geminiOk());
  await callMetered(fakeSupabase(), 'g-key', {
    job: 'ride_lpr',
    functionName: 'ride-lpr',
    payload: 'hi',
    schema: { type: 'object', properties: { plate: { type: 'string' } } },
    extra: { max_output_tokens: 300 },
  });
  const cfg = calls[0]!.body!.generationConfig as Record<string, unknown>;
  assert.equal(cfg.responseMimeType, 'application/json');
  assert.deepEqual(cfg.responseJsonSchema, { type: 'object', properties: { plate: { type: 'string' } } });
  assert.equal(cfg.mediaResolution, 'MEDIA_RESOLUTION_HIGH');
  assert.equal(cfg.maxOutputTokens, 300);
});

test('media resolution policy: low classify, high plates/ingest/high-detail', () => {
  assert.equal(mediaResolutionFor('classify'), 'low');
  assert.equal(mediaResolutionFor('ride_lpr'), 'high');
  assert.equal(mediaResolutionFor('ingest'), 'high');
  assert.equal(
    mediaResolutionFor('classify', 'cheap', [{ role: 'user', content: [{ type: 'input_image', image_url: 'x', detail: 'high' }] }]),
    'high',
  );
  assert.ok(modelTimeoutMsFor('classify') <= 20_000);
});

test('Gemini image parts download in parallel and keep page order', async () => {
  const base = 'https://aohibokgilxhqwmupdfv.supabase.co/storage/v1/object/sign/photos/';
  let inFlight = 0;
  let maxInFlight = 0;
  installFetch(async (url) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 30));
    inFlight -= 1;
    return new Response(new TextEncoder().encode(url.slice(-1)), { status: 200, headers: { 'content-type': 'image/png' } });
  });
  const contents = await geminiContentsFromInput([
    {
      role: 'user',
      content: ['1', '2', '3'].map((n) => ({ type: 'input_image', image_url: `${base}p${n}.png?token=t${n}` })),
    },
  ]);
  assert.ok(maxInFlight >= 3, `expected parallel downloads, max in flight ${maxInFlight}`);
  const parts = (contents[0] as { parts: Array<{ inlineData: { data: string } }> }).parts;
  assert.deepEqual(parts.map((p) => atob(p.inlineData.data)), ['1', '2', '3']);
});
