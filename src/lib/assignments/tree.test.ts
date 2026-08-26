import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bookRowPad,
  buildAssignmentTree,
  flattenBookTree,
  defaultExpandedIds,
  groupingLabels,
  sortBookLabels,
  unitSectionHeading,
  visibleBookRows,
} from './tree.ts';
import type { AssignmentRow } from '../supabase/types.ts';

function assignment(partial: Partial<AssignmentRow> & Pick<AssignmentRow, 'id' | 'title'>): AssignmentRow {
  return {
    class_id: 'c1',
    kind: 'practice',
    capture_id: null,
    practice_set_id: null,
    due_at: null,
    max_score: null,
    created_at: '2026-08-01T00:00:00Z',
    ...partial,
  };
}

test('prefix keeps two class trees from sharing group ids', () => {
  const math = [assignment({ id: 'a1', title: 'Quiz', unit: 'One' })];
  const read = [assignment({ id: 'a2', title: 'Quiz', unit: 'One' })];
  const tree = [
    ...buildAssignmentTree('Math', math, 'c-math'),
    ...buildAssignmentTree('Read', read, 'c-read'),
  ];
  const ids = tree.map((row) => row.id);
  assert.deepEqual(
    new Set(ids).size,
    ids.length,
  );
  assert.ok(ids.includes('c-math:class'));
  assert.ok(ids.includes('c-read:unit:One'));
  assert.ok(flattenBookTree(tree, new Set(defaultExpandedIds(tree))).some((row) => row.id === 'a1'));
});

test('book chips put numbers first (low to high), then text A–Z', () => {
  assert.deepEqual(sortBookLabels(['Math', '10', '2', 'Algebra', '1.5', 'fractions']), [
    '1.5',
    '2',
    '10',
    'Algebra',
    'fractions',
    'Math',
  ]);
  const labels = groupingLabels([
    assignment({ id: 'a', title: 'A', unit: 'Math', section: 'Quiz' }),
    assignment({ id: 'b', title: 'B', unit: '2', section: '10' }),
    assignment({ id: 'c', title: 'C', unit: '1', section: 'Homework' }),
  ]);
  assert.deepEqual(labels.units, ['1', '2', 'Math']);
  assert.deepEqual(labels.sections, ['10', 'Homework', 'Quiz']);
});

test('unit and section share one expandable grade-book row', () => {
  assert.equal(unitSectionHeading('Math', 'Math'), 'Math · Math');
  assert.equal(unitSectionHeading('1', '1'), '1 · 1');
  assert.equal(unitSectionHeading('Math', '1.1'), 'Math · 1.1');
  assert.equal(unitSectionHeading('Other', 'Quiz'), 'Quiz');
  const tree = buildAssignmentTree('FoM', [
    assignment({ id: 'a1', title: 'Quiz', unit: 'Math', section: '1.1' }),
    assignment({ id: 'a2', title: 'Drill', unit: 'Math', section: '1.1' }),
    assignment({ id: 'a3', title: 'Blank', unit: null, section: null }),
  ]);
  const mathUnit = tree.find((row) => row.kind === 'unit' && row.title === 'Math');
  const section = tree.find((row) => row.kind === 'section' && row.sectionTitle === '1.1');
  assert.ok(mathUnit?.expandable);
  assert.equal(section?.unitId, mathUnit?.id);
  assert.equal(section?.unitTitle, 'Math');
  assert.equal(tree.find((row) => row.id === 'a1')?.indent, 3);
  const open = visibleBookRows(tree, new Set(defaultExpandedIds(tree)));
  assert.equal(
    open.some((row) => row.kind === 'unit'),
    false,
  );
  assert.ok(open.some((row) => row.kind === 'section' && row.sectionTitle === '1.1'));
  assert.ok(open.some((row) => row.id === 'a1'));
  const unitClosed = new Set(defaultExpandedIds(tree));
  unitClosed.delete(mathUnit!.id);
  const folded = visibleBookRows(tree, unitClosed);
  assert.ok(folded.some((row) => row.id === mathUnit!.id));
  assert.equal(
    folded.some((row) => row.sectionTitle === '1.1' || row.id === 'a1'),
    false,
  );
  assert.equal(bookRowPad(mathUnit!), bookRowPad(section!));
  const classRow = tree.find((row) => row.kind === 'class');
  assert.equal(bookRowPad(classRow!), 0);
  assert.ok(bookRowPad(section!) > 0);
  const classOnly = flattenBookTree(tree, new Set(['class']));
  assert.ok(classOnly.some((row) => row.kind === 'unit'));
  assert.equal(
    classOnly.some((row) => row.id === 'a1'),
    false,
  );
});
