import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createAccountErrorNotice, createdAccountNotice } from './createLoginNotice.ts';

test('success names the person and handle', () => {
  assert.deepEqual(createdAccountNotice('Jane Smith', '@JSmith'), {
    tone: 'success',
    message: 'Account for Jane Smith @jsmith has been successfully created.',
  });
});

test('success without a display name uses the handle only', () => {
  assert.equal(
    createdAccountNotice('', 'jsmith').message,
    'Account for @jsmith has been successfully created.',
  );
});

test('error carries the reason', () => {
  assert.deepEqual(createAccountErrorNotice('Email already registered'), {
    tone: 'error',
    message: 'Account was not created. Email already registered',
  });
});

test('CreateLoginForm shows the pop-up on success and failure', () => {
  const src = readFileSync(new URL('../../components/ui/PeopleAdmin.tsx', import.meta.url), 'utf8');
  assert.match(src, /setNotice\(createdAccountNotice\(displayName, username\)\)/);
  assert.match(src, /fail\(err instanceof Error \? err\.message : 'Could not create account'\)/);
  assert.match(src, /<NoticePopup notice=\{notice\} onDismiss=\{dismissNotice\} \/>/);
});
