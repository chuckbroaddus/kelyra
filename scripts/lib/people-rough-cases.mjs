/**
 * Rough phone-photo + handwritten parent-filled people cases (PR01–PR10, PH01–PH04, N04–N05).
 * Imported by scripts/gen-people-ingest-fixtures.mjs. All names synthetic, all phones 555.
 *
 * Mirrors scripts/lib/roster-rough-cases.mjs (PR #337):
 *   rough: true      → scripts/degrade-people-fixtures.mjs writes rough.jpg (+ visibility.json) from clean.png
 *   effects: [...]   → human/manifest list of the degradations combined
 *   degrade: {...}   → seeded spec consumed by the degrade script (targets: {target:'primary', field:'allergies'})
 *   hand: true       → handwritten (parent-filled printed form)
 *   meta.multi_adult → 2+ adults on the form; eval scores adult2+ name/phone/email coverage
 * Ground truth honesty for the degraded image lives in expected._eval.rough_gt (rough variant only):
 *   absent:    keys not visible at all in rough.jpg (reading one anyway = hallucination)
 *   uncertain: keys partly legible (missing = not penalised; correct = correct; wrong value = hallucination)
 * Keys: primary mapped keys (phone, allergies, …), parentGuessName, studentGuessName, adult2.phone, adult3.email, …
 * HTML marks GT boxes with data-gt-name / data-gt-field + data-gt-for so render writes layout.json.
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
const F = (key, value, who = 'primary') => `<span data-gt-field="${key}" data-gt-for="${esc(who)}">${esc(value)}</span>`;
const N = (name, display = name) => `<span data-gt-name="${esc(name)}">${esc(display)}</span>`;
const tr = (label, cell) => `<tr><th>${esc(label)}</th><td>${cell}</td></tr>`;

// ---------- handwriting helpers ----------
const HANDS = {
  bradley: "'Bradley Hand','Segoe Print','Comic Sans MS',cursive",
  noteworthy: "'Noteworthy','Chalkboard SE','Comic Sans MS',cursive",
  marker: "'Marker Felt','Chalkboard SE',cursive",
  chalk: "'Chalkboard SE','Chalkboard','Comic Sans MS',cursive",
};
const INK = { blue: '#23408e', black: '#1d1d1f', pencil: '#5e5e62' };
function hand(text, r, o = {}) {
  const jy = o.jy ?? 1.6;
  const rot = o.rot ?? 3;
  return [...String(text)]
    .map((ch) =>
      ch === ' '
        ? `<span style="display:inline-block;width:${(0.26 + r() * 0.22).toFixed(2)}em"></span>`
        : `<span class="c" style="transform:translateY(${j(r, jy)}px) rotate(${j(r, rot)}deg);font-size:${(1 + (r() * 2 - 1) * 0.07).toFixed(3)}em">${esc(ch)}</span>`,
    )
    .join('');
}
const SCRIBBLE = `<svg class="x" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0,14 L6,4 L12,16 L19,3 L25,15 L32,4 L38,16 L45,3 L51,15 L58,4 L64,16 L71,3 L77,15 L84,4 L90,16 L97,4 L100,12" fill="none" stroke="currentColor" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>`;

const HF_CSS = `html,body{margin:0}
body{width:840px;height:1100px;box-sizing:border-box;padding:34px 44px;background:#fdfdfb;font-family:Helvetica,Arial,sans-serif;color:#222;overflow:hidden;position:relative}
h1{font-size:21px;margin:0 0 2px;letter-spacing:.3px}.sub{font-size:12px;color:#555;margin-bottom:12px}
.sec{font-size:13px;font-weight:bold;background:#e9edf2;padding:5px 8px;margin:16px 0 4px;border:1px solid #9aa5b1}
.fr{display:flex;align-items:flex-end;margin:2px 0;height:50px}
.lb{font-size:12px;color:#333;white-space:nowrap;margin-right:8px;padding-bottom:5px}
.ln{border-bottom:1px solid #444;height:44px;position:relative;margin-right:18px;min-width:60px}
.hv{position:absolute;left:8px;bottom:3px;white-space:nowrap}.c{display:inline-block}
.xo{position:relative;display:inline-block;margin-right:16px}
.x{position:absolute;left:-4px;top:25%;width:calc(100% + 8px);height:55%;overflow:visible}
.foot{position:absolute;bottom:24px;left:44px;right:44px;font-size:10px;color:#777;border-top:1px solid #ccc;padding-top:6px}
.chk{font-size:12px;margin-right:14px}`;
function handFormPage(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${HF_CSS}</style></head><body>${inner}</body></html>`;
}
/** One label + handwritten value on a rule. gt: {field, who} | {name} | null */
function hf(r, base, label, value, gt, o = {}) {
  const font = HANDS[o.font || base.font];
  const ink = INK[o.ink || base.ink];
  const size = (o.size || base.size) * (1 + (r() * 2 - 1) * 0.05);
  const rot = j(r, base.lineRot ?? 1.2);
  let inner = value == null || value === '' ? '' : hand(value, r, { jy: base.jy, rot: base.rot });
  if (inner && gt) {
    inner = gt.name
      ? `<span data-gt-name="${esc(gt.name)}">${inner}</span>`
      : `<span data-gt-field="${gt.field}" data-gt-for="${esc(gt.who || 'primary')}">${inner}</span>`;
  }
  if (o.crossed) inner = `<span class="xo">${hand(o.crossed, r, { jy: base.jy, rot: base.rot })}<span style="color:${ink}">${SCRIBBLE}</span></span>${inner}`;
  return `<div class="lb">${esc(label)}</div><div class="ln" style="flex:${o.flex ?? 1}"><span class="hv" style="font-family:${font};color:${ink};font-size:${size.toFixed(1)}px;transform:rotate(${rot}deg) skewX(${(base.slant ?? 0).toFixed(1)}deg)">${inner}</span></div>`;
}
const fr = (...cells) => `<div class="fr">${cells.join('')}</div>`;

// ---------- expected builders ----------
const LABEL = {
  relationship: 'relationship', phone: 'phone', email: 'email', address: 'address', preferred_contact: 'preferred contact',
  notes: 'notes', preferred_name: 'preferred name', birthday: 'date of birth', grade_or_age: 'grade', emergency_name: 'emergency contact',
  emergency_phone: 'emergency phone', allergies: 'allergies', health_conditions: 'health conditions',
};
function toFields(mapped) {
  return mapped.map((m) => ({ label: LABEL[m.key] || m.key, value: m.value }));
}

export function buildRoughCases({ expected }) {
  const cases = [];
  const PAGE = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>html,body{margin:0}
body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:0;padding:30px;background:#fff;width:840px;height:1100px;box-sizing:border-box;overflow:hidden}
h1{font-size:22px;margin:0 0 4px}.sub{color:#555;font-size:13px;margin-bottom:16px}
table{border-collapse:collapse;width:100%;font-size:15px}td,th{border:1px solid #999;padding:10px 12px;text-align:left;vertical-align:top}
th{background:#f3f3f3;width:30%}.muted{color:#666;font-size:12px}.sec{font-weight:bold;font-size:14px;margin:18px 0 6px}
.foot{margin-top:22px;font-size:11px;color:#777;border-top:1px solid #ccc;padding-top:8px}
.grid th{width:auto}</style></head><body>${body}</body></html>`;

  /** parent_card expected (primary adult = adults[0]); extra = [[key, value]] beyond relationship/phone/email */
  function parentExp(id, { adults, student, extra = [], accept = null, ev = null, confidence = 0.85 }) {
    const p = adults[0];
    const mapped = [];
    if (p.relationship) mapped.push({ key: 'relationship', value: p.relationship });
    if (p.phone) mapped.push({ key: 'phone', value: p.phone });
    if (p.email) mapped.push({ key: 'email', value: p.email });
    for (const [k, v] of extra) mapped.push({ key: k, value: v });
    const records = [...adults.map((a) => ({ role: 'parent', ...a })), ...(student ? [{ role: 'student', name: student }] : [])];
    const e = expected(id, 'parent_card', {
      intent: 'parent_card',
      confidence,
      parentGuessName: p.name,
      studentGuessName: student ?? null,
      fields: toFields(mapped),
      mapped,
      records,
      names: adults.length > 1 ? records.map((x) => ({ name: x.name, confidence: 0.85 })) : [],
      accept_intents: accept,
    });
    if (ev) e._eval = ev;
    return e;
  }
  function studentExp(id, { student, mapped, accept = null, ev = null, confidence = 0.85 }) {
    const e = expected(id, 'student_card', {
      intent: 'student_card',
      confidence,
      studentGuessName: student,
      fields: toFields(mapped),
      mapped,
      accept_intents: accept,
    });
    if (ev) e._eval = ev;
    return e;
  }

  // ======================= ROUGH PRINTED (PR01–PR10) =======================
  {
    const p = { name: 'Renata Silva', relationship: 'mother', phone: '555-274-3190', email: 'renata.silva@example.com' };
    cases.push({
      id: 'PR01', kind: 'parent_card', rough: true, fields: ['relationship', 'phone', 'email', 'address', 'preferred_contact'],
      effects: ['strong_keystone', 'motion_blur', 'low_light_noise', 'jpeg_artifacts'],
      notes: 'ROUGH: printed parent contact card shot from a low angle (strong keystone), hand-shake motion blur, dim room + sensor noise, q42 JPEG.',
      degrade: {
        seed: 3101, background: 'dark_desk', scale: 0.9, rotate: 2, offset: [0, 0.02], keystone: { top: 1.06, bottom: 0.72 }, jitter: 0.008,
        motion: { len: 6, angle: 20 }, lowlight: { exposure: 0.62, gamma: 1.2, cast: [1.05, 0.95, 0.8] }, noise: 10,
        light: { gradient: [0.6, -0.4], amount: 0.25, vignette: 0.45 }, jpeg: 42,
      },
      html: PAGE(`<h1>Parent / Guardian Contact Card</h1><div class="sub">Lakeview Elementary · 2026–27 · Office copy</div>
<table>${tr('Parent/Guardian name', N(p.name))}${tr('Relationship', F('relationship', 'Mother'))}${tr('Cell phone', F('phone', '(555) 274-3190'))}
${tr('Email', F('email', p.email))}${tr('Home address', F('address', '1187 Juniper St, Apt 4'))}${tr('Preferred contact', F('preferred_contact', 'Text message'))}
${tr('Student', N('Mateo Silva'))}${tr('Grade', '3')}</table><div class="foot">Return to the front office. Keep this card current.</div>`),
      expected: parentExp('PR01', { adults: [p], student: 'Mateo Silva', extra: [['address', '1187 Juniper St, Apt 4'], ['preferred_contact', 'Text message']], ev: { rough_gt: { absent: [], uncertain: [], eye: 'dim and blurred but every value legible' } } }),
    });
  }
  {
    cases.push({
      id: 'PR02', kind: 'student_card', rough: true, fields: ['preferred_name', 'birthday', 'grade_or_age', 'emergency_name', 'emergency_phone', 'allergies', 'health_conditions'],
      effects: ['rotation_12deg', 'glare_hotspot', 'jpeg_artifacts'],
      notes: 'ROUGH: glossy emergency sheet rotated ~12°, overhead-light glare hotspot washing out the allergies row, q55 JPEG.',
      degrade: {
        seed: 3202, background: 'wood', scale: 0.8, rotate: 12, keystone: { top: 0.94 }, jitter: 0.004,
        glare: [{ target: 'primary', field: 'allergies', fx: 0.35, fy: 0.5, rx: 0.1, ry: 0.032, angle: 12, strength: 2.1 }],
        light: { gradient: [-0.3, 0.5], amount: 0.15, vignette: 0.3 }, noise: 5, jpeg: 55,
      },
      html: PAGE(`<h1>Student Emergency Information</h1><div class="sub">Northgate Middle School · Nurse &amp; office copy</div>
<table>${tr('Student name', N('Imani Brooks-Hale'))}${tr('Preferred name', F('preferred_name', 'Mani'))}${tr('Date of birth', F('birthday', '09/03/2013'))}
${tr('Grade', F('grade_or_age', '7'))}${tr('Emergency contact', F('emergency_name', 'Terrence Hale'))}${tr('Emergency phone', F('emergency_phone', '555-836-2047'))}
${tr('Allergies', F('allergies', 'Bee stings - EpiPen in office'))}${tr('Health conditions', F('health_conditions', 'Mild asthma'))}</table>
<div class="foot">Update annually or when anything changes.</div>`),
      expected: studentExp('PR02', {
        student: 'Imani Brooks-Hale',
        mapped: [
          { key: 'preferred_name', value: 'Mani' }, { key: 'birthday', value: '2013-09-03' }, { key: 'grade_or_age', value: '7' },
          { key: 'emergency_name', value: 'Terrence Hale' }, { key: 'emergency_phone', value: '555-836-2047' },
          { key: 'allergies', value: 'Bee stings - EpiPen in office' }, { key: 'health_conditions', value: 'Mild asthma' },
        ],
        ev: { rough_gt: { absent: ['allergies'], uncertain: [], eye: 'allergies washed out by glare (only a trailing fice ghost); emergency phone faded but legible; health legible' } },
      }),
    });
  }
  {
    const A = [
      { name: 'Simone Delacroix', relationship: 'mother', phone: '555-419-7720', email: 'simone.d@example.com' },
      { name: 'Julien Delacroix', relationship: 'father', phone: '555-419-7735', email: 'julien.delacroix@example.net' },
    ];
    cases.push({
      id: 'PR03', kind: 'parent_card', rough: true, multiAdult: true, fields: ['relationship', 'phone', 'email', 'address'],
      effects: ['crumple', 'creases', 'rotation_5deg', 'jpeg_artifacts'],
      notes: 'ROUGH + MULTI-ADULT: two-guardian family contact form pulled crumpled from a backpack (crumple warp + crease segments), rotated -5°, q50 JPEG.',
      degrade: {
        seed: 3303, background: 'wood', scale: 0.86, rotate: -5, jitter: 0.006,
        crumple: { amp: 7, cell: 120, shade: 0.18, creases: 7 },
        light: { gradient: [0.4, 0.2], amount: 0.14, vignette: 0.3 }, noise: 6, jpeg: 50,
      },
      html: PAGE(`<h1>Family Contact Form</h1><div class="sub">Cedar Park Elementary · Student: ${N('Owen Delacroix')} · Grade 4</div>
<div class="sec">Parent / Guardian 1</div>
<table>${tr('Name', N(A[0].name))}${tr('Relationship', F('relationship', 'Mother'))}${tr('Phone', F('phone', A[0].phone))}${tr('Email', F('email', A[0].email))}</table>
<div class="sec">Parent / Guardian 2</div>
<table>${tr('Name', N(A[1].name))}${tr('Relationship', F('relationship', 'Father', A[1].name))}${tr('Phone', F('phone', A[1].phone, A[1].name))}${tr('Email', F('email', A[1].email, A[1].name))}</table>
<div class="sec">Household</div>
<table>${tr('Home address', F('address', '62 Brookside Dr'))}</table>`),
      expected: parentExp('PR03', { adults: A, student: 'Owen Delacroix', extra: [['address', '62 Brookside Dr']], ev: { rough_gt: { absent: [], uncertain: [], eye: 'crumple/creases cross rows but both guardians fully legible' } } }),
    });
  }
  {
    cases.push({
      id: 'PR04', kind: 'student_card', rough: true, fields: ['birthday', 'grade_or_age', 'address', 'emergency_name', 'emergency_phone', 'allergies'],
      effects: ['trifold_creases', 'cut_off_right_edge', 'jpeg_artifacts'],
      notes: 'ROUGH: tri-folded student information sheet, shot too close so the right edge runs off the frame (long values cut), q58 JPEG.',
      degrade: {
        seed: 3404, background: 'laminate', scale: 1.02, rotate: 1.5, offset: [0.5, 0.01], jitter: 0.003,
        creases: [{ at: [0.5, 0.34], angle: 0.5, shift: 1.6, dark: 0.4, panel: 0.95 }, { at: [0.5, 0.67], angle: -0.4, shift: 1.4, dark: 0.38, panel: 0.97 }],
        light: { gradient: [0.3, 0.3], amount: 0.12, vignette: 0.25 }, noise: 5, jpeg: 58,
      },
      html: PAGE(`<h1>Student Information Sheet</h1><div class="sub">Westbrook Elementary · 2026–27</div>
<table>${tr('Student name', N('Leo Marchetti'))}${tr('Date of birth', F('birthday', 'January 27, 2015'))}${tr('Grade', F('grade_or_age', '5'))}
${tr('Home address', F('address', '903 Alder Way, Westbrook'))}${tr('Emergency contact (name)', F('emergency_name', 'Gina Marchetti (aunt)'))}
${tr('Emergency phone', F('emergency_phone', '555-662-0418'))}${tr('Allergies', F('allergies', 'Penicillin'))}</table>
<div class="foot">Office use: entered ____ by ____</div>`),
      expected: studentExp('PR04', {
        student: 'Leo Marchetti',
        mapped: [
          { key: 'birthday', value: '2015-01-27' }, { key: 'grade_or_age', value: '5' }, { key: 'address', value: '903 Alder Way, Westbrook' },
          { key: 'emergency_name', value: 'Gina Marchetti' }, { key: 'emergency_phone', value: '555-662-0418' }, { key: 'allergies', value: 'Penicillin' },
        ],
        ev: { rough_gt: { absent: [], uncertain: ['address'], eye: 'right edge cuts address after 903 Alder Way, Wes and (aun; phone/DOB/allergies fully in frame' } },
      }),
    });
  }
  {
    const p = { name: 'Deshawn Porter', relationship: 'guardian', phone: '555-503-8816', email: 'd.porter.home@example.org' };
    cases.push({
      id: 'PR05', kind: 'parent_card', rough: true, fields: ['relationship', 'phone', 'email', 'preferred_contact'],
      effects: ['hand_phone_shadow', 'background_clutter', 'defocus_blur'],
      notes: 'ROUGH: guardian card on a cluttered desk (papers, pen, phone, mug), heavy hand + phone shadow across the lower rows, slight defocus.',
      degrade: {
        seed: 3505, background: 'laminate', scale: 0.78, rotate: 4, offset: [-0.03, 0.03],
        clutter: [
          { kind: 'paper', cx: 0.9, cy: 0.12, w: 0.42, h: 0.4, angle: 22 }, { kind: 'paper', cx: 0.06, cy: 0.9, w: 0.4, h: 0.3, angle: -12 },
          { kind: 'pen', cx: 0.94, cy: 0.7, w: 0.025, h: 0.3, angle: 12 }, { kind: 'phone', cx: 0.1, cy: 0.18, w: 0.16, h: 0.3, angle: -8 },
          { kind: 'mug', cx: 0.9, cy: 0.93, r: 0.08 },
        ],
        shadow: { cx: 0.5, cy: 0.33, rx: 0.2, ry: 0.07, angle: -15, armTo: [1.15, 0.7], armWidth: 0.22, strength: 0.6, soft: 0.025 },
        defocus: 1.3, light: { gradient: [0.2, 0.3], amount: 0.12, vignette: 0.3 }, noise: 6, jpeg: 62,
      },
      html: PAGE(`<h1>Guardian Contact Card</h1><div class="sub">Pine Hollow Middle School</div>
<table>${tr('Guardian name', N(p.name))}${tr('Relationship to student', F('relationship', 'Guardian (grandfather)'))}${tr('Phone', F('phone', p.phone))}
${tr('Email', F('email', p.email))}${tr('Preferred contact', F('preferred_contact', 'Phone call'))}${tr('Student', N('Kiara Porter'))}</table>`),
      expected: parentExp('PR05', { adults: [p], student: 'Kiara Porter', extra: [['preferred_contact', 'Phone call']], ev: { rough_gt: { absent: [], uncertain: [], eye: 'hand shadow darkens email/preferred/student rows; still legible' } } }),
    });
  }
  {
    cases.push({
      id: 'PR06', kind: 'student_card', rough: true, fields: ['birthday', 'grade_or_age', 'allergies', 'health_conditions', 'emergency_name', 'emergency_phone'],
      effects: ['heavy_jpeg_x2', 'downscale_820', 'defocus_blur'],
      notes: 'ROUGH: health & emergency card forwarded through two messaging apps — downscaled to 820px wide, JPEG q28 then q22, slight defocus.',
      degrade: {
        seed: 3606, background: 'white_desk', scale: 0.84, rotate: -2, jitter: 0.004, defocus: 1.0,
        light: { gradient: [0.2, 0.2], amount: 0.1, vignette: 0.2 }, noise: 4, outWidth: 820, jpeg: 28, jpeg2: 22,
      },
      html: PAGE(`<h1>Health &amp; Emergency Card</h1><div class="sub">Maple Grove Elementary · School nurse</div>
<table>${tr('Student', N('Hana Yoshida'))}${tr('DOB', F('birthday', '04/18/2014'))}${tr('Grade', F('grade_or_age', '6'))}
${tr('Allergies', F('allergies', 'Tree nuts, latex'))}${tr('Health conditions', F('health_conditions', 'Epilepsy - seizure plan on file'))}
${tr('Emergency contact', F('emergency_name', 'Kenji Yoshida'))}${tr('Emergency phone', F('emergency_phone', '555-947-3302'))}</table>`),
      expected: studentExp('PR06', {
        student: 'Hana Yoshida',
        mapped: [
          { key: 'birthday', value: '2014-04-18' }, { key: 'grade_or_age', value: '6' }, { key: 'allergies', value: 'Tree nuts, latex' },
          { key: 'health_conditions', value: 'Epilepsy - seizure plan on file' }, { key: 'emergency_name', value: 'Kenji Yoshida' },
          { key: 'emergency_phone', value: '555-947-3302' },
        ],
        ev: { rough_gt: { absent: [], uncertain: [], eye: 'blocky q28 then q22 but every value legible' } },
      }),
    });
  }
  {
    const A = [
      { name: 'Adaeze Okonjo', relationship: 'mother', phone: '555-288-6104', email: 'adaeze.okonjo@example.com' },
      { name: 'Martin Starr', relationship: 'stepfather', phone: '555-288-6190', email: 'm.starr@example.net' },
      { name: 'Florence Okonjo', relationship: 'grandmother', phone: '555-731-4425' },
    ];
    const rowA = (a, i) =>
      `<tr><td>${i + 1}</td><td>${N(a.name)}</td><td>${i ? F('relationship', a.relationship[0].toUpperCase() + a.relationship.slice(1), a.name) : F('relationship', 'Mother')}</td><td>${i ? F('phone', a.phone, a.name) : F('phone', a.phone)}</td><td>${a.email ? (i ? F('email', a.email, a.name) : F('email', a.email)) : '—'}</td></tr>`;
    cases.push({
      id: 'PR07', kind: 'parent_card', rough: true, multiAdult: true, fields: ['relationship', 'phone', 'email'],
      effects: ['keystone_side', 'cut_off_right_edge', 'background_clutter', 'jpeg_artifacts'],
      notes: 'ROUGH + MULTI-ADULT (3): guardian / pickup authorization table shot at a sideways angle; right edge (email column) runs off frame; clutter; q52 JPEG.',
      degrade: {
        seed: 3707, background: 'fabric', scale: 0.98, rotate: 3, offset: [0.12, -0.02], keystone: { left: 1.04, right: 0.88 }, jitter: 0.004,
        clutter: [{ kind: 'folder', cx: 0.15, cy: 0.9, w: 0.5, h: 0.3, angle: -6 }, { kind: 'sticky', cx: 0.1, cy: 0.08, w: 0.16, h: 0.12, angle: 9 }],
        light: { gradient: [0.3, 0.2], amount: 0.14, vignette: 0.3 }, noise: 6, jpeg: 52,
      },
      html: PAGE(`<h1>Emergency Pickup &amp; Guardian Authorization</h1><div class="sub">Student: ${N('Ruby Okonjo-Starr')} · Grade 2 · Room 9</div>
<p class="muted">Adults listed may pick up this student and will be called in an emergency, in order.</p>
<table class="grid"><tr><th>#</th><th>Adult name</th><th>Relationship</th><th>Phone</th><th>Email</th></tr>
${A.map(rowA).join('\n')}</table><div class="foot">Bring photo ID at pickup.</div>`),
      expected: parentExp('PR07', { adults: A, student: 'Ruby Okonjo-Starr', ev: { rough_gt: { absent: [], uncertain: ['email'], eye: 'adult 1 email cut at frame edge after adaeze.okonjo@example; adult 2 email and all phones fully visible' } } }),
    });
  }
  {
    const p = { name: 'Priyanka Raman', relationship: 'mother', phone: '555-614-2289', email: 'praman.family@example.com' };
    cases.push({
      id: 'PR08', kind: 'parent_card', rough: true, fields: ['relationship', 'phone', 'email', 'address'],
      effects: ['heavy_low_light', 'warm_cast', 'sensor_noise', 'defocus_blur'],
      notes: 'ROUGH: parent info sheet photographed at an evening event under a dim warm lamp — heavy underexposure, sensor noise, slight defocus.',
      degrade: {
        seed: 3808, background: 'carpet', scale: 0.84, rotate: -3, jitter: 0.004, defocus: 1.5,
        lowlight: { exposure: 0.46, gamma: 1.35, cast: [1.12, 0.92, 0.66] }, noise: 14,
        light: { gradient: [0.7, 0.5], amount: 0.3, vignette: 0.55 }, jpeg: 55,
      },
      html: PAGE(`<h1>Parent Information</h1><div class="sub">Fall open house sign-up · Room 14</div>
<table>${tr('Parent name', N(p.name))}${tr('Relationship', F('relationship', 'Mother'))}${tr('Phone', F('phone', p.phone))}${tr('Email', F('email', p.email))}
${tr('Address', F('address', '45 Orchard Hill Rd'))}${tr('Student', N('Dev Raman'))}</table>`),
      expected: parentExp('PR08', { adults: [p], student: 'Dev Raman', extra: [['address', '45 Orchard Hill Rd']], ev: { rough_gt: { absent: [], uncertain: ['phone', 'email', 'address'], eye: 'very dark and soft: names and Mother readable, digits/email/address only barely' } } }),
    });
  }
  {
    cases.push({
      id: 'PR09', kind: 'student_card', rough: true, fields: ['preferred_name', 'birthday', 'grade_or_age', 'emergency_name', 'emergency_phone', 'allergies'],
      effects: ['coffee_stain', 'pen_marks', 'background_clutter', 'jpeg_artifacts'],
      notes: 'ROUGH: student data sheet with a coffee ring over the DOB, stray pen marks in the margin, cluttered desk, q60 JPEG.',
      degrade: {
        seed: 3909, background: 'wood', scale: 0.8, rotate: -6, jitter: 0.005,
        stains: [{ target: 'primary', field: 'birthday', fx: 0.45, fy: 0.5, r: 42, fill: 0.62, strength: 1.25 }],
        pen: [{ type: 'line', pts: [[0.05, 0.75], [0.2, 0.78], [0.3, 0.74]], width: 3 }, { type: 'doodle', at: [0.88, 0.85], width: 2.5 }],
        clutter: [{ kind: 'paper', cx: 0.88, cy: 0.1, w: 0.4, h: 0.32, angle: 14 }, { kind: 'pen', cx: 0.08, cy: 0.5, w: 0.025, h: 0.28, angle: -20 }],
        light: { gradient: [0.2, -0.3], amount: 0.12, vignette: 0.3 }, noise: 6, jpeg: 60,
      },
      html: PAGE(`<h1>Student Data &amp; Emergency Sheet</h1><div class="sub">Riverside Middle School</div>
<table>${tr('Student', N('Tobias Lindgren'))}${tr('Nickname', F('preferred_name', 'Toby'))}${tr('Date of birth', F('birthday', '11/30/2012'))}${tr('Grade', F('grade_or_age', '8'))}
${tr('Emergency contact', F('emergency_name', 'Astrid Lindgren-Moe'))}${tr('Emergency phone', F('emergency_phone', '555-390-7751'))}${tr('Allergies', F('allergies', 'Dairy'))}</table>`),
      expected: studentExp('PR09', {
        student: 'Tobias Lindgren',
        mapped: [
          { key: 'preferred_name', value: 'Toby' }, { key: 'birthday', value: '2012-11-30' }, { key: 'grade_or_age', value: '8' },
          { key: 'emergency_name', value: 'Astrid Lindgren-Moe' }, { key: 'emergency_phone', value: '555-390-7751' }, { key: 'allergies', value: 'Dairy' },
        ],
        ev: { rough_gt: { absent: [], uncertain: [], eye: 'visibility.json flagged birthday absent(0.17) under the coffee ring, but by eye 11/30/2012 reads through the stain so kept certain' } },
      }),
    });
  }
  {
    const p = { name: 'Gabriel Fontaine', relationship: 'father', phone: '555-725-0063', email: 'gfontaine@example.com' };
    cases.push({
      id: 'PR10', kind: 'parent_card', rough: true, fields: ['relationship', 'phone', 'email', 'preferred_contact'],
      effects: ['page_curl', 'rotation_8deg', 'glare_hotspot', 'jpeg_artifacts'],
      notes: 'ROUGH: parent card still in a binder (page curls into the rings on the right), rotated -8°, glare streak near the email, q55 JPEG.',
      degrade: {
        seed: 4010, background: 'dark_desk', scale: 0.84, rotate: -8, jitter: 0.004,
        curl: { side: 'right', width: 0.2, angle: 75, depth: 0.55, lift: 16 },
        glare: [{ target: 'primary', field: 'email', fx: 0.85, fy: 0.5, rx: 0.06, ry: 0.025, angle: -8, strength: 1.7 }],
        light: { gradient: [-0.3, 0.3], amount: 0.14, vignette: 0.35 }, noise: 6, jpeg: 55,
      },
      html: PAGE(`<h1>Parent / Guardian Card</h1><div class="sub">Brightwater Elementary</div>
<table>${tr('Name', N(p.name))}${tr('Relationship', F('relationship', 'Father'))}${tr('Phone', F('phone', p.phone))}${tr('Email', F('email', p.email))}
${tr('Preferred contact', F('preferred_contact', 'Email'))}${tr('Student', N('Elise Fontaine'))}</table>`),
      expected: parentExp('PR10', { adults: [p], student: 'Elise Fontaine', extra: [['preferred_contact', 'Email']], ev: { rough_gt: { absent: [], uncertain: ['email'], eye: 'glare washes email after gfontaine@ex' } } }),
    });
  }

  // ======================= HANDWRITTEN PARENT-FILLED (PH01–PH04) =======================
  {
    const r = rng(5101);
    const base = { font: 'bradley', ink: 'blue', size: 27, jy: 1.6, rot: 3, slant: -3, lineRot: 1.2 };
    const A = [
      { name: 'Carmen Ibarra', relationship: 'mother', phone: '555-208-4471', email: 'carmen.ibarra@example.com' },
      { name: 'Luis Ibarra', relationship: 'father', phone: '555-208-4490' },
    ];
    const inner = `<h1>Family Information Form</h1><div class="sub">Sunnyside Elementary · please print clearly</div>
<div class="sec">Student</div>
${fr(hf(r, base, 'Student name', 'Sofia Ibarra', { name: 'Sofia Ibarra' }, { flex: 2 }), hf(r, base, 'Grade', '1', null, { flex: 0.5 }))}
<div class="sec">Parent / Guardian 1</div>
${fr(hf(r, base, 'Name', A[0].name, { name: A[0].name }, { flex: 2 }), hf(r, base, 'Relationship', 'Mom', { field: 'relationship' }))}
${fr(hf(r, base, 'Phone', A[0].phone, { field: 'phone' }), hf(r, base, 'Email', A[0].email, { field: 'email' }, { flex: 1.6 }))}
<div class="sec">Parent / Guardian 2</div>
${fr(hf(r, base, 'Name', A[1].name, { name: A[1].name }, { flex: 2 }), hf(r, base, 'Relationship', 'Dad', { field: 'relationship', who: A[1].name }))}
${fr(hf(r, base, 'Phone', A[1].phone, { field: 'phone', who: A[1].name }), hf(r, base, 'Email', '', null, { flex: 1.6 }))}
<div class="sec">Household</div>
${fr(hf(r, base, 'Home address', '77 Poplar Ct', { field: 'address' }, { flex: 3 }))}
<div class="foot">Thank you! Return to your child's teacher.</div>`;
    cases.push({
      id: 'PH01', kind: 'parent_card', hand: true, multiAdult: true, fields: ['relationship', 'phone', 'email', 'address'],
      effects: ['handwritten_fill'],
      notes: 'HANDWRITTEN + MULTI-ADULT: printed family form filled in by a parent in blue print handwriting; two guardians ("Mom"/"Dad"); guardian 2 email left blank.',
      html: handFormPage(inner),
      expected: parentExp('PH01', { adults: A, student: 'Sofia Ibarra', extra: [['address', '77 Poplar Ct']] }),
    });
  }
  {
    const r = rng(5202);
    const base = { font: 'noteworthy', ink: 'black', size: 26, jy: 1.5, rot: 3, slant: 2, lineRot: 1.0 };
    const inner = `<h1>Student Emergency Card</h1><div class="sub">Hawthorne Middle School · complete both sides</div>
<div class="sec">Student</div>
${fr(hf(r, base, 'Legal name', 'Nathaniel Osei-Bonsu', { name: 'Nathaniel Osei-Bonsu' }, { flex: 2 }), hf(r, base, 'Goes by', 'Nate', { field: 'preferred_name' }))}
${fr(hf(r, base, 'Date of birth', '6/2/2014', { field: 'birthday' }), hf(r, base, 'Grade', '6', { field: 'grade_or_age' }, { flex: 0.5 }))}
<div class="sec">Emergency contact (other than parent)</div>
${fr(hf(r, base, 'Name', 'Abena Osei-Bonsu', { field: 'emergency_name' }, { flex: 2 }), hf(r, base, 'Phone', '555-417-9038', { field: 'emergency_phone' }, { flex: 1.3 }))}
<div class="sec">Health</div>
${fr(hf(r, base, 'Allergies', 'strawberries', { field: 'allergies' }, { flex: 2 }))}
${fr(hf(r, base, 'Medical conditions', '', null, { flex: 2 }))}
<div class="foot">Office: verify with SIS.</div>`;
    cases.push({
      id: 'PH02', kind: 'student_card', hand: true, fields: ['preferred_name', 'birthday', 'grade_or_age', 'emergency_name', 'emergency_phone', 'allergies'],
      effects: ['handwritten_fill'],
      notes: 'HANDWRITTEN: parent-filled student emergency card (marker-ish print); medical conditions left blank — must not be invented.',
      html: handFormPage(inner),
      expected: studentExp('PH02', {
        student: 'Nathaniel Osei-Bonsu',
        mapped: [
          { key: 'preferred_name', value: 'Nate' }, { key: 'birthday', value: '2014-06-02' }, { key: 'grade_or_age', value: '6' },
          { key: 'emergency_name', value: 'Abena Osei-Bonsu' }, { key: 'emergency_phone', value: '555-417-9038' }, { key: 'allergies', value: 'strawberries' },
        ],
      }),
      meta: { no_hallucinate_empty: ['health_conditions'] },
    });
  }
  {
    const r = rng(5303);
    const base = { font: 'marker', ink: 'blue', size: 27, jy: 2.0, rot: 4, slant: -2, lineRot: 1.5 };
    const A = [
      { name: 'Megan Kowalski', relationship: 'mother', phone: '555-861-3027', email: 'megkowalski@example.com' },
      { name: 'Daniel Reyes', relationship: 'stepfather', phone: '555-861-3044' },
    ];
    const inner = `<h1>Parent / Guardian Contact Form</h1><div class="sub">Lincoln Elementary · one form per family</div>
${fr(hf(r, base, 'Student', 'Ava Kowalski-Reyes', { name: 'Ava Kowalski-Reyes' }, { flex: 2 }), hf(r, base, 'Teacher', 'Ms. Ford', null))}
<div class="sec">Guardian 1</div>
${fr(hf(r, base, 'Name', A[0].name, { name: A[0].name }, { flex: 2 }), hf(r, base, 'Relationship', 'Mother', { field: 'relationship' }))}
${fr(hf(r, base, 'Cell', A[0].phone, { field: 'phone' }), hf(r, base, 'Email', A[0].email, { field: 'email' }, { flex: 1.6 }))}
<div class="sec">Guardian 2</div>
${fr(hf(r, base, 'Name', A[1].name, { name: A[1].name }, { flex: 2 }), hf(r, base, 'Relationship', 'Stepdad', { field: 'relationship', who: A[1].name }))}
${fr(hf(r, base, 'Cell', A[1].phone, { field: 'phone', who: A[1].name }), hf(r, base, 'Email', '', null, { flex: 1.6 }))}
${fr(hf(r, base, 'Best way to reach us', 'text', { field: 'preferred_contact' }, { flex: 2 }))}`;
    cases.push({
      id: 'PH03', kind: 'parent_card', hand: true, rough: true, multiAdult: true, fields: ['relationship', 'phone', 'email', 'preferred_contact'],
      effects: ['handwritten_fill', 'keystone', 'hand_phone_shadow', 'jpeg_artifacts'],
      notes: 'HANDWRITTEN + ROUGH + MULTI-ADULT: parent-filled contact form (mother + stepdad), photographed at an angle with the phone/hand shadow over the right side, q50 JPEG.',
      degrade: {
        seed: 5303, background: 'laminate', scale: 0.86, rotate: 2, keystone: { top: 0.86, bottom: 1.02 }, jitter: 0.006,
        shadow: { cx: 0.74, cy: 0.3, rx: 0.13, ry: 0.2, angle: 10, armTo: [1.2, 0.35], armWidth: 0.22, strength: 0.55, soft: 0.03 },
        light: { gradient: [0.3, 0.3], amount: 0.14, vignette: 0.3 }, noise: 7, jpeg: 50,
      },
      html: handFormPage(inner),
      expected: parentExp('PH03', { adults: A, student: 'Ava Kowalski-Reyes', extra: [['preferred_contact', 'text']], ev: { rough_gt: { absent: [], uncertain: [], eye: 'shadow over the right column; Mother/Stepdad/email still legible' } } }),
    });
  }
  {
    const r = rng(5404);
    const base = { font: 'chalk', ink: 'pencil', size: 26, jy: 1.8, rot: 3.5, slant: 0, lineRot: 1.3 };
    const inner = `<h1>Emergency Information</h1><div class="sub">Oak Valley Elementary · Nurse's office</div>
${fr(hf(r, base, 'Student', 'Isabella Thornton', { name: 'Isabella Thornton' }, { flex: 2 }), hf(r, base, 'Grade', '4', { field: 'grade_or_age' }, { flex: 0.5 }))}
${fr(hf(r, base, 'Birthday', '3/15/2015', { field: 'birthday' }))}
<div class="sec">If we cannot reach a parent, call:</div>
${fr(hf(r, base, 'Name', 'Ruth Thornton', { field: 'emergency_name' }, { flex: 2 }))}
${fr(hf(r, base, 'Phone', '555-240-1736', { field: 'emergency_phone' }, { flex: 2, crossed: '555-240-1188' }))}
<div class="sec">Allergies / medications</div>
${fr(hf(r, base, 'Allergies', 'amoxicillin', { field: 'allergies' }, { flex: 2 }))}`;
    cases.push({
      id: 'PH04', kind: 'student_card', hand: true, rough: true, fields: ['birthday', 'grade_or_age', 'emergency_name', 'emergency_phone', 'allergies'],
      effects: ['handwritten_fill', 'pencil', 'crossed_out_number', 'crumple', 'low_light_noise'],
      notes: 'HANDWRITTEN + ROUGH: pencil-filled emergency card with the old emergency number scribbled out and the new one written after it; crumpled, dim room.',
      degrade: {
        seed: 5404, background: 'dark_desk', scale: 0.86, rotate: -4, jitter: 0.006,
        crumple: { amp: 6, cell: 110, shade: 0.16, creases: 5 },
        lowlight: { exposure: 0.6, gamma: 1.2, cast: [1.04, 0.97, 0.85] }, noise: 10,
        light: { gradient: [0.5, -0.3], amount: 0.2, vignette: 0.4 }, jpeg: 50,
      },
      html: handFormPage(inner),
      expected: studentExp('PH04', {
        student: 'Isabella Thornton',
        mapped: [
          { key: 'grade_or_age', value: '4' }, { key: 'birthday', value: '2015-03-15' }, { key: 'emergency_name', value: 'Ruth Thornton' },
          { key: 'emergency_phone', value: '555-240-1736' }, { key: 'allergies', value: 'amoxicillin' },
        ],
        ev: { rough_gt: { absent: [], uncertain: [], eye: 'crumpled dim pencil, all legible; old number visibly scribbled' }, crossed_out: ['555-240-1188'] },
      }),
    });
  }

  // ======================= ROUGH NEGATIVES (N04–N05) =======================
  const NOT_PEOPLE = ['unsure', 'feed_photo', 'lesson_materials', 'lesson_plan', 'homework', 'syllabus', 'answer_key'];
  cases.push({
    id: 'N04', kind: 'negative', rough: true, fields: [],
    effects: ['rotation_9deg', 'glare_hotspot', 'background_clutter', 'jpeg_artifacts'],
    notes: 'NEGATIVE + ROUGH: cafeteria lunch menu (has a "questions? call" phone line) on a cluttered desk with glare — must not become a parent/student card.',
    degrade: {
      seed: 6104, background: 'wood', scale: 0.74, rotate: 9, keystone: { top: 0.9 }, jitter: 0.004,
      clutter: [{ kind: 'paper', cx: 0.85, cy: 0.15, w: 0.4, h: 0.35, angle: 18 }, { kind: 'mug', cx: 0.12, cy: 0.88, r: 0.08 }],
      glare: [{ cx: 0.45, cy: 0.3, rx: 0.09, ry: 0.045, angle: 20, strength: 1.9 }],
      light: { gradient: [0.3, 0.3], amount: 0.15, vignette: 0.3 }, noise: 6, jpeg: 50,
    },
    html: PAGE(`<h1>October Lunch Menu</h1><div class="sub">Lakeview Elementary Cafeteria · Questions? Food services 555-300-4100</div>
<table class="grid"><tr><th>Week</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
<tr><td>Oct 5</td><td>Chicken tacos</td><td>Pasta bake</td><td>Turkey wrap</td><td>Pizza</td><td>Fish sticks</td></tr>
<tr><td>Oct 12</td><td>Burger</td><td>Bean chili</td><td>Teriyaki bowl</td><td>Pizza</td><td>Grilled cheese</td></tr>
<tr><td>Oct 19</td><td>Pancakes</td><td>Chicken noodle</td><td>Nachos</td><td>Pizza</td><td>Mac &amp; cheese</td></tr>
<tr><td>Oct 26</td><td>Meatball sub</td><td>Rice &amp; beans</td><td>Fall harvest plate</td><td>Pizza</td><td>No school</td></tr></table>
<p class="muted">Milk and fruit offered daily. Menu subject to change.</p>`),
    expected: expected('N04', 'negative', { intent: 'unsure', reject: true, accept_intents: NOT_PEOPLE, fields: [], mapped: [] }),
    meta: { negative: true },
  });
  cases.push({
    id: 'N05', kind: 'negative', rough: true, fields: [],
    effects: ['crumple', 'low_light_noise', 'rotation_6deg', 'jpeg_artifacts'],
    notes: 'NEGATIVE + ROUGH: crumpled bus-route schedule with a transportation office phone and a driver name — no student/guardian record; must not become a people card.',
    degrade: {
      seed: 6205, background: 'carpet', scale: 0.82, rotate: -6, jitter: 0.006,
      crumple: { amp: 7, cell: 120, shade: 0.18, creases: 6 },
      lowlight: { exposure: 0.6, gamma: 1.2, cast: [1.05, 0.95, 0.8] }, noise: 10,
      light: { gradient: [0.4, 0.3], amount: 0.2, vignette: 0.4 }, jpeg: 48,
    },
    html: PAGE(`<h1>Bus Route 14 · Fall Schedule</h1><div class="sub">Transportation office 555-300-1200 · Driver: Mr. Alvarez</div>
<table class="grid"><tr><th>Stop</th><th>AM pickup</th><th>PM drop-off</th></tr>
<tr><td>Elm &amp; 3rd</td><td>7:05</td><td>3:25</td></tr><tr><td>Willow Park</td><td>7:12</td><td>3:32</td></tr>
<tr><td>Harbor Rd</td><td>7:20</td><td>3:40</td></tr><tr><td>Cedar Ct</td><td>7:26</td><td>3:46</td></tr><tr><td>School</td><td>7:40</td><td>3:10 (depart)</td></tr></table>
<p class="muted">Students must be at the stop 5 minutes early.</p>`),
    expected: expected('N05', 'negative', { intent: 'unsure', reject: true, accept_intents: NOT_PEOPLE, fields: [], mapped: [] }),
    meta: { negative: true },
  });

  return cases;
}
