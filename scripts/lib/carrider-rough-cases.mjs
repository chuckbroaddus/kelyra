/**
 * Rough phone-photo, handwritten pickup-form, and multi-car cases for the car-rider corpus.
 * Imported by scripts/gen-carrider-ingest-fixtures.mjs. All names / plates are synthetic.
 *
 * Per case:
 *   html            → source.html (840×1100 viewport); GT boxes marked with data-gt-name
 *                     (render-carrider-ingest-pngs.mjs writes layout.json from them)
 *   expected        → full ground truth for clean.png
 *   meta.rough      → degrade-carrider-fixtures.mjs writes rough.jpg from meta.degrade
 *   meta.rough_gt   → honest GT for rough.jpg only:
 *                       absent: [field]      not visible → expected empty; any value = hallucination
 *                       uncertain: [field]   partly legible → empty OK, exact OK, wrong value = hallucination
 *                       absent_names / uncertain_names: { riders|authorized_pickups: [name] }
 *   meta.excluded_names    → crossed-out names; returning one = hallucination
 *   meta.background_plates → plates of other cars / reflections; returning one = hallucination + "picked wrong car"
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const norm = (p) => String(p).toUpperCase().replace(/[^A-Z0-9]/g, '');

const HANDS = {
  bradley: "'Bradley Hand','Segoe Print','Comic Sans MS',cursive",
  noteworthy: "'Noteworthy','Chalkboard SE','Comic Sans MS',cursive",
  marker: "'Marker Felt','Chalkboard SE',cursive",
  chalk: "'Chalkboard SE','Chalkboard','Comic Sans MS',cursive",
  snell: "'Snell Roundhand','Apple Chancery',cursive",
};

function expected(id, f) {
  return {
    source_id: id,
    document_kind: f.document_kind ?? 'vehicle_photo',
    plate: f.plate ?? null,
    plateFront: f.plateFront ?? null,
    plateBack: f.plateBack ?? null,
    make: f.make ?? null,
    model: f.model ?? null,
    side: f.side ?? 'unknown',
    tag_number: f.tag_number ?? null,
    riders: f.riders ?? [],
    authorized_pickups: f.authorized_pickups ?? [],
    unreadable: Boolean(f.unreadable),
    confidence: f.confidence ?? 0.85,
    reject_reason: f.reject_reason ?? null,
  };
}

// ---------- outdoor car-line scenes ----------
const SCENE_CSS = `*{box-sizing:border-box}
html,body{margin:0;width:840px;height:1100px;overflow:hidden}
body{position:relative;font-family:Helvetica,Arial,sans-serif;background:linear-gradient(180deg,#9fb6ca 0%,#d7dfe5 27%,#8a8e92 28%,#64686c 55%,#45484b 100%)}
.lane{position:absolute;left:0;right:0;height:6px;background:#e9e3c9;opacity:.6}
.tree{position:absolute;border-radius:50%;background:radial-gradient(#5d7a4a,#3e5632)}
.bldg{position:absolute;background:#b9a68f;border:2px solid #9c8a74}
.car{position:absolute}
.car .body{position:absolute;inset:0;border-radius:14% 14% 6% 6%/20% 20% 8% 8%}
.car .win{position:absolute;left:13%;right:13%;top:5%;height:29%;background:linear-gradient(170deg,#25303d,#46546a 70%,#2b3542);border-radius:24% 24% 4% 4%/40% 40% 6% 6%;overflow:hidden}
.car .tl{position:absolute;top:39%;width:17%;height:11%;background:linear-gradient(#d31c27,#8e0f17);border-radius:6px}
.car .badge{position:absolute;left:0;right:0;top:41%;text-align:center;color:#eef1f3;font-weight:700;letter-spacing:.12em;text-shadow:0 1px 1px rgba(0,0,0,.5)}
.car .plate{position:absolute;left:50%;top:56%;transform:translateX(-50%);background:#f5f7f8;border:4px solid #1f2328;border-radius:8px;text-align:center;line-height:1.05}
.car .plate .st{color:#2b5ea8;font-weight:700;letter-spacing:.28em}
.car .plate .num{font-family:"Courier New",monospace;font-weight:800;color:#121212;letter-spacing:.1em;white-space:nowrap}
.car .plate.temp{background:#fbf6dc;border-style:dashed;border-color:#555}
.car .plate .exp{color:#444;font-size:.8em;letter-spacing:.05em}
.car .bumper{position:absolute;left:-2%;right:-2%;bottom:7%;height:13%;background:linear-gradient(#2c3035,#1b1e21);border-radius:10px}
.car .tire{position:absolute;bottom:-3%;width:17%;height:13%;background:#101112;border-radius:8px}
.thumb{position:absolute;background:radial-gradient(ellipse at 40% 35%,#e7b996,#c98c68 70%,#a96f50);border-radius:48% 48% 40% 40%/60% 60% 35% 35%;box-shadow:-6px 8px 18px rgba(0,0,0,.35)}`;

function car(o) {
  const w = o.w;
  const h = Math.round(w * 0.72);
  const f = (k) => Math.max(1, Math.round(w * k));
  const plateInner = o.temp
    ? `<div class="st" style="font-size:${f(0.022)}px;color:#8a5a00">${esc(o.state)}</div>
<div class="num" style="font-size:${f(0.06)}px"><span data-gt-name="${o.gt}">${esc(o.plateText)}</span></div>
<div class="exp">EXPIRES 11/14/2026</div>`
    : `<div class="st" style="font-size:${f(0.024)}px">${esc(o.state)}</div>
<div class="num" style="font-size:${f(0.068)}px"><span data-gt-name="${o.gt}">${esc(o.plateText)}</span></div>`;
  const style = `left:${o.x}px;top:${o.y}px;width:${w}px;height:${h}px;${o.blur ? `filter:blur(${o.blur}px);` : ''}`;
  return `<div class="car" style="${style}">
<div class="body" style="background:linear-gradient(180deg,${o.color[0]} 0%,${o.color[1]} 100%)"></div>
<div class="win">${o.refl || ''}</div>
<div class="tl" style="left:5%"></div><div class="tl" style="right:5%"></div>
<div class="badge" style="font-size:${f(0.034)}px"><span data-gt-name="${o.gt}:badge">${esc(`${o.make} ${o.model}`.toUpperCase())}</span></div>
<div class="plate${o.temp ? ' temp' : ''}" style="width:${f(o.temp ? 0.54 : 0.48)}px;padding:${f(0.012)}px ${f(0.02)}px;border-width:${f(0.007)}px">${plateInner}</div>
<div class="bumper"></div>
<div class="tire" style="left:8%"></div><div class="tire" style="right:8%"></div>
</div>`;
}

function scene(parts, extraCss = '') {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${SCENE_CSS}${extraCss}</style></head><body>
<div class="bldg" style="left:520px;top:120px;width:300px;height:190px"></div>
<div class="tree" style="left:40px;top:150px;width:170px;height:150px"></div>
<div class="tree" style="left:230px;top:180px;width:120px;height:110px"></div>
<div class="lane" style="top:640px;transform:rotate(-8deg);width:500px;left:-60px"></div>
<div class="lane" style="top:640px;transform:rotate(8deg);width:500px;left:420px"></div>
${parts.join('\n')}
</body></html>`;
}

const C = {
  silver: ['#c9ced3', '#8d949b'],
  white: ['#f1f2f3', '#b9bec3'],
  black: ['#3a3d42', '#16181b'],
  red: ['#b8232e', '#6e1219'],
  blue: ['#2f5d9a', '#173561'],
  grey: ['#7d848c', '#4a5057'],
  green: ['#3f6b52', '#21402f'],
  tan: ['#c2ab86', '#8a7553'],
};

// ---------- pickup forms ----------
const FORM_CSS = `*{box-sizing:border-box}
html,body{margin:0;width:840px;height:1100px;overflow:hidden}
body{background:#fff;font-family:Georgia,serif;color:#1a202c;padding:40px 46px}
h1{font-size:24px;margin:0 0 4px}.sub{color:#4a5568;font-size:13px;margin-bottom:18px}
.row{display:flex;align-items:flex-end;margin:16px 0;font-size:15px}
.lab{white-space:nowrap;margin-right:10px;color:#2d3748}
.line{flex:1;border-bottom:1.5px solid #4a5568;min-height:30px;padding:0 6px 2px}
table{border-collapse:collapse;width:100%;margin-top:6px;font-size:15px}
td,th{border:1.2px solid #718096;padding:9px 10px;height:46px;text-align:left}th{background:#edf2f7;font-size:13px}
.sig{margin-top:30px;font-size:13px;color:#4a5568}
.typed{font-family:"Courier New",monospace;font-size:18px;font-weight:700}`;

function val(gt, text, hand, extra = '') {
  if (!hand) return `<span class="typed" data-gt-name="${esc(gt)}">${esc(text)}</span>`;
  return `<span data-gt-name="${esc(gt)}" style="font-family:${hand.font};font-size:${hand.size || 24}px;color:${hand.ink};display:inline-block;transform:rotate(${hand.rot || -1.5}deg);${extra}">${esc(text)}</span>`;
}

function pickupForm(o) {
  const h = o.hand;
  const adultRows = o.adults
    .map((a, i) => {
      const relInk = h ? val(`rel:${a.name}`, a.rel, { ...h, size: (h.size || 24) - 4, rot: (h.rot || -1.5) + (i % 2 ? 1 : -1) }) : `<span class="typed">${esc(a.rel)}</span>`;
      const strike = a.struck ? 'text-decoration:line-through;text-decoration-thickness:3px;' : '';
      const nm = h ? val(a.struck ? `x:${a.name}` : `adult:${a.name}`, a.name, { ...h, rot: (h.rot || -1.5) + (i % 2 ? -1 : 1) }, strike) : val(`adult:${a.name}`, a.name, null);
      return `<tr><td>${nm}</td><td>${relInk}</td><td>${h ? val(`ph:${a.name}`, a.phone, { ...h, size: (h.size || 24) - 4 }) : `<span class="typed">${esc(a.phone)}</span>`}</td></tr>`;
    })
    .join('\n');
  const blank = Array.from({ length: Math.max(0, 4 - o.adults.length) }, () => '<tr><td></td><td></td><td></td></tr>').join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FORM_CSS}</style></head><body>
<h1>${esc(o.school || 'Maple Ridge Elementary')} — Authorized Pickup Form</h1>
<div class="sub">Car rider dismissal · ${esc(o.year || '2026–27')} · Return to the front office. Only adults listed below may pick up.</div>
<div class="row"><span class="lab">Student name:</span><span class="line">${val(`rider:${o.student}`, o.student, h)}</span><span class="lab" style="margin-left:18px">Grade:</span><span class="line" style="flex:0 0 90px">${val('grade', o.grade, h)}</span></div>
<div class="row"><span class="lab">Vehicle license plate:</span><span class="line">${val('plate:fg', o.plate, h)}</span><span class="lab" style="margin-left:18px">State:</span><span class="line" style="flex:0 0 90px">${val('state', o.state || 'TX', h)}</span></div>
<div class="row"><span class="lab">Vehicle make / model:</span><span class="line">${val('makemodel', `${o.make} ${o.model}`, h)}</span><span class="lab" style="margin-left:18px">Color:</span><span class="line" style="flex:0 0 130px">${val('color', o.color || 'Silver', h)}</span></div>
<h2 style="font-size:16px;margin:26px 0 6px">Authorized adults</h2>
<table><tr><th style="width:44%">Name</th><th>Relationship</th><th>Phone</th></tr>
${adultRows}
${blank}
</table>
<div class="sig">Parent/guardian signature: ${h ? val('sig', o.adults[0].name.split(' ')[0][0] + '. ' + o.adults[0].name.split(' ').slice(-1)[0], { ...h, size: 26 }) : '______________________'} &nbsp;&nbsp; Date: ${h ? val('date', '9/2/26', { ...h, size: 20 }) : '__________'}</div>
<div class="sig" style="margin-top:14px">Office use: tag # issued ________ · entered by ________</div>
</body></html>`;
}

function formExpected(id, o) {
  return expected(id, {
    document_kind: 'authorized_pickup',
    plate: norm(o.plate),
    make: o.make,
    model: o.model,
    riders: [o.student],
    authorized_pickups: o.adults.filter((a) => !a.struck).map((a) => a.name),
  });
}

const FORM_FIELDS = ['document_kind', 'plate', 'make', 'model', 'riders', 'authorized_pickups'];
const PLATE_FIELDS = ['document_kind', 'plate', 'make', 'model'];

// ---------- hang tag on the dashboard ----------
function dashTag(o) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{box-sizing:border-box}
html,body{margin:0;width:840px;height:1100px;overflow:hidden}
body{position:relative;font-family:Helvetica,Arial,sans-serif;background:linear-gradient(180deg,#b9c9d6 0%,#7f93a3 36%,#2a2d31 37%,#1d1f22 100%)}
.dash{position:absolute;left:0;right:0;top:640px;bottom:0;background:linear-gradient(#26292d,#141517)}
.mirror{position:absolute;left:330px;top:40px;width:200px;height:70px;background:#202326;border-radius:30px}
.cord{position:absolute;left:428px;top:108px;width:3px;height:70px;background:#333}
.tag{position:absolute;left:210px;top:175px;width:440px;background:#fff;border:6px solid #1f6f43;border-radius:20px;padding:26px;text-align:center;transform:rotate(-3deg);box-shadow:0 10px 30px rgba(0,0,0,.4)}
.tag h1{margin:0;font-size:22px;color:#1f6f43;letter-spacing:.08em}
.tag .num{font-size:64px;font-weight:800;color:#c0392b;margin:12px 0 6px}
.tag .plate{font-family:"Courier New",monospace;font-size:36px;font-weight:800;letter-spacing:.14em;margin:6px 0}
.tag .riders{font-size:21px;line-height:1.5;color:#222}
.tag .foot{font-size:13px;color:#666;margin-top:10px}</style></head><body>
<div class="mirror"></div><div class="cord"></div>
<div class="tag"><h1>${esc(o.school)} · CAR RIDER</h1>
<div class="num">TAG # <span data-gt-name="tag">${esc(o.tag)}</span></div>
<div class="plate">PLATE <span data-gt-name="plate:fg">${esc(o.plate)}</span></div>
<div class="riders">${o.riders.map((r) => `<div><span data-gt-name="rider:${esc(r)}">${esc(r)}</span></div>`).join('')}</div>
<div class="foot">Hang from rear-view mirror · display in car line</div></div>
<div class="dash"></div>
</body></html>`;
}

// ---------- negatives ----------
function permissionSlip() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{box-sizing:border-box}html,body{margin:0;width:840px;height:1100px;overflow:hidden}
body{background:#fffef8;font-family:Georgia,serif;padding:46px;color:#1a202c}h1{font-size:26px}p{font-size:16px;line-height:1.5}
.line{border-bottom:1.5px solid #555;display:inline-block;min-width:260px;padding:0 6px}
.h{font-family:${HANDS.bradley};font-size:24px;color:#1b3a8a}</style></head><body>
<h1>Field Trip Permission Slip — Houston Museum of Natural Science</h1>
<p>Grade 4 will visit the museum on <b>Friday, October 16</b>. Buses leave at 8:15 AM and return by 2:30 PM. Cost: $12 (lunch provided).</p>
<p>Student: <span class="line"><span class="h">Ava Lindqvist</span></span> &nbsp; Teacher: <span class="line"><span class="h">Ms. Okoro</span></span></p>
<p>I give permission for my child to attend. &nbsp; ☑ Yes &nbsp; ☐ No</p>
<p>Parent/guardian: <span class="line"><span class="h">Sofia Lindqvist</span></span> &nbsp; Phone: <span class="line"><span class="h">713-555-0148</span></span></p>
<p>Allergies / medical notes: <span class="line"><span class="h">none</span></span></p>
<p style="margin-top:40px;font-size:13px;color:#555">Return by Oct 9. Questions? Call the front office.</p>
</body></html>`;
}
function spiritFlyer() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{box-sizing:border-box}html,body{margin:0;width:840px;height:1100px;overflow:hidden}
body{background:linear-gradient(160deg,#ffe066,#ff9f43);font-family:Helvetica,Arial,sans-serif;padding:50px;color:#2d1b00;text-align:center}
h1{font-size:64px;margin:30px 0 10px}h2{font-size:30px;margin:0 0 30px}li{font-size:30px;margin:16px 0;list-style:none}</style></head><body>
<h1>SPIRIT WEEK!</h1><h2>Oct 19 – 23 · Go Mustangs</h2>
<ul><li>MON · Pajama Day</li><li>TUE · Twin Day</li><li>WED · Crazy Hair</li><li>THU · Jersey Day</li><li>FRI · Blue &amp; Gold</li></ul>
<p style="font-size:22px;margin-top:40px">Pep rally Friday 2:15 in the gym</p>
</body></html>`;
}

const OUTDOOR = { frame: [1200, 1600], background: 'carpet', scale: 1.06 };

export function roughCases() {
  const cases = [];
  const plateCase = (id, o) => {
    cases.push({
      id,
      kind: 'vehicle_photo',
      hard: true,
      score_fields: PLATE_FIELDS,
      notes: o.notes,
      html: scene(o.parts, o.css || ''),
      expected: expected(id, { document_kind: 'vehicle_photo', plate: o.plate, plateBack: o.plate, make: o.make, model: o.model, side: 'back' }),
      meta: { rough: true, effects: o.effects, degrade: o.degrade, rough_gt: o.rough_gt || {} },
    });
  };

  plateCase('R01', {
    plate: 'HVK3827', make: 'Toyota', model: 'RAV4',
    effects: ['strong_keystone', 'rotation', 'glare_hotspot', 'jpeg_artifacts'],
    notes: 'ROUGH: rear plate shot from the curb at a steep angle, sun glare streak across the bumper, q50.',
    parts: [car({ x: 110, y: 400, w: 620, color: C.white, plateText: 'HVK 3827', state: 'TEXAS', make: 'Toyota', model: 'RAV4', gt: 'plate:fg' })],
    degrade: { ...OUTDOOR, seed: 4101, rotate: -9, keystone: { left: 0.82, right: 1.08, top: 0.96 }, jitter: 0.004,
      glare: [{ target: 'plate:fg', fx: 1.25, fy: 0.2, rx: 0.07, ry: 0.025, angle: -20, strength: 1.5 }],
      light: { gradient: [0.5, -0.2], amount: 0.2, vignette: 0.3 }, noise: 5, jpeg: 50 },
  });
  plateCase('R02', {
    plate: 'MPW6142', make: 'Ford', model: 'Explorer',
    effects: ['dusk_low_light', 'sensor_noise', 'jpeg_artifacts'],
    notes: 'ROUGH: car line at dusk — dim, blue cast, heavy sensor noise, q40.',
    parts: [car({ x: 120, y: 420, w: 600, color: C.black, plateText: 'MPW 6142', state: 'TEXAS', make: 'Ford', model: 'Explorer', gt: 'plate:fg' })],
    degrade: { ...OUTDOOR, seed: 4202, rotate: 2, lowlight: { exposure: 0.42, gamma: 1.35, cast: [0.85, 0.92, 1.12] }, noise: 15,
      light: { gradient: [0.2, 0.6], amount: 0.3, vignette: 0.5 }, jpeg: 40 },
  });
  plateCase('R03', {
    plate: 'DGT7395', make: 'Chevrolet', model: 'Malibu',
    effects: ['motion_blur', 'defocus_blur', 'jpeg_artifacts'],
    notes: 'ROUGH: car still rolling as the photo is taken — horizontal motion blur plus slight defocus, q55.',
    parts: [car({ x: 120, y: 420, w: 600, color: C.red, plateText: 'DGT 7395', state: 'TEXAS', make: 'Chevrolet', model: 'Malibu', gt: 'plate:fg' })],
    degrade: { ...OUTDOOR, seed: 4303, rotate: 1.5, motion: { len: 11, angle: 3 }, defocus: 1.2, noise: 5, jpeg: 55 },
  });
  plateCase('R04', {
    plate: 'CRX2467', make: 'Nissan', model: 'Rogue',
    effects: ['dirty_plate_occlusion', 'uneven_light', 'jpeg_artifacts'],
    notes: 'ROUGH: muddy plate — dirt splash covers the last characters; make/model badge clean.',
    parts: [car({ x: 120, y: 420, w: 600, color: C.grey, plateText: 'CRX 2467', state: 'TEXAS', make: 'Nissan', model: 'Rogue', gt: 'plate:fg' })],
    degrade: { ...OUTDOOR, seed: 4404, rotate: -2,
      stains: [{ target: 'plate:fg', fx: 0.82, fy: 0.5, r: 30, strength: 1.6, fill: 0.85, color: [92, 70, 44] }, { target: 'plate:fg', fx: 0.15, fy: 1.2, r: 18, strength: 0.9, fill: 0.5, color: [92, 70, 44] }],
      light: { gradient: [-0.4, 0.3], amount: 0.2, vignette: 0.3 }, noise: 6, jpeg: 55 },
    rough_gt: { uncertain: ['plate'] },
  });
  plateCase('R05', {
    plate: '5K28394', make: 'Kia', model: 'Telluride',
    effects: ['temporary_paper_tag', 'keystone', 'heavy_jpeg_double'],
    notes: 'ROUGH: new car with a paper temporary tag, keystoned shot, re-shared JPEG (q22 then q30).',
    parts: [car({ x: 110, y: 410, w: 620, color: C.blue, plateText: '5K2-8394', state: 'TEXAS TEMPORARY TAG', make: 'Kia', model: 'Telluride', gt: 'plate:fg', temp: true })],
    degrade: { ...OUTDOOR, seed: 4505, rotate: 4, keystone: { top: 1.05, bottom: 0.8 }, jitter: 0.004, noise: 6, jpeg: 22, jpeg2: 30 },
  });
  plateCase('R06', {
    plate: 'JCW472', make: 'Subaru', model: 'Outback',
    effects: ['out_of_state', 'hand_in_frame', 'hand_shadow', 'defocus_blur'],
    notes: "ROUGH: Oklahoma plate; the photographer's thumb covers the make/model badge; hand shadow; soft focus.",
    parts: [
      car({ x: 120, y: 420, w: 600, color: C.green, plateText: 'JCW-472', state: 'OKLAHOMA', make: 'Subaru', model: 'Outback', gt: 'plate:fg' }),
      '<div class="thumb" style="left:250px;top:560px;width:360px;height:140px;transform:rotate(-12deg)"></div><div class="thumb" style="left:-60px;top:640px;width:420px;height:200px;transform:rotate(18deg)"></div>',
    ],
    degrade: { ...OUTDOOR, seed: 4606, rotate: -3,
      shadow: { cx: 0.25, cy: 0.62, rx: 0.25, ry: 0.1, angle: 20, armTo: [-0.1, 0.9], armWidth: 0.22, strength: 0.45, soft: 0.03 },
      defocus: 1.1, noise: 6, jpeg: 58 },
    // checked by eye: the right thumb also clips the first plate character ("?CW-472") → plate uncertain
    rough_gt: { absent: ['make', 'model'], uncertain: ['plate'] },
  });
  {
    const o = { student: 'Nora Whitfield', grade: '2', plate: 'LTV 5832', make: 'Honda', model: 'Odyssey', color: 'Silver',
      adults: [{ name: 'Grace Whitfield', rel: 'Mother', phone: '281-555-0193' }, { name: 'Daniel Whitfield', rel: 'Father', phone: '281-555-0177' }] };
    cases.push({ id: 'R07', kind: 'authorized_pickup', hard: true, score_fields: FORM_FIELDS,
      notes: 'ROUGH: printed pickup form on a car hood outdoors — angled keystone, sky glare hotspot, q50.',
      html: pickupForm(o), expected: formExpected('R07', o),
      meta: { rough: true, effects: ['outdoor_on_hood', 'keystone', 'glare_hotspot', 'jpeg_artifacts'],
        degrade: { seed: 4707, frame: [1200, 1600], background: 'dark_desk', scale: 0.86, rotate: -7, keystone: { top: 0.84, bottom: 1.04 }, jitter: 0.005,
          glare: [{ target: 'adult:Daniel Whitfield', fx: 1.6, fy: 0.3, rx: 0.12, ry: 0.05, angle: -10, strength: 1.7 }],
          light: { gradient: [0.4, -0.3], amount: 0.25, vignette: 0.3 }, noise: 5, jpeg: 50 } } });
  }
  {
    const o = { student: 'Elias Romero', grade: '4', plate: 'KZD 4176', make: 'Toyota', model: 'Sienna', color: 'Grey',
      adults: [{ name: 'Lucia Romero', rel: 'Mother', phone: '832-555-0110' }, { name: 'Tomas Romero', rel: 'Father', phone: '832-555-0124' }, { name: 'Ana Vega', rel: 'Aunt', phone: '832-555-0151' }] };
    cases.push({ id: 'R08', kind: 'authorized_pickup', hard: true, score_fields: FORM_FIELDS,
      notes: 'ROUGH: pickup form photographed in the car at dusk — low light, warm cast, hand-shake motion blur, q42.',
      html: pickupForm(o), expected: formExpected('R08', o),
      meta: { rough: true, effects: ['dusk_low_light', 'motion_blur', 'rotation', 'jpeg_artifacts'],
        degrade: { seed: 4808, frame: [1200, 1600], background: 'fabric', scale: 0.88, rotate: 6, keystone: { top: 0.95 }, jitter: 0.004,
          motion: { len: 6, angle: 30 }, lowlight: { exposure: 0.55, gamma: 1.25, cast: [1.08, 0.95, 0.78] }, noise: 11,
          light: { gradient: [-0.4, 0.4], amount: 0.3, vignette: 0.45 }, jpeg: 42 } } });
  }
  {
    const o = { school: 'Cedar Park Elem', tag: '2087', plate: 'FNR 6624', riders: ['Ivy Patel', 'Arjun Patel'] };
    cases.push({ id: 'R09', kind: 'hang_tag', hard: true, score_fields: ['document_kind', 'plate', 'tag_number', 'riders'],
      notes: 'ROUGH: hang tag on the rear-view mirror shot through the windshield — reflection glare, keystone, q45.',
      html: dashTag(o),
      expected: expected('R09', { document_kind: 'hang_tag', plate: norm(o.plate), tag_number: o.tag, riders: o.riders }),
      meta: { rough: true, effects: ['through_windshield', 'glare_hotspot', 'keystone', 'jpeg_artifacts'],
        degrade: { ...OUTDOOR, seed: 4909, rotate: 3, keystone: { top: 0.9, bottom: 1.05 }, jitter: 0.004,
          glare: [{ target: 'rider:Arjun Patel', fx: 0.9, fy: 0.5, rx: 0.09, ry: 0.04, angle: 25, strength: 1.4 }, { cx: 0.15, cy: 0.2, rx: 0.2, ry: 0.08, angle: 30, strength: 0.6 }],
          light: { gradient: [0.3, 0.3], amount: 0.2, vignette: 0.35 }, noise: 6, jpeg: 45 },
        // checked by eye: glare washes out "Patel" on the second rider line (only "Arjun" readable)
        rough_gt: { uncertain_names: { riders: ['Arjun Patel'] } } } });
  }
  plateCase('R10', {
    plate: 'PXM853', make: 'Jeep', model: 'Wrangler',
    effects: ['strong_keystone', 'defocus_blur', 'heavy_jpeg', 'out_of_state'],
    notes: 'ROUGH: Louisiana plate from a low angle (strong keystone), soft focus, very heavy JPEG (q18).',
    parts: [car({ x: 120, y: 420, w: 600, color: C.tan, plateText: 'PXM 853', state: 'LOUISIANA', make: 'Jeep', model: 'Wrangler', gt: 'plate:fg' })],
    degrade: { ...OUTDOOR, seed: 5010, rotate: -5, keystone: { top: 0.72, bottom: 1.08 }, jitter: 0.004, defocus: 1.5, noise: 5, jpeg: 18 },
  });

  const hwCase = (id, o, rough, notes, effects, degrade, rough_gt = {}) => {
    cases.push({ id, kind: 'authorized_pickup', hard: true, score_fields: FORM_FIELDS, notes,
      html: pickupForm(o), expected: formExpected(id, o),
      meta: { handwritten: true, rough: Boolean(rough), effects, ...(rough ? { degrade } : {}), rough_gt,
        excluded_names: o.adults.filter((a) => a.struck).map((a) => a.name) } });
  };
  hwCase('H01', { student: 'Mila Torres', grade: '1', plate: 'RWK 4729', make: 'Honda', model: 'Pilot', color: 'Blue',
    hand: { font: HANDS.bradley, ink: '#1b3a8a', size: 25, rot: -1.5 },
    adults: [{ name: 'Elena Torres', rel: 'Mom', phone: '713-555-0162' }, { name: 'Victor Torres', rel: 'Dad', phone: '713-555-0108' }] },
    false, 'HANDWRITTEN (flat scan): parent filled the pickup form in blue ballpoint print.', ['handwritten_print']);
  hwCase('H02', { student: 'Owen Fitzgerald', grade: 'K', plate: 'GHY 3758', make: 'Ford', model: 'F-150', color: 'Red',
    hand: { font: HANDS.noteworthy, ink: '#222', size: 24, rot: 1 },
    adults: [{ name: 'Megan Fitzgerald', rel: 'Mother', phone: '936-555-0133' }, { name: 'Chris Doyle', rel: 'Uncle', phone: '936-555-0145', struck: true }, { name: 'Pat Doyle', rel: 'Grandma', phone: '936-555-0189' }] },
    false, 'HANDWRITTEN (flat scan): pencil-style hand; one authorized adult crossed out (must NOT be returned).', ['handwritten_print', 'crossed_out_adult']);
  hwCase('H03', { student: 'Zoe Kim', grade: '3', plate: 'JMT 6492', make: 'Mazda', model: 'CX-5', color: 'White',
    hand: { font: HANDS.marker, ink: '#0d3d26', size: 26, rot: -2 },
    adults: [{ name: 'Hana Kim', rel: 'Mother', phone: '512-555-0174' }, { name: 'Daniel Kim', rel: 'Father', phone: '512-555-0129' }] },
    true, 'HANDWRITTEN + ROUGH: felt-tip form pulled from a backpack — crumpled, dim car interior, q45.',
    ['handwritten_marker', 'crumpled_paper', 'low_light_noise', 'jpeg_artifacts'],
    { seed: 5303, frame: [1200, 1600], background: 'fabric', scale: 0.86, rotate: -4, keystone: { top: 0.94 }, jitter: 0.008,
      crumple: { amp: 6, cell: 100, shade: 0.2, creases: 5 }, lowlight: { exposure: 0.6, gamma: 1.2, cast: [1.05, 0.96, 0.82] }, noise: 11,
      light: { gradient: [-0.3, 0.4], amount: 0.25, vignette: 0.4 }, jpeg: 45 });
  hwCase('H04', { student: 'Liam Brooks', grade: '5', plate: 'VDC 2843', make: 'Chevrolet', model: 'Tahoe', color: 'Black',
    hand: { font: HANDS.chalk, ink: '#5a1d8c', size: 24, rot: 1.5 },
    adults: [{ name: 'Rachel Brooks', rel: 'Mother', phone: '409-555-0116' }, { name: 'Kevin Brooks', rel: 'Father', phone: '409-555-0182' }, { name: 'Joy Martin', rel: 'Neighbor', phone: '409-555-0137' }] },
    true, 'HANDWRITTEN + ROUGH: purple gel pen, keystoned shot on the steering wheel, hand + phone shadow across the adult table, window glare.',
    ['handwritten_gel', 'keystone', 'hand_shadow', 'glare_hotspot'],
    { seed: 5404, frame: [1200, 1600], background: 'dark_desk', scale: 0.88, rotate: 5, keystone: { top: 0.86, bottom: 1.03 }, jitter: 0.005,
      shadow: { cx: 0.7, cy: 0.66, rx: 0.2, ry: 0.07, angle: -20, armTo: [1.2, 0.95], armWidth: 0.2, strength: 0.5, soft: 0.025 },
      glare: [{ target: 'plate:fg', fx: 1.5, fy: -1.5, rx: 0.1, ry: 0.035, angle: 15, strength: 1.3 }],
      light: { gradient: [0.3, -0.3], amount: 0.2, vignette: 0.35 }, noise: 6, jpeg: 55 });

  const mc = (id, o) => {
    cases.push({ id, kind: 'vehicle_photo', hard: true, score_fields: PLATE_FIELDS, notes: o.notes,
      html: scene(o.parts),
      expected: expected(id, { document_kind: 'vehicle_photo', plate: o.plate, plateBack: o.plate, make: o.make, model: o.model, side: 'back', unreadable: Boolean(o.unreadable) }),
      meta: { multi_car: true, rough: Boolean(o.degrade), effects: o.effects, ...(o.degrade ? { degrade: o.degrade } : {}),
        background_plates: o.bg, rough_gt: o.rough_gt || {}, gt_rule: o.rule } });
  };
  mc('M01', {
    plate: 'KTW4863', make: 'Toyota', model: 'Camry', bg: ['PLR2957'], effects: ['background_car_readable'],
    rule: 'foreground (largest, nearest) car',
    notes: 'MULTI-CAR: foreground Camry; a smaller Ford Escape one lane back with a clearly readable plate.',
    parts: [
      car({ x: 470, y: 300, w: 270, color: C.blue, plateText: 'PLR 2957', state: 'TEXAS', make: 'Ford', model: 'Escape', gt: 'plate:bg1' }),
      car({ x: 90, y: 460, w: 640, color: C.silver, plateText: 'KTW 4863', state: 'TEXAS', make: 'Toyota', model: 'Camry', gt: 'plate:fg' }),
    ],
  });
  mc('M02', {
    plate: 'MXH7342', make: 'Honda', model: 'Accord', bg: ['TRC5186'], effects: ['background_sharper_than_foreground', 'foreground_defocus'],
    rule: 'foreground car even though its plate is slightly blurry',
    notes: 'MULTI-CAR: foreground Accord is slightly out of focus; background Altima plate is tack sharp.',
    parts: [
      car({ x: 40, y: 290, w: 300, color: C.white, plateText: 'TRC 5186', state: 'TEXAS', make: 'Nissan', model: 'Altima', gt: 'plate:bg1' }),
      car({ x: 180, y: 470, w: 620, color: C.black, plateText: 'MXH 7342', state: 'TEXAS', make: 'Honda', model: 'Accord', gt: 'plate:fg', blur: 1.6 }),
    ],
  });
  mc('M03', {
    plate: 'HGM6258', make: 'Kia', model: 'Sorento', bg: ['DWN3471'], effects: ['adjacent_lanes_similar_distance'],
    rule: 'nearest of two side-by-side cars (larger, lower in frame)',
    notes: 'MULTI-CAR: two cars in adjacent lanes at a similar distance; the Sorento on the right is slightly nearer (bigger, lower). Tucson on the left is the other lane.',
    parts: [
      car({ x: 18, y: 470, w: 360, color: C.red, plateText: 'DWN 3471', state: 'TEXAS', make: 'Hyundai', model: 'Tucson', gt: 'plate:bg1' }),
      car({ x: 400, y: 520, w: 420, color: C.grey, plateText: 'HGM 6258', state: 'TEXAS', make: 'Kia', model: 'Sorento', gt: 'plate:fg' }),
    ],
  });
  mc('M04', {
    plate: 'YRV4825', make: 'Subaru', model: 'Forester', bg: ['CLP7639'], effects: ['foreground_cut_by_frame', 'background_car_readable'],
    rule: 'foreground car even though it runs off the right/bottom edge',
    notes: 'MULTI-CAR: foreground Forester is cut off by the right and bottom frame edges (plate + badge still in frame); background CX-9 fully visible.',
    parts: [
      car({ x: 60, y: 340, w: 250, color: C.white, plateText: 'CLP 7639', state: 'TEXAS', make: 'Mazda', model: 'CX-9', gt: 'plate:bg1' }),
      car({ x: 300, y: 620, w: 700, color: C.green, plateText: 'YRV 4825', state: 'TEXAS', make: 'Subaru', model: 'Forester', gt: 'plate:fg' }),
    ],
  });
  mc('M05', {
    plate: 'BFT2694', make: 'Volkswagen', model: 'Jetta', bg: ['WZK8153', '3518KZW', 'KZW3518', '8153WZK'], effects: ['reflection_in_rear_window'],
    rule: 'foreground car; ignore the mirrored plate reflected in its rear window',
    notes: 'MULTI-CAR: the rear window of the Jetta reflects the car behind (mirrored plate WZK 8153). Only the Jetta counts.',
    parts: [
      car({ x: 100, y: 430, w: 640, color: C.silver, plateText: 'BFT 2694', state: 'TEXAS', make: 'Volkswagen', model: 'Jetta', gt: 'plate:fg',
        refl: `<div style="position:absolute;inset:0;transform:scaleX(-1);opacity:.5">
<div style="position:absolute;left:26%;top:18%;width:48%;height:70%;background:linear-gradient(#9aa3ad,#5e666f);border-radius:18px"></div>
<div style="position:absolute;left:36%;top:52%;width:28%;background:#e9edf0;border:2px solid #222;border-radius:4px;text-align:center;font:800 26px 'Courier New',monospace;letter-spacing:.08em;color:#111">WZK 8153</div></div>` }),
    ],
  });
  mc('M06', {
    plate: 'SNT5742', make: 'Toyota', model: 'Highlander', bg: ['GVL3816', 'MKD2479'], effects: ['background_cars_readable', 'dusk_low_light', 'glare_hotspot', 'jpeg_artifacts'],
    rule: 'foreground car at dusk with glare; two readable background cars',
    notes: 'MULTI-CAR + ROUGH: dusk car line, headlight glare on the left, two background cars with readable plates behind a Highlander.',
    parts: [
      car({ x: 40, y: 300, w: 280, color: C.red, plateText: 'GVL 3816', state: 'TEXAS', make: 'Honda', model: 'CR-V', gt: 'plate:bg1' }),
      car({ x: 560, y: 290, w: 220, color: C.white, plateText: 'MKD 2479', state: 'TEXAS', make: 'Ford', model: 'Edge', gt: 'plate:bg2' }),
      car({ x: 140, y: 470, w: 620, color: C.blue, plateText: 'SNT 5742', state: 'TEXAS', make: 'Toyota', model: 'Highlander', gt: 'plate:fg' }),
    ],
    degrade: { ...OUTDOOR, seed: 5606, rotate: -2, lowlight: { exposure: 0.5, gamma: 1.3, cast: [0.9, 0.93, 1.1] }, noise: 12,
      glare: [{ cx: 0.12, cy: 0.33, rx: 0.08, ry: 0.06, angle: 0, strength: 1.8 }, { cx: 0.3, cy: 0.34, rx: 0.06, ry: 0.05, angle: 0, strength: 1.4 }],
      light: { gradient: [0.3, 0.5], amount: 0.3, vignette: 0.5 }, jpeg: 45 },
  });

  cases.push({ id: 'N04', kind: 'negative', negative: true, score_fields: ['document_kind', 'plate'],
    notes: 'NEGATIVE + ROUGH: field-trip permission slip (student + parent names, phone) shot in the car at dusk — must be rejected, no rider/pickup records.',
    html: permissionSlip(),
    expected: expected('N04', { document_kind: 'rejected', unreadable: true, reject_reason: 'permission slip, not a ride document' }),
    meta: { rough: true, effects: ['dusk_low_light', 'keystone', 'jpeg_artifacts'], forbid_names: ['Ava Lindqvist', 'Sofia Lindqvist'],
      degrade: { seed: 5707, frame: [1200, 1600], background: 'fabric', scale: 0.86, rotate: -6, keystone: { top: 0.9 }, jitter: 0.005,
        lowlight: { exposure: 0.55, gamma: 1.25, cast: [1.06, 0.95, 0.8] }, noise: 11, light: { gradient: [0.4, 0.3], amount: 0.3, vignette: 0.45 }, jpeg: 45 } } });
  cases.push({ id: 'N05', kind: 'negative', negative: true, score_fields: ['document_kind', 'plate'],
    notes: 'NEGATIVE + ROUGH: spirit-week flyer taped inside a car window — window glare, angle, q50. Must be rejected.',
    html: spiritFlyer(),
    expected: expected('N05', { document_kind: 'rejected', unreadable: true, reject_reason: 'flyer, not a ride document' }),
    meta: { rough: true, effects: ['through_glass_glare', 'keystone', 'rotation', 'jpeg_artifacts'],
      degrade: { ...OUTDOOR, scale: 0.92, seed: 5808, rotate: 8, keystone: { left: 0.88, right: 1.05 }, jitter: 0.004,
        glare: [{ cx: 0.6, cy: 0.35, rx: 0.16, ry: 0.06, angle: 30, strength: 1.5 }], noise: 6, jpeg: 50 } } });

  return cases;
}
