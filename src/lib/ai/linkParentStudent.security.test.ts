import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { isAdminRole, isOfficeRole } from '../school/roles.ts';
import {
  allowedAskToolNames,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';

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

  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(
    policy,
    /link_parent_student:\s*\{\s*capability:\s*'accounts\.link_parent',\s*need:\s*null,\s*officeOnly:\s*true/,
  );
  const allowedStart = policy.indexOf('export function isAskToolAllowed');
  const allowedBody = policy.slice(allowedStart, policy.indexOf('export function allowedAskToolNames', allowedStart));
  const officeGate = allowedBody.indexOf('if (policy.officeOnly)');
  assert.ok(officeGate > 0);
  // Only the officeOnly return arm — later teacherSeatOnly/familyRead arms may call can().
  const officeReturnEnd = allowedBody.indexOf(';', officeGate) + 1;
  assert.ok(officeReturnEnd > officeGate);
  const officeOnlyArm = allowedBody.slice(officeGate, officeReturnEnd);
  assert.match(officeOnlyArm, /return isOfficeRole\(profile\)/);
  assert.doesNotMatch(officeOnlyArm, /\bcan\(|parents\.invite|isStaffRole|isAdminRole/);
});

test('Q8 Ask: link_parent_student office gate runs before capability-null fail-open', () => {
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
  assert.doesNotMatch(allowedBody.slice(officeGate, nullOpen), /isStaffRole|isAdminRole|parents\.invite/);
  assert.match(
    policy,
    /link_parent_student:\s*\{\s*capability:\s*'accounts\.link_parent',\s*need:\s*null,\s*officeOnly:\s*true/,
  );
  const ask = read('src/lib/ai/askTools.ts');
  assert.match(ask, /return isAskToolAllowed\(spec\.def\.name, ctx\.profile, ctx\.grants\)/);
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

test('F06 Ask: create_parent skips student→linkChild unless isOfficeRole; no is_staff ride', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const toolStart = ask.indexOf('create_parent: {');
  const toolEnd = ask.indexOf('update_parent:', toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  assert.match(tool, /capability:\s*'parents\.invite'/);
  assert.match(tool, /Teachers never mint family links/);
  assert.match(tool, /if \(isOfficeRole\(ctx\.profile\)\)/);
  const officeGate = tool.indexOf('if (isOfficeRole(ctx.profile))');
  const createCall = tool.indexOf('await createParent(');
  assert.ok(officeGate > 0 && createCall > officeGate, 'office gate must precede createParent');
  // Non-office must not resolve student_id/name into createParent.studentId.
  const officeBlock = tool.slice(officeGate, tool.indexOf('} else if', officeGate));
  assert.match(officeBlock, /student_id|student_name/);
  const nonOfficeNote = tool.slice(tool.indexOf('} else if', officeGate), createCall);
  assert.match(nonOfficeNote, /Only the office can link a parent to a child/);
  assert.doesNotMatch(tool, /is_staff|isStaffRole|isAdminRole|also_administrator/);
  // createParent still receives studentId only from the office-gated binding.
  const createArgs = tool.slice(createCall, tool.indexOf('});', createCall));
  assert.match(createArgs, /studentId/);
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
  assert.match(prompt, /never mint the family link/);
});


test('F05 UI: parent card canLinkChildren is isOfficeRole, not isAdminRole', () => {
  const src = read('src/app/class/[id]/parent/[parentId].tsx');
  assert.match(src, /canLinkChildren\s*=\s*isOfficeRole\(profile\)/);
  assert.doesNotMatch(src, /canLinkChildren\s*=\s*isAdminRole\(profile\)/);
  assert.match(src, /import \{[^}]*isOfficeRole[^}]*\} from '@\/lib\/school\/roles'/);
});

test('F05 UI: student card canLinkParents is isOfficeRole, not isAdminRole', () => {
  const src = read('src/app/class/[id]/student/[studentId].tsx');
  assert.match(src, /canLinkParents\s*=\s*isOfficeRole\(profile\)/);
  assert.doesNotMatch(src, /canLinkParents\s*=\s*isAdminRole\(profile\)/);
  assert.match(src, /import \{[^}]*isOfficeRole[^}]*\} from '@\/lib\/school\/roles'/);
});

test('T10 behavioral: teacher / also_administrator omit link_parent_student; keep add_parent_to_class', () => {
  const grants = grantsFromAskDefaults();
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  const office = { role: 'administrator' as const };

  for (const profile of [teacher, teacherAlsoAdmin]) {
    assert.equal(isAskToolAllowed('link_parent_student', profile, grants), false);
    assert.equal(isAskToolAllowed('add_parent_to_class', profile, grants), true);
    const names = allowedAskToolNames(profile, grants);
    assert.ok(!names.includes('link_parent_student'), JSON.stringify(names));
    assert.ok(names.includes('add_parent_to_class'));
  }

  assert.equal(isAskToolAllowed('link_parent_student', office, grants), true);
  assert.ok(allowedAskToolNames(office, grants).includes('link_parent_student'));
});

