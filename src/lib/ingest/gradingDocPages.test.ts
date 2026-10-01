import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_GRADING_DOC_PAGES,
  clampGradingDocPages,
  maxPagesCopy,
  pageCountLabel,
  readingStatusForPages,
  uploadGradingDocPages,
} from './gradingDocPages.ts';

test('clampGradingDocPages keeps order and drops empty uris', () => {
  const { pages, truncated } = clampGradingDocPages([
    { uri: 'a', mimeType: 'image/jpeg' },
    { uri: '', mimeType: 'image/jpeg' },
    { uri: 'b', mimeType: 'image/png' },
  ]);
  assert.equal(truncated, false);
  assert.deepEqual(
    pages.map((p) => p.uri),
    ['a', 'b'],
  );
});

test('clampGradingDocPages caps at 20 and flags truncated', () => {
  const many = Array.from({ length: 25 }, (_, i) => ({
    uri: `u${i}`,
    mimeType: 'image/jpeg',
  }));
  const { pages, truncated } = clampGradingDocPages(many);
  assert.equal(truncated, true);
  assert.equal(pages.length, MAX_GRADING_DOC_PAGES);
  assert.equal(pages[0]?.uri, 'u0');
  assert.equal(pages[19]?.uri, 'u19');
});

test('page labels and reading status are plain language', () => {
  assert.equal(pageCountLabel(1), '1 page');
  assert.equal(pageCountLabel(3), '3 pages');
  assert.equal(readingStatusForPages(1), 'Reading your document…');
  assert.equal(readingStatusForPages(3), 'Reading your 3 pages…');
  assert.match(maxPagesCopy(), /20 pages/);
});

test('uploadGradingDocPages uploads in parallel but returns stable page order', async () => {
  const callOrder: number[] = [];
  const upload = async (input: {
    teacherId: string;
    kind: 'photo';
    uri: string;
    mimeType: string;
  }) => {
    const index = Number(String(input.uri).replace('page-', ''));
    // Later pages resolve first to prove we re-order by index.
    await new Promise((r) => setTimeout(r, (3 - index) * 5));
    callOrder.push(index);
    return {
      id: `asset-${index}`,
      storage_path: `path/${index}.jpg`,
      teacher_id: input.teacherId,
      kind: 'photo' as const,
      mime_type: input.mimeType,
      byte_size: 10,
      thumb_storage_path: null,
      created_at: '',
    };
  };
  const sign = async (_kind: 'photo', storagePath: string) => `https://signed/${storagePath}`;

  const result = await uploadGradingDocPages({
    teacherId: 't1',
    pages: [
      { uri: 'page-0', mimeType: 'image/jpeg' },
      { uri: 'page-1', mimeType: 'image/jpeg' },
      { uri: 'page-2', mimeType: 'image/jpeg' },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upload: upload as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sign: sign as any,
  });

  assert.deepEqual(result.storage_paths, ['path/0.jpg', 'path/1.jpg', 'path/2.jpg']);
  assert.deepEqual(result.image_urls, [
    'https://signed/path/0.jpg',
    'https://signed/path/1.jpg',
    'https://signed/path/2.jpg',
  ]);
  assert.equal(result.source_id, 'asset-0');
  assert.deepEqual(result.asset_ids, ['asset-0', 'asset-1', 'asset-2']);
  assert.equal(result.page_count, 3);
  assert.equal(result.truncated, false);
  // All three uploaded (order of completion may differ).
  assert.equal(callOrder.length, 3);
});

test('uploadGradingDocPages enforces max 20 before upload', async () => {
  let uploads = 0;
  const upload = async () => {
    uploads += 1;
    return {
      id: `a${uploads}`,
      storage_path: `p${uploads}.jpg`,
      teacher_id: 't',
      kind: 'photo' as const,
      mime_type: 'image/jpeg',
      byte_size: 1,
      thumb_storage_path: null,
      created_at: '',
    };
  };
  const sign = async () => 'https://x';
  const pages = Array.from({ length: 22 }, (_, i) => ({
    uri: `u${i}`,
    mimeType: 'image/jpeg',
  }));
  const result = await uploadGradingDocPages({
    teacherId: 't',
    pages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upload: upload as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sign: sign as any,
  });
  assert.equal(uploads, 20);
  assert.equal(result.page_count, 20);
  assert.equal(result.truncated, true);
});
