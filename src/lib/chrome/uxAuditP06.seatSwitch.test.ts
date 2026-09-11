import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { showHeaderCapture } from './headerCapture.ts';
import {
  chromePathnameForSeatNav,
  chromeSeatRootHref,
  otherOfficeTeacherSeatRow,
  resolveStaffChromeRole,
  shouldClearSeatNavPath,
} from './seat.ts';
import { headerTitleFor, headerTitleForSeatRoot } from './titles.ts';
import { tabsFor, trayKeysForRole, trayRemountKey } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const TEACHER_KEYS = ['home', 'capture', 'inbox', 'class', 'ask'];
const OFFICE_KEYS = ['feed', 'classes', 'people', 'manage', 'ask'];

test('P-06 Option A: drawer other-seat rows + a11y; My children unchanged; no header chip', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /otherOfficeTeacherSeatRow/);
  assert.match(drawer, /Switch to Teach seat/);
  assert.match(drawer, /Switch to Office seat/);
  assert.match(drawer, /Switch to Parent seat/);
  assert.match(drawer, /chromeSeatRootHref/);
  assert.match(drawer, /setChromeSeat\(/);
  // Parent hat My children stays orthogonal deep-link (not Ride SoT).
  assert.match(drawer, /isAlsoParent\(profile\) && matches\('My children'/);
  assert.doesNotMatch(drawer, /!chromeState\.canChooseSeat && isAlsoParent/);
  // Not tray / header / WhoRow seat segments.
  const header = read('src/components/ui/AppHeader.tsx');
  assert.doesNotMatch(header, /setChromeSeat|Switch to Teach seat|Switch to Office seat|Switch to Parent seat/);
  assert.doesNotMatch(header, /seat chip|SeatChip|chromeSeat/i);
  const whoAt = drawer.indexOf('function WhoRow');
  assert.ok(whoAt > 0);
  assert.doesNotMatch(drawer.slice(whoAt), /setChromeSeat|Teach seat|Office seat|Parent seat/);
});

test('P-06 settle: teacher seat never office tray nouns or office People altitude', () => {
  const dual = { role: 'administrator' as const, also_teacher: true };
  const teacherRole = resolveStaffChromeRole(dual, 'teacher');
  assert.equal(teacherRole, 'teacher');
  assert.deepEqual(trayKeysForRole(teacherRole!), TEACHER_KEYS);
  assert.ok(!trayKeysForRole(teacherRole!).includes('people'));
  assert.ok(!trayKeysForRole(teacherRole!).includes('manage'));
  assert.ok(!trayKeysForRole(teacherRole!).includes('classes'));
  assert.ok(!trayKeysForRole(teacherRole!).includes('ride'));
  assert.equal(trayKeysForRole(teacherRole!).length, 5);

  const title = headerTitleForSeatRoot(teacherRole!);
  assert.equal(title, 'Kelyra');
  assert.notEqual(title, 'People');
  assert.notEqual(title, 'Manage');
  assert.notEqual(title, 'Activity');
  // Prior office path must not be used after commit — seat root only.
  assert.equal(
    headerTitleFor({
      pathname: '/',
      pushedTitle: null,
      className: null,
      contextTab: '',
      role: 'teacher',
    }),
    'Kelyra',
  );
});

test('P-06 settle: office seat never teacher Capture/Needs tray or camera; no Ride tray', () => {
  const dual = { role: 'superintendent' as const, also_teacher: true };
  const officeRole = resolveStaffChromeRole(dual, 'office');
  assert.equal(officeRole, 'superintendent');
  assert.deepEqual(trayKeysForRole(officeRole!), OFFICE_KEYS);
  assert.ok(!trayKeysForRole(officeRole!).includes('capture'));
  assert.ok(!trayKeysForRole(officeRole!).includes('inbox'));
  assert.ok(!trayKeysForRole(officeRole!).includes('ride'));
  assert.equal(showHeaderCapture('/', officeRole!), false);
  assert.equal(showHeaderCapture('/', 'teacher'), true);
  assert.equal(showHeaderCapture('/messages', 'teacher'), false);

  assert.equal(headerTitleForSeatRoot(officeRole!, 'Lincoln'), 'Lincoln');
  assert.notEqual(headerTitleForSeatRoot(officeRole!, 'Lincoln'), 'Needs Attention');
  assert.notEqual(headerTitleForSeatRoot(officeRole!, 'Lincoln'), 'Capture');
});

test('P-06: never merge trays; remount key is role; no sixth tab', () => {
  assert.equal(trayRemountKey('teacher'), 'teacher');
  assert.equal(trayRemountKey('administrator'), 'administrator');
  const teacher = trayKeysForRole('teacher');
  const office = trayKeysForRole('administrator');
  const merged = new Set([...teacher, ...office]);
  assert.ok(merged.size > teacher.length);
  assert.ok(merged.size > office.length);
  assert.equal(teacher.length, 5);
  assert.equal(office.length, 5);
  // tabsFor is single-role only — never concat in the builder.
  assert.deepEqual(
    tabsFor('teacher', '/', 'c1', 0).map((t) => t.key),
    TEACHER_KEYS,
  );
  assert.deepEqual(
    tabsFor('administrator', '/', null, 0).map((t) => t.key),
    OFFICE_KEYS,
  );

  const trayUi = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(trayUi, /trayRemountKey\(chromeState\.role\)/);
  assert.match(trayUi, /key=\{remountKey\}/);
  assert.match(trayUi, /chromeState\.chromePathname/);
});

test('P-06: ChromeProvider atomic seat commit (persist + seat-root path + clear pushed title)', () => {
  const src = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(src, /chromeSeatRootHref/);
  assert.match(src, /setSeatNavPath\(chromeSeatRootHref\(seat\)\)/);
  assert.match(src, /setPushedTitleState\(null\)/);
  assert.match(src, /chromePathnameForSeatNav/);
  assert.match(src, /shouldClearSeatNavPath/);
  // Must not clear / on any /class/* — only via shouldClearSeatNavPath (teacher destination).
  assert.doesNotMatch(
    src,
    /seatNavPath === '\/' && \(pathname === '' \|\| \/\^\\\/class\\\//,
  );
  assert.doesNotMatch(src, /current_seat|EXPO_PUBLIC_[A-Z0-9_]*KEY/);
});

test('P-06 race: after Office commit while pathname still /class/c1, hold / wordmark', () => {
  const dual = { role: 'administrator' as const, also_teacher: true };
  const officeRole = resolveStaffChromeRole(dual, 'office');
  assert.equal(officeRole, 'administrator');

  // Live teacher Desk path must not clear optimistic office seat root.
  assert.equal(
    shouldClearSeatNavPath({
      seatNavPath: '/',
      pathname: '/class/c1',
      role: officeRole,
    }),
    false,
  );
  const chromePath = chromePathnameForSeatNav('/', '/class/c1');
  assert.equal(chromePath, '/');
  assert.equal(
    headerTitleFor({
      pathname: chromePath,
      pushedTitle: null,
      className: 'Algebra I',
      contextTab: '',
      role: officeRole!,
      schoolName: 'Lincoln',
      officeHome: true,
    }),
    'Lincoln',
  );
  assert.equal(headerTitleForSeatRoot(officeRole!, 'Lincoln'), 'Lincoln');

  // Contrast: if seatNavPath were cleared early, prior path would show Class.
  assert.equal(
    headerTitleFor({
      pathname: '/class/c1',
      pushedTitle: null,
      className: 'Algebra I',
      contextTab: '',
      role: officeRole!,
      schoolName: 'Lincoln',
      officeHome: true,
    }),
    'Algebra I',
  );
});

test('P-06 helpers + default dual-hat Office; preference not JWT/SQL', () => {
  assert.equal(chromeSeatRootHref('office'), '/');
  assert.equal(chromeSeatRootHref('teacher'), '/');
  assert.equal(otherOfficeTeacherSeatRow('administrator')?.label, 'Teach');
  assert.equal(otherOfficeTeacherSeatRow('teacher')?.label, 'Office');
  const dual = { role: 'administrator' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(dual, null), 'administrator');
  const seat = read('src/lib/chrome/seat.ts');
  assert.match(seat, /Client chrome seat/);
  assert.doesNotMatch(seat, /from\('current_seat'\)|rpc\('current_seat'/);
});
