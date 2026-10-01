#!/usr/bin/env node
/** Rescore an assign-ingest run folder without re-calling the model. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/assign-ingest');
const stamp = process.argv[2];
if (!stamp) {
  console.error('usage: node scripts/rescore-assign-ingest-run.mjs <stamp>');
  process.exit(1);
}

// Import scorer helpers by re-executing eval module is heavy; duplicate minimal by dynamic import of eval file functions is not exported.
// Instead: spawn eval in RESCORE-only mode via env.
process.env.EVAL_RESUME_STAMP = stamp;
process.env.EVAL_ASSIGN_RESCORE_ONLY = '1';
await import(pathToFileURL(path.join(ROOT, 'scripts/eval-assign-ingest.mjs')).href);
