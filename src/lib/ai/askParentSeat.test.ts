/**
 * AC-DUAL-ASK-1..3 — parent-seat Ask stays parent; no teacher roster/captures.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';
import { trayKeysForRole } from '../chrome/trayTabs.ts';

const root = process.cwd();
const grants = grantsFromAskDefaults();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('AC-DUAL-ASK-1 parent tray keys stay Home/Ride/Calendar/Ask — never Teach merge', () => {
  assert.deepEqual(trayKeysForRole('parent'), ['home', 'ride', 'calendar', 'ask']);
  assert.ok(!trayKeysForRole('parent').includes('inbox'));
  assert.ok(!trayKeysForRole('teacher').includes('ride'));
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /readSessionParentSeat\(profile\.id\)/);
  assert.match(chrome, /setSeatPreference\('parent'\)/);
  assert.match(chrome, /resolveStaffChromeRole\(profile,\s*seatPreference\)/);
  // Opening /ask must not itself write a seat preference.
  const ask = read('src/app/ask.tsx');
  assert.doesNotMatch(ask, /setChromeSeat|saveChromeSeatPreference/);
});

test('AC-DUAL-ASK-2 parent-shaped policy denies teacher desk tools; parent facts stay', () => {
  const parentish = { role: 'parent' as const, parent_id: 'parent-row' };
  for (const denied of [
    'list_inbox',
    'summarize_class_desk',
    'list_grade_cells',
    'assignment_completion',
    'list_assignments',
    'scan_answer_key',
    'create_assignment',
    'delete_capture',
    'delete_gap',
    'enroll_student',
    'list_classes',
  ]) {
    assert.equal(isAskToolAllowed(denied, parentish, grants), false, denied);
  }
  assert.equal(isAskToolAllowed('my_children_progress', parentish, grants), true);
  assert.equal(isAskToolAllowed('list_my_assignments', parentish, grants), true);
  assert.equal(isAskToolAllowed('get_app_state', parentish, grants), true);
  // Job-of-record teacher alone would still allow roster — live.role wall must strip it.
  assert.equal(isAskToolAllowed('list_roster', { role: 'teacher', parent_id: 'p1' }, grants), true);
  assert.equal(isAskToolAllowed('list_roster', parentish, grants), true);
});

test('AC-DUAL-ASK-2 allowed() parent seat wall is live.role + denies classmates', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const wall = ask.slice(
    ask.indexOf('PARENT_SEAT_DENIED_TOOLS'),
    ask.indexOf('function labelFor('),
  );
  assert.match(wall, /ctx\.live\.role === 'parent'/);
  assert.match(wall, /'list_roster'/);
  assert.match(wall, /'search_students'/);
  assert.match(wall, /'list_inbox'/);
  assert.match(wall, /role:\s*'parent'/);
});

test('AC-DUAL-ASK-3 teacher job still allowed by policy; Teach live.role keeps list_inbox', () => {
  const teacher = { role: 'teacher' as const, parent_id: 'p1' };
  assert.equal(isAskToolAllowed('list_roster', teacher, grants), true);
  assert.equal(isAskToolAllowed('list_inbox', teacher, grants), true);
  assert.equal(isAskToolAllowed('summarize_class_desk', teacher, grants), true);
  const ask = read('src/lib/ai/askTools.ts');
  const allowedFn = ask.slice(ask.indexOf('function allowed('), ask.indexOf('function labelFor('));
  assert.match(allowedFn, /list_inbox.*ctx\.live\.role\s*!==\s*'teacher'|ctx\.live\.role\s*!==\s*'teacher'/);
});

test('AC-DUAL-ASK-2 ask.tsx hides class chip and roster chips off teacher seat', () => {
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /chrome\.role === 'teacher' && chrome\.className/);
  assert.match(ask, /askClassId = askRole === 'teacher' \|\| office \? chrome\.classId : null/);
  assert.match(ask, /if \(askRole !== 'teacher' \|\| !askClassId\) return;/);
  assert.match(ask, /listRoster\(askClassId\)/);
});
