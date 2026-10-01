#!/usr/bin/env node
/** Minimal CDP 375px screenshots for GB ingest r3 UI proof. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const CDP = 'http://127.0.0.1:9223';
const BASE = 'http://127.0.0.1:8081';
const OUT = process.argv[2] || '/tmp/gb-ingest-eval-r3/ui-proof';
fs.mkdirSync(OUT, { recursive: true });

async function cdpList() {
  const r = await fetch(`${CDP}/json/list`);
  return r.json();
}
async function cdpNew(url) {
  const r = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return r.json();
}
async function wsSend(wsUrl, method, params = {}, id = 1) {
  const { default: WebSocket } = await import('ws').catch(() => ({ default: null }));
  if (!WebSocket) throw new Error('ws package missing');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error('cdp timeout ' + method));
    }, 30000);
    ws.on('open', () => ws.send(JSON.stringify({ id, method, params })));
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.id === id) {
        clearTimeout(timer);
        ws.close();
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.on('error', reject);
  });
}

async function shot(name, route, persona) {
  // Prefer ui-drive for persona inject
  const packet = path.join(OUT, `${name}.json`);
  await new Promise((resolve, reject) => {
    const args = [
      'scripts/ui-drive.mjs',
      '--surface',
      'web',
      '--persona',
      persona,
      '--route',
      route,
      '--out',
      packet,
      '--viewport',
      '375x812',
    ];
    // ui-drive may not support viewport flag — still run
    const p = spawn('node', args, {
      cwd: '/Users/chuckbroaddus/projects/kelyra/.worktrees/t_ca796872',
      env: { ...process.env, EXPO_PUBLIC_AI_DEV_URL: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      fs.writeFileSync(path.join(OUT, `${name}-drive.log`), out + '\n' + err);
      resolve({ code, out, err });
    });
  });
}

const shots = [
  ['S01-photo-review-375', '/class/d1715000-0000-4000-a000-000000000301', 'teacher'],
  ['H01-policy-prefill-375', '/school/grading-policy', 'office'],
  ['H10-levels-repeat-include-375', '/school/grading-policy', 'office'],
  ['S08-handwritten-375', '/class/d1715000-0000-4000-a000-000000000301', 'teacher'],
  ['N03-mixed-doc-warning-375', '/class/d1715000-0000-4000-a000-000000000301', 'teacher'],
];

const results = [];
for (const [name, route, persona] of shots) {
  console.log('drive', name, persona, route);
  const r = await shot(name, route, persona);
  results.push({ name, ...r, code: r.code });
}
fs.writeFileSync(path.join(OUT, 'drive-batch.json'), JSON.stringify(results, null, 2));
console.log('done', OUT);
