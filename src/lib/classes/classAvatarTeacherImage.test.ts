import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  CLASS_AVATAR_FROM_SEGMENT,
  classAvatarFromPrefix,
  parseClassAvatarTeacherSource,
} from './avatarSource.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('parseClassAvatarTeacherSource reads snapshot mark; take/library paths are not sources', () => {
  // node --experimental-strip-types --test cannot resolve @/ aliases — keep relative .ts.
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  assert.match(self, /from '\.\/avatarSource\.ts'/);
  assert.doesNotMatch(self, /from ['"]@\//);

  const teacherId = 't-maya';
  const sourcePhoto = 'a-face-1';
  const path = `office-uid/${classAvatarFromPrefix(teacherId, sourcePhoto)}/1234.jpg`;
  assert.deepEqual(parseClassAvatarTeacherSource(path), {
    teacherId,
    sourcePhotoAssetId: sourcePhoto,
  });
  assert.equal(parseClassAvatarTeacherSource(`office-uid/1234.jpg`), null);
  assert.equal(parseClassAvatarTeacherSource(null), null);
  assert.equal(CLASS_AVATAR_FROM_SEGMENT, 'class-avatar-from');
  assert.equal(
    classAvatarFromPrefix('t1', 'a1'),
    `${CLASS_AVATAR_FROM_SEGMENT}/t1/a1`,
  );
});

test('AC-CATI-1/3/5: PhotoSheet exact header, order, omit empty teacher block', () => {
  const sheet = read('src/components/ui/PhotoSheet.tsx');
  assert.match(sheet, /Use the Teacher's Avatar Image/);
  assert.doesNotMatch(sheet, /textTransform:\s*'uppercase'[\s\S]{0,80}Use the Teacher/);
  assert.doesNotMatch(sheet, /No teacher yet\.|No photo yet\./);

  const takeIdx = sheet.indexOf('label="Take photo"');
  const libraryIdx = sheet.indexOf('label="Choose from library"');
  const headerIdx = sheet.indexOf("Use the Teacher's Avatar Image");
  const removeIdx = sheet.indexOf('label="Remove photo"');
  const cancelIdx = sheet.lastIndexOf('label="Cancel"');
  assert.ok(takeIdx > 0 && libraryIdx > takeIdx);
  assert.ok(headerIdx > libraryIdx, 'teacher header follows Choose from library');
  assert.ok(removeIdx > headerIdx && cancelIdx > removeIdx);

  assert.match(sheet, /const showTeacherBlock = teachers\.length > 0/);
  assert.match(sheet, /Using this image/);
  assert.match(sheet, /Class kept the earlier photo\./);
  assert.match(sheet, /if \(matchOnly\) return/);
});

test('AC-CATI-5A/9/22: office quiet hosts block; Settings does not pass teacherImages', () => {
  const row = read('src/components/ui/ClassAvatarRow.tsx');
  const settings = read('src/app/class/[id]/settings.tsx');
  const office = read('src/app/admin/class/[id].tsx');

  assert.match(office, /<ClassAvatarRow klass=\{klass\} onChange=\{setKlass\} onError=\{setError\} quiet \/>/);
  assert.match(settings, /<ClassAvatarRow klass=\{klass\} onChange=\{setKlass\} onError=\{setError\} \/>/);
  assert.doesNotMatch(settings, /quiet/);

  assert.match(row, /teacherImages=\{quiet \? teacherImages : undefined\}/);
  assert.match(row, /onTeacherImage=\{quiet \? \(id\) => void applyTeacherImage\(id\) : undefined\}/);
  assert.match(row, /snapshotClassAvatarFromTeacher/);
  assert.match(row, /listClassTeachers/);
  assert.match(row, /filter\(\(row\): row is .+ => Boolean\(row\.photo_asset_id\)\)/);
  assert.match(row, /quiet \? undefined : 'Shown next to the class name'/);
  assert.match(row, /status=\{busy \? 'Saving…'/);
  assert.match(row, /title="Class avatar"/);
});

test('AC-CATI-7: person / logo / homework sheets do not mount the teacher-image block', () => {
  const people = read('src/components/ui/PeopleAdmin.tsx');
  const school = read('src/components/ui/SchoolIdentity.tsx');
  const profile = read('src/app/profile.tsx');
  const student = read('src/app/class/[id]/student/[studentId].tsx');
  for (const src of [people, school, profile, student]) {
    assert.doesNotMatch(src, /teacherImages=/);
    assert.doesNotMatch(src, /onTeacherImage=/);
    assert.doesNotMatch(src, /Use the Teacher's Avatar Image/);
  }
  assert.match(student, /Use this homework as profile|showUseHomework/);
});

test('AC-CATI-4A snapshot: copy under office user + from-prefix; never points at live teacher asset', () => {
  const api = read('src/lib/classes/avatar.ts');
  assert.match(api, /export async function snapshotClassAvatarFromTeacher/);
  assert.match(api, /signedOriginalUrlsForAssetIds/);
  assert.match(api, /prefix:\s*classAvatarFromPrefix\(input\.teacherId,\s*input\.sourcePhotoAssetId\)/);
  assert.match(api, /teacherId:\s*input\.officeUserId/);
  assert.match(api, /await setClassAvatar\(input\.classId,\s*asset\.id\)/);
  // Must not set the class avatar to the teacher's live photo asset id.
  assert.doesNotMatch(
    api.slice(api.indexOf('snapshotClassAvatarFromTeacher')),
    /setClassAvatar\([^)]*sourcePhotoAssetId/,
  );
});

test('live set_class_avatar still requires assets.teacher_id = auth.uid() (build gap copy)', () => {
  const sql = read('supabase/migrations/20260911000003_class_avatar.sql');
  const body = sql.slice(
    sql.indexOf('create or replace function public.set_class_avatar'),
    sql.indexOf('revoke all on function public.set_class_avatar'),
  );
  assert.match(body, /from public\.assets where id = p_asset_id and teacher_id = auth\.uid\(\)/);
});

test('class teacher list order matches class_teachers.created_at; exposes photo_asset_id', () => {
  const api = read('src/lib/classes/api.ts');
  assert.match(api, /photo_asset_id: string \| null/);
  assert.match(
    api,
    /\.from\('class_teachers'\)\s*\.select\('teacher_id'\)\s*\.eq\('class_id',\s*classId\)\s*\.order\('created_at',\s*\{\s*ascending:\s*true\s*\}\)/,
  );
  assert.match(api, /profile_photo_assets/);
});

test('AC-CATI-25: no Manage tab / tray / header invent from this card; office row stays on Manage pane', () => {
  const office = read('src/app/admin/class/[id].tsx');
  const manageIdx = office.indexOf("pane === 'manage'");
  const avatarIdx = office.indexOf('<ClassAvatarRow ');
  const teacherIdx = office.indexOf("pane === 'teacher'");
  assert.ok(manageIdx >= 0 && avatarIdx > manageIdx && avatarIdx < teacherIdx);
  assert.doesNotMatch(read('src/components/ui/ClassAvatarRow.tsx'), /tray|header icon|Manage tab/i);
});
