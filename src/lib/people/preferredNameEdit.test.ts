import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { applyStudentOptionalDraft, setMetaKey, STUDENT_DETAIL_FIELDS } from './metadata.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const read = (rel: string) => readFileSync(`${root}/${rel}`, 'utf8');

describe('preferred name edit (AC-PREFNAME)', () => {
  test('class Details Preferred name opens editor and never PhotoSheet', () => {
    const screen = read('src/app/class/[id]/student/[studentId].tsx');
    const rows = read('src/components/ui/DetailsRows.tsx');

    assert.match(screen, /DetailsRows/);
    assert.match(screen, /onPress=\{openEdit\}/);
    assert.match(screen, /setPhotoOpen\(false\)/);
    assert.match(screen, /setEditOpen\(true\)/);
    assert.match(screen, /updateStudentMetadata\(student, metadata\)/);
    assert.match(screen, /patchStudentMetadata\(student, confirm\.key, null\)/);
    // Photo sheet is the hero Change photo control only.
    assert.match(screen, /accessibilityLabel=\{`Change photo, \$\{student\.display_name\}`\}/);
    assert.match(screen, /onPress=\{photoBusy \? undefined : openPhotoSheet\}/);
    // openEdit dismisses photo (sequenced when photo is open); Clear does not open photo.
    const openEdit = screen.slice(screen.indexOf('const openEdit ='), screen.indexOf('const saveEdit'));
    assert.match(openEdit, /setPhotoOpen\(false\)/);
    assert.match(openEdit, /if \(photoOpen\)/);
    assert.match(openEdit, /setEditOpen\(true\)/);
    assert.doesNotMatch(openEdit, /setPhotoOpen\(true\)/);
    assert.match(screen, /onClear=\{\(row\) => \{\s*setPhotoOpen\(false\)/);

    assert.match(rows, /Add \$\{row\.label\.toLowerCase\(\)\}/);
    assert.match(rows, /Edit \$\{row\.label\}/);
    assert.match(rows, /Clear \$\{row\.label\}/);
    assert.equal(
      STUDENT_DETAIL_FIELDS[0]?.key,
      'preferred_name',
      'Preferred name stays the first Details metadata row',
    );
  });

  test('People person card Preferred name opens Edit profile, not photo sheet', () => {
    const profilePage = read('src/app/profile.tsx');
    const details = read('src/components/ui/ProfileDetails.tsx');

    assert.match(profilePage, /<ProfileDetails/);
    assert.match(profilePage, /onBeginEdit=\{\(\) => setPhotoOpen\(false\)\}/);
    assert.match(profilePage, /accessibilityLabel=\{editable \? `Change photo, \$\{name\}` : name\}/);
    // Avatar circle is the only photo hit — Preferred name is DetailsRows.
    assert.match(details, /DetailsRows/);
    assert.match(details, /onPress=\{canEdit \? openEdit : \(\) => undefined\}/);
    assert.match(details, /onClear=\{undefined\}/);
    assert.match(details, /onBeginEdit\?\.\(\)/);
    assert.match(details, /if \(onBeginEdit\) setTimeout\(\(\) => setOpen\(true\), 50\)/);
    assert.match(details, /title="Edit profile"/);
    assert.match(details, /updateStudentMetadata/);
    // Existing linked student must not mint a second card.
    assert.match(details, /Existing student only/);
    assert.match(details, /profile\.student_id/);
    assert.doesNotMatch(read('src/app/parent.tsx'), /onBeginEdit/);
  });

  test('name-only save keeps sibling canonical keys; empty preferred clears that key only', () => {
    const prior = {
      preferred_name: 'Old',
      birthday: '2012-03-15',
      phone: '(512) 555-0142',
      email: 'alex@school.edu',
      address: '123 Maple',
      emergency_name: 'Taylor',
      emergency_phone: '555-0199',
      grade_or_age: '3rd',
      allergies: 'peanuts',
      health_conditions: 'asthma',
      notes: 'keep me',
      focusLog: [{ id: 'f1' }],
    };
    const draft = {
      preferred_name: 'Jordy',
      birthday: '2012-03-15',
      phone: '(512) 555-0142',
      email: 'alex@school.edu',
      address: '123 Maple',
      emergency_name: 'Taylor',
      emergency_phone: '555-0199',
      grade_or_age: '3rd',
      allergies: 'peanuts',
      health_conditions: 'asthma',
      notes: 'keep me',
    };
    const built = applyStudentOptionalDraft(prior, draft, STUDENT_DETAIL_FIELDS);
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.metadata.preferred_name, 'Jordy');
    assert.equal(built.metadata.phone, '(512) 555-0142');
    assert.equal(built.metadata.email, 'alex@school.edu');
    assert.equal(built.metadata.birthday, '2012-03-15');
    assert.deepEqual(built.metadata.focusLog, [{ id: 'f1' }]);

    const cleared = setMetaKey(built.metadata, 'preferred_name', '');
    assert.equal('preferred_name' in cleared, false);
    assert.equal(cleared.phone, '(512) 555-0142');
    assert.equal(cleared.notes, 'keep me');
    assert.deepEqual(cleared.focusLog, [{ id: 'f1' }]);
  });

  test('updateStudentMetadata upserts preferred into name_aliases without dropping others', () => {
    const api = read('src/lib/students/api.ts');
    const fn = api.slice(
      api.indexOf('export async function updateStudentMetadata'),
      api.indexOf('export async function patchStudentMetadata'),
    );
    assert.match(fn, /metadata\.preferred_name/);
    assert.match(fn, /const aliases = \[\.\.\.student\.name_aliases\]/);
    assert.match(fn, /aliases\.push\(preferred\)/);
    assert.match(fn, /name_aliases: aliases/);
    assert.doesNotMatch(fn, /name_aliases:\s*\[preferred\]/);
    assert.doesNotMatch(fn, /name_aliases:\s*\[\]/);
    // Clear path reuses the same writer via patchStudentMetadata → setMetaKey.
    assert.match(api, /return updateStudentMetadata\(student, setMetaKey\(student\.metadata, key, value\)\)/);
  });

  test('unchanged legacy birthday must not block preferred-name save', () => {
    const screen = read('src/app/class/[id]/student/[studentId].tsx');
    const save = screen.slice(screen.indexOf('const saveEdit ='), screen.indexOf('const onPickPhoto'));
    assert.match(save, /birthdayUnchanged\(raw, stored\)/);
    assert.match(save, /continue/);
    assert.match(save, /updateStudentMetadata\(student, metadata\)/);

    const meta = read('src/lib/people/metadata.ts');
    const apply = meta.slice(
      meta.indexOf('export function applyStudentOptionalDraft'),
      meta.indexOf('export function studentOptionalDraftFromMetadata'),
    );
    assert.match(apply, /birthdayUnchanged\(raw, stored\)/);
  });
});
