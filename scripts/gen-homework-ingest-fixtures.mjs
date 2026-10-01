#!/usr/bin/env node
/**
 * Generate homework ingest fixture corpus (HTML + expected.json).
 *   node scripts/gen-homework-ingest-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/homework-ingest');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, body);
}

const ROSTER = [
  'Alex Rivera',
  'Jordan Chen',
  'Sam Patel',
  'Casey Nguyen',
  'Riley Brooks',
  'Morgan Ellis',
  'Taylor Kim',
  'Jamie Ortiz',
];

const STYLES = {
  classic: `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:28px;background:#faf8f5;width:800px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 6px}.meta{color:#555;font-size:13px;margin-bottom:14px}
.q{margin:10px 0;font-size:14px;line-height:1.45}.ans{border-bottom:1px solid #333;min-width:120px;display:inline-block;padding:0 6px;font-family:"Segoe Print","Comic Sans MS",cursive}
.name{font-size:15px;margin-bottom:10px}`,
  hand: `body{font-family:"Segoe Print","Comic Sans MS",cursive;color:#1e293b;margin:0;padding:28px;background:#fffef5;width:800px;box-sizing:border-box}
h1{font-size:22px;margin:0}.q{margin:12px 0;font-size:15px}.ans{color:#1e3a8a}`,
  modern: `body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:24px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:18px;color:#1e3a8a;margin:0}.meta{color:#64748b;font-size:12px;margin:6px 0 12px}
.q{margin:8px 0;font-size:13px}.ans{font-weight:600}`,
  mess: `body{font-family:Georgia,serif;color:#222;margin:0;padding:20px;background:#f3f0e8;width:800px;box-sizing:border-box}
h1{font-size:18px}.q{margin:8px 0;font-size:13px}.ans{font-family:"Segoe Print",cursive;color:#1e40af}`,
};

function page(styleKey, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES[styleKey]}</style></head><body>
${bodyHtml}
</body></html>`;
}

function field(pathKey, value, conf = 0.9, status = 'proposed') {
  return {
    path: pathKey,
    value,
    confidence: conf,
    evidence: { quote: value == null ? '' : String(value).slice(0, 80), page: 1, region: null },
    status,
    source_doc_id: null,
  };
}

function expected(id, opts) {
  const neg = Boolean(opts.negative);
  const fields = [
    field('intent', opts.intent ?? (neg ? 'unsure' : 'homework'), 0.9),
    field('studentName', opts.studentName ?? null, opts.studentName ? 0.9 : 0.2, opts.studentName ? 'proposed' : 'unknown'),
    field('assignmentTitle', opts.assignmentTitle ?? null, opts.assignmentTitle ? 0.8 : 0.3, opts.assignmentTitle ? 'proposed' : 'unknown'),
    field('draftScore', opts.draftScore ?? null, opts.draftScore != null ? 0.7 : 0.3, opts.draftScore != null ? 'proposed' : 'unknown'),
    field('maxScore', opts.maxScore ?? null, 0.5, opts.maxScore != null ? 'proposed' : 'unknown'),
    field('gaps', opts.gaps ?? [], 0.7),
    field('itemCount', opts.itemCount ?? null, 0.6, opts.itemCount != null ? 'proposed' : 'unknown'),
    field('pageCount', opts.pageCount ?? 1, 0.9),
    field('multiStudent', opts.multiStudent ?? false, 0.8),
    field('nameMissing', opts.nameMissing ?? false, 0.8),
    field('reject', opts.reject ?? neg, 0.9),
  ];
  return {
    source_id: id,
    kind: neg ? 'negative' : 'homework',
    document_kind_guess: opts.document_kind_guess ?? (neg ? 'not_student_work' : 'student_work'),
    intent: opts.intent ?? (neg ? 'unsure' : 'homework'),
    negative: neg,
    overall_confidence: opts.overall_confidence ?? 0.85,
    fields,
    roster_hint: opts.roster_hint ?? ROSTER.slice(0, 6),
    warnings: opts.warnings ?? [],
    ambiguities: opts.ambiguities ?? [],
    _eval: opts._eval ?? {},
  };
}

function hwHeader(name, title, period = 'P3') {
  return `<div class="name"><strong>Name:</strong> ${name || '________________'} &nbsp; <strong>Date:</strong> 9/30/2026 &nbsp; <strong>Period:</strong> ${period}</div>
<h1>${title}</h1><div class="meta">Show your work. 2 points each unless noted.</div>`;
}

/** @type {Array<object>} */
const CASES = [
  {
    id: 'H01',
    style: 'classic',
    photo: true,
    notes: 'Clean scan: linear equations, Alex Rivera, 4/5 ~80.',
    html: page(
      'classic',
      `${hwHeader('Alex Rivera', 'Linear Equations Homework')}
<div class="q">1. 3x + 7 = 22 &nbsp; <span class="ans">x = 5</span></div>
<div class="q">2. 5(x − 4) = 15 &nbsp; <span class="ans">x = 7</span></div>
<div class="q">3. −2x + 9 = −3 &nbsp; <span class="ans">x = 6</span></div>
<div class="q">4. (1/2)x + 6 = 10 &nbsp; <span class="ans">x = 8</span></div>
<div class="q">5. 4x − 8 = 2x + 6 &nbsp; <span class="ans">x = 4</span></div>`,
    ),
    expected: expected('H01', {
      studentName: 'Alex Rivera',
      assignmentTitle: 'Linear Equations Homework',
      draftScore: 80,
      itemCount: 5,
      gaps: ['two-step equations'],
    }),
  },
  {
    id: 'H02',
    style: 'modern',
    notes: 'Clean fractions, Jordan Chen, all correct.',
    html: page(
      'modern',
      `${hwHeader('Jordan Chen', 'Fractions Practice')}
<div class="q">1. 1/2 + 1/4 = <span class="ans">3/4</span></div>
<div class="q">2. 2/3 − 1/6 = <span class="ans">1/2</span></div>
<div class="q">3. 3/5 × 2/3 = <span class="ans">2/5</span></div>
<div class="q">4. 4/5 ÷ 2/5 = <span class="ans">2</span></div>`,
    ),
    expected: expected('H02', {
      studentName: 'Jordan Chen',
      assignmentTitle: 'Fractions Practice',
      draftScore: 100,
      itemCount: 4,
      gaps: [],
    }),
  },
  {
    id: 'H03',
    style: 'classic',
    photo: true,
    notes: 'Phone skew/glare candidate: short answers Sam Patel.',
    html: page(
      'classic',
      `${hwHeader('Sam Patel', 'Vocabulary Week 4')}
<div class="q">1. define <em>photosynthesis</em> — <span class="ans">plants make food from light</span></div>
<div class="q">2. define <em>cell</em> — <span class="ans">basic unit of life</span></div>
<div class="q">3. define <em>nucleus</em> — <span class="ans">control center</span></div>`,
    ),
    expected: expected('H03', {
      studentName: 'Sam Patel',
      assignmentTitle: 'Vocabulary Week 4',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
  {
    id: 'H04',
    style: 'hand',
    hand: true,
    photo: true,
    notes: 'Messy handwriting Casey Nguyen; partial credit expected.',
    html: page(
      'hand',
      `${hwHeader('Casey Nguyen', 'Integer Operations')}
<div class="q">1. −3 + 8 = <span class="ans">5</span></div>
<div class="q">2. 4 − (−2) = <span class="ans">6</span></div>
<div class="q">3. (−5)(−3) = <span class="ans">−15</span></div>
<div class="q">4. 12 ÷ (−4) = <span class="ans">−3</span></div>`,
    ),
    expected: expected('H04', {
      studentName: 'Casey Nguyen',
      assignmentTitle: 'Integer Operations',
      draftScore: 75,
      itemCount: 4,
      gaps: ['integer multiplication signs'],
    }),
  },
  {
    id: 'H05',
    style: 'mess',
    photo: true,
    notes: 'Low light / crop style: name at top Riley Brooks, short quiz.',
    html: page(
      'mess',
      `${hwHeader('Riley Brooks', 'Exit Ticket — Slope')}
<div class="q">1. Slope of y = 2x + 1 is <span class="ans">2</span></div>
<div class="q">2. y-intercept is <span class="ans">1</span></div>
<div class="q">3. Parallel to y=2x has slope <span class="ans">2</span></div>`,
    ),
    expected: expected('H05', {
      studentName: 'Riley Brooks',
      assignmentTitle: 'Exit Ticket — Slope',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
];

// MORE_CASES_1
CASES.push(
  {
    id: 'H06',
    style: 'classic',
    notes: 'Missing name blank; work present — nameMissing true.',
    html: page(
      'classic',
      `${hwHeader('', 'Order of Operations')}
<div class="q">1. 3 + 4 × 2 = <span class="ans">11</span></div>
<div class="q">2. (3 + 4) × 2 = <span class="ans">14</span></div>
<div class="q">3. 10 − 6 ÷ 2 = <span class="ans">7</span></div>`,
    ),
    expected: expected('H06', {
      studentName: null,
      nameMissing: true,
      assignmentTitle: 'Order of Operations',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
  {
    id: 'H07',
    style: 'classic',
    photo: true,
    notes: 'Wrong / misspelled name not on roster — still extract as written.',
    html: page(
      'classic',
      `${hwHeader('Alexx Riviera', 'Geometry Basics')}
<div class="q">1. A triangle has <span class="ans">3</span> sides</div>
<div class="q">2. A square has <span class="ans">4</span> right angles</div>
<div class="q">3. Sum of triangle angles <span class="ans">180</span></div>`,
    ),
    expected: expected('H07', {
      studentName: 'Alexx Riviera',
      assignmentTitle: 'Geometry Basics',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
      ambiguities: ['name not exact roster match'],
    }),
  },
  {
    id: 'H08',
    style: 'classic',
    multi_page: true,
    notes: 'Page 1 of multi-page packet (pageCount 2). Morgan Ellis.',
    html: page(
      'classic',
      `${hwHeader('Morgan Ellis', 'Multi-Step Word Problems (page 1 of 2)')}
<div class="q">1. A store sells pencils at $0.25. Maya buys 12. Cost? <span class="ans">$3.00</span></div>
<div class="q">2. She pays with $5. Change? <span class="ans">$2.00</span></div>
<p class="meta">Continued on page 2…</p>`,
    ),
    expected: expected('H08', {
      studentName: 'Morgan Ellis',
      assignmentTitle: 'Multi-Step Word Problems',
      draftScore: 100,
      itemCount: 2,
      pageCount: 2,
      gaps: [],
    }),
  },
  {
    id: 'H09',
    style: 'hand',
    hand: true,
    photo: true,
    notes: 'Two students on one photo (names both visible) — multiStudent.',
    html: page(
      'hand',
      `<div class="name"><strong>Left desk:</strong> Taylor Kim &nbsp; <strong>Right desk:</strong> Jamie Ortiz</div>
<h1>Partner Warm-up</h1>
<div class="q">Taylor: 6 × 7 = <span class="ans">42</span></div>
<div class="q">Jamie: 8 × 9 = <span class="ans">72</span></div>
<div class="q">Together: 42 + 72 = <span class="ans">114</span></div>`,
    ),
    expected: expected('H09', {
      studentName: 'Taylor Kim',
      multiStudent: true,
      assignmentTitle: 'Partner Warm-up',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
      warnings: ['two students visible'],
    }),
  },
  {
    id: 'H10',
    style: 'classic',
    photo: true,
    notes: 'Rotated-ish crop content: short reading response.',
    html: page(
      'classic',
      `${hwHeader('Alex Rivera', 'Reading Response')}
<div class="q">1. Main idea: <span class="ans">The river flooded the town</span></div>
<div class="q">2. Evidence: <span class="ans">water rose overnight</span></div>
<div class="q">3. Theme: <span class="ans">community helps</span></div>`,
    ),
    expected: expected('H10', {
      studentName: 'Alex Rivera',
      assignmentTitle: 'Reading Response',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
  {
    id: 'H11',
    style: 'modern',
    notes: 'Mostly blank answers — low score, gaps on incomplete work.',
    html: page(
      'modern',
      `${hwHeader('Jordan Chen', 'Science Checkpoint')}
<div class="q">1. States of matter: <span class="ans">solid, liquid, ___</span></div>
<div class="q">2. Water freezes at: <span class="ans"></span></div>
<div class="q">3. Boiling point C: <span class="ans"></span></div>
<div class="q">4. Gas particles: <span class="ans">far apart</span></div>`,
    ),
    expected: expected('H11', {
      studentName: 'Jordan Chen',
      assignmentTitle: 'Science Checkpoint',
      draftScore: 40,
      itemCount: 4,
      gaps: ['states of matter completeness'],
    }),
  },
  {
    id: 'H12',
    style: 'hand',
    hand: true,
    notes: 'Heavy scratch-outs handwriting; still student work.',
    html: page(
      'hand',
      `${hwHeader('Sam Patel', 'Solve for x')}
<div class="q">1. x + 5 = 12 &nbsp; <span class="ans">x = 7</span></div>
<div class="q">2. 2x = 18 &nbsp; <span class="ans">x = 9</span> <s>x=8</s></div>
<div class="q">3. x/3 = 4 &nbsp; <span class="ans">x = 12</span></div>`,
    ),
    expected: expected('H12', {
      studentName: 'Sam Patel',
      assignmentTitle: 'Solve for x',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
  {
    id: 'H13',
    style: 'classic',
    photo: true,
    notes: 'Spanish cognates worksheet; Casey Nguyen.',
    html: page(
      'classic',
      `${hwHeader('Casey Nguyen', 'Spanish Cognates')}
<div class="q">1. animal → <span class="ans">animal</span></div>
<div class="q">2. hospital → <span class="ans">hospital</span></div>
<div class="q">3. family → <span class="ans">familia</span></div>
<div class="q">4. color → <span class="ans">color</span></div>`,
    ),
    expected: expected('H13', {
      studentName: 'Casey Nguyen',
      assignmentTitle: 'Spanish Cognates',
      draftScore: 100,
      itemCount: 4,
      gaps: [],
    }),
  },
  {
    id: 'H14',
    style: 'mess',
    photo: true,
    notes: 'Shadows/glare style; partial ambiguous answers.',
    html: page(
      'mess',
      `${hwHeader('Riley Brooks', 'Percent Practice')}
<div class="q">1. 10% of 50 = <span class="ans">5</span></div>
<div class="q">2. 25% of 80 = <span class="ans">20</span></div>
<div class="q">3. 50% of 12 = <span class="ans">?</span></div>`,
    ),
    expected: expected('H14', {
      studentName: 'Riley Brooks',
      assignmentTitle: 'Percent Practice',
      draftScore: 67,
      itemCount: 3,
      gaps: ['percent of a number'],
    }),
  },
  {
    id: 'H15',
    style: 'classic',
    notes: 'First name only on page (Taylor).',
    html: page(
      'classic',
      `${hwHeader('Taylor', 'Music Theory — Notes')}
<div class="q">1. Whole note beats: <span class="ans">4</span></div>
<div class="q">2. Half note beats: <span class="ans">2</span></div>
<div class="q">3. Quarter note beats: <span class="ans">1</span></div>`,
    ),
    expected: expected('H15', {
      studentName: 'Taylor',
      assignmentTitle: 'Music Theory — Notes',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
  {
    id: 'H16',
    style: 'modern',
    photo: true,
    notes: 'Longer ELA short essay response.',
    html: page(
      'modern',
      `${hwHeader('Jamie Ortiz', 'Paragraph Practice')}
<div class="q">Write 3–4 sentences about a helpful neighbor.</div>
<p class="ans">My neighbor Ms. Lee brings extra vegetables from her garden. She waved when I moved in last June. Last week she helped carry boxes up the stairs. I want to thank her with cookies.</p>`,
    ),
    expected: expected('H16', {
      studentName: 'Jamie Ortiz',
      assignmentTitle: 'Paragraph Practice',
      draftScore: 90,
      itemCount: 1,
      gaps: [],
    }),
  },
  {
    id: 'H17',
    style: 'classic',
    notes: 'Wrong assignment title vibe but still homework; history dates.',
    html: page(
      'classic',
      `${hwHeader('Morgan Ellis', 'US History Dates')}
<div class="q">1. Declaration of Independence: <span class="ans">1776</span></div>
<div class="q">2. Constitution signed: <span class="ans">1787</span></div>
<div class="q">3. Louisiana Purchase: <span class="ans">1803</span></div>`,
    ),
    expected: expected('H17', {
      studentName: 'Morgan Ellis',
      assignmentTitle: 'US History Dates',
      draftScore: 100,
      itemCount: 3,
      gaps: [],
    }),
  },
  {
    id: 'N01',
    style: 'classic',
    photo: true,
    notes: 'NEGATIVE: syllabus/weights sheet — must not treat as student homework draft.',
    html: page(
      'classic',
      `<h1>Algebra I — Course Syllabus</h1>
<div class="meta">How your grade is calculated</div>
<div class="q">Tests 50% · Daily 50%</div>
<div class="q">Late: −10% per day</div>
<div class="q">Drop 1 lowest Daily</div>`,
    ),
    expected: expected('N01', {
      negative: true,
      intent: 'syllabus',
      studentName: null,
      draftScore: null,
      gaps: [],
      reject: true,
      document_kind_guess: 'syllabus_policy',
    }),
  },
  {
    id: 'N02',
    style: 'modern',
    notes: 'NEGATIVE: blank ceiling / no paper.',
    html: page(
      'modern',
      `<div style="height:900px;background:#9aa4b2;display:flex;align-items:center;justify-content:center;color:#eef2f7;font-size:28px">[blank wall / ceiling photo]</div>`,
    ),
    expected: expected('N02', {
      negative: true,
      intent: 'unsure',
      studentName: null,
      draftScore: null,
      gaps: [],
      reject: true,
      document_kind_guess: 'not_student_work',
    }),
  },
  {
    id: 'N03',
    style: 'classic',
    photo: true,
    notes: 'NEGATIVE: answer key for teacher — not student work to grade.',
    html: page(
      'classic',
      `<h1>ANSWER KEY — Linear Equations HW</h1>
<div class="meta">Teacher use only</div>
<div class="q">1. x = 5</div>
<div class="q">2. x = 7</div>
<div class="q">3. x = 6</div>
<div class="q">4. x = 8</div>
<div class="q">5. x = 7</div>`,
    ),
    expected: expected('N03', {
      negative: true,
      intent: 'answer_key',
      studentName: null,
      draftScore: null,
      gaps: [],
      reject: true,
      document_kind_guess: 'answer_key',
    }),
  },
);

function main() {
  ensureDir(OUT);
  const manifest = { generated_at: new Date().toISOString(), roster: ROSTER, cases: [] };
  for (const c of CASES) {
    const dir = path.join(OUT, c.id);
    ensureDir(dir);
    write(path.join(dir, 'source.html'), c.html);
    write(path.join(dir, 'expected.json'), JSON.stringify(c.expected, null, 2) + '\n');
    write(
      path.join(dir, 'eval-meta.json'),
      JSON.stringify(
        {
          id: c.id,
          photo: Boolean(c.photo),
          hand: Boolean(c.hand),
          negative: Boolean(c.expected.negative),
          soft_student: true,
          soft_score_tol: 12,
          multi_page: Boolean(c.multi_page),
        },
        null,
        2,
      ) + '\n',
    );
    write(path.join(dir, 'notes.md'), c.notes + '\n');
    manifest.cases.push({
      id: c.id,
      kind: c.expected.kind,
      photo: Boolean(c.photo),
      hand: Boolean(c.hand),
      negative: Boolean(c.expected.negative),
    });
  }
  write(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('wrote', CASES.length, 'cases →', OUT);
}

main();
