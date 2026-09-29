import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('StudentWorkList title onPress and Open pill both call onOpen when studentTodoOpenPath is set', () => {
  const src = read('src/components/ui/StudentWorkList.tsx');
  assert.match(src, /studentTodoOpenPath/);
  assert.match(src, /const openable = studentTodoOpenPath\(item\) != null/);
  assert.match(src, /onPress=\{openable \? \(\) => onOpen\(item\) : undefined\}/);
  assert.match(src, /label:\s*'Open'/);
  assert.match(src, /onPress:\s*\(\) => onOpen\(item\)/);
  const onPressAt = src.indexOf('onPress={openable ? () => onOpen(item) : undefined}');
  const openPillAt = src.indexOf("label: 'Open'");
  assert.ok(onPressAt >= 0 && openPillAt > onPressAt);
});

test('Assignments /todo and class open paths use studentTodoOpenPath (phone + web)', () => {
  const todo = read('src/app/todo.tsx');
  const klass = read('src/app/student/class.tsx');
  assert.match(todo, /studentTodoOpenPath/);
  assert.match(todo, /onOpen=\{open\}/);
  assert.match(todo, /const path = studentTodoOpenPath\(item\)/);
  assert.match(todo, /if \(path\) router\.push\(path as never\)/);
  assert.match(klass, /studentTodoOpenPath/);
  assert.match(klass, /onOpen=\{openWork\}/);
  assert.match(klass, /const path = studentTodoOpenPath\(item\)/);
  assert.match(klass, /if \(path\) router\.push\(path as never\)/);
});

test('studentTodoOpenPath encodes practice/planned → /todo/[id] and lesson → /lesson/[id]', () => {
  const src = read('src/lib/student-session/work.ts');
  assert.match(src, /export function studentTodoOpenPath/);
  assert.match(src, /item\.kind === 'lesson'[\s\S]*?`\/lesson\/\$\{item\.assignmentId\}`/);
  assert.match(
    src,
    /item\.kind === 'practice' \|\| item\.kind === 'planned'[\s\S]*?`\/todo\/\$\{item\.submissionId\}`/,
  );
  assert.match(src, /return null/);
});
