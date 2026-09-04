import assert from 'node:assert/strict';
import test from 'node:test';

import { tabsFor, trayKeysForRole } from './trayTabs.ts';

const TEACHER_KEYS = ['home', 'capture', 'inbox', 'class', 'ask'];
const OFFICE_KEYS = ['feed', 'classes', 'people', 'manage', 'ask'];
const STUDENT_KEYS = ['home', 'feed', 'class', 'grades', 'people', 'ask'];

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
