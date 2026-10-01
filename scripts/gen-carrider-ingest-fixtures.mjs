#!/usr/bin/env node
/**
 * Generate car-rider ingest fixture corpus (HTML → expected.json).
 *   node scripts/gen-carrider-ingest-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/carrider-ingest');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, body);
}

const STYLES = {
  plate: `body{margin:0;padding:40px;background:#2d3748;font-family:Helvetica,Arial,sans-serif;width:800px;box-sizing:border-box}
.car{background:linear-gradient(180deg,#4a5568,#2d3748);border-radius:12px;padding:48px 32px;min-height:420px}
.plate{margin:0 auto;width:420px;background:#f7fafc;border:6px solid #1a202c;border-radius:10px;padding:18px 24px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.plate .state{font-size:14px;letter-spacing:.35em;color:#2b6cb0;font-weight:700;margin-bottom:6px}
.plate .num{font-size:54px;letter-spacing:.18em;font-weight:800;color:#111;font-family:"Courier New",monospace}
.badge{margin-top:28px;text-align:center;color:#e2e8f0;font-size:22px;font-weight:700}
.sub{text-align:center;color:#a0aec0;font-size:14px;margin-top:8px}
.night .plate{filter:brightness(.55) contrast(1.2);box-shadow:0 0 40px rgba(255,255,200,.15)}
.glare .plate{position:relative}
.glare .plate::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 40%,rgba(255,255,255,.75) 50%,transparent 60%)}
.angle{transform:perspective(600px) rotateY(-28deg) rotateX(8deg);transform-origin:center}
.partial .num{letter-spacing:.12em}
.partial .num span.hide{color:transparent;text-shadow:0 0 8px #111}
.temp{background:#fffde7;border-style:dashed}
.temp .state{color:#b7791f}`,
  tag: `body{margin:0;padding:32px;background:#edf2f7;font-family:Helvetica,Arial,sans-serif;width:800px;box-sizing:border-box}
.tag{width:360px;margin:40px auto;background:#fff;border:4px solid #2b6cb0;border-radius:16px;padding:24px;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.12)}
.tag h1{margin:0;font-size:18px;color:#2b6cb0;letter-spacing:.08em}
.tag .plate{font-size:36px;font-weight:800;margin:16px 0;letter-spacing:.16em;font-family:"Courier New",monospace}
.tag .meta{font-size:14px;color:#2d3748;line-height:1.5}
.tag .num{font-size:28px;font-weight:700;color:#c53030;margin-top:12px}
.hand{font-family:"Segoe Print","Comic Sans MS",cursive}`,
  form: `body{margin:0;padding:28px;background:#fff;font-family:Georgia,serif;color:#1a202c;width:800px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 8px;border-bottom:1px solid #cbd5e0}
.meta{color:#4a5568;font-size:12px;margin-bottom:12px}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
td,th{border:1px solid #a0aec0;padding:6px 8px;text-align:left}th{background:#edf2f7}
.note{font-size:12px;color:#2d3748;margin-top:10px}
.hand{font-family:"Segoe Print","Comic Sans MS",cursive;font-size:15px}`,
  neg: `body{margin:0;padding:28px;background:#faf5ff;font-family:Georgia,serif;width:800px;box-sizing:border-box}
h1{font-size:22px}p,li{font-size:14px;line-height:1.45}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #999;padding:6px}`,
};

function expected(id, fields) {
  return {
    source_id: id,
    document_kind: fields.document_kind ?? 'vehicle_photo',
    plate: fields.plate ?? null,
    plateFront: fields.plateFront ?? null,
    plateBack: fields.plateBack ?? null,
    make: fields.make ?? null,
    model: fields.model ?? null,
    side: fields.side ?? 'unknown',
    tag_number: fields.tag_number ?? null,
    riders: fields.riders ?? [],
    authorized_pickups: fields.authorized_pickups ?? [],
    unreadable: Boolean(fields.unreadable),
    confidence: fields.confidence ?? 0.85,
    reject_reason: fields.reject_reason ?? null,
  };
}

function plateHtml(opts) {
  const cls = ['car', opts.night && 'night', opts.glare && 'glare'].filter(Boolean).join(' ');
  const plateCls = ['plate', opts.temp && 'temp', opts.partial && 'partial', opts.angle && 'angle']
    .filter(Boolean)
    .join(' ');
  const num = opts.partial
    ? `${opts.prefix || ''}<span class="hide">${opts.hidden || 'XX'}</span>${opts.visible || ''}`
    : opts.num;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.plate}</style></head><body>
<div class="${cls}"><div class="${plateCls}">
<div class="state">${opts.state || 'TEXAS'}</div>
<div class="num">${num}</div>
</div>
<div class="badge">${opts.badge || ''}</div>
<div class="sub">${opts.sub || ''}</div>
</div></body></html>`;
}

/** @type {Array<object>} */
const CASES = [
  {
    id: 'V01',
    kind: 'vehicle_photo',
    photo: true,
    score_fields: ['plate', 'make', 'model', 'side', 'document_kind'],
    notes: 'Clean rear plate TX KLY4219 · Honda Civic · baseline happy path.',
    html: plateHtml({
      state: 'TEXAS',
      num: 'KLY-4219',
      badge: 'HONDA CIVIC',
      sub: 'Rear bumper · school dismissal lane',
    }),
    expected: expected('V01', {
      document_kind: 'vehicle_photo',
      plate: 'KLY4219',
      plateBack: 'KLY4219',
      make: 'Honda',
      model: 'Civic',
      side: 'back',
      unreadable: false,
      confidence: 0.95,
    }),
  },
  {
    id: 'V02',
    kind: 'vehicle_photo',
    photo: false,
    score_fields: ['plate', 'plateFront', 'make', 'model', 'side'],
    notes: 'Clean front plate only · Toyota Camry.',
    html: plateHtml({
      state: 'TEXAS',
      num: 'RDE8801',
      badge: 'TOYOTA CAMRY',
      sub: 'Front grille plate',
    }),
    expected: expected('V02', {
      document_kind: 'vehicle_photo',
      plate: 'RDE8801',
      plateFront: 'RDE8801',
      make: 'Toyota',
      model: 'Camry',
      side: 'front',
      unreadable: false,
    }),
  },
  {
    id: 'V03',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate', 'unreadable'],
    notes: 'Night + glare on rear plate TX NGT5520 Ford F-150.',
    html: plateHtml({
      state: 'TEXAS',
      num: 'NGT5520',
      badge: 'FORD F-150',
      sub: 'Night curb · headlight glare',
      night: true,
      glare: true,
    }),
    expected: expected('V03', {
      document_kind: 'vehicle_photo',
      plate: 'NGT5520',
      plateBack: 'NGT5520',
      make: 'Ford',
      model: 'F-150',
      side: 'back',
      unreadable: false,
      confidence: 0.7,
    }),
  },
  {
    id: 'V04',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate', 'side'],
    notes: 'Angled phone shot · plate skew TX ANG3140.',
    html: plateHtml({
      state: 'TEXAS',
      num: 'ANG3140',
      badge: 'NISSAN ROGUE',
      sub: 'Phone at 30° angle',
      angle: true,
    }),
    expected: expected('V04', {
      document_kind: 'vehicle_photo',
      plate: 'ANG3140',
      plateBack: 'ANG3140',
      make: 'Nissan',
      model: 'Rogue',
      side: 'back',
      unreadable: false,
      confidence: 0.75,
    }),
  },
  {
    id: 'V05',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate', 'unreadable'],
    notes: 'Partial plate — only last 3 chars visible (719). Must not invent full plate.',
    html: plateHtml({
      state: 'TEXAS',
      partial: true,
      prefix: '',
      hidden: '??',
      visible: '719',
      badge: '(make obscured)',
      sub: 'Bumper covers left of plate',
    }),
    expected: expected('V05', {
      document_kind: 'vehicle_photo',
      plate: null,
      make: null,
      model: null,
      side: 'back',
      unreadable: true,
      confidence: 0.4,
    }),
  },
  {
    id: 'V06',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate', 'document_kind'],
    notes: 'Temporary paper dealer tag TMP9944.',
    html: plateHtml({
      state: 'TEMPORARY TAG',
      num: 'TMP9944',
      badge: 'CHEVROLET MALIBU',
      sub: 'Paper dealer tag in rear window',
      temp: true,
    }),
    expected: expected('V06', {
      document_kind: 'vehicle_photo',
      plate: 'TMP9944',
      plateBack: 'TMP9944',
      make: 'Chevrolet',
      model: 'Malibu',
      side: 'back',
      unreadable: false,
      confidence: 0.8,
    }),
  },
  {
    id: 'V07',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate', 'make', 'model'],
    notes: 'Out-of-state California plate 8KGM204 · Subaru Outback.',
    html: plateHtml({
      state: 'CALIFORNIA',
      num: '8KGM204',
      badge: 'SUBARU OUTBACK',
      sub: 'Out-of-state parent vehicle',
    }),
    expected: expected('V07', {
      document_kind: 'vehicle_photo',
      plate: '8KGM204',
      plateBack: '8KGM204',
      make: 'Subaru',
      model: 'Outback',
      side: 'back',
      unreadable: false,
    }),
  },
  {
    id: 'V08',
    kind: 'vehicle_photo',
    photo: false,
    score_fields: ['plate', 'plateFront', 'plateBack'],
    notes: 'Two plates same vehicle: front FRN1001 back BCK2002 (rare dual). Primary = back.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.plate}
.row{display:flex;gap:24px;justify-content:center}.plate{width:300px}.num{font-size:40px}</style></head><body>
<div class="car"><div class="row">
<div class="plate"><div class="state">TEXAS FRONT</div><div class="num">FRN1001</div></div>
<div class="plate"><div class="state">TEXAS BACK</div><div class="num">BCK2002</div></div>
</div>
<div class="badge">KIA SORENTO</div>
<div class="sub">Staff collage of front + rear</div>
</div></body></html>`,
    expected: expected('V08', {
      document_kind: 'vehicle_photo',
      plate: 'BCK2002',
      plateFront: 'FRN1001',
      plateBack: 'BCK2002',
      make: 'Kia',
      model: 'Sorento',
      side: 'unknown',
      unreadable: false,
    }),
  },
  {
    id: 'V09',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate', 'unreadable'],
    notes: 'Low light + heavy shadow on plate SHD6677 Mazda CX-5.',
    html: plateHtml({
      state: 'TEXAS',
      num: 'SHD6677',
      badge: 'MAZDA CX-5',
      sub: 'Tree shadow across plate',
      night: true,
    }),
    expected: expected('V09', {
      document_kind: 'vehicle_photo',
      plate: 'SHD6677',
      plateBack: 'SHD6677',
      make: 'Mazda',
      model: 'CX-5',
      side: 'back',
      unreadable: false,
      confidence: 0.65,
    }),
  },
  {
    id: 'V10',
    kind: 'vehicle_photo',
    photo: true,
    hard: true,
    score_fields: ['plate'],
    notes: 'Ambiguous O vs 0 in plate — GT uses zero: BL0OM42 (letter O not used).',
    html: plateHtml({
      state: 'TEXAS',
      num: 'BL0OM42',
      badge: 'HYUNDAI TUCSON',
      sub: 'Ambiguous glyph plate',
    }),
    expected: expected('V10', {
      document_kind: 'vehicle_photo',
      plate: 'BL0OM42',
      plateBack: 'BL0OM42',
      make: 'Hyundai',
      model: 'Tucson',
      side: 'back',
      unreadable: false,
      confidence: 0.7,
    }),
  },
  {
    id: 'T01',
    kind: 'hang_tag',
    photo: true,
    score_fields: ['document_kind', 'plate', 'tag_number', 'riders'],
    notes: 'Plastic car-rider hang tag · plate + tag # + rider names.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.tag}</style></head><body>
<div class="tag">
<h1>CAR RIDER TAG</h1>
<div class="plate">KLY4219</div>
<div class="meta">Rider: Maya Chen<br/>Sibling: Leo Chen<br/>Grade 3 / Grade 1</div>
<div class="num">TAG # 1042</div>
</div></body></html>`,
    expected: expected('T01', {
      document_kind: 'hang_tag',
      plate: 'KLY4219',
      tag_number: '1042',
      riders: ['Maya Chen', 'Leo Chen'],
      side: 'unknown',
      unreadable: false,
    }),
  },
  {
    id: 'T02',
    kind: 'hang_tag',
    photo: true,
    hard: true,
    score_fields: ['document_kind', 'plate', 'tag_number', 'riders'],
    notes: 'Handwritten hang tag · messy ink.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.tag}</style></head><body>
<div class="tag hand">
<h1>Rider pass</h1>
<div class="plate">QWZ3390</div>
<div class="meta">Student: Ava Brooks<br/>Pickup lane B</div>
<div class="num"># 77</div>
</div></body></html>`,
    expected: expected('T02', {
      document_kind: 'hang_tag',
      plate: 'QWZ3390',
      tag_number: '77',
      riders: ['Ava Brooks'],
      unreadable: false,
      confidence: 0.7,
    }),
  },
  {
    id: 'T03',
    kind: 'hang_tag',
    photo: false,
    score_fields: ['document_kind', 'tag_number', 'plate'],
    notes: 'Hang tag with tag number only — plate blank. Must not invent plate.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.tag}</style></head><body>
<div class="tag">
<h1>CAR RIDER TAG</h1>
<div class="plate">—</div>
<div class="meta">Rider: Noah Patel<br/>Plate on file at office</div>
<div class="num">TAG # 2201</div>
</div></body></html>`,
    expected: expected('T03', {
      document_kind: 'hang_tag',
      plate: null,
      tag_number: '2201',
      riders: ['Noah Patel'],
      unreadable: true,
      confidence: 0.75,
    }),
  },
  {
    id: 'F01',
    kind: 'check_in_sheet',
    photo: false,
    score_fields: ['document_kind', 'riders'],
    notes: 'Multi-row rider check-in sheet (3 records).',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.form}</style></head><body>
<h1>Car Rider Check-In — Lane A</h1>
<div class="meta">Willow Creek Elementary · Dismissal 3:15 PM · Synthetic sample</div>
<table><tr><th>#</th><th>Student</th><th>Plate</th><th>Time</th><th>Staff</th></tr>
<tr><td>1</td><td>Maya Chen</td><td>KLY4219</td><td>3:16</td><td>JR</td></tr>
<tr><td>2</td><td>Sam Ortiz</td><td>RDE8801</td><td>3:17</td><td>JR</td></tr>
<tr><td>3</td><td>Ava Brooks</td><td>QWZ3390</td><td>3:18</td><td>JR</td></tr>
</table>
<p class="note">Office use only. Do not invent parents.</p>
</body></html>`,
    expected: expected('F01', {
      document_kind: 'check_in_sheet',
      plate: null,
      riders: ['Maya Chen', 'Sam Ortiz', 'Ava Brooks'],
      unreadable: false,
      confidence: 0.85,
    }),
  },
  {
    id: 'F02',
    kind: 'authorized_pickup',
    photo: true,
    score_fields: ['document_kind', 'riders', 'authorized_pickups', 'plate'],
    notes: 'Authorized pickup form with vehicle plate + two adults.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.form}</style></head><body>
<h1>Authorized Pickup Form</h1>
<div class="meta">School year 2025–26 · Synthetic names only</div>
<table>
<tr><th>Student</th><td>Jordan Lee</td></tr>
<tr><th>Grade</th><td>4</td></tr>
<tr><th>Primary vehicle plate</th><td>JRD4410</td></tr>
<tr><th>Make / model</th><td>Honda CR-V</td></tr>
<tr><th>Authorized adults</th><td>Priya Lee; Marcus Lee</td></tr>
</table>
<p class="note">I authorize the adults listed to pick up my child from the car rider line.</p>
</body></html>`,
    expected: expected('F02', {
      document_kind: 'authorized_pickup',
      plate: 'JRD4410',
      make: 'Honda',
      model: 'CR-V',
      riders: ['Jordan Lee'],
      authorized_pickups: ['Priya Lee', 'Marcus Lee'],
      unreadable: false,
    }),
  },
  {
    id: 'F03',
    kind: 'check_in_sheet',
    photo: true,
    hard: true,
    score_fields: ['document_kind', 'riders'],
    notes: 'Handwritten single-line check-in slip.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.form}</style></head><body>
<div class="hand">
<h1>Check-in slip</h1>
<p>Name: Ellie Nguyen</p>
<p>Plate: ELL2099</p>
<p>Lane C · 3:22</p>
</div>
</body></html>`,
    expected: expected('F03', {
      document_kind: 'check_in_sheet',
      plate: 'ELL2099',
      riders: ['Ellie Nguyen'],
      unreadable: false,
      confidence: 0.7,
    }),
  },
  {
    id: 'F04',
    kind: 'authorized_pickup',
    photo: false,
    score_fields: ['document_kind', 'authorized_pickups', 'plate'],
    notes: 'Authorized pickup with blank plate — must stay null.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.form}</style></head><body>
<h1>Authorized Pickup Form</h1>
<table>
<tr><th>Student</th><td>Chris Kim</td></tr>
<tr><th>Primary vehicle plate</th><td>(to be provided)</td></tr>
<tr><th>Authorized adults</th><td>Mina Kim</td></tr>
</table>
</body></html>`,
    expected: expected('F04', {
      document_kind: 'authorized_pickup',
      plate: null,
      riders: ['Chris Kim'],
      authorized_pickups: ['Mina Kim'],
      unreadable: true,
      confidence: 0.8,
    }),
  },
  {
    id: 'N01',
    kind: 'negative',
    negative: true,
    photo: true,
    score_fields: ['document_kind', 'unreadable', 'plate'],
    notes: 'NEGATIVE: Algebra homework — must reject, no plate invent.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.neg}</style></head><body>
<h1>Algebra I — Homework 12</h1>
<p>Name: ________________</p>
<ol><li>Solve 2x + 5 = 17</li><li>Factor x² − 9</li><li>Graph y = 3x − 1</li></ol>
<table><tr><th>Problem</th><th>Answer</th></tr><tr><td>1</td><td></td></tr><tr><td>2</td><td></td></tr></table>
</body></html>`,
    expected: expected('N01', {
      document_kind: 'rejected',
      plate: null,
      make: null,
      model: null,
      unreadable: true,
      reject_reason: 'not a vehicle or rider document',
      confidence: 0.9,
    }),
  },
  {
    id: 'N02',
    kind: 'negative',
    negative: true,
    photo: false,
    score_fields: ['document_kind', 'plate'],
    notes: 'NEGATIVE: class syllabus weights — reject.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.neg}</style></head><body>
<h1>Biology Syllabus</h1>
<p>Tests 40% · Labs 30% · Daily 30%</p>
<p>Late work: −10% per day</p>
</body></html>`,
    expected: expected('N02', {
      document_kind: 'rejected',
      plate: null,
      make: null,
      model: null,
      unreadable: true,
      reject_reason: 'syllabus not ride document',
    }),
  },
  {
    id: 'N03',
    kind: 'negative',
    negative: true,
    photo: true,
    score_fields: ['document_kind', 'plate', 'unreadable'],
    notes: 'NEGATIVE: cafeteria menu poster — reject.',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES.neg}</style></head><body>
<h1>Cafeteria Menu — Week of Sept 8</h1>
<ul><li>Mon: Cheese pizza</li><li>Tue: Chicken bowl</li><li>Wed: Chef salad</li></ul>
<p>Milk included. No vehicle content.</p>
</body></html>`,
    expected: expected('N03', {
      document_kind: 'rejected',
      plate: null,
      make: null,
      model: null,
      unreadable: true,
      reject_reason: 'unrelated document',
    }),
  },
];

function main() {
  if (!CASES.length) {
    console.error('CASES empty — generator incomplete');
    process.exit(1);
  }
  ensureDir(OUT);
  const manifest = { generated_at: new Date().toISOString(), cases: [] };
  for (const c of CASES) {
    const dir = path.join(OUT, c.id);
    ensureDir(dir);
    write(path.join(dir, 'source.html'), c.html);
    write(path.join(dir, 'expected.json'), JSON.stringify(c.expected, null, 2) + '\n');
    write(
      path.join(dir, 'eval-meta.json'),
      JSON.stringify(
        {
          negative: Boolean(c.negative),
          photo: Boolean(c.photo),
          kind: c.kind,
          hard: Boolean(c.hard),
          fields: c.score_fields || [],
        },
        null,
        2,
      ) + '\n',
    );
    write(path.join(dir, 'notes.md'), c.notes + '\n');
    manifest.cases.push({
      id: c.id,
      kind: c.kind,
      photo: Boolean(c.photo),
      negative: Boolean(c.negative),
      hard: Boolean(c.hard),
    });
  }
  write(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('wrote', CASES.length, 'cases →', OUT);
}

main();
