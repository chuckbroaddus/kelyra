#!/usr/bin/env node
/**
 * Local lesson origin (PORT 8772). Injects the Kelyra identity/metrics bridge
 * into HTML so web iframe postMessage works the same as lesson-host.
 * Serves the gitignored deck. Do not commit notes/teacher-decks/.
 *
 *   node scripts/lesson-dev-server.mjs
 *   PORT_LESSON=8772 DIR=notes/teacher-decks/fom-ch01-v4 node scripts/lesson-dev-server.mjs
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number(process.env.PORT_LESSON || 8772);
const root = resolve(process.env.DIR || 'notes/teacher-decks/fom-ch01-v4');
const bridgePath = resolve('src/lib/lessons/bridgeScript.ts');

if (!existsSync(root)) {
  console.error(`No deck at ${root}. The folder is gitignored.`);
  process.exit(1);
}

const bridge = loadBridge();

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/__kelyra/bridge.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(bridge);
    return;
  }
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  const file = safeJoin(root, rel);
  if (!file) {
    res.writeHead(400);
    res.end('Not found');
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(file).toLowerCase();
  const type = types[ext] || 'application/octet-stream';
  if (ext === '.html') {
    let html = readFileSync(file, 'utf8');
    if (!html.includes('__kelyra/bridge.js')) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<script src="/__kelyra/bridge.js"></script>`);
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Lesson dev ${root} → http://127.0.0.1:${port}/`);
});

function safeJoin(base, rel) {
  const next = normalize(join(base, rel));
  const prefix = base.endsWith(sep) ? base : base + sep;
  if (next !== base && !next.startsWith(prefix)) return null;
  if (next.split(sep).includes('..')) return null;
  return next;
}

function loadBridge() {
  const src = readFileSync(bridgePath, 'utf8');
  const match = src.match(/export const LESSON_BRIDGE_JS = `([\s\S]*?)`;/);
  if (!match) {
    console.error('Could not read LESSON_BRIDGE_JS');
    process.exit(1);
  }
  return match[1];
}
