import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ASK_TOOL_POLICY,
  allowedAskToolNames,
  askActorSystemLine,
  filterAskToolDefs,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const grants = grantsFromAskDefaults();

test('A1 policy map covers every askTools TOOLS entry with matching capability/need', () => {
  const ask = read('src/lib/ai/askTools.ts');
  const toolsBlock = ask.slice(
    ask.indexOf('const TOOLS: Record<string, AskToolSpec> = {'),
    ask.indexOf('\n};\n\nfunction allowed'),
  );
  const names = [...toolsBlock.matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].map((m) => m[1]!);
  assert.ok(names.length >= 20, 'expected Ask tools in TOOLS');
  assert.deepEqual([...names].sort(), Object.keys(ASK_TOOL_POLICY).sort());

  for (const name of names) {
    const start = toolsBlock.indexOf(`  ${name}: {`);
    const next = names.find((other) => other !== name && toolsBlock.indexOf(`  ${other}: {`, start + 1) > start);
    const end = next ? toolsBlock.indexOf(`  ${next}: {`, start + 1) : toolsBlock.length;
    const block = toolsBlock.slice(start, end);
    const capRaw = block.match(/capability:\s*('[^']+'|null)/)?.[1] ?? null;
    const cap = capRaw === 'null' || capRaw == null ? null : capRaw.replace(/'/g, '');
    const needMatch = block.match(/need:\s*'([^']+)'/);
    const need = needMatch ? needMatch[1] : null;
    const policy = ASK_TOOL_POLICY[name]!;
    assert.equal(policy.capability, cap, `${name} capability`);
    assert.equal(policy.need, need, `${name} need`);
  }
});

test('A1 client askToolPolicy map matches Edge twin', () => {
  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  const clientMap = client.slice(client.indexOf('export const ASK_TOOL_POLICY'), client.indexOf('export type AskActorProfile'));
  const edgeMap = edge.slice(edge.indexOf('export const ASK_TOOL_POLICY'), edge.indexOf('/** Product defaults'));
  for (const name of Object.keys(ASK_TOOL_POLICY)) {
    assert.match(clientMap, new RegExp(`${name}:\\s*\\{`));
    assert.match(edgeMap, new RegExp(`${name}:\\s*\\{`));
    const entry = ASK_TOOL_POLICY[name]!;
    const snippet = entry.officeOnly
      ? `${name}:\\s*\\{[\\s\\S]*?officeOnly:\\s*true`
      : `${name}:\\s*\\{\\s*capability:\\s*${entry.capability == null ? 'null' : `'${entry.capability.replace('.', '\\.')}'`}`;
    assert.match(clientMap, new RegExp(snippet));
    assert.match(edgeMap, new RegExp(snippet));
  }
});

test('A1 teacher JWT policy drops add_teacher_to_class and office-only writes', () => {
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };

  assert.equal(isAskToolAllowed('add_teacher_to_class', teacher, grants), false);
  assert.equal(isAskToolAllowed('remove_teacher_from_class', teacher, grants), false);
  assert.equal(isAskToolAllowed('list_classes', teacher, grants), true);
  assert.equal(isAskToolAllowed('enroll_student', teacher, grants), true);
  assert.equal(isAskToolAllowed('add_parent_to_class', teacher, grants), true);

  for (const profile of [teacher, teacherAlsoAdmin]) {
    // Office walls — not widened by also_administrator (matches askTools / isOfficeRole).
    assert.equal(isAskToolAllowed('create_class', profile, grants), false);
    assert.equal(isAskToolAllowed('add_student', profile, grants), false);
    assert.equal(isAskToolAllowed('link_parent_student', profile, grants), false);
  }

  const requested = [
    { name: 'list_classes' },
    { name: 'add_teacher_to_class' },
    { name: 'create_class' },
    { name: 'invented_admin_tool' },
  ];
  const filtered = filterAskToolDefs(requested, teacher, grants);
  assert.deepEqual(
    filtered.map((t) => t.name),
    ['list_classes'],
  );
});

test('A1 student JWT policy drops roster/parent write tools', () => {
  const student = { role: 'student' as const };
  assert.equal(isAskToolAllowed('enroll_student', student, grants), false);
  assert.equal(isAskToolAllowed('add_student', student, grants), false);
  assert.equal(isAskToolAllowed('create_parent', student, grants), false);
  assert.equal(isAskToolAllowed('update_parent', student, grants), false);
  assert.equal(isAskToolAllowed('add_parent_to_class', student, grants), false);
  assert.equal(isAskToolAllowed('link_parent_student', student, grants), false);
  assert.equal(isAskToolAllowed('create_class', student, grants), false);
  assert.equal(isAskToolAllowed('add_teacher_to_class', student, grants), false);
  assert.equal(isAskToolAllowed('list_roster', student, grants), true);
  assert.equal(isAskToolAllowed('get_app_state', student, grants), true);

  const names = allowedAskToolNames(student, grants);
  assert.ok(!names.includes('create_parent'));
  assert.ok(!names.includes('enroll_student'));
  assert.ok(names.includes('open_screen'));
});

test('A1 office seat keeps school-need and officeOnly tools', () => {
  const admin = { role: 'administrator' as const };
  assert.equal(isAskToolAllowed('add_teacher_to_class', admin, grants), true);
  assert.equal(isAskToolAllowed('create_class', admin, grants), true);
  assert.equal(isAskToolAllowed('link_parent_student', admin, grants), true);
  assert.equal(isAskToolAllowed('add_student', admin, grants), true);
});

test('A1 unknown tool names are denied (fail closed)', () => {
  assert.equal(isAskToolAllowed('reset_password', { role: 'superintendent' }, grants), false);
  assert.equal(isAskToolAllowed('not_a_real_tool', { role: 'teacher' }, grants), false);
});

test('A1 actor system line names the signed-in profile only', () => {
  const line = askActorSystemLine({
    role: 'teacher',
    display_name: 'Maya Chen',
  });
  assert.match(line, /Act only as this signed-in Kelyra profile \(teacher, Maya Chen\)/);
  assert.match(line, /Never claim another role or user/);
});

test('A1 askTools allowed() delegates to askToolPolicy', () => {
  const ask = read('src/lib/ai/askTools.ts');
  assert.match(ask, /import \{ isAskToolAllowed \} from '@\/lib\/ai\/askToolPolicy'/);
  assert.match(ask, /return isAskToolAllowed\(spec\.def\.name, ctx\.profile, ctx\.grants\)/);
});

test('A1 ask-assistant handlers filter by policy after getUser (not raw body.tools)', () => {
  const edge = read('supabase/functions/ask-assistant/index.ts');
  assert.match(edge, /filterAskToolDefs\(requested/);
  assert.match(edge, /mergeAskGrants/);
  assert.match(edge, /askActorSystemLine/);
  assert.match(edge, /from\('profiles'\)/);
  assert.match(edge, /from\('capability_grants'\)/);
  assert.match(edge, /\(policy\)/);
  assert.doesNotMatch(edge, /SERVICE_ROLE|service_role/);
  assert.doesNotMatch(edge, /body\.role\b/);

  const actorAt = edge.indexOf('askActorSystemLine(');
  const instructionsAssign = edge.indexOf('extra.instructions');
  assert.ok(actorAt > 0 && instructionsAssign > actorAt);

  const dev = read('scripts/ai-dev-server.mjs');
  assert.match(dev, /filterAskToolDefs/);
  assert.match(dev, /mergeAskGrants/);
  assert.match(dev, /askActorSystemLine/);
  assert.match(dev, /from\('profiles'\)/);
  assert.match(dev, /from\('capability_grants'\)/);
  assert.match(dev, /\(policy\)/);
  assert.match(dev, /ask-assistant getUser=/);
  assert.match(dev, /from '\.\.\/supabase\/functions\/_shared\/askToolPolicy\.ts'/);
});
