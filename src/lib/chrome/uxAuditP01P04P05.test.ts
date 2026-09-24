import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { showHeaderCapture } from './headerCapture.ts';
import { tabsFor, trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

/** P-01 — §3.2 / §34.1: camera teacher-only; student/parent trailing = search → messages → hamburger. */
test('P-01: showHeaderCapture false for student/parent; true for teacher (not messages)', () => {
  assert.equal(showHeaderCapture('/', 'student'), false);
  assert.equal(showHeaderCapture('/', 'parent'), false);
  assert.equal(showHeaderCapture('/todo', 'student'), false);
  assert.equal(showHeaderCapture('/parent', 'parent'), false);
  assert.equal(showHeaderCapture('/', 'teacher'), true);
  assert.equal(showHeaderCapture('/capture', 'teacher'), true);
  assert.equal(showHeaderCapture('/messages', 'teacher'), false);
  assert.equal(showHeaderCapture('/', 'superintendent'), false);
  assert.equal(showHeaderCapture('/', 'administrator'), false);
});

test('P-01: AppHeader trailing order is capture → search → mail → menu; camera gated', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  const capture = header.indexOf('showCapture ?');
  const search = header.indexOf('showSearch ?');
  const mail = header.indexOf('showMail ?');
  const menu = header.indexOf('showMenu ?');
  assert.ok(capture > 0 && search > capture && mail > search && menu > mail);
  assert.match(header, /showHeaderCapture\(pathname,\s*chromeState\.role\)/);
  assert.match(
    header,
    /const showMenu = !headerChrome\.hideMenu && \(!showBack \|\| Boolean\(headerChrome\.keepMenu\)\)/,
  );
  // P-06: wordmark/pushed read chromePathname so prior-seat routes cannot stick after seat switch.
  assert.match(header, /const pathForChrome = chromeState\.chromePathname/);
  assert.match(header, /const pushed = isChromePushed\(pathForChrome\)/);
  assert.match(header, /accessibilityLabel="Search"/);
  assert.match(header, /Icon name="mail"/);
  assert.match(header, /Icon name="menu"/);
  assert.match(header, /School logo/);
  // SoftMark #134: school logo / Ask mark share square markSlot (markSize = bar + 12).
  assert.match(header, /const markSize = bar \+ 12/);
  assert.match(header, /styles\.markSlot/);
  assert.match(header, /width: markSize, height: markSize/);
  assert.doesNotMatch(header, /logoSlot/);
  assert.doesNotMatch(header, /width:\s*22,\s*\n\s*height:\s*22,\s*\n\s*marginRight:\s*8/);
});


test('P-01: ASSIGN chrome keeps hamburger on pushed Assign (keepMenu)', () => {
  const chrome = read('src/lib/lessons/chrome.ts');
  assert.match(chrome, /const ASSIGN: HeaderChrome = \{[^}]*keepMenu:\s*true/);
  assert.match(chrome, /const ASSIGN: HeaderChrome = \{[^}]*hideMenu:\s*false/);
  // Lesson player still hides menu.
  assert.match(chrome, /const PLAYER: HeaderChrome = \{[\s\S]*?hideMenu:\s*true/);
  const header = read('src/components/ui/AppHeader.tsx');
  assert.match(header, /headerChrome\.keepMenu/);
});

/** P-05 / KL-A — Ask key last; teacher tray label Kelyra; other seats Ask. */
test('P-05 / KL-A: teacher Ask slot labels Kelyra; other seats Ask; Ask remains last', () => {
  const teacherAsk = tabsFor('teacher', '/', 'c1', 0).find((tab) => tab.key === 'ask');
  assert.equal(teacherAsk?.label, 'Kelyra');
  assert.equal(teacherAsk?.href, '/ask');
  for (const role of ['superintendent', 'administrator'] as const) {
    const tabs = tabsFor(role, '/', null, 0);
    const ask = tabs.find((tab) => tab.key === 'ask');
    assert.ok(ask, role);
    assert.equal(ask.label, 'KelyraAsk', role);
    assert.equal(tabs[tabs.length - 1]?.key, 'ask', role);
    assert.equal(trayKeysForRole(role).at(-1), 'ask', role);
  }
  for (const role of ['student', 'parent'] as const) {
    const tabs = tabsFor(role, '/', null, 0);
    const ask = tabs.find((tab) => tab.key === 'ask');
    assert.ok(ask, role);
    assert.equal(ask.label, 'Ask', role);
    assert.equal(tabs[tabs.length - 1]?.key, 'ask', role);
    assert.equal(trayKeysForRole(role).at(-1), 'ask', role);
  }
  assert.equal(tabsFor('teacher', '/', 'c1', 0).at(-1)?.key, 'ask');
  assert.equal(trayKeysForRole('teacher').at(-1), 'ask');
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /accessibilityLabel=\{tab\.badge \? `\$\{tab\.label\}, \$\{tab\.badge\} waiting` : tab\.label\}/);
  assert.match(tray, /if \(tab\.key === 'ask'\) return tab\.label/);
});

/** P-04 — §3.3 / §36.2 drawer order conformance. */
test('P-04: office drawer Home · Diary · Calendar · Ask Kelyra then My children / Sign out', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const officeAt = drawer.indexOf('{officeSeat ? (');
  assert.ok(officeAt > 0);
  const elseAt = drawer.indexOf(') : (', officeAt);
  const officeBlock = drawer.slice(officeAt, elseAt);
  const home = officeBlock.indexOf('label="Home"');
  const diary = officeBlock.indexOf('label="Diary"');
  const calendar = officeBlock.indexOf('label="Calendar"');
  const ask = officeBlock.indexOf('label="Ask Kelyra"');
  assert.ok(home >= 0 && diary > home && calendar > diary && ask > calendar);
  assert.doesNotMatch(officeBlock, /label="Feed"/);
  assert.doesNotMatch(officeBlock, /label="Manage"/);
  assert.match(officeBlock, /name="today"/);
  assert.match(officeBlock, /name="diary"/);
  assert.match(officeBlock, /name="calendar"/);
  assert.match(officeBlock, /KelyraMark/);

  const myChildren = drawer.indexOf('label="My children"');
  const signOut = drawer.indexOf('label="Sign out"');
  assert.ok(myChildren > 0 && signOut > myChildren);
  // Parent-hat My children is not gated on !canChooseSeat (dual-hat still sees it).
  assert.match(drawer, /isAlsoParent\(profile\) && matches\('My children'/);
  assert.doesNotMatch(drawer, /!chromeState\.canChooseSeat && isAlsoParent/);
});

test('P-04: pure teacher never shows office People/Manage/matrix as primary chrome', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /const teacherSeat = chromeState\.role === 'teacher'/);
  assert.match(drawer, /const officeSeat = isOfficeChromeRole\(chromeState\.role\)/);
  // Office nouns live inside officeSeat branches only.
  const teacherFamily = drawer.indexOf('label="Family update"');
  assert.ok(teacherFamily > 0);
  assert.match(drawer, /teacherSeat && matches\('Classes'/);
  assert.match(drawer, /\{officeSeat \? \(/);
  assert.match(drawer, /label="Sign out"[\s\S]*?danger/);
  // Two-phase enter/exit preserved.
  assert.match(drawer, /chrome\.motion\.drawerInX/);
  assert.match(drawer, /chrome\.motion\.drawerInY/);
  assert.match(drawer, /chrome\.motion\.drawerOutY/);
  assert.match(drawer, /chrome\.motion\.drawerOutX/);
});

test('P-04: parent drawer cannot delete children; Sign out danger; seat switch does not merge trays', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const parentAt = drawer.indexOf("{chromeState.role === 'parent' ? (");
  assert.ok(parentAt > 0);
  const parentBlock = drawer.slice(parentAt);
  assert.match(parentBlock, /label="My children"/);
  assert.match(parentBlock, /label="Sign out"/);
  assert.match(parentBlock, /danger/);
  assert.doesNotMatch(parentBlock, /Delete child|deleteChild|trailing=\{\[/);
  assert.match(drawer, /setChromeSeat\('parent'\)/);
  assert.match(drawer, /setChromeSeat\('teacher'\)/);
  assert.match(drawer, /setChromeSeat\('office'\)/);
});

test('P-04: administrator extras keep class list + Activity/Messages/Responsibilities; no Feed/Manage/People', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /Administrator keeps class list/);
  assert.doesNotMatch(drawer, /OPEN ISSUE/);
  const adminExtras = drawer.indexOf("{chromeState.role === 'administrator' ? (");
  assert.ok(adminExtras > 0);
  // Slice through admin extras only (before teacher-seat else branch).
  const teacherElse = drawer.indexOf(') : (', adminExtras);
  const adminBlock = drawer.slice(adminExtras, teacherElse > adminExtras ? teacherElse : adminExtras + 5000);
  assert.match(adminBlock, /chromeState\.classes\.filter/);
  assert.match(adminBlock, /label="Activity"/);
  assert.match(adminBlock, /label="Messages"/);
  assert.match(adminBlock, /label="Responsibilities"/);
  assert.doesNotMatch(adminBlock, /label="Feed"/);
  assert.doesNotMatch(adminBlock, /label="Manage"/);
  assert.doesNotMatch(adminBlock, /label="People"/);
});
