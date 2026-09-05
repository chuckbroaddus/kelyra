import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DIARY_FERPA_NOTE,
  DIARY_FORBIDDEN_PRIVACY_PHRASES,
  DIARY_PRIVACY_BODY,
  DIARY_PRIVACY_TITLE,
  diaryPrivacyCopyIsHonest,
} from './privacy.ts';

test('privacy fixtures are honest model C', () => {
  assert.ok(DIARY_PRIVACY_TITLE.includes('Private to you'));
  assert.ok(DIARY_PRIVACY_BODY.includes('School IT or a legal process'));
  assert.ok(DIARY_FERPA_NOTE.includes('not the official student file'));
  assert.equal(diaryPrivacyCopyIsHonest(DIARY_PRIVACY_BODY), true);
  assert.equal(diaryPrivacyCopyIsHonest('end-to-end encrypted diary'), false);
  assert.equal(DIARY_FORBIDDEN_PRIVACY_PHRASES.length, 3);
});
