import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('AssignmentWorkList trailing is Preview (brand) then Delete (danger), no leading', () => {
  const src = read('src/components/ui/AssignmentWorkList.tsx');
  assert.match(src, /trailing=\{\[/);
  assert.doesNotMatch(src, /leading=\{/);
  // Preview then Delete so Delete is the outer-right tile
  const trail = src.slice(src.indexOf('trailing={['), src.indexOf('trailing={[') + 700);
  assert.match(trail, /key:\s*'preview'[\s\S]*label:\s*'Preview'[\s\S]*tone:\s*'brand'/);
  assert.match(trail, /key:\s*'delete'[\s\S]*label:\s*'Delete'[\s\S]*tone:\s*'danger'/);
  const previewAt = trail.indexOf("key: 'preview'");
  const deleteAt = trail.indexOf("key: 'delete'");
  assert.ok(previewAt >= 0 && deleteAt > previewAt, 'Preview must precede Delete in trailing');
});

test('WorkRow PanResponder reads leadingRef/trailingRef (not stale first-render arrays)', () => {
  const src = read('src/components/ui/WorkRow.tsx');
  // test-hook: leadingRef/trailingRef keep PanResponder snap widths current across renders
  assert.match(src, /leadingRef/);
  assert.match(src, /trailingRef/);
  assert.match(src, /leadingRef\.current = leading/);
  assert.match(src, /trailingRef\.current = trailing/);
  assert.match(src, /const maxR = trailActs\.length \* 80/);
  assert.match(src, /snap\(offset < -56 \? -maxR : 0\)/);
  assert.match(src, /alignSelf:\s*'stretch'/);
  assert.match(src, /minHeight:\s*72/);
  assert.doesNotMatch(src, /height:\s*'100%'/);
});
