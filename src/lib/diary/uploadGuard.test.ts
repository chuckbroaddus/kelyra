import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  DIARY_ALLOWED_MIME_TYPES,
  DIARY_EMPTY_FILE_ERROR,
  DIARY_MAX_BYTES,
  DIARY_SIZE_ERROR,
  DIARY_TYPE_ERROR,
  assertAllowedDiaryMime,
  assertDiaryByteSize,
  buildDiaryStoragePath,
  diaryStoragePathOk,
  isAllowedDiaryMime,
} from './uploadGuard.ts';

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const entryId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const mediaId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const otherId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function ownPath(seat = 'teacher'): string {
  return buildDiaryStoragePath({ ownerId, seat, entryId, mediaId, ext: 'pdf' });
}

test('path builder accepts the owner seat path', () => {
  const path = ownPath('teacher');
  assert.equal(path, `${ownerId}/teacher/${entryId}/${mediaId}.pdf`);
  assert.equal(diaryStoragePathOk(path, { ownerId, seat: 'teacher', entryId }), true);
  assert.equal(diaryStoragePathOk(ownPath('staff'), { ownerId, seat: 'staff', entryId }), true);
  assert.equal(diaryStoragePathOk(ownPath('parent'), { ownerId, seat: 'parent', entryId }), true);
});

test('path validator rejects other uid, other seat, other entry, and traversal', () => {
  const path = ownPath();
  assert.equal(diaryStoragePathOk(path, { ownerId: otherId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(path, { ownerId, seat: 'parent', entryId }), false);
  assert.equal(diaryStoragePathOk(path, { ownerId, seat: 'teacher', entryId: otherId }), false);
  assert.equal(diaryStoragePathOk(`${ownerId}/teacher/${entryId}/../${mediaId}.pdf`, { ownerId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(`${ownerId}/../${entryId}/${mediaId}.pdf`, { ownerId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(`../${ownerId}/teacher/${entryId}/${mediaId}.pdf`, { ownerId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(`${ownerId}\\teacher\\${entryId}\\${mediaId}.pdf`, { ownerId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(`${ownerId}/teacher/%2e%2e/${mediaId}.pdf`, { ownerId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(`${ownerId}//${entryId}/${mediaId}.pdf`, { ownerId, seat: 'teacher', entryId }), false);
  assert.equal(diaryStoragePathOk(`${ownerId}/teacher/${entryId}/${mediaId}.pdf/extra`, { ownerId, seat: 'teacher', entryId }), false);
  assert.throws(() => buildDiaryStoragePath({ ownerId, seat: 'office', entryId, mediaId, ext: 'pdf' }));
});

test('mime allowlist accepts listed types and rejects octet-stream and unknown', () => {
  for (const mime of DIARY_ALLOWED_MIME_TYPES) {
    assert.equal(isAllowedDiaryMime(mime), true, mime);
    assert.equal(assertAllowedDiaryMime(mime.toUpperCase()), mime);
  }
  assert.equal(assertAllowedDiaryMime('application/pdf; charset=binary'), 'application/pdf');
  assert.equal(isAllowedDiaryMime('application/octet-stream'), false);
  assert.equal(isAllowedDiaryMime('application/octet-stream; charset=binary'), false);
  assert.equal(isAllowedDiaryMime('image/gif'), false);
  assert.equal(isAllowedDiaryMime(''), false);
  assert.throws(() => assertAllowedDiaryMime('application/octet-stream'), { message: DIARY_TYPE_ERROR });
  assert.throws(() => assertAllowedDiaryMime(''), { message: DIARY_TYPE_ERROR });
});

test('size cap accepts up to 10 MiB and rejects empty and over-cap', () => {
  assert.equal(DIARY_MAX_BYTES, 10485760);
  assert.doesNotThrow(() => assertDiaryByteSize(1, DIARY_EMPTY_FILE_ERROR));
  assert.doesNotThrow(() => assertDiaryByteSize(DIARY_MAX_BYTES, DIARY_EMPTY_FILE_ERROR));
  assert.throws(() => assertDiaryByteSize(0, DIARY_EMPTY_FILE_ERROR), { message: DIARY_EMPTY_FILE_ERROR });
  assert.throws(() => assertDiaryByteSize(DIARY_MAX_BYTES + 1, DIARY_EMPTY_FILE_ERROR), { message: DIARY_SIZE_ERROR });
});

test('migration binds diary path, allowlist, and file_size_limit', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260925173000_diary_upload_guard.sql'), 'utf8');
  const api = readFileSync(join(process.cwd(), 'src/lib/diary/api.ts'), 'utf8');
  assert.match(sql, /Do not edit 20260910000000_diary_ledger\.sql in place/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /diary_storage_path_bound/);
  assert.match(sql, /split_part\(p_path, '\/', 5\)/);
  assert.match(sql, /position\('\.\.' in p_path\)/);
  assert.match(sql, /position\('%' in p_path\)/);
  assert.match(sql, /chr\(92\)/);
  assert.match(sql, /'teacher', 'staff', 'parent'/);
  assert.match(sql, /create policy diary_media_insert_own[\s\S]*diary_storage_path_bound\(storage_path, entry_id\)/);
  assert.match(sql, /create policy diary_media_update_own[\s\S]*diary_storage_path_bound\(storage_path, entry_id\)/);
  assert.match(sql, /create policy diary_storage_insert_own[\s\S]*diary_storage_path_bound\(name, null\)/);
  assert.match(sql, /create policy diary_storage_update_own[\s\S]*diary_storage_path_bound\(name, null\)/);
  assert.doesNotMatch(sql, /drop policy if exists diary_storage_select_own/);
  assert.doesNotMatch(sql, /drop policy if exists diary_storage_delete_own/);
  assert.doesNotMatch(sql, /delete from storage\.objects/);
  assert.match(sql, /file_size_limit = 10485760/);
  for (const mime of DIARY_ALLOWED_MIME_TYPES) {
    assert.match(sql, new RegExp(mime.replace(/\./g, '\\.')));
  }
  assert.doesNotMatch(sql, /'application\/octet-stream'/);
  assert.match(api, /buildDiaryStoragePath/);
  assert.match(api, /assertAllowedDiaryMime/);
  assert.match(api, /assertDiaryByteSize/);
  assert.doesNotMatch(api, /octet-stream/);
});
