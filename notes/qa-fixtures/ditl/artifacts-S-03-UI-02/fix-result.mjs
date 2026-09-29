import fs from 'fs';
const p = 'notes/qa-fixtures/ditl/artifacts-S-03-UI-02/result.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.result = 'PARTIAL';
j.findings = [
  'FINDING: student Turn in on focus practice PhaseB calls student_submit and gets 400 Submission not found or already submitted while list still shows started and empty items/kind=planned; severity P1; case DITL-S-03-UI-02',
];
j.evidence = j.evidence.map((e) =>
  e.startsWith('OK step5:')
    ? e.replace(/^OK/, 'MISS')
    : e,
);
j.submitError = 'Submission not found or already submitted';
j.completed = false;
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log('updated', j.result, j.findings.length);
