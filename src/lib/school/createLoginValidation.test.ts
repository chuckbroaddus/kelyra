import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fieldForServerError,
  firstCreateLoginError,
  isValidEmail,
  usernameProblem,
  validateCreateLogin,
} from './createLoginValidation.ts';

const good = {
  displayName: 'Jane Smith',
  username: '@jsmith',
  email: 'jane@school.org',
  password: 'temp123',
  role: 'teacher',
};

test('a complete, unique draft passes', () => {
  assert.deepEqual(validateCreateLogin(good, [{ username: 'bob', email: 'bob@x.org', display_name: 'Bob' }]), {});
});

test('every required field reports "is required"', () => {
  const errors = validateCreateLogin({ displayName: ' ', username: '', email: '', password: '   ', role: null });
  assert.deepEqual(errors, {
    displayName: 'Display name is required',
    username: 'Username is required',
    email: 'Email is required',
    password: 'Temporary password is required',
    role: 'Role is required',
  });
  assert.equal(firstCreateLoginError(errors), 'Display name is required');
});

test('email must look like an address', () => {
  assert.equal(isValidEmail('jane@school.org'), true);
  assert.equal(isValidEmail('jane.smith@mail.school.org'), true);
  for (const bad of ['jane', 'jane@', 'jane@school', 'jane@@school.org', 'ja ne@school.org', 'jane@school.o', '@school.org']) {
    assert.equal(isValidEmail(bad), false, bad);
  }
  assert.equal(validateCreateLogin({ ...good, email: 'jane@school' }).email, 'Enter a valid email address');
});

test('username: no spaces, letters/numbers/_ only, 2–32', () => {
  assert.equal(usernameProblem('@Jane_Smith2'), null);
  assert.equal(usernameProblem('jane smith'), 'Username cannot contain spaces');
  assert.equal(usernameProblem('jane.smith'), 'Username can use only letters, numbers, and _');
  assert.equal(usernameProblem('j'), 'Username must be at least 2 characters');
  assert.equal(usernameProblem('a'.repeat(33)), 'Username must be 32 characters or fewer');
});

test('short temporary password is rejected', () => {
  assert.equal(
    validateCreateLogin({ ...good, password: 'abc' }).password,
    'Temporary password must be at least 6 characters',
  );
});

test('conflicts: username, email, display name (case and spacing ignored)', () => {
  const existing = [{ username: 'jsmith', email: 'JANE@school.org', display_name: 'jane  smith' }];
  assert.deepEqual(validateCreateLogin(good, existing), {
    username: '@jsmith is already taken',
    email: 'That email is already registered',
    displayName: 'Jane Smith already exists',
  });
});

test('server errors map back to a field', () => {
  assert.equal(fieldForServerError('Could not create login: that email already has a login'), 'email');
  assert.equal(fieldForServerError('Could not create login: that username is taken'), 'username');
  assert.equal(fieldForServerError('Could not create login: that display name is taken'), 'displayName');
  assert.equal(fieldForServerError('not allowed'), null);
});
