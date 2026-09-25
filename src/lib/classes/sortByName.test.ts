import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { sortClassesByName } from './sortByName.ts';

test('classes sort alphabetically, case-insensitive, numbers natural', () => {
  const rows = [{ name: 'science' }, { name: 'Period 10' }, { name: 'Art' }, { name: 'Period 2' }, { name: null }];
  assert.deepEqual(
    sortClassesByName(rows).map((r) => r.name),
    [null, 'Art', 'Period 2', 'Period 10', 'science'],
  );
  assert.equal(rows[0]!.name, 'science');
});

test('Classes tab uses the sort and drops the "Every class in the school" lead', () => {
  const src = readFileSync(new URL('../../app/index.tsx', import.meta.url), 'utf8');
  assert.match(src, /sortClassesByName\(classes \?\? \[\]\)\.map\(/);
  assert.doesNotMatch(src, /Every class in the school/);
});
