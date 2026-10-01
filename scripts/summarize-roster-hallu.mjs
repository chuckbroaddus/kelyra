#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = process.argv[2] || '202610011128';
const s = JSON.parse(
  fs.readFileSync(path.join(root, `notes/qa-fixtures/roster-ingest/runs/${stamp}/score.json`), 'utf8'),
);
for (const d of s.documents) {
  if ((d.hallucinations || 0) > 0) {
    console.log(d.id, d.variant, 'acc', (d.accuracy * 100).toFixed(0), 'h', d.hallucinations, 'extra', d.extra);
    for (const f of d.fields.filter((x) => x.status === 'hallucinated' || x.status === 'extra')) {
      console.log(' ', f.status, f.path, '=>', f.actual);
    }
  }
}
console.log('overall', (s.overall_accuracy * 100).toFixed(1) + '%', 'hallu', s.hallucinations_total);
