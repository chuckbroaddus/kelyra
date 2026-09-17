import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  __resetGlobalProcessingForTests,
  beginGlobalProcessing,
  endGlobalProcessing,
  getGlobalProcessingCount,
  subscribeGlobalProcessing,
} from './globalProcessing.ts';

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('WK-SOT refcount pairs, clamps at 0, notifies subscribers', () => {
  __resetGlobalProcessingForTests();
  let ticks = 0;
  const stop = subscribeGlobalProcessing(() => {
    ticks += 1;
  });
  assert.equal(getGlobalProcessingCount(), 0);
  beginGlobalProcessing();
  beginGlobalProcessing();
  assert.equal(getGlobalProcessingCount(), 2);
  endGlobalProcessing();
  assert.equal(getGlobalProcessingCount(), 1);
  endGlobalProcessing();
  assert.equal(getGlobalProcessingCount(), 0);
  endGlobalProcessing();
  assert.equal(getGlobalProcessingCount(), 0);
  assert.ok(ticks >= 4);
  stop();
  __resetGlobalProcessingForTests();
});

test('WK Soft WorkingMark has no pencil geometry; SoftMark Soft face + modes', () => {
  const working = read('src/components/ui/WorkingMark.tsx');
  const soft = read('src/components/ui/SoftMark.tsx');
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.doesNotMatch(working, /pencil|F4C430|eraser|ferrule/);
  assert.match(working, /SoftMark/);
  assert.match(working, /mode="working"/);
  assert.match(soft, /kelyra-soft\.png/);
  assert.match(soft, /mode === 'working'/);
  assert.match(soft, /useReducedMotion/);
  assert.match(mark, /useChromeKWorking/);
  assert.match(mark, /kelyra\.png/);
  assert.match(mark, /SoftMark/);
  assert.doesNotMatch(mark, /kelyraMarkSource = softFace|export const kelyraMarkSource = softFace/);
});

test('WK idle chrome uses original brand K; Soft only while working', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /assets\/brand\/kelyra\.png/);
  assert.match(mark, /SoftMark/);
  assert.match(mark, /useChromeKWorking/);
  assert.match(mark, /working \? 'working' : 'static'|chromeWorking \? 'working' : 'static'/);
});

test('WK chrome K1/K3/K4/K5 follow Soft SoT; K2 school logo stays RemoteImage', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  const icon = read('src/components/ui/Icon.tsx');
  const iconWeb = read('src/components/ui/Icon.web.tsx');
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');

  assert.match(header, /kelyraMark \? \([\s\S]*?<KelyraMark/);
  assert.match(header, /logoUrl \? \([\s\S]*?<RemoteImage/);
  assert.doesNotMatch(header, /SoftMark/);

  assert.match(tray, /tab\.icon === 'ask'/);
  assert.match(tray, /KelyraMark/);
  assert.match(tray, /useChromeKWorking/);
  assert.match(tray, /busy: true/);

  assert.match(icon, /name === 'ask'/);
  assert.match(icon, /KelyraMark/);
  assert.match(iconWeb, /name === 'ask'/);
  assert.match(iconWeb, /KelyraMark/);
  assert.match(drawer, /leading=\{<KelyraMark size=\{22\} \/>\}/);
});

test('WK §4.1 owners register useGlobalProcessingActive / begin-end; §4.2 Opening Kelyra does not', () => {
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /useGlobalProcessingActive\(aiWait\)/);
  assert.match(ask, /setAiWait\(true\)/);
  assert.match(ask, /Opening Kelyra…/);

  assert.match(read('src/app/capture.tsx'), /useGlobalProcessingActive\(asking\)/);
  assert.match(read('src/app/proposal.tsx'), /useGlobalProcessingActive\(working\)/);
  assert.match(read('src/app/class/[id]/setup.tsx'), /useGlobalProcessingActive\(readingList \|\| hearing\)/);
  assert.match(
    read('src/components/ingest/ClassStackBinder.tsx'),
    /useGlobalProcessingActive\(Boolean\((?:resumeChecking \|\| )?showWaiting\)\)/,
  );
  assert.doesNotMatch(read('src/components/ui/ListenSheet.tsx'), /useGlobalProcessingActive|beginGlobalProcessing/);
  assert.doesNotMatch(read('src/app/profile.tsx'), /useGlobalProcessingActive|beginGlobalProcessing/);
});

test('WK splash/sign-in stay still — no SoftMark / KelyraMark on splash surfaces', () => {
  const splash = read('src/components/ui/splashLanding.test.ts');
  assert.match(splash, /doesNotMatch\(splash, \/KelyraMark\/\)/);
});
