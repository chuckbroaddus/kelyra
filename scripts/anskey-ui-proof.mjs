#!/usr/bin/env node
/** Anskey UI proof @375 via ui-drive (web). */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const stamp = process.argv[2] || '202610011122';
const OUT = path.join(ROOT, 'notes/qa-fixtures/anskey-ingest/runs', stamp, 'ui-proof');
const MIRROR = path.join('/tmp/anskey-ingest-eval', stamp, 'ui-proof');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(MIRROR, { recursive: true });

function drive(name, route, persona) {
  return new Promise((resolve) => {
    const packet = path.join(OUT, `${name}.json`);
    const args = [
      path.join(ROOT, 'scripts/ui-drive.mjs'),
      '--surface',
      'web',
      '--persona',
      persona,
      '--route',
      route,
      '--out',
      packet,
    ];
    const p = spawn('node', args, {
      cwd: ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      fs.writeFileSync(path.join(OUT, `${name}-drive.log`), out + '\n' + err);
      // copy web-390 if present
      const dir = packet.replace(/\.json$/, '');
      for (const f of ['web-390.png', 'web-1280.png', 'web-after.png']) {
        const src = path.join(path.dirname(packet), path.basename(dir), f);
        const alt = path.join(OUT, `${name}-${f}`);
        const candidates = [
          path.join(OUT, `${name}`, f),
          packet.replace(/\.json$/, `/${f}`),
          path.join(OUT, f),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            fs.copyFileSync(c, path.join(OUT, `${name}-${f}`));
            fs.copyFileSync(c, path.join(MIRROR, `${name}-${f}`));
            break;
          }
        }
      }
      // ui-drive often writes next to packet as name/web-390.png or packet stem
      const parent = path.dirname(packet);
      for (const ent of fs.readdirSync(parent)) {
        if (ent.startsWith(name) && ent.endsWith('.png')) {
          fs.copyFileSync(path.join(parent, ent), path.join(MIRROR, ent));
        }
      }
      resolve({ name, code, out: out.slice(0, 300), err: err.slice(0, 300) });
    });
  });
}

const shots = [
  ['capture-start-375', '/capture', 'teacher'],
  ['class-works-375', '/class/d1715000-0000-4000-a000-000000000301', 'teacher'],
  ['assignment-new-375', '/class/d1715000-0000-4000-a000-000000000301/assignment/new', 'teacher'],
];

const results = [];
for (const [name, route, persona] of shots) {
  console.log('drive', name, route);
  results.push(await drive(name, route, persona));
}
fs.writeFileSync(path.join(OUT, 'drive-batch.json'), JSON.stringify(results, null, 2));
console.log('done', OUT);
console.log(JSON.stringify(results, null, 2));
