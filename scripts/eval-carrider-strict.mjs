#!/usr/bin/env node
/**
 * STRICT car-rider ingest eval (clean / mild photo / rough / handwritten / multi-car / negatives)
 * against the deployed ride-lpr edge function. Eval only — no prompt / function changes.
 *
 *   node scripts/eval-carrider-strict.mjs                       # all cases, all variants
 *   EVAL_ONLY=R01,M03 node scripts/eval-carrider-strict.mjs     # subset
 *   EVAL_RESUME_STAMP=<stamp> node scripts/eval-carrider-strict.mjs   # reuse cached responses / rescore
 *   EVAL_CROP=R03,R10,H03 node scripts/eval-carrider-strict.mjs # + "crop" variant: rough.jpg cropped to the
 *                                                                  text/plate boxes in visibility.json
 *
 * Strict rules (see notes/company/carrider/eval/INGEST_SCORECARD.md):
 *   plate / tag      exact after upper-case + strip non-alphanumerics. O↔0-only mismatches FAIL and are
 *                    counted separately as `o0_soft` (they would pass the old lenient scorer).
 *   make / model     exact after lower-case + strip non-alphanumerics (make aliases: VW, Chevy).
 *   names            every expected name exact (normalized); every extra name = hallucination;
 *                    crossed-out (`excluded_names`) / negative `forbid_names` returned = hallucination.
 *   rough_gt         on the rough variant only: absent → must be empty (any value = hallucination);
 *                    uncertain → empty or exact both pass, a different value = hallucination.
 *   multi-car        GT = the foreground (closest) car. A returned plate that is one of
 *                    `background_plates` (or the same characters reordered, for the mirrored reflection)
 *                    = hallucination AND `picked_wrong_car`.
 *   doc pass         every scored field correct and zero hallucinations.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/carrider-ingest');

export const plateNorm = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const compact = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const nameNorm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const MAKE_ALIAS = { vw: 'volkswagen', chevy: 'chevrolet' };
const emptyish = (v) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sortedChars = (s) => plateNorm(s).split('').sort().join('');

function strictEqual(key, exp, act) {
  if (['plate', 'plateFront', 'plateBack', 'tag_number'].includes(key)) {
    const e = plateNorm(exp), a = plateNorm(act);
    if (e === a) return { ok: true };
    const soft = (s) => s.replace(/O/g, '0');
    return { ok: false, o0: soft(e) === soft(a) };
  }
  if (key === 'make' || key === 'model') {
    let e = compact(exp), a = compact(act);
    if (key === 'make') { e = MAKE_ALIAS[e] || e; a = MAKE_ALIAS[a] || a; }
    return { ok: e === a };
  }
  if (key === 'document_kind') {
    const e = String(exp || '').toLowerCase(), a = String(act || '').toLowerCase();
    return { ok: e === a || (e === 'rejected' && a === 'unknown') };
  }
  if (key === 'unreadable') return { ok: Boolean(exp) === Boolean(act) };
  if (key === 'side') return { ok: String(exp || 'unknown') === String(act || 'unknown') };
  return { ok: exp === act };
}

export function isBackgroundPlate(act, bgPlates = []) {
  const a = plateNorm(act);
  if (!a) return false;
  return bgPlates.some((b) => plateNorm(b) === a || (a.length >= 5 && sortedChars(b) === sortedChars(a)));
}

/** Score one response. variant ∈ clean | photo | rough | crop */
export function scoreStrict(expected, actual, meta, variant) {
  const roughish = variant === 'rough' || variant === 'crop';
  const rg = roughish ? meta.rough_gt || {} : {};
  const absent = new Set(rg.absent || []);
  const uncertain = new Set(rg.uncertain || []);
  const fields = meta.fields?.length ? meta.fields : ['document_kind', 'plate', 'make', 'model'];
  const rows = [];
  const add = (r) => rows.push(r);
  let pickedWrongCar = false;
  const bg = meta.background_plates || [];

  for (const key of fields) {
    const act = actual?.[key];
    if (key === 'riders' || key === 'authorized_pickups') {
      const expNames = (expected[key] || []).map(nameNorm);
      const unc = ((rg.uncertain_names || {})[key] || []).map(nameNorm);
      const abs = ((rg.absent_names || {})[key] || []).map(nameNorm);
      const required = expNames.filter((n) => !unc.includes(n) && !abs.includes(n));
      const got = (Array.isArray(act) ? act : []).map(nameNorm).filter(Boolean);
      const excluded = [...(meta.excluded_names || []), ...(meta.forbid_names || [])].map(nameNorm);
      for (const n of required) add({ path: `${key}:${n}`, result: got.includes(n) ? 'correct' : 'missing', exp: n, act: got.includes(n) ? n : null });
      for (const n of unc) {
        const hit = got.find((g) => g === n || n.startsWith(g + ' ') || g.split(' ')[0] === n.split(' ')[0]);
        add({ path: `${key}:${n}`, result: hit === undefined ? 'correct_empty' : hit === n || n.startsWith(hit) ? 'correct' : 'hallucinated', exp: `${n} (uncertain)`, act: hit ?? null });
      }
      for (const g of got) {
        const known = expNames.includes(g) || unc.some((n) => g === n || n.startsWith(g + ' ') || g.split(' ')[0] === n.split(' ')[0]);
        if (known && !abs.includes(g)) continue;
        add({ path: `${key}:extra`, result: 'hallucinated', exp: null, act: g, note: excluded.includes(g) ? 'excluded/forbidden name' : abs.includes(g) ? 'absent in rough' : 'extra name' });
      }
      if (!required.length && !unc.length && !got.length) add({ path: key, result: 'correct_empty', exp: [], act: [] });
      continue;
    }
    let exp = expected[key];
    if (absent.has(key)) exp = null;
    const expEmpty = emptyish(exp), actEmpty = emptyish(act);
    const wrongCar = ['plate', 'plateFront', 'plateBack'].includes(key) && isBackgroundPlate(act, bg) && plateNorm(act) !== plateNorm(exp);
    if (wrongCar) pickedWrongCar = true;
    if (expEmpty && actEmpty) { add({ path: key, result: 'correct_empty', exp, act }); continue; }
    if (expEmpty) { add({ path: key, result: 'hallucinated', exp, act, note: absent.has(key) ? 'absent in rough' : wrongCar ? 'background car' : undefined }); continue; }
    if (actEmpty) { add({ path: key, result: uncertain.has(key) ? 'correct_empty' : 'missing', exp, act }); continue; }
    const eq = strictEqual(key, exp, act);
    if (eq.ok) add({ path: key, result: 'correct', exp, act });
    else if (wrongCar) add({ path: key, result: 'hallucinated', exp, act, note: 'background car (picked wrong car)' });
    else if (uncertain.has(key)) add({ path: key, result: 'hallucinated', exp, act, note: 'uncertain field guessed wrong' });
    else add({ path: key, result: 'wrong', exp, act, o0_soft: Boolean(eq.o0) });
  }

  if (meta.negative) {
    const invented = ['plate', 'make', 'model', 'tag_number'].some((k) => !emptyish(actual?.[k]));
    add({ path: '_negative_no_invent', result: invented ? 'hallucinated' : 'correct', exp: null,
      act: invented ? { plate: actual?.plate, make: actual?.make, model: actual?.model, tag_number: actual?.tag_number } : null });
    const kindOk = ['rejected', 'unknown'].includes(String(actual?.document_kind || '').toLowerCase()) || actual?.unreadable === true;
    add({ path: '_negative_reject', result: kindOk ? 'correct' : 'wrong', exp: 'rejected', act: actual?.document_kind });
    if (!fields.includes('riders')) {
      for (const k of ['riders', 'authorized_pickups']) for (const g of (actual?.[k] || []).map(nameNorm).filter(Boolean))
        add({ path: `${k}:extra`, result: 'hallucinated', exp: null, act: g, note: 'name from a non-car-rider document' });
    }
  }

  const ok = (r) => r.result === 'correct' || r.result === 'correct_empty';
  const correct = rows.filter(ok).length;
  const hallucinated = rows.filter((r) => r.result === 'hallucinated').length;
  const plateRow = rows.find((r) => r.path === 'plate');
  return {
    rows,
    counts: { correct, total: rows.length, hallucinated, missing: rows.filter((r) => r.result === 'missing').length,
      wrong: rows.filter((r) => r.result === 'wrong').length, o0_soft: rows.filter((r) => r.o0_soft).length },
    accuracy: rows.length ? correct / rows.length : 0,
    pass: rows.every(ok),
    plate_exact: plateRow ? ok(plateRow) : null,
    picked_wrong_car: pickedWrongCar,
  };
}

export function bucketOf(meta, variant) {
  if (variant === 'crop') return 'crop';
  if (meta.negative) return variant === 'rough' ? 'negatives_rough' : 'negatives';
  if (meta.multi_car) return variant === 'rough' ? 'multi_car_rough' : 'multi_car';
  if (meta.handwritten) return variant === 'rough' ? 'handwritten_rough' : 'handwritten';
  if (variant === 'photo') return 'mild';
  if (variant === 'rough') return 'rough';
  return 'clean';
}

// ---------------------------------------------------------------- live run
function loadEnv() {
  const out = { ...process.env };
  const p = path.join(ROOT, '.env');
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (!out[m[1]]) out[m[1]] = v;
  }
  return out;
}

async function signIn(env) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY');
  const persona = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.kelyra', 'ui-personas.json'), 'utf8')).teacher;
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/sign-in-handle`, {
    method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: persona.handle, password: persona.password }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.access_token) throw new Error('teacher sign-in failed');
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${j.access_token}` } } });
  await sb.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
  return { sb, token: j.access_token, url: url.replace(/\/$/, ''), anon };
}

async function invoke(ctx, filePath, storageKey) {
  const buf = fs.readFileSync(filePath);
  const { error } = await ctx.sb.storage.from('photos').upload(storageKey, buf, { contentType: filePath.endsWith('.png') ? 'image/png' : 'image/jpeg', upsert: true });
  if (error) throw new Error(`upload failed: ${error.message}`);
  let last = { status: 0, json: { error: 'no attempt' } };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const t0 = Date.now();
    const res = await fetch(`${ctx.url}/functions/v1/ride-lpr`, {
      method: 'POST', headers: { Authorization: `Bearer ${ctx.token}`, apikey: ctx.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: storageKey }),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { error: 'non-json', raw: text.slice(0, 400) }; }
    last = { status: res.status, ms: Date.now() - t0, bytes: buf.length, json };
    if (!/503|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|429|rate.?limit/i.test(JSON.stringify(json))) return last;
    await sleep(8000 * attempt);
  }
  return last;
}

async function makeCrop(caseDir, outFile) {
  const { default: sharp } = await import('sharp');
  const vis = JSON.parse(fs.readFileSync(path.join(caseDir, 'visibility.json'), 'utf8'));
  const boxes = vis.items.filter((i) => i.inframe && i.frame_box).map((i) => i.frame_box);
  const [W, H] = vis.frame;
  const pad = 60;
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b[0])) - pad), y0 = Math.max(0, Math.min(...boxes.map((b) => b[1])) - pad);
  const x1 = Math.min(W, Math.max(...boxes.map((b) => b[2])) + pad), y1 = Math.min(H, Math.max(...boxes.map((b) => b[3])) + pad);
  await sharp(path.join(caseDir, 'rough.jpg')).extract({ left: Math.round(x0), top: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) })
    .resize({ width: 1200, withoutEnlargement: false }).jpeg({ quality: 82 }).toFile(outFile);
  return { box: [x0, y0, x1, y1].map(Math.round) };
}

async function main() {
  const stamp = (process.env.EVAL_RESUME_STAMP || '').trim() || `strict-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)}`;
  const runDir = path.join(CORPUS, 'runs', stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const only = (process.env.EVAL_ONLY || '').split(',').filter(Boolean);
  const crops = (process.env.EVAL_CROP || '').split(',').filter(Boolean);
  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
  let ctx = null, userId = null;
  const docs = [];
  for (const entry of manifest.cases) {
    if (only.length && !only.includes(entry.id) && !crops.includes(entry.id)) continue;
    const dir = path.join(CORPUS, entry.id);
    const expected = JSON.parse(fs.readFileSync(path.join(dir, 'expected.json'), 'utf8'));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'eval-meta.json'), 'utf8'));
    const variants = [];
    if (!crops.length || only.includes(entry.id)) {
      if (fs.existsSync(path.join(dir, 'clean.png'))) variants.push({ variant: 'clean', file: path.join(dir, 'clean.png') });
      if (meta.photo && fs.existsSync(path.join(dir, 'photo.jpg'))) variants.push({ variant: 'photo', file: path.join(dir, 'photo.jpg') });
      if (fs.existsSync(path.join(dir, 'rough.jpg'))) variants.push({ variant: 'rough', file: path.join(dir, 'rough.jpg') });
    }
    if (crops.includes(entry.id)) variants.push({ variant: 'crop', file: path.join(runDir, `${entry.id}__crop.jpg`) });
    for (const v of variants) {
      const out = path.join(runDir, `${entry.id}__${v.variant}.json`);
      let result = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
      if (!result?.json || result.status !== 200 || result.json.error) {
        if (!ctx) { ctx = await signIn(loadEnv()); userId = (await ctx.sb.auth.getUser()).data?.user?.id; }
        if (v.variant === 'crop') result = { crop: await makeCrop(dir, v.file) };
        process.stdout.write(`… ${entry.id} ${v.variant} `);
        try { result = { ...(result || {}), ...(await invoke(ctx, v.file, `${userId}/ride-eval/${stamp}/${entry.id}-${v.variant}${path.extname(v.file)}`)) }; }
        catch (err) { result = { status: 0, json: { error: String(err.message || err) } }; }
        if (/PerDay|quota/i.test(String(result.json?.error || ''))) {
          // Provider daily quota (free tier = 500 req/day/model) — stop instead of scoring outages as misses.
          console.error(`\nprovider quota exhausted: ${String(result.json.error).slice(0, 160)}`);
          process.exit(2);
        }
        fs.writeFileSync(out, JSON.stringify(result, null, 2));
        await sleep(Number(process.env.EVAL_CARRIDER_PACE_MS || 2000));
      } else process.stdout.write(`… ${entry.id} ${v.variant} (cached) `);
      const s = scoreStrict(expected, result.json || {}, meta, v.variant);
      docs.push({ id: entry.id, kind: entry.kind, variant: v.variant, bucket: bucketOf(meta, v.variant), http_status: result.status, ms: result.ms,
        ...s, actual: { document_kind: result.json?.document_kind, plate: result.json?.plate, make: result.json?.make, model: result.json?.model,
          tag_number: result.json?.tag_number, riders: result.json?.riders, authorized_pickups: result.json?.authorized_pickups, unreadable: result.json?.unreadable, confidence: result.json?.confidence } });
      console.log(`${(s.accuracy * 100).toFixed(0)}%${s.pass ? ' PASS' : ''}${s.counts.hallucinated ? ` hall=${s.counts.hallucinated}` : ''}${s.picked_wrong_car ? ' WRONG-CAR' : ''}`);
    }
  }
  const buckets = {};
  for (const d of docs) (buckets[d.bucket] ||= []).push(d);
  const summarize = (arr) => ({
    docs: arr.length,
    field_accuracy: +(arr.reduce((a, d) => a + d.accuracy, 0) / (arr.length || 1)).toFixed(3),
    doc_pass: arr.filter((d) => d.pass).length,
    plate_exact: `${arr.filter((d) => d.plate_exact === true).length}/${arr.filter((d) => d.plate_exact !== null).length}`,
    hallucinations: arr.reduce((a, d) => a + d.counts.hallucinated, 0),
    picked_wrong_car: arr.filter((d) => d.picked_wrong_car).length,
    o0_soft: arr.reduce((a, d) => a + d.counts.o0_soft, 0),
  });
  const score = { stamp, buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, summarize(v)])), overall: summarize(docs.filter((d) => d.bucket !== 'crop')), documents: docs };
  fs.writeFileSync(path.join(runDir, 'score-strict.json'), JSON.stringify(score, null, 2) + '\n');
  console.table(score.buckets);
  console.log('overall', score.overall, '\nscore', path.join(runDir, 'score-strict.json'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error('eval failed:', e.message || e); process.exit(1); });
