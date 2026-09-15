/**
 * BATCH-v1 I5: partial fail + retry remainder + sha256 / capture duplicate guards.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { INGEST_COPY, ingestGapCopy } from './copy.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;])\/\/.*$/gm, '$1');
}

function extractFn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const rest = sql.slice(start);
  const end = rest.indexOf('\n$$;');
  assert.ok(end > 0, `unclosed function ${name}`);
  return rest.slice(0, end + 4);
}

const batchesSql = 'supabase/migrations/20260913000000_ingest_batches.sql';
const api = 'src/lib/ingest/api.ts';
const binder = 'src/components/ingest/ClassStackBinder.tsx';
const copy = 'src/lib/ingest/copy.ts';
const workerRasterize = 'workers/ingest-rasterize/src/rasterize.ts';
const workerDb = 'workers/ingest-rasterize/src/db.ts';

test('I5-SEC retry_ingest_remainder: only partial → retry_remainder; class_teacher_of; no teaches_class', () => {
  const body = extractFn(read(batchesSql), 'retry_ingest_remainder');
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path = public/);
  assert.match(body, /class_teacher_of/);
  assert.doesNotMatch(body, /\bteaches_class\b/);
  assert.doesNotMatch(body, /\bis_school_admin\b/);
  assert.match(body, /status is distinct from 'partial'/);
  assert.match(body, /status = 'retry_remainder'/);
  assert.match(body, /teacher_id is distinct from auth\.uid\(\)/);
});

test('I5-SEC confirm_ingest_batch skips packets with capture_id (no double mint)', () => {
  const body = extractFn(read(batchesSql), 'confirm_ingest_batch');
  assert.match(body, /capture_id is null/);
  // Eligible count and mint loop both require null capture_id.
  const eligible = body.match(/capture_id is null/g) ?? [];
  assert.ok(eligible.length >= 3, `expected ≥3 capture_id is null guards, got ${eligible.length}`);
  // Status may land partial when some mint and some fail.
  assert.match(body, /when minted > 0 then 'partial'/);
  assert.doesNotMatch(body, /insert\s+into\s+public\.students/i);
  assert.doesNotMatch(body, /approved_score\s*=/);
});

test('I5-SEC register_ingest_file idempotent on (batch_id, sha256)', () => {
  const body = extractFn(read(batchesSql), 'register_ingest_file');
  assert.match(body, /sha256 = p_sha256/);
  assert.match(body, /unique \(batch_id, sha256\)|batch_id[\s\S]*sha256/);
  // Returns existing row on duplicate hash — no second insert path without check.
  assert.match(body, /select \* into f[\s\S]*sha256 = p_sha256|sha256 = p_sha256[\s\S]*return/);
});

test('I5-SEC client wires retryIngestRemainder + partial banner names the gap', () => {
  const apiSrc = read(api);
  assert.match(apiSrc, /export async function retryIngestRemainder/);
  assert.match(apiSrc, /rpc\('retry_ingest_remainder'/);

  const binderSrc = read(binder);
  assert.match(binderSrc, /retryIngestRemainder/);
  assert.match(binderSrc, /status === 'partial'/);
  assert.match(binderSrc, /INGEST_COPY\.retryRemainder|retryRemainder/);
  assert.match(binderSrc, /partialBanner|ingestGapCopy/);
  assert.match(binderSrc, /phase === 'partial'|showPartial/);

  const review = read('src/components/ingest/SplitReview.tsx');
  assert.match(review, /retryIngestRemainder/);
  assert.match(review, /batch\.status === 'partial'/);
  assert.match(review, /partialBanner/);
  // Full success still routes Inbox; partial stays recoverable.
  assert.match(review, /router\.push\('\/inbox'\)/);

  assert.equal(INGEST_COPY.retryRemainder, 'Retry remainder');
  assert.match(INGEST_COPY.rasterTimeout, /Retry the remainder/);
  assert.match(INGEST_COPY.workerDead, /Retry the remainder/);
  const banner = INGEST_COPY.partialBanner('Page processing timed out.', 20, 40);
  assert.match(banner, /20\/40/);
  assert.match(banner, /timed out|Retry|remainder/i);
  assert.equal(ingestGapCopy('worker_dead', null), INGEST_COPY.workerDead);
  assert.equal(ingestGapCopy('raster_timeout', 'custom gap'), 'custom gap');
  // corrupt_pdf: always named copy — never pdfinfo/xref/trailer even if batch row polluted.
  assert.equal(
    ingestGapCopy(
      'corrupt_pdf',
      'Command failed: pdfinfo /tmp/x.pdf\nSyntax Error: Couldn\'t find trailer dictionary\nxref',
    ),
    INGEST_COPY.corruptPdf,
  );
  assert.equal(ingestGapCopy('corrupt_pdf', null), INGEST_COPY.corruptPdf);
  assert.equal(ingestGapCopy('corrupt_pdf', 'File unreadable. Re-scan and upload again.'), INGEST_COPY.corruptPdf);
  assert.doesNotMatch(
    ingestGapCopy('corrupt_pdf', 'Command failed: pdftoppm -jpeg …'),
    /pdfinfo|pdftoppm|Command failed|xref|trailer/i,
  );
});

test('I5-SEC worker failBatch: ≥1 page → partial; 0 pages → failed; keeps pages', () => {
  const src = read(workerRasterize);
  assert.match(src, /batchFailStatus/);
  assert.match(src, /resolveFailPagesDone/);
  assert.match(src, /pagesDone/);
  assert.match(src, /markIncompletePagesFailed/);
  // Seed before download so retry claim fail cannot wipe pages_done to 0.
  const seedAt = src.indexOf('listRasterizedPages');
  const downloadAt = src.indexOf('streamDownloadToFile');
  assert.ok(seedAt > 0 && downloadAt > seedAt);

  const db = read(workerDb);
  assert.match(db, /retry_remainder/);
  assert.match(db, /status === 'rasterized'/);
  assert.match(db, /planDraftPacketsAfterMinted|not\('capture_id'/);
  // replaceDraftPackets deletes ALL capture_id null (draft+failed); never minted.
  const replaceAt = db.indexOf('export async function replaceDraftPackets');
  const replaceFn = db.slice(replaceAt, db.indexOf('export async function markIncompletePagesFailed'));
  assert.match(replaceFn, /\.is\('capture_id',\s*null\)/);
  assert.doesNotMatch(replaceFn, /\.eq\('status',\s*'draft'\)/);
  assert.match(replaceFn, /not\('capture_id'/);
});

test('I5-SEC SplitReview Retry remainder keeps binder session (no reset/close)', () => {
  const review = read('src/components/ingest/SplitReview.tsx');
  assert.match(review, /onRetryRemainder\?:/);
  const retryAt = review.indexOf('const handleRetryRemainder');
  const retryBody = review.slice(retryAt, review.indexOf('const handleAbandon', retryAt));
  assert.match(retryBody, /onRetryRemainder/);
  assert.doesNotMatch(retryBody, /onClose\(\)/);

  const binderSrc = read(binder);
  assert.match(binderSrc, /onRetryRemainder=\{/);
  const propAt = binderSrc.indexOf('onRetryRemainder={() =>');
  assert.ok(propAt > 0);
  const propBody = binderSrc.slice(propAt, binderSrc.indexOf('/>', propAt));
  assert.match(propBody, /startPolling\(batchId\)/);
  assert.doesNotMatch(propBody, /reset\(\)/);
});

test('I5-SEC simulate 20/40 partial → retry → confirm: 0 extra captures vs single path', () => {
  // Contract model (no live DB): first confirm mints N packets; retry remainder
  // then second confirm only sees capture_id IS NULL → 0 extras.
  const totalPackets = 40;
  const mintedFirst = 20; // e.g. first half already filed before remainder
  const captureIds = new Map<number, string>();
  for (let i = 0; i < mintedFirst; i += 1) {
    captureIds.set(i, `cap-${i}`);
  }
  // Second confirm eligible = packets without capture_id
  let secondMint = 0;
  for (let i = 0; i < totalPackets; i += 1) {
    if (!captureIds.has(i)) {
      captureIds.set(i, `cap-${i}`);
      secondMint += 1;
    }
  }
  assert.equal(secondMint, 20);
  assert.equal(captureIds.size, 40);
  // Dual confirm attempt on already-minted: still 40 (skip capture_id set).
  let thirdMint = 0;
  for (let i = 0; i < totalPackets; i += 1) {
    if (!captureIds.has(i)) thirdMint += 1;
  }
  assert.equal(thirdMint, 0);

  // Page upsert idempotency: 20 existing + 20 new = 40 unique indexes
  const pages = new Set(Array.from({ length: 20 }, (_, i) => i));
  for (let i = 0; i < 40; i += 1) {
    if (!pages.has(i)) pages.add(i);
  }
  assert.equal(pages.size, 40);
});

test('I5-SEC partial/retry path never analyze-homework / skill_gaps / EXPO_PUBLIC keys', () => {
  for (const rel of [api, binder, copy, workerRasterize, workerDb, 'src/lib/ingest/runUpload.ts']) {
    const src = stripComments(read(rel));
    assert.doesNotMatch(src, /analyze-homework|analyze_homework/);
    assert.doesNotMatch(src, /skill_gaps/);
    assert.doesNotMatch(src, /EXPO_PUBLIC_.*KEY|XAI_API_KEY/);
    assert.doesNotMatch(src, /insertStudent|createStudent/);
  }
});

test('I5-SEC failed with 0 useful pages stays abandon path (no Retry remainder forced)', () => {
  const binderSrc = read(binder);
  // JSX: Retry remainder only under showPartial; showFailed is Close / re-upload.
  const partialJsxAt = binderSrc.indexOf('{showPartial ?');
  const failedJsxAt = binderSrc.indexOf('{showFailed ?');
  assert.ok(partialJsxAt > 0 && failedJsxAt > partialJsxAt);
  const partialBlock = binderSrc.slice(partialJsxAt, failedJsxAt);
  const failedBlock = binderSrc.slice(failedJsxAt, binderSrc.indexOf('</FormSheet>', failedJsxAt));
  assert.match(partialBlock, /retryRemainder|onRetryRemainder/);
  assert.doesNotMatch(failedBlock, /retryRemainder|onRetryRemainder/);
});

test('I5-SEC abandon allows pre-confirm partial; binder Abandon + resume open stack', () => {
  const abandon = extractFn(read(batchesSql), 'abandon_ingest_batch');
  assert.match(abandon, /partial/);
  assert.match(abandon, /retry_remainder/);
  assert.match(abandon, /capture_id is not null/);
  assert.match(abandon, /cannot abandon after confirm/);

  const additive = read('supabase/migrations/20260913000004_ingest_abandon_partial.sql');
  assert.match(additive, /do not apply/i);
  assert.match(additive, /partial/);
  assert.match(additive, /capture_id is not null/);

  const apiSrc = read(api);
  assert.match(apiSrc, /export async function fetchOpenIngestBatchForClass/);
  assert.match(apiSrc, /'partial'/);
  assert.match(apiSrc, /abandon_ingest_batch/);

  const binderSrc = read(binder);
  assert.match(binderSrc, /fetchOpenIngestBatchForClass/);
  assert.match(binderSrc, /abandonIngestBatch/);
  assert.match(binderSrc, /onAbandonPartial|abandonPartial/);
  assert.match(binderSrc, /resumeOpenPartial|resumeAttemptedRef/);
  // Primary remains Retry; Abandon is secondary escape for open_sha.
  const partialJsxAt = binderSrc.indexOf('{showPartial ?');
  const failedJsxAt = binderSrc.indexOf('{showFailed ?');
  const partialBlock = binderSrc.slice(partialJsxAt, failedJsxAt);
  const retryAt = partialBlock.indexOf('retryRemainder');
  const abandonAt = partialBlock.indexOf('abandonPartial');
  assert.ok(retryAt >= 0 && abandonAt > retryAt, 'Retry primary before Abandon');
});
