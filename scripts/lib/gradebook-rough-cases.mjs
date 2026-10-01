/**
 * LIGHT rough gradebook-ingest set (P01–P05 phone photos, C01–C02 scans, A01 pen-annotated
 * printout, N04 rough negative). Imported by scripts/gen-gradebook-ingest-fixtures.mjs.
 * All schools, teachers and policies are synthetic.
 *
 * Each case carries in expected._eval (→ eval-meta.json):
 *   rough: true            → scripts/degrade-gradebook-fixtures.mjs writes rough.jpg (+ visibility.json)
 *   rough_kind             → phone | scan | annotated | negative (eval bucket)
 *   effects: [...]         → human-readable list of combined degradations
 *   viewport / dsf         → render size for source.html (render-gradebook-ingest-pngs.mjs)
 *   degrade: {...}         → seeded spec for the degrader (same schema as the roster degrader, + scan)
 *   rough_gt: {path: s}    → honest GT for rough.jpg only; s = absent | uncertain
 *       absent:    not legible in rough.jpg; a confident value = hallucinated
 *       uncertain: partly legible; correct value OR a review flag both pass, a confident wrong value fails
 * expected.json always describes the CLEAN page; eval also sends clean.png as a same-content control.
 * HTML marks GT regions with data-gt-field (field path) + data-gt-for (target name) → layout.json.
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const gt = (path, name, html, tag = 'span') => `<${tag} data-gt-field="${path}" data-gt-for="${name}">${html}</${tag}>`;

const SPREAD_CSS = `body{margin:0;background:#d9d6cf;width:1680px;height:1100px;display:flex;gap:0}
.pg{width:820px;height:1080px;margin:10px 10px;background:#fbfaf6;box-sizing:border-box;padding:34px 38px;font-family:Georgia,serif;color:#161616}
.pg h1{font-size:23px;margin:0 0 4px}.pg h2{font-size:16px;margin:20px 0 8px;border-bottom:1px solid #bbb;padding-bottom:4px}
.meta{color:#555;font-size:12.5px;margin-bottom:14px}table{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0}
td,th{border:1px solid #999;padding:7px 9px;text-align:left}th{background:#eee}p,li{font-size:14px;line-height:1.5}
.foot{position:relative;top:40px;font-size:11px;color:#777;text-align:center}`;

const HAND_CSS = `.ink{font-family:"Bradley Hand","Noteworthy","Marker Felt",cursive;color:#1f3aa8;font-weight:700}
.strike{position:relative;display:inline-block}
.strike::after{content:"";position:absolute;left:-4px;right:-4px;top:52%;border-top:2.6px solid #1f3aa8;transform:rotate(-7deg)}
.strike2::after{content:"";position:absolute;left:-3px;right:-3px;top:40%;border-top:2.4px solid #1f3aa8;transform:rotate(4deg)}`;

export function buildRoughCases({ page, field, proposal }) {
  const cases = [];

  // ---------------- P01: steep angle phone photo (all legible) ----------------
  cases.push({
    id: 'P01',
    kind: 'syllabus',
    style: 'classic',
    srs: ['§11.19', 'FR-AI-05', 'rough'],
    fields: ['syllabus.categories', 'syllabus.late_rule', 'syllabus.missing_rule'],
    notes: 'Rough phone photo: steep keystone + 8° rotation on a wood desk, mild glare away from text. Everything still legible → full GT.',
    html: page(
      'classic',
      'P01',
      `<h1>Chemistry — Course Syllabus</h1>
<div class="meta">Mr. Okafor · Room 118 · 2026–27</div>
<h2>Grade categories</h2>
${gt('syllabus.categories', 'cats', `<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td>45%</td></tr><tr><td>Labs</td><td>30%</td></tr>
<tr><td>Homework</td><td>15%</td></tr><tr><td>Quizzes</td><td>10%</td></tr></table>`, 'div')}
<h2>Late and missing work</h2>
<p class="note">${gt('syllabus.late_rule', 'late', 'Late work loses <strong>5% per day</strong>, down to a floor of 50%.')}</p>
<p class="note">${gt('syllabus.missing_rule', 'missing', 'Missing work is entered as a <strong>zero</strong> until it is turned in.')}</p>
<h2>Lab safety</h2>
<ul><li>Goggles on whenever chemicals are out.</li><li>Closed-toe shoes on lab days.</li><li>Report every spill to Mr. Okafor.</li></ul>`,
    ),
    expected: proposal(
      'P01',
      'syllabus',
      [
        field('syllabus.categories', [
          { key: 'tests', label: 'Tests', weight_percent: 45 },
          { key: 'labs', label: 'Labs', weight_percent: 30 },
          { key: 'homework', label: 'Homework', weight_percent: 15 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 10 },
        ], 0.9, 'Tests 45%'),
        field('syllabus.late_rule', { type: 'per_day', amount: 5, unit: 'percent', floor_pct: 50 }, 0.9, '5% per day, down to a floor of 50%'),
        field('syllabus.missing_rule', { type: 'zero' }, 0.9, 'entered as a zero'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'phone',
          weights_sum: 100,
          effects: ['keystone', 'rotation', 'wood_desk', 'glare_offtext', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: { 'syllabus.late_rule': 'uncertain' }, // small blurred text at the far edge of the keystone
          degrade: {
            seed: 3101,
            frame: [1200, 1600],
            background: 'wood',
            scale: 0.84,
            rotate: 8,
            keystone: { top: 0.74, bottom: 1.04 },
            jitter: 0.004,
            offset: [0.01, 0.02],
            glare: [{ cx: 0.78, cy: 0.88, rx: 0.07, ry: 0.05, strength: 1.2 }],
            light: { gradient: [0.4, 0.3], amount: 0.18, vignette: 0.3 },
            defocus: 0.6,
            noise: 4,
            jpeg: 68,
          },
        },
      },
    ),
  });

  // ---------------- P02: glare hotspot over the late-work line ----------------
  cases.push({
    id: 'P02',
    kind: 'syllabus',
    style: 'modern',
    srs: ['§11.19', 'FR-AI-05', 'rough'],
    fields: ['syllabus.categories', 'syllabus.late_rule', 'syllabus.missing_rule', 'syllabus.retake'],
    notes: 'Rough phone photo: overhead-light glare blows out the late-work line. Late rule is absent in rough.jpg; weights/missing/retake legible.',
    html: page(
      'modern',
      'P02',
      `<h1>English 10 <span class="badge">Grading policy</span></h1>
<div class="meta">Ms. Whitfield · Periods 2, 4, 6</div>
<h2>How grades are weighted</h2>
${gt('syllabus.categories', 'cats', `<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Essays</td><td>40%</td></tr><tr><td>Reading Quizzes</td><td>25%</td></tr>
<tr><td>Classwork</td><td>20%</td></tr><tr><td>Participation</td><td>15%</td></tr></table>`, 'div')}
<h2>Deadlines</h2>
<p>${gt('syllabus.late_rule', 'late', 'Late essays lose 10% per day.')}</p>
<p>${gt('syllabus.missing_rule', 'missing', 'Missing work is recorded as a 50 until it is turned in.')}</p>
<h2>Retakes</h2>
<p>${gt('syllabus.retake', 'retake', 'Reading quiz retakes: the new score replaces the old score.')}</p>
<h2>Supplies</h2><p>Composition notebook, two pens, independent reading book.</p>`,
    ),
    expected: proposal(
      'P02',
      'syllabus',
      [
        field('syllabus.categories', [
          { key: 'essays', label: 'Essays', weight_percent: 40 },
          { key: 'reading_quizzes', label: 'Reading Quizzes', weight_percent: 25 },
          { key: 'classwork', label: 'Classwork', weight_percent: 20 },
          { key: 'participation', label: 'Participation', weight_percent: 15 },
        ], 0.9, 'Essays 40%'),
        field('syllabus.late_rule', { type: 'per_day', amount: 10, unit: 'percent' }, 0.9, 'lose 10% per day'),
        field('syllabus.missing_rule', { type: 'floor', floor: 50 }, 0.9, 'recorded as a 50'),
        field('syllabus.retake', { method: 'replace', attempts: 1 }, 0.85, 'replaces the old score'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'phone',
          weights_sum: 100,
          effects: ['glare_on_late_rule', 'mild_keystone', 'hand_shadow', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: { 'syllabus.late_rule': 'absent' },
          degrade: {
            seed: 3202,
            frame: [1200, 1600],
            background: 'laminate',
            scale: 0.88,
            rotate: -3,
            keystone: { top: 0.93, bottom: 1.0 },
            jitter: 0.003,
            glare: [{ target: 'late', fx: 0.55, fy: 0.4, rx: 0.2, ry: 0.014, strength: 2.4 }],
            shadow: { cx: 0.92, cy: 0.98, rx: 0.16, ry: 0.1, angle: -30, armTo: [1.1, 1.2], strength: 0.4 },
            light: { gradient: [-0.2, 0.4], amount: 0.14, vignette: 0.25 },
            noise: 4,
            jpeg: 66,
          },
        },
      },
    ),
  });

  // ---------------- P03: handbook page curl near the right edge ----------------
  cases.push({
    id: 'P03',
    kind: 'handbook',
    style: 'handbook',
    srs: ['§11.20', 'FR-AI-05', 'rough'],
    fields: ['scale.bands', 'scale.passing_pct'],
    notes: 'Rough phone photo of a bound handbook page: page curl squeezes the right-hand Range column of the scale table; passing line is on the left and legible.',
    html: page(
      'handbook',
      'P03',
      `<div class="header"><h1>MILLBROOK HIGH SCHOOL STUDENT HANDBOOK</h1><div class="sub">Section 6 · Grading and Reporting · page 14</div></div>
<h2>Grading scale</h2>
<p>All courses in grades 9–12 report a numeric average and the letter grade below.</p>
<table><tr><th>Letter</th><th>Meaning</th><th style="text-align:right">Range</th></tr>
<tr><td>A</td><td>Excellent mastery of course standards</td><td style="text-align:right">${gt('scale.bands', 'bandA', '90–100')}</td></tr>
<tr><td>B</td><td>Above-average mastery</td><td style="text-align:right">${gt('scale.bands', 'bandB', '80–89')}</td></tr>
<tr><td>C</td><td>Average mastery</td><td style="text-align:right">${gt('scale.bands', 'bandC', '75–79')}</td></tr>
<tr><td>D</td><td>Minimum mastery</td><td style="text-align:right">${gt('scale.bands', 'bandD', '70–74')}</td></tr>
<tr><td>F</td><td>Not passing</td><td style="text-align:right">${gt('scale.bands', 'bandF', '0–69')}</td></tr></table>
<p>${gt('scale.passing_pct', 'passing', 'The lowest passing average for course credit is <strong>70</strong>.')}</p>
<h2>Report cards</h2>
<p>Report cards are issued at the end of each grading period. Parents may view averages in the parent portal at any time.</p>`,
    ),
    expected: proposal(
      'P03',
      'school_policy',
      [
        field('scale.bands', [
          { letter: 'A', min: 90, max: 100 },
          { letter: 'B', min: 80, max: 89 },
          { letter: 'C', min: 75, max: 79 },
          { letter: 'D', min: 70, max: 74 },
          { letter: 'F', min: 0, max: 69 },
        ], 0.9, 'A 90–100'),
        field('scale.passing_pct', 70, 0.9, 'lowest passing average for course credit is 70'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'phone',
          effects: ['page_curl_right', 'binding_shadow', 'keystone', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: { 'scale.bands': 'uncertain' },
          // passing line legible → companion fields the scorer should not count as invented
          companions: ['credit.passing_threshold'],
          degrade: {
            seed: 3303,
            frame: [1200, 1600],
            background: 'dark_desk',
            scale: 0.9,
            rotate: 2,
            keystone: { top: 0.95, bottom: 1.02, left: 1.0, right: 0.96 },
            curl: { side: 'right', width: 0.2, angle: 84, depth: 0.6, lift: 22, bulge: 0.08, occlude: 0.7 },
            light: { gradient: [0.5, 0.1], amount: 0.2, vignette: 0.3 },
            noise: 4,
            jpeg: 66,
          },
        },
      },
    ),
  });

  // ---------------- P04: two-page spread photo, page 2 cut off ----------------
  const spread = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SPREAD_CSS}</style></head><body>
<div class="pg">
<h1>U.S. History — Course Syllabus</h1>
<div class="meta">Mr. Delgado · Room 207 · page 1 of 2</div>
<h2>How your grade is calculated</h2>
${gt('syllabus.categories', 'cats', `<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Unit Tests</td><td>40%</td></tr><tr><td>Projects</td><td>25%</td></tr>
<tr><td>Quizzes</td><td>20%</td></tr><tr><td>Classwork</td><td>15%</td></tr></table>`, 'div')}
<p>Late work, missing work, and retake rules are on page 2.</p>
<h2>Units</h2><ul><li>Colonial America</li><li>Revolution and Constitution</li><li>Westward Expansion</li><li>Civil War and Reconstruction</li></ul>
<div class="foot">— 1 —</div>
</div>
<div class="pg">
<h1>Course policies</h1>
<div class="meta">U.S. History · page 2 of 2</div>
<h2>Late work</h2>
<p>${gt('syllabus.late_rule', 'late', 'Late work is accepted up to 3 school days after the due date and loses 10% per day.')}</p>
<h2>Missing work</h2>
<p>${gt('syllabus.missing_rule', 'missing', 'Work still missing after 3 days is recorded as a zero.')}</p>
<h2>Retakes</h2>
<p>${gt('syllabus.retake', 'retake', 'One retake per unit test. The higher score counts, up to an 85.')}</p>
<div class="foot">— 2 —</div>
</div>
</body></html>`;
  cases.push({
    id: 'P04',
    kind: 'syllabus',
    style: 'spread',
    srs: ['§11.19', 'FR-AI-05', 'FR-AI-13', 'rough'],
    fields: ['syllabus.categories', 'syllabus.late_rule', 'syllabus.missing_rule', 'syllabus.retake'],
    notes: 'Rough phone photo of an open two-page packet: page 1 (weights) in frame, page 2 (late / missing / retake rules) mostly cut off the right edge. Page-2 rules are absent in rough.jpg; the clean control has both pages.',
    html: spread,
    expected: proposal(
      'P04',
      'syllabus',
      [
        field('syllabus.categories', [
          { key: 'unit_tests', label: 'Unit Tests', weight_percent: 40 },
          { key: 'projects', label: 'Projects', weight_percent: 25 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
          { key: 'classwork', label: 'Classwork', weight_percent: 15 },
        ], 0.9, 'Unit Tests 40%'),
        field('syllabus.late_rule', { type: 'per_day', amount: 10, unit: 'percent' }, 0.85, 'loses 10% per day'),
        field('syllabus.missing_rule', { type: 'zero' }, 0.85, 'recorded as a zero'),
        field('syllabus.retake', { method: 'higher_of', cap: 85 }, 0.85, 'higher score counts, up to an 85'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'phone',
          multi_page: true,
          weights_sum: 100,
          effects: ['two_page_spread', 'page2_cut_off', 'center_fold', 'keystone', 'jpeg'],
          viewport: { w: 1680, h: 1100 },
          dsf: 1.25,
          rough_gt: {
            'syllabus.late_rule': 'absent',
            'syllabus.missing_rule': 'absent',
            'syllabus.retake': 'absent',
          },
          degrade: {
            seed: 3404,
            frame: [1300, 1600],
            background: 'wood',
            scale: 1.706,
            offset: [0.375, 0.0],
            rotate: -2,
            keystone: { top: 0.95, bottom: 1.02 },
            creases: [{ at: [0.5, 0.5], angle: 90, dark: 0.45, width: 6, shift: 0, panel: 0.93 }],
            light: { gradient: [0.3, 0.3], amount: 0.15, vignette: 0.3 },
            noise: 4,
            jpeg: 68,
          },
        },
      },
    ),
  });

  // ---------------- P05: low light ----------------
  cases.push({
    id: 'P05',
    kind: 'syllabus',
    style: 'classic',
    srs: ['§11.19', 'FR-AI-05', 'rough'],
    fields: ['syllabus.categories', 'syllabus.late_rule', 'syllabus.retake'],
    notes: 'Rough phone photo in a dim classroom: underexposed, warm cast, sensor noise, slight hand shake. Text dark but legible.',
    html: page(
      'classic',
      'P05',
      `<h1>Spanish I — Syllabus</h1>
<div class="meta">Sra. Benítez · Room 031 · Fall 2026</div>
<h2>Cómo se calcula tu nota / How your grade works</h2>
${gt('syllabus.categories', 'cats', `<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Major grades (exams, projects)</td><td>60%</td></tr><tr><td>Minor grades (practice, quizzes)</td><td>40%</td></tr></table>`, 'div')}
<h2>Late work</h2>
<p class="note">${gt('syllabus.late_rule', 'late', 'Late work loses a flat 20 points and is accepted until the unit exam.')}</p>
<h2>Retakes</h2>
<p class="note">${gt('syllabus.retake', 'retake', 'One retake per exam. The higher score counts, capped at 80.')}</p>
<ul><li>Vocabulary quizzes every Friday</li><li>Bring your cuaderno daily</li></ul>`,
    ),
    expected: proposal(
      'P05',
      'syllabus',
      [
        field('syllabus.categories', [
          { key: 'major', label: 'Major', weight_percent: 60 },
          { key: 'minor', label: 'Minor', weight_percent: 40 },
        ], 0.9, 'Major grades 60%'),
        field('syllabus.late_rule', { type: 'flat', amount: 20, unit: 'points' }, 0.85, 'flat 20 points'),
        field('syllabus.retake', { method: 'higher_of', cap: 80 }, 0.85, 'higher score counts, capped at 80'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'phone',
          low_light: true,
          weights_sum: 100,
          effects: ['low_light', 'warm_cast', 'sensor_noise', 'motion_blur', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: {},
          degrade: {
            seed: 3505,
            frame: [1200, 1600],
            background: 'fabric',
            scale: 0.86,
            rotate: -5,
            keystone: { top: 0.9, bottom: 1.0 },
            jitter: 0.004,
            light: { gradient: [0.6, 0.5], amount: 0.3, vignette: 0.55 },
            motion: { len: 2.5, angle: 20 },
            lowlight: { exposure: 0.5, gamma: 1.2, cast: [1.08, 0.95, 0.72], noise: 9 },
            jpeg: 58,
          },
        },
      },
    ),
  });

  // ---------------- C01: skewed faint scan ----------------
  cases.push({
    id: 'C01',
    kind: 'syllabus',
    style: 'classic',
    srs: ['§11.19', 'FR-AI-05', 'rough'],
    fields: ['syllabus.categories', 'syllabus.late_rule', 'syllabus.missing_rule'],
    notes: 'Messy scan: 3.5° skew, faint washed-out toner, grey photocopy speckle and a lid shadow. Legible with effort.',
    html: page(
      'classic',
      'C01',
      `<h1>Geometry — Grading Policy</h1>
<div class="meta">Mrs. Lindqvist · Math Department</div>
<h2>Weights</h2>
${gt('syllabus.categories', 'cats', `<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td>50%</td></tr><tr><td>Quizzes</td><td>25%</td></tr>
<tr><td>Homework</td><td>15%</td></tr><tr><td>Notebook</td><td>10%</td></tr></table>`, 'div')}
<h2>Late and missing work</h2>
<p class="note">${gt('syllabus.late_rule', 'late', 'Late homework: 10 points off per day.')}</p>
<p class="note">${gt('syllabus.missing_rule', 'missing', 'Missing assignments are recorded as a zero.')}</p>
<h2>Materials</h2><ul><li>Compass and protractor</li><li>Graph-paper notebook</li></ul>`,
    ),
    expected: proposal(
      'C01',
      'syllabus',
      [
        field('syllabus.categories', [
          { key: 'tests', label: 'Tests', weight_percent: 50 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 25 },
          { key: 'homework', label: 'Homework', weight_percent: 15 },
          { key: 'notebook', label: 'Notebook', weight_percent: 10 },
        ], 0.9, 'Tests 50%'),
        field('syllabus.late_rule', { type: 'per_day', amount: 10, unit: 'points' }, 0.85, '10 points off per day'),
        field('syllabus.missing_rule', { type: 'zero' }, 0.9, 'recorded as a zero'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'scan',
          weights_sum: 100,
          effects: ['skew', 'faint_toner', 'photocopy_speckle', 'lid_shadow', 'grayscale', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: { 'syllabus.late_rule': 'uncertain' }, // faint toner on the late line
          degrade: {
            seed: 4101,
            scan: { dpi_scale: 1.0, skew: 3.5, faint: 0.4, gamma: 0.85, toner: 0.1, speckle: 0.0035, streaks: 2, edge_shadow: 'left', blur: 0.8, gray: true, crop: [0.0, 0.0, 0.02, 0.0] },
            noise: 6,
            jpeg: 60,
          },
        },
      },
    ),
  });

  // ---------------- C02: noisy multi-generation photocopy (handbook) ----------------
  cases.push({
    id: 'C02',
    kind: 'handbook',
    style: 'handbook',
    srs: ['§11.20', 'FR-AI-05', 'rough'],
    fields: ['calendar.template', 'rollup.preset', 'scale.bands', 'scale.passing_pct'],
    notes: 'Messy scan of a 3rd-generation photocopy: heavy toner noise, dark streaks, blotchy background, slight skew. Still legible.',
    html: page(
      'handbook',
      'C02',
      `<div class="header"><h1>RIVERBEND ISD — SECONDARY GRADING GUIDELINES</h1><div class="sub">Board Policy EIA (Local) · Adopted 2025</div></div>
<h2>Grading periods and semester grades</h2>
<p>${gt('rollup.preset', 'rollup', 'The school year has four nine-weeks grading periods. Semester grade = 40% first nine weeks + 40% second nine weeks + 20% semester exam.')}</p>
<h2>Grading scale</h2>
${gt('scale.bands', 'scale', `<table><tr><th>Letter</th><th>Range</th></tr>
<tr><td>A</td><td>90–100</td></tr><tr><td>B</td><td>80–89</td></tr><tr><td>C</td><td>70–79</td></tr><tr><td>F</td><td>Below 70</td></tr></table>`, 'div')}
<p>${gt('scale.passing_pct', 'passing', 'A semester average of 70 or higher is required to earn credit.')}</p>
<h2>Parent communication</h2>
<p>Progress reports are sent at the midpoint of each nine weeks.</p>`,
    ),
    expected: proposal(
      'C02',
      'school_policy',
      [
        field('calendar.template', 'nine_weeks', 0.9, 'four nine-weeks grading periods'),
        field('rollup.preset', '40/40/20', 0.9, '40% first nine weeks + 40% second nine weeks + 20% semester exam'),
        field('scale.bands', [
          { letter: 'A', min: 90, max: 100 },
          { letter: 'B', min: 80, max: 89 },
          { letter: 'C', min: 70, max: 79 },
          { letter: 'F', min: 0, max: 69 },
        ], 0.85, 'A 90–100'),
        field('scale.passing_pct', 70, 0.85, '70 or higher is required to earn credit'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'scan',
          effects: ['photocopy_3rd_gen', 'toner_noise', 'dark_streaks', 'blotchy_background', 'skew', 'grayscale', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: { 'scale.bands': 'uncertain', 'scale.passing_pct': 'uncertain' }, // speckle on 70–79 / “70”
          companions: ['calendar.period_model', 'rollup.exam_enabled', 'credit.passing_threshold'],
          degrade: {
            seed: 4202,
            scan: { dpi_scale: 1.0, skew: -1.8, faint: 0.25, gamma: 1.15, toner: 0.22, speckle: 0.009, streaks: 5, blotch: 0.12, edge_shadow: 'top', blur: 1.1, gray: true, threshold: 0.35, crop: [0.0, 0.01, 0.0, 0.0] },
            noise: 9,
            jpeg: 55,
          },
        },
      },
    ),
  });

  // ---------------- A01: teacher pen edits override printed weights ----------------
  cases.push({
    id: 'A01',
    kind: 'syllabus',
    style: 'classic',
    srs: ['§11.19', 'FR-AI-05', 'FR-AI-21', 'rough'],
    fields: ['syllabus.categories', 'syllabus.late_rule'],
    notes: 'Handwritten-annotated printout (phone photo): teacher crossed out printed Tests 40% → 50%, Labs 30% → 20%, and late −10%/day → −5%/day in blue pen. GT = the pen values.',
    html: page(
      'classic',
      'A01',
      `<style>${HAND_CSS}</style>
<div class="ink" style="position:absolute;left:520px;top:18px;font-size:22px;transform:rotate(-4deg)">Updated 9/14 — use these!</div>
<h1>Biology — Grading</h1>
<div class="meta">Dr. Asante · Room 122</div>
<h2>Category weights</h2>
${gt('syllabus.categories', 'cats', `<table><tr><th>Category</th><th>Weight</th></tr>
<tr><td>Tests</td><td><span class="strike">40%</span> <span class="ink" style="font-size:24px;margin-left:14px;display:inline-block;transform:rotate(-6deg)">50%</span></td></tr>
<tr><td>Quizzes</td><td>20%</td></tr>
<tr><td>Labs</td><td><span class="strike strike2">30%</span> <span class="ink" style="font-size:24px;margin-left:14px;display:inline-block;transform:rotate(3deg)">20%</span></td></tr>
<tr><td>Participation</td><td>10%</td></tr></table>`, 'div')}
<h2>Late work</h2>
<p class="note">${gt('syllabus.late_rule', 'late', `Late work: <span class="strike">−10% per day</span> <span class="ink" style="font-size:22px;margin-left:10px;display:inline-block;transform:rotate(-3deg)">−5% / day</span>`)}</p>
<h2>Lab notebook</h2><p class="note">Keep every lab write-up in your composition notebook.</p>`,
    ),
    expected: proposal(
      'A01',
      'syllabus',
      [
        field('syllabus.categories', [
          { key: 'tests', label: 'Tests', weight_percent: 50 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
          { key: 'labs', label: 'Labs', weight_percent: 20 },
          { key: 'participation', label: 'Participation', weight_percent: 10 },
        ], 0.8, 'Tests 40% → 50%'),
        field('syllabus.late_rule', { type: 'per_day', amount: 5, unit: 'percent' }, 0.8, '−5% / day'),
      ],
      {
        _eval: {
          rough: true,
          rough_kind: 'annotated',
          weights_sum: 100,
          // printed values the model must NOT use (scored as stale_printed when returned)
          stale_printed: { 'syllabus.categories': { Tests: 40, Labs: 30 }, 'syllabus.late_rule': { amount: 10 } },
          effects: ['pen_strikeouts', 'pen_overrides', 'mild_keystone', 'jpeg'],
          viewport: { w: 840, h: 1100 },
          dsf: 1.5,
          rough_gt: {},
          degrade: {
            seed: 5101,
            frame: [1200, 1600],
            background: 'white_desk',
            scale: 0.88,
            rotate: 2.5,
            keystone: { top: 0.94, bottom: 1.0 },
            jitter: 0.003,
            light: { gradient: [0.3, -0.3], amount: 0.12, vignette: 0.25 },
            noise: 4,
            jpeg: 70,
          },
        },
      },
    ),
  });

  // ---------------- N04: rough negative (fundraiser flyer with % numbers) ----------------
  cases.push({
    id: 'N04',
    kind: 'negative',
    style: 'modern',
    srs: ['FR-AI-13', 'rough'],
    fields: [],
    notes: 'Rough negative: crooked phone photo (glare + shadow) of a PTO fundraiser flyer full of percentages and "grades K–5". Not a grading policy — must return empty or block.',
    html: page(
      'modern',
      'N04',
      `<h1>Fall Fundraiser <span class="badge">PTO</span></h1>
<div class="meta">Oak Hollow Elementary · Oct 5–23</div>
<h2>We are 60% of the way to our goal!</h2>
<table><tr><th>Grade</th><th>Share of sales so far</th></tr>
<tr><td>Grades K–2</td><td>40%</td></tr><tr><td>Grades 3–4</td><td>35%</td></tr><tr><td>Grade 5</td><td>25%</td></tr></table>
<h2>Prize levels</h2>
<ul><li>Sell 10 items → glow pen</li><li>Sell 25 items → pizza party for your class</li><li>Late order forms: 10% shipping fee per order</li></ul>
<p>Questions? Email the PTO. Thank you for supporting field trips!</p>`,
    ),
    expected: proposal('N04', 'syllabus', [], {
      document_kind_guess: 'not_a_policy',
      overall_confidence: 0.2,
      warnings: [{ code: 'not_a_grading_document', message: 'Fundraiser flyer, not a grading policy.', severity: 'block' }],
      _eval: {
        rough: true,
        rough_kind: 'negative',
        negative: true,
        expect_empty_or_flag: true,
        effects: ['crooked', 'glare', 'hand_shadow', 'jpeg'],
        viewport: { w: 840, h: 1100 },
        dsf: 1.5,
        rough_gt: {},
        degrade: {
          seed: 6104,
          frame: [1200, 1600],
          background: 'carpet',
          scale: 0.85,
          rotate: -11,
          keystone: { top: 0.86, bottom: 1.02 },
          glare: [{ cx: 0.35, cy: 0.3, rx: 0.12, ry: 0.06, strength: 1.4 }],
          shadow: { cx: 0.1, cy: 1.0, rx: 0.2, ry: 0.12, angle: 30, armTo: [-0.2, 1.3], strength: 0.45 },
          light: { gradient: [0.4, 0.4], amount: 0.2, vignette: 0.3 },
          noise: 5,
          jpeg: 62,
        },
      },
    }),
  });

  return cases;
}
