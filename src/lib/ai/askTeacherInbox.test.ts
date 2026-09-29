/**
 * AC-ASK-INBOX-1..3 — teacher who can open /inbox can list_inbox from Ask.
 * Source + policy assertions (no live network).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ASK_TOOL_POLICY,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();
const grants = grantsFromAskDefaults();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function listInboxRunBlock(): string {
  const ask = read('src/lib/ai/askTools.ts');
  const start = ask.indexOf('  list_inbox: {');
  assert.ok(start >= 0, 'list_inbox tool missing');
  const end = ask.indexOf('\n  list_my_practice:', start);
  assert.ok(end > start, 'list_inbox block end missing');
  return ask.slice(start, end);
}

test('AC-ASK-INBOX-1 list_inbox stays; calls listInbox; empty list is success path', () => {
  const block = listInboxRunBlock();
  assert.match(block, /name:\s*["']list_inbox["']/);
  assert.match(block, /listInbox\(/);
  assert.match(block, /items\.slice\(0,\s*40\)/);
  // No Approve / delete / send from this tool.
  assert.doesNotMatch(block, /approveCapture|deleteCapture|sendMessage|send_message/);
});

test('AC-ASK-INBOX-1/2 Teach seat lists without teacherId / Teacher seat required refusal', () => {
  const block = listInboxRunBlock();
  // DITL finding: !teacherId returned "Teacher seat required." while /inbox worked.
  assert.doesNotMatch(block, /Teacher seat required/i);
  assert.doesNotMatch(block, /teacher seat required/i);
  assert.doesNotMatch(block, /if\s*\(\s*!ctx\.teacherId\s*\)/);
  // Active chrome Teach seat is the wall (same as /inbox tray). Empty list still calls listInbox.
  assert.match(block, /ctx\.live\.role\s*!==\s*['"]teacher['"]/);
  assert.match(block, /listInbox\(/);
  const askScreen = read('src/app/ask.tsx');
  assert.match(
    askScreen,
    /teacherId:\s*teacher\?\.id\s*\?\?\s*\(askRole\s*===\s*['"]teacher['']\s*\?\s*profile\?\.id/,
  );
});

test('AC-ASK-INBOX-3 student and parent cannot list; office-only stays out; also_teacher may', () => {
  assert.equal(ASK_TOOL_POLICY.list_inbox?.capability, 'capture.use');
  assert.equal(ASK_TOOL_POLICY.list_inbox?.teacherSeatOnly, undefined);

  assert.equal(isAskToolAllowed('list_inbox', { role: 'teacher' }, grants), true);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'student' }, grants), false);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'parent' }, grants), false);
  // Office-only: capture.use none.
  assert.equal(isAskToolAllowed('list_inbox', { role: 'administrator' }, grants), false);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'superintendent' }, grants), false);
  // Dual-hat: policy may offer via also_teacher / teacher job; live.role enforces Teach seat.
  assert.equal(
    isAskToolAllowed('list_inbox', { role: 'administrator', also_teacher: true }, grants),
    true,
  );
  assert.equal(
    isAskToolAllowed('list_inbox', { role: 'teacher', parent_id: 'p1' }, grants),
    true,
  );
  assert.equal(
    isAskToolAllowed('list_inbox', { role: 'parent', also_teacher: true }, grants),
    true,
  );

  const ask = read('src/lib/ai/askTools.ts');
  const allowedFn = ask.slice(ask.indexOf('function allowed('), ask.indexOf('function labelFor('));
  assert.match(allowedFn, /list_inbox/);
  assert.match(allowedFn, /ctx\.live\.role\s*!==\s*['"]teacher['"]/);
  // run() also refuses non-Teach seats (parent/office active seat stay out).
  const block = listInboxRunBlock();
  assert.match(block, /Needs inbox is only on the Teach seat/);
});

test('AC-ASK-INBOX do not weaken teacherSeatOnly on other Ask tools', () => {
  for (const name of [
    'scan_class_syllabus',
    'get_class_syllabus_draft',
    'discard_class_syllabus_draft',
    'explain_capture',
    'discard_explain_draft',
    'attach_explain_as_note',
  ]) {
    assert.equal(ASK_TOOL_POLICY[name]?.teacherSeatOnly, true, name);
    assert.equal(isAskToolAllowed(name, { role: 'administrator' }, grants), false, name);
    assert.equal(isAskToolAllowed(name, { role: 'student' }, grants), false, name);
  }
  // Client + Edge twins keep list_inbox without teacherSeatOnly; others unchanged.
  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  assert.match(client, /list_inbox:\s*\{\s*capability:\s*'capture\.use',\s*need:\s*null\s*\}/);
  assert.match(edge, /list_inbox:\s*\{\s*capability:\s*'capture\.use',\s*need:\s*null\s*\}/);
  assert.match(client, /scan_class_syllabus:[\s\S]*?teacherSeatOnly:\s*true/);
  assert.match(edge, /scan_class_syllabus:[\s\S]*?teacherSeatOnly:\s*true/);
});
