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
  const picker = readFileSync(new URL('../../components/ui/FeedIconPicker.tsx', import.meta.url), 'utf8');
  assert.match(picker, /\{hint \? \(/);
});

test('AC-OCM: Manage hosts Class avatar + Feed icon; Teacher keeps list only; open lands on Teacher', () => {
  assert.match(src, /useState\('teacher'\)/);
  assert.match(src, /tabs\.some\(\(item\) => item\.key === tab\) \? tab : 'teacher'/);
  assert.match(src, /pane === 'manage'/);
  const manageIdx = src.indexOf("pane === 'manage'");
  const teacherIdx = src.indexOf("pane === 'teacher'");
  const avatarIdx = src.indexOf('<ClassAvatarRow klass={klass} onChange={setKlass} onError={setError} quiet />');
  const feedRowIdx = src.indexOf('<FeedIconRow');
  assert.ok(manageIdx >= 0 && teacherIdx >= 0 && avatarIdx >= 0 && feedRowIdx >= 0);
  assert.ok(manageIdx < avatarIdx && avatarIdx < teacherIdx, 'Class avatar lives on Manage, before Teacher pane');
  assert.ok(manageIdx < feedRowIdx && feedRowIdx < teacherIdx, 'Feed icon lives on Manage, before Teacher pane');
  assert.match(src, /<FeedIconRow\s+hint=\{false\}/);
  const teacherBlock = src.slice(teacherIdx, src.indexOf("pane === 'parents'"));
  assert.doesNotMatch(teacherBlock, /ClassAvatarRow|FeedIconRow/);
  assert.match(teacherBlock, /SectionHeader label="Teachers"/);
});
