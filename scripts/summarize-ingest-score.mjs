#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
const run = process.argv[2] || 'notes/qa-fixtures/gradebook-ingest/runs/202609302204';
const score = JSON.parse(fs.readFileSync(path.join(run, 'score.json'), 'utf8'));
console.log('overall', score.overall_accuracy);
console.log('totals', JSON.stringify(score.field_totals));
console.log('s19', score.s11_19?.fields?.map((f) => f.path + ':' + f.verdict).join(', '));
console.log('s20', score.s11_20?.fields?.map((f) => f.path + ':' + f.verdict).join(', '));
const pathFails = {};
for (const d of score.documents) {
  for (const f of d.fields || []) {
    if (f.verdict === 'correct' || f.verdict === 'correctly-flagged-for-review') continue;
    const k = f.path + '|' + f.verdict;
    pathFails[k] = (pathFails[k] || 0) + 1;
  }
}
console.log('top fails');
Object.entries(pathFails)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([k, n]) => console.log(n, k));
for (const name of [
  'S01__clean.json',
  'H01__clean.json',
  'S05__clean.json',
  'S06__clean.json',
  'H09__clean.json',
  'N03__clean.json',
]) {
  const j = JSON.parse(fs.readFileSync(path.join(run, name), 'utf8'));
  const p = j.json?.proposal || j.json;
  console.log(
    name,
    'paths',
    (p.fields || []).map((f) => f.path).join(','),
    'late',
    JSON.stringify((p.fields || []).find((f) => f.path === 'syllabus.late_rule')?.value)?.slice(0, 80),
  );
}
