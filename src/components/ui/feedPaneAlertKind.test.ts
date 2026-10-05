import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

/** DITL-O-06-UI-01 / t_14c82527: Alert kind tab must drive composer + createPost. */
test('FeedPane: Alert tab sets kind=alert for placeholder and createPost', () => {
  const src = read('src/components/ui/FeedPane.tsx');
  assert.match(src, /FEED_KIND_TABS/);
  assert.match(src, /key:\s*'alert'/);
  assert.match(src, /setKind\(key === 'alert' \? 'alert' : 'post'\)/);
  assert.match(src, /placeholder=\{kind === 'alert' \? 'Enter Alert Message' : 'Write a post'\}/);
  assert.match(src, /createPost\(\{\s*classId: boundClass,\s*kind,/);
  // Publish closes over kind from state — not a hard-coded post.
  assert.doesNotMatch(src, /createPost\(\{[^}]*kind:\s*'post'/);
});

test('PersonTabs: measure labels stay off the tab hit row (no Alert-click steal)', () => {
  const src = read('src/components/ui/PersonTabs.tsx');
  // Ghost measure copies must not precede the interactive scroller in DOM order.
  const scroller = src.indexOf('<ScrollView');
  const measure = src.indexOf('key={`measure:${tab.key}`}');
  assert.ok(scroller > 0 && measure > 0, 'expected ScrollView and measure nodes');
  assert.ok(measure > scroller, 'measure labels must render after ScrollView');
  assert.match(src, /left:\s*-10000/);
  assert.match(src, /accessibilityElementsHidden/);
  assert.match(src, /pointerEvents="none"/);
});
