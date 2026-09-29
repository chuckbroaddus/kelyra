#!/usr/bin/env node
/**
 * Sign in a named UI persona and serve the session to localhost only.
 * Passwords stay in ~/.kelyra/ui-personas.json. This process never prints them.
 *
 *   node scripts/ui-persona-session.mjs --persona teacher --seat parent
 *
 * Stdout is only:
 *   READY persona=teacher seat=parent
 *   INJECT_PORT=12345
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PERSONAS = ['office', 'teacher', 'parent', 'student'];
export const SEATS = ['office', 'teacher', 'parent'];
const PERSONA_FILE = path.join(os.homedir(), '.kelyra', 'ui-personas.json');

export function loadPersonas(file = PERSONA_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {};
  for (const name of PERSONAS) {
    const row = raw[name];
    if (!row || typeof row !== 'object') continue;
    const handle = String(row.handle ?? '').trim();
    const password = String(row.password ?? '');
    if (handle && password) out[name] = { handle, password };
  }
  return out;
}

export function assertPersona(name, seat) {
  if (!PERSONAS.includes(name)) {
    throw new Error(`PERSONA_INVALID ${name || '(missing)'}`);
  }
  if (seat && !SEATS.includes(seat)) {
    throw new Error(`SEAT_INVALID ${seat}`);
  }
}

function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

export async function signInPersona({ url, anonKey, handle, password, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/functions/v1/sign-in-handle`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handle, password }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
    throw new Error('SIGN_IN_FAILED');
  }
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  };
}

export function createSessionServer(session) {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const allow =
      origin === 'http://localhost:8081' || origin === 'http://127.0.0.1:8081' ? origin : '';
    if (allow) {
      res.setHeader('Access-Control-Allow-Origin', allow);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== 'GET' || req.url !== '/session') {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        seat: session.seat ?? null,
      }),
    );
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function argValue(argv, flag) {
  const idx = argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= argv.length) return '';
  return argv[idx + 1];
}

async function main() {
  const persona = argValue(process.argv, '--persona').toLowerCase();
  const seat = argValue(process.argv, '--seat').toLowerCase();
  assertPersona(persona, seat);
  const personas = loadPersonas();
  const creds = personas[persona];
  if (!creds) throw new Error(`PERSONA_MISSING ${persona}`);
  const env = readEnvFile(path.resolve(process.cwd(), '.env'));
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('SUPABASE_ENV_MISSING');
  const tokens = await signInPersona({
    url,
    anonKey,
    handle: creds.handle,
    password: creds.password,
  });
  const { port } = await createSessionServer({ ...tokens, seat: seat || null });
  process.stdout.write(`READY persona=${persona} seat=${seat || 'none'}\nINJECT_PORT=${port}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : 'PERSONA_FAILED';
    process.stderr.write(`${message}\n`);
    process.exit(2);
  });
}
