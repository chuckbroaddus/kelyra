#!/usr/bin/env node
/**
 * Live GB ingest evaluation against deployed ingest-grading-doc.
 *   node scripts/eval-gradebook-ingest.mjs
 *   EVAL_ONLY=P01,C02 node scripts/eval-gradebook-ingest.mjs   # subset
 *   EVAL_SKIP_ROUGH=1 …                                       # original clean/photo corpus only
 *
 * Rough cases (eval-meta.rough; P01–P05, C01–C02, A01, N04 — scripts/lib/gradebook-rough-cases.mjs):
 * sends clean.png (same-content control, full GT) AND rough.jpg (scored against eval-meta.rough_gt:
 * absent paths must not be filled, uncertain paths may be flagged). Buckets clean vs rough in score.json.
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
    // Product LateRule has no hard_deadline type — maps to none (+ optional hard_deadline_days)
    const expT = exp.type === 'hard_deadline' || exp.type === 'not_accepted' ? 'none' : exp.type;
    const actT = act.type === 'hard_deadline' || act.type === 'not_accepted' ? 'none' : act.type;
    if (
      (expT === 'none' || expT === 'hard_deadline') &&
      (actT === 'none' || actT === 'hard_deadline') &&
      (expFloor == null || actFloor == null || Math.abs(Number(expFloor) - Number(actFloor)) < 0.51)
    ) {
      return true;
    }
    // floor-only late rules (S05): type "floor" vs {floor_pct:N}
    if (
      expFloor != null &&
      actFloor != null &&
      Math.abs(Number(expFloor) - Number(actFloor)) < 0.51 &&
      (expT == null ||
        expT === 'floor' ||
        expT === 'none' ||
        actT == null ||
        actT === expT ||
        actT === 'none')
    ) {
      return true;
    }
    if (expT && actT === expT) {
      if (exp.amount == null || act.amount == null) return true;
      return Math.abs(Number(exp.amount) - Number(act.amount)) < 0.51;
    }
  }
  // string actual vs object expected — scorer change: coerce-ish
  if (exp && typeof exp === 'object' && typeof act === 'string') {
    const s = act.toLowerCase();
    if (
      (exp.type === 'none' || exp.type === 'hard_deadline' || exp.type === 'not_accepted') &&
      /not|none|no late|hard/.test(s)
    ) {
      return true;
    }
    if (exp.type === 'per_day' && /per\s*day/.test(s)) {
      if (exp.amount == null) return true;
      const m = s.match(/(\d+(?:\.\d+)?)/);
      return m ? Math.abs(Number(m[1]) - Number(exp.amount)) < 0.51 : true;
    }
  }
  return false;
}

function retakeMatch(exp, act) {
  if (deepEqualish(exp, act)) return true;
  if (!exp || typeof exp !== 'object' || !act || typeof act !== 'object') return false;
  const normMethod = (m) => {
    const s = String(m || '').toLowerCase();
    if (s === 'keep_highest' || s === 'highest' || s === 'max' || s === 'higher') return 'higher_of';
    if (s === 'overwrite') return 'replace';
    return s;
  };
  const em = normMethod(exp.method);
  const am = normMethod(act.method);
  if (em && am && em !== am) return false;
  if (exp.cap != null && act.cap != null && Math.abs(Number(exp.cap) - Number(act.cap)) > 0.51) {
    return false;
  }
  if (exp.attempts != null && act.attempts != null && Number(exp.attempts) !== Number(act.attempts)) {
    return false;
  }
  return em ? em === am : true;
}

function gpaRankMatch(exp, act) {
  if (deepEqualish(exp, act)) return true;
  if (!exp || typeof exp !== 'object' || !act || typeof act !== 'object') return false;
  const e = String(exp.uses ?? exp.method ?? exp.profile ?? '').toLowerCase();
  const a = String(act.uses ?? act.method ?? act.profile ?? '').toLowerCase();
  if (!e || !a) return false;
  if (e === a) return true;
  if ((e === 'weighted' || e === 'weighted_gpa') && (a === 'weighted' || a === 'weighted_gpa')) {
    return true;
  }
  if (
    (e === 'unweighted' || e === 'unweighted_gpa') &&
    (a === 'unweighted' || a === 'unweighted_gpa')
  ) {
    return true;
  }
  return false;
}

function gpaIncludeMatch(exp, act) {
  if (deepEqualish(exp, act)) return true;
  if (!exp || typeof exp !== 'object' || !act || typeof act !== 'object') return false;
  const keys = new Set([...Object.keys(exp), ...Object.keys(act)]);
  for (const k of keys) {
    if (!(k in exp) || exp[k] == null) continue;
    const ek = k === 'pre9' ? 'pre_9' : k;
    const actKey = k in act ? k : ek in act ? ek : k === 'pre_9' && 'pre9' in act ? 'pre9' : null;
    if (actKey == null) continue; // extra expected keys ok if soft partial
    if (Boolean(exp[k]) !== Boolean(act[actKey])) return false;
  }
  // At least one overlapping exclusion key must match when expected has exclusions
  const expFalse = Object.entries(exp).filter(([, v]) => v === false).map(([k]) => k);
  if (!expFalse.length) return true;
  return expFalse.some((k) => {
    const actKey = k in act ? k : k === 'pre_9' && 'pre9' in act ? 'pre9' : k;
    return act[actKey] === false;
  });
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
  if (expField.path === 'syllabus.retake') {
    return retakeMatch(expField.value, act.value)
      ? { path: expField.path, verdict: 'correct', detail: 'retake-soft' }
      : { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
  }
  if (expField.path === 'gpa.rank') {
    return gpaRankMatch(expField.value, act.value)
      ? { path: expField.path, verdict: 'correct', detail: 'gpa-rank-soft' }
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
    // floor with floor=0 is equivalent to zero
    const actFloor =
      act.value && typeof act.value === 'object'
        ? act.value.floor ?? act.value.floor_pct
        : null;
    if (
      (String(expT) === 'zero' || expT === 0) &&
      (String(actT) === 'floor' || String(actT) === 'zero') &&
      (actFloor == null || Number(actFloor) === 0)
    ) {
      return { path: expField.path, verdict: 'correct', detail: 'missing-zero-equiv' };
    }
    if (String(expT) === 'floor' && String(actT) === 'floor') {
      const expFloor =
        expField.value && typeof expField.value === 'object'
          ? expField.value.floor ?? expField.value.floor_pct
          : null;
      if (
        expFloor != null &&
        actFloor != null &&
        Math.abs(Number(expFloor) - Number(actFloor)) < 0.51
      ) {
        return { path: expField.path, verdict: 'correct', detail: 'missing-floor' };
      }
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
    if (gpaIncludeMatch(expField.value, act.value)) {
      return { path: expField.path, verdict: 'correct', detail: 'gpa-include-soft' };
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
  if (
    (expField.path === 'syllabus.narrative' || expField.path === 'school.notes') &&
    typeof expField.value === 'string' &&
    typeof act.value === 'string'
  ) {
    const e = expField.value.toLowerCase();
    const a = act.value.toLowerCase();
    const tokens = e.split(/[^a-z0-9]+/).filter((t) => t.length >= 4).slice(0, 4);
    if (tokens.length && tokens.filter((t) => a.includes(t)).length >= Math.min(2, tokens.length)) {
      return { path: expField.path, verdict: 'correct', detail: 'notes-soft' };
    }
  }
  return { path: expField.path, verdict: 'wrong', expected: expField.value, actual: act.value };
}

const FLAG_STATUSES = new Set(['needs_review', 'unknown', 'conflict']);
const isFlagged = (act) => !act || act.value == null || FLAG_STATUSES.has(act.status) || Number(act.confidence ?? 1) < 0.6;

/** Honest GT for degraded images: rough_gt[path] = absent | uncertain (rough variant only). */
function scoreFieldRough(expField, actFields, roughGt) {
  const mode = roughGt?.[expField.path];
  if (!mode) return scoreField(expField, actFields);
  const act = actFields.find((f) => f.path === expField.path);
  if (mode === 'absent') {
    if (!act || act.value == null || act.status === 'unknown') {
      return { path: expField.path, verdict: 'correctly-flagged-for-review', detail: 'absent-left-empty' };
    }
    // Any value for a field that is not legible in the photo is invented, even when flagged.
    return {
      path: expField.path,
      verdict: 'hallucinated',
      detail: `absent-but-filled (${act.status ?? 'proposed'}, conf ${act.confidence ?? '?'})`,
      actual: act.value,
      flagged: isFlagged(act),
    };
  }
  const r = scoreField(expField, actFields);
  if (r.verdict === 'missing') return { ...r, verdict: 'correctly-flagged-for-review', detail: 'uncertain-left-empty' };
  if (r.verdict === 'wrong' && isFlagged(act)) return { ...r, verdict: 'correctly-flagged-for-review', detail: 'uncertain-wrong-but-flagged' };
  return r;
}

function staleCheck(meta, actFields) {
  const sp = meta.stale_printed;
  if (!sp) return [];
  const out = [];
  const cats = actFields.find((f) => f.path === 'syllabus.categories');
  if (sp['syllabus.categories'] && Array.isArray(cats?.value)) {
    for (const [label, w] of Object.entries(sp['syllabus.categories'])) {
      const hit = cats.value.find((c) => String(c.label || c.key || '').toLowerCase().includes(label.toLowerCase()) && Math.abs(Number(c.weight_percent ?? c.weight) - w) < 0.51);
      if (hit) out.push(`${label} ${w}% (printed, crossed out)`);
    }
  }
  const late = actFields.find((f) => f.path === 'syllabus.late_rule');
  if (sp['syllabus.late_rule'] && late?.value && typeof late.value === 'object') {
    if (Math.abs(Number(late.value.amount) - sp['syllabus.late_rule'].amount) < 0.51) out.push(`late ${sp['syllabus.late_rule'].amount} (printed, crossed out)`);
  }
  return out;
}

function scoreProposal(expected, actual, meta = {}, variant = 'clean') {
  const results = [];
  const roughGt = variant === 'rough' ? meta.rough_gt || {} : null;
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

  for (const ef of expFields) results.push(roughGt ? scoreFieldRough(ef, actFields, roughGt) : scoreField(ef, actFields));

  const expPaths = new Set(expFields.map((f) => f.path));
  // Companion fields derived from expected parents are not hallucinations
  const companions = new Set(meta.companions || []);
  for (const ef of expFields) {
    if (ef.path === 'calendar.template') {
      companions.add('calendar.period_model');
      companions.add('credit.policy');
      companions.add('credit.unit');
    }
    if (ef.path === 'calendar.period_model') {
      companions.add('calendar.template');
      companions.add('credit.policy');
    }
    if (ef.path === 'levels.list') companions.add('gpa.mode');
    if (ef.path === 'qp.tables') companions.add('qp.method');
    if (ef.path === 'qp.method') companions.add('qp.tables');
    if (ef.path === 'rollup.preset') {
      companions.add('rollup.custom_weights');
      companions.add('rollup.exam_enabled');
    }
    if (ef.path === 'scale.bands') companions.add('scale.passing_pct');
    if (ef.path === 'credit.passing_threshold') companions.add('scale.passing_pct');
  }
  for (const af of actFields) {
    if (!expPaths.has(af.path) && companions.has(af.path)) continue;
    if (!expPaths.has(af.path) && af.value != null && af.confidence >= 0.8) {
      if (af.path === 'syllabus.title' || af.path === 'school.notes' || af.path === 'syllabus.narrative') {
        continue;
      }
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

function isTransientModelFailure(result) {
  const proposal = result?.json?.proposal || result?.json;
  const blob = JSON.stringify({
    status: result?.status,
    error: result?.json?.error,
    warnings: proposal?.warnings,
    message: result?.json?.message,
  });
  if (/503|UNAVAILABLE|high demand|overloaded|Gemini failed/i.test(blob)) return true;
  const fields = Array.isArray(proposal?.fields) ? proposal.fields : [];
  const filled = fields.filter((f) => f.value != null && f.value !== '').length;
  if (filled === 0 && /low_ocr|503|UNAVAILABLE/i.test(blob)) return true;
  return false;
}

async function invokeIngestOnce({ url, anon, session, kind, ids, imageUrl, imageUrls, sourceId }) {
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/ingest-grading-doc`;
  const urls = Array.isArray(imageUrls) && imageUrls.length
    ? imageUrls
    : imageUrl
      ? [imageUrl]
      : [];
  const body = {
    kind,
    source_id: sourceId,
    image_urls: urls,
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

class QuotaStop extends Error {
  constructor(result) {
    super('model quota exhausted (429 RESOURCE_EXHAUSTED)');
    this.result = result;
  }
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
    if (!isQuotaExhausted(last) && !isTransientModelFailure(last)) {
      if (paceMs > 0) await sleep(paceMs);
      return last;
    }
    // Daily quota (429 RESOURCE_EXHAUSTED) will not clear in minutes: stop instead of spinning.
    if (isQuotaExhausted(last) && process.env.EVAL_RETRY_QUOTA !== '1') throw new QuotaStop(last);
    if (attempt >= maxAttempts) break;
    const wait = baseBackoffMs * attempt;
    const kindLabel = isQuotaExhausted(last) ? '429' : '503';
    process.stdout.write(`(${kindLabel} retry ${attempt}/${maxAttempts} wait ${Math.round(wait / 1000)}s) `);
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

/** Multi-page cases list ordered page files in eval-meta.json.pages. */
function pickMultiPageVariant(caseDir, meta) {
  if (!meta?.multi_page || !Array.isArray(meta.pages) || !meta.pages.length) return null;
  const files = [];
  for (const name of meta.pages) {
    const full = path.join(caseDir, name);
    if (!fs.existsSync(full)) return null;
    files.push(full);
  }
  return { files, variant: `pages-${files.length}` };
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

  const only = (process.env.EVAL_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const entry of manifest.cases) {
    if (only.length && !only.includes(entry.id)) continue;
    if (process.env.EVAL_SKIP_ROUGH === '1' && entry.rough) continue;
    const caseDir = path.join(CORPUS, entry.id);
    const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
    let meta = {};
    const metaPath = path.join(caseDir, 'eval-meta.json');
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const kind = entry.kind === 'handbook' ? 'school_policy' : 'syllabus';
    const auth = kind === 'school_policy' ? office : teacher;
    const ids = kind === 'school_policy' ? officeIds : teacherIds;

    const variants = [];
    const multi = pickMultiPageVariant(caseDir, meta);
    if (multi) {
      variants.push(multi);
    } else {
      const clean = pickImage(caseDir, false);
      if (clean) variants.push(clean);
      const photo = pickImage(caseDir, true);
      if (photo && photo.file !== clean?.file) variants.push(photo);
      if (meta.rough) {
        const rough = path.join(caseDir, 'rough.jpg');
        if (fs.existsSync(rough)) variants.push({ file: rough, variant: 'rough' });
        else console.warn('rough.jpg missing (run scripts/degrade-gradebook-fixtures.mjs)', entry.id);
      }
    }
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
            if (isQuotaExhausted(prev) || isTransientModelFailure(prev)) return false;
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
          const imageUrls = Array.isArray(v.files)
            ? v.files.map((f) => toDataUrl(f))
            : [toDataUrl(v.file)];
          result = await invokeIngest({
            url: auth.url,
            anon: auth.anon,
            session: auth.session,
            kind,
            ids,
            imageUrls,
            sourceId,
          });
        } catch (err) {
          if (err instanceof QuotaStop) {
            console.log('\nSTOP: model quota exhausted — nothing scored or cached for', entry.id, v.variant);
            console.log(`Resume later (cached good responses are reused):\n  EVAL_RESUME_STAMP=${stamp} node scripts/eval-gradebook-ingest.mjs`);
            process.exit(3);
          }
          result = { status: 0, json: { error: String(err.message || err) } };
        }
        // Never cache error / quota / transient responses — a resume must re-fetch them.
        const proposalNow = result.json?.proposal || result.json;
        const isError = !result.status || result.status >= 400 || !proposalNow || typeof proposalNow !== 'object' || result.json?.error;
        if (isQuotaExhausted(result)) {
          console.log('\nSTOP: model quota exhausted for', entry.id, v.variant, '— not scored, not cached.');
          console.log(`Resume later:\n  EVAL_RESUME_STAMP=${stamp} node scripts/eval-gradebook-ingest.mjs`);
          process.exit(3);
        }
        if (isTransientModelFailure(result) || isError) {
          fs.writeFileSync(outPath.replace(/\.json$/, '.error.json'), JSON.stringify(result, null, 2));
        } else {
          fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        }
      }
      const proposal = result.json?.proposal || result.json;
      const fieldScores = scoreProposal(expected, proposal, meta, v.variant);
      const stale = v.variant === 'clean' && !meta.rough ? [] : staleCheck(meta, Array.isArray(proposal?.fields) ? proposal.fields : []);
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
        rough_case: Boolean(meta.rough),
        rough_kind: meta.rough_kind || null,
        stale_printed: stale,
        warnings: (proposal?.warnings || []).map((w) => `${w.severity}:${w.code}`),
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
    buckets: bucketize(perDoc),
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  printBuckets(score.buckets);
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

const KEY_GROUPS = {
  weights: ['syllabus.categories'],
  scale: ['scale.bands', 'scale.passing_pct'],
  late_missing: ['syllabus.late_rule', 'syllabus.missing_rule'],
  retake: ['syllabus.retake'],
};

/** clean vs rough buckets (+ per key-field group accuracy and hallucinations). */
function bucketize(docs) {
  const defs = {
    clean: (d) => !d.rough_case && d.kind !== 'negative' && d.variant === 'clean',
    photo_mild: (d) => !d.rough_case && d.kind !== 'negative' && d.variant === 'photo',
    rough_src_clean: (d) => d.rough_case && d.kind !== 'negative' && d.variant === 'clean',
    rough_all: (d) => d.rough_case && d.kind !== 'negative' && d.variant === 'rough',
    rough_phone: (d) => d.rough_kind === 'phone' && d.variant === 'rough',
    rough_scan: (d) => d.rough_kind === 'scan' && d.variant === 'rough',
    rough_annotated: (d) => d.rough_kind === 'annotated' && d.variant === 'rough',
    negatives_clean: (d) => d.kind === 'negative' && !d.rough_case,
    negative_rough: (d) => d.kind === 'negative' && d.rough_case && d.variant === 'rough',
  };
  const out = {};
  for (const [k, f] of Object.entries(defs)) {
    const ds = docs.filter(f);
    const rows = ds.flatMap((d) => d.fields.map((r) => ({ ...r, doc: d.id })));
    const sum = summarize(rows);
    const groups = {};
    for (const [g, paths] of Object.entries(KEY_GROUPS)) {
      const gr = rows.filter((r) => paths.includes(r.path));
      if (!gr.length) continue;
      const gs = summarize(gr);
      groups[g] = { n: gs.scored, acc: +gs.accuracy.toFixed(3), wrong: gs.counts.wrong, missing: gs.counts.missing, hallucinated: gs.counts.hallucinated, flagged: gs.counts['correctly-flagged-for-review'] };
    }
    out[k] = {
      docs: ds.length,
      doc_avg_accuracy: ds.length ? +(ds.reduce((a, d) => a + d.field_accuracy, 0) / ds.length).toFixed(3) : null,
      field_accuracy: +sum.accuracy.toFixed(3),
      fields_scored: sum.scored,
      counts: sum.counts,
      hallucinations: rows.filter((r) => r.verdict === 'hallucinated').map((r) => `${r.doc}:${r.path}${r.detail ? ` (${r.detail})` : ''}`),
      stale_printed: ds.filter((d) => d.stale_printed?.length).map((d) => `${d.id}: ${d.stale_printed.join(', ')}`),
      groups,
    };
  }
  return out;
}

function printBuckets(b) {
  console.log('\nbucket            docs docAvg fieldAcc  n  wrong miss hallu | weights  scale  late/miss retake');
  const g = (x) => (x ? `${(x.acc * 100).toFixed(0)}%/${x.n}`.padEnd(8) : '-'.padEnd(8));
  for (const [k, v] of Object.entries(b)) {
    if (!v.docs) continue;
    console.log(
      k.padEnd(17),
      String(v.docs).padStart(4),
      `${(v.doc_avg_accuracy * 100).toFixed(1)}%`.padStart(6),
      `${(v.field_accuracy * 100).toFixed(1)}%`.padStart(8),
      String(v.fields_scored).padStart(3),
      String(v.counts.wrong).padStart(5),
      String(v.counts.missing).padStart(4),
      String(v.counts.hallucinated).padStart(5),
      '|',
      g(v.groups.weights), g(v.groups.scale), g(v.groups.late_missing), g(v.groups.retake),
    );
  }
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});

