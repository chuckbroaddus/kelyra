/**
 * AC-ASK-INBOX-1..3 — teacher who can open /inbox can list_inbox from Ask.
 * Behavioral (mocked listInbox) + source/policy walls. No live model calls.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  isListInboxTeachSeat,
  runAskListInbox,
  type AskListInboxCapture,
} from './askListInbox.ts';
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

function listInboxWiring(): string {
  const ask = read('src/lib/ai/askTools.ts');
  const start = ask.indexOf('  list_inbox: {');
  assert.ok(start >= 0, 'list_inbox tool missing');
  const end = ask.indexOf('\n  list_my_practice:', start);
  assert.ok(end > start, 'list_inbox block end missing');
  return ask.slice(start, end);
}

const sampleItems: AskListInboxCapture[] = [
  {
    id: 'cap-1',
    status: 'draft',
    ai_status: 'ready',
    student_id: 'stu-1',
    matchedName: 'Jordan Lee',
  },
];

test('AC-ASK-INBOX-1 Teach seat lists inbox even when teacherId is null', async () => {
  let calledWith: string | null = null;
  const result = await runAskListInbox(
    {},
    { live: { role: 'teacher' }, classId: 'class-math-3' },
    {
      listInbox: async (classId) => {
        calledWith = classId;
        return sampleItems;
      },
    },
  );
  assert.equal(calledWith, 'class-math-3');
  assert.equal(result.class_id, 'class-math-3');
  assert.deepEqual(result.items, [
    {
      id: 'cap-1',
      status: 'draft',
      ai_status: 'ready',
      student_id: 'stu-1',
      matched_name: 'Jordan Lee',
    },
  ]);
  assert.equal('error' in result, false);
  assert.doesNotMatch(JSON.stringify(result), /teacher seat required/i);
});

test('AC-ASK-INBOX-1 empty capture list is success, not refusal', async () => {
  const result = await runAskListInbox(
    { class_id: 'class-empty' },
    { live: { role: 'teacher' }, classId: null },
    { listInbox: async () => [] },
  );
  assert.equal(result.class_id, 'class-empty');
  assert.deepEqual(result.items, []);
  assert.equal('error' in result, false);
});

test('AC-ASK-INBOX-1 passed class_id wins over open class', async () => {
  let calledWith: string | null = null;
  await runAskListInbox(
    { class_id: 'class-b' },
    { live: { role: 'teacher' }, classId: 'class-a' },
    {
      listInbox: async (classId) => {
        calledWith = classId;
        return [];
      },
    },
  );
  assert.equal(calledWith, 'class-b');
});

test('AC-ASK-INBOX-2 never returns Teacher seat required', async () => {
  const result = await runAskListInbox(
    {},
    { live: { role: 'teacher' }, classId: 'c1' },
    { listInbox: async () => sampleItems },
  );
  const blob = JSON.stringify(result);
  assert.doesNotMatch(blob, /Teacher seat required/i);
  assert.doesNotMatch(blob, /teacher seat required/i);
  assert.doesNotMatch(blob, /Teacher sign-in is required/i);
});

test('AC-ASK-INBOX-3 parent / student / office seats cannot list', async () => {
  for (const role of ['parent', 'student', 'administrator', 'superintendent'] as const) {
    const result = await runAskListInbox(
      { class_id: 'class-math-3' },
      { live: { role }, classId: 'class-math-3' },
      {
        listInbox: async () => {
          throw new Error(`listInbox must not run for ${role}`);
        },
      },
    );
    assert.equal(result.error, 'Needs inbox is only on the Teach seat.');
    assert.equal('items' in result, false);
  }
});

test('AC-ASK-INBOX-3 dual-hat: Teach seat may list; parent/office seat wall', () => {
  assert.equal(isListInboxTeachSeat('teacher'), true);
  assert.equal(isListInboxTeachSeat('parent'), false);
  assert.equal(isListInboxTeachSeat('administrator'), false);
  assert.equal(isListInboxTeachSeat('student'), false);
  assert.equal(isListInboxTeachSeat(null), false);
});

test('AC-ASK-INBOX wiring: askTools uses runAskListInbox; no teacherId refuse', () => {
  const block = listInboxWiring();
  assert.match(block, /name:\s*["']list_inbox["']/);
  assert.match(block, /runAskListInbox/);
  assert.match(block, /listInbox/);
  assert.doesNotMatch(block, /Teacher seat required/i);
  assert.doesNotMatch(block, /if\s*\(\s*!ctx\.teacherId\s*\)/);
  assert.doesNotMatch(block, /approveCapture|deleteCapture|sendMessage|send_message/);

  const ask = read('src/lib/ai/askTools.ts');
  const allowedFn = ask.slice(ask.indexOf('function allowed('), ask.indexOf('function labelFor('));
  assert.match(allowedFn, /list_inbox/);
  assert.match(allowedFn, /isListInboxTeachSeat/);

  const askScreen = read('src/app/ask.tsx');
  assert.match(
    askScreen,
    /teacherId:\s*teacher\?\.id\s*\?\?\s*\(askRole\s*===\s*['"]teacher['']\s*\?\s*profile\?\.id/,
  );
});

test('AC-ASK-INBOX-3 policy: student/parent/office-only out; also_teacher may be offered', () => {
  assert.equal(ASK_TOOL_POLICY.list_inbox?.capability, 'capture.use');
  assert.equal(ASK_TOOL_POLICY.list_inbox?.teacherSeatOnly, undefined);

  assert.equal(isAskToolAllowed('list_inbox', { role: 'teacher' }, grants), true);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'student' }, grants), false);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'parent' }, grants), false);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'administrator' }, grants), false);
  assert.equal(isAskToolAllowed('list_inbox', { role: 'superintendent' }, grants), false);
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

  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  assert.match(client, /list_inbox:\s*\{\s*capability:\s*'capture\.use',\s*need:\s*null\s*\}/);
  assert.match(edge, /list_inbox:\s*\{\s*capability:\s*'capture\.use',\s*need:\s*null\s*\}/);
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
  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  assert.match(client, /scan_class_syllabus:[\s\S]*?teacherSeatOnly:\s*true/);
  assert.match(edge, /scan_class_syllabus:[\s\S]*?teacherSeatOnly:\s*true/);
});

test('AC-ASK-INBOX missing class needs class_id (not seat refusal)', async () => {
  const result = await runAskListInbox(
    {},
    { live: { role: 'teacher' }, classId: null },
    {
      listInbox: async () => {
        throw new Error('listInbox must not run without class');
      },
    },
  );
  assert.equal(result.error, 'Need class_id.');
  assert.doesNotMatch(String(result.error), /teacher seat required/i);
});
