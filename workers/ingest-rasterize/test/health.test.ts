import assert from 'node:assert/strict';
import test from 'node:test';
import { healthz } from '../src/health.ts';

test('I2-healthz', () => {
  const h = healthz();
  assert.equal(h.status, 'ok');
  assert.equal(h.service, 'ingest-rasterize');
});
