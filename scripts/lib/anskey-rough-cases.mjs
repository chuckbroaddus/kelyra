/**
 * Rough phone-photo (K18–K29) and teacher-handwritten (K30–K35) answer-key cases.
 * Consumed by scripts/gen-anskey-ingest-fixtures.mjs; degradation recipes live in each
 * case's `rough` block and are applied by scripts/degrade-anskey-fixtures.mjs.
 *
 * Page coordinates in `rough.page` effects are CSS px of the 840x1100 render viewport.
 * Photo coordinates in `rough.photo` effects are fractions of the output photo.
 *
 * Ground truth honesty rules (see README):
 *  - answer obscured in the degraded image  -> answer "", needsTeacher: true (any answer = hallucinated)
 *  - answer borderline / partially obscured -> real answer + accept_absent: true (abstaining is fine)
 *  - item fully cropped out                 -> not listed; meta.no_hallucinate_extra_items punishes invention
 *  - item partly cut at the crop edge       -> optional: true (+ accept_absent)
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Handwriting renderer: per-glyph jitter in size/baseline/rotation + per-word slant. */
function makeHand(seed, base) {
  const r = mulberry32(seed);
  const j = (a) => (r() * 2 - 1) * a;
  const hand = {
    write(text, o = {}) {
      const size = o.size ?? base.size;
      const color = o.color ?? base.color;
      const font = o.font ?? base.font;
      const slant = (o.slant ?? base.slant ?? 0) + j(3);
      const jit = o.jitter ?? base.jitter ?? 1;
      const chars = [...String(text)]
        .map((ch) =>
          ch === ' '
            ? '<span style="display:inline-block;width:0.32em"></span>'
            : `<span style="display:inline-block;transform:translateY(${j(2.2 * jit).toFixed(1)}px) rotate(${j(6 * jit).toFixed(1)}deg);font-size:${(size * (1 + j(0.09 * jit))).toFixed(1)}px">${esc(ch)}</span>`,
        )
        .join('');
      return `<span style="display:inline-block;white-space:nowrap;font-family:'${font}',cursive;color:${color};font-weight:${o.weight ?? base.weight ?? 400};transform:translateY(${j(3 * jit).toFixed(1)}px) rotate(${j(2.2 * jit).toFixed(1)}deg) skewX(${slant.toFixed(1)}deg)">${chars}</span>`;
    },
    circle(inner, o = {}) {
      const color = o.color ?? base.color;
      const rr = () => (40 + r() * 20).toFixed(0) + '%';
      return `<span style="display:inline-block;border:${o.w ?? 2.2}px solid ${color};border-radius:${rr()} ${rr()} ${rr()} ${rr()};padding:0 ${(5 + r() * 5).toFixed(0)}px;margin:0 2px;transform:rotate(${j(14).toFixed(1)}deg) translateY(${j(2).toFixed(1)}px)">${inner}</span>`;
    },
    crossOut(inner, o = {}) {
      const color = o.color ?? base.color;
      let d = 'M0 10';
      for (let k = 1; k <= 8; k += 1) d += ` L${(k * 12.5).toFixed(1)} ${k % 2 ? 2 + r() * 4 : 14 + r() * 4}`;
      return `<span style="position:relative;display:inline-block;margin-right:6px">${inner}<svg viewBox="0 0 100 20" preserveAspectRatio="none" style="position:absolute;left:-5px;top:12%;width:calc(100% + 10px);height:76%;overflow:visible"><path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg></span>`;
    },
    j,
    r,
  };
  return hand;
}

const LINED = `body{margin:0;width:840px;height:1100px;box-sizing:border-box;padding:34px 40px 0 96px;position:relative;overflow:hidden;
background:#fcfcf6 repeating-linear-gradient(180deg,transparent 0,transparent 37px,#a8c3e6 37px,#a8c3e6 38px);background-position:0 28px}
body:before{content:'';position:absolute;left:76px;top:0;bottom:0;width:2px;background:#e5a3a3}
.ln{height:38px;line-height:38px;white-space:nowrap;position:relative}
.hole{position:absolute;left:26px;width:22px;height:22px;border-radius:50%;background:#d9d9d2;box-shadow:inset 1px 1px 3px #999}
.mg{position:absolute;left:-84px;width:76px;text-align:right}
.side{position:absolute;left:470px}`;

function holes() {
  return '<div class="hole" style="top:120px"></div><div class="hole" style="top:540px"></div><div class="hole" style="top:960px"></div>';
}

const BUBBLE = `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:26px 34px;background:#fbfbf7;width:840px;height:1100px;box-sizing:border-box;position:relative}
.hdr{border:2px solid #b42318;color:#b42318;padding:8px 12px;display:flex;justify-content:space-between;align-items:center}
.hdr h1{font-size:21px;margin:0;letter-spacing:.5px}.hdr .sub{font-size:12px;color:#7a271a}
.fld{font-size:12px;color:#333;margin:10px 0 14px}.fld span{display:inline-block;border-bottom:1px solid #555;min-width:150px;margin:0 16px 0 4px}
.cols{display:flex;gap:30px}.col{flex:1;border-top:3px solid #b42318;padding-top:8px}
.brow{height:42px;display:flex;align-items:center;font-size:15px}
.brow:nth-child(5n){border-bottom:1px dashed #d4a29c}
.qn{width:34px;text-align:right;margin-right:12px;font-weight:700;color:#b42318}
.bub{width:24px;height:24px;border:1.6px solid #b42318;border-radius:50%;margin:0 5px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#b42318}
.bub.on{background:radial-gradient(circle at 45% 40%,#3b3b3b 0,#1c1c1c 60%,#2a2a2a 100%);border-color:#222;color:transparent}
.foot{position:absolute;bottom:22px;left:34px;right:34px;font-size:10px;color:#a05b52;display:flex;justify-content:space-between}`;

function bubbleSheet({ title, sub, answers, perCol, opts = 'ABCD', fields = 'Name: <span>ANSWER KEY</span> Form: <span>B</span>' }) {
  const cols = [];
  for (let c = 0; c * perCol < answers.length; c += 1) {
    const rows = [];
    for (let k = c * perCol; k < Math.min(answers.length, (c + 1) * perCol); k += 1) {
      const b = [...opts]
        .map((o) => `<span class="bub${o === answers[k] ? ' on' : ''}">${o}</span>`)
        .join('');
      rows.push(`<div class="brow"><span class="qn">${k + 1}</span>${b}</div>`);
    }
    cols.push(`<div class="col">${rows.join('')}</div>`);
  }
  return `<div class="hdr"><h1>${esc(title)}</h1><div class="sub">${sub}</div></div>
<div class="fld">${fields}</div>
<div class="cols">${cols.join('')}</div>
<div class="foot"><span>Mark responses with No. 2 pencil. Fill bubble completely.</span><span>FORM 882-E · DO NOT WRITE IN THIS AREA</span></div>`;
}

const PRINT = `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:34px 40px;background:#fff;width:840px;height:1100px;box-sizing:border-box;position:relative}
h1{font-size:22px;margin:0 0 4px}.meta{color:#555;font-size:13px;margin-bottom:16px;border-bottom:2px solid #222;padding-bottom:8px}
.r{height:44px;display:flex;align-items:center;font-size:15px;border-bottom:1px solid #eee}
.n{width:34px;font-weight:700}.s{flex:1;color:#222}.a{width:210px;font-weight:700;color:#0b0b0b;font-size:16px}.p{width:56px;color:#666;font-size:12px;text-align:right}
.two{display:flex;gap:36px}.two>div{flex:1}
.ft{position:absolute;bottom:26px;left:40px;font-size:11px;color:#777}`;

function printedRows(rows) {
  return rows
    .map(
      ([n, s, a, p]) =>
        `<div class="r"><span class="n">${n}.</span><span class="s">${esc(s)}</span><span class="a">${esc(a)}</span>${p != null ? `<span class="p">(${p} pt${p === 1 ? '' : 's'})</span>` : ''}</div>`,
    )
    .join('');
}

function mcItems(letters, start = 1, stems = null) {
  return [...letters].map((a, k) => ({ n: start + k, stem: stems ? stems[k] : String(start + k), answer: a, points: 1, type: 'mc' }));
}

export function buildRoughCases({ page, item, expected }) {
  const I = (n, stem, answer, points = 1, extra = {}) => {
    const it = item(n, stem, answer, points, extra);
    for (const k of ['optional', 'accept_absent', 'legibility']) if (extra[k] != null) it[k] = extra[k];
    return it;
  };
  const fromSimple = (arr) =>
    arr.map((x) => I(x.n, x.stem, x.answer, x.points ?? 1, { type: x.type, needsTeacher: x.needsTeacher, optional: x.optional, accept_absent: x.accept_absent, legibility: x.legibility, note: x.note }));
  const raw = (style, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${style}</style></head><body>
${body}
</body></html>`;

  const cases = [];

  // ---------------- K18 bubble sheet, strong perspective + motion blur + noise ----------------
  {
    const ans = 'CADBEBACDDEABCCADBEA';
    cases.push({
      id: 'K18',
      style: 'bubble',
      rough: {
        seed: 1018,
        effects: ['perspective', 'motion_blur', 'sensor_noise', 'jpeg'],
        background: { kind: 'table', tone: [92, 88, 84] },
        place: { rot: 3, scale: 0.86, corners: [[0.09, 0.02], [-0.07, 0.05], [0.02, -0.01], [-0.01, -0.03]] },
        page: [],
        photo: [{ type: 'motion', len: 7, angle: 20 }, { type: 'noise', sigma: 11 }, { type: 'jpeg', quality: 55 }],
      },
      notes: 'Bubble-sheet key (20 Q, A–E) shot at a steep angle: strong perspective, hand-shake motion blur, sensor noise, JPEG.',
      fields: ['header', 'items.answer', 'maxScore', 'bubble'],
      html: raw(BUBBLE, bubbleSheet({ title: 'UNIT 5 TEST — ANSWER KEY', sub: 'Biology · 20 questions · 20 pts', answers: ans, perCol: 10, opts: 'ABCDE' })),
      expected: expected('K18', { header: 'UNIT 5 TEST — ANSWER KEY', maxScore: 20, items: fromSimple(mcItems(ans)) }),
    });
  }

  // ---------------- K19 bubble sheet, 16deg rotation + low light + JPEG ----------------
  {
    const ans = 'BDACCADBBDACADB';
    cases.push({
      id: 'K19',
      style: 'bubble',
      rough: {
        seed: 1019,
        effects: ['rotation_16deg', 'low_light', 'sensor_noise', 'jpeg_heavy'],
        background: { kind: 'desk', clutter: true },
        place: { rot: -16, scale: 0.8 },
        page: [],
        photo: [{ type: 'lowlight', gain: 0.58, gamma: 1.25, cast: [1.06, 0.98, 0.82], vignette: 0.55 }, { type: 'noise', sigma: 15 }, { type: 'jpeg', quality: 36 }],
      },
      notes: 'Single-column 15-Q bubble key rotated −16° on a desk, dim warm room light, noise, heavy JPEG.',
      fields: ['header', 'items.answer', 'bubble', 'rotation'],
      html: raw(BUBBLE, bubbleSheet({ title: 'CHAPTER 9 QUIZ — KEY', sub: 'Earth Science · 15 questions', answers: ans, perCol: 15, opts: 'ABCD' })),
      expected: expected('K19', { header: 'CHAPTER 9 QUIZ — KEY', maxScore: 15, items: fromSimple(mcItems(ans)) }),
    });
  }

  // ---------------- K20 printed 2-col MC key, glare hotspot over right column ----------------
  {
    const L = 'BDACCBDABC';
    const R = 'DACBDCABAD';
    const stemsL = ['Complementary angles sum', 'Vertical angles are', 'Sum of triangle angles', 'Pythagorean triple', 'Area of circle uses', 'Isosceles base angles', 'Parallel line slope', 'Rhombus diagonals', 'Exterior angle theorem', 'Midpoint formula'];
    const stemsR = ['Volume of cylinder', 'SOH-CAH-TOA: sine', 'Similar triangles', 'Regular hexagon angle', 'Arc length uses', 'Inscribed angle', 'Tangent to circle', 'Distance formula', 'Converse statement', 'Surface area of cube'];
    const col = (letters, stems, start) =>
      [...letters]
        .map((a, k) => `<div class="r"><span class="n">${start + k}.</span><span class="s">${stems[k]}</span><span class="a" style="width:44px">${a}</span></div>`)
        .join('');
    // Right column answer letters sit near x≈780; rows y≈ 152 + 44*(k).
    const exp = [];
    [...L].forEach((a, k) => exp.push({ n: k + 1, stem: stemsL[k], answer: a, type: 'mc' }));
    [...R].forEach((a, k) => {
      const n = k + 11;
      const e = { n, stem: stemsR[k], answer: a, type: 'mc' };
      if (n === 14 || n === 15) Object.assign(e, { answer: '', needsTeacher: true, legibility: 'glare' });
      if (n === 13 || n === 16) e.accept_absent = true;
      exp.push(e);
    });
    cases.push({
      id: 'K20',
      style: 'print',
      rough: {
        seed: 1020,
        effects: ['glare_hotspot_right_column', 'perspective', 'jpeg'],
        background: { kind: 'desk', clutter: false },
        place: { rot: 2, scale: 0.88, corners: [[0.03, 0.03], [-0.02, 0.0], [0.0, -0.02], [0.02, 0.01]] },
        page: [{ type: 'glare', cx: 775, cy: 284, rx: 115, ry: 56, core: 0.58, strength: 1.0 }],
        photo: [{ type: 'lowlight', gain: 0.8, gamma: 1.1, vignette: 0.3 }, { type: 'noise', sigma: 8 }, { type: 'jpeg', quality: 60 }],
      },
      notes: 'Two-column printed MC key (20 Q). Overhead-light glare hotspot blows out right-column answers 14–15 (needsTeacher); 13/16 at glare edge (accept_absent).',
      fields: ['header', 'items.answer', 'glare', 'needsTeacher'],
      html: raw(PRINT, `<h1>Geometry Midterm — Key</h1><div class="meta">Part A · Multiple choice · 20 × 1 pt = 20 pts</div>
<div class="two"><div>${col(L, stemsL, 1)}</div><div>${col(R, stemsR, 11)}</div></div><div class="ft">Part B (constructions) graded separately.</div>`),
      expected: expected('K20', { header: 'Geometry Midterm — Key', maxScore: 20, items: fromSimple(exp) }),
      meta: { no_hallucinate_answers: true },
    });
  }

  // ---------------- K21 short-answer key, hand/phone shadow + noise + rotation ----------------
  {
    const rows = [
      [1, 'PPE worn over eyes during labs', 'safety goggles', 1],
      [2, 'Used to smother a clothing fire', 'fire blanket', 1],
      [3, 'Rinse chemical splash in eyes at the', 'eyewash station', 1],
      [4, 'T/F: taste chemicals to identify them', 'False', 1],
      [5, 'Glassware for measuring volume precisely', 'graduated cylinder', 1],
      [6, 'Heat source with adjustable flame', 'Bunsen burner', 1],
      [7, 'First thing to do after any spill', 'tell the teacher', 1],
      [8, 'Explain why long hair is tied back (2 pts)', 'see rubric', 2],
    ];
    cases.push({
      id: 'K21',
      style: 'print',
      rough: {
        seed: 1021,
        effects: ['hand_phone_shadow', 'rotation_6deg', 'sensor_noise'],
        background: { kind: 'desk', clutter: true },
        place: { rot: 6, scale: 0.84 },
        page: [],
        photo: [
          { type: 'shadow', shapes: [{ kind: 'ellipse', cx: 0.9, cy: 0.5, rx: 0.3, ry: 0.2, rot: -30 }, { kind: 'rect', x: 0.62, y: 0.52, w: 0.5, h: 0.22, rot: -24 }], blur: 0.04, strength: 0.6 },
          { type: 'lowlight', gain: 0.92, gamma: 1.05, vignette: 0.3 },
          { type: 'noise', sigma: 10 },
          { type: 'jpeg', quality: 62 },
        ],
      },
      notes: 'Printed short-answer lab-safety key, rotated 6°, soft hand+phone shadow over answers 5–8 on the right (still legible), noise. Item 8 is rubric → needsTeacher.',
      fields: ['header', 'items.answer', 'points', 'needsTeacher', 'shadow'],
      html: raw(PRINT, `<h1>Physical Science — Lab Safety Quiz KEY</h1><div class="meta">Period 4 · Total 9 pts</div>${printedRows(rows)}<div class="ft">Item 8: 2 = two reasons, 1 = one reason.</div>`),
      expected: expected('K21', {
        header: 'Physical Science — Lab Safety Quiz KEY',
        maxScore: 9,
        items: fromSimple(rows.map(([n, s, a, p]) => (n === 8 ? { n, stem: s, answer: '', points: p, needsTeacher: true, type: 'short' } : { n, stem: s, answer: a, points: p, type: 'short' }))),
      }),
    });
  }

  // ---------------- K22 numeric key, very low light + heavy noise + heavy JPEG ----------------
  {
    const rows = [
      [1, '19 + 19', '38'], [2, '56 ÷ 8', '7'], [3, '−4 × 3', '-12'], [4, '3/4 as a decimal', '0.75'],
      [5, '1/8 + 1/4', '3/8'], [6, '9²', '81'], [7, '√256', '16'], [8, '−13 + 8', '-5'],
      [9, '10 ÷ 4', '2.5'], [10, '6x = 78, x =', '13'], [11, '1/2 − 1/3', '1/6'], [12, '4³', '64'],
    ];
    cases.push({
      id: 'K22',
      style: 'print',
      rough: {
        seed: 1022,
        effects: ['low_light', 'heavy_noise', 'jpeg_heavy', 'blur'],
        background: { kind: 'table', tone: [40, 36, 34] },
        place: { rot: -3, scale: 0.9, corners: [[0.0, 0.02], [0.0, -0.01], [-0.02, 0.0], [0.01, 0.0]] },
        page: [],
        photo: [{ type: 'blur', sigma: 1.0 }, { type: 'lowlight', gain: 0.42, gamma: 1.35, cast: [1.08, 0.96, 0.78], vignette: 0.6 }, { type: 'noise', sigma: 22 }, { type: 'jpeg', quality: 26 }],
      },
      notes: 'Pre-algebra numeric key photographed in a dim room: underexposed, warm cast, heavy noise, JPEG q26, slight blur. Tests digit confusions (3/8, 1/7, minus signs).',
      fields: ['header', 'items.answer', 'numeric', 'low_light'],
      html: raw(PRINT, `<h1>Pre-Algebra Quiz 7 — Key</h1><div class="meta">12 pts · show work not required</div>${printedRows(rows.map((r) => [...r, null]))}`),
      expected: expected('K22', { header: 'Pre-Algebra Quiz 7 — Key', maxScore: 12, items: fromSimple(rows.map(([n, s, a]) => ({ n, stem: s, answer: a, type: 'numeric' }))) }),
    });
  }

  // ---------------- K23 folded in quarters + crumpled, creases through answers ----------------
  {
    const words = ['benevolent', 'candid', 'diligent', 'eloquent', 'frugal', 'gregarious', 'meticulous', 'obstinate', 'pragmatic', 'tenacious'];
    const defs = ['kind and generous', 'truthful and straightforward', 'careful and hardworking', 'fluent, persuasive', 'sparing with money', 'fond of company', 'showing great attention to detail', 'stubbornly refusing to change', 'practical, realistic', 'holding firmly; persistent'];
    cases.push({
      id: 'K23',
      style: 'print',
      rough: {
        seed: 1023,
        effects: ['folded_creases', 'crumpled', 'rotation_9deg'],
        background: { kind: 'desk', clutter: false },
        place: { rot: -9, scale: 0.84 },
        page: [{ type: 'crumple', amount: 0.85, bumps: 26, creases: [[0, 560, 840, 545], [430, 0, 415, 1100], [0, 300, 840, 380]] }],
        photo: [{ type: 'lowlight', gain: 0.9, gamma: 1.08, vignette: 0.3 }, { type: 'noise', sigma: 8 }, { type: 'jpeg', quality: 58 }],
      },
      notes: 'Vocab key folded in quarters and crumpled (pocket copy): fold creases cross items 2–3 and 6, plus a diagonal crease; rotated −9°. All answers still readable.',
      fields: ['header', 'items.answer', 'crease'],
      html: raw(PRINT, `<h1>English 10 — Vocabulary Unit 4 Key</h1><div class="meta">Match the word to the definition · 10 pts</div>${printedRows(words.map((w, k) => [k + 1, defs[k], w, null]))}`),
      expected: expected('K23', { header: 'English 10 — Vocabulary Unit 4 Key', maxScore: 10, items: fromSimple(words.map((w, k) => ({ n: k + 1, stem: defs[k], answer: w, type: 'short' }))) }),
    });
  }

  // ---------------- K24 page cropped at bottom (Q12 half, Q13–15 missing) ----------------
  {
    const rows = [
      [1, 'Capital of the Byzantine Empire', 'Constantinople'], [2, 'Year Rome fell (West)', '476'], [3, 'Founder of Islam', 'Muhammad'],
      [4, 'Charlemagne crowned in', '800'], [5, 'Feudal oath of loyalty', 'fealty'], [6, 'Black Death spread by', 'fleas'],
      [7, 'Magna Carta signed in', '1215'], [8, 'Mongol leader', 'Genghis Khan'], [9, 'Silk Road linked China and', 'Europe'],
      [10, 'MC: Crusades began in (A 1066 B 1095 C 1215)', 'B'], [11, 'MC: Hundred Years’ War: England vs (A Spain B France)', 'B'],
      [12, 'Printing press inventor', 'Gutenberg'], [13, 'Renaissance began in', 'Italy'], [14, 'MC: Ottomans took Constantinople (A 1453 B 1492)', 'A'], [15, 'Author of The Prince', 'Machiavelli'],
    ];
    const exp = rows.slice(0, 13).map(([n, s, a]) => ({ n, stem: s, answer: a, type: n >= 10 && n <= 11 ? 'mc' : 'short' }));
    exp[12].optional = true;
    exp[12].accept_absent = true;
    cases.push({
      id: 'K24',
      style: 'print',
      rough: {
        seed: 1024,
        effects: ['cropped_bottom', 'rotation_3deg', 'perspective'],
        background: { kind: 'table', tone: [120, 112, 100] },
        place: { rot: 3, scale: 1.0, dy: 0.0, corners: [[0.02, 0.0], [-0.01, 0.02], [0, 0], [0, 0]] },
        page: [],
        photo: [{ type: 'noise', sigma: 9 }, { type: 'crop', x: 0, y: 0, w: 1, h: 0.612 }, { type: 'jpeg', quality: 60 }],
      },
      notes: 'Header says 15 questions but photo framing cuts off the bottom: Q13 answer sliced in half (optional), Q14–15 not in frame (inventing them = hallucination). Rotated 3°, mild perspective.',
      fields: ['header', 'items.answer', 'crop', 'no_hallucinate_extra_items'],
      html: raw(PRINT, `<h1>World History Quiz 11 — Answer Key</h1><div class="meta">15 questions · 15 points</div>${printedRows(rows.map((r) => [...r, null]))}`),
      expected: expected('K24', { header: 'World History Quiz 11 — Answer Key', maxScore: 15, items: fromSimple(exp) }),
      meta: { no_hallucinate_extra_items: true },
    });
  }

  // ---------------- K25 desk clutter + sticky note covering answers 6–7 ----------------
  {
    const words = ['necessary', 'separate', 'definitely', 'calendar', 'rhythm', 'conscience', 'embarrass', 'occurrence', 'privilege', 'recommend', 'schedule', 'tomorrow'];
    const exp = words.map((w, k) => ({ n: k + 1, stem: `Word ${k + 1}`, answer: w, type: 'short' }));
    exp[5] = { n: 6, stem: 'Word 6', answer: '', needsTeacher: true, legibility: 'occluded', type: 'short' };
    exp[6] = { n: 7, stem: 'Word 7', answer: '', needsTeacher: true, legibility: 'occluded', type: 'short' };
    cases.push({
      id: 'K25',
      style: 'print',
      rough: {
        seed: 1025,
        effects: ['desk_clutter', 'sticky_note_occlusion', 'perspective'],
        background: { kind: 'desk', clutter: true, busy: true },
        place: { rot: -4, scale: 0.74, corners: [[0.04, 0.02], [-0.03, 0.03], [0.0, -0.02], [0.0, 0.0]] },
        page: [{ type: 'sticky', x: 560, y: 327, w: 240, h: 94, rot: -3, color: '#ffe873', text: 'copies for 3rd + 5th!!' }],
        photo: [{ type: 'lowlight', gain: 0.93, gamma: 1.05, vignette: 0.35 }, { type: 'noise', sigma: 9 }, { type: 'jpeg', quality: 58 }],
      },
      notes: 'Spelling key on a cluttered desk (pens, mug, phone, papers). A sticky note covers the answers for words 6–7 (needsTeacher). Perspective tilt.',
      fields: ['header', 'items.answer', 'occlusion', 'needsTeacher'],
      html: raw(PRINT, `<h1>Spelling Test 14 — Key</h1><div class="meta">Ms. Rivera · Grade 5 · 12 words</div>${printedRows(words.map((w, k) => [k + 1, `Word ${k + 1} (dictated)`, w, null]))}`),
      expected: expected('K25', { header: 'Spelling Test 14 — Key', maxScore: 12, items: fromSimple(exp) }),
      meta: { no_hallucinate_answers: true },
    });
  }

  // ---------------- K26 highlighter + red-pen marks over answers + blur ----------------
  {
    const rows = [
      [1, 'Atomic number is the number of (A neutrons B electrons C protons)', 'C'], [2, 'Group 18 elements are (A metals B noble gases)', 'B'],
      [3, 'Formula for table salt', 'NaCl'], [4, 'Bond formed by sharing electrons', 'covalent'], [5, 'Valence electrons in neon', '8'],
      [6, 'Most reactive metal group (A 1 B 2 C 17)', 'A'], [7, 'Reaction that releases heat', 'exothermic'], [8, 'pH of a strong base (A 2 B 7 C 9 D 13)', 'D'],
      [9, 'Molar mass of water (g/mol)', '18'], [10, 'Bond between Na and Cl', 'ionic'],
    ];
    // answer column x≈ 586..796, row k center y≈ 140 + 44k + 22
    const ry = (n) => 104 + 45 * (n - 1);
    cases.push({
      id: 'K26',
      style: 'print',
      rough: {
        seed: 1026,
        effects: ['highlighter_over_answers', 'red_pen_marks', 'blur'],
        background: { kind: 'desk', clutter: false },
        place: { rot: 3, scale: 0.86 },
        page: [
          { type: 'highlighter', color: [255, 236, 60], rects: [[580, ry(3) + 8, 120, 30], [580, ry(4) + 6, 130, 32], [580, ry(7) + 7, 150, 30], [580, ry(10) + 8, 110, 30]] },
          { type: 'highlighter', color: [140, 245, 140], rects: [[580, ry(1) + 8, 40, 30], [580, ry(6) + 8, 40, 30]] },
          {
            type: 'pen',
            color: [205, 30, 40],
            marks: [
              { kind: 'check', x: 548, y: ry(1) + 22 }, { kind: 'check', x: 548, y: ry(2) + 22 }, { kind: 'check', x: 548, y: ry(4) + 22 },
              { kind: 'circle', x: 600, y: ry(5) + 22, rx: 24, ry: 18 }, { kind: 'text', x: 640, y: ry(5) + 30, text: 'or "eight"', size: 20 },
              { kind: 'underline', x: 582, y: ry(9) + 34, w: 40 }, { kind: 'text', x: 600, y: 60, text: 'KEY – P3', size: 30 },
              { kind: 'scribble', x: 590, y: ry(8) + 12, w: 50, h: 26 },
            ],
          },
        ],
        photo: [{ type: 'blur', sigma: 1.2 }, { type: 'noise', sigma: 7 }, { type: 'jpeg', quality: 62 }],
      },
      notes: 'Chem key marked up in highlighter (yellow/green over answers) and red pen (checks, circle on Q5 with "or eight", scribble over Q8 answer letter). Soft focus. Q8 letter scribbled through → accept_absent.',
      fields: ['header', 'items.answer', 'markup', 'note'],
      html: raw(PRINT, `<h1>Chemistry Unit 2 — Key</h1><div class="meta">10 pts</div>${printedRows(rows.map((r) => [...r, null]))}`),
      expected: expected('K26', {
        header: 'Chemistry Unit 2 — Key',
        maxScore: 10,
        items: fromSimple(rows.map(([n, s, a]) => ({ n, stem: s, answer: a, type: /^[A-D]$/.test(a) ? 'mc' : 'short', accept_absent: n === 8 ? true : undefined, note: n === 5 ? 'also accept "eight"' : undefined }))),
      }),
    });
  }

  // ---------------- K27 key photographed on top of a student paper ----------------
  {
    const rows = [
      [1, '3/4 of 24', '18'], [2, '0.6 × 5', '3'], [3, 'Ratio 6:8 simplified', '3:4'], [4, '25% of 60', '15'],
      [5, '2.4 + 3.75', '6.15'], [6, 'Unit rate: $12 for 4', '3'], [7, '−7 + 10', '3'], [8, 'Area of triangle b=6 h=5', '15'],
    ];
    cases.push({
      id: 'K27',
      style: 'print',
      rough: {
        seed: 1027,
        pageHeight: 640,
        effects: ['on_top_of_student_paper', 'rotation_7deg', 'shadow'],
        background: { kind: 'desk', clutter: false, underlay: { asset: '_underlay_student', rot: -6, scale: 0.86, dx: -0.12, dy: 0.12 } },
        place: { rot: 7, scale: 0.72, dx: 0.1, dy: -0.12 },
        page: [],
        photo: [
          { type: 'shadow', shapes: [{ kind: 'ellipse', cx: 0.1, cy: 0.1, rx: 0.4, ry: 0.25, rot: 20 }], blur: 0.06, strength: 0.4 },
          { type: 'noise', sigma: 9 },
          { type: 'jpeg', quality: 60 },
        ],
      },
      notes: 'Short exit-ticket key (8 Q) lying on top of a student’s graded paper (student answers + items 9–12 visible underneath). Reader must take only the key’s 8 answers. Rotated 7°, shadow.',
      fields: ['header', 'items.answer', 'distractor_underlay', 'no_hallucinate_extra_items'],
      html: raw(PRINT.replace('height:1100px', 'height:640px'), `<h1>Math 6 — Exit Ticket KEY</h1><div class="meta">8 pts · Unit 3 review</div>${printedRows(rows.map((r) => [...r, null]))}`),
      expected: expected('K27', { header: 'Math 6 — Exit Ticket KEY', maxScore: 8, items: fromSimple(rows.map(([n, s, a]) => ({ n, stem: s, answer: a, type: 'numeric' }))) }),
      meta: { no_hallucinate_extra_items: true },
      pageHeight: 640,
    });
  }

  // ---------------- K28 bubble sheet, glare over items 7–9 + red pen + JPEG ----------------
  {
    const ans = 'DBCAADCBBACD';
    const exp = mcItems(ans);
    for (const e of exp) {
      if (e.n === 7 || e.n === 8) Object.assign(e, { answer: '', needsTeacher: true, legibility: 'glare' });
    }
    // rows: first row center y ≈ 168, 42px pitch; bubbles x≈ 88..250
    cases.push({
      id: 'K28',
      style: 'bubble',
      rough: {
        seed: 1028,
        effects: ['glare_over_bubbles', 'red_pen', 'jpeg'],
        background: { kind: 'table', tone: [70, 72, 78] },
        place: { rot: -5, scale: 0.86, corners: [[0.02, 0.0], [0.0, 0.03], [-0.02, 0.0], [0.0, -0.02]] },
        page: [
          { type: 'pen', color: [200, 25, 35], marks: [{ kind: 'text', x: 470, y: 205, text: 'KEY - all periods', size: 30 }, { kind: 'circle', x: 520, y: 195, rx: 120, ry: 32 }, { kind: 'text', x: 300, y: 690, text: '<- #11 no curve', size: 22 }] },
          { type: 'glare', cx: 160, cy: 415, rx: 150, ry: 48, core: 0.62, strength: 1.0 },
        ],
        photo: [{ type: 'lowlight', gain: 0.82, gamma: 1.1, vignette: 0.3 }, { type: 'noise', sigma: 10 }, { type: 'jpeg', quality: 44 }],
      },
      notes: 'Algebra benchmark bubble key (12 Q). Glare hotspot washes out bubbles for Q7–8 (needsTeacher); Q6/Q9 dimmed but legible. Red-pen scrawl in margin. JPEG q44.',
      fields: ['header', 'items.answer', 'bubble', 'glare', 'needsTeacher'],
      html: raw(BUBBLE, bubbleSheet({ title: 'ALGEBRA 1 BENCHMARK — KEY', sub: '12 questions · 12 pts', answers: ans, perCol: 12, opts: 'ABCD' })),
      expected: expected('K28', { header: 'ALGEBRA 1 BENCHMARK — KEY', maxScore: 12, items: fromSimple(exp) }),
      meta: { no_hallucinate_answers: true },
    });
  }

  // ---------------- K29 3-col bubble sheet, strong perspective + crumple + low light ----------------
  {
    const ans = 'ACBDDBACCADBBDACCABDACDB';
    cases.push({
      id: 'K29',
      style: 'bubble',
      rough: {
        seed: 1029,
        effects: ['perspective_strong', 'crumpled', 'low_light'],
        background: { kind: 'desk', clutter: true },
        place: { rot: -2, scale: 0.86, corners: [[0.12, 0.05], [-0.1, 0.02], [0.03, -0.01], [-0.02, -0.02]] },
        page: [{ type: 'crumple', amount: 0.6, bumps: 30, creases: [[0, 700, 840, 640], [600, 0, 640, 1100]] }],
        photo: [{ type: 'lowlight', gain: 0.62, gamma: 1.2, cast: [1.0, 0.97, 0.88], vignette: 0.5 }, { type: 'noise', sigma: 13 }, { type: 'jpeg', quality: 48 }],
      },
      notes: '24-Q three-column bubble key, crumpled with two creases, steep keystone perspective (far edge narrower), dim light + noise. Hardest bubble case.',
      fields: ['header', 'items.answer', 'bubble', 'perspective', 'crease'],
      html: raw(BUBBLE, bubbleSheet({ title: 'SPANISH 2 — EXAMEN KEY', sub: '24 preguntas · 24 pts', answers: ans, perCol: 8, opts: 'ABCD' })),
      expected: expected('K29', { header: 'SPANISH 2 — EXAMEN KEY', maxScore: 24, items: fromSimple(mcItems(ans)) }),
    });
  }

  // ======================= HANDWRITTEN =======================

  // K30 Bradley Hand, blue ink, circled letters, one cross-out; clean scan
  {
    const h = makeHand(3030, { font: 'Bradley Hand', size: 27, color: '#1f3a8a', slant: -4 });
    const mc = ['C', 'A', 'D', 'D', 'B', 'A', 'C', 'B'];
    const lines = [];
    lines.push(`<div class="ln" style="height:76px">${h.write('Bio Ch. 7 Quiz — KEY', { size: 36 })} <span class="side" style="left:520px">${h.write('10 pts', { size: 26, color: '#b91c1c' })}</span></div>`);
    mc.forEach((a, k) => {
      const n = k + 1;
      let ans = h.circle(h.write(a, { size: 30 }));
      if (n === 4) ans = h.crossOut(h.write('B', { size: 30 })) + ans;
      lines.push(`<div class="ln">${h.write(n + '.', { size: 25 })}&nbsp;&nbsp;${ans}</div>`);
    });
    lines.push(`<div class="ln">${h.write('9.', { size: 25 })}&nbsp;&nbsp;${h.write('mitochondria')}</div>`);
    lines.push(`<div class="ln">${h.write('10.', { size: 25 })}&nbsp;&nbsp;${h.write('osmosis')}</div>`);
    lines.push(`<div class="ln" style="margin-top:38px">${h.write('#9 accept "mitochondrion"', { size: 21, color: '#b91c1c' })}</div>`);
    cases.push({
      id: 'K30',
      style: 'hand',
      handwritten: { hand: 'Bradley Hand', ink: 'blue', features: ['circled_letters', 'cross_out_correction', 'margin_note', 'lined_paper'] },
      notes: 'Handwritten (Bradley Hand, blue ink) on lined paper: circled MC letters, Q4 B crossed out → D, two one-word answers, red margin note. Clean scan.',
      fields: ['header', 'items.answer', 'handwritten', 'cross_out', 'maxScore'],
      html: raw(LINED, holes() + lines.join('\n')),
      expected: expected('K30', {
        header: 'Bio Ch. 7 Quiz — KEY',
        maxScore: 10,
        items: fromSimple([...mc.map((a, k) => ({ n: k + 1, stem: String(k + 1), answer: a, type: 'mc' })), { n: 9, stem: '9', answer: 'mitochondria', type: 'short', note: 'accept "mitochondrion"' }, { n: 10, stem: '10', answer: 'osmosis', type: 'short' }]),
      }),
    });
  }

  // K31 Noteworthy, pencil-ish black + red point values, partial-credit margin notes; clean
  {
    const h = makeHand(3131, { font: 'Noteworthy', size: 26, color: '#222', slant: 6, jitter: 1.2 });
    const red = '#c0262d';
    const rows = [
      [1, 'x = 5', 2, null], [2, 'x = -3', 2, null], [3, '18', 3, 'partial: 1 for setup'], [4, 'y = 2x + 1', 2, null], [5, '(3, -2)', 3, '½ credit if swapped'], [6, '7/2', 2, null],
    ];
    const lines = [];
    lines.push(`<div class="ln" style="height:76px">${h.write('Algebra 2 – Quiz 4 Key', { size: 34 })} <span class="side" style="left:500px">${h.circle(h.write('14 pts', { size: 26, color: red }), { color: red })}</span></div>`);
    for (const [n, a, p, note] of rows) {
      let ans = h.write(a, { size: 28 });
      if (n === 3) ans = h.crossOut(h.write('12', { size: 28 })) + ans;
      const pts = `<span class="mg" style="top:0">${h.write('(' + p + ')', { size: 22, color: red })}</span>`;
      const nt = note ? `<span class="side" style="left:420px">${h.write(note, { size: 19, color: red })}</span>` : '';
      lines.push(`<div class="ln" style="height:76px">${pts}${h.write(n + ')', { size: 24 })}&nbsp;&nbsp;${ans}${nt}</div>`);
    }
    cases.push({
      id: 'K31',
      style: 'hand',
      handwritten: { hand: 'Noteworthy', ink: 'black + red', features: ['point_values_in_margin', 'partial_credit_notes', 'cross_out_correction', 'circled_total'] },
      notes: 'Handwritten algebra key (Noteworthy, slanted, high jitter). Red point values scribbled in the left margin (2/2/3/2/3/2 = 14, circled total), Q3 "12" crossed out → 18, partial-credit notes beside Q3 and Q5.',
      fields: ['header', 'items.answer', 'points', 'note', 'maxScore', 'handwritten', 'cross_out'],
      html: raw(LINED, holes() + lines.join('\n')),
      expected: expected('K31', {
        header: 'Algebra 2 – Quiz 4 Key',
        maxScore: 14,
        items: fromSimple(rows.map(([n, a, p, note]) => ({ n, stem: String(n), answer: a, points: p, type: 'numeric', note: note || undefined }))),
      }),
    });
  }

  // K32 Marker Felt messy, T/F + words; rough: rotation 14 + shadow + low light
  {
    const h = makeHand(3232, { font: 'Marker Felt', size: 28, color: '#111827', slant: -2, jitter: 1.4, weight: 300 });
    const tf = ['T', 'F', 'F', 'T', 'T', 'F'];
    const words = ['erosion', 'magma', 'humus'];
    const lines = [];
    lines.push(`<div class="ln" style="height:76px">${h.write('Earth Sci vocab check KEY', { size: 32 })}</div>`);
    tf.forEach((a, k) => lines.push(`<div class="ln">${h.write(k + 1 + '.', { size: 24 })}&nbsp;&nbsp;${h.write(a, { size: 30 })}</div>`));
    words.forEach((w, k) => lines.push(`<div class="ln">${h.write(k + 7 + '.', { size: 24 })}&nbsp;&nbsp;${h.write(w)}</div>`));
    lines.push(`<div class="ln">${h.write('= 9 pts', { size: 24 })}</div>`);
    const exp = [...tf.map((a, k) => ({ n: k + 1, stem: String(k + 1), answer: a === 'T' ? 'True' : 'False', type: 'mc' })), ...words.map((w, k) => ({ n: k + 7, stem: String(k + 7), answer: w, type: 'short' }))];
    cases.push({
      id: 'K32',
      style: 'hand',
      handwritten: { hand: 'Marker Felt', ink: 'black marker', features: ['tf_letters', 'messy_jitter'] },
      rough: {
        seed: 1032,
        effects: ['rotation_14deg', 'hand_phone_shadow', 'low_light'],
        background: { kind: 'desk', clutter: true },
        place: { rot: 14, scale: 0.78 },
        page: [],
        photo: [
          { type: 'shadow', shapes: [{ kind: 'ellipse', cx: 0.12, cy: 0.42, rx: 0.3, ry: 0.2, rot: 25 }, { kind: 'rect', x: -0.1, y: 0.45, w: 0.4, h: 0.5, rot: 20 }], blur: 0.05, strength: 0.5 },
          { type: 'lowlight', gain: 0.6, gamma: 1.2, cast: [1.05, 0.98, 0.85], vignette: 0.5 },
          { type: 'noise', sigma: 14 },
          { type: 'jpeg', quality: 45 },
        ],
      },
      notes: 'Messy marker handwriting (Marker Felt, high jitter) — T/F letters and three vocab words, "= 9 pts". Rough photo: rotated 14°, hand shadow over the left half of the answers, low light, noise.',
      fields: ['header', 'items.answer', 'handwritten', 'rotation', 'low_light'],
      html: raw(LINED, holes() + lines.join('\n')),
      expected: expected('K32', { header: 'Earth Sci vocab check KEY', maxScore: 9, items: fromSimple(exp) }),
      meta: { eval_variants: ['clean', 'rough'] },
    });
  }

  // K33 Bradley Hand slanted Spanish vocab; rough: perspective + glare over Q4 + JPEG
  {
    const h = makeHand(3333, { font: 'Bradley Hand', size: 29, color: '#0f2f6b', slant: 10, jitter: 1.1 });
    const words = [
      ['dog', 'el perro'], ['cat', 'el gato'], ['house', 'la casa'], ['book', 'el libro'], ['table', 'la mesa'], ['window', 'la ventana'], ['school', 'la escuela'], ['friend', 'el amigo'],
    ];
    const lines = [];
    lines.push(`<div class="ln" style="height:76px">${h.write('Español 1 — Vocab Quiz KEY', { size: 34 })}</div>`);
    words.forEach(([en, es], k) => {
      const note = k === 2 ? `<span class="side" style="left:480px">${h.write('accept "casa" w/o article', { size: 19, color: '#b91c1c' })}</span>` : '';
      lines.push(`<div class="ln" style="height:76px">${h.write(k + 1 + '. ' + en + ' –', { size: 24, color: '#444' })}&nbsp;&nbsp;${h.write(es)}${note}</div>`);
    });
    const full = words.map(([en, es], k) => ({ n: k + 1, stem: en, answer: es, type: 'short', note: k === 2 ? 'accept "casa" without article' : undefined }));
    const rough = full.map((e) => ({ ...e }));
    rough[3] = { n: 4, stem: 'book', answer: '', needsTeacher: true, legibility: 'glare', type: 'short' };
    cases.push({
      id: 'K33',
      style: 'hand',
      handwritten: { hand: 'Bradley Hand', ink: 'blue', features: ['slanted_10deg', 'margin_note'] },
      rough: {
        seed: 1033,
        effects: ['perspective', 'glare_hotspot', 'jpeg'],
        background: { kind: 'table', tone: [150, 140, 128] },
        place: { rot: 4, scale: 0.84, corners: [[0.07, 0.03], [-0.05, 0.0], [0.0, -0.02], [0.0, 0.01]] },
        page: [{ type: 'glare', cx: 320, cy: 357, rx: 170, ry: 46, core: 0.6, strength: 1.0 }],
        photo: [{ type: 'lowlight', gain: 0.84, gamma: 1.1, vignette: 0.3 }, { type: 'noise', sigma: 9 }, { type: 'jpeg', quality: 50 }],
      },
      notes: 'Slanted handwritten Spanish vocab key (Bradley Hand, blue). Rough: perspective + glare hotspot that blows out Q4’s answer (needsTeacher in rough truth; Q3/Q5 stay legible) + JPEG. Clean variant scored against expected.clean.json.',
      fields: ['header', 'items.answer', 'handwritten', 'glare', 'needsTeacher', 'note'],
      html: raw(LINED, holes() + lines.join('\n')),
      expected: expected('K33', { header: 'Español 1 — Vocab Quiz KEY', maxScore: 8, items: fromSimple(rough) }),
      expectedClean: expected('K33', { header: 'Español 1 — Vocab Quiz KEY', maxScore: 8, items: fromSimple(full) }),
      meta: { eval_variants: ['clean', 'rough'], no_hallucinate_answers: true },
    });
  }

  // K34 printed worksheet + teacher handwriting in red; rough: crumple + low light + rotation
  {
    const h = makeHand(3434, { font: 'Noteworthy', size: 26, color: '#c0262d', slant: 4, jitter: 1.1 });
    const qs = [
      [1, 'In what year was the Declaration of Independence signed?', '1776', 1],
      [2, 'Who was the first U.S. president?', 'Washington', 1],
      [3, 'Who is called the “Father of the Constitution”?', 'Madison', 1],
      [4, 'Explain two causes of the American Revolution.', null, 4],
      [5, 'In what year was the Constitution ratified?', '1788', 1],
    ];
    const body = qs
      .map(([n, q, a, p]) => {
        let ans;
        if (n === 3) ans = h.crossOut(h.write('Jefferson')) + h.write('Madison');
        else if (n === 4) ans = h.write('see rubric – 2 pts each cause', { size: 22 });
        else ans = h.write(a);
        return `<div style="margin:0 0 30px"><div style="font-size:16px">${n}. ${esc(q)} <span style="color:#666;font-size:12px">(${p} pt${p > 1 ? 's' : ''})</span></div><div style="border-bottom:1px solid #444;height:${n === 4 ? 120 : 52}px;padding-left:30px;line-height:52px">${ans}</div></div>`;
      })
      .join('');
    const style = `body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:40px 48px;background:#fbfaf6;width:840px;height:1100px;box-sizing:border-box}h1{font-size:22px;margin:0 0 6px}.meta{font-size:13px;color:#555;margin-bottom:26px}`;
    cases.push({
      id: 'K34',
      style: 'hand',
      handwritten: { hand: 'Noteworthy', ink: 'red pen on printed worksheet', features: ['answers_in_blanks', 'cross_out_correction', 'rubric_note'] },
      rough: {
        seed: 1034,
        effects: ['crumpled', 'low_light', 'rotation_8deg'],
        background: { kind: 'desk', clutter: false },
        place: { rot: 8, scale: 0.84 },
        page: [{ type: 'crumple', amount: 0.75, bumps: 24, creases: [[0, 470, 840, 500], [300, 0, 330, 1100]] }],
        photo: [{ type: 'lowlight', gain: 0.6, gamma: 1.2, cast: [1.04, 0.98, 0.86], vignette: 0.5 }, { type: 'noise', sigma: 13 }, { type: 'jpeg', quality: 48 }],
      },
      notes: 'Printed history worksheet with teacher answers handwritten in red (Noteworthy). Q3 "Jefferson" crossed out → Madison; Q4 open response says "see rubric" (needsTeacher, 4 pts). Rough: crumpled + creases, low light, rotated 8°.',
      fields: ['header', 'items.answer', 'points', 'needsTeacher', 'handwritten', 'cross_out', 'crease'],
      html: raw(style, `<h1>U.S. History Ch. 3 Review — KEY</h1><div class="meta">Name: <span style="font-family:Noteworthy;color:#c0262d;font-size:18px">KEY</span> · 8 pts</div>${body}`),
      expected: expected('K34', {
        header: 'U.S. History Ch. 3 Review — KEY',
        maxScore: 8,
        items: fromSimple(qs.map(([n, q, a, p]) => (n === 4 ? { n, stem: q, answer: '', points: p, needsTeacher: true, type: 'work' } : { n, stem: q, answer: a, points: p, type: 'short' }))),
      }),
      meta: { eval_variants: ['clean', 'rough'], no_hallucinate_answers: true },
    });
  }

  // K35 Chalkboard SE quick key, 12 letters in two columns; rough: desk clutter + rotation + motion blur
  {
    const h = makeHand(3535, { font: 'Chalkboard SE', size: 26, color: '#233', slant: -6, jitter: 1.3, weight: 300 });
    const ans = ['B', 'D', 'A', 'A', 'C', 'B', 'D', 'C', 'A', 'B', 'C', 'D'];
    const lines = [];
    lines.push(`<div class="ln" style="height:76px">${h.write('Chem Quiz 2 — key (per. 1,3)', { size: 32 })}</div>`);
    for (let k = 0; k < 6; k += 1) {
      const a1 = k === 4 ? h.crossOut(h.write('A', { size: 28 })) + h.write('C', { size: 28 }) : h.write(ans[k], { size: 28 });
      lines.push(`<div class="ln" style="height:76px">${h.write(k + 1 + ' –', { size: 24 })} ${a1}<span class="side" style="left:330px">${h.write(k + 7 + ' –', { size: 24 })} ${h.write(ans[k + 6], { size: 28 })}</span></div>`);
    }
    lines.push(`<div class="ln" style="height:76px">${h.write('1 pt each, 12 total', { size: 22, color: '#555' })}</div>`);
    cases.push({
      id: 'K35',
      style: 'hand',
      handwritten: { hand: 'Chalkboard SE', ink: 'pencil gray', features: ['two_columns', 'cross_out_correction', 'quick_key'] },
      rough: {
        seed: 1035,
        effects: ['desk_clutter', 'rotation_11deg', 'motion_blur'],
        background: { kind: 'desk', clutter: true, busy: true },
        place: { rot: -11, scale: 0.72 },
        page: [],
        photo: [{ type: 'motion', len: 5, angle: -30 }, { type: 'noise', sigma: 9 }, { type: 'jpeg', quality: 55 }],
      },
      notes: 'Quick pencil key (Chalkboard SE) in two columns "1 – B … 12 – D", Q5 "A" crossed out → C. Rough: cluttered desk, rotated −11°, motion blur.',
      fields: ['header', 'items.answer', 'handwritten', 'cross_out', 'two_columns'],
      html: raw(LINED, holes() + lines.join('\n')),
      expected: expected('K35', { header: 'Chem Quiz 2 — key', maxScore: 12, items: fromSimple(ans.map((a, k) => ({ n: k + 1, stem: String(k + 1), answer: a, type: 'mc' }))) }),
      meta: { eval_variants: ['clean', 'rough'] },
    });
  }

  return cases;
}

/** Student paper used as a distractor underlay (K27). Not an eval case. */
export function studentUnderlayHtml() {
  const h = makeHand(9001, { font: 'Marker Felt', size: 26, color: '#334155', slant: 2, jitter: 1.4, weight: 300 });
  const ans = ['16', '3', '4:3', '15', '6.5', '4', '-3', '30', '42', '0.8', '12', '9'];
  const marks = ['✓', '✓', '✗', '✓', '✗', '✗', '✗', '✗', '✓', '✓', '✗', '✓'];
  const rows = ans
    .map(
      (a, k) =>
        `<div style="height:62px;display:flex;align-items:center;font-size:16px;border-bottom:1px solid #ddd"><span style="width:40px;font-weight:700">${k + 1}.</span><span style="width:300px;color:#444">Problem ${k + 1}</span><span style="width:200px">${h.write(a)}</span><span style="color:#c0262d;font-size:26px">${marks[k]}</span></div>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:34px 40px;background:#f7f6f1;width:840px;height:1100px;box-sizing:border-box}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center"><h1 style="font-size:22px;margin:0">Math 6 — Exit Ticket</h1><span>Name: ${h.write('Jordan L.')}</span></div>
<div style="margin:8px 0 18px;color:#555">Unit 3 review · <span style="color:#c0262d;font-family:'Marker Felt';font-size:30px">6/12</span></div>
${rows}
</body></html>`;
}
