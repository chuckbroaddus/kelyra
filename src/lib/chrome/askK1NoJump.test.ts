import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('K1 markSlot is square markSize (not bar-tall) so Soft shares optical center', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  assert.match(header, /const markSize = bar \+ 12/);
  assert.match(header, /styles\.markSlot, \{ width: markSize, height: markSize \}/);
  assert.doesNotMatch(header, /styles\.markSlot, \{ width: markSize, height: bar \}/);
});

test('K1 markSlot / bar clip Soft on native (no Yoga expand)', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  assert.match(header, /markSlot:[\s\S]*overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(header, /bar:[\s\S]*overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(header, /collapsable=\{false\}/);
});

test('SoftMark uses Soft v8b host (WebView/DOM) — not bead SoftMark alone', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  assert.match(soft, /WebView|react-native-webview/);
  assert.match(soft, /softV8bHostDocument|soft-v8b-host/);
  assert.match(softWeb, /dangerouslySetInnerHTML|createElement\('div'/);
  assert.doesNotMatch(soft, /\bclassName\s*:/);
  assert.doesNotMatch(soft, /className=/);
  assert.doesNotMatch(softWeb, /\bclassName\s*:/);
});

test('KelyraMark host clips Soft on native; idle letter kelyra.png', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(mark, /StyleSheet\.absoluteFill/);
  assert.match(mark, /collapsable=\{false\}/);
  assert.match(mark, /assets\/brand\/kelyra\.png/);
});

test('Tray Ask glyph box equals KelyraMark size (no shorter clip slot)', () => {
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /width: glyphSize\(tab,/);
  assert.match(tray, /height: glyphSize\(tab,/);
  assert.match(tray, /KelyraMark size=\{size\}/);
  assert.match(tray, /overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
});

test('SoftMark does not size from Soft PNG bbox (idle kelyra.png is the letter)', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const host = read('assets/brand/soft-v8b-host.html');
  assert.match(host, /data:image\/png;base64,/);
  assert.doesNotMatch(soft, /kelyra-soft\.png/);
  assert.doesNotMatch(soft, /SOFT_LETTER_SCALE/);
});

test('Idle letter remains kelyra.png in KelyraMark; SoftMark only while working', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /assets\/brand\/kelyra\.png/);
  assert.match(mark, /SoftMark size=\{size\} mode=\{working \? 'working' : 'static'\}/);
  assert.match(mark, /softMounted/);
});
