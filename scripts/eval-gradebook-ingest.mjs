#!/usr/bin/env node
/**
 * Live GB ingest evaluation against deployed ingest-grading-doc.
 *   node scripts/eval-gradebook-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest');

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  const out = { ...process.env };
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!out[m[1]]) out[m[1]] = v;
    }
  }
  return out;
}

function loadPersona(name) {
  const file = path.join(os.homedir(), '.kelyra', 'ui-personas.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = raw[name];
  if (!row?.handle || !row?.password) throw new Error(`persona ${name} missing`);
  return { handle: String(row.handle), password: String(row.password) };
}

function mimeFor(p) {
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function toDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeFor(filePath)};base64,${buf.toString('base64')}`;
}

function deepEqualish(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== typeof b) {
    if (typeof a === 'number' && typeof b === 'string' && Number(b) === a) return true;
    if (typeof b === 'number' && typeof a === 'string' && Number(a) === b) return true;
    return false;
  }
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqualish(x, b[i]));
  }
  for (const k of Object.keys(a)) {
    if (!(k in b) || !deepEqualish(a[k], b[k])) return false;
  }
  return true;
}

function categoriesMatch(exp, act) {
  if (!Array.isArray(exp) || !Array.isArray(act)) return false;
  if (exp.length !== act.length) return false;
  const normLabel = (c) =>
    String(c.label || c.name || c.category || c.key || '')
      .toLowerCase()
      .replace(/\b(grades?|work|assignments?)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const norm = (c) => ({
    label: normLabel(c),
    w: Number(c.weight_percent ?? c.weight ?? 0),
  });
  const e = exp.map(norm).sort((a, b) => a.label.localeCompare(b.label));
  const a = act.map(norm).sort((x, y) => x.label.localeCompare(y.label));
  return e.every((row, i) => {
    if (Math.abs(row.w - a[i].w) >= 0.51) return false;
    if (row.label === a[i].label) return true;
    // soft: one label contains the other after stripping noise
    return row.label.includes(a[i].label) || a[i].label.includes(row.label);
  });
}

function normalizeTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[—–−]/g, '-')
    .replace(/\bcourse\s+syllabus\b/g, ' ')
    .replace(/\bsyllabus\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titlesMatch(exp, act) {
  if (exp == null || act == null) return false;
  const e = normalizeTitle(exp);
  const a = normalizeTitle(act);
  if (!e || !a) return false;
  if (e === a) return true;
  if (e.includes(a) || a.includes(e)) return true;
  // first meaningful tokens
  const et = e.split(' ').filter(Boolean).slice(0, 3).join(' ');
  const at = a.split(' ').filter(Boolean).slice(0, 3).join(' ');
  return et && at && (et === at || et.includes(at) || at.includes(et));
}

/** Scorer change: treat nested band charts as equal to flat min/max/regular rows (H09). */
function flattenQpBands(value) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    if (Array.isArray(item.bands)) {
      for (const b of item.bands) {
        if (!b || typeof b !== 'object') continue;
        const pts = b.points_by_level && typeof b.points_by_level === 'object'
          ? b.points_by_level
          : b.points && typeof b.points === 'object'
            ? b.points
            : {};
        rows.push({
          min: Number(b.min_pct ?? b.min ?? 0),
          max: Number(b.max_pct ?? b.max ?? 0),
          regular: Number(pts.Regular ?? pts.regular ?? b.regular ?? 0),
          honors: Number(pts.Honors ?? pts.honors ?? b.honors ?? 0),
          ap: Number(pts.AP ?? pts.ap ?? b.ap ?? 0),
        });
      }
      continue;
    }
    const pts =
      item.points_by_level && typeof item.points_by_level === 'object'
        ? item.points_by_level
        : item.points && typeof item.points === 'object'
          ? item.points
          : {};
    rows.push({
      min: Number(item.min_pct ?? item.min ?? 0),
      max: Number(item.max_pct ?? item.max ?? 0),
      regular: Number(item.regular ?? pts.Regular ?? pts.regular ?? 0),
      honors: Number(item.honors ?? pts.Honors ?? pts.honors ?? 0),
      ap: Number(item.ap ?? pts.AP ?? pts.ap ?? 0),
    });
  }
  return rows.length ? rows : null;
}

function qpTablesMatch(exp, act) {
  const e = flattenQpBands(exp);
  const a = flattenQpBands(act);
  if (!e || !a) return deepEqualish(exp, act);
  if (e.length !== a.length) {
    // allow partial chart if actual covers expected mins
    const ok = e.every((er) =>
      a.some(
        (ar) =>
          Math.abs(ar.min - er.min) < 0.51 &&
          Math.abs(ar.max - er.max) < 0.51 &&
          Math.abs(ar.regular - er.regular) < 0.15,
      ),
    );
    return ok;
  }
  const sort = (rows) => [...rows].sort((x, y) => x.min - y.min);
  const ee = sort(e);
  const aa = sort(a);
  return ee.every(
    (er, i) =>
      Math.abs(aa[i].min - er.min) < 0.51 &&
      Math.abs(aa[i].max - er.max) < 0.51 &&
      Math.abs(aa[i].regular - er.regular) < 0.15 &&
      Math.abs(aa[i].honors - er.honors) < 0.15 &&
      Math.abs(aa[i].ap - er.ap) < 0.15,
  );
}

function lateRuleMatch(exp, act) {
  if (deepEqualish(exp, act)) return true;
  if (exp && typeof exp === 'object' && act && typeof act === 'object') {
    const expFloor = exp.floor_pct ?? exp.floor;
    const actFloor = act.floor_pct ?? act.floor;
    // floor-only late rules (S05): type "floor" vs {floor_pct:N}
    if (
      expFloor != null &&
      actFloor != null &&
      Math.abs(Number(expFloor) - Number(actFloor)) < 0.51 &&
      (exp.type == null ||
        exp.type === 'floor' ||
        exp.type === 'none' ||
        act.type == null ||
        act.type === exp.type ||
        act.type === 'none')
    ) {
      return true;
    }
    if (exp.type && act.type === exp.type) {
      if (exp.amount == null || act.amount == null) return true;
      return Math.abs(Number(exp.amount) - Number(act.amount)) < 0.51;
    }
  }
  // string actual vs object expected — scorer change: coerce-ish
  if (exp && typeof exp === 'object' && typeof act === 'string') {
    const s = act.toLowerCase();
    if (exp.type === 'none' && /not|none|no late|hard/.test(s)) return true;
    if (exp.type === 'per_day' && /per\s*day/.test(s)) {
      if (exp.amount == null) return true;
      const m = s.match(/(\d+(?:\.\d+)?)/);
      return m ? Math.abs(Number(m[1]) - Number(exp.amount)) < 0.51 : true;
    }
  }
  return false;
}

function scaleBandsMatch(exp, act) {
  if (!Array.isArray(exp) || !Array.isArray(act)) return deepEqualish(exp, act);
  if (exp.length !== act.length) return false;
  const norm = (b) => ({
    letter: String(b.letter || b.grade || '').toUpperCase(),
    min: Number(b.min ?? b.min_pct ?? b.low ?? 0),
    max: Number(b.max ?? b.max_pct ?? b.high ?? 0),
  });
  const e = exp.map(norm).sort((a, b) => a.min - b.min);
  const a = act.map(norm).sort((x, y) => x.min - y.min);
  return e.every(
    (row, i) =>
      row.letter === a[i].letter &&
      Math.abs(row.min - a[i].min) < 0.51 &&
      Math.abs(row.max - a[i].max) < 0.51,
  );
}

function scoreField(expField, actFields) {
  const act = actFields.find((f) => f.path === expField.path);
  if (!act) {
    if (expField.value == null && expField.status === 'unknown') {
      return { path: expField.path, verdict: 'correctly-flagged-for-review' };
    }
    return { path: expField.path, verdict: 'missing' };
  }
  if (expField.path === 'syllabus.categories') {
    return categoriesMatch(expField.value, act.value)
      ? { path: expField.path, verdict: 'correct' }
      : { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
  }
  if (expField.path === 'qp.tables') {
    return qpTablesMatch(expField.value, act.value)
      ? { path: expField.path, verdict: 'correct', detail: 'qp-shape-equiv' }
      : { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
  }
  if (expField.path === 'qp.method') {
    const norm = (v) => {
      const s = String(v || '').toLowerCase();
      if (s === 'band' || s === 'bands' || s === 'numeric') return 'numeric_band';
      return s;
    };
    if (norm(expField.value) === norm(act.value)) {
      return { path: expField.path, verdict: 'correct', detail: 'qp-method-alias' };
    }
  }
  if (expField.path === 'syllabus.late_rule' || expField.path === 'late_rule') {
    return lateRuleMatch(expField.value, act.value)
      ? { path: expField.path, verdict: 'correct' }
      : { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
  }
  if (expField.path === 'scale.bands') {
    return scaleBandsMatch(expField.value, act.value)
      ? { path: expField.path, verdict: 'correct', detail: 'scale-bands-soft' }
      : { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
  }
  if (expField.path === 'syllabus.missing_rule') {
    const expT =
      expField.value && typeof expField.value === 'object'
        ? expField.value.type ?? expField.value
        : expField.value;
    const actT =
      act.value && typeof act.value === 'object' ? act.value.type ?? act.value : act.value;
    if (String(expT) === String(actT)) {
      return { path: expField.path, verdict: 'correct', detail: 'missing-rule-type' };
    }
  }
  if (expField.path === 'levels.list') {
    const ok = Array.isArray(act.value) && Array.isArray(expField.value)
      ? act.value.length >= Math.min(2, expField.value.length)
      : deepEqualish(expField.value, act.value);
    return ok
      ? { path: expField.path, verdict: 'correct' }
      : { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
  }
  if (expField.path === 'syllabus.title' || expField.path === 'title') {
    if (titlesMatch(expField.value, act.value)) {
      return { path: expField.path, verdict: 'correct', detail: 'title-soft' };
    }
  }
  if (expField.path === 'gpa.include') {
    const exp = expField.value && typeof expField.value === 'object' ? expField.value : null;
    const actV = act.value && typeof act.value === 'object' ? act.value : null;
    if (exp && actV) {
      const expPre = exp.pre_9 ?? exp.pre9;
      const actPre = actV.pre_9 ?? actV.pre9;
      if (
        (exp.recovery == null || Boolean(exp.recovery) === Boolean(actV.recovery)) &&
        (expPre == null || Boolean(expPre) === Boolean(actPre))
      ) {
        return { path: expField.path, verdict: 'correct', detail: 'gpa-include-soft' };
      }
    }
  }
  if (expField.path === 'gpa.repeat') {
    const expP =
      expField.value && typeof expField.value === 'object'
        ? expField.value.policy ?? expField.value
        : expField.value;
    const actP =
      act.value && typeof act.value === 'object' ? act.value.policy ?? act.value : act.value;
    if (String(expP || '').toLowerCase() === String(actP || '').toLowerCase()) {
      return { path: expField.path, verdict: 'correct', detail: 'gpa-repeat-soft' };
    }
  }
  if (expField.path === 'credit.year_link') {
    const normY = (v) => {
      if (v === true || v === 1) return true;
      if (v === false || v === 0) return false;
      const s = String(v || '').toLowerCase();
      if (/true|yes|pair|required|both/.test(s)) return true;
      if (/false|no|independent|separate/.test(s)) return false;
      return v;
    };
    if (normY(expField.value) === normY(act.value)) {
      return { path: expField.path, verdict: 'correct', detail: 'year-link-soft' };
    }
  }
  if (expField.status === 'unknown' || expField.value == null) {
    if (act.status === 'unknown' || act.value == null || act.status === 'needs_review') {
      return { path: expField.path, verdict: 'correctly-flagged-for-review' };
    }
    return { path: expField.path, verdict: 'wrong', detail: 'should be unknown/review' };
  }
  if (deepEqualish(expField.value, act.value)) return { path: expField.path, verdict: 'correct' };
  if (typeof expField.value === 'object' && act.value && typeof act.value === 'object') {
    if (expField.value.type && act.value.type === expField.value.type) {
      return { path: expField.path, verdict: 'correct', detail: 'type-match' };
    }
  }
  if (
    typeof expField.value === 'string' &&
    typeof act.value === 'string' &&
    act.value.toLowerCase().includes(String(expField.value).toLowerCase().slice(0, 12))
  ) {
    return { path: expField.path, verdict: 'correct', detail: 'soft' };
  }
  return { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
}

function scoreProposal(expected, actual, meta = {}) {
  const results = [];
  const actFields = Array.isArray(actual?.fields) ? actual.fields : [];
  const expFields = Array.isArray(expected?.fields) ? expected.fields : [];

  if (meta.expect_empty || meta.negative) {
    const filled = actFields.filter((f) => f.value != null && f.status !== 'unknown');
    const hasBlock =
      (actual?.warnings || []).some((w) => w.severity === 'block') ||
      (actual?.ambiguities || []).length > 0 ||
      (actual?.overall_confidence ?? 1) < 0.45;
    if (filled.length === 0 || (meta.expect_empty_or_flag && hasBlock)) {
      results.push({ path: '*', verdict: 'correct', detail: 'negative handled' });
    } else if (filled.length > 0) {
      results.push({ path: '*', verdict: 'hallucinated', detail: `filled ${filled.length}` });
    } else {
      results.push({ path: '*', verdict: 'correct' });
    }
    return results;
  }

  for (const ef of expFields) results.push(scoreField(ef, actFields));

  const expPaths = new Set(expFields.map((f) => f.path));
  // Companion fields derived from expected parents are not hallucinations
  const companions = new Set();
  for (const ef of expFields) {
    if (ef.path === 'calendar.template') companions.add('calendar.period_model');
    if (ef.path === 'levels.list') companions.add('gpa.mode');
    if (ef.path === 'qp.tables') companions.add('qp.method');
    if (ef.path === 'qp.method') companions.add('qp.tables');
    if (ef.path === 'rollup.preset') companions.add('rollup.custom_weights');
  }
  for (const af of actFields) {
    if (!expPaths.has(af.path) && companions.has(af.path)) continue;
    if (!expPaths.has(af.path) && af.value != null && af.confidence >= 0.8) {
      if (af.path === 'syllabus.title' || af.path === 'school.notes') continue;
      // Real-photo soft GT: extra on-page fields are not hallucinations
      if (meta.soft_match || meta.real_photo) continue;
      results.push({ path: af.path, verdict: 'hallucinated', actual: af.value });
    }
  }

  if (meta.no_renormalize && meta.weights_sum && meta.weights_sum !== 100) {
    const cats = actFields.find((f) => f.path === 'syllabus.categories');
    if (cats && Array.isArray(cats.value)) {
      const sum = cats.value.reduce((s, c) => s + Number(c.weight_percent ?? c.weight ?? 0), 0);
      if (Math.abs(sum - 100) < 0.5 && Math.abs(sum - meta.weights_sum) > 0.5) {
        results.push({
          path: 'syllabus.categories',
          verdict: 'wrong',
          detail: `silent renormalize to 100 from ${meta.weights_sum}`,
          rule_violation: 'FR-AI-21',
        });
      } else if (Math.abs(sum - meta.weights_sum) < 1) {
        results.push({ path: 'rule.no_renormalize', verdict: 'correct' });
      }
    }
  }

  if (meta.numeric_chart) {
    const qp = actFields.find((f) => f.path === 'qp.tables' || f.path === 'qp.method');
    if (qp && (qp.path === 'qp.tables' || qp.value === 'numeric_band')) {
      results.push({ path: 'rule.numeric_chart', verdict: 'correct' });
    } else {
      results.push({ path: 'qp.tables', verdict: 'missing', rule_violation: 'FR-AI-24#6' });
    }
  }

  return results;
}

function summarize(rows) {
  const counts = {
    correct: 0,
    wrong: 0,
    missing: 0,
    'correctly-flagged-for-review': 0,
    hallucinated: 0,
  };
  for (const r of rows) {
    if (counts[r.verdict] != null) counts[r.verdict] += 1;
  }
  const scored = Object.values(counts).reduce((a, b) => a + b, 0);
  const good = counts.correct + counts['correctly-flagged-for-review'];
  return { counts, scored, accuracy: scored ? good / scored : 0 };
}

// auth + main
async function signIn(env, personaName) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY');
  const persona = loadPersona(personaName);
  // Prefer product handle sign-in (same as ui-persona-session.mjs)
  const handleRes = await fetch(`${url.replace(/\/$/, '')}/functions/v1/sign-in-handle`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handle: persona.handle, password: persona.password }),
  });
  const handlePayload = await handleRes.json().catch(() => null);
  if (handleRes.ok && handlePayload?.access_token) {
    const sb = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${handlePayload.access_token}` } },
    });
    await sb.auth.setSession({
      access_token: handlePayload.access_token,
      refresh_token: handlePayload.refresh_token,
    });
    return {
      sb,
      session: {
        access_token: handlePayload.access_token,
        refresh_token: handlePayload.refresh_token,
      },
      url,
      anon,
    };
  }
  // Fallback email password (office may already be email)
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = persona.handle.includes('@')
    ? persona.handle
    : `${persona.handle}@users.kelyra.local`;
  let { data, error } = await sb.auth.signInWithPassword({ email, password: persona.password });
  if (error) {
    ({ data, error } = await sb.auth.signInWithPassword({
      email: persona.handle,
      password: persona.password,
    }));
  }
  if (error || !data.session) throw new Error(`sign-in failed for persona ${personaName}`);
  return { sb, session: data.session, url, anon };
}

async function resolveIds(sb, kind) {
  if (kind === 'school_policy') {
    const { data: schoolId, error } = await sb.rpc('my_school_id');
    if (error || !schoolId) throw new Error('my_school_id failed for office');
    return { school_id: schoolId };
  }
  const { data: user } = await sb.auth.getUser();
  const uid = user?.user?.id;
  const { data: rows, error } = await sb
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', uid)
    .limit(1);
  if (error || !rows?.length) throw new Error('no class_teachers row for teacher');
  return { class_id: rows[0].class_id };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isQuotaExhausted(result) {
  const proposal = result?.json?.proposal || result?.json;
  const blob = JSON.stringify({
    status: result?.status,
    error: result?.json?.error,
    warnings: proposal?.warnings,
    message: result?.json?.message,
  });
  return /429|RESOURCE_EXHAUSTED|Quota exceeded|rate.?limit/i.test(blob);
}

async function invokeIngestOnce({ url, anon, session, kind, ids, imageUrl, sourceId }) {
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/ingest-grading-doc`;
  const body = {
    kind,
    source_id: sourceId,
    image_urls: [imageUrl],
    storage_paths: [],
    ...(kind === 'syllabus' ? { class_id: ids.class_id } : { school_id: ids.school_id }),
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { error: 'non-json', raw: text.slice(0, 400), status: res.status };
  }
  return { status: res.status, json };
}

/** Live Gemini free-tier is ~15 RPM; handwriting can be multi-call. Pace + retry 429. */
async function invokeIngest(args) {
  const maxAttempts = Number(process.env.EVAL_INGEST_MAX_ATTEMPTS || 6);
  const paceMs = Number(process.env.EVAL_INGEST_PACE_MS || 9000);
  const baseBackoffMs = Number(process.env.EVAL_INGEST_BACKOFF_MS || 55000);
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      last = await invokeIngestOnce(args);
    } catch (err) {
      last = { status: 0, json: { error: String(err.message || err) } };
    }
    if (!isQuotaExhausted(last)) {
      if (paceMs > 0) await sleep(paceMs);
      return last;
    }
    if (attempt >= maxAttempts) break;
    const wait = baseBackoffMs * attempt;
    process.stdout.write(`(429 retry ${attempt}/${maxAttempts} wait ${Math.round(wait / 1000)}s) `);
    await sleep(wait);
  }
  if (paceMs > 0) await sleep(paceMs);
  return last;
}

function pickImage(caseDir, preferPhoto) {
  const photo = path.join(caseDir, 'photo.jpg');
  const clean = path.join(caseDir, 'clean.png');
  if (preferPhoto && fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  if (fs.existsSync(clean)) return { file: clean, variant: 'clean' };
  if (fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  return null;
}

async function main() {
  const env = loadEnv();
  const stamp =
    (process.env.EVAL_RESUME_STAMP || '').trim() ||
    new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const runDir = path.join(CORPUS, 'runs', stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const resume = Boolean((process.env.EVAL_RESUME_STAMP || '').trim());
  if (resume) console.log('resume mode', stamp);

  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
  const teacher = await signIn(env, 'teacher');
  const office = await signIn(env, 'office');
  const teacherIds = await resolveIds(teacher.sb, 'syllabus');
  const officeIds = await resolveIds(office.sb, 'school_policy');

  console.log('run', stamp, 'cases', manifest.cases.length);
  fs.writeFileSync(
    path.join(runDir, 'context.json'),
    JSON.stringify(
      {
        stamp,
        teacher_class_id: teacherIds.class_id,
        office_school_id: officeIds.school_id,
        case_count: manifest.cases.length,
      },
      null,
      2,
    ),
  );

  const perDoc = [];
  const allFieldRows = [];

  for (const entry of manifest.cases) {
    const caseDir = path.join(CORPUS, entry.id);
    const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
    let meta = {};
    const metaPath = path.join(caseDir, 'eval-meta.json');
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const kind = entry.kind === 'handbook' ? 'school_policy' : 'syllabus';
    const auth = kind === 'school_policy' ? office : teacher;
    const ids = kind === 'school_policy' ? officeIds : teacherIds;

    const variants = [];
    const clean = pickImage(caseDir, false);
    if (clean) variants.push(clean);
    const photo = pickImage(caseDir, true);
    if (photo && photo.file !== clean?.file) variants.push(photo);
    if (!variants.length) {
      console.warn('skip no image', entry.id);
      continue;
    }

    for (const v of variants) {
      const sourceId = `${entry.id}-${v.variant}-${stamp}`;
      const outPath = path.join(runDir, `${entry.id}__${v.variant}.json`);
      let result;
      const existingOk =
        resume &&
        fs.existsSync(outPath) &&
        (() => {
          try {
            const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
            // Re-fetch quota empties and incomplete kills (0-byte / missing proposal).
            if (isQuotaExhausted(prev)) return false;
            const prop = prev.json?.proposal || prev.json;
            if (!prop || typeof prop !== 'object') return false;
            // Keep real results (including legitimate empty negatives).
            return true;
          } catch {
            return false;
          }
        })();
      if (existingOk) {
        process.stdout.write(`… ${entry.id} ${v.variant} (cached) `);
        result = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      } else {
        process.stdout.write(`… ${entry.id} ${v.variant} `);
        try {
          result = await invokeIngest({
            url: auth.url,
            anon: auth.anon,
            session: auth.session,
            kind,
            ids,
            imageUrl: toDataUrl(v.file),
            sourceId,
          });
        } catch (err) {
          result = { status: 0, json: { error: String(err.message || err) } };
        }
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      }
      const proposal = result.json?.proposal || result.json;
      const fieldScores = scoreProposal(expected, proposal, meta);
      const sum = summarize(fieldScores);
      allFieldRows.push(...fieldScores.map((r) => ({ ...r, doc: entry.id, variant: v.variant })));
      perDoc.push({
        id: entry.id,
        kind: entry.kind,
        variant: v.variant,
        http_status: result.status,
        overall_confidence: proposal?.overall_confidence ?? null,
        field_accuracy: sum.accuracy,
        counts: sum.counts,
        fields: fieldScores,
        rule_violations: fieldScores.filter((f) => f.rule_violation).map((f) => f.rule_violation),
      });
      console.log((sum.accuracy * 100).toFixed(0) + '%');
    }
  }

  const avg = (rows) =>
    rows.length ? rows.reduce((s, r) => s + r.field_accuracy, 0) / rows.length : 0;
  const score = {
    stamp,
    overall_accuracy: avg(perDoc),
    syllabus_accuracy: avg(perDoc.filter((d) => d.kind === 'syllabus')),
    handbook_accuracy: avg(perDoc.filter((d) => d.kind === 'handbook')),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    documents: perDoc,
    field_totals: summarize(allFieldRows).counts,
    s11_19: perDoc.find((d) => d.id === 'S01' && d.variant === 'clean') || null,
    s11_20: perDoc.find((d) => d.id === 'H01' && d.variant === 'clean') || null,
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'syl',
    (score.syllabus_accuracy * 100).toFixed(1) + '%',
    'hb',
    (score.handbook_accuracy * 100).toFixed(1) + '%',
  );
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});

