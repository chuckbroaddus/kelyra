import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync(new URL('../../app/admin/class/[id].tsx', import.meta.url), 'utf8');

test('office class card has no "not the teacher desk" orientation banner (Chuck 2026-09-25)', () => {
  assert.doesNotMatch(src, /School office card|not the teacher desk/);
});

test('office class card keeps its person tabs and feed pane', () => {
  assert.match(src, /officeClassPersonTabs\(feedIcon\)/);
  assert.match(src, /<PersonTabs tabs=\{tabs\} value=\{pane\} onChange=\{setTab\} \/>/);
  assert.match(src, /<FeedPane classId=\{klass\.id\} scope="class" fill \/>/);
});
