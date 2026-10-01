#!/usr/bin/env node
/**
 * Generate roster ingest fixture corpus (HTML + expected.json).
 *   node scripts/gen-roster-ingest-fixtures.mjs
 * Then: node scripts/render-roster-ingest-pngs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/roster-ingest');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 2) + '\n');
}

const STYLES = {
  classic: `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:24px;background:#faf8f5;width:800px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 4px}.meta{color:#555;font-size:12px;margin-bottom:12px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #999;padding:5px 8px;text-align:left}th{background:#eee}`,
  modern: `body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:22px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:18px;color:#1e3a8a;margin:0}.meta{color:#64748b;font-size:12px;margin:6px 0 12px}
table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border:1px solid #cbd5e1;padding:6px 8px}th{background:#f1f5f9}`,
  sheet: `body{font-family:Calibri,Arial,sans-serif;color:#111;margin:0;padding:16px;background:#e8f0e8;width:900px;box-sizing:border-box}
h1{font-size:16px;margin:0}.meta{font-size:11px;color:#333;margin:4px 0 8px}
table{border-collapse:collapse;width:100%;font-size:12px;background:#fff}td,th{border:1px solid #9ca3af;padding:4px 6px}th{background:#d1fae5;font-weight:600}
.cell-num{text-align:right;font-variant-numeric:tabular-nums}`,
  seat: `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:20px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:18px;margin:0 0 8px}.meta{font-size:12px;color:#555;margin-bottom:12px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.desk{border:2px solid #334155;border-radius:8px;padding:14px 8px;text-align:center;font-size:13px;min-height:52px;background:#f8fafc}
.desk .id{font-size:10px;color:#64748b;margin-top:4px}.front{text-align:center;font-size:11px;color:#64748b;margin-bottom:8px;letter-spacing:0.08em}`,
  hand: `body{font-family:"Segoe Print","Comic Sans MS",cursive;color:#1e293b;margin:0;padding:28px;background:#fffef5;width:800px;box-sizing:border-box}
h1{font-size:22px;margin:0 0 8px}p,li{font-size:16px;line-height:1.55}.line{border-bottom:1px solid #cbd5e1;padding:6px 4px;margin:4px 0}`,
  attend: `body{font-family:Arial,sans-serif;color:#111;margin:0;padding:20px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:17px;margin:0}.meta{font-size:12px;color:#444;margin:4px 0 10px}
table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border:1px solid #333;padding:5px 7px}th{background:#f3f4f6}
.p{color:#166534}.a{color:#b91c1c}`,
  dark: `body{font-family:Georgia,serif;color:#d4d4d4;margin:0;padding:24px;background:#1a1a1e;width:800px;box-sizing:border-box}
h1{font-size:18px;margin:0;color:#eee}.meta{color:#9ca3af;font-size:12px;margin-bottom:12px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #4b5563;padding:5px 8px}th{background:#27272a}`,
};

function page(styleKey, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES[styleKey]}</style></head><body>
${bodyHtml}
</body></html>`;
}

function nameRow(name, opts = {}) {
  return {
    name,
    student_id: opts.student_id ?? null,
    grade: opts.grade ?? null,
    period: opts.period ?? null,
    parent_contact: opts.parent_contact ?? null,
    confident: opts.confident !== false,
  };
}

function expected(id, kind, names, extras = {}) {
  return {
    source_id: id,
    kind,
    document_kind_guess: extras.document_kind_guess ?? (kind === 'negative' ? 'not_roster' : 'class_roster'),
    rejected: kind === 'negative' || extras.rejected === true,
    overall_confidence: extras.overall_confidence ?? (kind === 'negative' ? 0.15 : 0.9),
    names,
    warnings: extras.warnings ?? [],
    _eval: extras._eval ?? {},
  };
}

/** @type {Array<object>} */
const CASES = [
  {
    id: 'R01',
    kind: 'roster',
    style: 'classic',
    photo: true,
    fields: ['names', 'student_id'],
    notes: 'Clean printed roster with Name + Student ID. Photo variant.',
    html: page(
      'classic',
      `<h1>Period 2 · World History</h1>
<div class="meta">Ms. Calderón · Room 118 · Fall 2026 · Class roster</div>
<table><tr><th>#</th><th>Student name</th><th>Student ID</th></tr>
<tr><td>1</td><td>Ava Brooks</td><td>A2401</td></tr>
<tr><td>2</td><td>Diego Morales</td><td>A2402</td></tr>
<tr><td>3</td><td>Harper Nguyen</td><td>A2403</td></tr>
<tr><td>4</td><td>Jonah Patel</td><td>A2404</td></tr>
<tr><td>5</td><td>Lila Okonkwo</td><td>A2405</td></tr>
<tr><td>6</td><td>Mateo Ruiz</td><td>A2406</td></tr>
<tr><td>7</td><td>Nora Singh</td><td>A2407</td></tr>
<tr><td>8</td><td>Owen Blake</td><td>A2408</td></tr>
</table>`,
    ),
    expected: expected('R01', 'roster', [
      nameRow('Ava Brooks', { student_id: 'A2401' }),
      nameRow('Diego Morales', { student_id: 'A2402' }),
      nameRow('Harper Nguyen', { student_id: 'A2403' }),
      nameRow('Jonah Patel', { student_id: 'A2404' }),
      nameRow('Lila Okonkwo', { student_id: 'A2405' }),
      nameRow('Mateo Ruiz', { student_id: 'A2406' }),
      nameRow('Nora Singh', { student_id: 'A2407' }),
      nameRow('Owen Blake', { student_id: 'A2408' }),
    ]),
  },
  {
    id: 'R02',
    kind: 'roster',
    style: 'sheet',
    fields: ['names', 'student_id', 'grade', 'period'],
    notes: 'Spreadsheet-style screenshot: name, ID, grade, period.',
    html: page(
      'sheet',
      `<h1>Homeroom roster export</h1>
<div class="meta">File: HR-9B-roster.xlsx · Sheet1</div>
<table><tr><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr>
<tr><th></th><th>Last, First</th><th>ID</th><th>Gr</th><th>Per</th></tr>
<tr><td class="cell-num">1</td><td>Chen, Maya</td><td>88201</td><td>9</td><td>1</td></tr>
<tr><td class="cell-num">2</td><td>Foster, Eli</td><td>88214</td><td>9</td><td>1</td></tr>
<tr><td class="cell-num">3</td><td>Garcia, Sofia</td><td>88222</td><td>9</td><td>1</td></tr>
<tr><td class="cell-num">4</td><td>Kim, Jordan</td><td>88231</td><td>9</td><td>1</td></tr>
<tr><td class="cell-num">5</td><td>Lopez, Camila</td><td>88240</td><td>9</td><td>1</td></tr>
<tr><td class="cell-num">6</td><td>Wright, Noah</td><td>88255</td><td>9</td><td>1</td></tr>
</table>`,
    ),
    expected: expected('R02', 'roster', [
      nameRow('Maya Chen', { student_id: '88201', grade: '9', period: '1' }),
      nameRow('Eli Foster', { student_id: '88214', grade: '9', period: '1' }),
      nameRow('Sofia Garcia', { student_id: '88222', grade: '9', period: '1' }),
      nameRow('Jordan Kim', { student_id: '88231', grade: '9', period: '1' }),
      nameRow('Camila Lopez', { student_id: '88240', grade: '9', period: '1' }),
      nameRow('Noah Wright', { student_id: '88255', grade: '9', period: '1' }),
    ], { document_kind_guess: 'class_roster' }),
  },
  {
    id: 'R03',
    kind: 'roster',
    style: 'seat',
    photo: true,
    fields: ['names'],
    notes: 'Seating chart grid — names only, no IDs. Photo.',
    html: page(
      'seat',
      `<h1>Algebra I · Seating chart</h1>
<div class="meta">Mr. Vance · Room 214 · Period 3</div>
<div class="front">— FRONT —</div>
<div class="grid">
<div class="desk">Priya Shah</div>
<div class="desk">Leo Anders</div>
<div class="desk">Mila Torres</div>
<div class="desk">Sam Quinn</div>
<div class="desk">Zoe Hart</div>
<div class="desk">Ben Cole</div>
<div class="desk">Iris Moon</div>
<div class="desk">Kai Brooks</div>
<div class="desk">Ella Voss</div>
<div class="desk">Max Reed</div>
<div class="desk">Nina Park</div>
<div class="desk">Omar Diaz</div>
</div>`,
    ),
    expected: expected(
      'R03',
      'roster',
      [
        'Priya Shah',
        'Leo Anders',
        'Mila Torres',
        'Sam Quinn',
        'Zoe Hart',
        'Ben Cole',
        'Iris Moon',
        'Kai Brooks',
        'Ella Voss',
        'Max Reed',
        'Nina Park',
        'Omar Diaz',
      ].map((n) => nameRow(n)),
      { document_kind_guess: 'seating_chart' },
    ),
  },
  {
    id: 'R04',
    kind: 'roster',
    style: 'attend',
    fields: ['names'],
    notes: 'Attendance sheet with Present/Absent — skip status words and headers.',
    html: page(
      'attend',
      `<h1>Daily attendance · Period 4 Biology</h1>
<div class="meta">Date: 2026-09-15 · Teacher: Dr. Hale · Room 12</div>
<table><tr><th>Name</th><th>Status</th><th>Notes</th></tr>
<tr><td>Amelia Crowe</td><td class="p">Present</td><td></td></tr>
<tr><td>Caleb Orth</td><td class="a">Absent</td><td>excused</td></tr>
<tr><td>Daisy Fen</td><td class="p">Present</td><td></td></tr>
<tr><td>Ethan Vale</td><td class="p">Present</td><td></td></tr>
<tr><td>Freya Moss</td><td class="a">Absent</td><td></td></tr>
<tr><td>Gavin Shore</td><td class="p">Present</td><td>tardy 2m</td></tr>
<tr><td>Hannah Pike</td><td class="p">Present</td><td></td></tr>
</table>
<p style="font-size:11px;color:#666">Page totals: Present 5 · Absent 2 · Do not count teacher name Dr. Hale</p>`,
    ),
    expected: expected(
      'R04',
      'roster',
      [
        'Amelia Crowe',
        'Caleb Orth',
        'Daisy Fen',
        'Ethan Vale',
        'Freya Moss',
        'Gavin Shore',
        'Hannah Pike',
      ].map((n) => nameRow(n)),
      { document_kind_guess: 'attendance' },
    ),
  },
  {
    id: 'R05',
    kind: 'roster',
    style: 'modern',
    photo: true,
    fields: ['names', 'student_id', 'grade'],
    notes: 'Phone photo with skew/glare of modern roster card.',
    html: page(
      'modern',
      `<h1>English 10 roster <span style="font-size:11px;background:#dbeafe;padding:2px 8px;border-radius:999px">Sec A</span></h1>
<div class="meta">Ms. Okada · Fall 2026</div>
<table><tr><th>Student</th><th>ID</th><th>Grade</th></tr>
<tr><td>Isla Brennan</td><td>T-110</td><td>10</td></tr>
<tr><td>Jamal Washington</td><td>T-111</td><td>10</td></tr>
<tr><td>Keira Santos</td><td>T-112</td><td>10</td></tr>
<tr><td>Liam Okafor</td><td>T-113</td><td>10</td></tr>
<tr><td>Mina Cho</td><td>T-114</td><td>10</td></tr>
<tr><td>Nolan Berg</td><td>T-115</td><td>10</td></tr>
<tr><td>Olive Tran</td><td>T-116</td><td>10</td></tr>
<tr><td>Parker Ellis</td><td>T-117</td><td>10</td></tr>
<tr><td>Quinn Adler</td><td>T-118</td><td>10</td></tr>
</table>`,
    ),
    expected: expected('R05', 'roster', [
      nameRow('Isla Brennan', { student_id: 'T-110', grade: '10' }),
      nameRow('Jamal Washington', { student_id: 'T-111', grade: '10' }),
      nameRow('Keira Santos', { student_id: 'T-112', grade: '10' }),
      nameRow('Liam Okafor', { student_id: 'T-113', grade: '10' }),
      nameRow('Mina Cho', { student_id: 'T-114', grade: '10' }),
      nameRow('Nolan Berg', { student_id: 'T-115', grade: '10' }),
      nameRow('Olive Tran', { student_id: 'T-116', grade: '10' }),
      nameRow('Parker Ellis', { student_id: 'T-117', grade: '10' }),
      nameRow('Quinn Adler', { student_id: 'T-118', grade: '10' }),
    ]),
  },
  {
    id: 'R06',
    kind: 'roster',
    style: 'dark',
    photo: true,
    lowLight: true,
    fields: ['names', 'student_id'],
    notes: 'Low-light dark background roster + photo degradation.',
    html: page(
      'dark',
      `<h1>Chemistry · Lab section B</h1>
<div class="meta">Room 6 · Period 5 · Roster</div>
<table><tr><th>Name</th><th>ID</th></tr>
<tr><td>Ravi Mehta</td><td>C501</td></tr>
<tr><td>Sienna Holt</td><td>C502</td></tr>
<tr><td>Theo Grant</td><td>C503</td></tr>
<tr><td>Uma Desai</td><td>C504</td></tr>
<tr><td>Victor Lang</td><td>C505</td></tr>
<tr><td>Willa Cross</td><td>C506</td></tr>
</table>`,
    ),
    expected: expected('R06', 'roster', [
      nameRow('Ravi Mehta', { student_id: 'C501' }),
      nameRow('Sienna Holt', { student_id: 'C502' }),
      nameRow('Theo Grant', { student_id: 'C503' }),
      nameRow('Uma Desai', { student_id: 'C504' }),
      nameRow('Victor Lang', { student_id: 'C505' }),
      nameRow('Willa Cross', { student_id: 'C506' }),
    ]),
  },
  {
    id: 'R07',
    kind: 'roster',
    style: 'hand',
    hand: true,
    photo: true,
    fields: ['names'],
    notes: 'Handwritten class list — names only, some less clear.',
    html: page(
      'hand',
      `<h1>My class list</h1>
<p style="font-size:13px;color:#64748b">Period 1 — written 8/22</p>
<div class="line">1. Yasmin Ortiz</div>
<div class="line">2. Brody Klein</div>
<div class="line">3. Cora Ellis</div>
<div class="line">4. Drew Nakamura</div>
<div class="line">5. Elise Fontaine</div>
<div class="line">6. Felix Huang</div>
<div class="line">7. Greta Lind</div>
<div class="line">8. Hugo Marquez</div>`,
    ),
    expected: expected('R07', 'roster', [
      nameRow('Yasmin Ortiz'),
      nameRow('Brody Klein'),
      nameRow('Cora Ellis'),
      nameRow('Drew Nakamura'),
      nameRow('Elise Fontaine'),
      nameRow('Felix Huang'),
      nameRow('Greta Lind'),
      nameRow('Hugo Marquez'),
    ]),
  },
  {
    id: 'R08',
    kind: 'roster',
    style: 'classic',
    fields: ['names', 'period'],
    notes: 'Multi-period combined list; period column required.',
    html: page(
      'classic',
      `<h1>Band roster · All periods</h1>
<div class="meta">Director: Ms. Pell · Room 40</div>
<table><tr><th>Student</th><th>Period</th></tr>
<tr><td>Aiden Brooks</td><td>1</td></tr>
<tr><td>Bella Cruz</td><td>1</td></tr>
<tr><td>Carter Dunn</td><td>2</td></tr>
<tr><td>Delia Fox</td><td>2</td></tr>
<tr><td>Evan Goh</td><td>3</td></tr>
<tr><td>Faye Ito</td><td>3</td></tr>
<tr><td>Gabe Jung</td><td>4</td></tr>
<tr><td>Hana Kim</td><td>4</td></tr>
</table>`,
    ),
    expected: expected('R08', 'roster', [
      nameRow('Aiden Brooks', { period: '1' }),
      nameRow('Bella Cruz', { period: '1' }),
      nameRow('Carter Dunn', { period: '2' }),
      nameRow('Delia Fox', { period: '2' }),
      nameRow('Evan Goh', { period: '3' }),
      nameRow('Faye Ito', { period: '3' }),
      nameRow('Gabe Jung', { period: '4' }),
      nameRow('Hana Kim', { period: '4' }),
    ]),
  },
  {
    id: 'R09',
    kind: 'roster',
    style: 'modern',
    fields: ['names', 'parent_contact'],
    notes: 'Roster with parent/guardian contact column.',
    html: page(
      'modern',
      `<h1>Grade 6 advisory roster</h1>
<div class="meta">Advisor: Mr. Soto · Contacts for emergency only</div>
<table><tr><th>Student</th><th>Parent / guardian</th><th>Contact</th></tr>
<tr><td>Ivy Navarro</td><td>Rosa Navarro</td><td>rosa.navarro@example.com</td></tr>
<tr><td>Jude Palmer</td><td>Chris Palmer</td><td>555-0142</td></tr>
<tr><td>Kira Solis</td><td>Elena Solis</td><td>elena.solis@example.com</td></tr>
<tr><td>Luca Bianchi</td><td>Marco Bianchi</td><td>555-0199</td></tr>
<tr><td>Mara Quinn</td><td>Pat Quinn</td><td>pat.quinn@example.com</td></tr>
</table>`,
    ),
    expected: expected('R09', 'roster', [
      nameRow('Ivy Navarro', { parent_contact: 'Rosa Navarro <rosa.navarro@example.com>' }),
      nameRow('Jude Palmer', { parent_contact: 'Chris Palmer <555-0142>' }),
      nameRow('Kira Solis', { parent_contact: 'Elena Solis <elena.solis@example.com>' }),
      nameRow('Luca Bianchi', { parent_contact: 'Marco Bianchi <555-0199>' }),
      nameRow('Mara Quinn', { parent_contact: 'Pat Quinn <pat.quinn@example.com>' }),
    ]),
  },
  {
    id: 'R10',
    kind: 'roster',
    style: 'classic',
    photo: true,
    fields: ['names'],
    notes: 'Partial/ambiguous: first names only + one smudged line → low confidence.',
    html: page(
      'classic',
      `<h1>After-school club sign-in</h1>
<div class="meta">Chess club · 9/12 · partial sheet</div>
<table><tr><th>First name</th><th>Notes</th></tr>
<tr><td>Ava</td><td></td></tr>
<tr><td>Diego</td><td></td></tr>
<tr><td style="opacity:0.35;letter-spacing:2px">H###r</td><td>smudged</td></tr>
<tr><td>Jonah</td><td></td></tr>
<tr><td>Lila</td><td>maybe Lila O.</td></tr>
</table>
<p style="font-size:12px;color:#666">Last names not printed. Do not invent surnames.</p>`,
    ),
    expected: expected(
      'R10',
      'roster',
      [
        nameRow('Ava', { confident: false }),
        nameRow('Diego', { confident: false }),
        nameRow('Jonah', { confident: false }),
        nameRow('Lila', { confident: false }),
      ],
      {
        warnings: ['first_names_only', 'smudged_line_skipped'],
        _eval: { allow_missing_smudge: true, soft_first_name: true },
      },
    ),
  },
  {
    id: 'R11',
    kind: 'roster',
    style: 'classic',
    multiPage: true,
    fields: ['names', 'student_id'],
    notes: 'Multi-page roster page 1 of 2 (A–M).',
    html: page(
      'classic',
      `<h1>Spanish II roster · page 1 of 2</h1>
<div class="meta">Sra. Vega · Period 6 · A–M</div>
<table><tr><th>Name</th><th>ID</th></tr>
<tr><td>Adrian Bell</td><td>S201</td></tr>
<tr><td>Bianca Cruz</td><td>S202</td></tr>
<tr><td>Colin Drake</td><td>S203</td></tr>
<tr><td>Dana Espinoza</td><td>S204</td></tr>
<tr><td>Elena Frost</td><td>S205</td></tr>
<tr><td>Finn Garza</td><td>S206</td></tr>
<tr><td>Gina Hale</td><td>S207</td></tr>
<tr><td>Hector Ines</td><td>S208</td></tr>
<tr><td>Ingrid Jost</td><td>S209</td></tr>
<tr><td>Jules Kwon</td><td>S210</td></tr>
<tr><td>Kara Lane</td><td>S211</td></tr>
<tr><td>Luis Mendez</td><td>S212</td></tr>
</table>
<p style="font-size:11px;color:#888">Continued on page 2…</p>`,
    ),
    expected: expected('R11', 'roster', [
      nameRow('Adrian Bell', { student_id: 'S201' }),
      nameRow('Bianca Cruz', { student_id: 'S202' }),
      nameRow('Colin Drake', { student_id: 'S203' }),
      nameRow('Dana Espinoza', { student_id: 'S204' }),
      nameRow('Elena Frost', { student_id: 'S205' }),
      nameRow('Finn Garza', { student_id: 'S206' }),
      nameRow('Gina Hale', { student_id: 'S207' }),
      nameRow('Hector Ines', { student_id: 'S208' }),
      nameRow('Ingrid Jost', { student_id: 'S209' }),
      nameRow('Jules Kwon', { student_id: 'S210' }),
      nameRow('Kara Lane', { student_id: 'S211' }),
      nameRow('Luis Mendez', { student_id: 'S212' }),
    ]),
  },
  {
    id: 'R12',
    kind: 'roster',
    style: 'classic',
    multiPage: true,
    fields: ['names', 'student_id'],
    notes: 'Multi-page roster page 2 of 2 (N–Z).',
    html: page(
      'classic',
      `<h1>Spanish II roster · page 2 of 2</h1>
<div class="meta">Sra. Vega · Period 6 · N–Z</div>
<table><tr><th>Name</th><th>ID</th></tr>
<tr><td>Nora Ortiz</td><td>S213</td></tr>
<tr><td>Oscar Price</td><td>S214</td></tr>
<tr><td>Pia Quill</td><td>S215</td></tr>
<tr><td>Rafael Soto</td><td>S216</td></tr>
<tr><td>Sasha Tran</td><td>S217</td></tr>
<tr><td>Talia Upton</td><td>S218</td></tr>
<tr><td>Uri Vargas</td><td>S219</td></tr>
<tr><td>Vera Walsh</td><td>S220</td></tr>
<tr><td>Wyatt Xu</td><td>S221</td></tr>
<tr><td>Xena Young</td><td>S222</td></tr>
<tr><td>Yuri Zhao</td><td>S223</td></tr>
</table>`,
    ),
    expected: expected('R12', 'roster', [
      nameRow('Nora Ortiz', { student_id: 'S213' }),
      nameRow('Oscar Price', { student_id: 'S214' }),
      nameRow('Pia Quill', { student_id: 'S215' }),
      nameRow('Rafael Soto', { student_id: 'S216' }),
      nameRow('Sasha Tran', { student_id: 'S217' }),
      nameRow('Talia Upton', { student_id: 'S218' }),
      nameRow('Uri Vargas', { student_id: 'S219' }),
      nameRow('Vera Walsh', { student_id: 'S220' }),
      nameRow('Wyatt Xu', { student_id: 'S221' }),
      nameRow('Xena Young', { student_id: 'S222' }),
      nameRow('Yuri Zhao', { student_id: 'S223' }),
    ]),
  },
  {
    id: 'R13',
    kind: 'roster',
    style: 'sheet',
    photo: true,
    fields: ['names', 'grade', 'period'],
    notes: 'Grade + period columns; no student IDs on page (must stay null).',
    html: page(
      'sheet',
      `<h1>PE 9 sections</h1>
<div class="meta">Coach Rivera · Gym A</div>
<table><tr><th></th><th>Student</th><th>Grade</th><th>Period</th></tr>
<tr><td>1</td><td>Amy Barlow</td><td>9</td><td>2</td></tr>
<tr><td>2</td><td>Ben Carter</td><td>9</td><td>2</td></tr>
<tr><td>3</td><td>Chloe Dunn</td><td>9</td><td>3</td></tr>
<tr><td>4</td><td>Devin Fox</td><td>10</td><td>3</td></tr>
<tr><td>5</td><td>Eva Green</td><td>10</td><td>4</td></tr>
<tr><td>6</td><td>Finn Hayes</td><td>9</td><td>4</td></tr>
</table>`,
    ),
    expected: expected('R13', 'roster', [
      nameRow('Amy Barlow', { grade: '9', period: '2' }),
      nameRow('Ben Carter', { grade: '9', period: '2' }),
      nameRow('Chloe Dunn', { grade: '9', period: '3' }),
      nameRow('Devin Fox', { grade: '10', period: '3' }),
      nameRow('Eva Green', { grade: '10', period: '4' }),
      nameRow('Finn Hayes', { grade: '9', period: '4' }),
    ]),
  },
  {
    id: 'R14',
    kind: 'roster',
    style: 'attend',
    fields: ['names', 'student_id'],
    notes: 'LAST, FIRST format must normalize to First Last.',
    html: page(
      'attend',
      `<h1>Official class list · Civics</h1>
<div class="meta">Print date 2026-08-28</div>
<table><tr><th>Legal name</th><th>SID</th></tr>
<tr><td>ANDERSON, TAYLOR</td><td>44001</td></tr>
<tr><td>BROWN, JORDAN</td><td>44002</td></tr>
<tr><td>CLARK, RILEY</td><td>44003</td></tr>
<tr><td>DAVIS, AVERY</td><td>44004</td></tr>
<tr><td>EVANS, CASEY</td><td>44005</td></tr>
<tr><td>FLORES, MORGAN</td><td>44006</td></tr>
<tr><td>GREEN, QUINN</td><td>44007</td></tr>
</table>`,
    ),
    expected: expected('R14', 'roster', [
      nameRow('Taylor Anderson', { student_id: '44001' }),
      nameRow('Jordan Brown', { student_id: '44002' }),
      nameRow('Riley Clark', { student_id: '44003' }),
      nameRow('Avery Davis', { student_id: '44004' }),
      nameRow('Casey Evans', { student_id: '44005' }),
      nameRow('Morgan Flores', { student_id: '44006' }),
      nameRow('Quinn Green', { student_id: '44007' }),
    ]),
  },
  {
    id: 'R15',
    kind: 'roster',
    style: 'modern',
    fields: ['names'],
    notes: 'Dense 24-name list — completeness under load (cap 40).',
    html: page(
      'modern',
      `<h1>Advisory 7C · Full roster</h1>
<div class="meta">24 students</div>
<table><tr><th>#</th><th>Name</th></tr>
${[
  'Alex Rivera','Blake Nguyen','Casey Ortiz','Dana Patel','Eden Quinn','Finn Ramos',
  'Gray Santos','Harper Tao','Indie Ulrich','Jules Vega','Kai West','Lane Xu',
  'Morgan Young','Noa Zuniga','Oakley Ames','Parker Bell','Reese Cole','Sage Dunn',
  'Tatum Ellis','Unity Ford','Vale Gross','Wynn Hart','Yael Ives','Zion James',
].map((n, i) => `<tr><td>${i + 1}</td><td>${n}</td></tr>`).join('\n')}
</table>`,
    ),
    expected: expected(
      'R15',
      'roster',
      [
        'Alex Rivera','Blake Nguyen','Casey Ortiz','Dana Patel','Eden Quinn','Finn Ramos',
        'Gray Santos','Harper Tao','Indie Ulrich','Jules Vega','Kai West','Lane Xu',
        'Morgan Young','Noa Zuniga','Oakley Ames','Parker Bell','Reese Cole','Sage Dunn',
        'Tatum Ellis','Unity Ford','Vale Gross','Wynn Hart','Yael Ives','Zion James',
      ].map((n) => nameRow(n)),
    ),
  },
  {
    id: 'R16',
    kind: 'roster',
    style: 'classic',
    fields: ['names'],
    notes: 'Mixed headers "Period 3 Algebra" must not become student names.',
    html: page(
      'classic',
      `<h1>Period 3 Algebra</h1>
<div class="meta">Teacher: Mr. Stern · Room 9 · Class list</div>
<table><tr><th>Student name</th></tr>
<tr><td>Period 3 Algebra</td></tr>
<tr><td>Present</td></tr>
<tr><td>Absent</td></tr>
<tr><td>Room 9</td></tr>
<tr><td>Arlo Beckett</td></tr>
<tr><td>Blair Chen</td></tr>
<tr><td>Cody Diaz</td></tr>
<tr><td>Demi Ellis</td></tr>
<tr><td>Ezra Frost</td></tr>
<tr><td>Mr. Stern</td></tr>
</table>
<p style="font-size:12px">Junk rows above real students must be skipped.</p>`,
    ),
    expected: expected('R16', 'roster', [
      nameRow('Arlo Beckett'),
      nameRow('Blair Chen'),
      nameRow('Cody Diaz'),
      nameRow('Demi Ellis'),
      nameRow('Ezra Frost'),
    ], { warnings: ['skipped_headers'] }),
  },
  {
    id: 'R17',
    kind: 'roster',
    style: 'modern',
    photo: true,
    fields: ['names', 'student_id'],
    notes: 'Phone photo with heavy shadow strip across half the page.',
    html: page(
      'modern',
      `<h1>Geometry roster</h1>
<div class="meta">Ms. Park · Period 2</div>
<table><tr><th>Name</th><th>ID</th></tr>
<tr><td>Faye Alvarez</td><td>G301</td></tr>
<tr><td>Gus Benton</td><td>G302</td></tr>
<tr><td>Holly Cho</td><td>G303</td></tr>
<tr><td>Ian Drake</td><td>G304</td></tr>
<tr><td>Jade Ellis</td><td>G305</td></tr>
<tr><td>Kyle Ford</td><td>G306</td></tr>
<tr><td>Lena Gross</td><td>G307</td></tr>
<tr><td>Miles Hart</td><td>G308</td></tr>
</table>
<div style="position:absolute;left:0;top:120px;width:55%;height:220px;background:rgba(0,0,0,0.28);pointer-events:none"></div>`,
    ),
    expected: expected('R17', 'roster', [
      nameRow('Faye Alvarez', { student_id: 'G301' }),
      nameRow('Gus Benton', { student_id: 'G302' }),
      nameRow('Holly Cho', { student_id: 'G303' }),
      nameRow('Ian Drake', { student_id: 'G304' }),
      nameRow('Jade Ellis', { student_id: 'G305' }),
      nameRow('Kyle Ford', { student_id: 'G306' }),
      nameRow('Lena Gross', { student_id: 'G307' }),
      nameRow('Miles Hart', { student_id: 'G308' }),
    ]),
  },
  {
    id: 'R18',
    kind: 'roster',
    style: 'classic',
    photo: true,
    fields: ['names'],
    notes: 'Bottom of page cut off — only fully visible names count; partial last line low-conf or omitted.',
    html: page(
      'classic',
      `<h1>Drama cast list (cropped)</h1>
<div class="meta">Ms. Rowe · partial page</div>
<table><tr><th>Name</th></tr>
<tr><td>Nina Ortega</td></tr>
<tr><td>Owen Price</td></tr>
<tr><td>Piper Quinn</td></tr>
<tr><td>Rory Santos</td></tr>
<tr><td>Skye Turner</td></tr>
<tr><td style="opacity:0.4">Uma V</td></tr>
</table>
<div style="margin-top:8px;height:24px;overflow:hidden;border-top:2px dashed #999;color:#999;font-size:12px">…page cut…</div>`,
    ),
    expected: expected(
      'R18',
      'roster',
      [
        nameRow('Nina Ortega'),
        nameRow('Owen Price'),
        nameRow('Piper Quinn'),
        nameRow('Rory Santos'),
        nameRow('Skye Turner'),
      ],
      { _eval: { allow_extra_partial: true }, warnings: ['cropped_footer'] },
    ),
  },
  {
    id: 'N01',
    kind: 'negative',
    style: 'classic',
    photo: true,
    fields: ['names'],
    notes: 'NEGATIVE: course syllabus — must reject, no student names invented.',
    html: page(
      'classic',
      `<h1>Algebra I — Course Syllabus</h1>
<div class="meta">Ms. Rivera · Room 214 · Fall 2026</div>
<h2>How your grade is calculated</h2>
<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td>50%</td></tr>
<tr><td>Daily</td><td>50%</td></tr></table>
<p>Late work: −10% per day. Drop 1 lowest Daily.</p>`,
    ),
    expected: expected('N01', 'negative', [], {
      document_kind_guess: 'not_roster',
      rejected: true,
      warnings: ['not_a_roster'],
    }),
  },
  {
    id: 'N02',
    kind: 'negative',
    style: 'modern',
    fields: ['names'],
    notes: 'NEGATIVE: homework worksheet — reject.',
    html: page(
      'modern',
      `<h1>Exit ticket · Place value</h1>
<div class="meta">Name: __________ &nbsp;&nbsp; Date: __________</div>
<ol>
<li>Write 4,305 in expanded form.</li>
<li>What is the value of the digit 7 in 27,149?</li>
<li>Round 6,482 to the nearest hundred.</li>
</ol>
<p style="margin-top:24px">Show your work. Score: ____ / 3</p>`,
    ),
    expected: expected('N02', 'negative', [], {
      document_kind_guess: 'not_roster',
      rejected: true,
    }),
  },
  {
    id: 'N03',
    kind: 'negative',
    style: 'classic',
    photo: true,
    fields: ['names'],
    notes: 'NEGATIVE: school flyer / event poster — reject.',
    html: page(
      'classic',
      `<h1 style="text-align:center">FALL FEST 2026</h1>
<div class="meta" style="text-align:center">Saturday Oct 18 · 4–8 pm · Main lawn</div>
<p style="text-align:center">Games · Food trucks · Student performances</p>
<p style="text-align:center">Volunteers: email events@example.edu</p>
<p style="text-align:center;font-size:12px">Not a class roster. PTA sponsored.</p>`,
    ),
    expected: expected('N03', 'negative', [], {
      document_kind_guess: 'not_roster',
      rejected: true,
    }),
  },
];

function main() {
  ensureDir(OUT);
  const manifest = { generated_at: new Date().toISOString(), count: 0, cases: [] };
  for (const c of CASES) {
    const dir = path.join(OUT, c.id);
    ensureDir(dir);
    write(path.join(dir, 'source.html'), c.html);
    write(path.join(dir, 'expected.json'), c.expected);
    write(path.join(dir, 'eval-meta.json'), {
      id: c.id,
      kind: c.kind,
      photo: Boolean(c.photo),
      handwritten: Boolean(c.hand),
      negative: c.kind === 'negative',
      low_light: Boolean(c.lowLight),
      multi_page: Boolean(c.multiPage),
      fields: c.fields ?? ['names'],
      srs: c.srs ?? [],
    });
    write(
      path.join(dir, 'notes.md'),
      `# ${c.id}\n\n${c.notes}\n\nFields: ${(c.fields || ['names']).join(', ')}\nPhoto: ${c.photo ? 'yes' : 'no'}\n`,
    );
    manifest.cases.push({
      id: c.id,
      kind: c.kind,
      photo: Boolean(c.photo),
      handwritten: Boolean(c.hand),
      fields_exercised: c.fields ?? ['names'],
    });
  }
  manifest.count = manifest.cases.length;
  write(path.join(OUT, 'MANIFEST.json'), manifest);
  console.log('wrote', manifest.count, 'cases →', OUT);
}

main();
