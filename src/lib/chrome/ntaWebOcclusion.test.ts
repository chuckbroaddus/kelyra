import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('AC-WEB: web top bar stacks tray + ContextMenuRow above body (not under tray)', () => {
  const shell = read('src/components/ui/AppShell.tsx');
  assert.match(shell, /showTopBar[\s\S]*FloatingTabTray[\s\S]*ContextMenuRow/);
  assert.match(shell, /trayOpacity/);
  assert.match(shell, /trayTranslate/);
  // Phone/float path still mounts ContextMenuRow inside body
  assert.match(shell, /!layout\.showTopBar \? <ContextMenuRow/);
});

test('AC-WEB: ContextMenuRow flow mode on showTopBar — no translate under tray', () => {
  const row = read('src/components/ui/ContextMenuRow.tsx');
  assert.match(row, /wrapFlow/);
  assert.match(row, /showTopBar/);
  assert.match(row, /transform: flow \? undefined/);
});

test('AC-WEB: showTopBar contextReserve is 0 (in-flow chrome; no double Screen pad)', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /if \(layout\.showTopBar\) return 0/);
  assert.match(chrome, /topChromeHide/);
});

test('AC-WEB-03: tray still four Teach slots — no Capture restore in this fix', () => {
  const tray = read('src/lib/chrome/trayTabs.ts');
  assert.doesNotMatch(tray, /key:\s*'capture'/);
});
