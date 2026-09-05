import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatHelpUsedRowSummary,
  formatItemHelpUsed,
  itemHelpTotal,
  parseHelpUsed,
  totalHelpUsed,
} from './helpUsed.ts';

test('GAUTH G5 parseHelpUsed ignores junk and non-positive counts', () => {
  assert.deepEqual(parseHelpUsed(null), {});
  assert.deepEqual(parseHelpUsed('secret keystrokes'), {});
  assert.deepEqual(
    parseHelpUsed({ 'item-1': { hint: 2, next_step: 0, bogus: 9, check_work: 1 } }),
    { 'item-1': { hint: 2, check_work: 1 } },
  );
});

test('GAUTH G5 totals and item label', () => {
  const used = parseHelpUsed({
    a: { hint: 2, next_step: 1 },
    b: { check_work: 1 },
  });
  assert.equal(itemHelpTotal(used, 'a'), 3);
  assert.equal(itemHelpTotal(used, 'missing'), 0);
  assert.equal(totalHelpUsed(used), 4);
  assert.equal(formatItemHelpUsed(used, 'a'), 'Help used 3');
  assert.equal(formatItemHelpUsed(used, 'z'), null);
});

test('GAUTH G5 row summary prefers hints on Q#', () => {
  const used = parseHelpUsed({
    'item-1': { check_work: 1 },
    'item-2': { hint: 3 },
  });
  assert.equal(formatHelpUsedRowSummary(used, ['item-1', 'item-2']), 'Help used: 3 hints on Q2');
  assert.equal(formatHelpUsedRowSummary({}, ['item-1']), null);
});

test('GAUTH G5 no keystroke payload in helpers', () => {
  const src = [
    formatItemHelpUsed,
    formatHelpUsedRowSummary,
    parseHelpUsed,
  ]
    .map((fn) => String(fn))
    .join('\n');
  assert.doesNotMatch(src, /keystroke|attemptText|answerKey/i);
});
