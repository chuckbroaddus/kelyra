import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  accessibilityChanged,
  accessibleNameFromClick,
  assertArgs,
  bootedUdid,
  buildDriveUrl,
  buildPhoneDriveUrl,
  classifyPageText,
  classifyPhoneOpen,
  findAccessibilityPoint,
  isUnsafeDriveTarget,
  normalizeClickSelector,
  phoneAuthState,
  phoneFieldsMatch,
  chromeRestoreDismissLabel,
  chromeRestoreTargetId,
  passwordPromptDismissLabel,
  phoneSignInName,
  parseArgs,
  parseAccessibilityTree,
  redact,
} from './ui-drive.mjs';

test('drive url carries the persona port and no secret', () => {
  const url = buildDriveUrl('/inbox', 4321);
  assert.equal(url, 'http://127.0.0.1:8081/inbox?kelyra_persona_port=4321');
  assert.doesNotMatch(url, /password|access_token|refresh_token/i);
  assert.equal(buildDriveUrl('inbox', 0), 'http://127.0.0.1:8081/');
});

test('phone drive url is an Expo deep link with the persona port', () => {
  const url = buildPhoneDriveUrl('/messages', 4321);
  assert.match(url, /^exp:\/\/127\.0\.0\.1:8081\/--\/messages\?kelyra_persona_port=4321$/);
  assert.doesNotMatch(url, /password|access_token|refresh_token/i);
});

test('header Search is not a drive click', () => {
  assert.equal(isUnsafeDriveTarget('Search'), true);
  assert.equal(isUnsafeDriveTarget('Close search'), true);
  assert.equal(isUnsafeDriveTarget('Sign out'), true);
  assert.equal(isUnsafeDriveTarget('Messages'), false);
});

test('web drive waits for route settle after persona inject', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/ui-drive.mjs'), 'utf8');
  assert.match(src, /waitRouteSettled/);
  assert.match(src, /ROUTE_NOT_SETTLED/);
});

test('phone http open is Safari and a bundle overlay is a harness status', () => {
  assert.equal(classifyPhoneOpen('exp://127.0.0.1:8081/--/messages'), '');
  assert.equal(classifyPhoneOpen('http://127.0.0.1:8081/messages'), 'PHONE_SAFARI');
  assert.equal(classifyPageText('Unable to resolve module node:test'), 'BUNDLE_OVERLAY');
  assert.equal(classifyPageText('Sign in\nKelyra', true), 'PERSONA_INJECT_FAILED');
  assert.equal(classifyPageText('People\nManage\nSign out', true), '');
});

test('phone tap uses the accessible name and ignores an unchanged tree', () => {
  assert.equal(accessibleNameFromClick('[aria-label=Messages]'), 'Messages');
  assert.equal(accessibleNameFromClick('[aria-label="Clear restriction"]'), 'Clear restriction');
  // Feature-map Open Capture line is bare + multi-word (invalid raw CSS).
  assert.equal(accessibleNameFromClick('[aria-label=Open Capture]'), 'Open Capture');
  assert.equal(normalizeClickSelector('[aria-label=Open Capture]'), '[aria-label="Open Capture"]');
  assert.equal(normalizeClickSelector('[aria-label=Messages]'), '[aria-label=Messages]');
  assert.equal(
    normalizeClickSelector('[aria-label="Clear restriction"]'),
    '[aria-label="Clear restriction"]',
  );
  // Web click must normalize AND keep a by-name fallback for RN Web Pressable.
  const clickSrc = readFileSync(join(process.cwd(), 'scripts/ui-drive.mjs'), 'utf8');
  const clickFn = clickSrc.slice(clickSrc.indexOf('async function click('), clickSrc.indexOf('async function driveWeb('));
  assert.match(clickFn, /normalizeClickSelector/);
  assert.match(clickFn, /accessibleNameFromClick/);
  assert.match(clickFn, /aria-label/);
  assert.match(clickFn, /byName/);
  const tree = parseAccessibilityTree(JSON.stringify([
    { AXLabel: 'Search', type: 'Button', enabled: true, frame: { x: 0, y: 0, width: 40, height: 20 } },
    { AXLabel: 'Messages', type: 'Button', enabled: true, frame: { x: 10, y: 20, width: 40, height: 20 } },
    { AXLabel: 'Messages, 2 waiting', type: 'Button', enabled: true, frame: { x: 80, y: 20, width: 40, height: 20 } },
    { AXLabel: 'Open Capture', type: 'Button', enabled: true, frame: { x: 40, y: 20, width: 40, height: 20 } },
  ]));
  const point = findAccessibilityPoint(tree, 'Messages');
  assert.equal(point.label, 'Messages');
  assert.equal(point.x, 30);
  assert.equal(point.y, 30);
  const capture = findAccessibilityPoint(tree, accessibleNameFromClick('[aria-label=Open Capture]'));
  assert.equal(capture.label, 'Open Capture');
  assert.equal(capture.x, 60);
  assert.equal(accessibilityChanged(tree, tree), false);
  const after = parseAccessibilityTree(JSON.stringify([
    { AXLabel: 'Taylor Lee', type: 'Button', enabled: true, frame: { x: 0, y: 80, width: 100, height: 40 } },
  ]));
  assert.equal(accessibilityChanged(tree, after), true);
  assert.equal(bootedUdid([
    { udid: 'phone', type: 'device', state: 'Booted' },
    { udid: 'sim', type: 'simulator', state: 'Booted' },
  ]), 'sim');
  assert.equal(bootedUdid([{ udid: 'phone', type: 'device', state: 'Booted' }]), '');
  const src = readFileSync(join(process.cwd(), 'scripts/ui-drive.mjs'), 'utf8');
  assert.match(src, /idb/);
  assert.match(src, /PHONE_TAP_UNCHANGED/);
  assert.match(src, /normalizeClickSelector/);
  assert.doesNotMatch(src, /cliclick/);
});

test('phone sign-in is three steps and stops once a tray is visible', () => {
  const video = [{ type: 'Button', AXLabel: 'Skip splash', frame: { x: 0, y: 0, width: 10, height: 10 } }];
  const splash = [{ type: 'Button', AXLabel: 'Sign in', frame: { x: 0, y: 0, width: 10, height: 10 } }];
  const form = [
    { type: 'TextField', AXLabel: '', AXValue: 'Email or @username' },
    { type: 'TextField', AXLabel: '', AXValue: 'Password' },
    { type: 'Button', AXLabel: 'Sign in' },
  ];
  const inside = [
    { type: 'Button', AXLabel: 'Home' },
    { type: 'Button', AXLabel: 'Calendar' },
  ];
  const calendarWall = [{ type: 'StaticText', AXLabel: 'Sign in to view Calendar.' }];
  assert.equal(phoneAuthState(video), 'splash-video');
  assert.equal(phoneAuthState(splash), 'splash-cta');
  assert.equal(phoneAuthState(form), 'form');
  assert.equal(phoneAuthState(inside), 'inside');
  assert.equal(phoneAuthState(calendarWall), 'unknown');
  assert.equal(chromeRestoreDismissLabel([
    'Restore pages?',
    "Chrome wasn't shut down correctly",
    'Restore',
  ]), 'Close');
  assert.equal(chromeRestoreDismissLabel(['Spring Baptist Academy', 'People']), '');
  assert.equal(chromeRestoreTargetId([
    { id: 'page', url: 'http://127.0.0.1:8081/', title: 'Kelyra' },
    { id: 'bubble', url: 'chrome://crash-restore/', title: 'Restore pages?' },
    { id: 'omni', url: 'chrome://omnibox-popup.top-chrome/', title: '' },
  ]), 'bubble');
  assert.equal(chromeRestoreTargetId([
    { id: 'omni', url: 'chrome://omnibox-popup.top-chrome/', title: 'Restore' },
  ]), '');
  assert.equal(passwordPromptDismissLabel([
    { type: 'StaticText', AXLabel: 'Save Password?' },
    { type: 'Button', AXLabel: 'Not Now' },
    { type: 'Button', AXLabel: 'Save' },
  ]), 'Not Now');
  assert.equal(passwordPromptDismissLabel([
    { type: 'StaticText', AXLabel: 'Save this password' },
    { type: 'Button', AXLabel: 'Save' },
  ]), 'Not Now');
  assert.equal(passwordPromptDismissLabel([
    { type: 'Button', AXLabel: 'Save restriction' },
    { type: 'Button', AXLabel: 'People' },
  ]), '');
  assert.equal(phoneSignInName('chuckbroaddus@gmail.com'), 'chuckbroaddus@gmail.com');
  assert.equal(phoneSignInName('chuckbroaddus'), '@chuckbroaddus');
  assert.equal(phoneSignInName('@chuckbroaddus'), '@chuckbroaddus');
  assert.equal(phoneSignInName('ditl-teacher-a'), '@ditl-teacher-a');
  assert.equal(phoneSignInName('@coltonbroaddus'), '@coltonbroaddus');
  assert.equal(phoneFieldsMatch([
    { type: 'TextField', AXValue: 'chuckbroaddus@gmail.com' },
    { type: 'TextField', AXValue: 'secret' },
  ], 'chuckbroaddus@gmail.com', 'secret'), true);
  assert.equal(phoneFieldsMatch([
    { type: 'TextField', AXValue: 'chuckbroaddus' },
    { type: 'TextField', AXValue: 'secret' },
  ], 'chuckbroaddus@gmail.com', 'secret'), false);
  const src = readFileSync(join(process.cwd(), 'scripts/ui-drive.mjs'), 'utf8');
  assert.match(src, /First Sign in reveals the fields/);
  assert.match(src, /Second Sign in submits/);
  assert.doesNotMatch(src, /Sign out/);
});

test('an empty click is not filled with the first button', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/ui-drive.mjs'), 'utf8');
  // Missing selector and missing accessible name both refuse — never invent a button.
  assert.match(src, /if \(!want && !byName\) return 'missing'/);
  assert.doesNotMatch(src, /querySelectorAll\('button, \[role="tab"\]'\)/);
  assert.match(src, /classifyPhoneOpen/);
  assert.doesNotMatch(src, /Safari \/ embedded web/);
});

test('args reject a bad surface and an unsafe click', () => {
  assert.throws(() => assertArgs(parseArgs(['--surface', 'data'])), /SURFACE_INVALID/);
  const ok = parseArgs([
    '--surface',
    'both',
    '--persona',
    'teacher',
    '--route',
    '/inbox',
    '--camera',
  ]);
  assert.equal(ok.camera, true);
  assert.equal(ok.classStack, false);
  assert.throws(
    () => assertArgs({ ...ok, click: 'button; rm' }),
    /UNSAFE_FLAG/,
  );
  assert.doesNotThrow(() => assertArgs({ ...ok, click: '[aria-label="Clear restriction"]' }));
  // Bare multi-word Open Capture is the locked feature-map form — must stay legal.
  assert.doesNotThrow(() => assertArgs({ ...ok, click: '[aria-label=Open Capture]' }));
});

test('redact strips tokens the persona server must not echo', () => {
  const cleaned = redact('access_token":"secret-value" password":"nope"');
  assert.doesNotMatch(cleaned, /secret-value/);
  assert.doesNotMatch(cleaned, /nope/);
});

test('ui-loop proof prompt grades the script and does not invent a drive', () => {
  const workflow = readFileSync(
    join(process.cwd(), '.grok/workflows/kelyra-ui-loop.rhai'),
    'utf8',
  );
  const start = workflow.lastIndexOf('fn ui_proof_prompt');
  const end = workflow.indexOf('fn ui_proof_opts', start);
  const prompt = workflow.slice(start, end);
  assert.match(prompt, /node scripts\/ui-drive\.mjs/);
  assert.match(prompt, /drive_ran=false/);
  assert.match(prompt, /exactly once/);
  assert.doesNotMatch(prompt, /devicectl/);
  assert.doesNotMatch(prompt, /prove-fl05/);
  assert.doesNotMatch(prompt, /search_tool/);
  assert.doesNotMatch(prompt, /npm run web/);
  assert.match(workflow, /kelyra-ui-proof/);
  assert.match(workflow, /grade_ids/);
});
