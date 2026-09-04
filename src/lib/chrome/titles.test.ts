import assert from 'node:assert/strict';
import test from 'node:test';

import { headerTitleFor } from './titles.ts';

const base = {
  pushedTitle: null,
  className: 'Algebra I',
  contextTab: 'desk',
  role: 'teacher',
};

test('CT-06: class panes keep class name wordmark', () => {
  for (const pathname of [
    '/class/c1',
    '/class/c1/setup',
    '/class/c1/gradebook',
    '/class/c1/gradebook?tab=heatmap',
    '/class/c1/assignments',
    '/class/c1/parents',
    '/class/c1/family',
    '/class/c1/feed',
    '/class/c1/syllabus',
  ]) {
    const pathOnly = pathname.split('?')[0]!;
    assert.equal(
      headerTitleFor({ ...base, pathname: pathOnly }),
      'Algebra I',
      pathOnly,
    );
  }
});
