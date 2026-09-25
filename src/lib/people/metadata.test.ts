import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyStudentOptionalDraft,
  isTeacherOnlyStudentKey,
  STUDENT_DETAIL_FIELDS,
  STUDENT_OFFICE_OPTIONAL_FIELDS,
  studentOptionalDraftFromMetadata,
  studentOptionalHasValues,
  TEACHER_ONLY_STUDENT_KEYS,
} from './metadata.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const read = (rel: string) => readFileSync(`${root}/${rel}`, 'utf8');

describe('student office optional fields', () => {
  test('seven optional fields in Chuck order', () => {
    assert.deepEqual(
      STUDENT_OFFICE_OPTIONAL_FIELDS.map((f) => f.key),
      [
        'preferred_name',
        'birthday',
        'grade_or_age',
        'emergency_name',
        'emergency_phone',
        'allergies',
        'health_conditions',
      ],
    );
    assert.equal(STUDENT_OFFICE_OPTIONAL_FIELDS.length, 7);
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
    assert.match(people, /STUDENT_OFFICE_OPTIONAL_FIELDS/);
    assert.match(people, /mintOfficeStudent/);
    assert.match(people, /setStudentLink/);
    assert.match(people, /role === 'student'/);

    const profile = read('src/components/ui/ProfileDetails.tsx');
    assert.match(profile, /STUDENT_OFFICE_OPTIONAL_FIELDS/);
    assert.match(profile, /showSensitiveStudentFields/);
    assert.match(profile, /updateStudentMetadata/);
    assert.match(profile, /health_conditions/);

    const types = read('src/lib/supabase/types.ts');
    assert.match(types, /health_conditions/);
  });
});
