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

test('Students tab has no "New names on the school roster" helper (Chuck 2026-09-25)', () => {
  assert.doesNotMatch(src, /New names on the school roster|Teachers enroll existing students/);
  assert.match(src, /placeholder="First and last name"/);
  assert.match(src, /onPress=\{\(\) => void addNewStudent\(\)\}/);
});

test('office class card sweep: no instructional copy left (Chuck 2026-09-25)', () => {
  assert.doesNotMatch(src, /Add one from the list|show up here|Swipe left to add|more than one child\. Choose/);
  assert.match(src, /No teacher yet\./);
  assert.match(src, /\{availableTeachers\.length \? <SectionHeader label="All teachers" \/> : null\}/);
  assert.match(src, /<ClassAvatarRow klass=\{klass\} onChange=\{setKlass\} onError=\{setError\} quiet \/>/);
  assert.match(src, /<FeedIconRow\s+hint=\{false\}/);
  const picker = readFileSync(new URL('../../components/ui/FeedIconPicker.tsx', import.meta.url), 'utf8');
  assert.match(picker, /\{hint \? \(/);
});
