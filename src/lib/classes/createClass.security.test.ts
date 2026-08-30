import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { isAdminRole, isOfficeRole, isStaffRole } from '../school/roles.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Q3 migration: create_school_class is office-only via is_school_admin', () => {
  const sql = read('supabase/migrations/20260826000004_office_only_create_school_class.sql');
  assert.match(sql, /create or replace function public\.create_school_class\(p_name text\)/i);
  assert.match(sql, /not public\.is_school_admin\(\)/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
  assert.match(sql, /teacher_id,\s*name,\s*name_source/i);
  assert.match(sql, /values\s*\(\s*null,\s*n,\s*'typed'\s*\)/i);
});

test('Q3 createClass fails closed: no client classes insert fallback', () => {
  const src = read('src/lib/classes/api.ts');
  const fn = src.slice(src.indexOf('export async function createClass'));
  const body = fn.slice(0, fn.indexOf('export async function listClassesForChildren'));
  assert.match(body, /rpc\('create_school_class'/);
  assert.match(body, /if \(rpc\.error\) throw/);
  assert.doesNotMatch(body, /\.from\('classes'\)\s*\.insert/);
  assert.doesNotMatch(body, /teacher_id:\s*null/);
});

test('Q3 home: teachers have no Create class; office only', () => {
  const src = read('src/app/index.tsx');
  assert.match(src, /canCreateClass\s*=\s*isOfficeRole\(profile\)/);
  assert.doesNotMatch(src, /canCreateClass\s*=\s*teaches\s*\|\|/);
  assert.match(src, /The office assigns the classes you teach/);
  assert.match(src, /if \(isOfficeRole\(profile\)\) router\.replace\(`\/admin\/class\/\$\{created\.id\}`\)/);
});

test('Q3 Ask create_class is office-gated; matrix teachers cannot create', () => {
  const ask = read('src/lib/ai/askTools.ts');
  assert.match(ask, /return isAskToolAllowed\(spec\.def\.name, ctx\.profile, ctx\.grants\)/);
  assert.match(ask, /Only the office can create a class/);
  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(
    policy,
    /create_class:\s*\{\s*capability:\s*'classes\.create',\s*need:\s*null,\s*officeOnly:\s*true/,
  );
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(
    matrix,
    /id:\s*'classes\.create'[\s\S]*?teacher:\s*'none'/,
  );
});

test('Q7: Jacquee teacher / also_administrator fail isOfficeRole (Ask + home wall)', () => {
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  const officeAdmin = { role: 'administrator' as const };
  const officeSuper = { role: 'superintendent' as const };

  assert.equal(isOfficeRole(teacher), false);
  assert.equal(isOfficeRole(teacherAlsoAdmin), false);
  assert.equal(isOfficeRole(officeAdmin), true);
  assert.equal(isOfficeRole(officeSuper), true);

  // is_staff / also_administrator must not mint classes — office seat only.
  assert.equal(isStaffRole(teacher), true);
  assert.equal(isAdminRole(teacherAlsoAdmin), true);
  assert.equal(isAdminRole(teacher), false);
});

test('Q7 Ask: create_class office gate runs before capability-null fail-open', () => {
  const policy = read('src/lib/ai/askToolPolicy.ts');
  const allowedStart = policy.indexOf('export function isAskToolAllowed');
  assert.ok(allowedStart > 0);
  const allowedBody = policy.slice(allowedStart, policy.indexOf('export function allowedAskToolNames', allowedStart));
  const officeGate = allowedBody.indexOf('if (policy.officeOnly)');
  const nullOpen = allowedBody.indexOf('if (!policy.capability) return true');
  assert.ok(officeGate > 0, 'officeOnly gate missing');
  assert.ok(nullOpen > 0, 'capability-null short-circuit missing');
  assert.ok(officeGate < nullOpen, 'officeOnly must be gated before capability-null fail-open');
  assert.match(allowedBody.slice(officeGate, allowedBody.indexOf('\n', officeGate)), /isOfficeRole\(profile\)/);
  assert.doesNotMatch(allowedBody.slice(officeGate, nullOpen), /isStaffRole|isAdminRole/);
  assert.match(
    policy,
    /create_class:\s*\{\s*capability:\s*'classes\.create',\s*need:\s*null,\s*officeOnly:\s*true/,
  );
});

test('Q7 Ask: create_class run fails closed for non-office; no is_staff path', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const toolStart = ask.indexOf('create_class: {');
  const toolEnd = ask.indexOf('list_class_teachers:', toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  assert.match(tool, /capability:\s*'classes\.create'/);
  assert.match(tool, /Office only/);
  assert.match(tool, /if \(!isOfficeRole\(ctx\.profile\)\) return \{ error: 'Only the office can create a class\.' \}/);
  const officeCheck = tool.indexOf('isOfficeRole(ctx.profile)');
  const createCall = tool.indexOf('await createClass(');
  assert.ok(officeCheck > 0 && createCall > officeCheck);
  assert.doesNotMatch(tool, /is_staff|isStaffRole|isAdminRole/);
});

test('Q7: matrix also_administrator would widen classes.create — Ask must not ride can()', () => {
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(matrix, /if \(profile\.also_administrator\) levels\.push\(row\.administrator\)/);
  assert.match(
    matrix,
    /id:\s*'classes\.create'[\s\S]*?administrator:\s*'own'[\s\S]*?teacher:\s*'none'/,
  );

  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(
    policy,
    /create_class:\s*\{\s*capability:\s*'classes\.create',\s*need:\s*null,\s*officeOnly:\s*true/,
  );
  const allowedStart = policy.indexOf('export function isAskToolAllowed');
  const allowedBody = policy.slice(allowedStart, policy.indexOf('export function allowedAskToolNames', allowedStart));
  const officeGate = allowedBody.indexOf('if (policy.officeOnly)');
  assert.ok(officeGate > 0);
  assert.match(allowedBody.slice(officeGate, allowedBody.indexOf('\n', officeGate)), /isOfficeRole/);
  assert.doesNotMatch(allowedBody.slice(officeGate, allowedBody.indexOf('if (!policy.capability)')), /\bcan\(/);
});

test('Q7: no leftover client create_school_class / classes insert path', () => {
  const api = read('src/lib/classes/api.ts');
  assert.equal((api.match(/create_school_class/g) || []).length, 1);
  assert.doesNotMatch(api, /\.from\('classes'\)\s*\.insert/);

  const ask = read('src/lib/ai/askTools.ts');
  assert.match(ask, /await createClass\(name\)/);
  assert.doesNotMatch(ask, /rpc\('create_school_class'/);
  assert.doesNotMatch(ask, /\.from\('classes'\)\s*\.insert/);

  const prompt = read('src/lib/ai/askPrompt.ts');
  assert.match(prompt, /You never create a class/);
});
