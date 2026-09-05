import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const edge = 'supabase/functions/publish-lesson-pack/index.ts';
const api = 'src/lib/lessons/api.ts';
const helper = 'src/lib/lessons/publishLessonPack.ts';

test('publish-lesson-pack is registered with verify_jwt true', () => {
  const toml = read('supabase/config.toml');
  assert.match(toml, /\[functions\.publish-lesson-pack\]\s*\nverify_jwt\s*=\s*true/);
});

test('teacher / also_teacher / office allowed; parent / student denied; not is_staff / class_teachers', () => {
  const src = read(edge);
  const policy = read('supabase/functions/_shared/publishLessonPackPolicy.ts');
  assert.match(src, /canPublish/);
  assert.match(policy, /export function canPublish/);
  assert.match(policy, /role === 'teacher'/);
  assert.match(policy, /also_teacher/);
  assert.match(policy, /superintendent/);
  assert.match(policy, /administrator/);
  assert.match(src, /teacher or office seat required/);
  assert.match(src, /status:\s*401|json\(\{ error: 'teacher or office seat required' \}, 401\)/);

  const canAt = policy.indexOf('export function canPublish');
  const canBody = policy.slice(canAt, policy.indexOf('\n}', canAt) + 2);
  assert.doesNotMatch(canBody, /is_staff|is_staff_profile|class_teachers/);
  assert.doesNotMatch(src, /is_staff_profile|isStaffRole\(/);
  assert.doesNotMatch(policy, /isStaffRole|is_staff_profile/);

  // Parent/student fall through canPublish → 401 (not granted by role alone).
  assert.ok(canBody.includes("role === 'teacher'"));
  assert.ok(!canBody.includes("role === 'parent'"));
  assert.ok(!canBody.includes("role === 'student'"));
});

test('published: false always present in upsert payload; never a caller field', () => {
  const src = read(edge);
  assert.match(src, /published:\s*false/);
  assert.ok(src.includes(".from('lesson_packs').upsert"), 'must upsert lesson_packs');
  const packRowAt = src.indexOf('const packRow = {');
  assert.ok(packRowAt > 0);
  const packRow = src.slice(packRowAt, src.indexOf('};', packRowAt) + 2);
  assert.match(packRow, /published:\s*false/);
  assert.doesNotMatch(src, /fields\.published|body\.published|form\.get\('published'\)/);

  const helperSrc = read(helper);
  assert.match(helperSrc, /published:\s*false/);
  assert.doesNotMatch(helperSrc, /SERVICE_ROLE|service_role|serviceRole/);
});

test('quota over 12,304,812 bytes returns 413', () => {
  const src = read(edge);
  assert.match(src, /12_304_812|12304812/);
  assert.match(src, /413/);
  assert.match(src, /bytes > MAX_BYTES/);
});

test('live FoM refuse without office + replace_live', () => {
  const src = read(edge);
  const policy = read('supabase/functions/_shared/publishLessonPackPolicy.ts');
  assert.match(src, /isLiveFomDeckId|LIVE_FOM_DECK/);
  assert.match(src, /isLiveFomStoragePath|LIVE_FOM_STORAGE/);
  assert.match(policy, /fom-ch01/);
  assert.match(policy, /LIVE_FOM_DECK/);
  assert.match(src, /replace_live/);
  assert.match(src, /isOfficeRole/);
  assert.match(src, /409/);
  assert.match(src, /live FoM is protected/);
  const liveAt = src.indexOf('const liveHit');
  assert.ok(liveAt > 0);
  const liveGate = src.slice(liveAt, liveAt + 350);
  assert.match(liveGate, /office && fields\.replace_live/);
});

test('shared-folder lock refuses teacher without office replace_live', () => {
  const src = read(edge);
  assert.match(src, /shared-folder lock/);
  assert.match(src, /storage_deck_id/);
  assert.match(src, /\.neq\('deck_id'/);
});

test('service role writes storage + catalog; never returned; no storage.objects policy added', () => {
  const src = read(edge);
  assert.match(src, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(src, /x-upsert/);
  assert.match(src, /storage\/v1\/object\/lessons/);
  // Response bodies must not include the key (Authorization header use is fine).
  assert.doesNotMatch(src, /return json\(\{[^}]*SERVICE_ROLE|return json\(\{[^}]*serviceKey/i);
  assert.doesNotMatch(src, /published:\s*true/);

  // No migration in this change may add lessons bucket policies.
  const migrations = readdirSync(join(root, 'supabase/migrations')).filter(
    (name) => name.includes('publish') || name.includes('lesson_pack'),
  );
  for (const name of migrations) {
    const sql = read(`supabase/migrations/${name}`);
    assert.doesNotMatch(
      sql,
      /create policy[\s\S]*storage\.objects[\s\S]*lessons|bucket_id\s*=\s*'lessons'[\s\S]*create policy/i,
    );
  }

  // Existing wall comment still present; function must not invent policies.
  const wall = read('supabase/migrations/20260824000001_lesson_assignments.sql');
  assert.match(wall, /No storage\.objects policies for bucket `lessons`/);
  assert.doesNotMatch(src, /create policy[\s\S]*storage\.objects/);
});

test('CORS OPTIONS 204 like student-open-lesson; required files; kind lesson', () => {
  const src = read(edge);
  assert.match(src, /req\.method === 'OPTIONS'/);
  assert.match(src, /status:\s*204/);
  assert.match(src, /index\.html required/);
  assert.match(src, /manifest\.json required/);
  assert.match(src, /kind must be lesson/);
  assert.match(src, /png-original|ava-original|eve-staging/);
});

test('listLessonPacks keeps published=true filter; assignLesson / loadPackSlice do not', () => {
  const src = read(api);
  const listAt = src.indexOf('export async function listLessonPacks');
  const listEnd = src.indexOf('export async function', listAt + 1);
  const listBody = src.slice(listAt, listEnd);
  assert.match(listBody, /\.eq\('published',\s*true\)/);

  const loadAt = src.indexOf('async function loadPackSlice');
  const loadEnd = src.indexOf('export type LessonAssignFields', loadAt);
  const loadBody = src.slice(loadAt, loadEnd > loadAt ? loadEnd : loadAt + 500);
  assert.doesNotMatch(loadBody, /published/);

  const assignAt = src.indexOf('export async function assignLesson');
  const assignEnd = src.indexOf('export async function assignLessonToStudent', assignAt);
  const assignBody = src.slice(assignAt, assignEnd);
  assert.doesNotMatch(assignBody, /published/);
  assert.match(assignBody, /loadPackSlice/);
});

test('client helper uses user JWT only; not an Ask tool', () => {
  const src = read(helper);
  assert.match(src, /publish-lesson-pack/);
  assert.match(src, /getSession|access_token/);
  assert.match(src, /Authorization.*Bearer/);
  assert.doesNotMatch(src, /SERVICE_ROLE|service_role|EXPO_PUBLIC_.*SECRET/);
  assert.doesNotMatch(src, /published:\s*true/);
  assert.doesNotMatch(src, /\bassignLesson\s*\(/);

  const askTools = read('src/lib/ai/askTools.ts');
  assert.doesNotMatch(askTools, /publish_lesson|publishLessonPack|publish-lesson-pack/);
  const askPolicy = read('src/lib/ai/askToolPolicy.ts');
  assert.doesNotMatch(askPolicy, /publish_lesson/);
});

import {
  canPublish,
  isLiveFomDeckId,
  isLiveFomHit,
  isLiveFomStoragePath,
  mayReplaceProtectedPack,
  type ProfileHats,
} from '../../../supabase/functions/_shared/publishLessonPackPolicy.ts';

test('T26 behavioral: canPublish role-hat fixtures (teacher/office yes; parent/student/anon no)', () => {
  const yes: ProfileHats[] = [
    { role: 'teacher' },
    { role: 'administrator' },
    { role: 'superintendent' },
    { role: 'parent', also_teacher: true },
    { role: 'student', also_teacher: true },
  ];
  const no: ProfileHats[] = [
    null as unknown as ProfileHats,
    {},
    { role: 'parent' },
    { role: 'student' },
    { role: 'teacher', also_administrator: true }, // still teacher → yes actually
  ];
  for (const p of yes) assert.equal(canPublish(p), true, JSON.stringify(p));
  assert.equal(canPublish(null), false);
  assert.equal(canPublish(undefined), false);
  assert.equal(canPublish({}), false);
  assert.equal(canPublish({ role: 'parent' }), false);
  assert.equal(canPublish({ role: 'student' }), false);
  // also_administrator alone on teacher still publishes via role===teacher
  assert.equal(canPublish({ role: 'teacher', also_administrator: true }), true);
});

test('T26 behavioral: live FoM + shared lock need office replace_live', () => {
  assert.equal(isLiveFomDeckId('fom-ch01'), true);
  assert.equal(isLiveFomDeckId('fom-ch01-s3'), true);
  assert.equal(isLiveFomDeckId('fom-ch01-test'), false);
  assert.equal(isLiveFomStoragePath('fom-ch01', 'v4'), true);
  assert.equal(isLiveFomStoragePath('fom-ch01', 'v5'), false);
  assert.equal(isLiveFomHit('fom-ch01', 'other', 'v1'), true);

  const teacher = { role: 'teacher' as const };
  const office = { role: 'administrator' as const };
  assert.equal(mayReplaceProtectedPack(teacher, true), false);
  assert.equal(mayReplaceProtectedPack(office, false), false);
  assert.equal(mayReplaceProtectedPack(office, true), true);
  assert.equal(mayReplaceProtectedPack({ role: 'parent' }, true), false);
});

test('T26 Edge still imports shared publishLessonPackPolicy (no local canPublish)', () => {
  const src = read(edge);
  assert.match(src, /from '\.\.\/_shared\/publishLessonPackPolicy\.ts'/);
  assert.doesNotMatch(src, /function canPublish/);
  assert.doesNotMatch(src, /const LIVE_FOM_STORAGE/);
});
