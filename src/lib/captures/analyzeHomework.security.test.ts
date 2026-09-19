import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { MAX_HOMEWORK_PAGE_IMAGES } from './pages.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;])\/\/.*$/gm, '$1');
}

const edge = 'supabase/functions/analyze-homework/index.ts';
const shared = 'supabase/functions/_shared/homeworkPages.ts';
const pages = 'src/lib/captures/pages.ts';
const gapsApi = 'src/lib/gaps/api.ts';
const capturesApi = 'src/lib/captures/api.ts';
const inbox = 'src/app/inbox.tsx';
const confirmSql = 'supabase/migrations/20260913000000_ingest_batches.sql';
const aiDev = 'scripts/ai-dev-server.mjs';

test('I4-SEC analyze-homework: student_id required; no model/skill_gaps without student', () => {
  const src = stripComments(read(edge));
  assert.match(src, /!capture\?\.student_id\s*\|\|\s*!capture\.photo_asset_id/);
  assert.match(src, /Capture must have a student and a photo/);
  // Gate precedes skill_gaps insert and the model call (skip import line).
  const gateAt = src.indexOf('!capture?.student_id');
  const gapsAt = src.indexOf("from('skill_gaps')");
  const meterAt = src.indexOf('await callMetered', gateAt);
  assert.ok(gateAt > 0 && gapsAt > gateAt, 'student gate before skill_gaps');
  assert.ok(meterAt > gateAt, 'student gate before callMetered');
});

test('I4-SEC analyze-homework: ≤4 page JPEGs from photos bucket; never PDF to model', () => {
  const edgeSrc = stripComments(read(edge));
  const sharedSrc = stripComments(read(shared));
  const clientPages = stripComments(read(pages));

  assert.match(sharedSrc, /MAX_HOMEWORK_PAGE_IMAGES\s*=\s*4/);
  assert.match(clientPages, /MAX_HOMEWORK_PAGE_IMAGES\s*=\s*4/);
  assert.equal(MAX_HOMEWORK_PAGE_IMAGES, 4);

  assert.match(edgeSrc, /homeworkPageAssetIdsForModel/);
  assert.match(edgeSrc, /MAX_HOMEWORK_PAGE_IMAGES/);
  assert.match(edgeSrc, /\.from\('photos'\)/);
  assert.match(edgeSrc, /createSignedUrl/);
  assert.match(edgeSrc, /isHomeworkPageImageMime/);

  assert.doesNotMatch(edgeSrc, /application\/pdf/);
  assert.doesNotMatch(edgeSrc, /\.from\('files'\)/);
  assert.doesNotMatch(edgeSrc, /FileReader|readAsDataURL|arrayBuffer\(\)|ingest_files/);
  assert.match(sharedSrc, /application\/pdf|includes\('pdf'\)/);
  assert.match(sharedSrc, /isHomeworkPageImageMime/);
});

test('I4-SEC analyze-homework: pageAssetIds preserved on queue + draft write; paid metered path', () => {
  const src = stripComments(read(edge));
  assert.match(src, /requireXaiKey/);
  assert.match(src, /callMetered/);
  assert.doesNotMatch(src, /EXPO_PUBLIC_/);

  assert.match(src, /pageAssetIds/);
  assert.match(src, /mergePreservedPageAssetIds|priorIds/);
  // Queue must not wipe to bare { pending: true } without preserving ids when present.
  assert.match(src, /pending:\s*true/);
  assert.match(src, /pageAssetIds:\s*priorIds|pageAssetIds: priorIds/);
});

test('I4-SEC confirm_ingest_batch never skill_gaps / analyze; mint keeps student null', () => {
  const sql = read(confirmSql);
  const start = sql.indexOf('create or replace function public.confirm_ingest_batch');
  assert.ok(start > 0);
  const body = sql.slice(start, sql.indexOf('\n$$;', start) + 4);
  assert.doesNotMatch(body, /insert\s+into\s+public\.skill_gaps/i);
  assert.doesNotMatch(body, /analyze-homework|analyze_homework/i);
  assert.match(body, /student_id[\s\S]{0,40}null/);
  assert.match(body, /pageAssetIds/);
});

test('I4-SEC listInbox/countInbox status-based — no input_source=batch exclusion', () => {
  const src = stripComments(read(capturesApi));
  const listAt = src.indexOf('export async function listInbox');
  const listBody = src.slice(listAt, src.indexOf('export async function', listAt + 10));
  assert.match(listBody, /\.in\('status',\s*needsCaptureFilter\(\)\)/);
  assert.doesNotMatch(listBody, /input_source/);
  assert.doesNotMatch(listBody, /neq\('input_source'|eq\('input_source',\s*'camera'/);

  const countAt = src.indexOf('export async function countInbox');
  const countBody = src.slice(countAt, src.indexOf('export async function', countAt + 10));
  assert.match(countBody, /\.in\('status',\s*needsCaptureFilter\(\)\)/);
  assert.doesNotMatch(countBody, /input_source/);

  assert.match(src, /NEEDS_CAPTURE_STATUSES = \['unassigned', 'attached', 'draft'\]/);
  assert.match(src, /allPhotoAssetIds/);
  assert.match(src, /hydrateCaptures/);
});

test('I4-SEC attachCapture triggers analyze only after student attached; draftHasWork ignores pageAssetIds', () => {
  const api = stripComments(read(capturesApi));
  const attachAt = api.indexOf('export async function attachCapture');
  const attachBody = api.slice(attachAt, api.indexOf('export async function', attachAt + 10));
  assert.match(attachBody, /student_id:\s*studentId/);
  assert.match(attachBody, /status:\s*'attached'/);
  assert.match(attachBody, /analyzeOrReuseDraft/);

  const draftWorkRaw = read('src/lib/gaps/draftWork.ts');
  const draftWork = stripComments(draftWorkRaw);
  assert.match(draftWork, /export function draftHasWork/);
  assert.match(draftWork, /gaps\?\.length/);
  // pageAssetIds may appear on the type, but must not drive the boolean (batch mint).
  const fnAt = draftWork.indexOf('export function draftHasWork');
  const fnBody = draftWork.slice(fnAt);
  assert.doesNotMatch(fnBody, /draft\.pageAssetIds/);
  assert.match(draftWorkRaw, /pageAssetIds alone are not work/);

  const gaps = stripComments(read(gapsApi));
  assert.match(gaps, /mergePreservedPageAssetIds/);
  assert.match(gaps, /analyzeAttachedCapture/);
  assert.match(gaps, /analyze-homework/);
  assert.match(gaps, /draftHasWork/);
});

test('I4-SEC Inbox: teach-seat INGEST_COPY only; mediaLabel multi-page + stack text; no parent ingest', () => {
  const src = stripComments(read(inbox));
  assert.match(src, /listInbox/);
  assert.match(src, /attachCapture/);
  assert.match(src, /mediaLabel/);
  assert.match(src, /pageCount/);
  assert.match(src, /input_source === 'batch'|stack/);
  assert.match(src, /teachSeat/);
  assert.match(src, /INGEST_COPY\.entryNeeds/);
  assert.doesNotMatch(src, /role === 'parent'|role === 'student'/);
});

test('I4-SEC client+edge MAX_HOMEWORK_PAGE_IMAGES stay in sync', () => {
  const client = read(pages);
  const edgeShared = read(shared);
  const clientMatch = client.match(/MAX_HOMEWORK_PAGE_IMAGES\s*=\s*(\d+)/);
  const edgeMatch = edgeShared.match(/MAX_HOMEWORK_PAGE_IMAGES\s*=\s*(\d+)/);
  assert.ok(clientMatch && edgeMatch);
  assert.equal(Number(clientMatch[1]), Number(edgeMatch[1]));
  assert.equal(Number(clientMatch[1]), 4);
});

test('I4-SEC ai-dev analyzeHomework lockstep with Edge: multi-page ≤4, preserve pageAssetIds, no PDF', () => {
  const src = stripComments(read(aiDev));
  const fnAt = src.indexOf('async function analyzeHomework');
  assert.ok(fnAt > 0, 'analyzeHomework missing');
  const fnBody = src.slice(fnAt, src.indexOf('\nasync function ', fnAt + 10));

  assert.match(src, /homeworkPages\.ts/);
  assert.match(fnBody, /!capture\?\.student_id\s*\|\|\s*!capture\.photo_asset_id/);
  assert.match(fnBody, /homeworkPageAssetIdsForModel/);
  assert.match(fnBody, /MAX_HOMEWORK_PAGE_IMAGES/);
  assert.match(fnBody, /isHomeworkPageImageMime/);
  assert.match(fnBody, /\.from\('photos'\)/);
  assert.match(fnBody, /pageAssetIdsFromDraft/);
  assert.match(fnBody, /mergePreservedPageAssetIds/);
  assert.match(fnBody, /pageAssetIds:\s*priorIds|pageAssetIds: priorIds/);
  assert.match(fnBody, /pending:\s*true/);
  // Must not wipe queue draft to bare { pending: true } without pageAssetIds merge path.
  assert.doesNotMatch(fnBody, /model_draft:\s*\{\s*pending:\s*true\s*\}/);
  assert.doesNotMatch(fnBody, /\.eq\('id',\s*capture\.photo_asset_id\)/);
  assert.doesNotMatch(fnBody, /\.from\('files'\)/);
  assert.doesNotMatch(fnBody, /FileReader|readAsDataURL|ingest_files/);

  assert.match(src, /async function draftFromPhotos/);
  const draftAt = src.indexOf('async function draftFromPhotos');
  const draftBody = src.slice(draftAt, src.indexOf('\nasync function ', draftAt + 10));
  assert.match(draftBody, /MAX_HOMEWORK_PAGE_IMAGES/);
  assert.match(draftBody, /input_image/);

  // processAiJobs still drains via analyzeHomework (no separate single-page fork).
  assert.match(src, /analyzeHomework\(supabase,\s*\{\s*captureId:\s*job\.capture_id/);
});
