#!/usr/bin/env node
/**
 * Offline lesson-deck TTS via Grok CLI OAuth (~/.grok/auth.json).
 * Writes mp3s next to the teacher-deck folder (gitignored). Never ships keys.
 *
 *   node scripts/lesson-tts.mjs transcribe audio/hook.mp3
 *   node scripts/lesson-tts.mjs speak --voice eve --out out.mp3 "Hello"
 */

import { existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';

const xaiBaseUrl = 'https://api.x.ai/v1';
const authPath = join(homedir(), '.grok', 'auth.json');
const tokenUrl = 'https://auth.x.ai/oauth2/token';

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'transcribe') {
    const file = rest[0];
    if (!file) throw new Error('usage: transcribe <mp3>');
    const text = await transcribe(file);
    process.stdout.write(`${text}\n`);
    return;
  }
  if (cmd === 'speak') {
    const opts = parseSpeak(rest);
    await speak(opts);
    return;
  }
  if (cmd === 'from-json') {
    const jsonPath = rest[0];
    const outDir = rest.includes('--out-dir') ? rest[rest.indexOf('--out-dir') + 1] : dirname(jsonPath);
    if (!jsonPath) throw new Error('usage: from-json <scripts.json> [--out-dir dir]');
    const spec = JSON.parse(await readFile(jsonPath, 'utf8'));
    const voice = spec.voice || 'eve';
    for (const clip of spec.clips ?? []) {
      const out = join(outDir, clip.out);
      process.stdout.write(`${clip.id} → ${out}\n`);
      await speak({ voice, out, language: spec.language || 'en', text: clip.text });
    }
    return;
  }
  throw new Error('usage: lesson-tts.mjs transcribe <mp3> | speak --voice eve --out file.mp3 TEXT | from-json scripts.json');
}

function parseSpeak(argv) {
  let voice = 'eve';
  let out = null;
  let language = 'en';
  const textParts = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--voice') voice = argv[++i];
    else if (a === '--out') out = argv[++i];
    else if (a === '--language') language = argv[++i];
    else textParts.push(a);
  }
  const text = textParts.join(' ').trim();
  if (!text || !out) throw new Error('speak requires --out and text');
  return { voice, out, language, text };
}

async function transcribe(file) {
  const token = await getAccessToken();
  const buf = readFileSync(file);
  const form = new FormData();
  form.append('language', 'en');
  form.append('format', 'true');
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), basename(file));
  const response = await fetch(`${xaiBaseUrl}/stt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`STT ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return String(payload.text ?? '').trim();
}

async function speak({ voice, out, language, text }) {
  const token = await getAccessToken();
  const response = await fetch(`${xaiBaseUrl}/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_id: voice,
      language,
      text_normalization: true,
      output_format: { codec: 'mp3', sample_rate: 44100, bit_rate: 192000 },
    }),
  });
  if (!response.ok) {
    throw new Error(`TTS ${response.status}: ${await response.text()}`);
  }
  await mkdir(dirname(out), { recursive: true });
  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(out, buf);
  process.stdout.write(`wrote ${out} (${buf.length} bytes)\n`);
}

async function getAccessToken() {
  const session = await readSession();
  const expires = session.expires_at ? Date.parse(session.expires_at) : 0;
  if (!session.key) throw new Error('No Grok OAuth token. Run: grok login');
  if (expires && expires - Date.now() < 60_000) {
    return refreshSession(false);
  }
  return session.key;
}

async function readSession() {
  if (!existsSync(authPath)) {
    throw new Error('No Grok OAuth session. Run: grok login');
  }
  const auth = JSON.parse(await readFile(authPath, 'utf8'));
  const key = Object.keys(auth)[0];
  const session = key ? auth[key] : null;
  if (!session || typeof session !== 'object') {
    throw new Error('Grok auth.json is empty. Run: grok login');
  }
  return { ...session, _key: key, _auth: auth };
}

async function refreshSession(force) {
  const session = await readSession();
  if (!session.refresh_token || !session.oidc_client_id) {
    throw new Error('Grok OAuth expired. Run: grok login');
  }
  const expires = session.expires_at ? Date.parse(session.expires_at) : 0;
  if (!force && expires - Date.now() > 60_000 && session.key) return session.key;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refresh_token,
      client_id: session.oidc_client_id,
    }),
  });
  if (!response.ok) {
    throw new Error(`Grok OAuth expired. Run: grok login (${response.status})`);
  }
  const tokens = await response.json();
  if (!tokens.access_token) {
    throw new Error('Grok OAuth refresh returned no access token. Run: grok login');
  }

  const next = { ...session };
  delete next._key;
  delete next._auth;
  next.key = tokens.access_token;
  if (tokens.refresh_token) next.refresh_token = tokens.refresh_token;
  if (typeof tokens.expires_in === 'number') {
    next.expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  }
  const auth = session._auth;
  auth[session._key] = next;
  await writeFile(authPath, `${JSON.stringify(auth, null, 2)}\n`, { mode: 0o600 });
  return next.key;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
