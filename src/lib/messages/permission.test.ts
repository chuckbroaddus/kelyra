import assert from 'node:assert/strict';
import test from 'node:test';

import { isMessageable } from './permission.ts';

test('Message is offered only when the person is in the allowed directory', () => {
  const allowed = new Set(['teacher-1', 'admin-1']);
  assert.equal(isMessageable('teacher-1', allowed), true);
  assert.equal(isMessageable('classmate-1', allowed), false);
  assert.equal(isMessageable(null, allowed), false);
  assert.equal(isMessageable(undefined, new Set()), false);
});
