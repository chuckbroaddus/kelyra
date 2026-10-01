#!/usr/bin/env node
/** Rescore an existing homework-ingest run folder with current scoreCase. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/homework-ingest');

// dynamic import eval module helpers by re-running scoring inline via child
// Keep simple: spawn eval with EVAL_RESUME_STAMP
const stamp = process.argv[2];
if (!stamp) {
  console.error('usage: node scripts/rescore-homework-ingest-run.mjs <stamp>');
  process.exit(1);
}
process.env.EVAL_RESUME_STAMP = stamp;
process.env.EVAL_HW_PACE_MS = '0';
await import(pathToFileURL(path.join(__dirname, 'eval-homework-ingest.mjs')).href);
