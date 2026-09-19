/**
 * ST-A · TC-A · KL-A — Settings tabs + Diary tray + Class drop contracts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { tabsFor, trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('ST-A tray: Desk · Needs Attention · Diary · Kelyra; Class gone; no Capture', () => {
  assert.deepEqual(trayKeysForRole('teacher'), ['home', 'inbox', 'diary', 'calendar', 'ask']);
  const tabs = tabsFor('teacher', '/', 'c1', 0);
  assert.deepEqual(
    tabs.map((t) => t.label),
    ['Desk', 'Needs Attention', 'Diary', 'Calendar', 'Kelyra'],
  );
  assert.ok(!tabs.some((t) => t.key === 'class' || t.key === 'capture'));
  assert.equal(tabs.at(-1)?.key, 'ask');
  assert.equal(tabs.at(-1)?.href, '/ask');
});

test('ST-A other seats: no Diary tray slot', () => {
  assert.ok(!trayKeysForRole('parent').includes('diary'));
  assert.ok(!trayKeysForRole('administrator').includes('diary'));
  assert.ok(!trayKeysForRole('superintendent').includes('diary'));
  assert.ok(!trayKeysForRole('student').includes('diary'));
  assert.equal(trayKeysForRole('parent').length, 4);
  assert.equal(trayKeysForRole('administrator').length, 6);
  assert.equal(trayKeysForRole('student').length, 7);
});

test('ST-A SettingsSheet: tab strip Theme · Ingest (teach) · Diary; Open Diary gated', () => {
  const src = read('src/components/ui/SettingsSheet.tsx');
  assert.match(src, /accessibilityRole="tablist"/);
  assert.match(src, /label: 'Theme'/);
  assert.match(src, /label: 'Ingest Folders'/);
  assert.match(src, /label: 'Diary'/);
  assert.match(src, /icon: 'theme'/);
  assert.match(src, /icon: 'ingestFolders'/);
  assert.match(src, /icon: 'diary'/);
  assert.match(src, /teachSeat/);
  assert.match(src, /allowOpenDiary/);
  assert.match(src, /label="Open Diary"/);
  assert.match(src, /DIARY_PRIVACY_TITLE/);
  assert.match(src, /DIARY_PRIVACY_BODY/);
  assert.match(src, /DIARY_FERPA_NOTE/);
  assert.match(src, /resumeDrivePicker && teachSeat/);
  assert.doesNotMatch(src, /Color theme/);
  assert.doesNotMatch(src, /Class stack sources/);
});

test('ST-20 / GAP-S1 hamburger Diary ownership', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.doesNotMatch(drawer, /!officeSeat && matches\('Diary'/);
  assert.doesNotMatch(drawer, /teacherSeat && matches\('Diary'/);
  assert.match(drawer, /matches\('Diary', q\) \? <DrawerRow label="Diary"/);
  // Office: superintendent dedicated branch + administrator officeSeat block both own Diary.
  const superAt = drawer.indexOf("officeSeat && profile?.role === 'superintendent'");
  assert.ok(superAt > 0);
  const elseAt = drawer.indexOf(') : (', superAt);
  const superBlock = drawer.slice(superAt, elseAt);
  assert.match(superBlock, /label="Diary"/);
  assert.match(superBlock, /go\('\/diary'\)/);
  const officeExtrasAt = drawer.indexOf('{officeSeat ? (', elseAt);
  assert.ok(officeExtrasAt > elseAt);
  const officeExtrasEnd = drawer.indexOf('{chromeState.classId && teacherSeat', officeExtrasAt);
  const adminOfficeBlock = drawer.slice(officeExtrasAt, officeExtrasEnd);
  assert.match(adminOfficeBlock, /label="Diary"/);
  assert.match(adminOfficeBlock, /go\('\/diary'\)/);
  const studentAt = drawer.indexOf("chromeState.role === 'student'");
  assert.ok(studentAt > 0);
  const parentAt = drawer.indexOf("chromeState.role === 'parent'", studentAt);
  const studentBlock = drawer.slice(studentAt, parentAt);
  assert.doesNotMatch(studentBlock, /label="Diary"/);
  const parentBlock = drawer.slice(parentAt);
  assert.match(parentBlock, /label="Diary"/);
});

test('TC-A This class hamburger block when classId', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /chromeState\.className \|\| 'This class'/);
  assert.match(drawer, /label="Students"/);
  assert.match(drawer, /\/class\/\$\{chromeState\.classId\}\/setup/);
  assert.match(drawer, /label="Grade book"/);
  assert.match(drawer, /label="Parents"/);
  assert.match(drawer, /label="Family update"/);
  assert.match(drawer, /label="Class settings"/);
  assert.match(drawer, /\/class\/\$\{chromeState\.classId\}\/settings/);
  assert.doesNotMatch(drawer, /New class|Create class/);
});

test('KL-A /ask header wordmark already Kelyra; tray label Kelyra', () => {
  const titles = read('src/lib/chrome/titles.ts');
  assert.match(titles, /pathname === '\/ask'\) return 'Kelyra'/);
  assert.equal(tabsFor('teacher', '/ask', 'c1', 0).find((t) => t.key === 'ask')?.label, 'Kelyra');
});

test('ST-25 icon recipes theme · ingestFolders · diary present', () => {
  const assets = read('src/components/ui/iconAssets.ts');
  assert.match(assets, /'theme':/);
  assert.match(assets, /'ingestFolders':/);
  assert.match(assets, /'diary':/);
  const icons = read('scripts/build-icons.mjs');
  assert.match(icons, /theme:\s*\(p\)\s*=>/);
  assert.match(icons, /ingestFolders:\s*\(p\)\s*=>/);
  assert.match(icons, /diary:\s*\(p\)\s*=>/);
  const names = read('src/components/ui/Icon.tsx');
  assert.match(names, /\| 'theme'/);
  assert.match(names, /\| 'ingestFolders'/);
  assert.match(names, /\| 'diary'/);
});

test('DIARY L7: student canOpenDiary false; Open Diary requires allowOpenDiary', () => {
  const seat = read('src/lib/diary/seat.ts');
  assert.match(seat, /export function canOpenDiary/);
  assert.match(seat, /profile\.role === 'student'\) return false/);
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /allowOpenDiary=\{canOpenDiary\(profile\) && chromeState\.role !== 'student'\}/);
  const settings = read('src/components/ui/SettingsSheet.tsx');
  assert.match(settings, /allowOpenDiary && onOpenDiary/);
});

test('INGEST_COPY visible noun is Ingest Folders', () => {
  const copy = read('src/lib/ingest/copy.ts');
  assert.match(copy, /classStackSources:\s*'Ingest Folders'/);
});
