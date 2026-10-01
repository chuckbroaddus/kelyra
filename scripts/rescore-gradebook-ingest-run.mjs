#!/usr/bin/env node
/** Offline rescore of an existing eval run folder (no live API). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest');
const stamp = process.argv[2] || '202610010202';
const runDir = path.join(CORPUS, 'runs', stamp);
const reNormalize = process.argv.includes('--normalize');

const evalPath = path.join(ROOT, 'scripts/eval-gradebook-ingest.mjs');
let src = fs.readFileSync(evalPath, 'utf8');
src = src.replace(/^#!.*\n/, '');
src = src.replace(/import \{ createClient \} from '@supabase\/supabase-js';\n/, '');
src = src.replace(/async function main[\s\S]*$/, '');
src += '\nexport { scoreProposal, summarize };\n';
const tmp = path.join('/tmp', `gb-rescore-${stamp}.mjs`);
fs.writeFileSync(tmp, src);
const { scoreProposal, summarize } = await import(pathToFileURL(tmp).href + '?t=' + Date.now());

let normalizeProposalFields = null;
if (reNormalize) {
  const normMod = await import(
    pathToFileURL(path.join(ROOT, 'src/lib/ingest/normalizeFieldValues.ts')).href +
      '?t=' +
      Date.now()
  );
  normalizeProposalFields = normMod.normalizeProposalFields;
}

const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
const perDoc = [];
const allFieldRows = [];
let baseMap = new Map();
try {
  const baseSum = JSON.parse(
    fs.readFileSync(path.join(CORPUS, 'runs/202609302359/score-summary.json'), 'utf8'),
  );
  for (const r of baseSum.round2?.per_doc || []) baseMap.set(r.id, r.acc);
} catch {
  baseMap = new Map();
}

for (const entry of manifest.cases) {
  const caseDir = path.join(CORPUS, entry.id);
  const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
  let meta = {};
  const metaPath = path.join(caseDir, 'eval-meta.json');
  if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  for (const variant of ['clean', 'photo']) {
    const p = path.join(runDir, `${entry.id}__${variant}.json`);
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    let proposal = raw.json?.proposal || raw.proposal || raw.json;
    if (reNormalize && normalizeProposalFields && proposal?.fields) {
      proposal = normalizeProposalFields(proposal);
    }
    const rows = scoreProposal(expected, proposal, meta);
    const sum = summarize(rows);
    const acc = Math.round(sum.accuracy * 100);
    const id = `${entry.id}/${variant}`;
    const base = baseMap.get(id);
    const delta = base == null ? null : acc - base;
    perDoc.push({ id, acc, base, delta, counts: sum.counts, fields: rows });
    allFieldRows.push(...rows);
    console.log(`${id} ${acc}%` + (delta != null ? ` (r2 ${base} Δ${delta})` : ''));
  }
}

const totals = summarize(allFieldRows).counts;
const scored = Object.values(totals).reduce((a, b) => a + b, 0);
const good = totals.correct + totals['correctly-flagged-for-review'];
const overall = scored ? good / scored : 0;
const byKind = { syllabus: [], handbook: [], negative: [] };
for (const d of perDoc) {
  const id = d.id.split('/')[0];
  const entry = manifest.cases.find((c) => c.id === id);
  const k =
    entry?.kind === 'handbook' ? 'handbook' : entry?.kind === 'negative' ? 'negative' : 'syllabus';
  byKind[k].push(d.acc);
}
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const regressions = perDoc.filter((d) => d.delta != null && d.delta < -2);
const summary = {
  stamp,
  overall: `${(overall * 100).toFixed(1)}%`,
  syllabus: `${avg(byKind.syllabus).toFixed(1)}%`,
  handbook: `${avg(byKind.handbook).toFixed(1)}%`,
  negatives: `${avg(byKind.negative).toFixed(1)}%`,
  totals,
  regressions: regressions.map((r) => ({ id: r.id, acc: r.acc, base: r.base, delta: r.delta })),
  per_doc: perDoc.map((d) => ({
    id: d.id,
    acc: d.acc,
    base: d.base,
    delta: d.delta,
    counts: d.counts,
  })),
};
fs.writeFileSync(path.join(runDir, 'score-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(
  path.join(runDir, 'score.json'),
  JSON.stringify(
    {
      documents: perDoc.map((d) => ({
        id: d.id.split('/')[0],
        kind: manifest.cases.find((c) => c.id === d.id.split('/')[0])?.kind,
        variant: d.id.split('/')[1],
        field_accuracy: d.acc / 100,
        counts: d.counts,
        fields: d.fields,
        rule_violations: [],
      })),
      field_totals: totals,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      overall: summary.overall,
      totals,
      regressions: summary.regressions,
      handbook: summary.handbook,
      normalize: reNormalize,
    },
    null,
    2,
  ),
);
