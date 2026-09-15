import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;])\/\/.*$/gm, '$1');
}

const api = 'src/lib/ingest/api.ts';
const ui = 'src/components/ingest/SplitReview.tsx';
const binder = 'src/components/ingest/ClassStackBinder.tsx';
const packets = 'src/lib/ingest/splitPackets.ts';

test('I3-SEC Confirm path uses confirm_ingest_batch RPC; save uses save_ingest_split', () => {
  const src = read(api);
  assert.match(src, /rpc\('confirm_ingest_batch'/);
  assert.match(src, /rpc\('save_ingest_split'/);
  assert.match(src, /export async function confirmIngestBatch/);
  assert.match(src, /export async function saveIngestSplit/);
  assert.match(src, /export async function fetchIngestSplitReview/);
  assert.match(src, /pages_done/);
});

test('I3-SEC saveIngestSplit: temp insert → park → RPC → delete-after; restore on RPC fail', () => {
  const src = read(api);
  assert.match(src, /planSaveIngestSplit/);
  assert.match(src, /tempOrdinal/);
  assert.match(src, /toDeleteAfter/);
  assert.match(src, /priorOrdinals/);
  // Delete of removed drafts must be gated on RPC success (after rpc call in source order).
  const rpcAt = src.indexOf("rpc('save_ingest_split'");
  const deleteAfterAt = src.indexOf('toDeleteAfter', rpcAt);
  assert.ok(rpcAt > 0, 'missing save_ingest_split rpc');
  assert.ok(deleteAfterAt > rpcAt, 'toDeleteAfter delete must follow RPC');
  // On failure, roll back this-attempt inserts (Merge/Split must not orphan).
  assert.match(src, /plan\.toInsert\.map/);
  assert.match(src, /priorOrdinals/);

  const sql = read('supabase/migrations/20260913000000_ingest_batches.sql');
  const start = sql.indexOf('create or replace function public.save_ingest_split');
  const body = sql.slice(start, sql.indexOf('\n$$;', start) + 4);
  assert.match(body, /ordinal \+ 1000000/);
  assert.match(body, /insert into public\.ingest_packets/);
  assert.match(body, /delete from public\.ingest_packets/);
  assert.match(body, /keep_ids/);
});

test('I3-SEC saveIngestSplit never rolls back after RPC success; saves are serialized', () => {
  const src = read(api);
  assert.match(src, /rpcSucceeded/);
  assert.match(src, /shouldRollbackSplitPersist\(rpcSucceeded\)/);
  assert.match(src, /enqueueExclusive/);
  assert.match(src, /version: number \| \(\(\) => number\)/);
  // Post-RPC delete is best-effort (no throw that undoes commit).
  const unlockedStart = src.indexOf('async function saveIngestSplitUnlocked');
  const unlocked = src.slice(unlockedStart);
  assert.match(unlocked, /Best-effort|best-effort|Never throw/);
  assert.match(unlocked, /rpcSucceeded = true/);
  const rollbackBlock = unlocked.slice(unlocked.indexOf('shouldRollbackSplitPersist'));
  assert.match(rollbackBlock, /shouldRollbackSplitPersist\(rpcSucceeded\)/);

  const review = read(ui);
  assert.match(review, /enqueuePersist/);
  assert.match(review, /saveChainRef/);
  assert.match(review, /pendingSaveRef/);
  assert.match(review, /\(\) => versionRef\.current/);
  assert.match(review, /nextPersistChainOk/);
  assert.match(review, /priorOk/);
  // Confirm always awaits authoritative enqueuePersist before confirmIngestBatch.
  const confirmAt = review.indexOf('const handleConfirm');
  const confirmBody = review.slice(confirmAt, review.indexOf('const handleAbandon', confirmAt));
  assert.match(confirmBody, /enqueuePersist\(packetsRef\.current\)/);
  assert.match(confirmBody, /if \(!saved\) return/);
  const savedAwait = confirmBody.indexOf('enqueuePersist(packetsRef.current)');
  const confirmRpc = confirmBody.indexOf('confirmIngestBatch');
  assert.ok(savedAwait >= 0 && confirmRpc > savedAwait, 'Confirm must await save before mint RPC');
});

test('I3-SEC Confirm disabled at 0 packets wired in UI + helper', () => {
  const helper = read(packets);
  assert.match(helper, /eligiblePacketCount/);
  assert.match(helper, /canConfirmSplit/);

  const review = read(ui);
  assert.match(review, /canConfirmSplit/);
  assert.match(review, /confirmIngestBatch/);
  assert.match(review, /disabled=\{!confirmEnabled\}/);
  assert.match(review, /splitEmptyConfirm|Add at least one non-blank/);
});

test('I3-SEC no student_id assignment / no Approve / no matcher in Split Review UI', () => {
  const review = stripComments(read(ui));
  assert.doesNotMatch(review, /student_id\s*=/);
  assert.doesNotMatch(review, /attachCapture|matchName|guessed_student/);
  assert.doesNotMatch(review, /approveCapture|Approve this|approved_score/);
  assert.doesNotMatch(review, /insertStudent|createStudent/);
  // Roster check-off only — no per-packet name UI
  assert.doesNotMatch(review, /Assign name|student name/i);
  assert.match(review, /rosterCheckOff|checkOff/);
});

test('I3-SEC keyboard S/M/B wired; never FileReader whole PDF to model', () => {
  const review = stripComments(read(ui));
  assert.match(review, /key === 's'/);
  assert.match(review, /key === 'm'/);
  assert.match(review, /key === 'b'/);
  assert.match(review, /doSplit|splitAtFocus/);
  assert.match(review, /doMerge|mergeWithPrevious/);
  assert.match(review, /doBlank|togglePacketBlank/);

  for (const rel of [api, ui, binder, packets, 'src/lib/ingest/runUpload.ts']) {
    const src = stripComments(read(rel));
    assert.doesNotMatch(src, /\bFileReader\b/);
    assert.doesNotMatch(src, /readAsDataURL/);
    assert.doesNotMatch(src, /analyze-homework|grok-4|XAI_API_KEY|EXPO_PUBLIC_.*KEY/);
  }

  // Thumbs from page assets only — never files-bucket PDF URL to model
  assert.match(read(api), /signedThumbUrls/);
  assert.match(read(api), /Never sign the class PDF|never original PDF|Thumbs only/i);
});

test('I3-SEC binder always polls to split_review; phone gate not primary filmstrip', () => {
  const src = read(binder);
  assert.match(src, /fetchIngestBatch/);
  assert.match(src, /split_review/);
  assert.match(src, /SplitReview/);
  assert.match(src, /pages_done/);
  assert.match(src, /phoneGate/);
  assert.match(src, /INGEST_COPY\.phoneGate|splitPhoneWaiting/);
});

test('I3-SEC abandon pre-confirm reuses abandon_ingest_batch; Confirm routes Inbox', () => {
  const review = read(ui);
  assert.match(review, /abandonIngestBatch/);
  assert.match(review, /router\.push\('\/inbox'\)/);
  assert.match(review, /confirmIngestBatch\(batchId/);
});
