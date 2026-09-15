import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allPhotoAssetIds,
  homeworkPageAssetIdsForModel,
  MAX_HOMEWORK_PAGE_IMAGES,
  mergePreservedPageAssetIds,
  pageAssetIdsFromDraft,
} from './pages.ts';

test('allPhotoAssetIds: photo first, then pageAssetIds, deduped (batch mint shape)', () => {
  const first = 'asset-first';
  const rest = ['asset-2', 'asset-3', first, 'asset-2'];
  const ids = allPhotoAssetIds({
    photo_asset_id: first,
    model_draft: { pageAssetIds: rest },
  });
  assert.deepEqual(ids, ['asset-first', 'asset-2', 'asset-3']);
});

test('allPhotoAssetIds: extras only when photo_asset_id null', () => {
  assert.deepEqual(
    allPhotoAssetIds({ photo_asset_id: null, model_draft: { pageAssetIds: ['a', 'b'] } }),
    ['a', 'b'],
  );
  assert.deepEqual(allPhotoAssetIds({ photo_asset_id: 'only', model_draft: null }), ['only']);
  assert.deepEqual(pageAssetIdsFromDraft({ pageAssetIds: [1, '', 'ok'] }), ['ok']);
});

test('homeworkPageAssetIdsForModel caps at MAX_HOMEWORK_PAGE_IMAGES (≤4)', () => {
  assert.equal(MAX_HOMEWORK_PAGE_IMAGES, 4);
  const many = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const capped = homeworkPageAssetIdsForModel({
    photo_asset_id: many[0]!,
    model_draft: { pageAssetIds: many.slice(1) },
  });
  assert.deepEqual(capped, ['p1', 'p2', 'p3', 'p4']);
  assert.equal(capped.length, MAX_HOMEWORK_PAGE_IMAGES);
});

test('mergePreservedPageAssetIds keeps prior ids when next omits them', () => {
  const prior = { pageAssetIds: ['a', 'b'], pending: true };
  const next = { gaps: [{ label: 'place value', sortOrder: 1 }], draftScore: null, teacherNote: null };
  assert.deepEqual(mergePreservedPageAssetIds(next, prior).pageAssetIds, ['a', 'b']);
  assert.deepEqual(
    mergePreservedPageAssetIds({ ...next, pageAssetIds: ['x'] }, prior).pageAssetIds,
    ['x'],
  );
});
