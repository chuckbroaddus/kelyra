#!/usr/bin/env node
/** Rescore an existing roster-ingest run folder with current scorer. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/roster-ingest');
const stamp = process.argv[2];
if (!stamp) {
  console.error('usage: node scripts/rescore-roster-ingest-run.mjs <stamp>');
  process.exit(2);
}

// Load scorer pieces by re-exec eval module helpers: duplicate import via dynamic eval of file is heavy.
// Instead shell out to a tiny inline by importing the eval file's functions — not exported.
// Rescore by spawning node with EVAL_RESUME and patched... simplest: read responses and call eval logic copy.

const evalPath = path.join(ROOT, 'scripts/eval-roster-ingest.mjs');
const src = fs.readFileSync(evalPath, 'utf8');
// Extract functions by running the file's pure helpers — use Function strip of main.
const helperSrc = src
  .replace(/async function main[\s\S]*$/m, 'export { scoreCase, extractActual, normalizeRow };\n')
  .replace(/^#!.*\n/, '')
  .replace(/main\(\)\.catch[\s\S]*$/m, '');
const tmp = path.join(CORPUS, 'runs', stamp, '_rescore_helpers.mjs');
fs.writeFileSync(tmp, helperSrc.replace(/const AI_URL[\s\S]*?;\n/, 'const AI_URL="";\n'));

const mod = await import(pathToFileURL(tmp).href);
const runDir = path.join(CORPUS, 'runs', stamp);
const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
const perDoc = [];
let halluTotal = 0;

for (const entry of manifest.cases) {
  const caseDir = path.join(CORPUS, entry.id);
  const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
  let meta = {};
  const metaPath = path.join(caseDir, 'eval-meta.json');
  if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (expected._eval) meta = { ...meta, ...expected._eval };
  for (const variant of ['clean', 'photo']) {
    const outPath = path.join(runDir, `${entry.id}__${variant}.json`);
    if (!fs.existsSync(outPath)) continue;
    const result = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const actual = mod.extractActual(result.json);
    const scored = mod.scoreCase(expected, actual, meta);
    halluTotal += scored.hallucinations || 0;
    perDoc.push({
      id: entry.id,
      kind: entry.kind,
      variant,
      http_status: result.status,
      accuracy: scored.accuracy,
      name_recall: scored.name_recall,
      name_precision: scored.name_precision,
      record_f1: scored.record_f1,
      field_accuracy: scored.field_accuracy,
      hallucinations: scored.hallucinations,
      matched: scored.matched,
      missing: scored.missing,
      extra: scored.extra,
      fields: scored.fields,
      actual_count: actual.names.length,
      rejected: actual.rejected,
    });
  }
}

const avg = (rows, key = 'accuracy') =>
  rows.length ? rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length : 0;
const score = {
  stamp,
  rescored: true,
  overall_accuracy: avg(perDoc),
  roster_accuracy: avg(perDoc.filter((d) => d.kind === 'roster')),
  negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
  clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
  photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
  name_recall: avg(perDoc.filter((d) => d.kind === 'roster'), 'name_recall'),
  name_precision: avg(perDoc.filter((d) => d.kind === 'roster'), 'name_precision'),
  record_f1: avg(perDoc.filter((d) => d.kind === 'roster'), 'record_f1'),
  hallucinations_total: halluTotal,
  documents: perDoc,
};
fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
try {
  fs.unlinkSync(tmp);
} catch {
  /* */
}
console.log(
  'rescore',
  stamp,
  'overall',
  (score.overall_accuracy * 100).toFixed(1) + '%',
  'hallu',
  halluTotal,
);
