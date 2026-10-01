import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyStudentOptionalDraft,
  createAccountOptionalFields,
  isFullStudentOfficeOptionalSet,
  isTeacherOnlyStudentKey,
  profileStudentOptionalFields,
  STUDENT_DETAIL_FIELDS,
  STUDENT_OFFICE_OPTIONAL_FIELDS,
  studentOptionalDraftFromMetadata,
  studentOptionalHasValues,
  TEACHER_ONLY_STUDENT_KEYS,
} from './metadata.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const read = (rel: string) => readFileSync(`${root}/${rel}`, 'utf8');

const SEVEN_KEYS = [
  'preferred_name',
  'birthday',
  'grade_or_age',
  'emergency_name',
  'emergency_phone',
  'allergies',
  'health_conditions',
] as const;

describe('student office optional fields', () => {
  test('seven optional fields in Chuck order', () => {
    assert.deepEqual(
      STUDENT_OFFICE_OPTIONAL_FIELDS.map((f) => f.key),
      [...SEVEN_KEYS],
    );
    assert.equal(STUDENT_OFFICE_OPTIONAL_FIELDS.length, 7);
    assert.equal(isFullStudentOfficeOptionalSet(STUDENT_OFFICE_OPTIONAL_FIELDS), true);
  });

  test('create-account: selecting Student yields all 7 optional fields', () => {
    const studentFields = createAccountOptionalFields('student');
    assert.equal(studentFields.length, 7);
    assert.deepEqual(
      studentFields.map((f) => f.key),
      [...SEVEN_KEYS],
    );
    assert.deepEqual(
      studentFields.map((f) => f.label),
      [
        'Preferred name',
        'Birthday',
        'Grade or age',
        'Emergency contact',
        'Emergency phone',
        'Allergies',
        'Health conditions',
      ],
    );
    assert.equal(isFullStudentOfficeOptionalSet(studentFields), true);

    // Non-student roles keep phone/address/notes, not the student seven.
    assert.deepEqual(
      createAccountOptionalFields('teacher').map((f) => f.key),
      ['phone', 'address', 'notes'],
    );
    assert.deepEqual(
      createAccountOptionalFields(null).map((f) => f.key),
      ['phone', 'address', 'notes'],
    );
    assert.equal(isFullStudentOfficeOptionalSet(createAccountOptionalFields('parent')), false);
  });

  test('profile: student person yields all 7 optional fields (office)', () => {
    const office = profileStudentOptionalFields({ role: 'student', showSensitiveStudentFields: true });
    assert.equal(office.length, 7);
    assert.deepEqual(
      office.map((f) => f.key),
      [...SEVEN_KEYS],
    );
    assert.equal(isFullStudentOfficeOptionalSet(office), true);

    // Default (omit flag) is office-full set.
    const defaulted = profileStudentOptionalFields({ role: 'student' });
    assert.equal(isFullStudentOfficeOptionalSet(defaulted), true);

    // Non-student person: no student optional rows.
    assert.deepEqual(profileStudentOptionalFields({ role: 'teacher' }), []);
    assert.deepEqual(profileStudentOptionalFields({ role: 'parent' }), []);
    assert.deepEqual(profileStudentOptionalFields({ role: null }), []);

    // Student seat hides teacher-only keys (not the office create/profile path).
    const seat = profileStudentOptionalFields({
      role: 'student',
      showSensitiveStudentFields: false,
    });
    assert.ok(seat.every((f) => !isTeacherOnlyStudentKey(f.key)));
    assert.ok(seat.some((f) => f.key === 'preferred_name'));
    assert.equal(isFullStudentOfficeOptionalSet(seat), false);
  });

  test('allergies split from health; health_conditions teacher-only', () => {
    assert.equal(STUDENT_DETAIL_FIELDS.find((f) => f.key === 'allergies')?.label, 'Allergies');
    assert.equal(
      STUDENT_DETAIL_FIELDS.find((f) => f.key === 'health_conditions')?.label,
      'Health conditions',
    );
    assert.ok(TEACHER_ONLY_STUDENT_KEYS.includes('health_conditions'));
    assert.ok(TEACHER_ONLY_STUDENT_KEYS.includes('allergies'));
    assert.ok(isTeacherOnlyStudentKey('emergency_name'));
    assert.equal(isTeacherOnlyStudentKey('preferred_name'), false);
  });

  test('applyStudentOptionalDraft sets and clears keys; birthday validates', () => {
    const built = applyStudentOptionalDraft(
      {},
      {
        preferred_name: 'Sam',
        birthday: '2017-03-14',
        grade_or_age: '3rd',
        emergency_name: 'Mom',
        emergency_phone: '555',
        allergies: 'peanuts',
        health_conditions: 'asthma',
      },
    );
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.metadata.preferred_name, 'Sam');
    assert.equal(built.metadata.birthday, '2017-03-14');
    assert.equal(built.metadata.health_conditions, 'asthma');
    assert.equal(studentOptionalHasValues(studentOptionalDraftFromMetadata(built.metadata)), true);

    const cleared = applyStudentOptionalDraft(built.metadata, {
      preferred_name: '',
      birthday: '',
      grade_or_age: '',
      emergency_name: '',
      emergency_phone: '',
      allergies: '',
      health_conditions: '',
    });
    assert.equal(cleared.ok, true);
    if (!cleared.ok) return;
    assert.equal(Object.keys(cleared.metadata).length, 0);

    const bad = applyStudentOptionalDraft({}, { birthday: 'not-a-date' });
    assert.equal(bad.ok, false);
  });

  test('create-account and People profile wire the optional group', () => {
    const people = read('src/components/ui/PeopleAdmin.tsx');
    assert.match(people, /createAccountOptionalFields/);
    assert.match(people, /mintOfficeStudent/);
    assert.match(people, /setStudentLink/);
    assert.match(people, /role === 'student'/);
    // Selecting Student maps the helper (all 7) into the Optional group below chips.
    assert.match(people, /createAccountOptionalFields\('student'\)/);

    const profile = read('src/components/ui/ProfileDetails.tsx');
    assert.match(profile, /profileStudentOptionalFields/);
    assert.match(profile, /showSensitiveStudentFields/);
    assert.match(profile, /updateStudentMetadata/);
    assert.match(profile, /health_conditions/);
    // Student person rows come from the helper (office → 7).
    assert.match(profile, /profileStudentOptionalFields\(\{/);

    const types = read('src/lib/supabase/types.ts');
    assert.match(types, /health_conditions/);
  });
});

test('mapClassifierFields splits combined emergency "name — phone" (people ingest R2)', async () => {
  const { mapClassifierFields: map } = await import('./metadata.ts');
  const out = map([{ label: 'Emergency', value: 'Min Park — 555-222-0199' }], 'student');
  assert.deepEqual(
    out.map((f) => [f.key, f.value]),
    [
      ['emergency_name', 'Min Park'],
      ['emergency_phone', '555-222-0199'],
    ],
  );
});

test('mapClassifierFields keeps explicit emergency phone over split', async () => {
  const { mapClassifierFields: map } = await import('./metadata.ts');
  const out = map(
    [
      { label: 'Emergency contact', value: 'Sofia Vargas' },
      { label: 'Emergency phone', value: '555-612-8890' },
    ],
    'student',
  );
  assert.deepEqual(
    out.map((f) => [f.key, f.value]),
    [
      ['emergency_name', 'Sofia Vargas'],
      ['emergency_phone', '555-612-8890'],
    ],
  );
});

test('mapClassifierFields people-ingest aliases (student + parent)', async () => {
  const { mapClassifierFields: map } = await import('./metadata.ts');
  const s = map(
    [
      { label: 'Grade / age', value: 'Grade 7' },
      { label: 'Student phone', value: '555-100-7788' },
      { label: 'Home address', value: '88 Cedar Ct' },
    ],
    'student',
  );
  assert.deepEqual(s.map((f) => f.key), ['grade_or_age', 'phone', 'address']);
  const p = map(
    [
      { label: 'Home phone', value: '555.318.9022' },
      { label: 'Relation', value: 'Father' },
      { label: 'E-mail', value: 'a@example.net' },
    ],
    'parent',
  );
  assert.deepEqual(p.map((f) => f.key), ['phone', 'relationship', 'email']);
});
