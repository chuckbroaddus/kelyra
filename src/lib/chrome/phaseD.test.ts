import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CLASS_TABS, OFFICE_CLASS_TABS } from './classTabs.ts';
import { resolveStaffChromeRole } from './seat.ts';
import { tabsFor, trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const TEACHER_KEYS = ['home', 'capture', 'inbox', 'class', 'ask'];
const OFFICE_KEYS = ['feed', 'classes', 'people', 'manage', 'ask'];
const STUDENT_KEYS = ['home', 'feed', 'class', 'grades', 'people', 'ask'];
const TEACHER_LABELS = ['Desk', 'Capture', 'Needs', 'Class', 'Ask'];

test('TR-09 / D1: teacher tray labels Desk · Capture · Needs · Class · Ask; today glyph', () => {
  const tabs = tabsFor('teacher', '/', 'c1', 0);
  assert.deepEqual(
    tabs.map((tab) => tab.label),
    TEACHER_LABELS,
  );
  assert.deepEqual(
    tabs.map((tab) => tab.key),
    TEACHER_KEYS,
  );
  assert.equal(tabs.length, 5);
  assert.ok(!tabs.some((tab) => tab.key === 'profile'));
  const desk = tabs.find((tab) => tab.key === 'home');
  assert.equal(desk?.icon, 'today');
  assert.equal(desk?.label, 'Desk');
});

test('TR-09 / D1: web top bar renders tab.label (labels on at ≥720)', () => {
  const layout = read('src/lib/theme/layout.ts');
  assert.match(layout, /showTopBar\s*=\s*width\s*>=\s*720/);
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /if \(layout\.showTopBar\)/);
  assert.match(tray, /styles\.topLabel/);
  assert.match(tray, /\{tab\.label\}/);
  assert.match(tray, /if \(tab\.label === 'Desk'\) return 'Desk'/);
});

test('CAP-04 / D2: header camera proposes; tray Capture files', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  const cam = header.indexOf('openHeaderCamera');
  assert.ok(cam > 0);
  const block = header.slice(Math.max(0, cam - 280), cam + 80);
  assert.match(block, /Propose what this is/);
  assert.match(block, /accessibilityLabel="Propose what this is"/);
  assert.doesNotMatch(block, /Photograph work|Take a photo|File work/);

  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /if \(tab\.key === 'capture'\) return 'File work'/);
  assert.equal(tabsFor('teacher', '/capture', 'c1', 0).find((t) => t.key === 'capture')?.href, '/capture');
});

test('D3: teacher switch-class via /?switch=1 or drawer; no office classes tab on teacher seat', () => {
  assert.ok(!trayKeysForRole('teacher').includes('classes'));
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /teacherSeat && matches\('Another class'/);
  assert.match(drawer, /go\('\/\?switch=1'\)/);
  const home = read('src/app/index.tsx');
  assert.match(home, /officeSeat\s*\?\s*schoolHomeTabs/);
  assert.match(home, /const teacherSeat = chrome\.role === 'teacher'/);
});

test('STU-02 / OFF-08 / D4: student + office trays and OFFICE_CLASS_TABS unchanged', () => {
  assert.deepEqual(trayKeysForRole('student'), STUDENT_KEYS);
  assert.deepEqual(trayKeysForRole('superintendent'), OFFICE_KEYS);
  assert.deepEqual(trayKeysForRole('administrator'), OFFICE_KEYS);
  assert.deepEqual(
    OFFICE_CLASS_TABS.map((tab) => tab.key),
    ['feed', 'teacher', 'parents', 'students'],
  );
  const studentAsk = tabsFor('student', '/ask', null, 0).find((tab) => tab.key === 'ask');
  assert.equal(studentAsk?.label, 'Kelyra');
  const officeAsk = tabsFor('administrator', '/ask', null, 0).find((tab) => tab.key === 'ask');
  assert.equal(officeAsk?.label, 'Kelyra');
});

test('D4 Phase A dual-hat seat still works', () => {
  const dual = { role: 'administrator' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(dual, 'office'), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'teacher'), 'teacher');
  assert.deepEqual(trayKeysForRole(resolveStaffChromeRole(dual, 'teacher')!), TEACHER_KEYS);
  assert.deepEqual(trayKeysForRole(resolveStaffChromeRole(dual, 'office')!), OFFICE_KEYS);
});

test('D4 Phase B/C intact: CLASS_TABS ≤7; Class ≠ gradebook-first; Needs + Ask chip', () => {
  assert.ok(CLASS_TABS.length <= 7);
  const classTab = tabsFor('teacher', '/', 'abc', 0).find((tab) => tab.key === 'class');
  assert.equal(classTab?.href, '/class/abc/setup');
  assert.ok(!classTab?.href.includes('/gradebook'));
  assert.equal(tabsFor('teacher', '/inbox', 'c1', 0).find((t) => t.key === 'inbox')?.label, 'Needs');
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /Working in \$\{chrome\.className\}/);
});

test('D5: Ask FALLBACK uses Needs not Inbox', () => {
  const prompt = read('src/lib/ai/askPrompt.ts');
  assert.match(prompt, /Open Needs or the student’s page/);
  assert.doesNotMatch(prompt, /Open Inbox/);
});

test('invariants: matcher never inserts; canCreateClass untouched; no EXPO_PUBLIC_*; no sixth; no SQL seat', () => {
  assert.equal(trayKeysForRole('teacher').length, 5);
  const matchName = read('src/lib/matching/matchName.ts');
  assert.doesNotMatch(matchName, /\.insert\(|from\('students'\)\.insert/);
  const index = read('src/app/index.tsx');
  assert.match(index, /canCreateClass\s*=\s*isOfficeRole\(profile\)/);
  for (const rel of [
    'src/lib/chrome/trayTabs.ts',
    'src/components/ui/FloatingTabTray.tsx',
    'src/components/ui/AppHeader.tsx',
    'src/lib/ai/askPrompt.ts',
  ]) {
    assert.doesNotMatch(read(rel), /EXPO_PUBLIC_[A-Z0-9_]*KEY|EXPO_PUBLIC_XAI|EXPO_PUBLIC_SECRET/);
  }
  const migrations = readdirSync(join(root, 'supabase/migrations'));
  for (const name of migrations) {
    assert.doesNotMatch(name, /current_seat|chrome_seat|seat_preference/i);
  }
});
