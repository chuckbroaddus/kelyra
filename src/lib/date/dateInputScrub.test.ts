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

/** Journal composer date — owned by fix/journal-date-drum (separate PR). */
const EXCLUDED_TEXT_DATE_SITES = new Set(['src/app/diary.tsx']);

/** Time-only TextFields are out of scope for the drum scrub. */
const TIME_ONLY_LABELS = ['Start time', 'End time (optional)'];

const DATEISH_LABEL = /label\s*=\s*(?:\{[^}]*\}|["'`][^"'`]*["'`])/g;

function labelLooksDateLike(labelExpr: string): boolean {
  const raw = labelExpr.replace(/^label\s*=\s*/, '');
  const quoted = raw.match(/["'`]([^"'`]*)["'`]/);
  const text = (quoted?.[1] ?? raw).toLowerCase();
  if (TIME_ONLY_LABELS.some((t) => text === t.toLowerCase())) return false;
  if (text.includes('·')) return false;
  return (
    /\bdate\b/.test(text) ||
    /yyyy/.test(text) ||
    /mm-dd/.test(text) ||
    /\bbirthday\b/.test(text) ||
    /\bdue\b/.test(text)
  );
}

function elementKindBefore(
  src: string,
  labelIndex: number,
): 'DateInput' | 'TextField' | 'TextInput' | 'other' {
  const before = src.slice(Math.max(0, labelIndex - 240), labelIndex);
  const dateAt = before.lastIndexOf('<DateInput');
  const fieldAt = before.lastIndexOf('<TextField');
  const inputAt = before.lastIndexOf('<TextInput');
  const best = Math.max(dateAt, fieldAt, inputAt);
  if (best < 0) return 'other';
  if (best === dateAt) return 'DateInput';
  if (best === fieldAt) return 'TextField';
  return 'TextInput';
}

test('converted: DiarySettingsSheet From/To use DateInput (not TextField)', () => {
  const sheet = read('src/components/diary/DiarySettingsSheet.tsx');
  assert.match(sheet, /import \{ DateInput \} from '@\/components\/ui\/DateInput'/);
  assert.match(sheet, /label="From date"/);
  assert.match(sheet, /label="To date"/);
  const fromAt = sheet.indexOf('label="From date"');
  const toAt = sheet.indexOf('label="To date"');
  assert.equal(elementKindBefore(sheet, fromAt), 'DateInput');
  assert.equal(elementKindBefore(sheet, toAt), 'DateInput');
  assert.doesNotMatch(sheet, /label="From date \(YYYY-MM-DD\)"/);
  assert.doesNotMatch(sheet, /label="To date \(YYYY-MM-DD\)"/);
  assert.doesNotMatch(sheet, /onChangeText=\{props\.onChangeLedgerFrom\}/);
  assert.doesNotMatch(sheet, /onChangeText=\{props\.onChangeLedgerTo\}/);
});

test('converted: admin ride School date uses DateInput (not TextField)', () => {
  const screen = read('src/app/admin/ride/index.tsx');
  assert.match(screen, /import \{ DateInput \} from '@\/components\/ui\/DateInput'/);
  assert.match(screen, /label="School date"/);
  const at = screen.indexOf('label="School date"');
  assert.equal(elementKindBefore(screen, at), 'DateInput');
  assert.doesNotMatch(screen, /School date YYYY-MM-DD/);
  assert.doesNotMatch(screen, /onChangeText=\{setDay\}/);
});

test('already drum: known birthday/due/start/end DateInput sites stay DateInput', () => {
  const sites: Array<{ rel: string; needle: string }> = [
    { rel: 'src/app/parent.tsx', needle: 'mode="birthday"' },
    { rel: 'src/components/calendar/EventComposer.tsx', needle: 'label="Start"\n' },
    { rel: 'src/components/calendar/EventComposer.tsx', needle: 'label="End (optional)"' },
    { rel: 'src/app/parent/vehicles.tsx', needle: 'label="Start date"' },
    { rel: 'src/app/parent/vehicles.tsx', needle: 'label="End date"' },
    { rel: 'src/app/class/[id]/student/[studentId].tsx', needle: 'mode="birthday"' },
    { rel: 'src/components/ui/AssignmentForm.tsx', needle: 'label="DUE DATE"' },
    { rel: 'src/components/ui/ProfileDetails.tsx', needle: 'mode="birthday"' },
    { rel: 'src/components/ui/PeopleAdmin.tsx', needle: 'mode="birthday"' },
  ];
  for (const site of sites) {
    const src = read(site.rel);
    assert.match(src, /DateInput/, site.rel);
    const at = src.indexOf(site.needle);
    assert.ok(at >= 0, `${site.rel} missing ${site.needle}`);
    assert.equal(elementKindBefore(src, at), 'DateInput', `${site.rel} ${site.needle}`);
  }
});

test('scrub: no TextField/TextInput date-entry labels outside exclusions', () => {
  const offenders: string[] = [];
  for (const rel of walkTsx('src')) {
    const norm = rel.replace(/\\/g, '/');
    if (norm.endsWith('DateInput.tsx')) continue;
    if (EXCLUDED_TEXT_DATE_SITES.has(norm)) continue;
    const src = read(rel);
    DATEISH_LABEL.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DATEISH_LABEL.exec(src)) != null) {
      if (!labelLooksDateLike(match[0])) continue;
      const kind = elementKindBefore(src, match.index);
      if (kind === 'TextField' || kind === 'TextInput') {
        offenders.push(`${norm}:${match[0]} (${kind})`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `plain text date fields must use DateInput:\n${offenders.join('\n')}`,
  );
});

test('inventory anchors: journal Date still separate PR; time-only excluded', () => {
  const diary = read('src/app/diary.tsx');
  assert.match(diary, /label="Date \(YYYY-MM-DD\)"/);
  assert.equal(
    elementKindBefore(diary, diary.indexOf('label="Date (YYYY-MM-DD)"')),
    'TextField',
  );

  const composer = read('src/components/calendar/EventComposer.tsx');
  assert.equal(elementKindBefore(composer, composer.indexOf('label="Start time"')), 'TextField');
  assert.equal(
    elementKindBefore(composer, composer.indexOf('label="End time (optional)"')),
    'TextField',
  );
});
