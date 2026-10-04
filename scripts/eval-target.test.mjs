import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDailyQuotaError,
  isQuotaError,
  latencyStats,
  resolveAiTarget,
} from './lib/eval-target.mjs';

const env = { EXPO_PUBLIC_SUPABASE_URL: 'https://proj.supabase.co/' };

test('eval target defaults to Edge functions base', () => {
  const t = resolveAiTarget(env);
  assert.equal(t.kind, 'edge');
  assert.equal(t.base, 'https://proj.supabase.co/functions/v1');
});

test('EVAL_TARGET=dev uses legacy ai:dev url', () => {
  const t = resolveAiTarget({ ...env, EVAL_TARGET: 'dev' }, { legacyUrl: 'http://127.0.0.1:9999/' });
  assert.equal(t.kind, 'dev');
  assert.equal(t.base, 'http://127.0.0.1:9999');
});

test('latencyStats p50/p90/mean/max', () => {
  assert.equal(latencyStats([]), null);
  const s = latencyStats([100, 200, 300, 400, null, 'x', 500]);
  assert.deepEqual(s, { n: 5, p50: 300, p90: 500, mean: 300, max: 500 });
});

test('daily quota vs per-minute 429', () => {
  assert.ok(isDailyQuotaError('GenerateRequestsPerDayPerProjectPerModel-FreeTier'));
  assert.ok(!isDailyQuotaError('429 rate limit, retry in 10s'));
  assert.ok(isQuotaError('RESOURCE_EXHAUSTED'));
});
