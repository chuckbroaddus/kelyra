#!/usr/bin/env node
/**
 * Generate answer-key ingest fixture corpus (HTML + expected.json).
 *   node scripts/gen-anskey-ingest-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/anskey-ingest');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, body);
}

const STYLES = {
  clean: `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:28px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 6px}.meta{color:#555;font-size:12px;margin-bottom:14px}
ol,ul{font-size:14px;line-height:1.55}li{margin:6px 0}.ans{color:#0a0;font-weight:700}
.pts{color:#444;font-size:12px}.note{font-size:12px;color:#333;margin-top:10px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #999;padding:6px 8px}
.bubble{display:inline-block;width:18px;height:18px;border:2px solid #222;border-radius:50%;text-align:center;line-height:14px;margin:0 3px;font-size:11px}
.bubble.filled{background:#111;color:#fff}`,
  hand: `body{font-family:"Segoe Print","Comic Sans MS",cursive;color:#1e293b;margin:0;padding:28px;background:#fffef5;width:800px;box-sizing:border-box}
h1{font-size:22px;margin:0}p,li,td{font-size:15px;line-height:1.5}.ans{color:#1d4ed8;font-weight:700}`,
  bubble: `body{font-family:Courier,monospace;color:#111;margin:0;padding:24px;background:#f8fafc;width:800px;box-sizing:border-box}
h1{font-size:18px}.row{margin:8px 0;font-size:14px}.bubble{display:inline-block;width:16px;height:16px;border:2px solid #000;border-radius:50%;margin:0 4px;vertical-align:middle}
.bubble.on{background:#000}`,
  form: `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:28px;background:#faf8f5;width:800px;box-sizing:border-box}
h1{font-size:20px}p,li{font-size:14px;line-height:1.45}.blank{border-bottom:1px solid #333;display:inline-block;min-width:80px}`,
};

function page(styleKey, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES[styleKey]}</style></head><body>
${bodyHtml}
</body></html>`;
}

function item(n, stem, answer, points = 1, extra = {}) {
  return {
    n,
    stem,
    answer,
    points,
    needsTeacher: extra.needsTeacher === true,
    note: extra.note ?? undefined,
    type: extra.type,
    choices: extra.choices,
  };
}

function expected(id, fields) {
  return {
    source_id: id,
    kind: fields.kind ?? 'answer_key',
    pageState: fields.pageState ?? 'filled',
    header: fields.header ?? null,
    maxScore: fields.maxScore ?? null,
    teacherNote: fields.teacherNote ?? null,
    items: fields.items ?? [],
    reject: fields.reject === true,
    warnings: fields.warnings ?? [],
  };
}

/** @type {Array<object>} */
const CASES = [
  {
    id: 'K01',
    style: 'clean',
    photo: true,
    notes: 'Clean filled MC quiz key, 5 items equal points.',
    fields: ['pageState', 'header', 'items.answer', 'maxScore'],
    html: page(
      'clean',
      `<h1>Quiz 3 — Answer Key</h1>
<div class="meta">Algebra I · Period 2 · 5 points</div>
<ol>
<li>Which is a linear function? <span class="ans">B</span> <span class="pts">(1 pt)</span></li>
<li>Slope of y=2x+1 is <span class="ans">2</span> <span class="pts">(1 pt)</span></li>
<li>y-intercept of y=−x+4 is <span class="ans">4</span> <span class="pts">(1 pt)</span></li>
<li>True/False: parallel lines have equal slopes. <span class="ans">True</span> <span class="pts">(1 pt)</span></li>
<li>Solve 3x=12. <span class="ans">4</span> <span class="pts">(1 pt)</span></li>
</ol>`,
    ),
    expected: expected('K01', {
      pageState: 'filled',
      header: 'Quiz 3 — Answer Key',
      maxScore: 5,
      items: [
        item(1, 'Which is a linear function?', 'B', 1, { type: 'mc' }),
        item(2, 'Slope of y=2x+1 is', '2', 1, { type: 'numeric' }),
        item(3, 'y-intercept of y=−x+4 is', '4', 1, { type: 'numeric' }),
        item(4, 'True/False: parallel lines have equal slopes.', 'True', 1, { type: 'mc' }),
        item(5, 'Solve 3x=12.', '4', 1, { type: 'numeric' }),
      ],
    }),
  },
  {
    id: 'K02',
    style: 'form',
    photo: false,
    notes: 'Blank worksheet — model should SOLVE objective items (pageState blank).',
    fields: ['pageState', 'items.answer', 'needsTeacher'],
    html: page(
      'form',
      `<h1>Warm-up 12</h1>
<div class="meta">Name: ________ Date: ________</div>
<ol>
<li>7 + 8 = <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span></li>
<li>15 − 6 = <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span></li>
<li>4 × 5 = <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span></li>
<li>Write one sentence about your weekend. <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></li>
</ol>
<p class="note">Items 1–3 are facts. Item 4 is open response.</p>`,
    ),
    expected: expected('K02', {
      pageState: 'blank',
      header: 'Warm-up 12',
      maxScore: 4,
      items: [
        item(1, '7 + 8 =', '15', 1, { type: 'numeric' }),
        item(2, '15 − 6 =', '9', 1, { type: 'numeric' }),
        item(3, '4 × 5 =', '20', 1, { type: 'numeric' }),
        item(4, 'Write one sentence about your weekend.', '', 1, {
          needsTeacher: true,
          type: 'short',
        }),
      ],
    }),
  },
  {
    id: 'K03',
    style: 'bubble',
    photo: true,
    notes: 'Bubble-sheet style key with filled bubbles A–D.',
    fields: ['pageState', 'items.answer', 'type'],
    html: page(
      'bubble',
      `<h1>SCIENCE QUIZ KEY — Form A</h1>
<div class="row">1. <span class="bubble"></span>A <span class="bubble on"></span>B <span class="bubble"></span>C <span class="bubble"></span>D</div>
<div class="row">2. <span class="bubble on"></span>A <span class="bubble"></span>B <span class="bubble"></span>C <span class="bubble"></span>D</div>
<div class="row">3. <span class="bubble"></span>A <span class="bubble"></span>B <span class="bubble"></span>C <span class="bubble on"></span>D</div>
<div class="row">4. <span class="bubble"></span>A <span class="bubble on"></span>B <span class="bubble"></span>C <span class="bubble"></span>D</div>
<div class="row">5. <span class="bubble"></span>A <span class="bubble"></span>B <span class="bubble on"></span>C <span class="bubble"></span>D</div>
<div class="row">6. <span class="bubble on"></span>A <span class="bubble"></span>B <span class="bubble"></span>C <span class="bubble"></span>D</div>
<p>Key only — do not score students from this sheet.</p>`,
    ),
    expected: expected('K03', {
      pageState: 'filled',
      header: 'SCIENCE QUIZ KEY — Form A',
      maxScore: 6,
      items: [
        item(1, '1', 'B', 1, { type: 'mc' }),
        item(2, '2', 'A', 1, { type: 'mc' }),
        item(3, '3', 'D', 1, { type: 'mc' }),
        item(4, '4', 'B', 1, { type: 'mc' }),
        item(5, '5', 'C', 1, { type: 'mc' }),
        item(6, '6', 'A', 1, { type: 'mc' }),
      ],
    }),
  },
  {
    id: 'K04',
    style: 'clean',
    photo: false,
    notes: 'Partial-credit notes on multi-point items.',
    fields: ['points', 'note', 'maxScore'],
    html: page(
      'clean',
      `<h1>Chapter 4 Check — KEY</h1>
<ol>
<li>Area of a 3×4 rectangle. <span class="ans">12</span> <span class="pts">(2 pts)</span></li>
<li>Perimeter of same rectangle. <span class="ans">14</span> <span class="pts">(2 pts)</span>
<div class="note">Partial: 1 pt if only length+width without ×2.</div></li>
<li>Explain why units are cm². <span class="ans">needs teacher</span> <span class="pts">(3 pts)</span>
<div class="note">Award 1–3 for reasoning quality.</div></li>
</ol>`,
    ),
    expected: expected('K04', {
      pageState: 'filled',
      header: 'Chapter 4 Check — KEY',
      maxScore: 7,
      items: [
        item(1, 'Area of a 3×4 rectangle.', '12', 2, { type: 'numeric' }),
        item(2, 'Perimeter of same rectangle.', '14', 2, {
          type: 'numeric',
          note: 'Partial: 1 pt if only length+width without ×2.',
        }),
        item(3, 'Explain why units are cm².', '', 3, {
          needsTeacher: true,
          type: 'work',
          note: 'Award 1–3 for reasoning quality.',
        }),
      ],
    }),
  },
  {
    id: 'K05',
    style: 'hand',
    photo: true,
    notes: 'Handwritten filled key (cursive style).',
    fields: ['pageState', 'items.answer'],
    html: page(
      'hand',
      `<h1>HW 8 key (hand)</h1>
<p>1) 9+7 = <span class="ans">16</span></p>
<p>2) 20÷4 = <span class="ans">5</span></p>
<p>3) half of 18 = <span class="ans">9</span></p>
<p>4) 2³ = <span class="ans">8</span></p>`,
    ),
    expected: expected('K05', {
      pageState: 'filled',
      header: 'HW 8 key (hand)',
      maxScore: 4,
      items: [
        item(1, '9+7 =', '16', 1, { type: 'numeric' }),
        item(2, '20÷4 =', '5', 1, { type: 'numeric' }),
        item(3, 'half of 18 =', '9', 1, { type: 'numeric' }),
        item(4, '2³ =', '8', 1, { type: 'numeric' }),
      ],
    }),
  },
  {
    id: 'K06',
    style: 'clean',
    photo: true,
    notes: 'Phone-photo variant (skew/glare via photo.jpg) of short numeric key.',
    fields: ['items.answer', 'photo'],
    html: page(
      'clean',
      `<h1>Exit Ticket KEY</h1>
<ol>
<li>12 × 3 = <span class="ans">36</span></li>
<li>100 − 45 = <span class="ans">55</span></li>
<li>1/2 of 10 = <span class="ans">5</span></li>
</ol>`,
    ),
    expected: expected('K06', {
      pageState: 'filled',
      header: 'Exit Ticket KEY',
      maxScore: 3,
      items: [
        item(1, '12 × 3 =', '36', 1, { type: 'numeric' }),
        item(2, '100 − 45 =', '55', 1, { type: 'numeric' }),
        item(3, '1/2 of 10 =', '5', 1, { type: 'numeric' }),
      ],
    }),
  },
  {
    id: 'K07',
    style: 'clean',
    photo: true,
    notes: 'Low-contrast / dense key — 8 MC letters only.',
    fields: ['items.answer', 'item_count'],
    html: page(
      'clean',
      `<h1>Reading Quiz Key</h1>
<p class="meta">Circle the letter. Answers below.</p>
<table><tr><th>#</th><th>Ans</th><th>#</th><th>Ans</th></tr>
<tr><td>1</td><td class="ans">C</td><td>2</td><td class="ans">A</td></tr>
<tr><td>3</td><td class="ans">D</td><td>4</td><td class="ans">B</td></tr>
<tr><td>5</td><td class="ans">A</td><td>6</td><td class="ans">C</td></tr>
<tr><td>7</td><td class="ans">B</td><td>8</td><td class="ans">D</td></tr></table>`,
    ),
    expected: expected('K07', {
      pageState: 'filled',
      header: 'Reading Quiz Key',
      maxScore: 8,
      items: [1, 2, 3, 4, 5, 6, 7, 8].map((n, i) =>
        item(n, String(n), ['C', 'A', 'D', 'B', 'A', 'C', 'B', 'D'][i], 1, { type: 'mc' }),
      ),
    }),
  },
  {
    id: 'K08',
    style: 'clean',
    photo: false,
    notes: 'Key question count mismatch: header says 10 items, only 4 answers listed.',
    fields: ['item_count', 'warnings', 'no_hallucinate'],
    html: page(
      'clean',
      `<h1>Unit Test Answer Key (10 questions)</h1>
<p class="meta">Teacher copy — answers for Q1–Q4 only on this page. Rest on page 2 (not attached).</p>
<ol>
<li><span class="ans">42</span></li>
<li><span class="ans">B</span></li>
<li><span class="ans">3/4</span></li>
<li><span class="ans">False</span></li>
</ol>
<p class="note">Do not invent Q5–Q10.</p>`,
    ),
    expected: expected('K08', {
      pageState: 'filled',
      header: 'Unit Test Answer Key (10 questions)',
      maxScore: 4,
      teacherNote: 'Only Q1–Q4 on this page',
      items: [
        item(1, '1', '42', 1),
        item(2, '2', 'B', 1, { type: 'mc' }),
        item(3, '3', '3/4', 1),
        item(4, '4', 'False', 1, { type: 'mc' }),
      ],
      warnings: [{ code: 'partial_key', message: 'Fewer answers than stated question count' }],
    }),
    meta: { no_hallucinate_extra_items: true, stated_count: 10 },
  },
  {
    id: 'K09',
    style: 'clean',
    photo: false,
    notes: 'Mixed MC + short + numeric; variable points.',
    fields: ['points', 'type', 'items.answer'],
    html: page(
      'clean',
      `<h1>Mixed Practice KEY</h1>
<ol>
<li>(MC, 1 pt) Capital of France? <span class="ans">A) Paris</span></li>
<li>(num, 2 pts) 6² = <span class="ans">36</span></li>
<li>(short, 2 pts) Antonym of hot: <span class="ans">cold</span></li>
<li>(MC, 1 pt) 2+2? <span class="ans">C) 4</span></li>
</ol>`,
    ),
    expected: expected('K09', {
      pageState: 'filled',
      header: 'Mixed Practice KEY',
      maxScore: 6,
      items: [
        item(1, 'Capital of France?', 'A', 1, { type: 'mc' }),
        item(2, '6² =', '36', 2, { type: 'numeric' }),
        item(3, 'Antonym of hot:', 'cold', 2, { type: 'short' }),
        item(4, '2+2?', 'C', 1, { type: 'mc' }),
      ],
    }),
  },
  {
    id: 'K10',
    style: 'form',
    photo: true,
    notes: 'Ambiguous / partially filled key — some blanks empty, some filled.',
    fields: ['pageState', 'needsTeacher', 'items.answer'],
    html: page(
      'form',
      `<h1>Lab Safety KEY (draft)</h1>
<ol>
<li>Wear goggles? <span class="ans">Yes</span></li>
<li>Eat in lab? <span class="ans">No</span></li>
<li>Spill acid — first step: <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span></li>
<li>Fire exit is on the <span class="ans">left</span></li>
</ol>
<p class="note">Item 3 left blank on teacher key — needsTeacher.</p>`,
    ),
    expected: expected('K10', {
      pageState: 'unsure',
      header: 'Lab Safety KEY (draft)',
      maxScore: 4,
      items: [
        item(1, 'Wear goggles?', 'Yes', 1, { type: 'mc' }),
        item(2, 'Eat in lab?', 'No', 1, { type: 'mc' }),
        item(3, 'Spill acid — first step:', '', 1, { needsTeacher: true, type: 'short' }),
        item(4, 'Fire exit is on the', 'left', 1, { type: 'short' }),
      ],
    }),
    meta: { soft_page_state: true },
  },
  {
    id: 'K11',
    style: 'bubble',
    photo: false,
    notes: 'Long bubble key 12 items.',
    fields: ['item_count', 'items.answer'],
    html: page(
      'bubble',
      `<h1>HISTORY BENCHMARK KEY</h1>
${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  .map((n, i) => {
    const ans = 'ABCD'[i % 4];
    return `<div class="row">${n}. ${'ABCD'
      .split('')
      .map((L) => `<span class="bubble${L === ans ? ' on' : ''}"></span>${L}`)
      .join(' ')}</div>`;
  })
  .join('\n')}`,
    ),
    expected: expected('K11', {
      pageState: 'filled',
      header: 'HISTORY BENCHMARK KEY',
      maxScore: 12,
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n, i) =>
        item(n, String(n), 'ABCD'[i % 4], 1, { type: 'mc' }),
      ),
    }),
  },
  {
    id: 'K12',
    style: 'hand',
    photo: true,
    notes: 'Handwritten partial-credit + work item.',
    fields: ['needsTeacher', 'points', 'note'],
    html: page(
      'hand',
      `<h1>Show-your-work KEY</h1>
<p>1) 15% of 80 = <span class="ans">12</span> (2 pts)</p>
<p>2) Draw a right triangle — <span class="ans">teacher scores diagram</span> (3 pts)</p>
<p>3) 0.5 = <span class="ans">1/2</span> (1 pt)</p>`,
    ),
    expected: expected('K12', {
      pageState: 'filled',
      header: 'Show-your-work KEY',
      maxScore: 6,
      items: [
        item(1, '15% of 80 =', '12', 2, { type: 'numeric' }),
        item(2, 'Draw a right triangle', '', 3, { needsTeacher: true, type: 'work' }),
        item(3, '0.5 =', '1/2', 1, { type: 'numeric' }),
      ],
    }),
  },
  {
    id: 'K13',
    style: 'clean',
    photo: false,
    notes: 'True/False only key.',
    fields: ['items.answer', 'type'],
    html: page(
      'clean',
      `<h1>Earth Science T/F Key</h1>
<ol>
<li>Earth orbits the Sun. <span class="ans">T</span></li>
<li>The Moon is a planet. <span class="ans">F</span></li>
<li>Water freezes at 0°C. <span class="ans">T</span></li>
<li>Sound travels faster in vacuum. <span class="ans">F</span></li>
<li>Metals conduct electricity. <span class="ans">T</span></li>
</ol>`,
    ),
    expected: expected('K13', {
      pageState: 'filled',
      header: 'Earth Science T/F Key',
      maxScore: 5,
      items: [
        item(1, 'Earth orbits the Sun.', 'T', 1, { type: 'mc' }),
        item(2, 'The Moon is a planet.', 'F', 1, { type: 'mc' }),
        item(3, 'Water freezes at 0°C.', 'T', 1, { type: 'mc' }),
        item(4, 'Sound travels faster in vacuum.', 'F', 1, { type: 'mc' }),
        item(5, 'Metals conduct electricity.', 'T', 1, { type: 'mc' }),
      ],
    }),
  },
  {
    id: 'K14',
    style: 'form',
    photo: false,
    notes: 'All open-response — every item needsTeacher, empty answers.',
    fields: ['needsTeacher', 'no_hallucinate'],
    html: page(
      'form',
      `<h1>Reflection Journal Rubric Key</h1>
<ol>
<li>Describe a challenge you faced this week. <span class="blank"></span></li>
<li>What will you try differently? <span class="blank"></span></li>
<li>How did a classmate help you? <span class="blank"></span></li>
</ol>
<p class="note">No single correct answer — teacher grades holistically.</p>`,
    ),
    expected: expected('K14', {
      pageState: 'blank',
      header: 'Reflection Journal Rubric Key',
      maxScore: 3,
      items: [
        item(1, 'Describe a challenge you faced this week.', '', 1, {
          needsTeacher: true,
          type: 'work',
        }),
        item(2, 'What will you try differently?', '', 1, { needsTeacher: true, type: 'work' }),
        item(3, 'How did a classmate help you?', '', 1, { needsTeacher: true, type: 'work' }),
      ],
    }),
    meta: { no_hallucinate_answers: true },
  },
  {
    id: 'K15',
    style: 'clean',
    photo: true,
    notes: 'Fraction/decimal answers — normalize carefully.',
    fields: ['items.answer'],
    html: page(
      'clean',
      `<h1>Fractions Mini-Key</h1>
<ol>
<li>1/2 + 1/4 = <span class="ans">3/4</span></li>
<li>0.25 as fraction = <span class="ans">1/4</span></li>
<li>2/3 of 9 = <span class="ans">6</span></li>
</ol>`,
    ),
    expected: expected('K15', {
      pageState: 'filled',
      header: 'Fractions Mini-Key',
      maxScore: 3,
      items: [
        item(1, '1/2 + 1/4 =', '3/4', 1, { type: 'numeric' }),
        item(2, '0.25 as fraction =', '1/4', 1, { type: 'numeric' }),
        item(3, '2/3 of 9 =', '6', 1, { type: 'numeric' }),
      ],
    }),
  },
  {
    id: 'K16',
    style: 'clean',
    photo: false,
    notes: 'Word-bank style filled key.',
    fields: ['items.answer'],
    html: page(
      'clean',
      `<h1>Cell Biology Word Bank KEY</h1>
<p class="meta">Bank: nucleus · membrane · mitochondria · cytoplasm</p>
<ol>
<li>Control center of the cell: <span class="ans">nucleus</span></li>
<li>Powerhouse of the cell: <span class="ans">mitochondria</span></li>
<li>Outer boundary: <span class="ans">membrane</span></li>
<li>Jelly-like interior: <span class="ans">cytoplasm</span></li>
</ol>`,
    ),
    expected: expected('K16', {
      pageState: 'filled',
      header: 'Cell Biology Word Bank KEY',
      maxScore: 4,
      items: [
        item(1, 'Control center of the cell:', 'nucleus', 1, { type: 'short' }),
        item(2, 'Powerhouse of the cell:', 'mitochondria', 1, { type: 'short' }),
        item(3, 'Outer boundary:', 'membrane', 1, { type: 'short' }),
        item(4, 'Jelly-like interior:', 'cytoplasm', 1, { type: 'short' }),
      ],
    }),
  },
  {
    id: 'K17',
    style: 'clean',
    photo: true,
    notes: 'Spanish vocab key — short strings.',
    fields: ['items.answer', 'header'],
    html: page(
      'clean',
      `<h1>Spanish 1 — Vocab Quiz KEY</h1>
<ol>
<li>hello → <span class="ans">hola</span></li>
<li>goodbye → <span class="ans">adiós</span></li>
<li>please → <span class="ans">por favor</span></li>
<li>thank you → <span class="ans">gracias</span></li>
</ol>`,
    ),
    expected: expected('K17', {
      pageState: 'filled',
      header: 'Spanish 1 — Vocab Quiz KEY',
      maxScore: 4,
      items: [
        item(1, 'hello →', 'hola', 1, { type: 'short' }),
        item(2, 'goodbye →', 'adiós', 1, { type: 'short' }),
        item(3, 'please →', 'por favor', 1, { type: 'short' }),
        item(4, 'thank you →', 'gracias', 1, { type: 'short' }),
      ],
    }),
  },
  {
    id: 'N01',
    style: 'form',
    photo: true,
    notes: 'NEGATIVE: student homework with name — must reject/empty, not invent key.',
    fields: ['reject', 'negative'],
    kind: 'negative',
    html: page(
      'form',
      `<h1>Homework 5</h1>
<div class="meta">Student: Alex Rivera · Class: Algebra I</div>
<ol>
<li>2x+1=5 → x= <span class="blank">2</span> (student work)</li>
<li>Area notes scribbled…</li>
</ol>
<p>Not an answer key. Graded student packet.</p>`,
    ),
    expected: expected('N01', {
      kind: 'negative',
      pageState: 'unsure',
      header: null,
      maxScore: null,
      items: [],
      reject: true,
      warnings: [{ code: 'not_answer_key', message: 'Looks like student work' }],
    }),
    meta: { negative: true },
  },
  {
    id: 'N02',
    style: 'clean',
    photo: false,
    notes: 'NEGATIVE: syllabus weights — wrong document type.',
    fields: ['reject', 'negative'],
    kind: 'negative',
    html: page(
      'clean',
      `<h1>Course Syllabus — Biology</h1>
<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td>40%</td></tr>
<tr><td>Labs</td><td>30%</td></tr>
<tr><td>Homework</td><td>30%</td></tr></table>
<p>Late work −10% per day.</p>`,
    ),
    expected: expected('N02', {
      kind: 'negative',
      pageState: 'unsure',
      header: null,
      maxScore: null,
      items: [],
      reject: true,
      warnings: [{ code: 'not_answer_key', message: 'Syllabus / grading policy' }],
    }),
    meta: { negative: true },
  },
  {
    id: 'N03',
    style: 'clean',
    photo: true,
    notes: 'NEGATIVE: roster list — wrong document type.',
    fields: ['reject', 'negative'],
    kind: 'negative',
    html: page(
      'clean',
      `<h1>Period 3 Roster</h1>
<table><tr><th>#</th><th>Student</th></tr>
<tr><td>1</td><td>Jordan Lee</td></tr>
<tr><td>2</td><td>Sam Patel</td></tr>
<tr><td>3</td><td>Casey Nguyen</td></tr>
</table>
<p>Synthetic names only — not an answer key.</p>`,
    ),
    expected: expected('N03', {
      kind: 'negative',
      pageState: 'unsure',
      header: null,
      maxScore: null,
      items: [],
      reject: true,
      warnings: [{ code: 'not_answer_key', message: 'Roster' }],
    }),
    meta: { negative: true },
  },
];

function main() {
  ensureDir(OUT);
  const manifest = { generated_at: new Date().toISOString(), count: 0, cases: [] };
  for (const c of CASES) {
    const dir = path.join(OUT, c.id);
    ensureDir(dir);
    write(path.join(dir, 'source.html'), c.html);
    write(path.join(dir, 'expected.json'), JSON.stringify(c.expected, null, 2) + '\n');
    write(
      path.join(dir, 'notes.md'),
      `# ${c.id}\n\n${c.notes}\n\nFields: ${(c.fields || []).join(', ')}\n`,
    );
    const meta = {
      ...(c.meta || {}),
      photo: Boolean(c.photo),
      kind: c.kind || (c.expected.reject ? 'negative' : 'answer_key'),
      negative: Boolean(c.meta?.negative || c.expected.reject),
    };
    write(path.join(dir, 'eval-meta.json'), JSON.stringify(meta, null, 2) + '\n');
    manifest.cases.push({
      id: c.id,
      kind: meta.kind,
      photo: meta.photo,
      negative: meta.negative,
      fields_exercised: c.fields || [],
      files: ['expected.json', 'notes.md', 'source.html', 'eval-meta.json'],
    });
  }
  manifest.count = manifest.cases.length;
  write(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('wrote', manifest.count, 'cases ->', OUT);
}

main();
