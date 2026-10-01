/**
 * Rough phone-photo + fully handwritten homework-ingest cases (H18+).
 * Consumed by scripts/gen-homework-ingest-fixtures.mjs; `rough` recipes are applied by
 * scripts/degrade-homework-fixtures.mjs (clean.png → rough.jpg).
 *
 * Ground truth rule: expected.json describes what is VISIBLE in the image the eval sends
 * (rough.jpg for rough cases). Cropped / glared-out / smudged values are null with
 * status "absent" (reader must not invent) or status "uncertain" (null OR the true value accepted).
 * Synthetic names only.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** jittered "kid handwriting": per-glyph rotate/raise/scale; pieces may be strings, {x:'crossed'}, {html:'raw'} */
function makeHand(seed, o = {}) {
  const rng = mulberry32(seed);
  const j = (k) => (rng() * 2 - 1) * k;
  const glyphs = (text) =>
    [...text]
      .map((ch) =>
        ch === ' '
          ? `<span style="display:inline-block;width:${(0.28 + rng() * 0.18).toFixed(2)}em"></span>`
          : `<span style="display:inline-block;transform:translateY(${j(o.dy ?? 2.2).toFixed(1)}px) rotate(${j(o.rot ?? 6).toFixed(1)}deg) scale(${(1 + j(o.size ?? 0.09)).toFixed(2)})">${esc(ch)}</span>`,
      )
      .join('');
  const piece = (p) => {
    if (typeof p === 'string') return glyphs(p);
    if (p.x != null) return `<span class="x">${glyphs(p.x)}</span>`;
    if (p.html != null) return p.html;
    return '';
  };
  /** one handwritten line with drifting baseline + slant */
  const line = (pieces, extra = '') => {
    const arr = Array.isArray(pieces) ? pieces : [pieces];
    const rot = j(o.lineRot ?? 1.2).toFixed(2);
    const sk = ((o.slant ?? 0) + j(o.slantJ ?? 2)).toFixed(1);
    const ml = Math.round(j(o.indent ?? 10));
    return `<div class="line" style="transform:rotate(${rot}deg) skewX(${-sk}deg);transform-origin:0 50%;margin-left:${ml}px;${extra}">${arr.map(piece).join('')}</div>`;
  };
  const span = (pieces, cls = 'a') => {
    const arr = Array.isArray(pieces) ? pieces : [pieces];
    const rot = j(o.lineRot ?? 1.5).toFixed(2);
    return `<span class="${cls}" style="display:inline-block;transform:rotate(${rot}deg) skewX(${-((o.slant ?? 0) + j(1.5)).toFixed(1)}deg)">${arr.map(piece).join('')}</span>`;
  };
  return { line, span, glyphs };
}

const X_CSS = `.x{position:relative;display:inline-block}.x::after,.x::before{content:'';position:absolute;left:-5px;right:-5px;border-top:3px solid currentColor}.x::after{top:38%;transform:rotate(-14deg)}.x::before{top:62%;transform:rotate(10deg)}`;
const BASE = `html,body{margin:0}body{width:840px;min-height:1100px;box-sizing:border-box;position:relative}${X_CSS}`;

function printed({ hand = 'Noteworthy', ink = '#1f2a6b', bg = '#fbfaf5', extra = '' } = {}) {
  return `${BASE}body{background:${bg};font-family:Helvetica,Arial,sans-serif;color:#141414;padding:46px 54px;--hand:'${hand}';--ink:${ink}}
.name{font-size:21px;margin-bottom:10px}h1{font-size:31px;margin:8px 0 4px}.meta{font-size:17px;color:#444;margin-bottom:26px}
.q{font-size:23px;margin:0 0 34px;line-height:1.5}.a{font-size:29px;color:var(--ink);font-family:var(--hand),cursive;margin-left:12px}
.bl{display:inline-block;border-bottom:1.6px solid #222;min-width:230px;padding:0 4px}${extra}`;
}
function notebook({ hand = 'Bradley Hand', ink = '#1d2b5a', size = 29, extra = '' } = {}) {
  return `${BASE}body{background-color:#fcfcf6;background-image:linear-gradient(90deg,transparent 98px,#e49a9a 98px,#e49a9a 100px,transparent 100px),repeating-linear-gradient(180deg,transparent 0 41px,#a8c6e6 41px 42px);background-position:0 78px;padding:86px 40px 40px 118px;line-height:42px;font-size:${size}px;color:${ink};font-family:'${hand}',cursive}
.line{height:42px;white-space:nowrap}.hole{position:absolute;left:30px;width:26px;height:26px;border-radius:50%;background:#3b3b3b}
.mg{position:absolute;white-space:nowrap}${extra}`;
}
const holes = () => [200, 550, 900].map((t) => `<div class="hole" style="top:${t}px"></div>`).join('');
const doc = (css, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>\n${body}\n</body></html>`;
function header(h, name, title, { period = 'P2', meta = 'Show your work.' } = {}) {
  const nm = name == null ? '' : typeof name === 'string' ? h.span(name) : name.html ?? '';
  return `<div class="name"><b>Name:</b> <span class="bl">${nm}</span> &nbsp; <b>Date:</b> <span class="bl" style="min-width:120px">${h.span('9/29')}</span> &nbsp; <b>Per:</b> ${period}</div>
<h1>${title}</h1><div class="meta">${meta}</div>`;
}
const q = (n, prompt, ans) => `<div class="q">${n}. ${prompt} ${ans}</div>`;

/**
 * @param {(id:string, opts:object)=>object} expected  expected.json builder from the generator
 */
export function buildRoughCases(expected) {
  const C = [];

  // ---------------- ROUGH PHOTO (printed worksheet + student writing) ----------------
  {
    const h = makeHand(1801, { rot: 5 });
    C.push({
      id: 'H18',
      notes: 'ROUGH: strong keystone perspective (shot from bottom edge) + glare hotspot over Q2/Q3 answers + desk clutter (pencil, calculator, sticky). Jordan Chen, Ratios & Rates, 4/5.',
      effects: ['perspective', 'glare', 'clutter'],
      html: doc(printed({ hand: 'Noteworthy' }), `${header(h, 'Jordan Chen', 'Ratios and Rates')}
${q(1, 'Simplify the ratio 12 : 18', h.span('2 : 3'))}
${q(2, '3 apples cost $1.50. Cost of 1 apple?', h.span('$0.50'))}
${q(3, '60 miles in 2 hours. Rate?', h.span('30 mph'))}
${q(4, 'Unit price: $4.80 for 6 pens', h.span('$0.80 each'))}
${q(5, 'Write 5 : 20 as a fraction in lowest terms', h.span('1/5'))}`),
      rough: {
        seed: 18,
        desk: 'wood',
        place: { cx: 0.5, cy: 0.5, width: 0.86, rot: -3, keyTop: 0.34, keySide: 0.05 },
        glare: [{ pcx: 470, pcy: 300, rx: 0.15, ry: 0.07, strength: 0.92, core: 0.6 }],
        clutter: [
          { type: 'calculator', x: 0.06, y: 0.88, rot: 18, s: 0.7 },
          { type: 'sticky', x: 0.9, y: 0.08, rot: 12, s: 0.8, text: 'test fri' },
          { type: 'pencil', x: 0.62, y: 0.93, rot: -8, s: 0.9, over: true },
        ],
        light: { angle: 90, strength: 0.22 },
        jpeg: { quality: 60 },
      },
      expected: expected('H18', {
        studentName: 'Jordan Chen',
        assignmentTitle: 'Ratios and Rates',
        draftScore: 80,
        draftScoreStatus: 'uncertain',
        itemCount: 5,
        gaps: ['simplifying ratios / fractions'],
        warnings: ['glare washes out part of Q2-Q3 answers'],
      }),
    });
  }
  {
    const h = makeHand(1901, { rot: 7, dy: 3 });
    C.push({
      id: 'H19',
      notes: 'ROUGH: 14 deg rotation + horizontal motion blur + low light/noise/JPEG. Riley Brooks, Area & Perimeter, 3/4 (triangle area wrong).',
      effects: ['rotation', 'motion-blur', 'low-light-noise-jpeg'],
      html: doc(printed({ hand: 'Chalkboard SE', ink: '#333' }), `${header(h, 'Riley Brooks', 'Area and Perimeter', { meta: 'Include units.' })}
${q(1, 'Area of a 5 cm by 3 cm rectangle', h.span('15 cm²'))}
${q(2, 'Perimeter of the same rectangle', h.span('16 cm'))}
${q(3, 'Area of a square with side 4 in', h.span('16 in²'))}
${q(4, 'Area of a triangle, base 6 m, height 4 m', h.span('24 m²'))}`),
      rough: {
        seed: 19,
        desk: 'laminate',
        place: { cx: 0.5, cy: 0.47, width: 0.8, rot: 14, keyTop: 0.08 },
        motion: { len: 9, angle: 8 },
        lowLight: { gain: 0.52, cast: [1, 0.88, 0.66], gamma: 1.2 },
        noise: { sigma: 13, chroma: 1 },
        jpeg: { quality: 38 },
      },
      expected: expected('H19', {
        studentName: 'Riley Brooks',
        assignmentTitle: 'Area and Perimeter',
        draftScore: 75,
        itemCount: 4,
        gaps: ['area of a triangle'],
      }),
    });
  }
  {
    const h = makeHand(2001, { rot: 4 });
    C.push({
      id: 'H20',
      notes: 'ROUGH / NAME ILLEGIBLE: faint pencil throughout + name rubbed out by eraser smudge + defocus + hand shadow. Food Chains, 4/4. studentName absent.',
      effects: ['faint-pencil', 'eraser-smudge', 'defocus', 'hand-shadow'],
      html: doc(printed({ hand: 'Noteworthy', ink: '#8c8c8c' }), `${header(h, { html: `<span class="a" style="color:#b9b9b9">${h.glyphs('M')}</span>` }, 'Food Chains', { meta: 'Use the pond diagram from class.' })}
${q(1, 'A producer in the pond:', h.span('algae'))}
${q(2, 'Which animal eats the grasshopper?', h.span('the frog'))}
${q(3, 'Where does the energy start?', h.span('the sun'))}
${q(4, 'Name a decomposer:', h.span('mushrooms'))}`),
      rough: {
        seed: 20,
        desk: 'wood',
        place: { cx: 0.5, cy: 0.5, width: 0.84, rot: -4, keyTop: 0.1 },
        smudges: [{ cx: 243, cy: 68, cw: 250, ch: 40, rot: -3, opacity: 0.6, pill: true }],
        fadeInk: 0.92,
        defocus: 1.8,
        handShadow: { x: 0.9, y: 0.86, r: 0.2, rot: -35, opacity: 0.55 },
        jpeg: { quality: 58 },
      },
      expected: expected('H20', {
        studentName: null,
        studentNameStatus: 'absent',
        nameMissing: true,
        assignmentTitle: 'Food Chains',
        draftScore: 100,
        itemCount: 4,
        gaps: [],
        warnings: ['name line erased/smudged — not legible'],
      }),
    });
  }
  {
    const h = makeHand(2101, { rot: 6 });
    C.push({
      id: 'H21',
      notes: 'ROUGH / NAME CROPPED: page top cut off by framing (name line out of frame) + 5 deg rotation + desk clutter. Decimals Review (Casey Nguyen on paper, not visible), 4/5.',
      effects: ['crop-top', 'rotation', 'clutter'],
      html: doc(printed({ hand: 'Comic Sans MS', ink: '#1d3a8f', extra: 'h1{margin-top:44px}' }), `${header(h, 'Casey Nguyen', 'Decimals Review')}
${q(1, '0.4 + 0.35 =', h.span('0.75'))}
${q(2, '2.5 × 4 =', h.span('10'))}
${q(3, '6.3 − 2.8 =', h.span('3.5'))}
${q(4, '1.2 ÷ 0.3 =', h.span('0.4'))}
${q(5, 'Round 3.476 to the nearest tenth', h.span('3.5'))}`),
      rough: {
        seed: 21,
        desk: 'grey',
        place: { cx: 0.52, cy: 0.2, width: 0.98, rot: 5, keyTop: 0.06 },
        clutter: [
          { type: 'mug', x: 0.12, y: 0.93, rot: 0, s: 0.9 },
          { type: 'eraser', x: 0.86, y: 0.9, rot: 30, s: 1.1, over: true },
        ],
        jpeg: { quality: 64 },
      },
      expected: expected('H21', {
        studentName: null,
        studentNameStatus: 'absent',
        nameMissing: true,
        assignmentTitle: 'Decimals Review',
        draftScore: 80,
        itemCount: 5,
        gaps: ['dividing decimals'],
        warnings: ['top of page (name line) cropped out of frame'],
      }),
    });
  }
  {
    const h = makeHand(2201, { rot: 5 });
    C.push({
      id: 'H22',
      notes: 'ROUGH / LAST QUESTION CROPPED: crumpled paper creases + low light + bottom cut off (Q5 out of frame). Sam Patel, Exponents; visible Q1-Q4, 3/4.',
      effects: ['crumpled-creases', 'low-light-noise-jpeg', 'crop-bottom'],
      html: doc(printed({ hand: 'Bradley Hand', ink: '#222' }), `${header(h, 'Sam Patel', 'Exponents')}
${q(1, '2³ =', h.span('8'))}
${q(2, '5² =', h.span('25'))}
${q(3, '10⁰ =', h.span('0'))}
${q(4, '3⁴ =', h.span('81'))}
${q(5, '4³ =', h.span('64'))}`),
      rough: {
        seed: 22,
        desk: 'wood',
        out: [1600, 1200],
        place: { cx: 0.5, cy: 0.75, width: 0.9, rot: -1.5, keyTop: 0.1 },
        clutter: [
          { type: 'ruler', x: 0.42, y: 0.08, rot: 4, s: 1.1 },
          { type: 'pencil', x: 0.78, y: 0.2, rot: -14, s: 0.9 },
          { type: 'clip', x: 0.12, y: 0.16, rot: 30, s: 1.2 },
        ],
        crumple: { amp: 4, waves: 12, shadeGain: 1.2 },
        creases: { count: 9, strength: 0.4 },
        lowLight: { gain: 0.6, cast: [1, 0.92, 0.75], gamma: 1.1 },
        noise: { sigma: 10, chroma: 0.8 },
        jpeg: { quality: 45 },
      },
      expected: expected('H22', {
        studentName: 'Sam Patel',
        assignmentTitle: 'Exponents',
        draftScore: 75,
        draftScoreStatus: 'uncertain',
        itemCount: 4,
        gaps: ['zero exponent'],
        warnings: ['bottom of page cropped; Q5 not visible — score on visible Q1-Q4 (or null)'],
      }),
    });
  }
  {
    const h = makeHand(2301, { rot: 6 });
    C.push({
      id: 'H23',
      notes: 'ROUGH / TWO PAPERS: Taylor Kim sheet on top, Jordan Chen\'s Fractions sheet (H02) overlapping underneath with its name visible + mild perspective + hand shadow. 5/6.',
      effects: ['overlap-two-students', 'perspective', 'hand-shadow'],
      html: doc(printed({ hand: 'Marker Felt', ink: '#2a2a2a' }), `${header(h, 'Taylor Kim', 'Multiplication Facts')}
${q(1, '6 × 8 =', h.span('48'))}
${q(2, '7 × 7 =', h.span('49'))}
${q(3, '9 × 6 =', h.span('54'))}
${q(4, '8 × 7 =', h.span('54'))}
${q(5, '12 × 3 =', h.span('36'))}
${q(6, '4 × 9 =', h.span('36'))}`),
      rough: {
        seed: 23,
        desk: 'laminate',
        overlap: { src: 'H02', place: { cx: 0.58, cy: 0.3, width: 0.8, rot: 11 }, paper: { pad: 50, minH: 0.25 } },
        place: { cx: 0.43, cy: 0.62, width: 0.78, rot: -6, keyTop: 0.12, keySide: 0.04 },
        handShadow: { x: 0.08, y: 0.95, r: 0.2, rot: 40, opacity: 0.45 },
        jpeg: { quality: 66 },
      },
      expected: expected('H23', {
        studentName: 'Taylor Kim',
        multiStudent: true,
        assignmentTitle: 'Multiplication Facts',
        draftScore: 83,
        itemCount: 6,
        gaps: ['multiplication facts (8s/7s)'],
        warnings: ['second student paper (Jordan Chen, Fractions Practice) partly in frame'],
      }),
    });
  }
  {
    const h = makeHand(2401, { rot: 7, dy: 3, slant: 8, size: 0.12 });
    C.push({
      id: 'H24',
      hand: true,
      notes: 'ROUGH + HANDWRITTEN: notebook page, everything handwritten (Bradley Hand, slanted), right edge curling up + perspective + shadow from phone. Alex Rivera, Simplify pg 112, 5/6 (distributive sign slip).',
      effects: ['curled-page', 'perspective', 'hand-shadow', 'handwritten'],
      html: doc(notebook({ hand: 'Bradley Hand', ink: '#273a7a' }), `${holes()}
<div class="mg" style="top:24px;left:520px;transform:rotate(-2deg)">${h.glyphs('Alex Rivera')}</div>
<div class="mg" style="top:24px;left:130px;font-size:24px">${h.glyphs('Math  9/29')}</div>
${h.line('Pg 112 #1-6  Simplify')}
${h.line('1)  3x + 2x = 5x')}
${h.line('2)  4y − y = 3y')}
${h.line('3)  2(a + 3) = 2a + 6')}
${h.line('4)  5m + 3 − 2m = 3m + 3')}
${h.line('5)  6k − 6k = 0')}
${h.line('6)  3(2b − 1) = 6b − 1')}`),
      rough: {
        seed: 24,
        desk: 'wood',
        place: { cx: 0.5, cy: 0.5, width: 0.82, rot: 3, keyTop: 0.2, keySide: 0.08 },
        curl: { start: 0.6, squeeze: 60, fan: 45, bow: 14, dark: 0.38 },
        handShadow: { x: 0.18, y: 0.0, r: 0.24, rot: 160, opacity: 0.4, blur: 60 },
        jpeg: { quality: 62 },
      },
      expected: expected('H24', {
        studentName: 'Alex Rivera',
        assignmentTitle: 'Pg 112 #1-6 Simplify',
        draftScore: 83,
        itemCount: 6,
        gaps: ['distributive property'],
      }),
    });
  }
  {
    const h = makeHand(2501, { rot: 5 });
    C.push({
      id: 'H25',
      notes: 'ROUGH: paper folded in quarters (cross creases) + glare on lower-right + heavy double JPEG. Jamie Ortiz, Commas Practice, 3/4.',
      effects: ['folded-creases', 'glare', 'heavy-jpeg'],
      html: doc(printed({ hand: 'Noteworthy', ink: '#173a8a', extra: '.a{font-size:25px}.q{font-size:21px}' }), `${header(h, 'Jamie Ortiz', 'Commas Practice', { meta: 'Rewrite each sentence with commas.' })}
${q(1, 'I bought apples pears and grapes.', `<br>${h.span('I bought apples, pears, and grapes.')}`)}
${q(2, 'After lunch we went outside.', `<br>${h.span('After lunch, we went outside.')}`)}
${q(3, 'My dog Max likes the park.', `<br>${h.span('My dog, Max, likes the park.')}`)}
${q(4, 'Yes I will come to the party.', `<br>${h.span('Yes I will come to the party.')}`)}`),
      rough: {
        seed: 25,
        desk: 'carpet',
        place: { cx: 0.5, cy: 0.5, width: 0.88, rot: 2, keyTop: 0.1 },
        folds: [
          { axis: 'v', pos: 0.5, kink: 2 },
          { axis: 'h', pos: 0.5, kink: 2 },
        ],
        glare: [{ pcx: 330, pcy: 560, rx: 0.15, ry: 0.05, strength: 0.85, core: 0.45 }],
        jpeg: { quality: 34, double: 22 },
      },
      expected: expected('H25', {
        studentName: 'Jamie Ortiz',
        assignmentTitle: 'Commas Practice',
        draftScore: 75,
        draftScoreStatus: 'uncertain',
        itemCount: 4,
        gaps: ['comma after introductory word'],
      }),
    });
  }
  {
    const h = makeHand(2601, { rot: 6 });
    C.push({
      id: 'H26',
      notes: 'ROUGH: heavy defocus (missed autofocus) + sensor noise + dim. Morgan Ellis, Place Value, 4/4.',
      effects: ['defocus', 'low-light-noise-jpeg'],
      html: doc(printed({ hand: 'Chalkboard SE', ink: '#202020', extra: '.name{font-size:26px}' }), `${header(h, 'Morgan Ellis', 'Place Value')}
${q(1, 'Value of the 7 in 4,732:', h.span('700'))}
${q(2, '3,000 + 400 + 5 =', h.span('3,405'))}
${q(3, 'Round 862 to the nearest hundred:', h.span('900'))}
${q(4, 'Digit in the tens place of 5,193:', h.span('9'))}`),
      rough: {
        seed: 26,
        desk: 'laminate',
        place: { cx: 0.5, cy: 0.5, width: 0.86, rot: -5, keyTop: 0.07 },
        defocus: 3.0,
        lowLight: { gain: 0.72, cast: [1, 0.95, 0.85], gamma: 1.05 },
        noise: { sigma: 9, chroma: 0.8 },
        jpeg: { quality: 55 },
      },
      expected: expected('H26', {
        studentName: 'Morgan Ellis',
        studentNameStatus: 'uncertain',
        assignmentTitle: 'Place Value',
        draftScore: 100,
        draftScoreStatus: 'uncertain',
        itemCount: 4,
        gaps: [],
      }),
    });
  }
  {
    const h = makeHand(2701, { rot: 5 });
    C.push({
      id: 'H27',
      notes: 'ROUGH / NAME UNDER FLASH GLARE: phone flash hotspot blows out the name line + dark vignette corners + perspective. Weather Words (Taylor Kim on paper, not legible), 2/3.',
      effects: ['flash-glare', 'vignette', 'perspective'],
      html: doc(printed({ hand: 'Noteworthy', ink: '#3a4fa0' }), `${header(h, 'Taylor Kim', 'Weather Words')}
${q(1, 'Tool that measures temperature:', h.span('thermometer'))}
${q(2, 'Water falling from clouds:', h.span('precipitation'))}
${q(3, 'Tool that measures wind speed:', h.span('barometer'))}`),
      rough: {
        seed: 27,
        desk: 'grey',
        place: { cx: 0.5, cy: 0.5, width: 0.86, rot: -2, keyTop: -0.18, keySide: 0.06 },
        glare: [{ pcx: 225, pcy: 66, rx: 0.24, ry: 0.065, strength: 1, core: 0.95, coreLevel: 1 }],
        vignette: 0.85,
        noise: { sigma: 7, chroma: 0.7 },
        jpeg: { quality: 58 },
      },
      expected: expected('H27', {
        studentName: null,
        studentNameStatus: 'uncertain',
        studentNameAccept: ['Taylor Kim'],
        nameMissing: true,
        assignmentTitle: 'Weather Words',
        draftScore: 67,
        itemCount: 3,
        gaps: ['weather instruments'],
        warnings: ['flash glare over name line — only a faint ghost of the first letters; null preferred, Taylor tolerated'],
      }),
    });
  }
  {
    const h = makeHand(2801, { rot: 8, dy: 3, size: 0.12 });
    C.push({
      id: 'H28',
      notes: 'ROUGH: -18 deg rotation + low light + pen marks/doodles + student cross-outs. Casey Nguyen, Fix the Spelling, 4/6.',
      effects: ['rotation', 'low-light-noise-jpeg', 'pen-marks'],
      html: doc(printed({ hand: 'Marker Felt', ink: '#1a1a1a' }), `${header(h, 'Casey Nguyen', 'Fix the Spelling', { meta: 'Write each word correctly.' })}
${q(1, 'becuase →', h.span('because'))}
${q(2, 'freind →', h.span([{ x: 'frend' }, ' friend']))}
${q(3, 'beleive →', h.span('beleive'))}
${q(4, 'tommorow →', h.span('tomorrow'))}
${q(5, 'neccessary →', h.span('necesary'))}
${q(6, 'libary →', h.span('library'))}`),
      rough: {
        seed: 28,
        desk: 'wood',
        place: { cx: 0.5, cy: 0.5, width: 0.78, rot: -18, keyTop: 0.06 },
        penMarks: [
          { type: 'doodle', x: 0.86, y: 0.2, s: 1.3, color: '#1d3a8f' },
          { type: 'star', x: 0.88, y: 0.55, s: 1, color: '#1d3a8f' },
          { type: 'scribble', x: 0.04, y: 0.93, s: 0.9, color: '#1d3a8f' },
          { type: 'blot', x: 0.5, y: 0.97, s: 1.2, color: '#1d3a8f' },
        ],
        lowLight: { gain: 0.5, cast: [1, 0.86, 0.62], gamma: 1.2 },
        noise: { sigma: 12, chroma: 1 },
        jpeg: { quality: 42 },
      },
      expected: expected('H28', {
        studentName: 'Casey Nguyen',
        assignmentTitle: 'Fix the Spelling',
        draftScore: 67,
        itemCount: 6,
        gaps: ['spelling: ie/ei and double letters'],
      }),
    });
  }
  {
    const h = makeHand(2901, { rot: 5 });
    const ghost = (s) => `<span style="position:absolute;margin-left:-70px;margin-top:-10px;color:#c9c9c9">${h.glyphs(s)}</span>`;
    C.push({
      id: 'H29',
      notes: 'ROUGH: eraser smudges over Q2/Q4 (ghost of an erased answer under Q4) + faint pencil + perspective + side shadow. Riley Brooks, Elapsed Time, 3/4.',
      effects: ['eraser-smudge', 'faint-pencil', 'perspective', 'hand-shadow'],
      html: doc(printed({ hand: 'Bradley Hand', ink: '#7d7d7d' }), `${header(h, 'Riley Brooks', 'Elapsed Time')}
${q(1, '2:00 to 2:45 is how long?', h.span('45 min'))}
${q(2, '9:30 + 20 minutes =', h.span('9:50'))}
${q(3, '11:40 + 30 minutes =', h.span('12:10'))}
${q(4, '7:15 − 25 minutes =', `${h.span('6:40')}${ghost('6:50')}`)}`),
      rough: {
        seed: 29,
        desk: 'wood',
        place: { cx: 0.5, cy: 0.5, width: 0.84, rot: 4, keyTop: 0.16, keySide: -0.1 },
        smudges: [
          { cx: 430, cy: 284, cw: 200, ch: 40, rot: -6, opacity: 0.3, pill: true },
          { cx: 420, cy: 440, cw: 220, ch: 46, rot: 3, opacity: 0.32, pill: true },
        ],
        fadeInk: 0.9,
        handShadow: { x: 1.02, y: 0.45, r: 0.22, rot: -90, opacity: 0.45 },
        jpeg: { quality: 58 },
      },
      expected: expected('H29', {
        studentName: 'Riley Brooks',
        assignmentTitle: 'Elapsed Time',
        draftScore: 75,
        draftScoreStatus: 'uncertain',
        itemCount: 4,
        gaps: ['elapsed time crossing the hour'],
        ambiguities: ['Q4 has an erased earlier answer ghosting under the final 6:40'],
      }),
    });
  }

  // ---------------- FULLY HANDWRITTEN ----------------
  {
    const h = makeHand(3001, { rot: 6, dy: 2.5, slant: -3 });
    C.push({
      id: 'H30',
      hand: true,
      notes: 'HANDWRITTEN (clean scan): notebook, Noteworthy, upright; cross-out on Q3, Q4 answer written in left margin with an arrow. Sam Patel, Word Problems, 3/4.',
      effects: ['handwritten', 'cross-outs', 'margin-answer-arrow'],
      html: doc(notebook({ hand: 'Noteworthy', ink: '#2b2b2b', size: 27 }), `${holes()}
<div class="mg" style="top:28px;left:130px">${h.glyphs('Sam Patel')}</div>
<div class="mg" style="top:30px;left:560px;font-size:23px">${h.glyphs('Word Problems  9/29')}</div>
${h.line('1) Mia has 3 bags of 8 marbles. How many?')}
${h.line('     3 x 8 = 24 marbles')}
${h.line('2) 45 cookies shared by 5 friends. Each gets?')}
${h.line('     45 ÷ 5 = 9')}
${h.line('3) 18 kids + 27 kids. Total?')}
${h.line(['     18 + 27 = ', { x: '35' }, '  45'])}
${h.line('4) 100 pages, read 37. How many left?')}
${h.line('     100 − 37 =')}
<div class="mg" style="top:395px;left:14px;font-size:30px;transform:rotate(-12deg)">${h.glyphs('63')}</div>
<svg class="mg" style="top:380px;left:52px" width="150" height="60"><path d="M140 30 C 100 10, 60 10, 18 34" stroke="#2b2b2b" stroke-width="3" fill="none"/><path d="M18 34 l14 -12 M18 34 l18 4" stroke="#2b2b2b" stroke-width="3" fill="none"/></svg>`),
      expected: expected('H30', {
        studentName: 'Sam Patel',
        assignmentTitle: 'Word Problems',
        draftScore: 75,
        itemCount: 4,
        gaps: ['subtraction with regrouping'],
        ambiguities: ['Q4 answer is in the left margin connected by an arrow'],
      }),
    });
  }
  {
    const h = makeHand(3101, { rot: 4, dy: 1.5, slant: 14, size: 0.06 });
    C.push({
      id: 'H31',
      hand: true,
      notes: 'HANDWRITTEN (clean scan): Chalkboard SE heavily right-slanted, short answers. Morgan Ellis, States of Matter, 3/3.',
      effects: ['handwritten', 'slant'],
      html: doc(notebook({ hand: 'Chalkboard SE', ink: '#1f3b8c', size: 26 }), `${holes()}
<div class="mg" style="top:28px;left:130px">${h.glyphs('Morgan Ellis   Science')}</div>
${h.line('States of Matter')}
${h.line('1. Name the 3 states: solid, liquid, gas')}
${h.line('2. Ice turning to water is called melting')}
${h.line('3. Water vapor is a gas')}`),
      expected: expected('H31', {
        studentName: 'Morgan Ellis',
        assignmentTitle: 'States of Matter',
        draftScore: 100,
        itemCount: 3,
        gaps: [],
      }),
    });
  }
  {
    const h = makeHand(3201, { rot: 9, dy: 4, size: 0.16, lineRot: 2.5 });
    C.push({
      id: 'H32',
      hand: true,
      notes: 'HANDWRITTEN + ROUGH: big wobbly Marker Felt kid writing (stacked addition rewritten inline), rotation 11 deg + low light + noise. Taylor Kim, Adding 2-Digit Numbers, 4/5.',
      effects: ['handwritten', 'rotation', 'low-light-noise-jpeg'],
      html: doc(notebook({ hand: 'Marker Felt', ink: '#333', size: 32 }), `${holes()}
<div class="mg" style="top:24px;left:130px;font-size:34px">${h.glyphs('Taylor K.')}</div>
${h.line('Adding 2-Digit Numbers')}
${h.line('1)  47 + 38 = 85')}
${h.line('2)  56 + 29 = 85')}
${h.line('3)  68 + 14 = 82')}
${h.line('4)  39 + 46 = 85')}
${h.line('5)  75 + 18 = 83')}`),
      rough: {
        seed: 32,
        desk: 'carpet',
        place: { cx: 0.5, cy: 0.5, width: 0.82, rot: 11, keyTop: 0.08 },
        lowLight: { gain: 0.55, cast: [1, 0.9, 0.7], gamma: 1.15 },
        noise: { sigma: 11, chroma: 1 },
        jpeg: { quality: 46 },
      },
      expected: expected('H32', {
        studentName: 'Taylor K.',
        assignmentTitle: 'Adding 2-Digit Numbers',
        draftScore: 80,
        itemCount: 5,
        gaps: ['addition with regrouping'],
      }),
    });
  }
  {
    const h = makeHand(3301, { rot: 7, dy: 3, slant: 4 });
    C.push({
      id: 'H33',
      hand: true,
      notes: 'HANDWRITTEN (clean scan): Comic Sans kid print, abbreviated name "Jamie O.", cross-out + rewrite on Q2, wrong final answer Q4. Equivalent Fractions, 3/4.',
      effects: ['handwritten', 'cross-outs', 'abbrev-name'],
      html: doc(notebook({ hand: 'Comic Sans MS', ink: '#3a2a7a', size: 27 }), `${holes()}
<div class="mg" style="top:26px;left:130px">${h.glyphs('Jamie O.')}</div>
${h.line('Equivalent Fractions')}
${h.line('1)  1/2 = 2/4')}
${h.line(['2)  2/3 = ', { x: '4/9' }, '  4/6'])}
${h.line('3)  3/4 = 6/8')}
${h.line('4)  1/3 = 2/9')}
<div class="mg" style="top:300px;left:470px;font-size:22px;transform:rotate(-6deg)">${h.glyphs('<- checked!')}</div>`),
      expected: expected('H33', {
        studentName: 'Jamie O.',
        assignmentTitle: 'Equivalent Fractions',
        draftScore: 75,
        itemCount: 4,
        gaps: ['equivalent fractions'],
      }),
    });
  }
  {
    const h = makeHand(3401, { rot: 6, dy: 2.5, slant: 10 });
    C.push({
      id: 'H34',
      hand: true,
      notes: 'HANDWRITTEN + ROUGH: Bradley Hand on notebook, crumpled + glare streak + perspective. Casey Nguyen, Measurement Conversions, 3/4.',
      effects: ['handwritten', 'crumpled-creases', 'glare', 'perspective'],
      html: doc(notebook({ hand: 'Bradley Hand', ink: '#14306e', size: 29 }), `${holes()}
<div class="mg" style="top:26px;left:130px">${h.glyphs('Casey Nguyen')}</div>
<div class="mg" style="top:28px;left:600px;font-size:22px">${h.glyphs('9/29')}</div>
${h.line('Measurement Conversions')}
${h.line('1)  1 ft = 12 in')}
${h.line('2)  3 ft = 36 in')}
${h.line('3)  2 yd = 6 ft')}
${h.line('4)  24 in = 3 ft')}`),
      rough: {
        seed: 34,
        desk: 'wood',
        place: { cx: 0.5, cy: 0.5, width: 0.84, rot: -6, keyTop: 0.22, keySide: -0.06 },
        crumple: { amp: 5, waves: 12, shadeGain: 1.3 },
        creases: { count: 10, strength: 0.42 },
        glare: [{ pcx: 420, pcy: 300, rx: 0.22, ry: 0.035, strength: 0.72, core: 0.3 }],
        jpeg: { quality: 56 },
      },
      expected: expected('H34', {
        studentName: 'Casey Nguyen',
        assignmentTitle: 'Measurement Conversions',
        draftScore: 75,
        itemCount: 4,
        gaps: ['inches to feet conversion'],
      }),
    });
  }
  return C;
}
