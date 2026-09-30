#!/usr/bin/env node
/** Refresh MANIFEST.json file lists from on-disk case folders. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest');
const manifestPath = path.join(CORPUS, 'MANIFEST.json');
const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const c of man.cases) {
  const dir = path.join(CORPUS, c.id);
  const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
  c.files = files;
  c.photo = files.includes('photo.jpg');
}
man.generated_at = new Date().toISOString();
man.count = man.cases.length;
fs.writeFileSync(manifestPath, JSON.stringify(man, null, 2) + '\n');
console.log('manifest refreshed', man.count);
