#!/usr/bin/env node
/**
 * One-shot: write `{name}_thumb.jpg` next to existing photos. Does not replace originals.
 * Path matches client thumbStoragePath (always _thumb.jpg; t_903cdfa6).
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run thumbs
 *
 * CoS runs this after applying 20260824000005_photo_thumbs.sql. Not a client download-all.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const THUMB_EDGE = 480;
const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (not EXPO_PUBLIC_*).');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
};

const listed = await listPhotoObjects();
const sources = listed.filter((name) => isPhoto(name) && !isThumb(name));
const existing = new Set(listed.filter(isThumb));
console.log(`${sources.length} photos, ${existing.size} thumbs already in photos/`);

let made = 0;
let skipped = 0;
let failed = 0;

for (const name of sources) {
  const thumb = thumbName(name);
  if (existing.has(thumb)) {
    await setAssetThumb(name, thumb);
    skipped += 1;
    continue;
  }
  try {
    const original = await download(name);
    if (!original.byteLength) {
      console.warn('empty', name);
      failed += 1;
      continue;
    }
    const jpeg = await toThumb(original, name);
    await upload(thumb, jpeg, 'image/jpeg');
    await setAssetThumb(name, thumb);
    existing.add(thumb);
    made += 1;
    console.log('thumb', thumb, `${(jpeg.byteLength / 1024).toFixed(0)} KB`);
  } catch (err) {
    failed += 1;
    console.error('fail', name, err instanceof Error ? err.message : err);
  }
}

console.log(`done. made ${made}, already had ${skipped}, failed ${failed}`);

function isThumb(name) {
  return /_thumb\.[^./]+$/.test(name) || name.endsWith('_thumb');
}

function isPhoto(name) {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name);
}

function thumbName(name) {
  return name.replace(/(\.[^./]+)$/, '_thumb$1').replace(/_thumb\.[^./]+$/, '_thumb.jpg');
}

async function listPhotoObjects() {
  const out = [];
  const seen = new Set();
  const prefixes = [''];
  while (prefixes.length) {
    const prefix = prefixes.pop();
    if (seen.has(prefix)) continue;
    seen.add(prefix);
    const res = await fetch(`${url}/storage/v1/object/list/photos`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    });
    if (!res.ok) throw new Error(`list ${prefix || '/'} failed: ${await res.text()}`);
    const rows = await res.json();
    for (const row of rows) {
      const path = prefix ? `${prefix.replace(/\/$/, '')}/${row.name}` : row.name;
      if (row.id == null) prefixes.push(path.endsWith('/') ? path : `${path}/`);
      else out.push(path);
    }
  }
  return out;
}

async function download(name) {
  const res = await fetch(`${url}/storage/v1/object/photos/${name.split('/').map(encodeURIComponent).join('/')}`, {
    headers,
  });
  if (!res.ok) throw new Error(`download ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(name, bytes, contentType) {
  const res = await fetch(`${url}/storage/v1/object/photos/${name.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': contentType,
      'cache-control': 'max-age=31536000',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${name}: ${await res.text()}`);
}

async function setAssetThumb(storagePath, thumbPath) {
  const res = await fetch(`${url}/rest/v1/assets?storage_path=eq.${encodeURIComponent(storagePath)}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ thumb_storage_path: thumbPath }),
  });
  if (!res.ok && res.status !== 400) {
    console.warn('assets row', storagePath, await res.text());
  }
}

async function toThumb(bytes, name) {
  const dir = await mkdtemp(join(tmpdir(), 'kelyra-thumb-'));
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const input = join(dir, `in.${ext}`);
  const output = join(dir, 'out.jpg');
  await writeFile(input, bytes);
  try {
    await execFileAsync('sips', [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '70',
      '-Z',
      String(THUMB_EDGE),
      input,
      '--out',
      output,
    ]);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
