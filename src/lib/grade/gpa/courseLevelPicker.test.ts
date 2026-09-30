import assert from 'node:assert/strict';
import test from 'node:test';

import { listCourseLevelOptions, labelForCourseLevel } from './courseLevelPicker.ts';

test('catalog course level picker offers FR-LVL-01 set without dual alias', () => {
  const opts = listCourseLevelOptions();
  const keys = opts.map((o) => o.key);
  assert.deepEqual(keys, [
    'regular',
    'honors',
    'preap',
    'ap',
    'ib_hl',
    'ib_sl',
    'dual_credit',
    'onramps',
    'modified',
    'local',
  ]);
  assert.equal(labelForCourseLevel('ap'), 'AP');
  assert.equal(labelForCourseLevel('dual'), 'Dual Credit / Dual Enrollment');
});
