#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2];
if (!run) {
  console.error('usage: clear-failed-hw-run.mjs <runDir>');
  process.exit(1);
}
let n = 0;
for (const f of fs.readdirSync(run)) {
  if (!f.endsWith('.json') || f === 'score.json' || f === 'context.json') continue;
  const p = path.join(run, f);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const bad =
    j?.classify?.status === 0 ||
    j?.evaluate?.status === 0 ||
    j?.classify?.json?.error ||
    j?.evaluate?.json?.error ||
    /fetch failed|non-json/i.test(JSON.stringify(j));
  if (bad) {
    fs.unlinkSync(p);
    n += 1;
    console.log('rm', f);
  }
}
console.log('removed', n);
