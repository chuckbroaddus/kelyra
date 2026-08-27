import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { isAdminRole, isOfficeRole } from '../school/roles.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Q8 migration: can_link_parent_student is office-only via is_school_admin', () => {
  const sql = read('supabase/migrations/20260826000007_office_only_can_link_parent_student.sql');
  assert.match(sql, /create or replace function public\.can_link_parent_student\(\)/i);
  const body = sql.slice(sql.indexOf('as $$'), sql.indexOf('$$;', sql.indexOf('as $$')));
  assert.match(body, /select public\.is_school_admin\(\)/i);
  assert.doesNotMatch(body, /also_administrator|is_staff|role in/);
});

test('Q8: Jacquee teacher / also_administrator fail isOfficeRole (Ask wall)', () => {
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  const officeAdmin = { role: 'administrator' as const };
  const officeSuper = { role: 'superintendent' as const };

  assert.equal(isOfficeRole(teacher), false);
  assert.equal(isOfficeRole(teacherAlsoAdmin), false);
  assert.equal(isOfficeRole(officeAdmin), true);
  assert.equal(isOfficeRole(officeSuper), true);

  // is_staff / also_administrator must not mint family links — office seat only.
  assert.equal(isAdminRole(teacherAlsoAdmin), true);
  assert.equal(isAdminRole(teacher), false);
});

test('Q8: matrix also_administrator / parents.invite would widen — Ask must not ride can()', () => {
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(matrix, /if \(profile\.also_administrator\) levels\.push\(row\.administrator\)/);
  assert.match(
    matrix,
    /id:\s*'accounts\.link_parent'[\s\S]*?administrator:\s*'school'[\s\S]*?teacher:\s*'none'/,
  );
  assert.match(
    matrix,
    /id:\s*'parents\.invite'[\s\S]*?teacher:\s*'own'/,
  );

  const ask = read('src/lib/ai/askTools.ts');
  const allowedStart = ask.indexOf('function allowed(spec: AskToolSpec, ctx: AskToolContext)');
  const allowedBody = ask.slice(allowedStart, ask.indexOf('function labelFor', allowedStart));
  const linkIdx = allowedBody.indexOf("spec.def.name === 'link_parent_student'");
  const linkGateLine = allowedBody.slice(linkIdx, allowedBody.indexOf('\n', linkIdx));
  assert.match(linkGateLine, /isOfficeRole/);
  assert.doesNotMatch(linkGateLine, /\bcan\(|parents\.invite/);
});

test('Q8 Ask: link_parent_student office gate runs before capability-null fail-open', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const allowedStart = ask.indexOf('function allowed(spec: AskToolSpec, ctx: AskToolContext)');
  assert.ok(allowedStart > 0);
  const allowedBody = ask.slice(allowedStart, ask.indexOf('function labelFor', allowedStart));
  const linkGate = allowedBody.indexOf("spec.def.name === 'link_parent_student'");
  const nullOpen = allowedBody.indexOf('if (!spec.capability) return true');
  assert.ok(linkGate > 0, 'link_parent_student allowed gate missing');
  assert.ok(nullOpen > 0, 'capability-null short-circuit missing');
  assert.ok(linkGate < nullOpen, 'link_parent_student must be gated before capability-null fail-open');
  const linkGateLine = allowedBody.slice(linkGate, allowedBody.indexOf('\n', linkGate));
  assert.match(linkGateLine, /isOfficeRole\(ctx\.profile\)/);
  assert.doesNotMatch(linkGateLine, /isStaffRole|isAdminRole|\bcan\(|parents\.invite/);
  assert.doesNotMatch(allowedBody, /\bcan\(ctx\.profile,\s*'parents\.invite'/);
});

test('Q8 Ask: link_parent_student run fails closed for non-office; no parents.invite OR', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const toolStart = ask.indexOf('link_parent_student: {');
  const toolEnd = ask.indexOf('add_parent_to_class:', toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  assert.match(tool, /capability:\s*'accounts\.link_parent'/);
  assert.match(tool, /Office only/);
  assert.match(tool, /if \(!isOfficeRole\(ctx\.profile\)\) return \{ error: 'Only the office can link a parent to a child\.' \}/);
  const officeCheck = tool.indexOf('isOfficeRole(ctx.profile)');
  const linkCall = tool.indexOf('await linkChild(');
  assert.ok(officeCheck > 0 && linkCall > officeCheck);
  assert.doesNotMatch(tool, /parents\.invite|is_staff|isStaffRole|isAdminRole/);
});

test('Q8 Ask: add_parent_to_class stays teacher parents.invite; not family identity', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const toolStart = ask.indexOf('add_parent_to_class: {');
  const toolEnd = ask.indexOf('add_student:', toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  assert.match(tool, /capability:\s*'parents\.invite'/);
  assert.match(tool, /await addParentToClass\(/);
  assert.doesNotMatch(tool, /linkChild|admin_set_parent_link|isOfficeRole/);
});

test('Q8 linkChild: no parent_students insert fallback past office RPC', () => {
  const src = read('src/lib/parents/api.ts');
  const fn = src.slice(src.indexOf('export async function linkChild'));
  const body = fn.slice(0, fn.indexOf('export async function createParentInvite'));
  assert.match(body, /rpc\('admin_set_parent_link'/);
  assert.match(body, /if \(error\) throw/);
  assert.doesNotMatch(body, /\.from\('parent_students'\)\s*\.insert/);
});

test('Q8 askPrompt: teachers told not to mint family links; photo map office-gates tool', () => {
  const prompt = read('src/lib/ai/askPrompt.ts');
  assert.match(prompt, /You never link who is a parent of which child/);
  assert.match(prompt, /link_parent_student only if that tool is listed \(office\)/);
});
