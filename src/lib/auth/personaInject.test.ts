import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  PERSONA_PORT_PARAM,
  personaPortFromSearch,
  personaSessionUrl,
  uiProofSeatFromValue,
} from './personaInject.ts';

test('persona port is a localhost port and nothing else', () => {
  assert.equal(personaPortFromSearch(''), null);
  assert.equal(personaPortFromSearch('?other=1'), null);
  assert.equal(personaPortFromSearch(`?${PERSONA_PORT_PARAM}=0`), null);
  assert.equal(personaPortFromSearch(`?${PERSONA_PORT_PARAM}=99999`), null);
  assert.equal(personaPortFromSearch(`?${PERSONA_PORT_PARAM}=abc`), null);
  assert.equal(personaPortFromSearch(`?${PERSONA_PORT_PARAM}=9223`), 9223);
  assert.equal(personaSessionUrl(9223), 'http://127.0.0.1:9223/session');
  assert.doesNotMatch(personaSessionUrl(9223), /token|password/i);
});

test('only office, teacher, and parent are proof seats', () => {
  assert.equal(uiProofSeatFromValue('teacher'), 'teacher');
  assert.equal(uiProofSeatFromValue('student'), null);
  assert.equal(uiProofSeatFromValue(''), null);
});

test('auth refresh injects the persona query before reading the session', () => {
  const auth = readFileSync(join(process.cwd(), 'src/lib/auth/AuthProvider.tsx'), 'utf8');
  const injectAt = auth.indexOf('injectPersonaFromQuery()');
  const sessionAt = auth.indexOf('getSession()');
  assert.ok(injectAt > 0);
  assert.ok(sessionAt > injectAt);
});
