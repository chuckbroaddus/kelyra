import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { familySubmittedAt } from './familyDetailFields.ts';

test('FAD: familySubmittedAt present/absent — never approved_at', () => {
  assert.equal(familySubmittedAt('2026-09-10T12:00:00Z'), '2026-09-10T12:00:00Z');
  assert.equal(familySubmittedAt(null), null);
  assert.equal(familySubmittedAt(undefined), null);
  assert.equal(familySubmittedAt(''), null);
  assert.equal(familySubmittedAt('   '), null);

  const api = readFileSync(join(process.cwd(), 'src/lib/gradebook/api.ts'), 'utf8');
  const mapper = api.slice(api.indexOf('function mapGradebookRows'), api.indexOf('export async function loadStudentGradebook'));
  assert.match(mapper, /familySubmittedAt\(row\.submitted_at\)/);
  assert.doesNotMatch(mapper, /approved_at/);
});

test('FAD: openAssignmentDetail wires submittedAt; familyComment unset; no other invent', () => {
  const book = readFileSync(join(process.cwd(), 'src/components/ui/StudentGradeBook.tsx'), 'utf8');
  assert.match(book, /submittedAt:\s*cell\.submittedAt/);
  assert.doesNotMatch(book, /familyComment\s*:/);
  assert.doesNotMatch(book, /\?\?\s*'other'/);
  assert.match(book, /familyFacingCategoryLabel/);
  assert.match(book, /coerceIncludeInAverage/);
  assert.doesNotMatch(book, /draft_score|parent_sentence/);
  // Glow/Grow only allowed in comments as forbidden note — ensure no mapping assignment
  const open = book.slice(book.indexOf('const openAssignmentDetail'));
  assert.doesNotMatch(open.slice(0, 1200), /Glow|Grow|approved_at/);
});
