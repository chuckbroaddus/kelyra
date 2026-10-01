/**
 * Rough phone-photo + handwritten roster cases (R19–R33, N04–N05).
 * Imported by scripts/gen-roster-ingest-fixtures.mjs. All names are synthetic.
 *
 * Each case may carry:
 *   rough: true          → scripts/degrade-roster-fixtures.mjs writes rough.jpg from clean.png
 *   effects: [...]       → human/manifest list of the degradations combined
 *   degrade: {...}       → seeded spec consumed by the degrade script
 *   hand: true           → handwritten source
 * Ground truth honesty for the degraded image lives in expected._eval.rough_gt:
 *   absent: names not visible at all in rough.jpg (extracting them = invented)
 *   uncertain: names partly legible (not penalised if missing; fine if read)
 *   uncertain_fields: { name: [field] } values cut/occluded (null OK; a wrong value = invented)
 * Crossed-out names: expected._eval.excluded_names (extracting one = extra, not hallucination).
 * HTML marks GT boxes with data-gt-name / data-gt-field / data-gt-x so render writes layout.json.
 */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const j = (r, amp) => ((r() * 2 - 1) * amp).toFixed(2);

// ---------- printed helpers ----------
function td(value, field, forName) {
  if (!field) return `<td>${esc(value ?? '')}</td>`;
  return `<td><span data-gt-field="${field}" data-gt-for="${esc(forName)}">${esc(value ?? '')}</span></td>`;
}
function nameTd(display, gtName) {
  return `<td><span data-gt-name="${esc(gtName)}">${esc(display)}</span></td>`;
}

// ---------- handwriting helpers ----------
const HANDS = {
  bradley: "'Bradley Hand','Segoe Print','Comic Sans MS',cursive",
  noteworthy: "'Noteworthy','Chalkboard SE','Comic Sans MS',cursive",
  snell: "'Snell Roundhand','Apple Chancery',cursive",
  chancery: "'Apple Chancery','Snell Roundhand',cursive",
  savoye: "'Savoye LET','Snell Roundhand',cursive",
  marker: "'Marker Felt','Chalkboard SE',cursive",
  chalk: "'Chalkboard SE','Chalkboard','Comic Sans MS',cursive",
  comic: "'Comic Sans MS','Chalkboard SE',cursive",
};
const INK = { blue: '#23408e', black: '#1d1d1f', pencil: '#5e5e62', red: '#b3261e', green: '#2e6b3a', purple: '#4b2c83' };

/** Per-character jittered handwriting (word-level only for cursive so joins stay intact). */
function hand(text, r, o = {}) {
  const jy = o.jy ?? 1.6;
  const rot = o.rot ?? 3;
  const sz = o.sz ?? 0.07;
  if (o.cursive) {
    return text
      .split(' ')
      .map((w) => `<span class="c" style="transform:translateY(${j(r, jy)}px) rotate(${j(r, rot / 2)}deg);font-size:${(1 + (r() * 2 - 1) * sz).toFixed(3)}em">${esc(w)}</span>`)
      .join('<span class="sp"> </span>');
  }
  return [...text]
    .map((ch) =>
      ch === ' '
        ? `<span class="sp" style="display:inline-block;width:${(0.28 + r() * 0.25).toFixed(2)}em"></span>`
        : `<span class="c" style="transform:translateY(${j(r, jy)}px) rotate(${j(r, rot)}deg);font-size:${(1 + (r() * 2 - 1) * sz).toFixed(3)}em">${esc(ch)}</span>`,
    )
    .join('');
}
const SCRIBBLE = `<svg class="x" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0,14 L6,4 L12,16 L19,3 L25,15 L32,4 L38,16 L45,3 L51,15 L58,4 L64,16 L71,3 L77,15 L84,4 L90,16 L97,4 L100,12" fill="none" stroke="currentColor" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>`;
const STRIKE = `<svg class="x" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M-2,12 C30,9 60,11 102,8" fill="none" stroke="currentColor" stroke-width="2.6" vector-effect="non-scaling-stroke"/></svg>`;

const PAPER = {
  lined: `background-color:#fdfcf6;background-image:linear-gradient(to right,transparent 74px,#e9a3a3 74px,#e9a3a3 76px,transparent 76px),repeating-linear-gradient(to bottom,transparent 0,transparent 41px,#a9c8e6 41px,#a9c8e6 42px);background-position:0 0,0 14px`,
  grid: `background-color:#fbfbf7;background-image:repeating-linear-gradient(to right,transparent 0,transparent 27px,#cfdbe8 27px,#cfdbe8 28px),repeating-linear-gradient(to bottom,transparent 0,transparent 27px,#cfdbe8 27px,#cfdbe8 28px)`,
  plain: `background-color:#fbf9f2`,
  legal: `background-color:#fbf3b9;background-image:linear-gradient(to right,transparent 74px,#d98c8c 74px,#d98c8c 75px,transparent 75px,transparent 79px,#d98c8c 79px,#d98c8c 80px,transparent 80px),repeating-linear-gradient(to bottom,transparent 0,transparent 41px,#9bb7cf 41px,#9bb7cf 42px);background-position:0 0,0 14px`,
};
function handPage(paper, inner, extraCss = '') {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0}
body{width:840px;height:1100px;box-sizing:border-box;padding:28px 40px 20px 96px;${PAPER[paper]};overflow:hidden;position:relative}
.hl{height:42px;line-height:42px;white-space:nowrap;position:relative}
.c{display:inline-block}
.nm{position:relative;display:inline-block}
.x{position:absolute;left:-6px;top:20%;width:calc(100% + 12px);height:60%;overflow:visible}
.ins{position:absolute;white-space:nowrap}
.mg{position:absolute;left:14px;font-family:${HANDS.bradley};font-size:18px}
${extraCss}
</style></head><body>
${inner}
</body></html>`;
}
/** One handwritten line. item: {name, display?, kind:'name'|'crossed'|'note', id?, font, ink, size, cursive, x:'scribble'|'strike'} */
function handLine(r, it, base) {
  const font = HANDS[it.font || base.font];
  const ink = INK[it.ink || base.ink] || it.ink || base.ink;
  const size = (it.size || base.size) * (1 + (r() * 2 - 1) * 0.06);
  const indent = (it.indent ?? 0) + r() * 16;
  const lineRot = j(r, base.lineRot ?? 0.9);
  const slant = (base.slant ?? 0) + (r() * 2 - 1) * 2;
  const opts = { cursive: it.cursive ?? base.cursive, jy: base.jy, rot: base.rot };
  const prefix = it.prefix ? `<span style="margin-right:10px">${hand(it.prefix, r, opts)}</span>` : '';
  let body;
  const display = it.display || it.name;
  if (it.kind === 'note') {
    body = hand(display, r, opts);
  } else if (it.kind === 'crossed') {
    const xColor = INK[it.xInk] || ink;
    body = `<span class="nm" data-gt-x="${esc(it.name)}">${hand(display, r, opts)}<span style="color:${xColor}">${it.x === 'strike' ? STRIKE : SCRIBBLE}</span></span>`;
  } else {
    body = `<span class="nm" data-gt-name="${esc(it.name)}">${hand(display, r, opts)}</span>`;
  }
  let idHtml = '';
  if (it.id) {
    idHtml = `<span style="position:absolute;left:${base.idX ?? 470}px;font-family:${HANDS[it.idFont || it.font || base.font]}"><span data-gt-field="student_id" data-gt-for="${esc(it.name)}">${hand(it.idDisplay || it.id, r, { jy: 1.2, rot: 3 })}</span></span>`;
  }
  let ins = '';
  if (it.insertAbove) {
    const a = it.insertAbove;
    ins = `<span class="ins" style="left:${a.left ?? 40}px;top:-24px;font-size:0.78em;font-family:${HANDS[a.font || it.font || base.font]};color:${INK[a.ink] || ink};transform:rotate(${a.rot ?? -3}deg)"><span class="nm" data-gt-name="${esc(a.name)}">${hand(a.name, r, { jy: 1, rot: 3 })}</span></span><span class="ins" style="left:${(a.left ?? 40) - 14}px;top:14px;font-size:0.8em;color:${INK[a.ink] || ink}">^</span>`;
  }
  return `<div class="hl" style="padding-left:${indent.toFixed(0)}px;font-family:${font};color:${ink};font-size:${size.toFixed(1)}px;transform:rotate(${lineRot}deg) skewX(${slant.toFixed(1)}deg)">${prefix}${body}${idHtml}${ins}</div>`;
}

export function buildRoughCases({ page, nameRow, expected }) {
  const row = (name, o = {}) => nameRow(name, o);
  const cases = [];

  // ======================= ROUGH PRINTED (R19–R28) =======================
  {
    const S = [
      ['Aria Castellano', 'A3101'], ['Brody Kimura', 'A3102'], ['Celeste Obi', 'A3103'], ['Dashiell Grant', 'A3104'],
      ['Esme Lindqvist', 'A3105'], ['Felix Haddad', 'A3106'], ['Greta Moreau', 'A3107'], ['Hugo Achterberg', 'A3108'],
      ['Ines Valcourt', 'A3109'], ['Jasper Nakamura', 'A3110'],
    ];
    cases.push({
      id: 'R19', kind: 'roster', style: 'classic', rough: true, fields: ['names', 'student_id'],
      effects: ['strong_keystone', 'motion_blur', 'low_light_noise', 'jpeg_artifacts'],
      notes: 'ROUGH: printed roster shot from low angle (strong keystone), hand-shake motion blur, dim room + sensor noise, q45 JPEG.',
      degrade: {
        seed: 1901, background: 'dark_desk', scale: 0.92, rotate: 3, offset: [0, 0.02],
        keystone: { top: 1.06, bottom: 0.74 }, jitter: 0.008,
        motion: { len: 5, angle: 18 }, lowlight: { exposure: 0.68, gamma: 1.2, cast: [1.05, 0.95, 0.78] }, noise: 9,
        light: { gradient: [0.6, -0.4], amount: 0.25, vignette: 0.45 }, jpeg: 45,
      },
      html: page('classic', `<h1>Period 5 · Chemistry</h1>
<div class="meta">Mr. Osei · Lab 3 · Fall 2026 · Class roster</div>
<table><tr><th>#</th><th>Student name</th><th>Student ID</th></tr>
${S.map(([n, id], i) => `<tr><td>${i + 1}</td>${nameTd(n, n)}${td(id, 'student_id', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R19', 'roster', S.map(([n, id]) => row(n, { student_id: id }))),
    });
  }
  {
    const S = [
      ['Kenji Ortiz-Baird', 'K201', '10'], ['Liesl Varga', 'K202', '10'], ['Marcus Oyelaran', 'K203', '10'], ['Nadia Petrov', 'K204', '11'],
      ['Orion Falk', 'K205', '10'], ['Paloma Reyes', 'K206', '11'], ['Quincy Adebayo', 'K207', '10'], ['Rosalind Teague', 'K208', '11'],
      ['Silas Ferreira', 'K209', '10'],
    ];
    cases.push({
      id: 'R20', kind: 'roster', style: 'modern', rough: true, fields: ['names', 'student_id', 'grade'],
      effects: ['rotation_14deg', 'glare_hotspot', 'jpeg_artifacts'],
      notes: 'ROUGH: glossy handout rotated ~-14°, overhead-light glare hotspot washing out two rows, q55 JPEG.',
      degrade: {
        seed: 2002, background: 'wood', scale: 0.78, rotate: -14, offset: [0.01, 0],
        keystone: { top: 0.93 }, jitter: 0.004,
        glare: [{ target: 'Marcus Oyelaran', fx: 0.6, fy: 1.0, rx: 0.075, ry: 0.03, angle: -14, strength: 1.9 }],
        light: { gradient: [-0.3, 0.5], amount: 0.15, vignette: 0.3 }, noise: 5, jpeg: 55,
      },
      html: page('modern', `<h1>Biology 10 · Section B roster</h1>
<div class="meta">Ms. Adeyemi · Room 207</div>
<table><tr><th>Name</th><th>Student ID</th><th>Grade</th></tr>
${S.map(([n, id, g]) => `<tr>${nameTd(n, n)}${td(id, 'student_id', n)}${td(g, 'grade', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R20', 'roster', S.map(([n, id, g]) => row(n, { student_id: id, grade: g })), { _eval: { rough_gt: { absent: ['Marcus Oyelaran', 'Nadia Petrov'], uncertain: ['Liesl Varga'] } } }),
    });
  }
  {
    const S = ['Talia Brennan', 'Ulric Sato', 'Vivian Okafor', 'Wesley Dunmore', 'Xiomara Leal', 'Yusuf Karimi', 'Zara Whitlock', 'Anders Pruitt', 'Bianca Soto'];
    const st = ['Present', 'Present', 'Absent', 'Present', 'Present', 'Tardy', 'Present', 'Absent', 'Present'];
    cases.push({
      id: 'R21', kind: 'roster', style: 'attend', rough: true, fields: ['names'],
      effects: ['hand_phone_shadow', 'defocus_blur', 'background_clutter'],
      notes: 'ROUGH: attendance sheet on a cluttered desk (papers, pen, mug), heavy hand+phone shadow over the lower half, slight defocus.',
      degrade: {
        seed: 2103, background: 'laminate', scale: 0.88, rotate: 4, offset: [-0.02, 0.04],
        clutter: [
          { kind: 'paper', cx: 0.9, cy: 0.12, w: 0.42, h: 0.4, angle: 22 },
          { kind: 'paper', cx: 0.06, cy: 0.9, w: 0.4, h: 0.3, angle: -12 },
          { kind: 'pen', cx: 0.94, cy: 0.7, w: 0.025, h: 0.3, angle: 12 },
          { kind: 'mug', cx: 0.9, cy: 0.93, r: 0.08 },
        ],
        shadow: { cx: 0.62, cy: 0.27, rx: 0.2, ry: 0.07, angle: -25, armTo: [1.15, -0.05], armWidth: 0.2, strength: 0.6, soft: 0.022,
          fingers: [[0.42, 0.28, 0.1, 0.018, 160], [0.43, 0.31, 0.11, 0.018, 170], [0.45, 0.34, 0.1, 0.017, 178], [0.5, 0.365, 0.07, 0.016, 200]] },
        defocus: 1.4, light: { gradient: [0.2, 0.3], amount: 0.12, vignette: 0.3 }, noise: 6, jpeg: 62,
      },
      html: page('attend', `<h1>Attendance · Period 1 English 9</h1>
<div class="meta">Date: 2026-09-22 · Teacher: Mrs. Lindahl · Room 31</div>
<table><tr><th>Name</th><th>Status</th><th>Notes</th></tr>
${S.map((n, i) => `<tr>${nameTd(n, n)}<td>${st[i]}</td><td></td></tr>`).join('\n')}
</table>`),
      expected: expected('R21', 'roster', S.map((n) => row(n)), { document_kind_guess: 'attendance' }),
    });
  }
  {
    const S = [
      ['Cyrus Albrecht', '11', '5'], ['Delphine Mbeki', '11', '5'], ['Emeric Thorne', '12', '5'], ['Fiona Gallagher', '11', '6'],
      ['Gideon Rask', '12', '6'], ['Hazel Quintero', '11', '6'], ['Idris Nowak', '12', '7'], ['Juniper Sloane', '11', '7'],
    ];
    cases.push({
      id: 'R22', kind: 'roster', style: 'sheet', rough: true, fields: ['names', 'grade', 'period'],
      effects: ['crumpled_paper', 'crease_lines', 'low_light_noise', 'jpeg_artifacts'],
      notes: 'ROUGH: printout pulled from a backpack — crumpled warp + crease lines, dim evening light, noisy q40 JPEG.',
      degrade: {
        seed: 2204, background: 'fabric', scale: 0.86, rotate: -5, keystone: { top: 0.92 }, jitter: 0.01,
        crumple: { amp: 7, cell: 95, shade: 0.22, creases: 6 },
        lowlight: { exposure: 0.58, gamma: 1.2, cast: [1.06, 0.96, 0.8] }, noise: 13,
        light: { gradient: [-0.5, -0.2], amount: 0.3, vignette: 0.4 }, jpeg: 40,
      },
      html: page('sheet', `<h1>Senior seminar — sections 5–7</h1>
<div class="meta">Counselor list · printed 2026-09-03</div>
<table><tr><th></th><th>Student</th><th>Grade</th><th>Period</th></tr>
${S.map(([n, g, p], i) => `<tr><td>${i + 1}</td>${nameTd(n, n)}${td(g, 'grade', n)}${td(p, 'period', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R22', 'roster', S.map(([n, g, p]) => row(n, { grade: g, period: p }))),
    });
  }
  {
    const S = [
      ['Kaia Rosenthal', '70311'], ['Lorcan Hale', '70312'], ['Mireille Dutta', '70313'], ['Nikolai Brandt', '70314'],
      ['Odessa Fairbanks', '70315'], ['Pascal Ibekwe', '70316'], ['Rhea Castillo', '70317'], ['Stellan Moore', '70318'],
      ['Tamsin Oduya', '70319'], ['Ulises Navarro', '70320'], ['Verity Shaw', '70321'], ['Wolfgang Tieu', '70322'],
    ];
    cases.push({
      id: 'R23', kind: 'roster', style: 'classic', rough: true, fields: ['names', 'student_id', 'period'],
      effects: ['cropped_off_edge', 'keystone', 'background_clutter'],
      notes: 'ROUGH: hurried shot — page runs off the right and bottom edges (ID column and last rows cut), side keystone, desk clutter.',
      degrade: {
        seed: 2305, background: 'wood', scale: 1.0, rotate: 2.5, offset: [0.33, -0.165],
        keystone: { left: 0.9, right: 1.06, top: 0.97 }, jitter: 0.005,
        clutter: [{ kind: 'phone', cx: 0.08, cy: 0.18, w: 0.17, h: 0.17, angle: -8 }, { kind: 'sticky', cx: 0.1, cy: 0.5, w: 0.13, h: 0.1, angle: 9 }],
        light: { gradient: [0.4, 0.4], amount: 0.18, vignette: 0.35 }, noise: 5, jpeg: 60,
      },
      html: page('classic', `<h1>Period 4 · Geography</h1>
<div class="meta">Mrs. Okafor-Lind · Room 122 · roster as of 9/30</div>
<table><tr><th>#</th><th>Student name</th><th>Period</th><th>Student ID</th></tr>
${S.map(([n, id], i) => `<tr><td>${i + 1}</td>${nameTd(n, n)}${td('4', 'period', n)}${td(id, 'student_id', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R23', 'roster', S.map(([n, id]) => row(n, { student_id: id, period: '4' })), { _eval: { rough_gt: { absent: ['Kaia Rosenthal', 'Lorcan Hale'], uncertain: ['Mireille Dutta'], uncertain_fields: Object.fromEntries(S.slice(2).map(([n]) => [n, n === 'Mireille Dutta' ? ['student_id', 'period'] : ['student_id']])) } } }),
    });
  }
  {
    const S = [
      'Adele Fournier', 'Bastian Kroll', 'Coralie Mensah', 'Dorian Platt', 'Elodie Marsh', 'Fitz Okoro', 'Gwendolyn Ash', 'Hamish Tull',
      'Isolde Barros', 'Jude Kowalczyk', 'Keziah Roman', 'Linus Eberhardt', 'Marisol Cruz', 'Nils Haugen', 'Ottilie Sorensen', 'Percy Lamb',
    ];
    cases.push({
      id: 'R24', kind: 'roster', style: 'seat', rough: true, fields: ['names'],
      effects: ['page_curl_binding', 'shadow', 'rotation_7deg'],
      notes: 'ROUGH: seating chart in a planner — left side curls into the binding (compressed, dark gutter), soft shadow, ~7° rotation.',
      degrade: {
        seed: 2406, background: 'dark_desk', scale: 0.84, rotate: 7, keystone: { top: 0.95 }, jitter: 0.004,
        curl: { side: 'left', width: 0.32, angle: 86, depth: 0.68, lift: 18, bulge: 0.07 },
        shadow: { shape: 'band', pts: [[0.55, -0.1], [1.1, -0.1], [1.1, 0.55], [0.82, 0.42]], strength: 0.42, soft: 0.05 },
        light: { gradient: [0.5, 0.2], amount: 0.2, vignette: 0.35 }, noise: 6, jpeg: 58,
      },
      html: page('seat', `<h1>Spanish II · Seating chart</h1>
<div class="meta">Sra. Benítez · Room 106 · Period 6</div>
<div class="front">— FRONT —</div>
<div class="grid">
${S.map((n) => `<div class="desk"><span data-gt-name="${esc(n)}">${esc(n)}</span></div>`).join('\n')}
</div>`),
      expected: expected('R24', 'roster', S.map((n) => row(n)), { document_kind_guess: 'seating_chart' }),
    });
  }
  {
    const S = [
      ['OYELOWO, AMARA', 'Amara Oyelowo', '55101'], ['BRANDVOLD, ERIK', 'Erik Brandvold', '55102'], ['CHAUDHRY, NOOR', 'Noor Chaudhry', '55103'],
      ['DELACROIX, REMY', 'Remy Delacroix', '55104'], ['ENGSTROM, LIV', 'Liv Engstrom', '55105'], ['FAIRWEATHER, COLE', 'Cole Fairweather', '55106'],
      ['GUTIERREZ, ISABEL', 'Isabel Gutierrez', '55107'], ['HOLLOWAY, TRISTAN', 'Tristan Holloway', '55108'], ['IWASAKI, REN', 'Ren Iwasaki', '55109'],
    ];
    cases.push({
      id: 'R25', kind: 'roster', style: 'attend', rough: true, fields: ['names', 'student_id'],
      effects: ['coffee_stain', 'pen_marks', 'keystone'],
      notes: 'ROUGH: LAST, FIRST class list with a coffee ring over one name, ballpoint scribble over part of another, checkmarks + doodles, keystone.',
      degrade: {
        seed: 2507, background: 'white_desk', scale: 0.86, rotate: -3, keystone: { top: 0.82, bottom: 1.02 }, jitter: 0.006,
        stains: [{ target: 'Liv Engstrom', fx: 0.75, fy: 0.3, r: 70, strength: 1.15, fill: 0.36 }, { at: [0.82, 0.12], r: 30, strength: 0.6 }],
        pen: [
          { type: 'scribble', target: 'Tristan Holloway', from: 0.45, to: 1.05, width: 3, color: [25, 45, 160], density: 2.6 },
          { type: 'check', target: 'Amara Oyelowo', width: 3, color: [25, 45, 160] },
          { type: 'check', target: 'Noor Chaudhry', width: 3, color: [25, 45, 160] },
          { type: 'check', target: 'Remy Delacroix', width: 3, color: [25, 45, 160] },
          { type: 'circle', target: 'Cole Fairweather', width: 2.5, color: [190, 30, 30] },
          { type: 'doodle', at: [0.8, 0.82], width: 2.5, color: [25, 45, 160] },
        ],
        light: { gradient: [0.3, -0.5], amount: 0.15, vignette: 0.3 }, noise: 5, jpeg: 60,
      },
      html: page('attend', `<h1>Official class list · Economics</h1>
<div class="meta">Print date 2026-09-08 · Mr. Haverford</div>
<table><tr><th>Legal name</th><th>SID</th></tr>
${S.map(([disp, n, id]) => `<tr>${nameTd(disp, n)}${td(id, 'student_id', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R25', 'roster', S.map(([, n, id]) => row(n, { student_id: id })), { _eval: { rough_gt: { uncertain: ['Tristan Holloway'] } } }),
    });
  }
  {
    const S = [
      'Abel Durant', 'Beatrix Holm', 'Cassius Wren', 'Dalia Farouk', 'Emmett Szabo', 'Flora Inglis', 'Gage Mercer', 'Hollis Penn', 'Ivy Castellanos',
      'Jett Morrow', 'Kalina Petrova', 'Lazlo Imre', 'Maren Vik', 'Nico Saldana', 'Opal Hendry', 'Pierce Lyle', 'Rumi Takeda', 'Saoirse Dolan',
    ];
    cases.push({
      id: 'R26', kind: 'roster', style: 'modern', rough: true, fields: ['names'],
      effects: ['folded_in_thirds', 'glare_hotspot', 'rotation_10deg'],
      notes: 'ROUGH: dense 18-name list folded in thirds (two hard creases + panel shading), window glare across the middle-right, ~-10° rotation.',
      degrade: {
        seed: 2608, background: 'laminate', scale: 0.86, rotate: -10, keystone: { top: 0.94 }, jitter: 0.004,
        creases: [{ at: [0.5, 0.333], angle: 0.6, shift: 2.5, dark: 0.45, panel: 0.93, width: 3 }, { at: [0.5, 0.666], angle: -0.4, shift: -2, dark: 0.4, panel: 1.04, width: 3 }],
        crumple: { amp: 2.5, cell: 160, shade: 0.06, creases: 0 },
        glare: [{ target: 'Lazlo Imre', fx: 0.9, fy: 0.5, rx: 0.08, ry: 0.035, angle: 20, strength: 1.9 }],
        light: { gradient: [-0.4, 0.3], amount: 0.15, vignette: 0.3 }, noise: 6, jpeg: 55,
      },
      html: page('modern', `<h1>Homeroom 8A · Full roster</h1>
<div class="meta">18 students · updated 9/29</div>
<table><tr><th>#</th><th>Name</th></tr>
${S.map((n, i) => `<tr><td>${i + 1}</td>${nameTd(n, n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R26', 'roster', S.map((n) => row(n)), { _eval: { rough_gt: { absent: ['Lazlo Imre'], uncertain: ['Jett Morrow', 'Kalina Petrova', 'Maren Vik'] } } }),
    });
  }
  {
    const S = ['Thea Lockhart', 'Ulysses Kane', 'Valentina Rossi', 'Wren Galloway', 'Xavier Lund', 'Yara Nasser', 'Zeke Marlow', 'Amos Whitaker'];
    cases.push({
      id: 'R27', kind: 'roster', style: 'classic', rough: true, fields: ['names', 'period'],
      effects: ['strong_keystone', 'very_low_light_noise', 'motion_blur'],
      notes: 'ROUGH: very dark room, steep angle from the side of the desk (strong keystone), motion smear, heavy noise q42.',
      degrade: {
        seed: 2709, background: 'carpet', scale: 0.94, rotate: -6, keystone: { top: 1.04, bottom: 0.72, left: 0.94 }, jitter: 0.01,
        motion: { len: 6, angle: -35 }, lowlight: { exposure: 0.5, gamma: 1.3, cast: [1.1, 0.92, 0.7] }, noise: 12,
        light: { gradient: [0.7, 0.5], amount: 0.35, vignette: 0.55 }, jpeg: 42,
      },
      html: page('classic', `<h1>Period 3 · Study hall sign-out roster</h1>
<div class="meta">Mr. Ferraro · Library annex</div>
<table><tr><th>Student</th><th>Period</th></tr>
${S.map((n) => `<tr>${nameTd(n, n)}${td('3', 'period', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R27', 'roster', S.map((n) => row(n, { period: '3' }))),
    });
  }
  {
    const S = [
      ['Beckett Lowry', 'M. Lowry 555-0141'], ['Camille Ostrowski', 'J. Ostrowski 555-0142'], ['Desmond Achebe', 'Ada Achebe 555-0143'],
      ['Eloise Fairfax', 'T. Fairfax 555-0144'], ['Gunnar Halvorsen', 'K. Halvorsen 555-0145'], ['Leona Marchetti', 'P. Marchetti 555-0146'],
      ['Rafael Quiroga', 'S. Quiroga 555-0147'],
    ];
    cases.push({
      id: 'R28', kind: 'roster', style: 'classic', rough: true, fields: ['names', 'parent_contact'],
      effects: ['clutter_overlapping_page', 'rotation_18deg', 'defocus_blur'],
      notes: 'ROUGH: contact roster under a sticky note + another paper overlapping it (one row fully covered, one partly), ~18° rotation, soft focus.',
      degrade: {
        seed: 2810, background: 'wood', scale: 0.86, rotate: 18, offset: [0.06, 0.05], jitter: 0.004,
        clutter: [{ kind: 'paper', cx: 0.2, cy: 0.12, w: 0.5, h: 0.35, angle: -8 }, { kind: 'folder', cx: 0.9, cy: 0.85, w: 0.5, h: 0.5, angle: 10 }],
        overlap: [
          { kind: 'paper', target: 'Rafael Quiroga', tfx: 0.5, tfy: 0, dx: 0.0, dy: 0.142, w: 0.75, h: 0.3, angle: 16 },
          { kind: 'sticky', target: 'Desmond Achebe', tfx: 2.2, tfy: 0.5, w: 0.15, h: 0.11, angle: 30 },
        ],
        defocus: 1.1, light: { gradient: [-0.3, -0.4], amount: 0.2, vignette: 0.35 }, noise: 6, jpeg: 58,
      },
      html: page('classic', `<h1>Advisory 11C · Contact roster</h1>
<div class="meta">Mr. Delgado · for phone tree only</div>
<table><tr><th>Student</th><th>Parent / guardian contact</th></tr>
${S.map(([n, pc]) => `<tr>${nameTd(n, n)}${td(pc, 'parent_contact', n)}</tr>`).join('\n')}
</table>`),
      expected: expected('R28', 'roster', S.map(([n, pc]) => row(n, { parent_contact: pc })), { _eval: { rough_gt: { absent: ['Rafael Quiroga'], uncertain: ['Leona Marchetti'], uncertain_fields: { 'Leona Marchetti': ['parent_contact'] } } } }),
    });
  }

  // ======================= HANDWRITTEN (R29–R33) =======================
  {
    const r = rng(2911);
    const base = { font: 'bradley', ink: 'blue', size: 29, jy: 1.8, rot: 3.5, slant: -4, lineRot: 1.1 };
    const L = [
      { name: 'Adaeze Nwosu' }, { name: 'Bram Halloran' }, { name: 'Clio Bertrand' }, { name: 'Dmitri Volkov' }, { name: 'Eden Strickland' },
      { name: 'Farah Mistry', kind: 'crossed', x: 'strike', insertAbove: { name: 'Kip Andersson', left: 230, rot: -4 } },
      { name: 'Gil Ramos' }, { name: 'Honor Pemberton' }, { name: 'Ike Larsen' }, { name: 'Jolene Watts' },
      { name: 'Lark Ellery', ink: 'black', font: 'noteworthy', size: 26 },
    ];
    const inner = `<div class="hl" style="font-family:${HANDS.bradley};color:${INK.blue};font-size:32px;margin-bottom:14px">${hand('Per. 6 Art — class list', r, { jy: 1.5, rot: 2 })}</div>
${L.map((it, i) => handLine(r, { ...it, prefix: `${i + 1}.` }, base)).join('\n')}`;
    cases.push({
      id: 'R29', kind: 'roster', hand: true, rough: false, fields: ['names'],
      effects: ['handwritten_print', 'cross_out', 'inserted_name'],
      notes: 'HANDWRITTEN (flat scan): Bradley-Hand print on lined paper, jittered baseline/slant; one name struck out with a replacement written above (caret); late add in black ink.',
      html: handPage('lined', inner),
      expected: expected('R29', 'roster',
        ['Adaeze Nwosu', 'Bram Halloran', 'Clio Bertrand', 'Dmitri Volkov', 'Eden Strickland', 'Kip Andersson', 'Gil Ramos', 'Honor Pemberton', 'Ike Larsen', 'Jolene Watts', 'Lark Ellery'].map((n) => row(n)),
        { _eval: { excluded_names: ['Farah Mistry'] } }),
    });
  }
  {
    const r = rng(3012);
    const base = { font: 'noteworthy', ink: 'black', size: 28, jy: 1.6, rot: 3, slant: 3, lineRot: 1.2, idX: 430 };
    const L = [
      ['Mabel Ferraro', '4471', 'snell'], ['Niall Corrigan', '4472'], ['Olympia Kostas', '4473', 'snell'], ['Ptolemy Ward', '4474'],
      ['Raina Bose', '4475', 'snell'], ['Soren Ekdahl', '4476'], ['Tova Lindell', '4477', 'snell'], ['Uriel Mendes', '4478'], ['Vida Kerr', '4479', 'snell'],
    ];
    const inner = `<div class="hl" style="font-family:${HANDS.noteworthy};font-size:30px;margin-bottom:10px">${hand('Robotics club — fall roster', r, {})}</div>
<div class="hl" style="font-family:${HANDS.noteworthy};font-size:20px;color:#444"><span style="position:absolute;left:0">${hand('name', r, {})}</span><span style="position:absolute;left:430px">${hand('ID #', r, {})}</span></div>
${L.map(([n, id, f]) => handLine(r, { name: n, id, idDisplay: `#${id}`, font: f, cursive: f === 'snell', size: f === 'snell' ? 33 : 28, idFont: 'noteworthy' }, base)).join('\n')}`;
    cases.push({
      id: 'R30', kind: 'roster', hand: true, rough: true, fields: ['names', 'student_id'],
      effects: ['handwritten_mixed_print_cursive', 'keystone', 'hand_phone_shadow', 'jpeg_artifacts'],
      notes: 'HANDWRITTEN + ROUGH: club roster alternating print/cursive lines with scribbled "#44xx" IDs on plain paper; keystone + hand shadow across the bottom-left, q52 JPEG.',
      degrade: {
        seed: 3012, background: 'laminate', scale: 0.84, rotate: 5, keystone: { top: 0.8, bottom: 1.02 }, jitter: 0.006,
        shadow: { cx: 0.14, cy: 0.42, rx: 0.17, ry: 0.07, angle: 10, armTo: [-0.15, 0.62], armWidth: 0.2, strength: 0.58, soft: 0.022,
          fingers: [[0.3, 0.37, 0.09, 0.016, 0], [0.32, 0.405, 0.1, 0.016, 5], [0.31, 0.44, 0.09, 0.016, 12]] },
        light: { gradient: [0.3, -0.3], amount: 0.15, vignette: 0.3 }, noise: 7, jpeg: 52,
      },
      html: handPage('plain', inner),
      expected: expected('R30', 'roster', L.map(([n, id]) => row(n, { student_id: id }))),
    });
  }
  {
    const r = rng(3113);
    const base = { font: 'marker', ink: 'pencil', size: 30, jy: 2.2, rot: 4.5, slant: -2, lineRot: 1.6 };
    const L = [
      { name: 'Wilder Haines' }, { name: 'Xena Paulsen', font: 'chalk' }, { name: 'Fenella Royce', kind: 'crossed', x: 'scribble' },
      { name: 'Yosef Abramov' }, { name: 'Zinnia Coles', font: 'chalk' }, { name: 'Arturo Bellini' },
      { name: 'Gus Mattingly', kind: 'crossed', x: 'scribble', font: 'chalk' }, { name: 'Briony Tate' }, { name: 'Cosmo Fairley', font: 'chalk' }, { name: 'Dove Ainsworth' },
    ];
    const inner = `<div class="hl" style="font-family:${HANDS.marker};color:${INK.pencil};font-size:32px;margin-bottom:12px">${hand('3rd per. lab groups list', r, { jy: 2, rot: 3 })}</div>
${L.map((it) => handLine(r, it, base)).join('\n')}
<div class="ins" style="left:470px;top:300px;font-family:${HANDS.marker};color:${INK.pencil};font-size:27px;transform:rotate(-8deg)"><span class="nm" data-gt-name="Halle Brisbane">${hand('Halle Brisbane', r, { jy: 2, rot: 4 })}</span></div>
<svg style="position:absolute;left:330px;top:300px;width:150px;height:140px" viewBox="0 0 150 140"><path d="M140,22 C90,30 60,70 30,118 M30,118 L34,98 M30,118 L48,108" fill="none" stroke="${INK.pencil}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
    cases.push({
      id: 'R31', kind: 'roster', hand: true, rough: true, fields: ['names'],
      effects: ['handwritten_pencil', 'cross_out_scribble', 'arrow_inserted_name', 'rotation_12deg', 'crumpled_paper', 'low_light_noise'],
      notes: 'HANDWRITTEN + ROUGH: pencil list on graph paper, two names scribbled out, one name added in the margin with an arrow; rotated ~12°, crumpled, dim + noisy.',
      degrade: {
        seed: 3113, background: 'wood', scale: 0.8, rotate: 12, jitter: 0.006,
        crumple: { amp: 6, cell: 100, shade: 0.2, creases: 5 },
        lowlight: { exposure: 0.66, gamma: 1.15, cast: [1.05, 0.97, 0.84] }, noise: 11,
        light: { gradient: [-0.4, 0.4], amount: 0.25, vignette: 0.4 }, jpeg: 48,
      },
      html: handPage('grid', inner),
      expected: expected('R31', 'roster',
        ['Wilder Haines', 'Xena Paulsen', 'Yosef Abramov', 'Zinnia Coles', 'Arturo Bellini', 'Briony Tate', 'Cosmo Fairley', 'Dove Ainsworth', 'Halle Brisbane'].map((n) => row(n)),
        { _eval: { excluded_names: ['Fenella Royce', 'Gus Mattingly'] } }),
    });
  }
  {
    const r = rng(3214);
    const base = { font: 'snell', ink: 'purple', size: 34, jy: 1.2, rot: 2, slant: 0, lineRot: 0.8, cursive: true };
    const L = [
      { kind: 'note', name: 'Period 2', display: 'Period 2 —', font: 'chancery', size: 30 },
      { name: 'Imogen Ravel', indent: 30, p: '2' }, { name: 'Jareth Bliss', indent: 30, p: '2' }, { name: 'Katya Orlova', indent: 30, p: '2', font: 'chancery' }, { name: 'Leopold Finch', indent: 30, p: '2' },
      { kind: 'note', name: 'Period 3', display: 'Period 3 —', font: 'chancery', size: 30 },
      { name: 'Magnolia Reese', indent: 30, p: '3' }, { name: 'Nestor Pavlou', indent: 30, p: '3', font: 'chancery' }, { name: 'Octavia Prentiss', indent: 30, p: '3', font: 'savoye', size: 44 }, { name: 'Philippa Grey', indent: 30, p: '3' },
    ];
    const inner = `<div class="hl" style="font-family:${HANDS.chancery};color:${INK.purple};font-size:34px;margin-bottom:16px">${hand('Choir sectionals', r, { cursive: true })}</div>
${L.map((it) => handLine(r, it, base)).join('\n')}`;
    cases.push({
      id: 'R32', kind: 'roster', hand: true, rough: true, fields: ['names', 'period'],
      effects: ['handwritten_cursive', 'page_curl_binding', 'glare_hotspot'],
      notes: 'HANDWRITTEN + ROUGH: cursive (Snell/Chancery/Savoye) teacher notebook grouped under "Period 2 / Period 3" headings; right page curling into the spiral, lamp glare hotspot.',
      degrade: {
        seed: 3214, background: 'dark_desk', scale: 0.86, rotate: -4, keystone: { top: 0.92 }, jitter: 0.004,
        curl: { side: 'right', width: 0.3, angle: 84, depth: 0.6, lift: 14, bulge: 0.05 },
        glare: [{ target: 'Jareth Bliss', fx: 0.7, fy: 0.5, rx: 0.07, ry: 0.035, angle: -10, strength: 1.8 }],
        light: { gradient: [0.4, 0.2], amount: 0.2, vignette: 0.35 }, noise: 6, jpeg: 56,
      },
      html: handPage('legal', inner),
      expected: expected('R32', 'roster', L.filter((it) => it.kind !== 'note').map((it) => row(it.name, { period: it.p })), { _eval: { rough_gt: { uncertain: ['Imogen Ravel', 'Jareth Bliss'] } } }),
    });
  }
  {
    const r = rng(3315);
    const writers = [
      ['Quinn Abernathy', '61201', 'bradley', 'blue', 27], ['Rosa Delgado', '61202', 'snell', 'black', 32], ['Sebastián Ibarra', '61203', 'marker', 'black', 26],
      ['Tobias Kwan', '61204', 'noteworthy', 'blue', 26], ['Una Fitzgerald', '61205', 'chancery', 'purple', 28], ['Vaughn Ellison', '61206', 'comic', 'pencil', 24],
      ['Winnie Calder', '61207', 'chalk', 'green', 25], ['Xander Moyo', '61208', 'marker', 'blue', 29], ['Yvette Laurent', '61209', 'savoye', 'black', 40],
      ['Zuri Banks', '61210', 'bradley', 'black', 26],
    ];
    const rows = writers.map(([n, id, f, ink, sz]) => {
      const cur = ['snell', 'chancery', 'savoye'].includes(f);
      return `<tr><td class="hw" style="font-family:${HANDS[f]};color:${INK[ink]};font-size:${sz}px"><span class="nm" data-gt-name="${esc(n)}" style="display:inline-block;transform:rotate(${j(r, 2)}deg) skewX(${j(r, 6)}deg)">${hand(n, r, { cursive: cur, jy: 1.6, rot: 3 })}</span></td><td class="hw" style="font-family:${HANDS[f]};color:${INK[ink]};font-size:${Math.min(sz, 28)}px"><span data-gt-field="student_id" data-gt-for="${esc(n)}" style="display:inline-block;transform:rotate(${j(r, 3)}deg)">${hand(id, r, { jy: 1.4, rot: 4 })}</span></td></tr>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0}body{width:840px;height:1100px;box-sizing:border-box;padding:30px;background:#fff;font-family:Arial,sans-serif;color:#111}
h1{font-size:20px;margin:0}.meta{font-size:13px;color:#444;margin:4px 0 14px}
table{border-collapse:collapse;width:100%}th{font-size:13px;text-align:left;background:#eee;border:1px solid #555;padding:6px}
td{border:1px solid #555;height:58px;padding:0 10px;vertical-align:middle}.c{display:inline-block}.hw{white-space:nowrap}
</style></head><body><h1>Field trip sign-up · Science museum</h1><div class="meta">Write your full name and student ID. Grade 8 · Ms. Achterberg</div>
<table><tr><th style="width:62%">Student name (print)</th><th>Student ID</th></tr>
${rows.join('\n')}
<tr><td></td><td></td></tr><tr><td></td><td></td></tr></table></body></html>`;
    cases.push({
      id: 'R33', kind: 'roster', hand: true, rough: true, fields: ['names', 'student_id'],
      effects: ['handwritten_many_hands', 'defocus_blur', 'background_clutter', 'rotation_5deg', 'jpeg_artifacts'],
      notes: 'HANDWRITTEN + ROUGH: sign-up sheet where each student wrote their own name/ID (10 different hands, inks, sizes, incl. ornate cursive); slightly out of focus on a cluttered desk, rotated, q50.',
      degrade: {
        seed: 3315, background: 'laminate', scale: 0.74, rotate: -5, offset: [0.03, 0.01], keystone: { top: 0.93 }, jitter: 0.004,
        clutter: [
          { kind: 'paper', cx: 0.12, cy: 0.15, w: 0.4, h: 0.45, angle: -15 },
          { kind: 'pen', cx: 0.94, cy: 0.42, w: 0.025, h: 0.3, angle: -20 },
          { kind: 'sticky', cx: 0.9, cy: 0.9, w: 0.14, h: 0.1, angle: -6 },
          { kind: 'phone', cx: 0.1, cy: 0.9, w: 0.18, h: 0.16, angle: 75 },
        ],
        defocus: 1.7, light: { gradient: [0.3, 0.5], amount: 0.15, vignette: 0.3 }, noise: 6, jpeg: 50,
      },
      html,
      expected: expected('R33', 'roster', writers.map(([n, id]) => row(n, { student_id: id })), { _eval: { rough_gt: { uncertain_fields: { 'Yvette Laurent': ['student_id'] } } } }),
    });
  }

  // ======================= ROUGH NEGATIVES (N04–N05) =======================
  cases.push({
    id: 'N04', kind: 'negative', style: 'modern', rough: true, fields: ['names'],
    effects: ['rotation_9deg', 'glare_hotspot', 'background_clutter', 'jpeg_artifacts'],
    notes: 'NEGATIVE + ROUGH: cafeteria lunch menu table photographed on a cluttered desk with glare — must reject, no names invented.',
    degrade: {
      seed: 4016, background: 'wood', scale: 0.74, rotate: 9, keystone: { top: 0.9 }, jitter: 0.004,
      clutter: [{ kind: 'paper', cx: 0.85, cy: 0.15, w: 0.4, h: 0.35, angle: 18 }, { kind: 'mug', cx: 0.12, cy: 0.88, r: 0.08 }],
      glare: [{ cx: 0.45, cy: 0.3, rx: 0.09, ry: 0.045, angle: 20, strength: 1.9 }],
      light: { gradient: [0.3, 0.3], amount: 0.15, vignette: 0.3 }, noise: 6, jpeg: 50,
    },
    html: page('modern', `<h1>October lunch menu · Week 1</h1>
<div class="meta">Cafeteria services · prices subject to change</div>
<table><tr><th>Day</th><th>Entrée</th><th>Side</th><th>Price</th></tr>
<tr><td>Mon</td><td>Chicken tenders</td><td>Green beans</td><td>$3.25</td></tr>
<tr><td>Tue</td><td>Bean &amp; cheese tacos</td><td>Corn</td><td>$3.25</td></tr>
<tr><td>Wed</td><td>Spaghetti &amp; meat sauce</td><td>Garden salad</td><td>$3.50</td></tr>
<tr><td>Thu</td><td>Turkey sandwich</td><td>Apple slices</td><td>$3.00</td></tr>
<tr><td>Fri</td><td>Cheese pizza</td><td>Carrot sticks</td><td>$3.25</td></tr>
</table><p style="font-size:12px">Milk included. Allergy questions: see nurse office.</p>`),
    expected: expected('N04', 'negative', [], { document_kind_guess: 'not_roster', rejected: true }),
  });
  {
    const r = rng(4117);
    const base = { font: 'bradley', ink: 'blue', size: 28, jy: 1.8, rot: 3.5, slant: -3, lineRot: 1.3 };
    const L = ['copy paper x2 boxes', 'glue sticks + markers', 'call office re: bus for Thurs', 'grade P3 quizzes', 'email parents — newsletter', 'return library books', 'order more lab goggles'];
    const inner = `<div class="hl" style="font-family:${HANDS.bradley};color:${INK.blue};font-size:32px;margin-bottom:12px">${hand('To do this week', r, {})}</div>
${L.map((t) => handLine(r, { kind: 'note', name: t, prefix: '☐' }, base)).join('\n')}`;
    cases.push({
      id: 'N05', kind: 'negative', hand: true, rough: true, fields: ['names'],
      effects: ['handwritten_print', 'crumpled_paper', 'hand_phone_shadow'],
      notes: 'NEGATIVE + HANDWRITTEN + ROUGH: teacher to-do list on legal pad, crumpled, hand shadow — must reject (no student names).',
      degrade: {
        seed: 4117, background: 'laminate', scale: 0.84, rotate: -7, jitter: 0.006,
        crumple: { amp: 5, cell: 110, shade: 0.18, creases: 4 },
        shadow: { cx: 0.8, cy: 0.3, rx: 0.18, ry: 0.11, angle: 30, armTo: [1.15, 0.0], armWidth: 0.2, strength: 0.5, soft: 0.03 },
        noise: 7, jpeg: 52,
      },
      html: handPage('legal', inner),
      expected: expected('N05', 'negative', [], { document_kind_guess: 'not_roster', rejected: true }),
    });
  }
  return cases;
}
