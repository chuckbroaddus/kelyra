import fs from 'node:fs';
const p = 'notes/qa-fixtures/ditl/artifacts-DH-02-UI-01/result.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
d.result = 'FAIL';
d.reason = 'card-stop: splash+roster unmatched';
d.findings = [];
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log(d.result, JSON.stringify(d.steps));
