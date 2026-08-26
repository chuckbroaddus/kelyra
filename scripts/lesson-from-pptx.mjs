#!/usr/bin/env node
/**
 * Extract PPT slide text locally, then ask cheap Grok for a lesson outline.
 * Never uploads or copies the PPT. Requires grok login.
 *
 *   node scripts/lesson-from-pptx.mjs path/to/deck.pptx [--out dir]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { PRACTICE_MODEL } from './lib/ai-policy.mjs';

const args = process.argv.slice(2);
const pptx = args.find((a) => a.endsWith('.pptx'));
if (!pptx) {
  console.error('usage: node scripts/lesson-from-pptx.mjs file.pptx [--out dir]');
  process.exit(1);
}
const outFlag = args.indexOf('--out');
const outDir =
  outFlag >= 0
    ? args[outFlag + 1]
    : join('notes/teacher-decks/from-pptx', basename(pptx, extname(pptx)));

execFileSync('node', [join('scripts', 'extract-pptx.mjs'), pptx, '--out', outDir], { stdio: 'inherit' });
const outline = readFileSync(join(outDir, 'outline.txt'), 'utf8');
const token = await accessToken();
const response = await fetch('https://api.x.ai/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    store: false,
    model: PRACTICE_MODEL,
    input: `You turn teacher slide notes into a Kelyra interactive lesson outline. JSON only:
{"title":"","sections":[{"id":"1.1","title":"","teach":"spoken teach script","check":"spoken check script","items":[{"stem":"","accept":[""],"hint":""}]}]}
Rules:
- One section per major idea. Teach/check under 40 words.
- Items are short. No student names. Do not paste textbook paragraphs.
- Source notes:\n${outline.slice(0, 20000)}`,
  }),
});
if (!response.ok) {
  throw new Error(`Grok failed: ${response.status} ${await response.text()}`);
}
const payload = await response.json();
const raw = payload.output_text ?? JSON.stringify(payload);
const start = String(raw).indexOf('{');
const end = String(raw).lastIndexOf('}');
const lesson = start >= 0 ? JSON.parse(String(raw).slice(start, end + 1)) : { raw };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'lesson-outline.json'), `${JSON.stringify(lesson, null, 2)}\n`);
console.log(`wrote ${join(outDir, 'lesson-outline.json')} (PPT was not stored)`);

async function accessToken() {
  const authPath = join(homedir(), '.grok', 'auth.json');
  const auth = JSON.parse(readFileSync(authPath, 'utf8'));
  const session = Object.values(auth)[0];
  if (!session?.key) throw new Error('No Grok OAuth token. Run: grok login');
  const expires = session.expires_at ? Date.parse(session.expires_at) : 0;
  if (expires && expires - Date.now() < 60_000 && session.refresh_token) {
    const refresh = await fetch('https://auth.x.ai/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refresh_token,
        client_id: session.oidc_client_id,
      }),
    });
    const tokens = await refresh.json();
    if (!tokens.access_token) throw new Error('Grok OAuth expired. Run: grok login');
    return tokens.access_token;
  }
  return session.key;
}
