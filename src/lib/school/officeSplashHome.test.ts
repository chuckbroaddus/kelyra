/**
 * AC-OFFICE-HOME — office seat leaves SplashLanding without a teachers row.
 * Static source pins: Home gate, fail-closed AuthProvider, People/Manage reach.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  availableChromeSeats,
  defaultChromeSeat,
  isOfficeChromeRole,
  resolveStaffChromeRole,
} from '../chrome/seat.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('AC-OFFICE-HOME-1/5/8: settled office seat leaves splash without a teachers row', () => {
  const home = read('src/app/index.tsx');
  assert.match(home, /isOfficeChromeRole\(chrome\.role\)/);
  assert.match(home, /if\s*\(\s*!teacher\s*&&\s*!officeSeat\s*\)/);
  assert.match(home, /<SplashLanding error=\{error\} \/>/);
  // Do not hold splash until classes load for office (same as office-with-row today).
  assert.match(home, /loading\s*\|\|\s*\(teacher\s*&&\s*classes\s*===\s*null\s*&&\s*!officeSeat\)/);
  assert.doesNotMatch(home, /if\s*\(\s*!teacher\s*\)\s*\{\s*return\s*<SplashLanding/);
  // Auth loading shows WorkingLine before the splash return — never stick on SplashLanding.
  const loadingAt = home.search(/if\s*\(\s*loading\s*\|\|/);
  const splashReturnAt = home.search(
    /if\s*\(\s*!teacher\s*&&\s*!officeSeat\s*\)\s*\{\s*return\s*<SplashLanding/,
  );
  assert.ok(loadingAt >= 0 && splashReturnAt > loadingAt, 'loading gate must precede SplashLanding');
});

test('AC-OFFICE-HOME-2: People and Manage stay on office home; /admin/people redirects', () => {
  const home = read('src/app/index.tsx');
  const people = read('src/app/admin/people.tsx');
  assert.match(home, /key:\s*'people',\s*label:\s*'People'/);
  assert.match(home, /key:\s*'manage',\s*label:\s*'Manage'/);
  assert.match(home, /next\s*===\s*'manage'\s*\|\|\s*next\s*===\s*'school'\s*\)\s*setTab\('manage'\)/);
  assert.match(home, /next\s*===\s*'people'/);
  assert.match(people, /Redirect href="\/\?tab=people"/);
  assert.doesNotMatch(home, /admin\/roster/);
});

test('AC-OFFICE-HOME-3/6: signed-out and non-office still splash; teacher seat needs a row', () => {
  const home = read('src/app/index.tsx');
  // Splash only when neither teacher row nor office chrome seat.
  assert.match(home, /if\s*\(\s*!teacher\s*&&\s*!officeSeat\s*\)\s*\{\s*return\s*<SplashLanding/);
  assert.match(home, /const teacherSeat = chrome\.role === 'teacher'/);
  // One-class teacher redirect stays behind teacherSeat + teacher-loaded classes.
  assert.match(home, /if\s*\(teacherSeat\s*&&\s*next\.length\s*===\s*1/);
});

test('AC-OFFICE-HOME-6: office+teacher defaults office; teacher seat is not office chrome', () => {
  // Behavioral pin for dual-hat seats — Home gate keys off isOfficeChromeRole(chrome.role).
  const dual = { role: 'administrator' as const, also_teacher: true };
  assert.deepEqual(availableChromeSeats(dual), ['office', 'teacher']);
  assert.equal(defaultChromeSeat(dual), 'office');
  assert.equal(resolveStaffChromeRole(dual, null), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'office'), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'teacher'), 'teacher');
  assert.equal(isOfficeChromeRole(resolveStaffChromeRole(dual, 'office')), true);
  assert.equal(isOfficeChromeRole(resolveStaffChromeRole(dual, 'teacher')), false);
  // Teacher seat + no teachers row → !teacher && !officeSeat → splash (Home gate).
});

test('AC-OFFICE-HOME-4/7: AuthProvider selects teachers only; never inserts', () => {
  const auth = read('src/lib/auth/AuthProvider.tsx');
  const api = read('src/lib/auth/api.ts');
  assert.match(auth, /shouldLoadTeacherRow\(mine\)/);
  assert.doesNotMatch(auth, /\.insert\(|\.upsert\(/);
  const loadFn = api.slice(api.indexOf('export async function loadTeacherProfile'));
  assert.match(loadFn, /\.from\('teachers'\)/);
  assert.match(loadFn, /\.maybeSingle\(\)/);
  assert.doesNotMatch(loadFn, /\.insert\(|\.upsert\(/);
  // Office+parent stays on office home — parent redirect is role=parent only.
  const home = read('src/app/index.tsx');
  assert.match(home, /profile\?\.role === 'parent'\)\s*router\.replace\('\/parent'\)/);
  assert.doesNotMatch(home, /isAlsoParent\(profile\)\s*\)\s*router\.replace\('\/parent'\)/);
});

test('AC-OFFICE-HOME-9: sign-out clears teacher/profile; Home splash gate remains fail-closed', () => {
  const auth = read('src/lib/auth/AuthProvider.tsx');
  const home = read('src/app/index.tsx');
  assert.match(auth, /signOut:\s*async\s*\(\)\s*=>\s*\{/);
  assert.match(auth, /setTeacher\(null\)/);
  assert.match(auth, /setProfile\(null\)/);
  assert.match(home, /if\s*\(\s*!teacher\s*&&\s*!officeSeat\s*\)/);
});
