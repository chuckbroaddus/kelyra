import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const drawerPath = 'src/components/ui/HamburgerDrawer.tsx';

/** Locked glyph table from notes/company/hamburger-icons-all-seats-intent.md §3. */
const GLYPH_BY_LABEL: Record<string, string> = {
  Home: 'today',
  Diary: 'diary',
  Calendar: 'calendar',
  'Ask Kelyra': 'KelyraMark',
  Activity: 'history',
  Messages: 'chat',
  Responsibilities: 'details',
  Classes: 'classes',
  Students: 'person',
  'Grade book': 'grades',
  Grades: 'grades',
  Parents: 'parents',
  'Family update': 'family',
  'Class settings': 'settings',
  'My children': 'children',
  Office: 'manage',
  Teach: 'classes',
  Parent: 'parents',
  'Sign out': 'login',
  Assignments: 'work',
  Feeds: 'post',
  People: 'person',
};

function readDrawer(): string {
  return readFileSync(join(root, drawerPath), 'utf8');
}

function drawerRowCallSites(src: string): string[] {
  const sites: string[] = [];
  const re = /<DrawerRow\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index;
    const before = src.slice(Math.max(0, start - 20), start);
    if (/function\s+$/.test(before)) continue;
    const slice = src.slice(start, start + 800);
    const endSelf = slice.search(/\/>/);
    const endClose = slice.search(/<\/DrawerRow>/);
    let end = -1;
    if (endSelf >= 0 && (endClose < 0 || endSelf < endClose)) end = endSelf + 2;
    else if (endClose >= 0) end = endClose + '</DrawerRow>'.length;
    assert.ok(end > 0, `unclosed DrawerRow near offset ${start}`);
    sites.push(slice.slice(0, end));
  }
  return sites;
}

function labelOf(site: string): string | null {
  const staticLabel = site.match(/\blabel="([^"]+)"/);
  if (staticLabel) return staticLabel[1];
  if (/label=\{switchRow\.label\}/.test(site)) return '__switchRow__';
  return null;
}

function glyphOf(site: string): string | null {
  if (/leading=\{\s*<KelyraMark\b/.test(site) || /leading=\{<KelyraMark\b/.test(site)) {
    return 'KelyraMark';
  }
  const fixed = site.match(/leading=\{\s*<Icon\s+name="([a-zA-Z0-9]+)"/);
  if (fixed) return fixed[1];
  const compact = site.match(/leading=\{<Icon\s+name="([a-zA-Z0-9]+)"/);
  if (compact) return compact[1];
  if (/switchRow\.label\s*===\s*'Teach'\s*\?\s*'classes'\s*:\s*'manage'/.test(site)) {
    return '__switch_teach_office__';
  }
  return null;
}

test('HI-01: every DrawerRow call site has a right-of-label icon', () => {
  const src = readDrawer();
  const sites = drawerRowCallSites(src);
  assert.equal(sites.length, 29, `expected 29 DrawerRow call sites, got ${sites.length}`);

  const def = src.slice(src.indexOf('function DrawerRow('));
  const bodyMatch = def.match(/<Text[\s\S]*?\{label\}[\s\S]*?<\/Text>\s*\{leading\}/);
  assert.ok(bodyMatch, 'DrawerRow must render {leading} after the label Text (right of label)');
  assert.doesNotMatch(
    def.slice(0, 600),
    /\{leading\}\s*<Text/,
    'DrawerRow must not place {leading} before the label Text',
  );

  const missing: string[] = [];
  for (const site of sites) {
    const label = labelOf(site);
    const glyph = glyphOf(site);
    if (!glyph) missing.push(label ?? site.slice(0, 80));
  }
  assert.deepEqual(missing, [], `DrawerRow sites missing leading icon: ${missing.join(', ')}`);
});

test('HI-03: same label = same glyph; locked table; Sign out danger', () => {
  const src = readDrawer();
  const sites = drawerRowCallSites(src);
  const byLabel = new Map<string, Set<string>>();

  for (const site of sites) {
    const label = labelOf(site);
    const glyph = glyphOf(site);
    assert.ok(label, `site without label: ${site.slice(0, 100)}`);
    assert.ok(glyph, `site without glyph: ${label}`);
    const lab = label as string;
    const gly = glyph as string;

    if (lab === '__switchRow__') {
      assert.equal(gly, '__switch_teach_office__');
      for (const [l, g] of [
        ['Teach', 'classes'],
        ['Office', 'manage'],
      ] as const) {
        if (!byLabel.has(l)) byLabel.set(l, new Set());
        byLabel.get(l)!.add(g);
      }
      continue;
    }

    if (!byLabel.has(lab)) byLabel.set(lab, new Set());
    byLabel.get(lab)!.add(gly);

    const locked = GLYPH_BY_LABEL[lab];
    assert.ok(locked, `unexpected DrawerRow label (not in lock table): ${lab}`);
    assert.equal(gly, locked, `label "${lab}" must use glyph ${locked}, got ${gly}`);

    if (lab === 'Sign out') {
      assert.match(site, /color=\{colors\.danger\}/, 'Sign out icon must use colors.danger');
      assert.match(site, /\bdanger\b/, 'Sign out row must keep danger prop');
    } else if (gly !== 'KelyraMark') {
      assert.match(site, /color=\{colors\.ink\}/, `${lab} icon should use colors.ink`);
    }

    if (gly !== 'KelyraMark') {
      assert.match(site, /size=\{22\}/, `${lab} icon size must be 22`);
    } else {
      assert.match(site, /<KelyraMark\s+size=\{22\}/, 'Ask Kelyra stays KelyraMark size 22');
    }
  }

  for (const [label, glyphs] of byLabel) {
    assert.equal(
      glyphs.size,
      1,
      `same label must share one glyph; "${label}" has ${[...glyphs].join(', ')}`,
    );
  }

  assert.equal([...byLabel.get('Home')!][0], 'today');
  assert.equal([...byLabel.get('Diary')!][0], 'diary');
  assert.equal([...byLabel.get('Calendar')!][0], 'calendar');
  assert.equal([...byLabel.get('Ask Kelyra')!][0], 'KelyraMark');
});

test('HI-05: leading prop name kept; every call site passes leading', () => {
  const src = readDrawer();
  assert.match(src, /leading\?:/);
  assert.doesNotMatch(src, /\btrailingIcon\b/);
  const sites = drawerRowCallSites(src);
  for (const site of sites) {
    assert.match(site, /\bleading=/);
  }
});
