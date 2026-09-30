import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGroupScorePatches } from './groupScoreEntry.ts';

test('buildGroupScorePatches expands group + override', () => {
  const patches = buildGroupScorePatches(
    { group_id: 'g1', assignment_id: 'a1', raw: 88, student_ids: ['s1', 's2'] },
    { s2: 99 },
  );
  assert.equal(patches.length, 2);
  assert.equal(patches[0]!.raw, 88);
  assert.equal(patches[0]!.score_source, 'group');
  assert.equal(patches[1]!.raw, 99);
  assert.equal(patches[1]!.score_source, 'group_override');
  assert.equal(patches[1]!.override_wins, true);
});
