import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('TextField dictationSafe keeps iOS native text uncontrolled and remounts on outside changes', () => {
  const src = read('TextField.tsx');
  assert.match(src, /DICTATION-DOUBLE/);
  assert.match(src, /Boolean\(dictationSafe\) && Platform\.OS === 'ios' && value !== undefined/);
  assert.match(src, /value=\{uncontrolled \? undefined : value\}/);
  assert.match(src, /key=\{uncontrolled \? `dictation-safe-\$\{epoch\}` : 'controlled'\}/);
});

test('New person fields opt in to dictationSafe', () => {
  const src = read('PeopleAdmin.tsx');
  const form = src.slice(src.indexOf('export function CreateLoginForm('), src.indexOf('function listedAsParent('));
  assert.equal((form.match(/<TextField/g) ?? []).length, (form.match(/dictationSafe/g) ?? []).length);
});
