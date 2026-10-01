import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { cors, withCors } from '../../../supabase/functions/_shared/cors.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

test('withCors: OPTIONS preflight → 204 with Access-Control-Allow-Origin, handler not called', async () => {
  let called = false;
  const handler = withCors(async () => {
    called = true;
    return Response.json({});
  });
  const res = await handler(new Request('https://x.test/functions/v1/classify-capture', { method: 'OPTIONS' }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(res.headers.get('Access-Control-Allow-Headers') ?? '', /authorization/);
  assert.match(res.headers.get('Access-Control-Allow-Headers') ?? '', /apikey/);
  assert.equal(called, false);
});

test('withCors: JSON success, 400 error and 401 replies all carry CORS', async () => {
  for (const [body, status] of [[{ intent: 'vehicle' }, 200], [{ error: 'Classify failed' }, 400], [{ error: 'Sign in to Kelyra first.' }, 401]] as const) {
    const res = await withCors(async () => Response.json(body, { status }))(
      new Request('https://x.test/functions/v1/classify-capture', { method: 'POST', body: '{}' }),
    );
    assert.equal(res.status, status);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), cors()['Access-Control-Allow-Origin']);
    assert.deepEqual(await res.json(), body);
  }
});

test('classify-capture and ride-lpr serve through the shared withCors (no bare OPTIONS 204)', () => {
  for (const fn of ['classify-capture', 'ride-lpr']) {
    const src = read(`supabase/functions/${fn}/index.ts`);
    assert.match(src, /from '\.\.\/_shared\/cors\.ts'/, fn);
    assert.match(src, /Deno\.serve\(withCors\(/, fn);
    assert.doesNotMatch(src, /new Response\(null, \{ status: 204 \}\)/, fn);
  }
});
