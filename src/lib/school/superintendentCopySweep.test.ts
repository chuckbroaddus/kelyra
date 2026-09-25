import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Chuck 2026-09-25: superintendent screens carry no helper / orientation copy.
const read = (rel: string) => readFileSync(new URL(`../../app/${rel}`, import.meta.url), 'utf8');

test('office home: Manage rows have no description lines; no class-create hint', () => {
  const src = read('index.tsx');
  for (const gone of [
    'Progress for your own kids',
    'Walk line, checkout, attach plate',
    'Lines, restrictions, archive',
    'Immutable change log',
    'server stays the hard gate',
    'Create a class on New, then assign a teacher.',
    'Name a class on New.',
  ]) assert.ok(!src.includes(gone), gone);
  for (const kept of ['title="Dismissal curb"', 'title="Ride office"', 'title="Activity"', 'title="Responsibilities"'])
    assert.ok(src.includes(kept), kept);
});

test('matrix, ride office, activity: explainer copy removed', () => {
  assert.doesNotMatch(read('admin/matrix.tsx'), /Matrix toggles hide|Tap a seat to cycle/);
  assert.doesNotMatch(read('admin/ride/index.tsx'), /\(superintendent only\)/);
  const activity = read('activity.tsx');
  assert.doesNotMatch(activity, /Append-only\. Nobody can edit/);
  assert.match(activity, /`Showing \$\{visible\.length\}/);
});

test('shared screens gate helper lines off for office seats', () => {
  assert.match(read('profile.tsx'), /editable && !office \? \(/);
  assert.match(read('class/[id]/student/[studentId].tsx'), /isAdminRole\(profile\)\s*\?\s*'No login assigned\.'/);
  const parent = read('class/[id]/parent/[parentId].tsx');
  assert.match(parent, /isAdminRole\(profile\) \? 'No login assigned\.'/);
  assert.match(parent, /isAdminRole\(profile\) \? 'No classes yet\.'/);
  assert.match(parent, /\{!isAdminRole\(profile\) \? \(\s*<Text[^>]*>\s*They sign in with their parent login/);
  assert.match(read('messages/index.tsx'), /isOfficeChromeRole\(chrome\.role\)\s*\?\s*'No messages yet\.'/);
  assert.match(read('messages/info/[threadId].tsx'), /\(familyStudentId \|\| familyLock\) && !admin \? \(/);
  const diary = read('diary.tsx');
  assert.match(diary, /isOfficeChromeRole\(chrome\.role\) \? null : studentPointer/);
  assert.match(diary, /isOfficeChromeRole\(chrome\.role\) \? null : \(\s*<Text[^>]*>\s*Tagging a student/);
});
