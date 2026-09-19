import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, name.name);
    if (name.isDirectory()) walkTsx(rel, out);
    else if (name.name.endsWith('.tsx') && !name.name.includes('.test.')) out.push(rel);
  }
  return out;
}

/** Wrappers that must render PersonTabs (one morph implementation). */
const WRAPPERS = [
  'src/components/ui/ClassTabs.tsx',
  'src/components/ui/GradeTermTabs.tsx',
  'src/components/ui/StudentWorkList.tsx',
];

test('tab-row wrappers reuse PersonTabs (no forked morph)', () => {
  for (const rel of WRAPPERS) {
    const src = read(rel);
    assert.match(src, /from '@\/components\/ui\/PersonTabs'/, rel);
    assert.match(src, /<PersonTabs[\s>]/, rel);
    assert.doesNotMatch(src, /Animated\.timing/, `${rel} must not fork expand animation`);
  }
  const classTabs = read('src/components/ui/ClassTabs.tsx');
  assert.match(classTabs, /export function DeskSpanTabs/);
  assert.match(classTabs, /export function GradebookViewTabs/);
  assert.match(classTabs, /chrome\.motion\.personTab|PersonTabs/);
});

test('desk secondary shelves migrated off ChipRow', () => {
  const desk = read('src/app/class/[id]/index.tsx');
  const book = read('src/app/class/[id]/gradebook.tsx');
  assert.match(desk, /DeskSpanTabs/);
  assert.match(book, /GradebookViewTabs/);
  assert.doesNotMatch(desk, /ChipRow|label="Today"|label="This week"/);
  assert.doesNotMatch(book, /ChipRow|label="Gradebook"|label="Heatmap"/);
});

test('PersonTabs owns the morph duration token', () => {
  const theme = read('src/constants/theme.ts');
  const pills = read('src/components/ui/PersonTabs.tsx');
  assert.match(theme, /personTab:\s*975/);
  assert.match(pills, /chrome\.motion\.personTab/);
  assert.match(pills, /left-pinned|left.?pin/i);
  assert.match(pills, /selected \? colors\.brand : colors\.mute/);
});

test('no second horizontal tab morph beside PersonTabs / FloatingTabTray', () => {
  const files = walkTsx('src');
  const offenders: string[] = [];
  for (const rel of files) {
    if (rel.endsWith('PersonTabs.tsx') || rel.endsWith('FloatingTabTray.tsx')) continue;
    if (rel.endsWith('CollapsingPageChrome.tsx') || rel.endsWith('MessagesTray.tsx')) continue;
    if (rel.endsWith('AppHeader.tsx') || rel.endsWith('HamburgerDrawer.tsx')) continue;
    if (rel.endsWith('MarqueeText.tsx') || rel.endsWith('SplashLanding.tsx')) continue;
    if (rel.endsWith('WorkRow.tsx') || rel.endsWith('ListRow.tsx') || rel.endsWith('Screen.tsx')) continue;
    if (rel.endsWith('FeedPane.tsx') || rel.endsWith('WorkingMark.tsx') || rel.endsWith('MessagesMenu.tsx')) continue;
    const src = read(rel);
    // Forked pill expand: Animated.timing + personTab-like width morph outside PersonTabs.
    if (/Animated\.timing/.test(src) && /pillWidth|selectedMax|labelWidth|expand\.interpolate/.test(src)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});

test('FoM default labelPolicy is visibilityReserve on PersonTabs', () => {
  const pills = read('src/components/ui/PersonTabs.tsx');
  const layout = read('src/components/ui/personTabsLayout.ts');
  const docs = read('docs/ui-design.md');
  assert.match(pills, /labelPolicy = 'visibilityReserve'/);
  assert.match(layout, /policy: PersonTabLabelPolicy = 'visibilityReserve'/);
  assert.match(docs, /visibilityReserve.*product default|default is `visibilityReserve`/i);
  assert.match(docs, /personTabScrollX/);
  // Wrappers must not fork fraction as default destination policy
  const classTabs = read('src/components/ui/ClassTabs.tsx');
  assert.doesNotMatch(classTabs, /labelPolicy=["']fraction["']/);
  // Tray / NT-A stay out of PersonTabs morph
  assert.doesNotMatch(read('src/components/ui/FloatingTabTray.tsx'), /from '@\/components\/ui\/PersonTabs'/);
  assert.doesNotMatch(read('src/components/ui/ContextMenuRow.tsx'), /from '@\/components\/ui\/PersonTabs'/);
});

test('PersonTabs default CM-Linear; ClassTabs mapping-only; current is opt-out only', () => {
  const pills = read('src/components/ui/PersonTabs.tsx');
  const classTabs = read('src/components/ui/ClassTabs.tsx');
  const layout = read('src/components/ui/personTabsLayout.ts');
  const docs = read('docs/ui-design.md');
  // PersonTabs owns timing; default motionPack = cm-linear (linear both ways)
  assert.match(pills, /motionPack = 'cm-linear'/);
  assert.match(pills, /personTabExpandEasingKind\(selected, motionPack\)/);
  assert.match(pills, /chrome\.motion\.personTab/);
  assert.match(layout, /PersonTabMotionPack = 'current' \| 'cm-linear'/);
  assert.match(layout, /motionPack: PersonTabMotionPack = 'cm-linear'/);
  // ClassTabs mapping-only — inherits default (no Animated.timing fork)
  assert.match(classTabs, /export function ClassTabs/);
  assert.doesNotMatch(classTabs, /Animated\.timing/);
  // No destination row passes cubic opt-out
  assert.doesNotMatch(classTabs, /motionPack=["']current["']/);
  for (const rel of [
    'src/components/ui/GradeTermTabs.tsx',
    'src/components/ui/StudentWorkList.tsx',
    'src/components/ui/FeedPane.tsx',
    'src/components/ui/PeopleAdmin.tsx',
    'src/app/index.tsx',
    'src/app/diary.tsx',
    'src/app/messages/index.tsx',
    'src/app/todo.tsx',
    'src/app/profile.tsx',
    'src/app/student/class.tsx',
    'src/app/student/feed.tsx',
    'src/app/student/people.tsx',
    'src/app/admin/class/[id].tsx',
    'src/app/class/[id]/student/[studentId].tsx',
    'src/app/class/[id]/parent/[parentId].tsx',
  ]) {
    assert.doesNotMatch(read(rel), /motionPack=["']current["']/, rel);
  }
  // Spec lock: linear both ways + FoM CM-Linear default
  assert.match(docs, /linear both ways|Easing\.linear.*grow.*shrink|CM-Linear/i);
  // Tray / ChipRow / inbox job tabs stay exceptions
  assert.doesNotMatch(read('src/components/ui/FloatingTabTray.tsx'), /from '@\/components\/ui\/PersonTabs'/);
  assert.doesNotMatch(read('src/components/ui/ContextMenuRow.tsx'), /from '@\/components\/ui\/PersonTabs'/);
});
