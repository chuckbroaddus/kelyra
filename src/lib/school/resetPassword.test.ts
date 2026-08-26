import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bounceStudentProfileToClass,
  canShowOfficeReset,
  generatePronounceableTemp,
  hasLoginUsername,
  isAskPasswordToolDenied,
  peopleDirectoryPersonHref,
  RESET_PASSWORD_COPY,
} from './resetPassword.ts';

const jacquee = {
  id: 'jacquee',
  role: 'teacher' as const,
  also_administrator: false,
  also_teacher: true,
};
const admin = { id: 'admin-1', role: 'administrator' as const, also_administrator: true };
const superUser = { id: 'super-1', role: 'superintendent' as const };
const student = { id: 'student-1', role: 'student' as const };
const goodapple = { id: 'goodapple', role: 'teacher' as const };

test('T1: teacher omits Reset for anyone, including self', () => {
  assert.equal(canShowOfficeReset(jacquee, student), false);
  assert.equal(canShowOfficeReset(jacquee, goodapple), false);
  assert.equal(canShowOfficeReset(jacquee, jacquee), false);
  assert.equal(canShowOfficeReset(jacquee, admin), false);
  assert.equal(
    canShowOfficeReset({ id: 'jacquee', role: 'teacher', also_administrator: false, also_teacher: true }, student),
    false,
  );
});

test('office can reset another school login, not self', () => {
  assert.equal(canShowOfficeReset(admin, student), true);
  assert.equal(canShowOfficeReset(admin, { id: 'parent-1', role: 'parent' }), true);
  assert.equal(canShowOfficeReset(admin, goodapple), true);
  assert.equal(canShowOfficeReset(admin, admin), false);
  assert.equal(canShowOfficeReset(admin, superUser), false);
  assert.equal(canShowOfficeReset(superUser, goodapple), true);
  assert.equal(canShowOfficeReset(superUser, admin), true);
  assert.equal(canShowOfficeReset(superUser, superUser), false);
});

test('office People opens the person account for staff, students, and parents', () => {
  assert.equal(peopleDirectoryPersonHref(student.id), '/profile?person=student-1');
  assert.equal(peopleDirectoryPersonHref('parent-1'), '/profile?person=parent-1');
  assert.equal(peopleDirectoryPersonHref(goodapple.id), '/profile?person=goodapple');
  assert.equal(bounceStudentProfileToClass(admin), false);
  assert.equal(bounceStudentProfileToClass(superUser), false);
  assert.equal(bounceStudentProfileToClass(jacquee), true);
});

test('parent and student actors omit the control', () => {
  assert.equal(canShowOfficeReset({ id: 'p', role: 'parent' }, student), false);
  assert.equal(canShowOfficeReset({ id: 's', role: 'student' }, goodapple), false);
});

test('no login yet copy', () => {
  assert.equal(hasLoginUsername(''), false);
  assert.equal(hasLoginUsername('   '), false);
  assert.equal(hasLoginUsername(null), false);
  assert.equal(hasLoginUsername('colton'), true);
  assert.equal(RESET_PASSWORD_COPY.noLogin, 'No login yet, create one from People.');
});

test('generate is pronounceable and 8+ chars', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 24; i += 1) {
    const temp = generatePronounceableTemp();
    assert.ok(temp.length >= 8, temp);
    assert.match(temp, /^[a-z]+[0-9]{2}[a-z]+$/);
    seen.add(temp);
  }
  assert.ok(seen.size > 1);
});

test('T3: Ask password tools are denied and must not ride is_staff', () => {
  assert.equal(isAskPasswordToolDenied('reset_password'), true);
  assert.equal(isAskPasswordToolDenied('admin_reset_login_password'), true);
  assert.equal(isAskPasswordToolDenied('reset_login'), true);
  assert.equal(isAskPasswordToolDenied('update_student'), false);
  assert.equal(isAskPasswordToolDenied('list_people'), false);
});
