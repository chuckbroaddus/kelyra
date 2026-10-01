#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !env[m[1]]) env[m[1]] = m[2];
}
const personas = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.kelyra', 'ui-personas.json'), 'utf8'));
const r = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sign-in-handle`, {
  method: 'POST',
  headers: {
    apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ handle: personas.teacher.handle, password: personas.teacher.password }),
});
const sess = await r.json();
const id = process.argv[2] || 'R16';
const png = fs.readFileSync(path.join(ROOT, `notes/qa-fixtures/roster-ingest/${id}/clean.png`));
const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
const er = await fetch(`${process.env.AI_DEV_URL || 'http://127.0.0.1:8787'}/extract-roster`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sess.access_token}`,
  },
  body: JSON.stringify({ imageUrl: dataUrl }),
});
const j = await er.json();
console.log(JSON.stringify(j, null, 2));
