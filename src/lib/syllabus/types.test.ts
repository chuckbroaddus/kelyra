import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSyllabusVersionSnapshot,
  defaultSyllabusV2Fields,
  parseLateRule,
} from './types.ts';

test('defaultSyllabusV2Fields match today (percent-inside, EC B, omit missing)', () => {
  const d = defaultSyllabusV2Fields();
  assert.equal(d.engine, 'weighted_percent_inside');
  assert.equal(d.book_mode, 'reset_each_marking_period');
  assert.equal(d.extra_credit_method, 'B');
  assert.equal(d.missing_rule, 'omit');
  assert.equal(d.late_rule.type, 'none');
  assert.equal(d.syllabus_version, 1);
});

test('parseLateRule tolerates junk', () => {
  assert.equal(parseLateRule(null).type, 'none');
  assert.equal(parseLateRule({ type: 'per_day', amount: 10, unit: 'percent' }).type, 'per_day');
  assert.equal(parseLateRule({ type: 'nope' }).type, 'none');
});

test('buildSyllabusVersionSnapshot increments fields without mutation', () => {
  const cats = [
    {
      key: 'hw',
      label: 'HW',
      weight_percent: 40,
      drop_highest_n: 1,
      never_drop_flags: ['final'],
    },
    { key: 'test', label: 'Test', weight_percent: 60 },
  ];
  const a = buildSyllabusVersionSnapshot({ version: 1, categories: cats, title: 'T' });
  const b = buildSyllabusVersionSnapshot({
    version: 2,
    categories: cats,
    title: 'T2',
    v2: { engine: 'item_weights' },
  });
  assert.equal(a.version, 1);
  assert.equal(b.version, 2);
  assert.equal(a.engine, 'weighted_percent_inside');
  assert.equal(b.engine, 'item_weights');
  assert.deepEqual(a.categories[0]?.never_drop_flags, ['final']);
  assert.equal(a.categories[0]?.drop_highest_n, 1);
  // source array not shared by identity into snapshot lists
  assert.notEqual(a.categories[0]?.never_drop_flags, cats[0]!.never_drop_flags);
});
