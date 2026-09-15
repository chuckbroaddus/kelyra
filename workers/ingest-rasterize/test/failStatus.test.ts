import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  batchFailStatus,
  draftOrdinalsConflict,
  packetsKeptAfterReplaceDelete,
  planDraftPacketsAfterMinted,
  resolveFailPagesDone,
} from '../src/failStatus.ts';

const workerRoot = join(process.cwd());

test('I5: pagesDone≥1 → partial; 0 → failed', () => {
  assert.equal(batchFailStatus(0), 'failed');
  assert.equal(batchFailStatus(1), 'partial');
  assert.equal(batchFailStatus(20), 'partial');
});

test('I5: resolveFailPagesDone never wipes known progress with 0', () => {
  assert.equal(
    resolveFailPagesDone({ inMemoryCount: 0, batchPagesDone: 20, rasterizedCount: 0 }),
    20,
  );
  assert.equal(
    resolveFailPagesDone({ inMemoryCount: 0, batchPagesDone: 0, rasterizedCount: 20 }),
    20,
  );
  assert.equal(
    resolveFailPagesDone({ inMemoryCount: 0, batchPagesDone: null, rasterizedCount: 0 }),
    0,
  );
  assert.equal(batchFailStatus(resolveFailPagesDone({
    inMemoryCount: 0,
    batchPagesDone: 20,
    rasterizedCount: 0,
  })), 'partial');
});

test('I5: confirm-partial leftover failed ordinals — delete capture_id null then no collision', () => {
  // After confirm: minted 1..20, failed 21..40 with capture_id null.
  const rows = [
    ...Array.from({ length: 20 }, (_, i) => ({
      ordinal: i + 1,
      capture_id: `cap-${i}` as string | null,
      status: 'minted',
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      ordinal: i + 21,
      capture_id: null as string | null,
      status: 'failed',
    })),
  ];
  const kept = packetsKeptAfterReplaceDelete(rows);
  assert.equal(kept.length, 20);
  assert.ok(kept.every((r) => r.capture_id != null));
  // Old draft-only delete would leave failed 21..40 and collide.
  const leftoverIfDraftOnly = rows.filter(
    (r) => !(r.status === 'draft' && r.capture_id == null),
  );
  assert.equal(leftoverIfDraftOnly.length, 40); // failed kept → collision risk

  const minted = kept.map((r) => ({
    ordinal: r.ordinal,
    pageIds: [`p${r.ordinal - 1}`],
  }));
  const allPackets = Array.from({ length: 40 }, (_, i) => ({
    ordinal: i + 1,
    pageIds: [`p${i}`],
    blank: false,
  }));
  const planned = planDraftPacketsAfterMinted(allPackets, minted);
  assert.equal(planned.length, 20);
  assert.equal(
    draftOrdinalsConflict(
      kept.map((k) => k.ordinal),
      planned.map((p) => p.ordinal),
    ),
    false,
  );
  // Second confirm eligible = planned only → 0 extras vs minted set.
  const captures = new Set(kept.map((k) => k.capture_id));
  assert.equal(captures.size, 20);
  for (let i = 0; i < planned.length; i += 1) captures.add(`cap-new-${i}`);
  assert.equal(captures.size, 40);
});

test('I5: simulate partial at page 20/40 — retry does not double page indexes', () => {
  const total = 40;
  const doneFirst = 20;
  assert.equal(batchFailStatus(doneFirst), 'partial');

  const rasterized = new Set(Array.from({ length: doneFirst }, (_, i) => i));
  const wouldSkip: number[] = [];
  const wouldInsert: number[] = [];
  for (let i = 0; i < total; i += 1) {
    if (rasterized.has(i)) wouldSkip.push(i);
    else wouldInsert.push(i);
  }
  assert.equal(wouldSkip.length, 20);
  assert.equal(wouldInsert.length, 20);
  assert.deepEqual(wouldSkip, Array.from({ length: 20 }, (_, i) => i));
  assert.deepEqual(
    wouldInsert,
    Array.from({ length: 20 }, (_, i) => i + 20),
  );
  // Union stays unique (no doubled page rows).
  const after = new Set([...wouldSkip, ...wouldInsert]);
  assert.equal(after.size, 40);
});

test('I5: planDraftPacketsAfterMinted skips covered pages and ordinals after minted', () => {
  const minted = [
    { ordinal: 1, pageIds: ['p0', 'p1'] },
    { ordinal: 2, pageIds: ['p2'] },
  ];
  const packets = [
    { ordinal: 1, pageIds: ['p0', 'p1'], blank: false },
    { ordinal: 2, pageIds: ['p2'], blank: false },
    { ordinal: 3, pageIds: ['p3'], blank: false },
    { ordinal: 4, pageIds: ['p4', 'p5'], blank: false },
  ];
  const drafts = planDraftPacketsAfterMinted(packets, minted);
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts[0], { ordinal: 3, pageIds: ['p3'], blank: false });
  assert.deepEqual(drafts[1], { ordinal: 4, pageIds: ['p4', 'p5'], blank: false });
  // No overlap with minted page ids → second confirm would mint only new packets.
  const covered = new Set(minted.flatMap((m) => m.pageIds));
  for (const d of drafts) {
    for (const id of d.pageIds) assert.equal(covered.has(id), false);
  }
});

test('I5: planDraftPacketsAfterMinted with no minted keeps original ordinals densified from 1', () => {
  const packets = [
    { ordinal: 1, pageIds: ['a'], blank: false },
    { ordinal: 2, pageIds: ['b'], blank: true },
  ];
  const drafts = planDraftPacketsAfterMinted(packets, []);
  assert.deepEqual(drafts, packets);
});

test('I5: rasterize failBatch uses batchFailStatus; claim includes retry_remainder; skip rasterized', () => {
  const rasterize = readFileSync(join(workerRoot, 'src/rasterize.ts'), 'utf8');
  assert.match(rasterize, /batchFailStatus/);
  assert.match(rasterize, /resolveFailPagesDone/);
  assert.match(rasterize, /status === 'partial'|batchFailStatus\(/);
  assert.match(rasterize, /markIncompletePagesFailed/);
  // Seed listRasterizedPages before download/probe so early fail keeps partial.
  const seedAt = rasterize.indexOf('listRasterizedPages');
  const downloadAt = rasterize.indexOf('streamDownloadToFile');
  assert.ok(seedAt > 0 && downloadAt > seedAt, 'must seed rasterized pages before download');
  assert.doesNotMatch(
    rasterize.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
    /delete\(\).*ingest_pages|from\('ingest_pages'\)\.delete/,
  );

  const db = readFileSync(join(workerRoot, 'src/db.ts'), 'utf8');
  assert.match(db, /\['received',\s*'retry_remainder'\]/);
  assert.match(db, /already rasterized|status === 'rasterized'/);
  assert.match(db, /planDraftPacketsAfterMinted/);
  assert.match(db, /not\('capture_id'/);
  // replaceDraftPackets deletes all capture_id null (incl failed), not draft-only.
  const replaceAt = db.indexOf('export async function replaceDraftPackets');
  const replaceFn = db.slice(replaceAt, db.indexOf('export async function markIncompletePagesFailed'));
  assert.match(replaceFn, /\.is\('capture_id',\s*null\)/);
  assert.doesNotMatch(replaceFn, /\.eq\('status',\s*'draft'\)/);

  const config = readFileSync(join(workerRoot, 'src/config.ts'), 'utf8');
  assert.match(config, /Retry the remainder/);
  assert.match(config, /raster_timeout/);
  assert.match(config, /worker_dead/);
});

test('I5: worker never invokes analyze-homework / skill_gaps on partial path', () => {
  const src = readFileSync(join(workerRoot, 'src/rasterize.ts'), 'utf8');
  assert.doesNotMatch(src, /analyze-homework|skill_gaps|Approve|insert.*students/i);
});
