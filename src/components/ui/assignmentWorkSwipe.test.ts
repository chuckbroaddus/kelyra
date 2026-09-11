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
  assert.match(src, /trailActs\.length/);
  assert.match(src, /SWIPE_TILE/);
  assert.match(src, /decideSwipeSnap/);
  assert.match(src, /alignSelf:\s*'stretch'/);
  assert.match(src, /minHeight:\s*72/);
  assert.doesNotMatch(src, /height:\s*'100%'/);
});

test('WorkRow claims gesture while open and tap closes without navigating', () => {
  const src = read('src/components/ui/WorkRow.tsx');
  assert.match(src, /onStartShouldSetPanResponder:\s*\(\)\s*=>\s*openOffset\.current !== 0/);
  assert.match(src, /onStartShouldSetPanResponderCapture:\s*\(\)\s*=>\s*openOffset\.current !== 0/);
  assert.match(src, /onPanResponderTerminationRequest:\s*\(\)\s*=>\s*openOffset\.current === 0/);
  assert.match(src, /useSwipeRowOpen\(open\)/);
  assert.match(src, /decideSwipeSnap/);
  assert.match(src, /grantFrom/);
  // Tap-to-close: Pressable path + pan-release path (onStart steals from Pressable)
  assert.match(src, /openOffset\.current !== 0 \|\| open/);
  assert.match(src, /colors\.dangerBrick/);
  assert.doesNotMatch(src, /action\.tone === 'danger'\s*\?\s*colors\.danger\b/);
});

test('ListRow shares open-claim, tap-to-close, and dangerBrick Delete tiles', () => {
  const src = read('src/components/ui/ListRow.tsx');
  assert.match(src, /onStartShouldSetPanResponder:\s*\(\)\s*=>\s*openOffset\.current !== 0/);
  assert.match(src, /onPanResponderTerminationRequest:\s*\(\)\s*=>\s*openOffset\.current === 0/);
  assert.match(src, /useSwipeRowOpen\(open && swipable\)/);
  assert.match(src, /decideSwipeSnap/);
  assert.match(src, /grantFrom/);
  assert.match(src, /openOffset\.current !== 0 \|\| open/);
  assert.match(src, /colors\.dangerBrick/);
  assert.match(src, /leadingRef\.current = leading/);
  assert.match(src, /trailingRef\.current = trailing/);
});

test('theme defines dangerBrick brick red (not coral) for swipe Delete', () => {
  const src = read('src/constants/theme.ts');
  assert.match(src, /dangerBrick:\s*string/);
  assert.match(src, /dangerBrick:\s*'#9B2C2C'/);
  assert.match(src, /dangerBrick:\s*'#C9403A'/);
  assert.doesNotMatch(src, /dangerBrick:\s*'#F07A70'/);
});

test('AppShell mounts SwipeRowOpenProvider', () => {
  const src = read('src/components/ui/AppShell.tsx');
  assert.match(src, /SwipeRowOpenProvider/);
  assert.match(src, /swipeRowOpen/);
});

test('swipeRowOpen disables stack gesture while any row is open', () => {
  const src = read('src/lib/ui/swipeRowOpen.tsx');
  assert.match(src, /gestureEnabled:\s*false/);
  assert.match(src, /fullScreenGestureEnabled:\s*false/);
  assert.match(src, /gestureEnabled:\s*true/);
  assert.match(src, /export function useSwipeRowOpen/);
  assert.match(src, /export function SwipeRowOpenProvider/);
});

test('ui-design documents swipe close / tap / back and dangerBrick', () => {
  const src = read('docs/ui-design.md');
  assert.match(src, /dangerBrick/);
  assert.match(src, /#9B2C2C/);
  assert.match(src, /#C9403A/);
  assert.match(src, /Tap to close/);
  assert.match(src, /must not.*trigger React Navigation/i);
  assert.match(src, /SwipeRowOpenProvider/);
  assert.match(src, /second.*LTR swipe after close/i);
});

test('swipeRowSnap encodes tap-to-close and directional LTR close', () => {
  const src = read('src/lib/ui/swipeRowSnap.ts');
  assert.match(src, /export function decideSwipeSnap/);
  assert.match(src, /CLOSE_DX_PX/);
  assert.match(src, /TAP_SLOP_PX/);
  assert.match(src, /grantX !== 0 && isTap/);
});
