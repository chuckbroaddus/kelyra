import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildParentAskAssignmentToolResult,
  formatParentAskListToolReply,
  resolveParentAskChild,
  shapeParentAskAssignments,
} from './askParentAssignments.ts';
import {
  allowedAskToolNames,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();
const grants = grantsFromAskDefaults();

const jamie = { id: 'jamie-id', display_name: 'Jamie Lee' };
const jordan = { id: 'jordan-id', display_name: 'Jordan Lee' };
const twins = [jamie, jordan];

test('AC-PARENT-ASK-1 one linked child lists that child', () => {
  const resolved = resolveParentAskChild({ linkedChildren: [jordan] });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.child.id, 'jordan-id');
  assert.equal(resolved.source, 'only');
});

test('AC-PARENT-ASK-2 named child wins over Home bind to sibling', () => {
  const resolved = resolveParentAskChild({
    linkedChildren: twins,
    childName: 'Jamie',
    boundStudentId: jordan.id,
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.child.id, jamie.id);
  assert.equal(resolved.source, 'named');
  assert.notEqual(resolved.child.id, jordan.id);
});

test('AC-PARENT-ASK-2 Home bind used when ask does not name a child', () => {
  const resolved = resolveParentAskChild({
    linkedChildren: twins,
    boundStudentId: jordan.id,
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.child.id, jordan.id);
  assert.equal(resolved.source, 'bound');
});

test('AC-PARENT-ASK-2 unidentified multi-child asks which — never blends', () => {
  const resolved = resolveParentAskChild({ linkedChildren: twins });
  assert.equal(resolved.ok, false);
  if (resolved.ok) return;
  assert.equal(resolved.kind, 'need_which_child');
  if (resolved.kind !== 'need_which_child') return;
  assert.deepEqual(
    resolved.children.map((c) => c.id).sort(),
    ['jamie-id', 'jordan-id'],
  );
});

test('AC-PARENT-ASK-1 shape keeps title/due/class; never scores', () => {
  const rows = shapeParentAskAssignments([
    { title: 'Place value HW', due_at: '2026-09-28T23:59:00.000Z', class_name: 'Math' },
    { title: 'Reading log', due_at: null, class_name: 'English' },
    { title: '  ', due_at: '2026-09-29T00:00:00.000Z', class_name: 'Art' },
    { title: 'Quiz', due_at: undefined, class_name: '' },
  ]);
  assert.deepEqual(rows, [
    { title: 'Place value HW', due: '2026-09-28T23:59:00.000Z', class_name: 'Math' },
    { title: 'Reading log', class_name: 'English' },
    { title: 'Quiz' },
  ]);
  const blob = JSON.stringify(rows);
  assert.doesNotMatch(blob, /score|draft|approved/i);
});

test('AC-PARENT-ASK-1/3 policy: parent gets list_my_assignments + send_message; student denied list', () => {
  const parent = { role: 'parent' as const };
  const student = { role: 'student' as const };
  assert.equal(isAskToolAllowed('list_my_assignments', parent, grants), true);
  assert.equal(isAskToolAllowed('send_message', parent, grants), true);
  assert.equal(isAskToolAllowed('list_my_assignments', student, grants), false);
  const parentNames = allowedAskToolNames(parent, grants);
  assert.ok(parentNames.includes('list_my_assignments'));
  assert.ok(parentNames.includes('send_message'));
  assert.ok(parentNames.includes('my_children_progress'));
});

test('AC-PARENT-ASK-1 wiring uses family gradebook, not teacher list_assignments', () => {
  const ask = readFileSync(join(root, 'src/lib/ai/askTools.ts'), 'utf8');
  const start = ask.indexOf('list_my_assignments: {');
  assert.ok(start > 0, 'list_my_assignments tool missing');
  const end = ask.indexOf('my_unread_messages: {', start);
  const block = ask.slice(start, end);
  assert.match(block, /Parent seat only/);
  assert.match(block, /loadFamilyStudentGradebook/);
  assert.match(block, /buildParentAskAssignmentToolResult/);
  assert.doesNotMatch(block, /listClassAssignments/);
  assert.doesNotMatch(block, /listStudentTodo/);
  assert.doesNotMatch(block, /loadParentProgressMine/);
  const agent = readFileSync(join(root, 'src/lib/ai/askAgent.ts'), 'utf8');
  assert.match(agent, /formatParentAskListToolReply/);
  assert.match(agent, /parentListReply/);
});

test('AC-PARENT-ASK-3 send_message tool remains on Ask path', () => {
  const ask = readFileSync(join(root, 'src/lib/ai/askTools.ts'), 'utf8');
  assert.match(ask, /name:\s*["']send_message["']/);
  assert.match(ask, /sendMessage\(/);
  const prompt = readFileSync(join(root, 'src/lib/ai/askPrompt.ts'), 'utf8');
  assert.match(prompt, /list_my_assignments/);
  assert.match(prompt, /send_message still sends/);
  assert.match(prompt, /never mix siblings|never invent titles, never mix siblings/);
});

test('AC-PARENT-ASK-1 mocked routing lists named child only (no live model)', async () => {
  const loadBook = async (studentId: string) => {
    assert.equal(studentId, jordan.id);
    return {
      classes: [
        { classId: 'math', className: 'ditl-Math Period 3' },
        { classId: 'eng', className: 'ditl-English' },
      ],
      assignments: [
        { title: 'ditl-Math HW S1', due_at: '2026-09-28T23:59:00.000Z', class_id: 'math' },
        { title: 'ditl-English HW S1', due_at: null, class_id: 'eng' },
        { title: 'Jamie only secret', due_at: null, class_id: 'math' },
      ],
    };
  };
  // Named Jordan while Home is bound to Jamie — never Jamie-only mix.
  const payload = await buildParentAskAssignmentToolResult({
    linkedChildren: twins,
    childName: 'Jordan Lee',
    boundStudentId: jamie.id,
    loadBook: async (id, meta) => {
      assert.equal(meta.displayName, 'Jordan Lee');
      const book = await loadBook(id);
      // Simulate book already scoped to the requested child id (family RPC).
      return {
        classes: book.classes,
        assignments: book.assignments.filter((row) => row.title !== 'Jamie only secret'),
      };
    },
  });
  assert.equal(payload.child_id, jordan.id);
  assert.equal(payload.child_name, 'Jordan Lee');
  assert.equal(payload.count, 2);
  const titles = (payload.assignments as Array<{ title: string }>).map((r) => r.title);
  assert.deepEqual(titles, ['ditl-Math HW S1', 'ditl-English HW S1']);
  assert.equal(JSON.stringify(payload).includes('Jamie only'), false);

  const reply = formatParentAskListToolReply(payload);
  assert.ok(reply);
  assert.match(reply!, /Jordan Lee/);
  assert.match(reply!, /ditl-Math HW S1/);
  assert.match(reply!, /ditl-English HW S1/);
  assert.doesNotMatch(reply!, /Jamie only/);
  assert.doesNotMatch(reply!, /started that work, then stopped/i);
});

test('AC-PARENT-ASK-2 mocked need_which_child formats in-thread question', async () => {
  const payload = await buildParentAskAssignmentToolResult({
    linkedChildren: twins,
    loadBook: async () => {
      throw new Error('loadBook must not run when child is unidentified');
    },
  });
  assert.equal(payload.need_which_child, true);
  const reply = formatParentAskListToolReply(payload);
  assert.ok(reply);
  assert.match(reply!, /Which child/);
  assert.match(reply!, /Jamie Lee/);
  assert.match(reply!, /Jordan Lee/);
});

test('AC-PARENT-ASK-1 format recovers list after stop-mid-work tool JSON', () => {
  const reply = formatParentAskListToolReply(
    JSON.stringify({
      child_id: 'jordan-id',
      child_name: 'Jordan Lee',
      assignments: [
        { title: 'ditl-Math HW S1', due: '2026-09-28T23:59:00.000Z', class_name: 'ditl-Math Period 3' },
      ],
      count: 1,
    }),
  );
  assert.equal(
    reply,
    'Jordan Lee — 1 assignment:\n• ditl-Math HW S1 — ditl-Math Period 3 — due 2026-09-28',
  );
});

test('AC-PARENT-ASK-1 agent short-circuits list_my_assignments (no extra model rounds)', () => {
  const agent = readFileSync(join(root, 'src/lib/ai/askAgent.ts'), 'utf8');
  assert.match(agent, /if \(parentListReply && listOnlyRound\)/);
  assert.match(agent, /return \{ text: parentListReply, didWork: true, href \}/);
  assert.match(agent, /text: parentListReply\s*\n\s*\? parentListReply/);
});
