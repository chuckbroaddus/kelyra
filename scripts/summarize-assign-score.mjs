import fs from 'node:fs';
const stamp = process.argv[2] || '202610011117';
const s = JSON.parse(fs.readFileSync(`notes/qa-fixtures/assign-ingest/runs/${stamp}/score.json`, 'utf8'));
console.log('overall', (s.overall_accuracy * 100).toFixed(1), 'halluc', s.hallucinations, 'record', (s.record_match_rate * 100).toFixed(1));
console.log('totals', s.field_totals);
const weak = s.documents.filter((d) => d.field_accuracy < 0.85).sort((a, b) => a.field_accuracy - b.field_accuracy);
for (const d of weak) {
  console.log(d.id, d.variant, (d.field_accuracy * 100).toFixed(0) + '%', 'rm', d.record_match, 'h', d.counts.hallucinated, 'w', d.counts.wrong, 'm', d.counts.missing);
  for (const f of d.fields.filter((x) => !x.ok).slice(0, 8)) {
    console.log(
      '  ',
      f.path,
      f.missing ? 'miss' : f.hallucinated ? 'hall' : 'wrong',
      JSON.stringify(f.expected ?? '').slice(0, 70),
      '->',
      JSON.stringify(f.actual ?? '').slice(0, 70),
    );
  }
}
