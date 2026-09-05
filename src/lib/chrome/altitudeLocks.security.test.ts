import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { isAdminRole, isOfficeRole } from '../school/roles.ts';
import { resolveStaffChromeRole } from './seat.ts';
import { trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('SEC-01: ChromeProvider resolves seat before isTeacherRole force', () => {
  const src = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(src, /resolveStaffChromeRole\(profile,\s*seatPreference\)/);
  assert.doesNotMatch(src, /if \(isTeacherRole\(profile\)\) return 'teacher'/);
  assert.match(src, /setChromeSeat/);
  assert.match(src, /canChooseSeat/);
  assert.doesNotMatch(src, /current_seat\s*\(/);
});

test('SEC-01 dual-hat: office seat tray === office; teacher seat === pure teacher', () => {
  const dual = { role: 'administrator' as const, also_teacher: true };
  const officeRole = resolveStaffChromeRole(dual, 'office');
  const teacherRole = resolveStaffChromeRole(dual, 'teacher');
  assert.equal(officeRole, 'administrator');
  assert.equal(teacherRole, 'teacher');
  assert.deepEqual(trayKeysForRole(officeRole!), trayKeysForRole('administrator'));
  assert.deepEqual(trayKeysForRole(teacherRole!), trayKeysForRole('teacher'));
  const merged = new Set([...trayKeysForRole(officeRole!), ...trayKeysForRole(teacherRole!)]);
  assert.notEqual(merged.size, trayKeysForRole(officeRole!).length);
  assert.notEqual(merged.size, trayKeysForRole(teacherRole!).length);
});

test('SEC-02: drawer office nouns gated on officeSeat, not isAdminRole', () => {
  const src = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(src, /const officeSeat = isOfficeChromeRole\(chromeState\.role\)/);
  assert.match(src, /const teacherSeat = chromeState\.role === 'teacher'/);
  assert.doesNotMatch(src, /isAdminRole\(profile\)/);
  assert.doesNotMatch(src, /isTeacherRole\(profile\)/);
  const inject = src.indexOf('{officeSeat ? (');
  assert.ok(inject > 0);
  const people = src.indexOf('label="People"', inject);
  const activity = src.indexOf('label="Activity"', inject);
  const responsibilities = src.indexOf('label="Responsibilities"', inject);
  assert.ok(people > inject && activity > inject && responsibilities > inject);
});

test('SEC-02 / A3: teacher seat home has no office PersonTabs or class-create UI', () => {
  const src = read('src/app/index.tsx');
  assert.match(src, /const officeSeat = isOfficeChromeRole\(chrome\.role\)/);
  assert.match(src, /const teacherSeat = chrome\.role === 'teacher'/);
  assert.match(src, /canCreateClass\s*=\s*officeSeat\s*&&\s*can\(profile,\s*'classes\.create'/);
  assert.match(src, /const showCreateClass = canCreateClass/);
  assert.match(src, /officeSeat\s*\?\s*schoolHomeTabs/);
  assert.match(src, /officeSeat && tabs\.length/);
  assert.match(src, /showCreateClass \?/);
  assert.equal(isOfficeRole({ role: 'teacher' }), false);
});

test('SEC-05: no sixth teacher tray tab; no student /todo skin on teacher', () => {
  assert.equal(trayKeysForRole('teacher').length, 5);
  assert.ok(!trayKeysForRole('teacher').includes('grades'));
  assert.ok(!trayKeysForRole('teacher').includes('todo'));
  const tray = read('src/lib/chrome/trayTabs.ts');
  const teacherBlock = tray.slice(tray.indexOf('const classRoot'));
  assert.doesNotMatch(teacherBlock, /\/todo/);
  assert.match(teacherBlock, /capture/);
  assert.match(teacherBlock, /inbox/);
});

test('SEC-08: no current_seat SQL table or seat migrations', () => {
  const migrations = readdirSync(join(root, 'supabase/migrations'));
  for (const name of migrations) {
    assert.doesNotMatch(name, /current_seat|chrome_seat|seat_preference/i);
    if (!name.endsWith('.sql')) continue;
    const sql = read(`supabase/migrations/${name}`);
    assert.doesNotMatch(sql, /create\s+table[\s\S]{0,80}current_seat/i);
  }
  assert.doesNotMatch(read('src/lib/chrome/seat.ts'), /from\('current_seat'\)|rpc\('current_seat'/);
});

test('SEC-09: office walls stay isOfficeRole — not chrome.role teacher hide as RLS', () => {
  assert.equal(isOfficeRole({ role: 'teacher' }), false);
  assert.equal(isOfficeRole({ role: 'teacher', also_administrator: true }), false);
  assert.equal(isOfficeRole({ role: 'administrator' }), true);

  const createHome = read('src/app/index.tsx');
  assert.match(createHome, /canCreateClass\s*=\s*officeSeat\s*&&\s*can\(profile,\s*'classes\.create'/);

  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(policy, /if \(policy\.officeOnly\) return isOfficeRole\(profile\)/);

  assert.ok(read('src/app/admin/matrix.tsx').length > 0);
  assert.ok(read('src/app/activity.tsx').length > 0);
});

test('A4 Search: teacher seat does not call listDirectory via isStaffRole', () => {
  const src = read('src/app/search.tsx');
  assert.match(
    src,
    /if \(chrome\.role === 'superintendent' \|\| chrome\.role === 'administrator'\)/,
  );
  assert.doesNotMatch(src, /isStaffRole\(profile\)\s*&&\s*!chrome\.classId/);
  assert.doesNotMatch(src, /office \|\| \(staff && !chrome\.classId\)/);
  assert.match(src, /if \(chrome\.role === 'teacher' && chrome\.classId\)/);
});

test('no EXPO_PUBLIC secrets introduced by altitude files', () => {
  for (const rel of [
    'src/lib/chrome/seat.ts',
    'src/lib/chrome/trayTabs.ts',
    'src/lib/chrome/classTabs.ts',
    'src/lib/chrome/ChromeProvider.tsx',
    'src/components/ui/FloatingTabTray.tsx',
    'src/components/ui/HamburgerDrawer.tsx',
    'src/app/index.tsx',
    'src/app/search.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /EXPO_PUBLIC_[A-Z0-9_]*KEY|EXPO_PUBLIC_XAI|EXPO_PUBLIC_SECRET/);
  }
});

test('SEC-05/06 Phase B: Class tray not gradebook-first; Family stays drawer; no sixth tray tab', () => {
  assert.equal(trayKeysForRole('teacher').length, 5);
  const tray = read('src/lib/chrome/trayTabs.ts');
  const teacherBlock = tray.slice(tray.indexOf('const classRoot'));
  assert.match(teacherBlock, /\$\{classRoot\}\/setup/);
  assert.doesNotMatch(teacherBlock, /\$\{classRoot\}\/gradebook/);
  assert.match(teacherBlock, /label: 'Needs'/);
  assert.match(teacherBlock, /href: '\/inbox'/);
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /label="Family update"/);
  assert.match(drawer, /\/family/);
  assert.match(drawer, /q\.trim\(\) && matches\('Grade book'/);
});

test('SEC-09 leftover: pure teacher fails activity admin gate (UI wall; JWT deny still optional)', () => {
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  const office = { role: 'administrator' as const };

  // activity.tsx still uses isAdminRole — also_administrator teachers see it; pure teachers do not.
  assert.equal(isAdminRole(teacher), false);
  assert.equal(isAdminRole(teacherAlsoAdmin), true);
  assert.equal(isAdminRole(office), true);

  const activity = read('src/app/activity.tsx');
  assert.match(activity, /isAdminRole\(profile\)/);
  assert.match(activity, /listAuditEvents|audit/i);

  const matrix = read('src/app/admin/matrix.tsx');
  assert.match(matrix, /./);
  // Matrix remains office/admin chrome path under /admin — pure teacher isOfficeRole false.
  assert.equal(isOfficeRole(teacher), false);
});

