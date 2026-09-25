import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('office pane pads for the tray reserve lost while the iOS keyboard is up', () => {
  const src = readFileSync(new URL('../../app/index.tsx', import.meta.url), 'utf8');
  assert.match(src, /OFFICE-PANE-KEYBOARD-REACH/);
  assert.match(src, /Platform\.OS === 'ios' && chrome\.keyboardVisible \? Math\.max\(0, chrome\.trayPadding - 12\) : 0/);
  assert.match(src, /\{paneKeyboardSpacer \? <View style=\{\{ height: paneKeyboardSpacer \}\} \/> : null\}\n\s*<\/ScrollView>/);
  assert.match(src, /automaticallyAdjustKeyboardInsets/);
});
