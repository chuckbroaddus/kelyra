import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  availableChromeSeats,
  canChooseChromeSeat,
  chromeSeatRootHref,
  coldStartChromeSeatPreference,
  defaultChromeSeat,
  effectiveChromeSeatPreference,
  isOfficeChromeRole,
  otherOfficeTeacherSeatRow,
  readSessionParentSeat,
  resolveStaffChromeRole,
  writeSessionParentSeat,
} from './seat.ts';

test('canChooseChromeSeat for office+also_teacher and staff+also_parent', () => {
  assert.equal(canChooseChromeSeat({ role: 'administrator', also_teacher: true }), true);
  assert.equal(canChooseChromeSeat({ role: 'superintendent', also_teacher: true }), true);
  assert.equal(canChooseChromeSeat({ role: 'administrator', also_teacher: false }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher' }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher', also_administrator: true }), false);
  assert.equal(canChooseChromeSeat({ role: 'parent' }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher', parent_id: 'p1' }), true);
  assert.equal(
    canChooseChromeSeat({ role: 'administrator', also_teacher: true, parent_id: 'p1' }),
    true,
  );
  assert.equal(canChooseChromeSeat({ role: 'administrator', parent_id: 'p1' }), true);
});

test('availableChromeSeats: Teacher|Parent and Office|Teacher|Parent', () => {
  assert.deepEqual(availableChromeSeats({ role: 'teacher', parent_id: 'p1' }), [
    'teacher',
    'parent',
  ]);
  assert.deepEqual(
    availableChromeSeats({ role: 'administrator', also_teacher: true, parent_id: 'p1' }),
    ['office', 'teacher', 'parent'],
  );
  assert.deepEqual(availableChromeSeats({ role: 'administrator', also_teacher: true }), [
    'office',
    'teacher',
  ]);
  assert.deepEqual(availableChromeSeats({ role: 'teacher' }), ['teacher']);
  assert.deepEqual(availableChromeSeats({ role: 'administrator' }), ['office']);
  assert.deepEqual(availableChromeSeats({ role: 'parent', parent_id: 'p1' }), []);
});

test('defaultChromeSeat prefers job-of-record, never Parent', () => {
  assert.equal(defaultChromeSeat({ role: 'administrator', also_teacher: true, parent_id: 'p1' }), 'office');
  assert.equal(defaultChromeSeat({ role: 'teacher', parent_id: 'p1' }), 'teacher');
  assert.equal(defaultChromeSeat({ role: 'administrator', parent_id: 'p1' }), 'office');
});

test('DH-07 coldStartChromeSeatPreference ignores stored parent', () => {
  assert.equal(coldStartChromeSeatPreference('parent'), null);
  assert.equal(coldStartChromeSeatPreference('office'), 'office');
  assert.equal(coldStartChromeSeatPreference('teacher'), 'teacher');
  assert.equal(coldStartChromeSeatPreference('nope'), null);
  assert.equal(
    resolveStaffChromeRole({ role: 'administrator', parent_id: 'p1' }, coldStartChromeSeatPreference('parent')),
    'administrator',
  );
});

test('AC-DUAL-ASK-1 same-session Parent altitude survives bare /ask; cold start does not', () => {
  const profileId = `seat-test-${Date.now()}`;
  writeSessionParentSeat(profileId, false);
  assert.equal(readSessionParentSeat(profileId), false);
  writeSessionParentSeat(profileId, true);
  assert.equal(readSessionParentSeat(profileId), true);
  writeSessionParentSeat(profileId, false);
  assert.equal(readSessionParentSeat(profileId), false);

  // DH-07: durable store never restores Parent; session-only altitude.
  assert.equal(coldStartChromeSeatPreference('parent'), null);

  const seatSrc = readFileSync(join(process.cwd(), 'src/lib/chrome/seat.ts'), 'utf8');
  assert.match(seatSrc, /if \(readSessionParentSeat\(profileId\)\) return 'parent'/);
  assert.match(
    seatSrc,
    /if \(seat === 'parent'\) \{[\s\S]*writeSessionParentSeat\(profileId, true\)/,
  );
  assert.match(seatSrc, /writeSessionParentSeat\(profileId, false\)/);
});

test('AC-DUAL-ASK-1 effectiveChromeSeatPreference holds Parent before seatPreference state', () => {
  const profileId = `seat-eff-${Date.now()}`;
  writeSessionParentSeat(profileId, true);
  assert.equal(effectiveChromeSeatPreference(profileId, null), 'parent');
  assert.equal(effectiveChromeSeatPreference(profileId, 'teacher'), 'teacher');
  assert.equal(effectiveChromeSeatPreference(profileId, 'office'), 'office');
  writeSessionParentSeat(profileId, false);
  assert.equal(effectiveChromeSeatPreference(profileId, null), null);
  assert.equal(effectiveChromeSeatPreference(undefined, null), null);

  const dual = { role: 'teacher' as const, parent_id: 'p1' };
  writeSessionParentSeat(profileId, true);
  assert.equal(
    resolveStaffChromeRole(dual, effectiveChromeSeatPreference(profileId, null)),
    'parent',
  );
  writeSessionParentSeat(profileId, false);

  const chrome = readFileSync(join(process.cwd(), 'src/lib/chrome/ChromeProvider.tsx'), 'utf8');
  assert.match(chrome, /effectiveChromeSeatPreference\(profile\?\.id,\s*seatPreference\)/);
});

test('resolveStaffChromeRole: also_teacher does not force teacher without seat', () => {
  const dual = { role: 'administrator' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(dual, null), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'office'), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'teacher'), 'teacher');

  const superDual = { role: 'superintendent' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(superDual, null), 'superintendent');
  assert.equal(resolveStaffChromeRole(superDual, 'teacher'), 'teacher');
});

test('resolveStaffChromeRole: also_parent parent seat flips to parent chrome', () => {
  const teacherParent = { role: 'teacher' as const, parent_id: 'p1' };
  assert.equal(resolveStaffChromeRole(teacherParent, null), 'teacher');
  assert.equal(resolveStaffChromeRole(teacherParent, 'teacher'), 'teacher');
  assert.equal(resolveStaffChromeRole(teacherParent, 'parent'), 'parent');
  assert.equal(resolveStaffChromeRole(teacherParent, 'office'), 'teacher');

  const triple = {
    role: 'administrator' as const,
    also_teacher: true,
    parent_id: 'p1',
  };
  assert.equal(resolveStaffChromeRole(triple, null), 'administrator');
  assert.equal(resolveStaffChromeRole(triple, 'office'), 'administrator');
  assert.equal(resolveStaffChromeRole(triple, 'teacher'), 'teacher');
  assert.equal(resolveStaffChromeRole(triple, 'parent'), 'parent');
});

test('resolveStaffChromeRole: pure teacher and pure office', () => {
  assert.equal(resolveStaffChromeRole({ role: 'teacher' }, null), 'teacher');
  assert.equal(resolveStaffChromeRole({ role: 'teacher' }, 'office'), 'teacher');
  assert.equal(resolveStaffChromeRole({ role: 'administrator' }, null), 'administrator');
  assert.equal(resolveStaffChromeRole({ role: 'superintendent' }, 'teacher'), 'superintendent');
});

test('isOfficeChromeRole matches chrome.role seats only', () => {
  assert.equal(isOfficeChromeRole('superintendent'), true);
  assert.equal(isOfficeChromeRole('administrator'), true);
  assert.equal(isOfficeChromeRole('teacher'), false);
  assert.equal(isOfficeChromeRole('student'), false);
  assert.equal(isOfficeChromeRole('parent'), false);
});

test('P-06: chromeSeatRootHref always lands seat root', () => {
  assert.equal(chromeSeatRootHref('office'), '/');
  assert.equal(chromeSeatRootHref('teacher'), '/');
  assert.equal(chromeSeatRootHref('parent'), '/parent');
});

test('P-06: otherOfficeTeacherSeatRow shows only the other seat', () => {
  assert.deepEqual(otherOfficeTeacherSeatRow('administrator'), {
    seat: 'teacher',
    label: 'Teach',
    accessibilityLabel: 'Switch to Teach seat',
  });
  assert.deepEqual(otherOfficeTeacherSeatRow('superintendent'), {
    seat: 'teacher',
    label: 'Teach',
    accessibilityLabel: 'Switch to Teach seat',
  });
  assert.deepEqual(otherOfficeTeacherSeatRow('teacher'), {
    seat: 'office',
    label: 'Office',
    accessibilityLabel: 'Switch to Office seat',
  });
  assert.equal(otherOfficeTeacherSeatRow('parent'), null);
  assert.equal(otherOfficeTeacherSeatRow('student'), null);
  assert.equal(otherOfficeTeacherSeatRow(null), null);
});
