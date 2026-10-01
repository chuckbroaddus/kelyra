#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2] || 'notes/qa-fixtures/homework-ingest/runs/202610011118';
const score = JSON.parse(fs.readFileSync(path.join(run, 'score.json'), 'utf8'));
console.log('overall', (score.overall_accuracy * 100).toFixed(1), 'hall', score.hallucinations, 'rec', score.record_match_rate);
const failPaths = {};
for (const d of score.documents) {
  for (const f of d.fields || []) {
    if (!f.ok) failPaths[f.path] = (failPaths[f.path] || 0) + 1;
  }
}
console.log('fail paths', failPaths);
for (const id of ['H01__clean', 'H04__clean', 'H06__clean', 'H11__clean', 'N03__clean']) {
  const p = path.join(run, `${id}.json`);
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const c = j.classify?.json || {};
  const e = j.evaluate?.json || {};
  console.log(
    id,
    'intent',
    c.intent,
    'cName',
    c.studentGuessName,
    'eName',
    e.studentName,
    'eScore',
    e.draftScore,
    'eGaps',
    JSON.stringify(e.gaps),
    'cScore',
    c.draftScore,
  );
}
