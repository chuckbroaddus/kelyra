#!/usr/bin/env node
/**
 * Generate people-ingest fixture corpus (HTML + expected.json).
 * Synthetic names only.
 *   node scripts/gen-people-ingest-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/people-ingest');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 2));
}

const STYLES = {
  form: `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:28px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 4px}.sub{color:#555;font-size:12px;margin-bottom:14px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #999;padding:8px 10px;text-align:left}
th{background:#f3f3f3;width:32%}.box{border:1px solid #333;padding:12px;margin:10px 0}.muted{color:#666;font-size:12px}
.row{margin:10px 0}.line{border-bottom:1px solid #333;min-height:22px;padding:4px 0}label{font-size:12px;color:#444}`,
  hand: `body{font-family:"Segoe Print","Comic Sans MS",cursive;color:#1e293b;margin:0;padding:28px;background:#fffef5;width:800px;box-sizing:border-box}
h1{font-size:22px;margin:0}p,td,li{font-size:15px;line-height:1.45}table{border-collapse:collapse;width:92%;margin:10px 0}
td,th{border:1px solid #94a3b8;padding:8px}`,
  dir: `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:24px;background:#faf8f5;width:800px;box-sizing:border-box}
h1{font-size:18px;margin:0 0 8px}.meta{font-size:12px;color:#555;margin-bottom:12px}
table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border:1px solid #bbb;padding:6px 8px}th{background:#eee}
.card{border:1px solid #ccc;padding:10px;margin:8px 0;border-radius:6px}`,
  hw: `body{font-family:Georgia,serif;margin:0;padding:28px;width:800px;background:#fff}h1{font-size:20px}ol{font-size:14px;line-height:1.6}`,
};

function page(styleKey, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES[styleKey]}</style></head><body>${bodyHtml}</body></html>`;
}

function expected(id, kind, payload) {
  return {
    source_id: id,
    kind,
    intent: payload.intent,
    confidence: payload.confidence ?? 0.88,
    parentGuessName: payload.parentGuessName ?? null,
    studentGuessName: payload.studentGuessName ?? null,
    fields: payload.fields ?? [],
    mapped: payload.mapped ?? [],
    records: payload.records ?? [],
    names: payload.names ?? [],
    reject: Boolean(payload.reject),
    accept_intents: payload.accept_intents ?? null,
    note: payload.note ?? null,
  };
}

/** @type {Array<object>} */
const CASES = [];

CASES.push({
  id: 'PC01',
  kind: 'parent_card',
  style: 'form',
  photo: true,
  notes: 'Clean parent/guardian contact card — full fields.',
  fields: ['relationship', 'phone', 'email', 'address', 'preferred_contact'],
  html: page(
    'form',
    `<h1>Parent / Guardian Information Card</h1>
<div class="sub">Riverbend Elementary · 2026–27</div>
<table>
<tr><th>Parent/Guardian name</th><td>Jordan Blake</td></tr>
<tr><th>Relationship</th><td>Mother</td></tr>
<tr><th>Phone</th><td>(555) 201-4401</td></tr>
<tr><th>Email</th><td>jordan.blake@example.com</td></tr>
<tr><th>Address</th><td>412 Willow Lane, Apt 2B, Springfield</td></tr>
<tr><th>Preferred contact</th><td>Text message</td></tr>
<tr><th>Student (child)</th><td>Avery Blake</td></tr>
</table>`,
  ),
  expected: expected('PC01', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Jordan Blake',
    studentGuessName: 'Avery Blake',
    fields: [
      { label: 'relationship', value: 'mother' },
      { label: 'phone', value: '555-201-4401' },
      { label: 'email', value: 'jordan.blake@example.com' },
      { label: 'address', value: '412 Willow Lane, Apt 2B, Springfield' },
      { label: 'preferred contact', value: 'Text message' },
    ],
    mapped: [
      { key: 'relationship', value: 'mother' },
      { key: 'phone', value: '555-201-4401' },
      { key: 'email', value: 'jordan.blake@example.com' },
      { key: 'address', value: '412 Willow Lane, Apt 2B, Springfield' },
      { key: 'preferred_contact', value: 'Text message' },
    ],
    records: [{ role: 'parent', name: 'Jordan Blake', child: 'Avery Blake' }],
  }),
});

CASES.push({
  id: 'PC02',
  kind: 'parent_card',
  style: 'form',
  photo: true,
  notes: 'Father card; phone-photo path (glare/skew).',
  fields: ['relationship', 'phone', 'email'],
  html: page(
    'form',
    `<h1>Guardian Contact Form</h1>
<div class="sub">Oakridge Middle School</div>
<table>
<tr><th>Name</th><td>Marcus Chen</td></tr>
<tr><th>Relationship to student</th><td>Father</td></tr>
<tr><th>Home phone</th><td>555.318.9022</td></tr>
<tr><th>Email</th><td>m.chen.family@example.net</td></tr>
<tr><th>Child</th><td>Lily Chen</td></tr>
</table>`,
  ),
  expected: expected('PC02', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Marcus Chen',
    studentGuessName: 'Lily Chen',
    fields: [
      { label: 'relationship', value: 'father' },
      { label: 'phone', value: '555-318-9022' },
      { label: 'email', value: 'm.chen.family@example.net' },
    ],
    mapped: [
      { key: 'relationship', value: 'father' },
      { key: 'phone', value: '555-318-9022' },
      { key: 'email', value: 'm.chen.family@example.net' },
    ],
  }),
});

CASES.push({
  id: 'PC03',
  kind: 'parent_card',
  style: 'hand',
  photo: true,
  notes: 'Handwritten parent card — sparse fields.',
  fields: ['relationship', 'phone'],
  html: page(
    'hand',
    `<h1>Parent card</h1>
<p>Name: <strong>Samira Ortiz</strong></p>
<p>Rel: guardian</p>
<p>Cell: 555-770-1133</p>
<p>Kid: Noah Ortiz</p>
<p class="muted">Please call after 4pm</p>`,
  ),
  expected: expected('PC03', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Samira Ortiz',
    studentGuessName: 'Noah Ortiz',
    fields: [
      { label: 'relationship', value: 'guardian' },
      { label: 'phone', value: '555-770-1133' },
      { label: 'notes', value: 'Please call after 4pm' },
    ],
    mapped: [
      { key: 'relationship', value: 'guardian' },
      { key: 'phone', value: '555-770-1133' },
      { key: 'notes', value: 'Please call after 4pm' },
    ],
  }),
});

CASES.push({
  id: 'PC04',
  kind: 'parent_card',
  style: 'form',
  photo: false,
  notes: 'Relationship other + preferred contact email only.',
  fields: ['relationship', 'email', 'preferred_contact'],
  html: page(
    'form',
    `<h1>Family Contact Card</h1>
<table>
<tr><th>Adult name</th><td>Riley Quinn</td></tr>
<tr><th>Relationship</th><td>Other — family friend / emergency pickup</td></tr>
<tr><th>Email</th><td>riley.q.pickup@example.org</td></tr>
<tr><th>Preferred contact</th><td>Email</td></tr>
<tr><th>Student</th><td>Casey Quinn</td></tr>
</table>`,
  ),
  expected: expected('PC04', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Riley Quinn',
    studentGuessName: 'Casey Quinn',
    fields: [
      { label: 'relationship', value: 'other' },
      { label: 'email', value: 'riley.q.pickup@example.org' },
      { label: 'preferred contact', value: 'Email' },
    ],
    mapped: [
      { key: 'relationship', value: 'other' },
      { key: 'email', value: 'riley.q.pickup@example.org' },
      { key: 'preferred_contact', value: 'Email' },
    ],
  }),
});

CASES.push({
  id: 'PC05',
  kind: 'parent_card',
  style: 'form',
  photo: true,
  notes: 'Minimal parent card — name + phone only (partial).',
  fields: ['phone'],
  html: page(
    'form',
    `<h1>Contact slip</h1>
<div class="box">
<div class="row"><label>Parent</label><div class="line">Taylor Brooks</div></div>
<div class="row"><label>Phone</label><div class="line">555-404-2211</div></div>
</div>
<p class="muted">No address listed. Relationship blank.</p>`,
  ),
  expected: expected('PC05', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Taylor Brooks',
    confidence: 0.75,
    fields: [{ label: 'phone', value: '555-404-2211' }],
    mapped: [{ key: 'phone', value: '555-404-2211' }],
  }),
});
CASES.push({
  id: 'PC06',
  kind: 'parent_card',
  style: 'form',
  photo: true,
  notes: 'Skew/glare heavy parent card (photo variant critical).',
  fields: ['phone', 'email', 'relationship'],
  html: page(
    'form',
    `<h1>PARENT INFO</h1>
<table>
<tr><th>Guardian</th><td>Nina Patel</td></tr>
<tr><th>Rel</th><td>Mother</td></tr>
<tr><th>Tel</th><td>555-441-7766</td></tr>
<tr><th>E-mail</th><td>nina.patel.home@example.com</td></tr>
<tr><th>Student</th><td>Arjun Patel</td></tr>
</table>`,
  ),
  expected: expected('PC06', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Nina Patel',
    studentGuessName: 'Arjun Patel',
    fields: [
      { label: 'relationship', value: 'mother' },
      { label: 'telephone', value: '555-441-7766' },
      { label: 'email', value: 'nina.patel.home@example.com' },
    ],
    mapped: [
      { key: 'relationship', value: 'mother' },
      { key: 'phone', value: '555-441-7766' },
      { key: 'email', value: 'nina.patel.home@example.com' },
    ],
  }),
});

CASES.push({
  id: 'PC07',
  kind: 'parent_card',
  style: 'form',
  photo: false,
  notes: 'Address + preferred contact phone; empty email must not invent.',
  fields: ['address', 'preferred_contact', 'phone'],
  html: page(
    'form',
    `<h1>Parent Address Card</h1>
<table>
<tr><th>Name</th><td>Olivia Grant</td></tr>
<tr><th>Phone</th><td>555-217-6500</td></tr>
<tr><th>Address</th><td>250 Harbor Road</td></tr>
<tr><th>Preferred contact</th><td>Phone call</td></tr>
<tr><th>Email</th><td></td></tr>
</table>`,
  ),
  expected: expected('PC07', 'parent_card', {
    intent: 'parent_card',
    parentGuessName: 'Olivia Grant',
    fields: [
      { label: 'phone', value: '555-217-6500' },
      { label: 'address', value: '250 Harbor Road' },
      { label: 'preferred contact', value: 'Phone call' },
    ],
    mapped: [
      { key: 'phone', value: '555-217-6500' },
      { key: 'address', value: '250 Harbor Road' },
      { key: 'preferred_contact', value: 'Phone call' },
    ],
  }),
  meta: { no_hallucinate_empty: ['email'] },
});

CASES.push({
  id: 'SC01',
  kind: 'student_card',
  style: 'form',
  photo: true,
  notes: 'Clean student emergency information sheet.',
  fields: ['birthday', 'grade_or_age', 'emergency_name', 'emergency_phone', 'allergies'],
  html: page(
    'form',
    `<h1>Student Emergency Information</h1>
<div class="sub">Hillcrest High · Office copy</div>
<table>
<tr><th>Student name</th><td>Elena Vargas</td></tr>
<tr><th>Preferred name</th><td>Ellie</td></tr>
<tr><th>Date of birth</th><td>March 14, 2012</td></tr>
<tr><th>Grade</th><td>9</td></tr>
<tr><th>Emergency contact</th><td>Sofia Vargas</td></tr>
<tr><th>Emergency phone</th><td>555-612-8890</td></tr>
<tr><th>Allergies</th><td>Peanuts</td></tr>
<tr><th>Health conditions</th><td>Asthma — inhaler in backpack</td></tr>
</table>`,
  ),
  expected: expected('SC01', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Elena Vargas',
    fields: [
      { label: 'preferred name', value: 'Ellie' },
      { label: 'date of birth', value: '2012-03-14' },
      { label: 'grade', value: '9' },
      { label: 'emergency contact', value: 'Sofia Vargas' },
      { label: 'emergency phone', value: '555-612-8890' },
      { label: 'allergies', value: 'Peanuts' },
      { label: 'health conditions', value: 'Asthma — inhaler in backpack' },
    ],
    mapped: [
      { key: 'preferred_name', value: 'Ellie' },
      { key: 'birthday', value: '2012-03-14' },
      { key: 'grade_or_age', value: '9' },
      { key: 'emergency_name', value: 'Sofia Vargas' },
      { key: 'emergency_phone', value: '555-612-8890' },
      { key: 'allergies', value: 'Peanuts' },
      { key: 'health_conditions', value: 'Asthma — inhaler in backpack' },
    ],
  }),
});

CASES.push({
  id: 'SC02',
  kind: 'student_card',
  style: 'form',
  photo: true,
  notes: 'Student data sheet phone photo; email + address.',
  fields: ['email', 'address', 'phone', 'grade_or_age'],
  html: page(
    'form',
    `<h1>Student Data Sheet</h1>
<table>
<tr><th>Full name</th><td>Jamal Okonkwo</td></tr>
<tr><th>Grade / age</th><td>Grade 7 · age 12</td></tr>
<tr><th>Student phone</th><td>555-100-7788</td></tr>
<tr><th>Email</th><td>jamal.o.student@example.com</td></tr>
<tr><th>Home address</th><td>88 Cedar Court, Unit 4</td></tr>
</table>`,
  ),
  expected: expected('SC02', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Jamal Okonkwo',
    fields: [
      { label: 'grade or age', value: 'Grade 7 · age 12' },
      { label: 'phone', value: '555-100-7788' },
      { label: 'email', value: 'jamal.o.student@example.com' },
      { label: 'address', value: '88 Cedar Court, Unit 4' },
    ],
    mapped: [
      { key: 'grade_or_age', value: 'Grade 7 · age 12' },
      { key: 'phone', value: '555-100-7788' },
      { key: 'email', value: 'jamal.o.student@example.com' },
      { key: 'address', value: '88 Cedar Court, Unit 4' },
    ],
  }),
});

CASES.push({
  id: 'SC03',
  kind: 'student_card',
  style: 'hand',
  photo: true,
  notes: 'Handwritten emergency card; nickname + allergy.',
  fields: ['preferred_name', 'allergies', 'emergency_name'],
  html: page(
    'hand',
    `<h1>Info card</h1>
<p>Student: <strong>Benjamin Park</strong> (Ben)</p>
<p>Allergy: shellfish</p>
<p>Emergency: Min Park — 555-222-0199</p>`,
  ),
  expected: expected('SC03', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Benjamin Park',
    fields: [
      { label: 'preferred name', value: 'Ben' },
      { label: 'allergies', value: 'shellfish' },
      { label: 'emergency contact', value: 'Min Park' },
      { label: 'emergency phone', value: '555-222-0199' },
    ],
    mapped: [
      { key: 'preferred_name', value: 'Ben' },
      { key: 'allergies', value: 'shellfish' },
      { key: 'emergency_name', value: 'Min Park' },
      { key: 'emergency_phone', value: '555-222-0199' },
    ],
  }),
});
CASES.push({
  id: 'SC04',
  kind: 'student_card',
  style: 'form',
  photo: false,
  notes: 'Partial — blank allergy/DOB must not hallucinate.',
  fields: ['grade_or_age', 'emergency_name'],
  html: page(
    'form',
    `<h1>Student Information (partial)</h1>
<table>
<tr><th>Name</th><td>Harper Lee</td></tr>
<tr><th>Grade</th><td>4</td></tr>
<tr><th>Date of birth</th><td></td></tr>
<tr><th>Allergies</th><td></td></tr>
<tr><th>Emergency contact</th><td>Alex Lee</td></tr>
<tr><th>Emergency phone</th><td></td></tr>
</table>
<p class="muted">Office note: finish later — do not invent missing fields.</p>`,
  ),
  expected: expected('SC04', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Harper Lee',
    confidence: 0.7,
    fields: [
      { label: 'grade', value: '4' },
      { label: 'emergency contact', value: 'Alex Lee' },
    ],
    mapped: [
      { key: 'grade_or_age', value: '4' },
      { key: 'emergency_name', value: 'Alex Lee' },
    ],
  }),
  meta: { no_hallucinate_empty: ['birthday', 'allergies', 'emergency_phone'] },
});

CASES.push({
  id: 'SC05',
  kind: 'student_card',
  style: 'form',
  photo: true,
  notes: 'Health conditions present; photo path.',
  fields: ['health_conditions', 'phone', 'birthday'],
  html: page(
    'form',
    `<h1>Health & Contact Card</h1>
<table>
<tr><th>Student</th><td>Priya Nair</td></tr>
<tr><th>DOB</th><td>2014-11-02</td></tr>
<tr><th>Phone</th><td>555-909-3344</td></tr>
<tr><th>Health conditions</th><td>Type 1 diabetes — nurse has care plan</td></tr>
<tr><th>Allergies</th><td>None known</td></tr>
</table>`,
  ),
  expected: expected('SC05', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Priya Nair',
    fields: [
      { label: 'birthday', value: '2014-11-02' },
      { label: 'phone', value: '555-909-3344' },
      { label: 'health conditions', value: 'Type 1 diabetes — nurse has care plan' },
      { label: 'allergies', value: 'None known' },
    ],
    mapped: [
      { key: 'birthday', value: '2014-11-02' },
      { key: 'phone', value: '555-909-3344' },
      { key: 'health_conditions', value: 'Type 1 diabetes — nurse has care plan' },
      { key: 'allergies', value: 'None known' },
    ],
  }),
});

CASES.push({
  id: 'SC06',
  kind: 'student_card',
  style: 'form',
  photo: false,
  notes: 'Nickname → preferred_name; age wording.',
  fields: ['preferred_name', 'grade_or_age'],
  html: page(
    'form',
    `<h1>Student Bio Card</h1>
<table>
<tr><th>Legal name</th><td>Christopher Nguyen</td></tr>
<tr><th>Nickname</th><td>Chris</td></tr>
<tr><th>Age</th><td>10</td></tr>
</table>`,
  ),
  expected: expected('SC06', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Christopher Nguyen',
    fields: [
      { label: 'nickname', value: 'Chris' },
      { label: 'age', value: '10' },
    ],
    mapped: [
      { key: 'preferred_name', value: 'Chris' },
      { key: 'grade_or_age', value: '10' },
    ],
  }),
});

CASES.push({
  id: 'SC07',
  kind: 'student_card',
  style: 'form',
  photo: true,
  notes: 'US-style DOB emergency sheet.',
  fields: ['birthday', 'emergency_name', 'emergency_phone'],
  html: page(
    'form',
    `<h1>Emergency Card</h1>
<table>
<tr><th>Student</th><td>Grace Okafor</td></tr>
<tr><th>Birthday</th><td>07/22/2013</td></tr>
<tr><th>Emergency name</th><td>Chinedu Okafor</td></tr>
<tr><th>Emergency phone</th><td>(555) 333-1212</td></tr>
</table>`,
  ),
  expected: expected('SC07', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Grace Okafor',
    fields: [
      { label: 'birthday', value: '2013-07-22' },
      { label: 'emergency name', value: 'Chinedu Okafor' },
      { label: 'emergency phone', value: '555-333-1212' },
    ],
    mapped: [
      { key: 'birthday', value: '2013-07-22' },
      { key: 'emergency_name', value: 'Chinedu Okafor' },
      { key: 'emergency_phone', value: '555-333-1212' },
    ],
  }),
  meta: { soft_birthday: true },
});

CASES.push({
  id: 'SC08',
  kind: 'student_card',
  style: 'hand',
  photo: true,
  notes: 'Handwritten student notes field.',
  fields: ['notes', 'grade_or_age'],
  html: page(
    'hand',
    `<h1>Student note card</h1>
<p>Name: Zoe Martins</p>
<p>Grade: 6</p>
<p>Notes: Needs glasses for board work</p>`,
  ),
  expected: expected('SC08', 'student_card', {
    intent: 'student_card',
    studentGuessName: 'Zoe Martins',
    fields: [
      { label: 'grade', value: '6' },
      { label: 'notes', value: 'Needs glasses for board work' },
    ],
    mapped: [
      { key: 'grade_or_age', value: '6' },
      { key: 'notes', value: 'Needs glasses for board work' },
    ],
  }),
});
CASES.push({
  id: 'MP01',
  kind: 'multi',
  style: 'dir',
  photo: true,
  notes: 'Directory sheet — two parents one student.',
  fields: ['phone', 'email', 'relationship'],
  html: page(
    'dir',
    `<h1>Family Directory Sheet</h1>
<div class="meta">Student: Maya Thompson · Grade 5</div>
<div class="card"><strong>Parent 1:</strong> Dana Thompson (Mother)<br/>Phone 555-301-1001 · dana.t@example.com</div>
<div class="card"><strong>Parent 2:</strong> Chris Thompson (Father)<br/>Phone 555-301-1002 · chris.t@example.com</div>`,
  ),
  expected: expected('MP01', 'multi', {
    intent: 'parent_card',
    parentGuessName: 'Dana Thompson',
    studentGuessName: 'Maya Thompson',
    names: [
      { name: 'Dana Thompson', confidence: 0.9 },
      { name: 'Chris Thompson', confidence: 0.9 },
      { name: 'Maya Thompson', confidence: 0.85 },
    ],
    fields: [
      { label: 'relationship', value: 'mother' },
      { label: 'phone', value: '555-301-1001' },
      { label: 'email', value: 'dana.t@example.com' },
    ],
    mapped: [
      { key: 'relationship', value: 'mother' },
      { key: 'phone', value: '555-301-1001' },
      { key: 'email', value: 'dana.t@example.com' },
    ],
    records: [
      { role: 'parent', name: 'Dana Thompson', relationship: 'mother', phone: '555-301-1001' },
      { role: 'parent', name: 'Chris Thompson', relationship: 'father', phone: '555-301-1002' },
      { role: 'student', name: 'Maya Thompson' },
    ],
  }),
  meta: { multi_record: true },
});

CASES.push({
  id: 'MP02',
  kind: 'multi',
  style: 'dir',
  photo: false,
  notes: 'Siblings on one household contact sheet.',
  fields: ['phone', 'address'],
  html: page(
    'dir',
    `<h1>Household Contact Sheet</h1>
<div class="meta">Guardians: Pat Rivera (Mother)</div>
<table>
<tr><th>Children</th><th>Grade</th></tr>
<tr><td>Sofia Rivera</td><td>3</td></tr>
<tr><td>Luis Rivera</td><td>1</td></tr>
<tr><td>Amelia Rivera</td><td>K</td></tr>
</table>
<p>Home phone: 555-555-0180<br/>Address: 19 Maple Ave</p>`,
  ),
  expected: expected('MP02', 'multi', {
    intent: 'parent_card',
    parentGuessName: 'Pat Rivera',
    studentGuessName: 'Sofia Rivera',
    names: [
      { name: 'Pat Rivera', confidence: 0.9 },
      { name: 'Sofia Rivera', confidence: 0.85 },
      { name: 'Luis Rivera', confidence: 0.85 },
      { name: 'Amelia Rivera', confidence: 0.85 },
    ],
    fields: [
      { label: 'relationship', value: 'mother' },
      { label: 'phone', value: '555-555-0180' },
      { label: 'address', value: '19 Maple Ave' },
    ],
    mapped: [
      { key: 'relationship', value: 'mother' },
      { key: 'phone', value: '555-555-0180' },
      { key: 'address', value: '19 Maple Ave' },
    ],
    records: [
      { role: 'parent', name: 'Pat Rivera' },
      { role: 'student', name: 'Sofia Rivera' },
      { role: 'student', name: 'Luis Rivera' },
      { role: 'student', name: 'Amelia Rivera' },
    ],
  }),
  meta: { multi_record: true, siblings: true },
});

CASES.push({
  id: 'MP03',
  kind: 'multi',
  style: 'dir',
  photo: true,
  notes: 'Class directory excerpt; empty phone must not invent.',
  fields: ['phone'],
  html: page(
    'dir',
    `<h1>Room 12 Directory (excerpt)</h1>
<table>
<tr><th>Student</th><th>Parent</th><th>Phone</th></tr>
<tr><td>Aiden Cole</td><td>Morgan Cole</td><td>555-800-0101</td></tr>
<tr><td>Bella Diaz</td><td>Jordan Diaz</td><td>555-800-0102</td></tr>
<tr><td>Owen Kim</td><td>Sasha Kim</td><td></td></tr>
</table>
<p class="meta">Do not invent missing phone for Owen Kim.</p>`,
  ),
  expected: expected('MP03', 'multi', {
    intent: 'parent_card',
    accept_intents: ['parent_card', 'roster', 'student_card'],
    parentGuessName: 'Morgan Cole',
    studentGuessName: 'Aiden Cole',
    names: [
      { name: 'Aiden Cole', confidence: 0.8 },
      { name: 'Bella Diaz', confidence: 0.8 },
      { name: 'Owen Kim', confidence: 0.8 },
      { name: 'Morgan Cole', confidence: 0.8 },
      { name: 'Jordan Diaz', confidence: 0.8 },
      { name: 'Sasha Kim', confidence: 0.8 },
    ],
    fields: [{ label: 'phone', value: '555-800-0101' }],
    mapped: [{ key: 'phone', value: '555-800-0101' }],
    records: [
      { role: 'student', name: 'Aiden Cole', parent: 'Morgan Cole', phone: '555-800-0101' },
      { role: 'student', name: 'Bella Diaz', parent: 'Jordan Diaz', phone: '555-800-0102' },
      { role: 'student', name: 'Owen Kim', parent: 'Sasha Kim', phone: null },
    ],
  }),
  meta: { multi_record: true, no_hallucinate_empty: ['phone_owen'] },
});

CASES.push({
  id: 'N01',
  kind: 'negative',
  style: 'hw',
  photo: true,
  notes: 'NEGATIVE: math homework — must not be parent/student card.',
  fields: [],
  html: page(
    'hw',
    `<h1>Algebra Homework — Week 3</h1>
<p>Name: __________________</p>
<ol>
<li>Solve for x: 2x + 5 = 17</li>
<li>Factor: x² − 9</li>
<li>Graph y = 3x − 1</li>
</ol>`,
  ),
  expected: expected('N01', 'negative', {
    intent: 'homework',
    reject: true,
    accept_intents: ['homework', 'unsure', 'answer_key'],
    fields: [],
    mapped: [],
  }),
  meta: { negative: true },
});

CASES.push({
  id: 'N02',
  kind: 'negative',
  style: 'form',
  photo: false,
  notes: 'NEGATIVE: syllabus/weights — reject people intents.',
  fields: [],
  html: page(
    'form',
    `<h1>Course Syllabus — Biology</h1>
<table>
<tr><th>Category</th><th>Weight</th></tr>
<tr><td>Labs</td><td>40%</td></tr>
<tr><td>Tests</td><td>40%</td></tr>
<tr><td>Homework</td><td>20%</td></tr>
</table>
<p>Late work −10% per day.</p>`,
  ),
  expected: expected('N02', 'negative', {
    intent: 'syllabus',
    reject: true,
    accept_intents: ['syllabus', 'unsure'],
    fields: [],
    mapped: [],
  }),
  meta: { negative: true },
});

CASES.push({
  id: 'N03',
  kind: 'negative',
  style: 'form',
  photo: true,
  notes: 'NEGATIVE: blank desk — unsure or refuse people.',
  fields: [],
  html: page(
    'form',
    `<div style="height:900px;background:#2a2a2e;color:#666;display:flex;align-items:center;justify-content:center;font-size:28px">
(empty desk photo — no paper)
</div>`,
  ),
  expected: expected('N03', 'negative', {
    intent: 'unsure',
    reject: true,
    accept_intents: ['unsure', 'feed_photo', 'portrait'],
    fields: [],
    mapped: [],
  }),
  meta: { negative: true },
});


function main() {
  ensureDir(OUT);
  const manifest = { generated_at: new Date().toISOString(), count: 0, cases: [] };
  for (const c of CASES) {
    const dir = path.join(OUT, c.id);
    ensureDir(dir);
    write(path.join(dir, 'source.html'), c.html);
    write(path.join(dir, 'expected.json'), c.expected);
    write(
      path.join(dir, 'notes.md'),
      `# ${c.id}\n\n${c.notes}\n\nKind: ${c.kind}\nPhoto: ${c.photo ? 'yes' : 'no'}\nFields: ${(c.fields || []).join(', ')}\n`,
    );
    write(path.join(dir, 'eval-meta.json'), { kind: c.kind, photo: Boolean(c.photo), ...(c.meta || {}) });
    manifest.cases.push({
      id: c.id,
      kind: c.kind,
      photo: Boolean(c.photo),
      fields_exercised: c.fields || [],
      files: ['source.html', 'expected.json', 'notes.md', 'eval-meta.json'],
    });
  }
  manifest.count = manifest.cases.length;
  write(path.join(OUT, 'MANIFEST.json'), manifest);
  console.log('wrote', manifest.count, 'cases →', OUT);
}

main();
