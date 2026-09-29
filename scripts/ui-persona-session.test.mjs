import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertPersona,
  createSessionServer,
  loadPersonas,
  signInPersona,
} from './ui-persona-session.mjs';

test('unknown persona and seat are rejected', () => {
  assert.throws(() => assertPersona('admin', ''), /PERSONA_INVALID/);
  assert.throws(() => assertPersona('teacher', 'student'), /SEAT_INVALID/);
  assert.doesNotThrow(() => assertPersona('student', ''));
});

test('persona file ignores empty rows and the comment', () => {
  const file = path.join(os.tmpdir(), `personas-${process.pid}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({
      _comment: 'secret-looking comment',
      teacher: { handle: 'ada', password: 'correct-horse' },
      parent: { handle: '', password: '' },
    }),
  );
  const loaded = loadPersonas(file);
  assert.deepEqual(Object.keys(loaded), ['teacher']);
  assert.equal(loaded.teacher.handle, 'ada');
  fs.unlinkSync(file);
});

test('sign-in posts the handle and returns tokens only', async () => {
  let body = '';
  const tokens = await signInPersona({
    url: 'http://example.test',
    anonKey: 'anon',
    handle: 'ada',
    password: 'correct-horse',
    fetchImpl: async (_url, init) => {
      body = init.body;
      return {
        ok: true,
        json: async () => ({ access_token: 'access', refresh_token: 'refresh' }),
      };
    },
  });
  assert.deepEqual(tokens, { access_token: 'access', refresh_token: 'refresh' });
  assert.match(body, /"handle":"ada"/);
  assert.doesNotMatch(JSON.stringify(tokens), /correct-horse/);
});

test('session server is localhost and does not echo on the status line', async () => {
  const { server, port } = await createSessionServer({
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    seat: 'parent',
  });
  try {
    const payload = await new Promise((resolve, reject) => {
      http.get({ hostname: '127.0.0.1', port, path: '/session' }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
    assert.equal(payload.access_token, 'access-token');
    assert.equal(payload.seat, 'parent');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
