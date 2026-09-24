import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { setSwipeRowStackGestures, type SwipeRowNavLike } from '../ui/swipeRowStackGestures.ts';

const root = new URL('../../..', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('drumStackGestures reuses setSwipeRowStackGestures (no duplicated parent-walk)', () => {
  const src = read('src/lib/calendar/drumStackGestures.ts');
  assert.match(src, /setSwipeRowStackGestures/);
  assert.match(src, /useDrumStackGestureGate/);
  assert.match(src, /gesturesHeld/);
  // Hold disables; release restores — same helper, opposite enabled flag.
  assert.match(src, /setSwipeRowStackGestures\(navigation as SwipeRowNavLike,\s*false\)/);
  assert.match(src, /setSwipeRowStackGestures\(navigation as SwipeRowNavLike,\s*true\)/);
  // Must not re-implement parent walk.
  assert.doesNotMatch(src, /getParent\s*\(/);
});

test('setSwipeRowStackGestures still walks parents (shared ListRow path)', () => {
  const calls: { id: string; enabled: boolean }[] = [];
  const rootNav: SwipeRowNavLike = {
    setOptions: (opts) =>
      calls.push({ id: 'root', enabled: opts.gestureEnabled as boolean }),
  };
  const leaf: SwipeRowNavLike = {
    setOptions: (opts) =>
      calls.push({ id: 'leaf', enabled: opts.gestureEnabled as boolean }),
    getParent: () => rootNav,
  };

  setSwipeRowStackGestures(leaf, false);
  setSwipeRowStackGestures(leaf, true);

  assert.deepEqual(
    calls.map((c) => `${c.id}:${c.enabled}`),
    ['leaf:false', 'root:false', 'leaf:true', 'root:true'],
  );
});

test('PeriodPager wires drum stack gate on touch/grant and restores on release', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /useDrumStackGestureGate|setSwipeRowStackGestures/);
  assert.match(pager, /from ['"]@\/lib\/calendar\/drumStackGestures['"]/);
  assert.match(pager, /onTouchStart/);
  assert.match(pager, /onTouchEnd|onTouchCancel/);
  // Grant holds; release + terminate restore.
  const grantIdx = pager.indexOf('onPanResponderGrant');
  assert.ok(grantIdx > 0);
  const grantBlock = pager.slice(grantIdx, grantIdx + 900);
  assert.match(grantBlock, /holdStackGestures|hold\(/);

  const releaseIdx = pager.indexOf('onPanResponderRelease');
  const releaseBlock = pager.slice(releaseIdx, releaseIdx + 900);
  assert.match(releaseBlock, /releaseStackGestures|release\(/);

  const termIdx = pager.indexOf('onPanResponderTerminate');
  const termBlock = pager.slice(termIdx, termIdx + 400);
  assert.match(termBlock, /releaseStackGestures|release\(/);

  // CAL-P6-9A comment mentions the real gate.
  assert.match(pager, /setSwipeRowStackGestures|drumStackGestures/);
  assert.match(pager, /CAL-P6-9A/);
});
