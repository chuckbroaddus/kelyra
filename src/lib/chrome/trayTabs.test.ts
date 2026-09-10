import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CLASS_TABS } from './classTabs.ts';
import { tabsFor, trayKeysForRole } from './trayTabs.ts';

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

const TEACHER_KEYS = ['home', 'capture', 'inbox', 'class', 'ask'];
const OFFICE_KEYS = ['feed', 'classes', 'people', 'manage', 'ask'];
const STUDENT_KEYS = ['home', 'feed', 'class', 'grades', 'people', 'ask'];
const PARENT_KEYS = ['home', 'ride', 'ask'];

test('A1 pure teacher tray: five keys, no office People/Manage', () => {
  const keys = trayKeysForRole('teacher');
  assert.deepEqual(keys, TEACHER_KEYS);
  assert.equal(keys.length, 5);
  assert.ok(!keys.includes('people'));
  assert.ok(!keys.includes('manage'));
  assert.ok(!keys.includes('classes'));
  assert.ok(!keys.includes('profile'));
});

test('A1 office seat tray unchanged for superintendent and administrator', () => {
  assert.deepEqual(trayKeysForRole('superintendent'), OFFICE_KEYS);
  assert.deepEqual(trayKeysForRole('administrator'), OFFICE_KEYS);
  assert.equal(trayKeysForRole('superintendent').length, 5);
});

test('A1 dual-hat seats never merge tray key sets', () => {
  const teacher = new Set(trayKeysForRole('teacher'));
  const office = new Set(trayKeysForRole('administrator'));
  const union = new Set([...teacher, ...office]);
  assert.notDeepEqual([...union].sort(), TEACHER_KEYS.slice().sort());
  assert.notDeepEqual([...union].sort(), OFFICE_KEYS.slice().sort());
  assert.deepEqual(trayKeysForRole('teacher'), TEACHER_KEYS);
  assert.deepEqual(trayKeysForRole('administrator'), OFFICE_KEYS);
  assert.ok(teacher.has('capture'));
  assert.ok(!office.has('capture'));
  assert.ok(office.has('people'));
  assert.ok(!teacher.has('people'));
});

test('A1 student tray golden path unchanged', () => {
  assert.deepEqual(trayKeysForRole('student'), STUDENT_KEYS);
});

test('TR-07: teacher Class tray lands setup, not gradebook-first', () => {
  const classId = 'abc';
  const tabs = tabsFor('teacher', '/', classId, 0);
  const classTab = tabs.find((tab) => tab.key === 'class');
  assert.ok(classTab);
  assert.equal(classTab.href, `/class/${classId}/setup`);
  assert.ok(!classTab.href.includes('/gradebook'));
  assert.equal(tabs.length, 5);
});

test('TR-07 / SEC-05: student Class tray unchanged; no sixth teacher key', () => {
  assert.deepEqual(trayKeysForRole('student'), STUDENT_KEYS);
  assert.equal(trayKeysForRole('teacher').length, 5);
  const studentClass = tabsFor('student', '/student/class', null, 0).find((tab) => tab.key === 'class');
  assert.equal(studentClass?.href, '/student/class');
});

test('TR-06: teacher Needs label; route stays /inbox', () => {
  const needs = tabsFor('teacher', '/inbox', 'c1', 2).find((tab) => tab.key === 'inbox');
  assert.ok(needs);
  assert.equal(needs.label, 'Needs');
  assert.equal(needs.href, '/inbox');
  assert.equal(needs.badge, 2);
});

test('A1 parent tray includes Ride; dual-hat seats never merge with teacher/office', () => {
  assert.deepEqual(trayKeysForRole('parent'), PARENT_KEYS);
  assert.ok(trayKeysForRole('parent').includes('ride'));
  assert.ok(!trayKeysForRole('teacher').includes('ride'));
  assert.ok(!trayKeysForRole('administrator').includes('ride'));
  const teacher = new Set(trayKeysForRole('teacher'));
  const parent = new Set(trayKeysForRole('parent'));
  const union = new Set([...teacher, ...parent]);
  assert.notDeepEqual([...union].sort(), TEACHER_KEYS.slice().sort());
  assert.notDeepEqual([...union].sort(), PARENT_KEYS.slice().sort());
  assert.ok(parent.has('ride'));
  assert.ok(!teacher.has('ride'));
  assert.ok(teacher.has('capture'));
  assert.ok(!parent.has('capture'));
});

test('P-05: Ask label unified across seats', () => {
  for (const role of ['teacher', 'superintendent', 'administrator', 'student', 'parent']) {
    const ask = tabsFor(role, '/ask', role === 'teacher' ? 'c1' : null, 0).find((tab) => tab.key === 'ask');
    assert.equal(ask?.label, 'Ask', role);
  }
});

test('RIDE-ICON: parent Ride + Dismissal curb use ride; Assignments stay work', () => {
  const ride = tabsFor('parent', '/parent', null, 0).find((tab) => tab.key === 'ride');
  assert.equal(ride?.icon, 'ride');
  const studentHome = tabsFor('student', '/todo', null, 0).find((tab) => tab.key === 'home');
  assert.equal(studentHome?.icon, 'work');
  assert.equal(CLASS_TABS.find((tab) => tab.key === 'assignments')?.icon, 'work');
  assert.ok(!trayKeysForRole('teacher').includes('ride'));
  assert.ok(!trayKeysForRole('administrator').includes('ride'));

  const home = read('src/app/index.tsx');
  const curb = home.match(/title="Dismissal curb"[\s\S]*?icon="([^"]+)"/);
  assert.equal(curb?.[1], 'ride');
  const office = home.match(/title="Ride office"[\s\S]*?icon="([^"]+)"/);
  assert.equal(office?.[1], 'manage');
});
