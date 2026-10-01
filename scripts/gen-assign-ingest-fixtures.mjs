#!/usr/bin/env node
/**
 * Generate assign + lesson-materials ingest fixture corpus (HTML + expected.json).
 * Pattern copied from gen-gradebook-ingest-fixtures.mjs — do not modify gradebook eval.
 *
 *   node scripts/gen-assign-ingest-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/assign-ingest');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, body);
}

const STYLES = {
  classic: `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:28px;background:#faf8f5;width:800px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:14px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
.meta{color:#555;font-size:12px;margin-bottom:12px}ol,ul{font-size:14px;line-height:1.55}
.blank{border-bottom:1px solid #333;display:inline-block;min-width:48px;height:1em}
.pts{float:right;color:#666;font-size:12px}.dir{font-size:13px;color:#333;margin:8px 0}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}td,th{border:1px solid #999;padding:6px 8px}th{background:#eee}
.hand{font-family:"Segoe Print","Comic Sans MS",cursive}`,
  modern: `body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:24px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:18px;color:#1e3a8a;margin:0}.meta{color:#64748b;font-size:12px;margin:6px 0 12px}
ol{font-size:14px;line-height:1.5}.blank{border-bottom:1px solid #334155;display:inline-block;min-width:56px}
.pts{color:#64748b;font-size:11px;margin-left:8px}h2{font-size:14px;margin:12px 0 6px;color:#334155}
.choice{margin:2px 0 2px 8px;font-size:13px}`,
  hand: `body{font-family:"Segoe Print","Comic Sans MS",cursive;color:#1e293b;margin:0;padding:28px;background:#fffef5;width:800px;box-sizing:border-box}
h1{font-size:22px;margin:0}p,li{font-size:15px;line-height:1.55}.blank{border-bottom:1px solid #475569;min-width:60px;display:inline-block}`,
  plan: `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:28px;background:#f8fafc;width:800px;box-sizing:border-box}
h1{font-size:18px;margin:0}.meta{font-size:12px;color:#475569;margin:6px 0 14px}
.box{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:10px 0;background:#fff}
h2{font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#334155;margin:0 0 6px}
li,p{font-size:13px;line-height:1.45}`,
};

function page(styleKey, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES[styleKey]}</style></head><body>
${bodyHtml}
</body></html>`;
}

function item(n, stem, answer, opts = {}) {
  return {
    n,
    stem,
    answer: answer ?? '',
    points: opts.points ?? 1,
    type: opts.type,
    needsTeacher: Boolean(opts.needsTeacher),
    choices: opts.choices,
    note: opts.note,
  };
}

function expectedKey(id, fields) {
  return {
    source_id: id,
    kind: 'assignment_key',
    pageState: fields.pageState ?? 'blank',
    header: fields.header ?? null,
    category: fields.category ?? null,
    maxScore: fields.maxScore ?? null,
    due: fields.due ?? null,
    standards: fields.standards ?? [],
    items: fields.items ?? [],
    sections: fields.sections ?? [],
    teacherNote: fields.teacherNote ?? null,
    reject: false,
    document_kind_guess: fields.document_kind_guess ?? 'worksheet',
    _eval: fields._eval ?? {},
  };
}

function expectedLesson(id, kind, header, extras = {}) {
  return {
    source_id: id,
    kind,
    intent: kind,
    header,
    reject: false,
    document_kind_guess: kind,
    ...extras,
  };
}

function expectedNeg(id, reason, extras = {}) {
  return {
    source_id: id,
    kind: 'negative',
    reject: true,
    reject_reason: reason,
    pageState: 'unsure',
    header: extras.header ?? null,
    items: [],
    maxScore: null,
    document_kind_guess: extras.document_kind_guess ?? 'unknown',
    intent_not: extras.intent_not ?? ['answer_key'],
    _eval: { negative: true, ...(extras._eval || {}) },
  };
}

/** @type {Array<object>} */
const CASES = [
  {
    id: 'A01',
    kind: 'assignment_key',
    style: 'classic',
    photo: true,
    fields: ['header', 'items', 'maxScore', 'pageState'],
    notes: 'Clean blank math worksheet — 5 numeric facts. pageState blank; model must SOLVE.',
    html: page(
      'classic',
      `<h1>Math Facts Warm-Up</h1>
<div class="meta">Ms. Hale · Period 2 · Name ________ · Date ________</div>
<p class="dir">Fill in each blank. 1 point each.</p>
<ol>
<li>7 + 8 = <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>12 − 5 = <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>6 × 4 = <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>36 ÷ 6 = <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>9 + 11 = <span class="blank"></span> <span class="pts">1 pt</span></li>
</ol>`,
    ),
    expected: expectedKey('A01', {
      pageState: 'blank',
      header: 'Math Facts Warm-Up',
      category: 'homework',
      maxScore: 5,
      document_kind_guess: 'worksheet',
      items: [
        item(1, '7 + 8 =', '15', { type: 'numeric' }),
        item(2, '12 − 5 =', '7', { type: 'numeric' }),
        item(3, '6 × 4 =', '24', { type: 'numeric' }),
        item(4, '36 ÷ 6 =', '6', { type: 'numeric' }),
        item(5, '9 + 11 =', '20', { type: 'numeric' }),
      ],
    }),
  },
  {
    id: 'A02',
    kind: 'assignment_key',
    style: 'modern',
    photo: true,
    fields: ['header', 'items', 'choices', 'pageState'],
    notes: 'Blank MC quiz — 4 choices. pageState blank; answers are letters.',
    html: page(
      'modern',
      `<h1>Life Science Quiz — Cells</h1>
<div class="meta">Quiz · 10 points · Circle the best answer</div>
<ol>
<li>The control center of the cell is the <span class="pts">2 pts</span>
<div class="choice">A. cell wall &nbsp; B. nucleus &nbsp; C. vacuole &nbsp; D. ribosome</div></li>
<li>Plant cells have a rigid <span class="pts">2 pts</span>
<div class="choice">A. nucleus &nbsp; B. cytoplasm &nbsp; C. cell wall &nbsp; D. lysosome</div></li>
<li>Energy is released in the <span class="pts">3 pts</span>
<div class="choice">A. mitochondria &nbsp; B. Golgi &nbsp; C. chloroplast only &nbsp; D. nucleus</div></li>
<li>Photosynthesis occurs mainly in the <span class="pts">3 pts</span>
<div class="choice">A. root hair &nbsp; B. chloroplast &nbsp; C. mitochondria &nbsp; D. vacuole</div></li>
</ol>`,
    ),
    expected: expectedKey('A02', {
      pageState: 'blank',
      header: 'Life Science Quiz — Cells',
      category: 'quiz',
      maxScore: 10,
      document_kind_guess: 'quiz',
      items: [
        item(1, 'The control center of the cell is the', 'B', {
          type: 'mc',
          points: 2,
          choices: ['A', 'B', 'C', 'D'],
        }),
        item(2, 'Plant cells have a rigid', 'C', {
          type: 'mc',
          points: 2,
          choices: ['A', 'B', 'C', 'D'],
        }),
        item(3, 'Energy is released in the', 'A', {
          type: 'mc',
          points: 3,
          choices: ['A', 'B', 'C', 'D'],
        }),
        item(4, 'Photosynthesis occurs mainly in the', 'B', {
          type: 'mc',
          points: 3,
          choices: ['A', 'B', 'C', 'D'],
        }),
      ],
    }),
  },
  {
    id: 'A03',
    kind: 'assignment_key',
    style: 'classic',
    photo: false,
    fields: ['header', 'items', 'sections', 'maxScore'],
    notes: 'Multi-section test: Part A MC + Part B short. Mixed types; short needsTeacher.',
    html: page(
      'classic',
      `<h1>Unit 4 Test — Fractions</h1>
<div class="meta">Algebra Readiness · 20 points · Name ________</div>
<h2>Part A — Multiple choice (8 pts)</h2>
<ol>
<li>Which equals 1/2? &nbsp; A. 2/8 &nbsp; B. 3/6 &nbsp; C. 4/10 &nbsp; D. 5/12 <span class="pts">2 pts</span></li>
<li>3/4 + 1/4 = &nbsp; A. 1/2 &nbsp; B. 1 &nbsp; C. 4/8 &nbsp; D. 2 <span class="pts">2 pts</span></li>
<li>Simplify 6/9. &nbsp; A. 3/9 &nbsp; B. 2/3 &nbsp; C. 1/3 &nbsp; D. 6/3 <span class="pts">2 pts</span></li>
<li>1/5 of 20 is &nbsp; A. 4 &nbsp; B. 5 &nbsp; C. 15 &nbsp; D. 25 <span class="pts">2 pts</span></li>
</ol>
<h2>Part B — Show your work (12 pts)</h2>
<ol start="5">
<li>Explain how to add 1/3 + 1/6. Write two sentences. <span class="pts">6 pts</span>
<p>________________________________________________________________</p>
<p>________________________________________________________________</p></li>
<li>Draw a model of 3/4. <span class="pts">6 pts</span>
<p style="height:80px;border:1px dashed #999"></p></li>
</ol>`,
    ),
    expected: expectedKey('A03', {
      pageState: 'blank',
      header: 'Unit 4 Test — Fractions',
      category: 'test',
      maxScore: 20,
      document_kind_guess: 'test',
      sections: [
        { id: 'A', title: 'Part A — Multiple choice', itemNs: [1, 2, 3, 4] },
        { id: 'B', title: 'Part B — Show your work', itemNs: [5, 6] },
      ],
      items: [
        item(1, 'Which equals 1/2?', 'B', { type: 'mc', points: 2 }),
        item(2, '3/4 + 1/4 =', 'B', { type: 'mc', points: 2 }),
        item(3, 'Simplify 6/9.', 'B', { type: 'mc', points: 2 }),
        item(4, '1/5 of 20 is', 'A', { type: 'mc', points: 2 }),
        item(5, 'Explain how to add 1/3 + 1/6. Write two sentences.', '', {
          type: 'short',
          points: 6,
          needsTeacher: true,
        }),
        item(6, 'Draw a model of 3/4.', '', { type: 'work', points: 6, needsTeacher: true }),
      ],
    }),
  },
  {
    id: 'A04',
    kind: 'assignment_key',
    style: 'classic',
    photo: true,
    fields: ['pageState', 'items', 'header'],
    notes: 'FILLED teacher key — circled answers already written. pageState filled; EXTRACT not re-solve.',
    html: page(
      'classic',
      `<h1>ANSWER KEY — Decimal Practice</h1>
<div class="meta">Teacher copy · filled</div>
<ol>
<li>0.5 + 0.25 = <strong>0.75</strong> <span class="pts">1 pt</span></li>
<li>1.2 × 3 = <strong>3.6</strong> <span class="pts">1 pt</span></li>
<li>Round 4.678 to tenths: <strong>4.7</strong> <span class="pts">2 pts</span></li>
<li>Which is larger? 0.09 or 0.1 → <strong>0.1</strong> <span class="pts">1 pt</span></li>
</ol>`,
    ),
    expected: expectedKey('A04', {
      pageState: 'filled',
      header: 'ANSWER KEY — Decimal Practice',
      category: 'homework',
      maxScore: 5,
      document_kind_guess: 'answer_key',
      items: [
        item(1, '0.5 + 0.25 =', '0.75', { type: 'numeric', points: 1 }),
        item(2, '1.2 × 3 =', '3.6', { type: 'numeric', points: 1 }),
        item(3, 'Round 4.678 to tenths:', '4.7', { type: 'numeric', points: 2 }),
        item(4, 'Which is larger? 0.09 or 0.1 →', '0.1', { type: 'short', points: 1 }),
      ],
    }),
  },
  {
    id: 'A05',
    kind: 'assignment_key',
    style: 'hand',
    photo: true,
    fields: ['items', 'pageState', 'header'],
    notes: 'Handwritten-style blank worksheet (cursive CSS). 3 numeric + 1 short.',
    html: page(
      'hand',
      `<h1>Friday Check — Place Value</h1>
<p>Name: ____________ &nbsp; Date: ________</p>
<ol>
<li>What is the value of 7 in 3,752? ________</li>
<li>Write 405 in expanded form: ________</li>
<li>10 tens = ________ ones</li>
<li>Explain why 399 is less than 401: ________________________________</li>
</ol>`,
    ),
    expected: expectedKey('A05', {
      pageState: 'blank',
      header: 'Friday Check — Place Value',
      category: 'quiz',
      maxScore: 4,
      document_kind_guess: 'worksheet',
      items: [
        item(1, 'What is the value of 7 in 3,752?', '700', { type: 'numeric' }),
        item(2, 'Write 405 in expanded form:', '400+5', { type: 'short' }),
        item(3, '10 tens = ________ ones', '100', { type: 'numeric' }),
        item(4, 'Explain why 399 is less than 401:', '', {
          type: 'short',
          needsTeacher: true,
        }),
      ],
      _eval: { handwriting: true },
    }),
  },
  {
    id: 'A06',
    kind: 'assignment_key',
    style: 'modern',
    photo: true,
    fields: ['header', 'due', 'standards', 'items'],
    notes: 'Header with due date + TEKS standards line. Soft-match due/standards.',
    html: page(
      'modern',
      `<h1>Homework 12 — Ratios</h1>
<div class="meta">Due: Friday, October 10, 2026 &nbsp;·&nbsp; TEKS 6.4B, 6.5A &nbsp;·&nbsp; 8 points</div>
<ol>
<li>Simplify the ratio 12:18 → <span class="blank"></span> <span class="pts">2 pts</span></li>
<li>If 3 apples cost $2, 6 apples cost $<span class="blank"></span> <span class="pts">2 pts</span></li>
<li>Write 5/20 as a unit rate (per 1): <span class="blank"></span> <span class="pts">2 pts</span></li>
<li>True or false: 2:3 = 4:6 &nbsp; <span class="blank"></span> <span class="pts">2 pts</span></li>
</ol>`,
    ),
    expected: expectedKey('A06', {
      pageState: 'blank',
      header: 'Homework 12 — Ratios',
      category: 'homework',
      due: '2026-10-10',
      standards: ['TEKS 6.4B', 'TEKS 6.5A'],
      maxScore: 8,
      document_kind_guess: 'worksheet',
      items: [
        item(1, 'Simplify the ratio 12:18 →', '2:3', { type: 'short', points: 2 }),
        item(2, 'If 3 apples cost $2, 6 apples cost $', '4', { type: 'numeric', points: 2 }),
        item(3, 'Write 5/20 as a unit rate (per 1):', '1/4', { type: 'short', points: 2 }),
        item(4, 'True or false: 2:3 = 4:6', 'true', { type: 'mc', points: 2 }),
      ],
      _eval: { soft_due: true, soft_standards: true },
    }),
  },
  {
    id: 'A07',
    kind: 'assignment_key',
    style: 'classic',
    photo: false,
    fields: ['items', 'maxScore'],
    notes: 'Printed point values uneven (1,1,3,5). maxScore must sum printed pts.',
    html: page(
      'classic',
      `<h1>Skill Check — Integers</h1>
<ol>
<li>−3 + 5 = <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>|−8| = <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>−2 × −6 = <span class="blank"></span> <span class="pts">3 pts</span></li>
<li>Order from least to greatest: 0, −4, 2, −1 → <span class="blank"></span> <span class="pts">5 pts</span></li>
</ol>`,
    ),
    expected: expectedKey('A07', {
      pageState: 'blank',
      header: 'Skill Check — Integers',
      category: 'quiz',
      maxScore: 10,
      document_kind_guess: 'worksheet',
      items: [
        item(1, '−3 + 5 =', '2', { type: 'numeric', points: 1 }),
        item(2, '|−8| =', '8', { type: 'numeric', points: 1 }),
        item(3, '−2 × −6 =', '12', { type: 'numeric', points: 3 }),
        item(4, 'Order from least to greatest: 0, −4, 2, −1 →', '-4, -1, 0, 2', {
          type: 'short',
          points: 5,
        }),
      ],
    }),
  },
  {
    id: 'A08',
    kind: 'assignment_key',
    style: 'modern',
    photo: true,
    fields: ['items', 'pageState'],
    notes: 'Teacher-annotated copy: some answers circled in ink + margin notes. filled extract.',
    html: page(
      'modern',
      `<h1>Exit Ticket — Photosynthesis (KEY)</h1>
<div class="meta">Teacher annotated · Period 4</div>
<ol>
<li>Gas plants take in: <strong style="color:#b91c1c">carbon dioxide / CO2</strong> ✓</li>
<li>Gas plants release: <strong style="color:#b91c1c">oxygen / O2</strong> ✓</li>
<li>Energy source: <strong style="color:#b91c1c">sunlight</strong></li>
<li>Where in the cell? <strong style="color:#b91c1c">chloroplast</strong> <em style="color:#64748b">— remind class chlorophyll ≠ organelle</em></li>
</ol>`,
    ),
    expected: expectedKey('A08', {
      pageState: 'filled',
      header: 'Exit Ticket — Photosynthesis (KEY)',
      category: 'quiz',
      maxScore: 4,
      document_kind_guess: 'answer_key',
      items: [
        item(1, 'Gas plants take in:', 'carbon dioxide', { type: 'short' }),
        item(2, 'Gas plants release:', 'oxygen', { type: 'short' }),
        item(3, 'Energy source:', 'sunlight', { type: 'short' }),
        item(4, 'Where in the cell?', 'chloroplast', { type: 'short' }),
      ],
      teacherNote: 'remind class chlorophyll ≠ organelle',
      _eval: { soft_answers: true },
    }),
  },
  {
    id: 'A09',
    kind: 'assignment_key',
    style: 'classic',
    photo: false,
    fields: ['items', 'header'],
    notes: 'Word-bank matching style — answers are bank words.',
    html: page(
      'classic',
      `<h1>Vocabulary Match — Government</h1>
<div class="meta">Word bank: republic · federalism · amendment · veto · bicameral</div>
<ol>
<li>Two-house legislature: <span class="blank"></span></li>
<li>Power split between national and state: <span class="blank"></span></li>
<li>Change to the Constitution: <span class="blank"></span></li>
<li>President rejects a bill: <span class="blank"></span></li>
<li>Citizens elect representatives: <span class="blank"></span></li>
</ol>`,
    ),
    expected: expectedKey('A09', {
      pageState: 'blank',
      header: 'Vocabulary Match — Government',
      category: 'homework',
      maxScore: 5,
      document_kind_guess: 'worksheet',
      items: [
        item(1, 'Two-house legislature:', 'bicameral', { type: 'short' }),
        item(2, 'Power split between national and state:', 'federalism', { type: 'short' }),
        item(3, 'Change to the Constitution:', 'amendment', { type: 'short' }),
        item(4, 'President rejects a bill:', 'veto', { type: 'short' }),
        item(5, 'Citizens elect representatives:', 'republic', { type: 'short' }),
      ],
    }),
  },
  {
    id: 'A10',
    kind: 'assignment_key',
    style: 'classic',
    photo: true,
    fields: ['items', 'pageState'],
    notes: 'Partial/ambiguous: only 2 clear blanks; rest instructions. Do not invent items 3–10.',
    html: page(
      'classic',
      `<h1>Reading Response (partial page)</h1>
<div class="meta">Use your novel. Some lines cut off at the photo edge.</div>
<ol>
<li>Protagonist name: <span class="blank"></span></li>
<li>Setting (place): <span class="blank"></span></li>
</ol>
<p class="dir">Continue on the back for questions 3–8 (not visible on this photo).</p>
<p style="color:#999;font-size:11px">[page edge / glare strip]</p>`,
    ),
    expected: expectedKey('A10', {
      pageState: 'blank',
      header: 'Reading Response (partial page)',
      category: 'homework',
      maxScore: 2,
      document_kind_guess: 'worksheet',
      items: [
        item(1, 'Protagonist name:', '', { type: 'short', needsTeacher: true }),
        item(2, 'Setting (place):', '', { type: 'short', needsTeacher: true }),
      ],
      _eval: { no_invent_extra_items: true, max_items: 3 },
    }),
  },
  {
    id: 'A11',
    kind: 'assignment_key',
    style: 'modern',
    photo: false,
    fields: ['items', 'type'],
    notes: 'True/False + short numeric mix.',
    html: page(
      'modern',
      `<h1>Warm-Up — Forces</h1>
<ol>
<li>T/F: Friction always slows motion. <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>T/F: Mass and weight are the same. <span class="blank"></span> <span class="pts">1 pt</span></li>
<li>A 2 kg object accelerates at 3 m/s². Net force = <span class="blank"></span> N <span class="pts">3 pts</span></li>
<li>Unit of force: <span class="blank"></span> <span class="pts">1 pt</span></li>
</ol>`,
    ),
    expected: expectedKey('A11', {
      pageState: 'blank',
      header: 'Warm-Up — Forces',
      category: 'homework',
      maxScore: 6,
      document_kind_guess: 'worksheet',
      items: [
        item(1, 'T/F: Friction always slows motion.', 'true', { type: 'mc', points: 1 }),
        item(2, 'T/F: Mass and weight are the same.', 'false', { type: 'mc', points: 1 }),
        item(3, 'A 2 kg object accelerates at 3 m/s². Net force =', '6', {
          type: 'numeric',
          points: 3,
        }),
        item(4, 'Unit of force:', 'newton', { type: 'short', points: 1 }),
      ],
      _eval: { soft_answers: true },
    }),
  },
  {
    id: 'A12',
    kind: 'assignment_key',
    style: 'classic',
    photo: true,
    fields: ['items', 'sections'],
    notes: 'Two-page conceptual single HTML with Section I and II numbering restart risk — keep global n.',
    html: page(
      'classic',
      `<h1>Chapter Quiz — Ecosystems</h1>
<div class="meta">Sections I–II · 12 points total</div>
<h2>Section I</h2>
<ol>
<li>A living thing in a habitat is a(n) <span class="blank"></span>. <span class="pts">2 pts</span></li>
<li>All biotic + abiotic factors together make a(n) <span class="blank"></span>. <span class="pts">2 pts</span></li>
<li>Producers make food using <span class="blank"></span>. <span class="pts">2 pts</span></li>
</ol>
<h2>Section II</h2>
<ol start="4">
<li>Primary consumers eat <span class="blank"></span>. <span class="pts">2 pts</span></li>
<li>T/F: Energy pyramids are widest at the top. <span class="blank"></span> <span class="pts">2 pts</span></li>
<li>Name one decomposer: <span class="blank"></span> <span class="pts">2 pts</span></li>
</ol>`,
    ),
    expected: expectedKey('A12', {
      pageState: 'blank',
      header: 'Chapter Quiz — Ecosystems',
      category: 'quiz',
      maxScore: 12,
      document_kind_guess: 'quiz',
      sections: [
        { id: 'I', title: 'Section I', itemNs: [1, 2, 3] },
        { id: 'II', title: 'Section II', itemNs: [4, 5, 6] },
      ],
      items: [
        item(1, 'A living thing in a habitat is a(n)', 'organism', { type: 'short', points: 2 }),
        item(2, 'All biotic + abiotic factors together make a(n)', 'ecosystem', {
          type: 'short',
          points: 2,
        }),
        item(3, 'Producers make food using', 'sunlight', { type: 'short', points: 2 }),
        item(4, 'Primary consumers eat', 'producers', { type: 'short', points: 2 }),
        item(5, 'T/F: Energy pyramids are widest at the top.', 'false', {
          type: 'mc',
          points: 2,
        }),
        item(6, 'Name one decomposer:', 'fungus', {
          type: 'short',
          points: 2,
          needsTeacher: true,
        }),
      ],
      _eval: { soft_answers: true },
    }),
  },
  {
    id: 'A13',
    kind: 'assignment_key',
    style: 'hand',
    photo: true,
    fields: ['items', 'pageState'],
    notes: 'Low-light / glare photo path (photo.jpg). Sparse 3-item key.',
    html: page(
      'hand',
      `<h1>Mini Quiz</h1>
<ol>
<li>2³ = ______</li>
<li>√49 = ______</li>
<li>5² − 4² = ______</li>
</ol>`,
    ),
    expected: expectedKey('A13', {
      pageState: 'blank',
      header: 'Mini Quiz',
      category: 'quiz',
      maxScore: 3,
      document_kind_guess: 'quiz',
      items: [
        item(1, '2³ =', '8', { type: 'numeric' }),
        item(2, '√49 =', '7', { type: 'numeric' }),
        item(3, '5² − 4² =', '9', { type: 'numeric' }),
      ],
      _eval: { photo_hard: true },
    }),
  },
  {
    id: 'A14',
    kind: 'assignment_key',
    style: 'classic',
    photo: false,
    fields: ['items', 'needsTeacher'],
    notes: 'Open response essay prompt only — all needsTeacher; no invented objective keys.',
    html: page(
      'classic',
      `<h1>Essay Prompt — Character Change</h1>
<div class="meta">20 points · Constructed response</div>
<ol>
<li>In two paragraphs, describe how the main character changes from chapter 1 to chapter 8. Use two text details. <span class="pts">20 pts</span>
<p>________________________________________________________________</p>
<p>________________________________________________________________</p>
<p>________________________________________________________________</p>
</li>
</ol>`,
    ),
    expected: expectedKey('A14', {
      pageState: 'blank',
      header: 'Essay Prompt — Character Change',
      category: 'project',
      maxScore: 20,
      document_kind_guess: 'worksheet',
      items: [
        item(
          1,
          'In two paragraphs, describe how the main character changes from chapter 1 to chapter 8. Use two text details.',
          '',
          { type: 'work', points: 20, needsTeacher: true },
        ),
      ],
    }),
  },
  {
    id: 'A15',
    kind: 'assignment_key',
    style: 'modern',
    photo: false,
    fields: ['items', 'choices'],
    notes: 'Spanish cognates MC — letters only.',
    html: page(
      'modern',
      `<h1>Spanish I — Cognates Quiz</h1>
<ol>
<li>"Familia" means &nbsp; A. family &nbsp; B. famous &nbsp; C. farm &nbsp; D. finish</li>
<li>"Información" means &nbsp; A. informal &nbsp; B. information &nbsp; C. formation &nbsp; D. informer</li>
<li>"Hospital" means &nbsp; A. hospitality &nbsp; B. hostile &nbsp; C. hospital &nbsp; D. host</li>
</ol>`,
    ),
    expected: expectedKey('A15', {
      pageState: 'blank',
      header: 'Spanish I — Cognates Quiz',
      category: 'quiz',
      maxScore: 3,
      document_kind_guess: 'quiz',
      items: [
        item(1, '"Familia" means', 'A', { type: 'mc' }),
        item(2, '"Información" means', 'B', { type: 'mc' }),
        item(3, '"Hospital" means', 'C', { type: 'mc' }),
      ],
    }),
  },
  // Lesson classify cases
  {
    id: 'L01',
    kind: 'lesson_plan',
    style: 'plan',
    photo: true,
    fields: ['intent', 'header'],
    notes: 'Teacher lesson plan one-pager — classify lesson_plan, not answer_key.',
    html: page(
      'plan',
      `<h1>Lesson Plan — Day 12: Equivalent Fractions</h1>
<div class="meta">Grade 4 · 45 min · TEKS 4.3C · Ms. Ortega</div>
<div class="box"><h2>Objective</h2><p>Students generate equivalent fractions using models and multiplication.</p></div>
<div class="box"><h2>Materials</h2><ul><li>Fraction strips</li><li>Mini whiteboards</li><li>Exit ticket half-sheet</li></ul></div>
<div class="box"><h2>Agenda</h2><ol><li>Hook (5) — pizza share story</li><li>Teach (15) — multiply num/den by same number</li><li>Guided (15)</li><li>Independent (8)</li><li>Exit (2)</li></ol></div>
<div class="box"><h2>Assessment</h2><p>Exit ticket 3 items; no graded key attached on this page.</p></div>`,
    ),
    expected: expectedLesson('L01', 'lesson_plan', 'Lesson Plan — Day 12: Equivalent Fractions', {
      standards: ['TEKS 4.3C'],
    }),
  },
  {
    id: 'L02',
    kind: 'lesson_materials',
    style: 'plan',
    photo: false,
    fields: ['intent', 'header'],
    notes: 'Class materials landing list — classify lesson_materials.',
    html: page(
      'plan',
      `<h1>Unit 3 Lesson Materials</h1>
<div class="meta">Physical Science · Wave unit packet</div>
<div class="box"><h2>Included</h2>
<ul>
<li>Slide deck: Waves intro (PDF)</li>
<li>Lab sheet: Slinky stations</li>
<li>Anchor chart: transverse vs longitudinal</li>
<li>Homework half-sheet (separate key not on this list)</li>
</ul></div>
<div class="box"><h2>Teacher notes</h2><p>Print lab sheet double-sided. Do not post answer key to family feed.</p></div>`,
    ),
    expected: expectedLesson('L02', 'lesson_materials', 'Unit 3 Lesson Materials'),
  },
  {
    id: 'L03',
    kind: 'lesson_plan',
    style: 'plan',
    photo: true,
    fields: ['intent'],
    notes: 'Hand-sketch style plan with objectives — still lesson_plan not worksheet key.',
    html: page(
      'plan',
      `<h1>LP: Argument Writing Workshop</h1>
<div class="meta">ELA 7 · Block B · 90 min</div>
<div class="box"><h2>I can</h2><p>Write a claim supported by two reasons and one counterclaim response.</p></div>
<div class="box"><h2>Sequence</h2>
<ol>
<li>Mentor text read-aloud</li>
<li>Claim sort activity</li>
<li>Draft + peer critique</li>
<li>Revision checklist</li>
</ol></div>
<p>No student blanks to grade on this document.</p>`,
    ),
    expected: expectedLesson('L03', 'lesson_plan', 'LP: Argument Writing Workshop'),
  },
  // Negatives
  {
    id: 'N01',
    kind: 'negative',
    style: 'classic',
    photo: true,
    fields: ['reject'],
    notes: 'NEGATIVE: class roster — must not become assignment key with invented items.',
    html: page(
      'classic',
      `<h1>Period 3 Roster</h1>
<div class="meta">Fall 2026 · Room 118</div>
<table><tr><th>#</th><th>Student</th><th>ID</th></tr>
<tr><td>1</td><td>Avery Quinn</td><td>S-1001</td></tr>
<tr><td>2</td><td>Blake Nguyen</td><td>S-1002</td></tr>
<tr><td>3</td><td>Casey Ortiz</td><td>S-1003</td></tr>
<tr><td>4</td><td>Drew Patel</td><td>S-1004</td></tr>
</table>`,
    ),
    expected: expectedNeg('N01', 'roster_not_assignment', {
      document_kind_guess: 'roster',
      intent_not: ['answer_key'],
      header: 'Period 3 Roster',
    }),
  },
  {
    id: 'N02',
    kind: 'negative',
    style: 'classic',
    photo: false,
    fields: ['reject'],
    notes: 'NEGATIVE: syllabus weights — not an answer key / assignment sheet.',
    html: page(
      'classic',
      `<h1>Course Syllabus — Biology</h1>
<div class="meta">How your grade is calculated</div>
<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td>40%</td></tr>
<tr><td>Labs</td><td>30%</td></tr>
<tr><td>Daily</td><td>30%</td></tr></table>
<p>Late work −10% per day.</p>`,
    ),
    expected: expectedNeg('N02', 'syllabus_not_assignment', {
      document_kind_guess: 'syllabus_policy',
      intent_not: ['answer_key'],
      header: 'Course Syllabus — Biology',
    }),
  },
  {
    id: 'N03',
    kind: 'negative',
    style: 'classic',
    photo: true,
    fields: ['reject'],
    notes: 'NEGATIVE: student-filled homework to grade — not teacher key attach path.',
    html: page(
      'classic',
      `<h1>HW 4 — Student work</h1>
<div class="meta">Name: Jordan Lee &nbsp; Score draft ___/10</div>
<ol>
<li>4 × 7 = <strong>28</strong></li>
<li>9 × 6 = <strong>54</strong></li>
<li>8 × 8 = <strong>64</strong></li>
</ol>
<p class="dir">Teacher: grade this child — do not treat as blank key to solve.</p>`,
    ),
    expected: expectedNeg('N03', 'student_work_not_key', {
      document_kind_guess: 'homework_student',
      intent_not: ['answer_key', 'lesson_plan'],
      header: 'HW 4 — Student work',
      _eval: { allow_filled_extract_but_flag: true },
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
    write(path.join(dir, 'expected.json'), JSON.stringify(c.expected, null, 2) + '\n');
    write(
      path.join(dir, 'notes.md'),
      [
        `# ${c.id}`,
        '',
        `**Kind:** ${c.kind}`,
        '',
        c.notes,
        '',
        `Fields: ${(c.fields || []).join(', ')}`,
        '',
        c.photo ? 'Photo variant: yes' : 'Photo variant: no',
        '',
      ].join('\n'),
    );
    write(
      path.join(dir, 'eval-meta.json'),
      JSON.stringify(
        {
          id: c.id,
          kind: c.kind,
          photo: Boolean(c.photo),
          negative: c.kind === 'negative',
          ...(c.expected._eval || {}),
        },
        null,
        2,
      ) + '\n',
    );
    manifest.cases.push({
      id: c.id,
      kind: c.kind,
      files: ['expected.json', 'notes.md', 'source.html', 'eval-meta.json'],
      fields_exercised: c.fields || [],
      photo: Boolean(c.photo),
    });
  }
  manifest.count = manifest.cases.length;
  write(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('wrote', manifest.count, 'cases →', OUT);
}

main();
