#!/usr/bin/env node
/**
 * Generate gradebook ingest fixture corpus (HTML → PNG/JPG + expected.json).
 * Deterministic. Evaluation only — no app code changes.
 *
 *   node scripts/gen-gradebook-ingest-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest');
const DITL = path.join(ROOT, 'notes/qa-fixtures/ditl');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, body);
}

// --- styles ---
const STYLES = {
  classic: `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:28px;background:#faf8f5;width:800px;box-sizing:border-box}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:18px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
.meta{color:#555;font-size:12px;margin-bottom:16px}table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
td,th{border:1px solid #999;padding:6px 8px;text-align:left}th{background:#eee}
.note{font-size:12px;color:#333;margin:8px 0}ul{font-size:13px;line-height:1.45}`,
  modern: `body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:24px;background:#fff;width:800px;box-sizing:border-box}
h1{font-size:20px;color:#1e3a8a;margin:0}.badge{display:inline-block;background:#dbeafe;color:#1e40af;font-size:11px;padding:2px 8px;border-radius:999px;margin-left:8px}
.meta{color:#64748b;font-size:12px;margin:6px 0 14px}table{border-collapse:collapse;width:100%;font-size:13px}
td,th{border:1px solid #cbd5e1;padding:7px 10px}th{background:#f1f5f9;font-weight:600}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}h2{font-size:14px;margin:14px 0 6px;color:#334155}
p,li{font-size:13px;line-height:1.4}`,
  handbook: `body{font-family:"Times New Roman",Times,serif;color:#111;margin:0;padding:32px;background:#fff;width:800px;box-sizing:border-box}
.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px}
.header h1{font-size:18px;margin:0;letter-spacing:0.04em}.header .sub{font-size:12px;margin-top:4px}
h2{font-size:14px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.06em}
p,li{font-size:12.5px;line-height:1.45}table{border-collapse:collapse;width:100%;font-size:12px;margin:8px 0}
td,th{border:1px solid #333;padding:5px 7px}th{background:#f0f0f0}.col2{column-count:2;column-gap:24px}`,
  hand: `body{font-family:"Segoe Print","Comic Sans MS",cursive;color:#1e293b;margin:0;padding:28px;background:#fffef5;width:800px;box-sizing:border-box}
h1{font-size:24px;margin:0}p,li,td{font-size:15px;line-height:1.5}table{border-collapse:collapse;width:90%;margin:12px 0}
td,th{border:1px solid #94a3b8;padding:8px}`,
};

function page(styleKey, title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${STYLES[styleKey]}</style></head><body>
${bodyHtml}
</body></html>`;
}

function field(path, value, conf = 0.9, quote = '', status = 'proposed') {
  return {
    path,
    value,
    confidence: conf,
    evidence: { quote: quote || String(value).slice(0, 120), page: 1, region: null },
    status,
    source_doc_id: null,
  };
}

function proposal(id, kind, fields, extras = {}) {
  const wizard = kind === 'school_policy' ? 'school' : 'syllabus';
  return {
    source_id: id,
    wizard,
    kind,
    document_kind_guess:
      extras.document_kind_guess ?? (kind === 'school_policy' ? 'grading_policy' : 'syllabus_policy'),
    overall_confidence: extras.overall_confidence ?? 0.88,
    fields,
    ambiguities: extras.ambiguities ?? [],
    warnings: extras.warnings ?? [],
    _eval: extras._eval ?? {},
  };
}

/** @typedef {{id:string,kind:'syllabus'|'handbook'|'negative',style:string,html:string,photo?:boolean,hand?:boolean,copyFrom?:string,expected:object,notes:string,srs:string[],fields:string[]}} CaseSpec */

/** @type {CaseSpec[]} */
const CASES = [
  {
    id: 'S01',
    kind: 'syllabus',
    style: 'classic',
    photo: true,
    srs: ['§11.19', 'FR-AI-24#1', 'FR-AI-06'],
    fields: ['syllabus.engine', 'syllabus.categories', 'syllabus.late_rule', 'syllabus.within_category'],
    notes:
      'Exact §11.19: Tests 50 / Daily 50, late -10%/day, drop 1 daily. within_category must be flagged.',
    html: page(
      'classic',
      'S01',
      `<h1>Algebra I — Course Syllabus</h1>
<div class="meta">Ms. Rivera · Room 214 · Fall 2026</div>
<h2>How your grade is calculated</h2>
<p>Your marking-period grade uses two categories:</p>
<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td>50%</td></tr>
<tr><td>Daily</td><td>50%</td></tr></table>
<p class="note">Late work: <strong>−10% per day</strong>.</p>
<p class="note">Drop policy: <strong>drop 1 lowest Daily</strong> grade each six weeks.</p>
<p class="note">The syllabus does not state whether items inside a category average by points or by percent.</p>
<ul><li>Office hours Tue/Thu 3:15</li><li>Bring a graphing calculator</li></ul>`,
    ),
    expected: proposal(
      'S01',
      'syllabus',
      [
        field('syllabus.title', 'Algebra I — Course Syllabus', 0.9, 'Algebra I'),
        field('syllabus.engine', 'weighted_percent_inside', 0.7, 'Tests 50% Daily 50%', 'needs_review'),
        field('syllabus.within_category', null, 0.4, 'does not state', 'unknown'),
        field(
          'syllabus.categories',
          [
            { key: 'tests', label: 'Tests', weight_percent: 50 },
            { key: 'daily', label: 'Daily', weight_percent: 50, drop_lowest: 1 },
          ],
          0.95,
          'Tests 50 / Daily 50, drop 1 lowest Daily',
        ),
        field(
          'syllabus.late_rule',
          { type: 'per_day', amount: 10, unit: 'percent' },
          0.95,
          '−10% per day',
        ),
      ],
      {
        ambiguities: [
          {
            code: 'within_category',
            message: 'Document never says how items combine inside a category.',
            paths: ['syllabus.within_category'],
            choices: ['points_inside', 'percent_inside'],
          },
        ],
        _eval: { exact_s1119: true, weights_sum: 100 },
      },
    ),
  },
  {
    id: 'S02',
    kind: 'syllabus',
    style: 'modern',
    photo: false,
    srs: ['FR-AI-05', '§6.5'],
    fields: ['syllabus.engine', 'syllabus.late_rule', 'syllabus.missing_rule'],
    notes: 'Total points engine; no category %; late none; missing as zero.',
    html: page(
      'modern',
      'S02',
      `<h1>Biology Lab<span class="badge">Total points</span></h1>
<div class="meta">Mr. Chen · Period 3</div>
<p>All assignments add by <strong>total points</strong>. There are no category percentages.</p>
<ul>
<li>Unit labs: 50 pts each</li>
<li>Notebook checks: 20 pts</li>
<li>Final practical: 100 pts</li>
</ul>
<p>Late work is <strong>not accepted</strong> after the due date (no late penalty schedule).</p>
<p>Missing work counts as <strong>zero</strong>.</p>`,
    ),
    expected: proposal('S02', 'syllabus', [
      field('syllabus.title', 'Biology Lab', 0.9, 'Biology Lab'),
      field('syllabus.engine', 'total_points', 0.92, 'total points'),
      field('syllabus.late_rule', { type: 'none' }, 0.9, 'not accepted'),
      field('syllabus.missing_rule', { type: 'zero' }, 0.9, 'counts as zero'),
    ]),
  },
  {
    id: 'S03',
    kind: 'syllabus',
    style: 'classic',
    photo: true,
    srs: ['FR-AI-05', '§7.1'],
    fields: ['syllabus.engine', 'syllabus.within_category', 'syllabus.extra_credit_method', 'syllabus.late_rule'],
    notes: 'weighted_points_inside; flat late; EC method B.',
    html: page(
      'classic',
      'S03',
      `<h1>World History</h1>
<div class="meta">Weighted by category; items combine by raw points inside each category.</div>
<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Essays</td><td>40%</td></tr>
<tr><td>Quizzes</td><td>35%</td></tr>
<tr><td>Projects</td><td>25%</td></tr></table>
<p>Within each category, scores are the sum of points earned ÷ points possible (points-inside).</p>
<p>Late work: flat <strong>−20 points</strong> once late (not per day).</p>
<p>Extra credit: Method B — optional EC does not lower anyone who skips it. Cap: none stated.</p>`,
    ),
    expected: proposal('S03', 'syllabus', [
      field('syllabus.engine', 'weighted_points_inside', 0.9, 'points-inside'),
      field('syllabus.within_category', 'points_inside', 0.88, 'points-inside'),
      field(
        'syllabus.categories',
        [
          { key: 'essays', label: 'Essays', weight_percent: 40 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 35 },
          { key: 'projects', label: 'Projects', weight_percent: 25 },
        ],
        0.93,
        'Essays 40 Quizzes 35 Projects 25',
      ),
      field('syllabus.late_rule', { type: 'flat', amount: 20, unit: 'points' }, 0.9, '−20 points'),
      field('syllabus.extra_credit_method', 'B', 0.85, 'Method B'),
    ]),
  },
  {
    id: 'S04',
    kind: 'syllabus',
    style: 'modern',
    photo: false,
    srs: ['FR-AI-05', 'FR-AI-17'],
    fields: ['syllabus.engine', 'syllabus.within_category', 'syllabus.missing_rule', 'syllabus.late_rule'],
    notes: 'percent-inside; missing omit; per-hour late; Texas 70 scale mention.',
    html: page(
      'modern',
      'S04',
      `<h1>Chemistry I</h1>
<div class="meta">Percent-inside weighted categories · TX 70 pass scale</div>
<table><tr><th>Category</th><th>%</th></tr>
<tr><td>Tests</td><td>40</td></tr>
<tr><td>Labs</td><td>30</td></tr>
<tr><td>Homework</td><td>20</td></tr>
<tr><td>Participation</td><td>10</td></tr></table>
<p>Inside a category, each assignment is scored as a percent then averaged (percent-inside).</p>
<p>Late: <strong>−5% per hour</strong> late, max 24 hours.</p>
<p>Excused / missing with note: <strong>omit</strong> from the average (not zero).</p>
<p>Letter scale follows campus Texas 70-pass (A 90–100 … F below 70).</p>`,
    ),
    expected: proposal('S04', 'syllabus', [
      field('syllabus.engine', 'weighted_percent_inside', 0.9, 'percent-inside'),
      field('syllabus.within_category', 'percent_inside', 0.9, 'percent-inside'),
      field(
        'syllabus.categories',
        [
          { key: 'tests', label: 'Tests', weight_percent: 40 },
          { key: 'labs', label: 'Labs', weight_percent: 30 },
          { key: 'homework', label: 'Homework', weight_percent: 20 },
          { key: 'participation', label: 'Participation', weight_percent: 10 },
        ],
        0.95,
        '40 30 20 10',
      ),
      field('syllabus.late_rule', { type: 'per_hour', amount: 5, unit: 'percent' }, 0.88, '−5% per hour'),
      field('syllabus.missing_rule', { type: 'omit' }, 0.9, 'omit from the average'),
    ]),
  },
  {
    id: 'S05',
    kind: 'syllabus',
    style: 'classic',
    photo: true,
    srs: ['FR-AI-21', 'FR-AI-13'],
    fields: ['syllabus.categories'],
    notes: 'Weights sum to 90 — must NOT silently renormalize. Late floor 50.',
    html: page(
      'classic',
      'S05',
      `<h1>English II</h1>
<div class="meta">Category weights (note: currently sum to 90 — teacher will fix)</div>
<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Essays</td><td>40%</td></tr>
<tr><td>Quizzes</td><td>30%</td></tr>
<tr><td>Homework</td><td>20%</td></tr></table>
<p>Late work cannot fall below a <strong>floor of 50%</strong>.</p>
<p>School policy may lock homework ≤ 10%; this syllabus still lists 20% (conflict expected if lock on).</p>`,
    ),
    expected: proposal(
      'S05',
      'syllabus',
      [
        field(
          'syllabus.categories',
          [
            { key: 'essays', label: 'Essays', weight_percent: 40 },
            { key: 'quizzes', label: 'Quizzes', weight_percent: 30 },
            { key: 'homework', label: 'Homework', weight_percent: 20 },
          ],
          0.95,
          '40 30 20',
        ),
        field('syllabus.engine', 'weighted_percent_inside', 0.85, 'Category weights'),
        field(
          'syllabus.late_rule',
          { type: 'floor', floor: 50, unit: 'percent' },
          0.85,
          'floor of 50%',
        ),
      ],
      {
        warnings: [
          {
            code: 'weights_not_100',
            message: 'Category weights sum to 90; do not renormalize.',
            severity: 'warn',
          },
        ],
        _eval: { weights_sum: 90, no_renormalize: true },
      },
    ),
  },
  {
    id: 'S06',
    kind: 'syllabus',
    style: 'modern',
    photo: true,
    srs: ['FR-AI-21', '§11'],
    fields: ['syllabus.categories', 'syllabus.floor', 'syllabus.ceiling', 'syllabus.retake', 'syllabus.late_rule'],
    notes: 'Weights sum 110; hard deadline; period floor/ceiling; retake cap 70.',
    html: page(
      'modern',
      'S06',
      `<h1>Geometry</h1>
<div class="meta">Weights currently total 110% — do not auto-fix</div>
<table><tr><th>Category</th><th>%</th></tr>
<tr><td>Tests</td><td>50</td></tr>
<tr><td>Quizzes</td><td>40</td></tr>
<tr><td>Homework</td><td>20</td></tr></table>
<p>Hard deadline: no work accepted after the unit ends.</p>
<p>Period floor 50 / ceiling 100.</p>
<p>Retakes: highest score kept; retake score capped at 70.</p>`,
    ),
    expected: proposal(
      'S06',
      'syllabus',
      [
        field(
          'syllabus.categories',
          [
            { key: 'tests', label: 'Tests', weight_percent: 50 },
            { key: 'quizzes', label: 'Quizzes', weight_percent: 40 },
            { key: 'homework', label: 'Homework', weight_percent: 20 },
          ],
          0.95,
          '50 40 20',
        ),
        field('syllabus.engine', 'weighted_percent_inside', 0.85, 'Weights'),
        field('syllabus.late_rule', { type: 'hard_deadline' }, 0.88, 'Hard deadline'),
        field('syllabus.floor', 50, 0.9, 'floor 50'),
        field('syllabus.ceiling', 100, 0.9, 'ceiling 100'),
        field(
          'syllabus.retake',
          { method: 'keep_highest', cap: 70 },
          0.88,
          'capped at 70',
        ),
      ],
      { _eval: { weights_sum: 110, no_renormalize: true } },
    ),
  },
  {
    id: 'S07',
    kind: 'syllabus',
    style: 'classic',
    photo: false,
    srs: ['FR-AI-05'],
    fields: ['syllabus.categories', 'syllabus.extra_credit_method', 'syllabus.ec_cap', 'syllabus.late_rule'],
    notes: 'Seven categories; drop 2 quizzes; never-drop tests; EC A cap 5; late −5%/day.',
    html: page(
      'classic',
      'S07',
      `<h1>Spanish II</h1>
<table><tr><th>Category</th><th>%</th><th>Notes</th></tr>
<tr><td>Tests</td><td>25</td><td>never drop</td></tr>
<tr><td>Quizzes</td><td>20</td><td>drop lowest 2</td></tr>
<tr><td>Speaking</td><td>15</td><td></td></tr>
<tr><td>Writing</td><td>15</td><td></td></tr>
<tr><td>Homework</td><td>10</td><td></td></tr>
<tr><td>Projects</td><td>10</td><td></td></tr>
<tr><td>Participation</td><td>5</td><td></td></tr></table>
<p>Late: −5% per day. Extra credit Method A, cap +5 points on the period.</p>`,
    ),
    expected: proposal('S07', 'syllabus', [
      field(
        'syllabus.categories',
        [
          { key: 'tests', label: 'Tests', weight_percent: 25, never_drop: true },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 20, drop_lowest: 2 },
          { key: 'speaking', label: 'Speaking', weight_percent: 15 },
          { key: 'writing', label: 'Writing', weight_percent: 15 },
          { key: 'homework', label: 'Homework', weight_percent: 10 },
          { key: 'projects', label: 'Projects', weight_percent: 10 },
          { key: 'participation', label: 'Participation', weight_percent: 5 },
        ],
        0.92,
        'seven categories',
      ),
      field('syllabus.late_rule', { type: 'per_day', amount: 5, unit: 'percent' }, 0.9, '−5% per day'),
      field('syllabus.extra_credit_method', 'A', 0.85, 'Method A'),
      field('syllabus.ec_cap', 5, 0.85, 'cap +5'),
    ]),
  },
  {
    id: 'S08',
    kind: 'syllabus',
    style: 'hand',
    photo: true,
    hand: true,
    srs: ['FR-AI-05'],
    fields: ['syllabus.missing_rule', 'syllabus.retake', 'syllabus.categories'],
    notes: 'Handwritten-style; missing floor 50; conduct mark; retake replace.',
    html: page(
      'hand',
      'S08',
      `<h1>PE / Athletics — Ms. Brooks</h1>
<p>Major grades 60% · Daily 40%</p>
<p>Missing work uses a floor of 50 (not zero).</p>
<p>Conduct mark is separate (E/S/N/U) — does not change the numeric average.</p>
<p>Retakes: new score replaces the old one (one attempt).</p>
<p>No late work accepted.</p>`,
    ),
    expected: proposal('S08', 'syllabus', [
      field(
        'syllabus.categories',
        [
          { key: 'major', label: 'Major', weight_percent: 60 },
          { key: 'daily', label: 'Daily', weight_percent: 40 },
        ],
        0.9,
        '60 40',
      ),
      field('syllabus.missing_rule', { type: 'floor', floor: 50 }, 0.88, 'floor of 50'),
      field('syllabus.late_rule', { type: 'none' }, 0.85, 'No late work'),
      field('syllabus.retake', { method: 'replace', attempts: 1 }, 0.85, 'replaces the old'),
      field('syllabus.narrative', 'Conduct mark E/S/N/U separate from numeric average', 0.7, 'Conduct mark'),
    ]),
  },
  {
    id: 'S09',
    kind: 'syllabus',
    style: 'hand',
    photo: true,
    hand: true,
    srs: ['FR-AI-05'],
    fields: ['syllabus.extra_credit_method', 'syllabus.categories', 'syllabus.narrative'],
    notes: 'Handwritten-style 5 cats; EC method C; flat late; narrative philosophy.',
    html: page(
      'hand',
      'S09',
      `<h1>Art I</h1>
<p>Studio 30 · Critique 20 · Sketchbook 20 · Projects 20 · Final 10</p>
<p>Late: flat −10% once.</p>
<p>Extra credit Method C (separate bucket).</p>
<p>Grading philosophy: growth over perfection — narrative only, not a category.</p>`,
    ),
    expected: proposal('S09', 'syllabus', [
      field(
        'syllabus.categories',
        [
          { key: 'studio', label: 'Studio', weight_percent: 30 },
          { key: 'critique', label: 'Critique', weight_percent: 20 },
          { key: 'sketchbook', label: 'Sketchbook', weight_percent: 20 },
          { key: 'projects', label: 'Projects', weight_percent: 20 },
          { key: 'final', label: 'Final', weight_percent: 10 },
        ],
        0.88,
        '30 20 20 20 10',
      ),
      field('syllabus.late_rule', { type: 'flat', amount: 10, unit: 'percent' }, 0.85, 'flat −10%'),
      field('syllabus.extra_credit_method', 'C', 0.85, 'Method C'),
      field('syllabus.narrative', 'growth over perfection', 0.75, 'growth over perfection'),
    ]),
  },
  {
    id: 'S10',
    kind: 'syllabus',
    style: 'modern',
    photo: false,
    srs: ['FR-AI-05', 'FR-AI-17'],
    fields: ['syllabus.floor', 'syllabus.ceiling', 'syllabus.late_rule', 'syllabus.categories'],
    notes: 'Plus/minus college-ish scale mention; per-day late with floor 0; ceiling 100.',
    html: page(
      'modern',
      'S10',
      `<h1>AP Seminar</h1>
<table><tr><th>Category</th><th>%</th></tr>
<tr><td>Performance tasks</td><td>50</td></tr>
<tr><td>Team project</td><td>30</td></tr>
<tr><td>WRD</td><td>20</td></tr></table>
<p>Late −10%/day with floor 0. Period ceiling 100.</p>
<p>Scale override for this class: plus/minus (A− = 90–92, etc.). Not Texas 70-only.</p>`,
    ),
    expected: proposal('S10', 'syllabus', [
      field(
        'syllabus.categories',
        [
          { key: 'performance_tasks', label: 'Performance tasks', weight_percent: 50 },
          { key: 'team_project', label: 'Team project', weight_percent: 30 },
          { key: 'wrd', label: 'WRD', weight_percent: 20 },
        ],
        0.92,
        '50 30 20',
      ),
      field(
        'syllabus.late_rule',
        { type: 'per_day', amount: 10, unit: 'percent', floor: 0 },
        0.9,
        '−10%/day floor 0',
      ),
      field('syllabus.ceiling', 100, 0.9, 'ceiling 100'),
      field('syllabus.narrative', 'plus/minus scale override', 0.7, 'plus/minus'),
    ]),
  },
  // ---- Handbooks ----
  {
    id: 'H01',
    kind: 'handbook',
    style: 'handbook',
    photo: true,
    srs: ['§11.20', 'FR-AI-24#2'],
    fields: ['calendar.template', 'rollup.preset', 'credit.passing_threshold', 'levels.list', 'gpa.mode'],
    notes: 'Exact §11.20: six-weeks + 2/7 + AP 5.0 + pass 70.',
    html: page(
      'handbook',
      'H01',
      `<div class="header"><h1>STUDENT HANDBOOK — GRADING &amp; REPORTING</h1>
<div class="sub">Northside ISD · High School · 2026–27</div></div>
<h2>Marking periods</h2>
<p>The academic year uses <strong>six-week</strong> grading periods. Semester average: each six-weeks is <strong>2/7</strong> and the semester exam is <strong>1/7</strong>.</p>
<h2>Passing mark</h2>
<p>Passing is <strong>70</strong>.</p>
<h2>GPA</h2>
<p>Regular A = 4.0. <strong>AP A = 5.0</strong> (weighted). Honors receives +0.5 quality points.</p>
<table><tr><th>Level</th><th>A</th><th>B</th><th>C</th><th>D</th><th>F</th></tr>
<tr><td>On-level</td><td>4.0</td><td>3.0</td><td>2.0</td><td>1.0</td><td>0</td></tr>
<tr><td>AP</td><td>5.0</td><td>4.0</td><td>3.0</td><td>2.0</td><td>0</td></tr></table>`,
    ),
    expected: proposal(
      'H01',
      'school_policy',
      [
        field('calendar.template', 'tx_six_weeks', 0.95, 'six-week'),
        field('calendar.period_model', 'six_weeks', 0.95, 'six-week'),
        field('rollup.preset', '2/7+1/7', 0.95, '2/7 ... 1/7'),
        field('credit.passing_threshold', 70, 0.97, 'Passing is 70'),
        field('gpa.mode', 'unweighted_and_weighted', 0.9, 'AP A = 5.0'),
        field(
          'levels.list',
          [
            { key: 'on_level', label: 'On-level', weighted_bonus: 0 },
            { key: 'honors', label: 'Honors', weighted_bonus: 0.5 },
            { key: 'ap', label: 'AP', weighted_bonus: 1.0 },
          ],
          0.9,
          'AP A = 5.0',
        ),
      ],
      { _eval: { exact_s1120: true } },
    ),
  },
  {
    id: 'H02',
    kind: 'handbook',
    style: 'handbook',
    photo: false,
    srs: ['FR-AI-05'],
    fields: ['calendar.template', 'rollup.preset', 'rollup.exam_enabled'],
    notes: 'Nine-weeks + 40/40/20 + exam exemption ≥90.',
    html: page(
      'handbook',
      'H02',
      `<div class="header"><h1>GRADING POLICY</h1><div class="sub">Quarter calendar</div></div>
<p>Marking periods are <strong>nine weeks</strong>. Semester = Q1 40% + Q2 40% + Exam 20%.</p>
<p>Exam exemption: students with average ≥ 90 and ≤ 3 absences may exempt the exam; weights renormalize to 50/50.</p>`,
    ),
    expected: proposal('H02', 'school_policy', [
      field('calendar.template', 'nine_weeks', 0.95, 'nine weeks'),
      field('calendar.period_model', 'nine_weeks', 0.95, 'nine weeks'),
      field('rollup.preset', '40/40/20', 0.95, '40% + 40% + Exam 20%'),
      field('rollup.exam_enabled', true, 0.9, 'Exam'),
      field('school.notes', 'Exam exemption average ≥ 90 and ≤ 3 absences', 0.85, 'exemption'),
    ]),
  },
  {
    id: 'H03',
    kind: 'handbook',
    style: 'handbook',
    photo: true,
    srs: ['FR-AI-07', 'FR-AI-24#4'],
    fields: ['calendar.template', 'rollup.preset', 'locks.map'],
    notes: 'Semester + 45/45/10 + homework lock ≤10%.',
    html: page(
      'handbook',
      'H03',
      `<div class="header"><h1>EIA (LOCAL) GRADING</h1></div>
<p>Credit terms are <strong>semesters</strong>. Term rollup: MP1 45%, MP2 45%, exam 10%.</p>
<p><strong>School lock:</strong> homework category weight may not exceed <strong>10%</strong> in any class syllabus.</p>`,
    ),
    expected: proposal('H03', 'school_policy', [
      field('calendar.template', 'semester', 0.9, 'semesters'),
      field('calendar.period_model', 'semester', 0.9, 'semesters'),
      field('rollup.preset', '45/45/10', 0.95, '45% 45% 10%'),
      field(
        'locks.map',
        { categories: true, homework_max_percent: 10 },
        0.9,
        'homework ... 10%',
      ),
    ]),
  },
  {
    id: 'H04',
    kind: 'handbook',
    style: 'handbook',
    photo: false,
    srs: ['FR-AI-05', '§6.3'],
    fields: ['calendar.template', 'rollup.preset', 'credit.year_link'],
    notes: 'Trimester + 50/50 + year-link credit.',
    html: page(
      'handbook',
      'H04',
      `<div class="header"><h1>ACADEMIC GUIDE</h1></div>
<p>The year is three <strong>trimesters</strong>. For two-term courses, rollup is <strong>50/50</strong> (no separate exam).</p>
<p>Year-link: fall and spring must both be passed for full credit (paired).</p>`,
    ),
    expected: proposal('H04', 'school_policy', [
      field('calendar.template', 'trimester', 0.95, 'trimesters'),
      field('calendar.period_model', 'trimester', 0.95, 'trimesters'),
      field('rollup.preset', '50/50', 0.95, '50/50'),
      field('credit.year_link', true, 0.9, 'Year-link'),
    ]),
  },
  {
    id: 'H05',
    kind: 'handbook',
    style: 'handbook',
    photo: true,
    srs: ['FR-AI-05'],
    fields: ['rollup.preset', 'levels.list', 'calendar.template'],
    notes: 'Six-weeks + 85/15 + IB SL/HL + Dual Credit.',
    html: page(
      'handbook',
      'H05',
      `<div class="header"><h1>ADVANCED ACADEMICS</h1></div>
<p>Six-week periods. Full-year elective rollup may use <strong>85/15</strong> (coursework / final).</p>
<p>Levels: On-level, Honors, <strong>IB SL</strong>, <strong>IB HL</strong>, <strong>Dual Credit</strong>.</p>`,
    ),
    expected: proposal('H05', 'school_policy', [
      field('calendar.template', 'tx_six_weeks', 0.9, 'Six-week'),
      field('rollup.preset', '85/15', 0.92, '85/15'),
      field(
        'levels.list',
        [
          { key: 'on_level', label: 'On-level', weighted_bonus: 0 },
          { key: 'honors', label: 'Honors', weighted_bonus: 0.5 },
          { key: 'ib_sl', label: 'IB SL', weighted_bonus: 1.0 },
          { key: 'ib_hl', label: 'IB HL', weighted_bonus: 1.0 },
          { key: 'dual_credit', label: 'Dual Credit', weighted_bonus: 1.0 },
        ],
        0.9,
        'IB SL IB HL Dual Credit',
      ),
    ]),
  },
  {
    id: 'H06',
    kind: 'handbook',
    style: 'handbook',
    photo: false,
    srs: ['FR-AI-05'],
    fields: ['gpa.include', 'calendar.template', 'school.notes'],
    notes: 'Nine-weeks; PE/P/F exclude from GPA; UIL eligibility.',
    html: page(
      'handbook',
      'H06',
      `<div class="header"><h1>GPA &amp; ELIGIBILITY</h1></div>
<p>Nine-week grading periods.</p>
<p>GPA inclusion: PE is excluded. Pass/Fail courses excluded. Credit-by-exam (CBE) excluded from GPA.</p>
<p>UIL eligibility uses the six-weeks/nine-weeks period grade; failing any class = ineligible until next grade check.</p>`,
    ),
    expected: proposal('H06', 'school_policy', [
      field('calendar.template', 'nine_weeks', 0.9, 'Nine-week'),
      field(
        'gpa.include',
        { pe: false, pass_fail: false, cbe: false },
        0.9,
        'PE is excluded',
      ),
      field('school.notes', 'UIL eligibility uses period grade', 0.85, 'UIL eligibility'),
    ]),
  },
  {
    id: 'H07',
    kind: 'handbook',
    style: 'handbook',
    photo: false,
    srs: ['FR-AI-05', '§5.9'],
    fields: ['credit.passing_threshold', 'scale.bands', 'scale.passing_pct'],
    notes: 'Pass 60 + no-D letter scale.',
    html: page(
      'handbook',
      'H07',
      `<div class="header"><h1>GRADE SCALE</h1></div>
<p>Passing mark is <strong>60</strong>.</p>
<table><tr><th>Letter</th><th>Percent</th></tr>
<tr><td>A</td><td>90–100</td></tr>
<tr><td>B</td><td>80–89</td></tr>
<tr><td>C</td><td>70–79</td></tr>
<tr><td>F</td><td>0–59</td></tr></table>
<p>No D letter is used.</p>`,
    ),
    expected: proposal('H07', 'school_policy', [
      field('credit.passing_threshold', 60, 0.95, 'Passing mark is 60'),
      field('scale.passing_pct', 60, 0.95, '60'),
      field(
        'scale.bands',
        [
          { letter: 'A', min: 90, max: 100 },
          { letter: 'B', min: 80, max: 89 },
          { letter: 'C', min: 70, max: 79 },
          { letter: 'F', min: 0, max: 59 },
        ],
        0.95,
        'No D',
      ),
    ]),
  },
  {
    id: 'H08',
    kind: 'handbook',
    style: 'handbook',
    photo: false,
    srs: ['FR-AI-05'],
    fields: ['scale.bands', 'gpa.rank', 'school.notes'],
    notes: 'Plus/minus scale; transfer letter→percent; rank GPA.',
    html: page(
      'handbook',
      'H08',
      `<div class="header"><h1>PLUS/MINUS &amp; TRANSFER</h1></div>
<table><tr><th>Letter</th><th>%</th></tr>
<tr><td>A</td><td>93–100</td></tr>
<tr><td>A−</td><td>90–92</td></tr>
<tr><td>B+</td><td>87–89</td></tr>
<tr><td>B</td><td>83–86</td></tr>
<tr><td>B−</td><td>80–82</td></tr></table>
<p>Transfer grades: incoming letter A maps to 95%, B to 85%, C to 75%, D to 65%, F to 50%.</p>
<p>Class rank uses the weighted GPA profile only.</p>`,
    ),
    expected: proposal('H08', 'school_policy', [
      field(
        'scale.bands',
        [
          { letter: 'A', min: 93, max: 100 },
          { letter: 'A-', min: 90, max: 92 },
          { letter: 'B+', min: 87, max: 89 },
          { letter: 'B', min: 83, max: 86 },
          { letter: 'B-', min: 80, max: 82 },
        ],
        0.92,
        'A−',
      ),
      field('gpa.rank', { uses: 'weighted' }, 0.88, 'rank uses the weighted GPA'),
      field(
        'school.notes',
        'Transfer A=95 B=85 C=75 D=65 F=50',
        0.85,
        'Transfer grades',
      ),
    ]),
  },
  {
    id: 'H09',
    kind: 'handbook',
    style: 'handbook',
    photo: true,
    srs: ['FR-AI-21', 'FR-AI-24#6'],
    fields: ['qp.tables', 'qp.method', 'levels.list'],
    notes: 'Numeric-band 4.0/5.0/6.0 chart — NOT bonus guess.',
    html: page(
      'handbook',
      'H09',
      `<div class="header"><h1>QUALITY POINTS (NUMERIC BAND)</h1></div>
<p>GPA uses a numeric quality-point chart (not a simple +1.0 bonus):</p>
<table>
<tr><th>Percent</th><th>Regular</th><th>Honors</th><th>AP</th></tr>
<tr><td>97–100</td><td>4.0</td><td>5.0</td><td>6.0</td></tr>
<tr><td>93–96</td><td>3.8</td><td>4.8</td><td>5.8</td></tr>
<tr><td>90–92</td><td>3.6</td><td>4.6</td><td>5.6</td></tr>
<tr><td>87–89</td><td>3.3</td><td>4.3</td><td>5.3</td></tr>
<tr><td>83–86</td><td>3.0</td><td>4.0</td><td>5.0</td></tr>
</table>
<p>Do not collapse this into “AP +1.0” only.</p>`,
    ),
    expected: proposal(
      'H09',
      'school_policy',
      [
        field('qp.method', 'numeric_band', 0.95, 'numeric quality-point chart'),
        field(
          'qp.tables',
          [
            { min: 97, max: 100, regular: 4.0, honors: 5.0, ap: 6.0 },
            { min: 93, max: 96, regular: 3.8, honors: 4.8, ap: 5.8 },
            { min: 90, max: 92, regular: 3.6, honors: 4.6, ap: 5.6 },
            { min: 87, max: 89, regular: 3.3, honors: 4.3, ap: 5.3 },
            { min: 83, max: 86, regular: 3.0, honors: 4.0, ap: 5.0 },
          ],
          0.95,
          '97–100 AP 6.0',
        ),
        field(
          'levels.list',
          [
            { key: 'on_level', label: 'Regular' },
            { key: 'honors', label: 'Honors' },
            { key: 'ap', label: 'AP' },
          ],
          0.9,
          'Regular Honors AP',
        ),
      ],
      { _eval: { numeric_chart: true, not_bonus_guess: true } },
    ),
  },
  {
    id: 'H10',
    kind: 'handbook',
    style: 'handbook',
    photo: false,
    srs: ['FR-AI-05'],
    fields: ['levels.list', 'gpa.repeat', 'gpa.include'],
    notes: 'OnRamps; Honors +0.5; repeat/forgive; recovery + pre-9 exclusion.',
    html: page(
      'handbook',
      'H10',
      `<div class="header"><h1>COURSE LEVELS &amp; REPEATS</h1></div>
<p>Levels include Honors (+0.5), AP (+1.0), and <strong>OnRamps</strong> (weighted like Dual Credit).</p>
<p>Repeat/forgive: when a course is repeated, the higher grade replaces the lower in GPA (forgiveness).</p>
<p>Credit recovery and pre-grade-9 courses are excluded from cumulative GPA.</p>`,
    ),
    expected: proposal('H10', 'school_policy', [
      field(
        'levels.list',
        [
          { key: 'honors', label: 'Honors', weighted_bonus: 0.5 },
          { key: 'ap', label: 'AP', weighted_bonus: 1.0 },
          { key: 'onramps', label: 'OnRamps', weighted_bonus: 1.0 },
        ],
        0.9,
        'OnRamps',
      ),
      field('gpa.repeat', { policy: 'forgive_higher' }, 0.9, 'higher grade replaces'),
      field(
        'gpa.include',
        { recovery: false, pre_9: false },
        0.88,
        'recovery and pre-grade-9',
      ),
    ]),
  },
  // ---- Negatives ----
  {
    id: 'N01',
    kind: 'negative',
    style: 'classic',
    photo: true,
    srs: ['FR-AI-13', 'FR-AI-20', 'FR-AI-24#5'],
    fields: [],
    notes: 'Illegible — no fields; retake prompt.',
    html: page(
      'classic',
      'N01',
      `<div style="filter:blur(12px);opacity:0.35;transform:rotate(3deg)">
<h1>?????? ??????</h1>
<p>xxxxxxxx xxxxx xxxx 50% xxxx</p>
<table><tr><td>///</td><td>###</td></tr></table>
</div>
<p style="color:#ccc;font-size:9px">glare noise</p>`,
    ),
    expected: proposal(
      'N01',
      'syllabus',
      [],
      {
        overall_confidence: 0.05,
        document_kind_guess: 'unknown',
        warnings: [
          {
            code: 'low_ocr',
            message: 'Image unreadable; retake required.',
            severity: 'block',
          },
        ],
        _eval: { negative: true, expect_empty: true },
      },
    ),
  },
  {
    id: 'N02',
    kind: 'negative',
    style: 'modern',
    photo: false,
    srs: ['FR-AI-13', 'FR-AI-03'],
    fields: [],
    notes: 'Wrong document type — cafeteria menu.',
    html: page(
      'modern',
      'N02',
      `<h1>Cafeteria Weekly Menu</h1>
<div class="meta">Week of Sept 14</div>
<table><tr><th>Day</th><th>Entree</th><th>Side</th></tr>
<tr><td>Mon</td><td>Chicken tenders</td><td>Corn</td></tr>
<tr><td>Tue</td><td>Tacos</td><td>Rice</td></tr>
<tr><td>Wed</td><td>Pizza</td><td>Salad</td></tr></table>
<p>Milk included. Allergen info on reverse.</p>`,
    ),
    expected: proposal(
      'N02',
      'syllabus',
      [],
      {
        overall_confidence: 0.2,
        document_kind_guess: 'unknown',
        warnings: [
          {
            code: 'wrong_document_type',
            message: 'Not a syllabus or grading policy.',
            severity: 'block',
          },
        ],
        _eval: { negative: true, expect_empty: true },
      },
    ),
  },
  {
    id: 'N03',
    kind: 'negative',
    style: 'classic',
    photo: true,
    srs: ['FR-AI-13'],
    fields: [],
    notes: 'Two syllabi in one photo — must not silently merge.',
    html: page(
      'classic',
      'N03',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
<div style="border:1px solid #333;padding:8px">
<h1 style="font-size:16px">Math — Ms. A</h1>
<p>Tests 70% Homework 30%</p>
<p>Late −5%/day</p>
</div>
<div style="border:1px solid #333;padding:8px">
<h1 style="font-size:16px">English — Mr. B</h1>
<p>Essays 50% Daily 50%</p>
<p>No late work</p>
</div>
</div>
<p class="note">Photo captured both class syllabi on the desk.</p>`,
    ),
    expected: proposal(
      'N03',
      'syllabus',
      [],
      {
        overall_confidence: 0.3,
        document_kind_guess: 'mixed',
        ambiguities: [
          {
            code: 'mixed_documents',
            message: 'Two syllabi detected; retake one document at a time.',
            paths: [],
          },
        ],
        warnings: [
          {
            code: 'mixed_two_syllabi',
            message: 'Mixed two syllabi in one photo.',
            severity: 'block',
          },
        ],
        _eval: { negative: true, expect_empty_or_flag: true },
      },
    ),
  },
];

console.log('gen: case defs', CASES.map((c) => c.id).join(','));

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c.includes('/') && fs.existsSync(c)) return c;
    const which = spawnSync('which', [c], { encoding: 'utf8' });
    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  }
  return null;
}

function renderHtmlToPng(chrome, htmlPath, pngPath) {
  const absHtml = path.resolve(htmlPath);
  const absPng = path.resolve(pngPath);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-ingest-chrome-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${userData}`,
    `--screenshot=${absPng}`,
    '--window-size=840,1100',
    '--virtual-time-budget=8000',
    `file://${absHtml}`,
  ];
  const r = spawnSync(chrome, args, {
    encoding: 'utf8',
    timeout: 20000,
    killSignal: 'SIGKILL',
  });
  try {
    fs.rmSync(userData, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  if (!fs.existsSync(absPng)) {
    throw new Error(
      `Chrome screenshot failed for ${htmlPath}: status=${r.status} err=${(r.stderr || '').slice(0, 200)}`,
    );
  }
  try {
    const st = fs.statSync(absPng);
    if (st.size > 380_000) {
      spawnSync('sips', ['-Z', '1000', absPng], { encoding: 'utf8', timeout: 10000 });
    }
  } catch {
    /* optional */
  }
}

function makePhotoVariant(cleanPng, photoJpg) {
  // Prefer python PIL script sibling; fallback: copy as jpg via sips
  const py = path.join(__dirname, 'lib/gradebook-ingest-photo.py');
  if (fs.existsSync(py)) {
    const r = spawnSync('python3', [py, cleanPng, photoJpg], { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(photoJpg)) return;
  }
  const r2 = spawnSync('sips', ['-s', 'format', 'jpeg', cleanPng, '--out', photoJpg], {
    encoding: 'utf8',
  });
  if (r2.status !== 0 || !fs.existsSync(photoJpg)) {
    fs.copyFileSync(cleanPng, photoJpg.replace(/\.jpg$/, '.png'));
  }
}

function stripEval(expected) {
  const { _eval, ...rest } = expected;
  return rest;
}

function writeCaseDir(c, files) {
  const dir = path.join(OUT, c.id);
  ensureDir(dir);
  if (c.html) write(path.join(dir, 'source.html'), c.html);
  write(path.join(dir, 'expected.json'), JSON.stringify(stripEval(c.expected), null, 2) + '\n');
  write(
    path.join(dir, 'notes.md'),
    `# ${c.id}\n\n${c.notes}\n\nSRS: ${c.srs.join(', ')}\n\nFields: ${c.fields.join(', ') || '(none — negative)'}\n`,
  );
  // keep _eval alongside for scorer
  write(path.join(dir, 'eval-meta.json'), JSON.stringify(c.expected._eval || {}, null, 2) + '\n');
  return dir;
}

function realPhotoCases() {
  return [
    {
      id: 'S11',
      kind: 'syllabus',
      copyFrom: path.join(DITL, 'ditl-pen-math-syllabus-T-04.jpg'),
      srs: ['§11.19', 'real-photo'],
      fields: ['syllabus.categories'],
      notes: 'Real DITL pen-math syllabus photo (ground-truth approximate).',
      expected: proposal(
        'S11',
        'syllabus',
        [
          field('syllabus.engine', 'weighted_percent_inside', 0.6, 'weights', 'needs_review'),
        ],
        {
          overall_confidence: 0.55,
          _eval: { real_photo: true, soft_match: true },
        },
      ),
    },
    {
      id: 'S12',
      kind: 'syllabus',
      copyFrom: path.join(DITL, 'ditl-english-syllabus-photo-T-04.jpg'),
      srs: ['real-photo'],
      fields: ['syllabus.categories'],
      notes: 'Real DITL English syllabus photo (ground-truth approximate).',
      expected: proposal(
        'S12',
        'syllabus',
        [
          field('syllabus.engine', 'weighted_percent_inside', 0.6, 'weights', 'needs_review'),
        ],
        {
          overall_confidence: 0.55,
          _eval: { real_photo: true, soft_match: true },
        },
      ),
    },
  ];
}

function main() {
  ensureDir(OUT);
  const chrome = process.env.SKIP_RENDER === '1' ? null : findChrome();
  if (!chrome) {
    console.error('SKIP_RENDER or no Chrome — writing HTML/expected only.');
  } else {
    console.log('Chrome:', chrome);
  }

  const all = [...CASES, ...realPhotoCases()];
  const manifest = [];

  for (const c of all) {
    const dir = writeCaseDir(c, {});
    const entry = {
      id: c.id,
      kind: c.kind === 'handbook' ? 'handbook' : c.kind === 'negative' ? 'negative' : 'syllabus',
      files: ['expected.json', 'notes.md'],
      fields_exercised: c.fields || [],
      srs_refs: c.srs || [],
      photo: Boolean(c.photo),
    };

    if (c.copyFrom) {
      if (!fs.existsSync(c.copyFrom)) {
        console.warn('Missing real photo', c.copyFrom);
      } else {
        const dest = path.join(dir, 'photo.jpg');
        fs.copyFileSync(c.copyFrom, dest);
        entry.files.push('photo.jpg');
        // also as clean reference
        fs.copyFileSync(c.copyFrom, path.join(dir, 'clean.png'));
        entry.files.push('clean.png');
      }
    } else if (c.html) {
      const htmlPath = path.join(dir, 'source.html');
      entry.files.push('source.html');
      const pngPath = path.join(dir, 'clean.png');
      if (chrome) {
        try {
          renderHtmlToPng(chrome, htmlPath, pngPath);
          entry.files.push('clean.png');
          if (c.photo) {
            const photoPath = path.join(dir, 'photo.jpg');
            makePhotoVariant(pngPath, photoPath);
            if (fs.existsSync(photoPath)) entry.files.push('photo.jpg');
          }
        } catch (err) {
          console.warn(String(err.message || err));
        }
      }
    }

    manifest.push(entry);
    console.log('wrote', c.id);
  }

  write(
    path.join(OUT, 'MANIFEST.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: manifest.length,
        cases: manifest,
      },
      null,
      2,
    ) + '\n',
  );

  write(
    path.join(OUT, 'README.md'),
    `# Gradebook ingest fixture corpus

Reusable evaluation set for SRS §11.19 / §11.20 and FR-AI-*.

## Layout

Each case folder (\`S01\`…\`S12\`, \`H01\`…\`H10\`, \`N01\`…\`N03\`):

- \`source.html\` — printable single-page source (generated cases)
- \`clean.png\` — rendered page
- \`photo.jpg\` — photo-like or real camera capture (when present)
- \`expected.json\` — ground truth IngestProposal shape
- \`eval-meta.json\` — scorer hints (weights_sum, negative, numeric_chart, …)
- \`notes.md\` — what the case exercises

Root:

- \`MANIFEST.json\` — index
- \`runs/<YYYYMMDD-HHMM>/\` — live edge responses + \`score.json\`

## Regenerate images

\`\`\`bash
node scripts/gen-gradebook-ingest-fixtures.mjs
\`\`\`

## Run live evaluation

\`\`\`bash
npm run eval:ingest
# or
node scripts/eval-gradebook-ingest.mjs
\`\`\`

Requires \`EXPO_PUBLIC_SUPABASE_URL\`, \`EXPO_PUBLIC_SUPABASE_ANON_KEY\`, and personas in \`~/.kelyra/ui-personas.json\` (teacher for syllabi, office for handbooks). Never print secrets.

## Add a case

1. Append a case object in \`scripts/gen-gradebook-ingest-fixtures.mjs\`.
2. Re-run the generator.
3. Re-run \`npm run eval:ingest\` and diff \`runs/\` score.json.
`,
  );

  console.log('Done. Cases:', manifest.length, '→', OUT);
}

main();
