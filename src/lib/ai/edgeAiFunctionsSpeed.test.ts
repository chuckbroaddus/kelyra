import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CLASSIFY_CAPTURE_SCHEMA, RIDE_LPR_SCHEMA } from '../../../supabase/functions/_shared/aiSchemas.ts';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

test('ingest-grading-doc: first pass is one model call (no separate transcribe call)', () => {
  const src = read('supabase/functions/ingest-grading-doc/index.ts');
  assert.doesNotMatch(src, /buildHandwritingTranscribePrompt/);
  assert.match(src, /job: 'ingest'/);
  const serve = src.slice(src.indexOf('const apiKey = requireXaiKey();'));
  const firstRetry = serve.indexOf("kind === 'school_policy' && !schoolProposalHasCore");
  const callsBeforeRetry = serve.slice(0, firstRetry).match(/callModel\(/g) ?? [];
  assert.equal(callsBeforeRetry.length, 1);
  // ingest_jobs insert overlaps the model call.
  assert.match(src, /jobIdPromise/);
});

test('ride-lpr: typed job, structured output, real error status', () => {
  const src = read('supabase/functions/ride-lpr/index.ts');
  assert.match(src, /job: 'ride_lpr'/);
  assert.match(src, /schema: RIDE_LPR_SCHEMA/);
  assert.match(src, /CLOSEST_VEHICLE_RULES/);
  assert.doesNotMatch(src.slice(src.indexOf('} catch (err) {')), /status: 200/);
  const api = read('src/lib/ride/api.ts');
  assert.match(api, /rideLprErrorMessage/);
});

test('setup-interview: model failure is a 502, app falls back locally', () => {
  const src = read('supabase/functions/setup-interview/index.ts');
  assert.match(src, /mode: 'model_error'[\s\S]*status: 502/);
  assert.match(src, /job: 'interview'/);
  const screen = read('src/components/interview/InterviewScreen.tsx');
  assert.match(screen, /local heuristic fallback/);
});

test('process-ai-jobs runs a bounded worker pool', () => {
  const src = read('supabase/functions/process-ai-jobs/index.ts');
  assert.match(src, /const JOB_CONCURRENCY = [2-6];/);
  assert.match(src, /await Promise\.all\(workers\)/);
});

test('schemas are permissive JSON Schema objects', () => {
  for (const schema of [CLASSIFY_CAPTURE_SCHEMA, RIDE_LPR_SCHEMA]) {
    assert.equal(schema.type, 'object');
    assert.ok(Object.keys(schema.properties).length >= 8);
    assert.ok(schema.required.length <= 4);
  }
  assert.ok(CLASSIFY_CAPTURE_SCHEMA.properties.intent.enum.includes('unsure'));
});
