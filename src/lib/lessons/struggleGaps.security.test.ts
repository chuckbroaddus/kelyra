import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migration = 'supabase/migrations/20260827000006_lesson_struggle_skill_gaps.sql';

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('lesson struggle migration: ai_jobs submission_id nullable capture', () => {
  const sql = read(migration);
  assert.match(sql, /alter column capture_id drop not null/);
  assert.match(sql, /add column if not exists submission_id/);
  assert.match(sql, /ai_jobs_source_row/);
  assert.match(sql, /submission_review/);
});

test('lesson struggle migration: student_report_lesson upserts model drafts only', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.student_report_lesson/);
  assert.match(sql, /lesson_struggle_gap_labels/);
  assert.match(sql, /source = 'model'/);
  assert.match(sql, /status = 'draft'/);
  assert.match(sql, /submission_id = sub_id/);
  assert.match(sql, /Never writes graded/);
  assert.doesNotMatch(sql, /current_focus_skill_id/);
  assert.doesNotMatch(sql, /is_staff/);
  assert.match(sql, /my_student_id\(\)/);
  assert.match(sql, /security definer/);
});

test('Edge review-submission writes draft skill_gaps and skips queued clean lessons', () => {
  const edge = read('supabase/functions/review-submission/index.ts');
  assert.match(edge, /replaceModelDraftGaps/);
  assert.match(edge, /source:\s*'model'/);
  assert.match(edge, /status:\s*'draft'/);
  assert.match(edge, /submission_id/);
  assert.match(edge, /queued/);
  assert.match(edge, /no_struggle/);
  assert.doesNotMatch(edge, /SERVICE_ROLE|service_role/);
});

test('queued review seeds prior from stem drafts and never wipe-to-empty', () => {
  const edge = read('supabase/functions/review-submission/index.ts');
  assert.match(edge, /loadModelDraftGaps/);
  assert.match(edge, /stemGaps/);
  assert.match(edge, /seededPrior/);
  // replace only when model returned labels — empty live returns before delete
  const replaceAt = edge.indexOf('async function replaceModelDraftGaps');
  assert.ok(replaceAt > 0);
  const replace = edge.slice(replaceAt, replaceAt + 900);
  const liveGuard = replace.indexOf('if (!live.length) return;');
  const deleteAt = replace.indexOf(".delete()");
  assert.ok(liveGuard > 0 && deleteAt > liveGuard, 'empty gaps must return before delete');

  const dev = read('scripts/ai-dev-server.mjs');
  assert.match(dev, /loadModelDraftGaps/);
  const devReplaceAt = dev.indexOf('async function replaceSubmissionModelGaps');
  assert.ok(devReplaceAt > 0);
  const devReplace = dev.slice(devReplaceAt, devReplaceAt + 900);
  const devLiveGuard = devReplace.indexOf('if (!live.length) return;');
  const devDeleteAt = devReplace.indexOf('.delete()');
  assert.ok(devLiveGuard > 0 && devDeleteAt > devLiveGuard, 'ai-dev empty gaps must return before delete');
});

test('Edge + client prompts include lesson struggle line', () => {
  const shared = read('supabase/functions/_shared/ai.ts');
  const client = read('src/lib/practice/review.ts');
  const line =
    /For lessons, skipped items, extra tries, answers that were wrong first then corrected, and hints/;
  assert.match(shared, line);
  assert.match(client, line);
});

test('process-ai-jobs drains submission_review with teacher JWT', () => {
  const jobs = read('supabase/functions/process-ai-jobs/index.ts');
  assert.match(jobs, /submission_review/);
  assert.match(jobs, /review-submission/);
  assert.match(jobs, /queued:\s*true/);
  assert.match(jobs, /auth\.getUser\(\)/);
  assert.doesNotMatch(jobs, /SERVICE_ROLE|service_role/);
});

test('Review persist/Approve sync skill_gaps including empty clear', () => {
  const api = read('src/lib/practice/reviewApi.ts');
  assert.match(api, /replaceSubmissionModelDraftGaps/);
  assert.match(api, /storeTurnedInDraft/);

  const storeAt = api.indexOf('export async function storeTurnedInDraft');
  const approveAt = api.indexOf('export async function approveTurnedInReview');
  assert.ok(storeAt > 0 && approveAt > storeAt);
  const store = api.slice(storeAt, approveAt);
  assert.match(store, /replaceSubmissionModelDraftGaps/);

  const replaceAt = api.indexOf('async function replaceSubmissionModelDraftGaps');
  assert.ok(replaceAt > 0);
  const replace = api.slice(replaceAt, replaceAt + 1100);
  const deleteAt = replace.indexOf(".delete()");
  const emptyReturn = replace.indexOf('if (!live.length) return;');
  assert.ok(deleteAt > 0 && emptyReturn > deleteAt, 'empty draft must delete model gaps then return');

  const approve = api.slice(approveAt, replaceAt > approveAt ? replaceAt : approveAt + 2500);
  const alwaysDelete = approve.indexOf(".delete().eq('submission_id'");
  const liveIf = approve.indexOf('if (liveGaps.length)');
  assert.ok(alwaysDelete > 0, 'Approve must delete submission skill_gaps');
  assert.ok(liveIf > alwaysDelete, 'Approve must delete before optional insert');
});
