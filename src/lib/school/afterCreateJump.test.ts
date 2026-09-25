import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { peopleTabForCreatedRole } from './createLoginNotice.ts';

const home = readFileSync(new URL('../../app/index.tsx', import.meta.url), 'utf8');
const people = readFileSync(new URL('../../components/ui/PeopleAdmin.tsx', import.meta.url), 'utf8');

test('new login lands on the People sub-tab that lists it', () => {
  assert.equal(peopleTabForCreatedRole('student'), 'students');
  assert.equal(peopleTabForCreatedRole('parent'), 'parents');
  assert.equal(peopleTabForCreatedRole('teacher'), 'staff');
  assert.equal(peopleTabForCreatedRole('administrator'), 'staff');
  assert.equal(peopleTabForCreatedRole('superintendent'), 'staff');
});

test('home switches to People, picks the sub-tab, and highlights the new person', () => {
  assert.match(home, /setPeopleTab\(peopleTabForCreatedRole\(created\.role\)\);\s*setJustCreatedId\(created\.id\);\s*setCreatedNotice\(created\.notice\);\s*setTab\('people'\);/);
  assert.match(home, /<PeopleDirectory tab=\{peopleTab\} onTabChange=\{setPeopleTab\} highlightId=\{justCreatedId\} \/>/);
  assert.match(home, /<NoticePopup notice=\{createdNotice\}/);
});

test('new class lands on the Classes tab with the class highlighted', () => {
  assert.match(home, /setJustCreatedId\(created\.id\);\s*setTab\('classes'\);/);
  assert.match(home, /selected=\{item\.id === justCreatedId\}/);
});

test('create form hands its notice to the host instead of a popup that unmounts', () => {
  assert.match(people, /if \(!onCreated\) setNotice\(createdNotice\);/);
  assert.match(people, /onCreated\?\.\(\{ id: newId, role, notice: createdNotice \}\);/);
  assert.match(people, /selected=\{row\.id === highlightId\}/);
});
