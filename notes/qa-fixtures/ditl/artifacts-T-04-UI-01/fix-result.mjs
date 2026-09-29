import fs from 'fs';
const p = new URL('./result.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(p));
d.result = 'PARTIAL';
d.note =
  'Gradebook column OK but score not written; assignment delete UI not found; sign-out incomplete. Capture saved to Jordan; parent msg OK.';
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log(d.result);
