#!/usr/bin/env node
/**
 * Admin upload of a versioned lesson folder to private Storage bucket `lessons`.
 * Does not run unless you pass --i-know-the-quota. Skips backup folders
 * (png-original, ava-original, eve-staging). Live scenes are WebP.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/upload-lesson.mjs \
 *     --dir notes/teacher-decks/fom-ch01-v4 --deck fom-ch01 --version v4 --i-know-the-quota
 *
 * Students never list the bucket. Teachers pick deck_id + version from the catalog.
 */
import { createReadStream, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const dir = args.dir;
const deck = args.deck;
const version = args.version;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dir || !deck || !version) {
  console.error('Need --dir --deck --version');
  process.exit(1);
}
if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (not EXPO_PUBLIC_*)');
  process.exit(1);
}

const files = walk(dir).filter((file) => !skipUpload(file));
const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
const mb = (bytes / (1024 * 1024)).toFixed(1);
console.log(`${files.length} files, ${mb} MB → lessons/${deck}/${version}/`);
if (!args['i-know-the-quota']) {
  console.error('Refusing to upload. Confirm Storage size with Chuck, then pass --i-know-the-quota.');
  process.exit(2);
}

for (const file of files) {
  const rel = relative(dir, file).split('\\').join('/');
  const object = `${deck}/${version}/${rel}`;
  const mime = mimeOf(file);
  const res = await fetch(`${url.replace(/\/$/, '')}/storage/v1/object/lessons/${object}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': mime,
      'x-upsert': 'true',
    },
    body: createReadStream(file),
    duplex: 'half',
  });
  if (!res.ok) {
    console.error(object, await res.text());
    process.exit(1);
  }
  console.log('ok', object);
}

function walk(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const next = join(root, name);
    if (statSync(next).isDirectory()) out.push(...walk(next));
    else out.push(next);
  }
  return out;
}

function skipUpload(file) {
  const rel = relative(dir, file).split('\\').join('/');
  if (rel.startsWith('.') || rel.includes('/.')) return true;
  const skipDirs = ['png-original/', 'ava-original/', 'eve-staging/', 'captions/ava-original/'];
  return skipDirs.some((prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix) || rel.includes('/' + prefix));
}

function mimeOf(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.html') return 'text/html';
  if (ext === '.js') return 'text/javascript';
  if (ext === '.css') return 'text/css';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const token = list[i];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = list[i + 1];
    if (!next || next.startsWith('--')) out[name] = true;
    else {
      out[name] = next;
      i += 1;
    }
  }
  return out;
}
