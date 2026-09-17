import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('AC-NTA-VIS-01: web top bar stacks tray then ContextMenuRow above body', () => {
  const shell = read('src/components/ui/AppShell.tsx');
  assert.match(shell, /showTopBar[\s\S]*FloatingTabTray[\s\S]*ContextMenuRow/);
  assert.match(shell, /!layout\.showTopBar \? <ContextMenuRow/);
});

test('AC-NTA-VIS-03: AppShell must NOT co-wrap tray+tabs in one Animated hide unit', () => {
  const shell = read('src/components/ui/AppShell.tsx');
  // Shared-hide REJECT — no Animated.View wrapping FloatingTabTray + ContextMenuRow together.
  assert.doesNotMatch(shell, /Animated\.View[\s\S]{0,220}FloatingTabTray[\s\S]{0,120}ContextMenuRow/);
  assert.doesNotMatch(shell, /from 'react-native'.*Animated/s);
});

test('AC-NTA-VIS-01/03: /inbox ContextMenuRow pins opacity 1 and skips contextTranslate', () => {
  const row = read('src/components/ui/ContextMenuRow.tsx');
  assert.match(row, /pathname === '\/inbox'/);
  assert.match(row, /pinVisible/);
  assert.match(row, /opacity: pinVisible \? 1/);
  assert.match(row, /wrapFlow/);
  assert.match(row, /showTopBar/);
});

test('AC-NTA-VIS: showTopBar contextReserve is 0 (in-flow chrome; no double Screen pad)', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /if \(layout\.showTopBar\) return 0/);
});

test('AC-NTA-VIS-04: tray still no Capture restore', () => {
  const tray = read('src/lib/chrome/trayTabs.ts');
  assert.doesNotMatch(tray, /key:\s*'capture'/);
});
