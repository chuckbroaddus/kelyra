import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CLASS_TABS } from './classTabs.ts';
import { tabsFor, trayKeysForRole } from './trayTabs.ts';

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

const TEACHER_KEYS = ['home', 'inbox', 'diary', 'calendar', 'ask'];
const OFFICE_KEYS = ['home', 'diary', 'calendar', 'ask'];
const STUDENT_KEYS = ['home', 'feed', 'class', 'grades', 'people', 'calendar', 'ask'];
const PARENT_KEYS = ['home', 'ride', 'calendar', 'ask'];

test('A1 pure teacher tray: four keys, no office People/Manage', () => {
  const keys = trayKeysForRole('teacher');
  assert.deepEqual(keys, TEACHER_KEYS);
  assert.equal(keys.length, 5);
  assert.ok(!keys.includes('people'));
  assert.ok(!keys.includes('manage'));
  assert.ok(!keys.includes('classes'));
  assert.ok(!keys.includes('profile'));
});

test('A1 office seat tray Home·Diary·Calendar·KelyraAsk for superintendent and administrator', () => {
  assert.deepEqual(trayKeysForRole('superintendent'), OFFICE_KEYS);
  assert.deepEqual(trayKeysForRole('administrator'), OFFICE_KEYS);
  assert.equal(trayKeysForRole('superintendent').length, 4);
  for (const role of ['superintendent', 'administrator'] as const) {
    const tabs = tabsFor(role, '/', null, 0);
    assert.deepEqual(
      tabs.map((tab) => tab.label),
      ['Home', 'Diary', 'Calendar', 'KelyraAsk'],
      role,
    );
    assert.deepEqual(
      tabs.map((tab) => tab.href),
      ['/', '/diary', '/calendar', '/ask'],
      role,
    );
    assert.deepEqual(
      tabs.map((tab) => tab.icon),
      ['today', 'diary', 'calendar', 'ask'],
      role,
    );
    assert.ok(!tabs.some((tab) => tab.href.includes('?tab=')), role);
  }
});

test('A1 dual-hat seats never merge tray key sets', () => {
  const teacher = trayKeysForRole('teacher');
  const office = trayKeysForRole('administrator');
  assert.deepEqual(teacher, TEACHER_KEYS);
  assert.deepEqual(office, OFFICE_KEYS);
  // Seats stay distinct builders — never concat. Office drops Needs; teacher keeps inbox.
  assert.notDeepEqual(teacher, office);
  assert.ok(teacher.includes('inbox'));
  assert.ok(!office.includes('inbox'));
  assert.ok(office.includes('diary'));
  assert.ok(office.includes('home'));
  assert.ok(!office.includes('people'));
  assert.ok(!office.includes('manage'));
  assert.ok(!office.includes('feed'));
  assert.ok(!office.includes('classes'));
  assert.ok(!teacher.includes('people'));
  assert.ok(!teacher.includes('capture'));
  assert.ok(!office.includes('capture'));
  // Labels also diverge on shared keys (Desk vs Home; Kelyra vs KelyraAsk).
  assert.equal(tabsFor('teacher', '/', 'c1', 0).find((t) => t.key === 'home')?.label, 'Desk');
  assert.equal(tabsFor('administrator', '/', null, 0).find((t) => t.key === 'home')?.label, 'Home');
  assert.equal(tabsFor('teacher', '/ask', 'c1', 0).find((t) => t.key === 'ask')?.label, 'Kelyra');
  assert.equal(tabsFor('administrator', '/ask', null, 0).find((t) => t.key === 'ask')?.label, 'KelyraAsk');
});

test('A1 student tray golden path unchanged', () => {
  assert.deepEqual(trayKeysForRole('student'), STUDENT_KEYS);
});

test('ST-A / TR-07: teacher Class tray dropped; setup stays demoted route via hamburger', () => {
  const classId = 'abc';
  const tabs = tabsFor('teacher', '/', classId, 0);
  assert.equal(tabs.find((tab) => tab.key === 'class'), undefined);
  const diary = tabs.find((tab) => tab.key === 'diary');
  assert.ok(diary);
  assert.equal(diary.href, '/diary');
  assert.equal(diary.label, 'Diary');
  assert.equal(tabs.length, 5);
  assert.deepEqual(
    tabs.map((tab) => tab.label),
    ['Desk', 'Needs Attention', 'Diary', 'Calendar', 'Kelyra'],
  );
});

test('TR-07 / SEC-05: student Class tray unchanged; no sixth teacher key', () => {
  assert.deepEqual(trayKeysForRole('student'), STUDENT_KEYS);
  assert.equal(trayKeysForRole('teacher').length, 5);
  const studentClass = tabsFor('student', '/student/class', null, 0).find((tab) => tab.key === 'class');
  assert.equal(studentClass?.href, '/student/class');
  assert.ok(!trayKeysForRole('teacher').includes('class'));
  assert.ok(!trayKeysForRole('parent').includes('diary'));
  assert.ok(trayKeysForRole('administrator').includes('diary'));
  assert.ok(trayKeysForRole('superintendent').includes('diary'));
});

test('TR-06: teacher Needs Attention label; route stays /inbox', () => {
  const needs = tabsFor('teacher', '/inbox', 'c1', 2).find((tab) => tab.key === 'inbox');
  assert.ok(needs);
  assert.equal(needs.label, 'Needs Attention');
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
  assert.ok(!teacher.has('capture'));
  assert.ok(!parent.has('capture'));
});

test('P-05 / KL-A: teacher Ask labels Kelyra; office KelyraAsk; student/parent Ask; key/href ask', () => {
  const teacherAsk = tabsFor('teacher', '/ask', 'c1', 0).find((tab) => tab.key === 'ask');
  assert.equal(teacherAsk?.label, 'Kelyra');
  assert.equal(teacherAsk?.href, '/ask');
  for (const role of ['superintendent', 'administrator']) {
    const ask = tabsFor(role, '/ask', null, 0).find((tab) => tab.key === 'ask');
    assert.equal(ask?.label, 'KelyraAsk', role);
    assert.equal(ask?.href, '/ask', role);
  }
  for (const role of ['student', 'parent']) {
    const ask = tabsFor(role, '/ask', null, 0).find((tab) => tab.key === 'ask');
    assert.equal(ask?.label, 'Ask', role);
    assert.equal(ask?.href, '/ask', role);
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

test('Desk tray lands Classes picker /?switch=1; Desk-active-on-cluster', () => {
  const withClass = tabsFor('teacher', '/', 'abc', 0).find((tab) => tab.key === 'home');
  assert.equal(withClass?.href, '/?switch=1');
  assert.equal(withClass?.active, true);
  const onDesk = tabsFor('teacher', '/class/abc', 'abc', 0).find((tab) => tab.key === 'home');
  assert.equal(onDesk?.href, '/?switch=1');
  assert.equal(onDesk?.active, true);
  const onSetup = tabsFor('teacher', '/class/abc/setup', 'abc', 0).find((tab) => tab.key === 'home');
  assert.equal(onSetup?.href, '/?switch=1');
  assert.equal(onSetup?.active, true);
  const onDiary = tabsFor('teacher', '/diary', 'abc', 0);
  assert.equal(onDiary.find((tab) => tab.key === 'diary')?.active, true);
  assert.equal(onDiary.find((tab) => tab.key === 'home')?.active, false);
});

test('Desk-active-on-cluster: setup/settings/syllabus light Desk, never Diary or Class', () => {
  for (const path of ['/class/abc/settings', '/class/abc/syllabus', '/class/abc/setup', '/class/abc/gradebook']) {
    const tabs = tabsFor('teacher', path, 'abc', 0);
    assert.equal(tabs.find((tab) => tab.key === 'class'), undefined, path);
    assert.equal(tabs.find((tab) => tab.key === 'home')?.active, true, path);
    assert.equal(tabs.find((tab) => tab.key === 'diary')?.active, false, path);
  }
});

test('CT-A: calendar before ask on every seat; ask last', () => {
  for (const role of ['teacher', 'superintendent', 'administrator', 'student', 'parent']) {
    const keys = trayKeysForRole(role);
    assert.ok(keys.includes('calendar'), role);
    assert.equal(keys.at(-1), 'ask', role);
    assert.ok(keys.indexOf('calendar') < keys.indexOf('ask'), role);
  }
  const cal = tabsFor('teacher', '/calendar', 'c1', 0).find((tab) => tab.key === 'calendar');
  assert.equal(cal?.icon, 'calendar');
  assert.equal(cal?.label, 'Calendar');
  assert.equal(cal?.href, '/calendar');
  assert.equal(cal?.active, true);
  assert.equal(tabsFor('administrator', '/calendar', null, 0).find((tab) => tab.key === 'calendar')?.active, true);
  assert.equal(tabsFor('administrator', '/calendar', null, 0).find((tab) => tab.key === 'home')?.active, false);
  assert.equal(tabsFor('administrator', '/', null, 0).find((tab) => tab.key === 'home')?.active, true);
  assert.equal(tabsFor('administrator', '/diary', null, 0).find((tab) => tab.key === 'diary')?.active, true);
});

test('CT-A: G1 calendar icon wired; office hamburger Calendar with tray glyph; class muted link kept', () => {
  const icons = read('scripts/build-icons.mjs');
  assert.match(icons, /calendar:\s*\(p\)\s*=>/);
  assert.match(icons, /NEVER reuse today/);
  assert.match(icons, /binding rings/);
  const names = read('src/components/ui/Icon.tsx');
  assert.match(names, /\| 'calendar'/);
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /matches\('Calendar', q\)/);
  assert.match(drawer, /label="Calendar"/);
  assert.match(drawer, /name="calendar"/);
  assert.equal(drawer.includes("label=\"Feed\""), false);
  assert.equal(drawer.includes('go(\'/?tab=feed\')'), false);
  assert.equal(drawer.includes('go(\'/?tab=classes\')'), false);
  assert.equal(drawer.includes('go(\'/?tab=people\')'), false);
  assert.equal(drawer.includes('go(\'/?tab=manage\')'), false);
  const classPage = read('src/app/class/[id]/index.tsx');
  assert.match(classPage, /Open Calendar/);
  assert.match(classPage, /calendarLinkText/);
});
