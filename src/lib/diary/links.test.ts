import assert from 'node:assert/strict';
import test from 'node:test';

import { diaryBodyUrls, diaryBodyWithoutUrls } from './links.ts';

test('diaryBodyUrls finds http(s) and bare www addresses, trims punctuation, dedupes', () => {
  const text = 'See https://example.com/a, and www.kelyra.app. Again https://example.com/a';
  assert.deepEqual(diaryBodyUrls(text), ['https://example.com/a', 'https://www.kelyra.app']);
});

test('diaryBodyUrls returns nothing for plain text', () => {
  assert.deepEqual(diaryBodyUrls('Great day in 3rd period.'), []);
});

test('diaryBodyWithoutUrls removes addresses but keeps the words', () => {
  assert.equal(diaryBodyWithoutUrls('Read this https://example.com/x today.'), 'Read this today.');
  assert.equal(diaryBodyWithoutUrls('Link: www.kelyra.app'), 'Link:');
});
