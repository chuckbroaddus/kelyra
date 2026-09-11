import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { isOfficeRole } from '../school/roles.ts';
import {
  allowedAskToolNames,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('classes.delete matrix: teacher none; office school', () => {
  const matrix = read('src/lib/school/matrix.ts');
  const line = matrix.split('\n').find((row) => row.includes("id: 'classes.delete'"));
  assert.ok(line, 'classes.delete row missing');
  assert.match(line, /superintendent:\s*'school'/);
  assert.match(line, /administrator:\s*'school'/);
  assert.match(line, /teacher:\s*'none'/);
  assert.doesNotMatch(line, /teacher:\s*'own'/);

  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  assert.equal(isOfficeRole(teacher), false);
  assert.equal(isOfficeRole(teacherAlsoAdmin), false);
  assert.equal(isOfficeRole({ role: 'administrator' }), true);
});

test('desk: class swipe requires officeSeat + classes.delete; Teach dual-hat cannot delete', () => {
  const src = read('src/app/index.tsx');
  assert.match(src, /canDeleteClass\s*=\s*officeSeat\s*&&\s*can\(profile,\s*'classes\.delete',\s*'school'/);
  assert.match(src, /trailing=\{\s*canDeleteClass/);
  assert.doesNotMatch(src, /classes\.delete',\s*teacherSeat \? 'own'/);
});

test('hamburger: class Delete swipe gated to office + classes.delete; never teacher seat', () => {
  const src = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(
    src,
    /officeSeat\s*&&\s*can\(profile,\s*'classes\.delete',\s*'school',\s*grants\)/,
  );
  const mapStart = src.indexOf('chromeState.classes.filter');
  assert.ok(mapStart > 0);
  assert.match(src, /!teacherSeat\s*\?\s*chromeState\.classes\.filter/);
  const map = src.slice(mapStart, src.indexOf('teacherSeat && matches(\'Classes\'', mapStart));
  assert.match(map, /officeSeat\s*&&\s*can\(profile,\s*'classes\.delete'/);
  assert.doesNotMatch(map, /trailing=\{\[/);
});

test('setup: Delete class gated to office/admin + classes.delete', () => {
  const src = read('src/app/class/[id]/setup.tsx');
  assert.match(
    src,
    /klass\s*&&\s*office\s*&&\s*can\(profile,\s*'classes\.delete',\s*'school',\s*grants\)/,
  );
  assert.match(src, /label="Delete class"/);
});

test('RPC teacher_delete_class is office-only via is_school_admin; teachers get Not found', () => {
  const sql = read('supabase/migrations/20260911000002_office_only_teacher_delete_class.sql');
  assert.match(sql, /create or replace function public\.teacher_delete_class\(p_class_id uuid\)/i);
  assert.match(sql, /not public\.is_school_admin\(\)/);
  assert.match(sql, /raise exception 'Not found'/);
  assert.doesNotMatch(sql, /teaches_class/);
  assert.doesNotMatch(sql, /is_staff_profile/);
  const client = read('src/lib/classes/delete.ts');
  assert.match(client, /rpc\('teacher_delete_class'/);
});

test('Ask delete_class is office-gated; teacher / also_administrator denied', () => {
  const grants = grantsFromAskDefaults();
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  const office = { role: 'administrator' as const };

  assert.equal(isAskToolAllowed('delete_class', teacher, grants), false);
  assert.equal(isAskToolAllowed('delete_class', teacherAlsoAdmin, grants), false);
  assert.equal(isAskToolAllowed('delete_class', office, grants), true);

  const teacherNames = allowedAskToolNames(teacher, grants);
  const alsoNames = allowedAskToolNames(teacherAlsoAdmin, grants);
  const officeNames = allowedAskToolNames(office, grants);
  assert.ok(!teacherNames.includes('delete_class'));
  assert.ok(!alsoNames.includes('delete_class'));
  assert.ok(officeNames.includes('delete_class'));

  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(
    policy,
    /delete_class:\s*\{\s*capability:\s*'classes\.delete',\s*need:\s*null,\s*officeOnly:\s*true/,
  );
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  assert.match(edge, /'classes\.delete':\s*\{[^}]*teacher:\s*'none'/);
  const ask = read('src/lib/ai/askTools.ts');
  const toolStart = ask.indexOf('delete_class: {');
  const toolEnd = ask.indexOf('delete_parent:', toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  assert.match(tool, /Office only/);
  assert.match(tool, /if \(!isOfficeRole\(ctx\.profile\)\)/);
  const prompt = read('src/lib/ai/askPrompt.ts');
  assert.match(prompt, /You never delete a class/);
});

test('docs: teachers never delete classes; office/admin only', () => {
  const docs = read('docs/ui-design.md');
  assert.match(docs, /Teachers never delete classes/);
  assert.match(docs, /office\/admin only/);
  assert.match(docs, /Teach seat dual-hat has no swipe/);
});
