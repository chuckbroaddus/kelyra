import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  availableChromeSeats,
  canChooseChromeSeat,
  chromeSeatRootHref,
  coldStartChromeSeatPreference,
  defaultChromeSeat,
  resolveStaffChromeRole,
} from './seat.ts';
import { trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const PARENT_KEYS = ['home', 'ride', 'ask'];
const TEACHER_KEYS = ['home', 'capture', 'inbox', 'class', 'ask'];
const OFFICE_KEYS = ['feed', 'classes', 'people', 'manage', 'ask'];

test('DH-01 / DH-05: Parent drawer row + land /parent + parent tray Home·Ride·Ask', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /label="Parent"/);
  assert.match(drawer, /accessibilityLabel="Switch to Parent seat"/);
  assert.match(drawer, /setChromeSeat\('parent'\)/);
  assert.match(drawer, /chromeSeatRootHref\('parent'\)/);
  assert.equal(chromeSeatRootHref('parent'), '/parent');

  const teacherParent = { role: 'teacher' as const, parent_id: 'p1' };
  assert.equal(resolveStaffChromeRole(teacherParent, 'parent'), 'parent');
  assert.deepEqual(trayKeysForRole('parent'), PARENT_KEYS);

  const officeParent = { role: 'administrator' as const, parent_id: 'p1' };
  assert.equal(resolveStaffChromeRole(officeParent, 'parent'), 'parent');
  assert.deepEqual(
    trayKeysForRole(resolveStaffChromeRole(officeParent, 'parent')!),
    PARENT_KEYS,
  );
});

test('DH-02: teacher/office trays never include Ride', () => {
  assert.ok(!trayKeysForRole('teacher').includes('ride'));
  assert.ok(!trayKeysForRole('administrator').includes('ride'));
  assert.ok(!trayKeysForRole('superintendent').includes('ride'));
  assert.deepEqual(trayKeysForRole('teacher'), TEACHER_KEYS);
  assert.deepEqual(trayKeysForRole('administrator'), OFFICE_KEYS);
});

test('DH-04: seat switch never merges teacher+parent or office+parent trays', () => {
  const teacher = trayKeysForRole('teacher');
  const parent = trayKeysForRole('parent');
  const mergedTP = new Set([...teacher, ...parent]);
  assert.ok(mergedTP.size > teacher.length);
  assert.ok(mergedTP.size > parent.length);
  assert.notDeepEqual(teacher, [...teacher, 'ride']);

  const office = trayKeysForRole('administrator');
  const mergedOP = new Set([...office, ...parent]);
  assert.ok(mergedOP.size > office.length);
  assert.ok(!office.includes('ride'));
});

test('DH-06: My children deep-link remains without requiring Parent seat flip', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const myChildrenAt = drawer.indexOf("label=\"My children\"");
  assert.ok(myChildrenAt > 0);
  // Staff drawer My children goes /parent without setChromeSeat
  const staffBlock = drawer.slice(
    drawer.indexOf("isAlsoParent(profile) && matches('My children'"),
    drawer.indexOf("chromeState.canChooseSeat"),
  );
  assert.match(staffBlock, /go\('\/parent'\)/);
  assert.doesNotMatch(staffBlock, /setChromeSeat\('parent'\)/);
});

test('DH-07: cold start / default seat is never Parent', () => {
  assert.equal(defaultChromeSeat({ role: 'teacher', parent_id: 'p1' }), 'teacher');
  assert.equal(
    defaultChromeSeat({ role: 'administrator', also_teacher: true, parent_id: 'p1' }),
    'office',
  );
  assert.equal(defaultChromeSeat({ role: 'administrator', parent_id: 'p1' }), 'office');
  assert.equal(resolveStaffChromeRole({ role: 'teacher', parent_id: 'p1' }, null), 'teacher');
  assert.ok(canChooseChromeSeat({ role: 'teacher', parent_id: 'p1' }));
  assert.ok(availableChromeSeats({ role: 'teacher', parent_id: 'p1' }).includes('parent'));

  // Stored parent must not survive cold start; office/teacher may.
  assert.equal(coldStartChromeSeatPreference('parent'), null);
  assert.equal(coldStartChromeSeatPreference('office'), 'office');
  assert.equal(coldStartChromeSeatPreference('teacher'), 'teacher');
  assert.equal(coldStartChromeSeatPreference(null), null);

  const teacherParent = { role: 'teacher' as const, parent_id: 'p1' };
  const restored = coldStartChromeSeatPreference('parent');
  assert.equal(resolveStaffChromeRole(teacherParent, restored), 'teacher');
  assert.deepEqual(
    trayKeysForRole(resolveStaffChromeRole(teacherParent, restored)!),
    trayKeysForRole('teacher'),
  );
  assert.ok(!trayKeysForRole(resolveStaffChromeRole(teacherParent, restored)!).includes('ride'));

  // In-session Parent still works when preference is set explicitly (not from cold start).
  assert.equal(resolveStaffChromeRole(teacherParent, 'parent'), 'parent');
  assert.deepEqual(trayKeysForRole('parent'), PARENT_KEYS);

  const seatSrc = read('src/lib/chrome/seat.ts');
  assert.match(seatSrc, /coldStartChromeSeatPreference/);
  assert.match(seatSrc, /seat === 'parent'/);
  assert.match(seatSrc, /removeItem/);
  const provider = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(provider, /loadChromeSeatPreference\(profile\.id\)\.then\(\(stored\) =>/);
  assert.match(provider, /setSeatPreference\(stored\)/);
});

test('DH reverse: parent seat lists Office/Teach back with a11y', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const parentAt = drawer.indexOf("{chromeState.role === 'parent' ? (");
  assert.ok(parentAt > 0);
  const parentBlock = drawer.slice(parentAt, parentAt + 2500);
  assert.match(parentBlock, /Switch to Office seat/);
  assert.match(parentBlock, /Switch to Teach seat/);
  assert.doesNotMatch(parentBlock, /label="Parent"/);
});
