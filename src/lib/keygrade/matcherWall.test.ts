import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTwinCandidates } from './twins.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('matcher never INSERT students (source wall)', () => {
  const matchNameSrc = readFileSync(join(root, 'src/lib/matching/matchName.ts'), 'utf8');
  assert.doesNotMatch(matchNameSrc, /\.insert\(|from\('students'\)\.insert/);
  // Ambiguous first names fail closed (no single winner)
  assert.match(matchNameSrc, /winners\.length !== 1/);
  const captureApi = readFileSync(join(root, 'src/lib/captures/api.ts'), 'utf8');
  const apply = captureApi.slice(captureApi.indexOf('applyTranscriptAndMatch'));
  assert.doesNotMatch(apply.slice(0, 1200), /from\('students'\)\.insert/);
  const packB = readFileSync(join(root, 'src/components/ui/KeygradePackBReview.tsx'), 'utf8');
  assert.match(packB, /never creates a roster row|Matcher never/i);
});

test('twins / two same first names: never auto-pick', () => {
  const roster = [
    { studentId: '1', displayName: 'Mateo Alvarez', aliases: [] },
    { studentId: '2', displayName: 'Mateo Ruiz', aliases: [] },
    { studentId: '3', displayName: 'Sofia Chen', aliases: [] },
  ];
  const twins = findTwinCandidates('Mateo', roster);
  assert.equal(twins.length, 2);
  assert.deepEqual(
    twins.map((t) => t.studentId).sort(),
    ['1', '2'],
  );
  assert.equal(findTwinCandidates('Sofia', roster).length, 0);
});

test('createCapture starts Unassigned (student_id null)', () => {
  const api = readFileSync(join(root, 'src/lib/captures/api.ts'), 'utf8');
  const fn = api.slice(api.indexOf('export async function createCapture'));
  assert.match(fn.slice(0, 800), /student_id:\s*null/);
  assert.match(fn.slice(0, 800), /status:\s*'unassigned'/);
});
