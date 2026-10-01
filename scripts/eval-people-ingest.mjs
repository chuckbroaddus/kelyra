#!/usr/bin/env node
/**
 * Live people-ingest eval against classify-capture.
 *   node scripts/eval-people-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { mapClassifierFields, coerceBirthdayISO } from '../src/lib/people/metadata.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/people-ingest');

const STUDENT_ALIASES = {
  preferred_name: 'preferred_name',
  'preferred name': 'preferred_name',
  nickname: 'preferred_name',
  birthday: 'birthday',
  'date of birth': 'birthday',
  dob: 'birthday',
  grade_or_age: 'grade_or_age',
  grade: 'grade_or_age',
  age: 'grade_or_age',
  'grade or age': 'grade_or_age',
  phone: 'phone',
  telephone: 'phone',
  tel: 'phone',
  email: 'email',
  'e-mail': 'email',
  address: 'address',
  emergency_name: 'emergency_name',
  'emergency contact': 'emergency_name',
  'emergency name': 'emergency_name',
  emergency_phone: 'emergency_phone',
  'emergency phone': 'emergency_phone',
  allergies: 'allergies',
  allergy: 'allergies',
  health_conditions: 'health_conditions',
  'health conditions': 'health_conditions',
  health: 'health_conditions',
  notes: 'notes',
  note: 'notes',
  relationship: 'relationship',
  'preferred contact': 'preferred_contact',
  preferred_contact: 'preferred_contact',
};

// R2: score through the same mapper the capture review screen uses (src/app/capture.tsx),
// so eval == what the teacher/office sees. Legacy eval-only alias table kept for expected.fields fallback.
function mapFields(fields, kind = 'student') {
  const out = {};
  const clean = (fields || [])
    .map((f) => ({ label: String(f?.label || '').trim(), value: String(f?.value || '').trim() }))
    .filter((f) => f.label && f.value);
  for (const m of mapClassifierFields(clean, kind)) {
    if (out[m.key] == null) out[m.key] = m.value;
  }
  // relationship / preferred_contact on student intent → legacy alias (eval-only)
  for (const f of clean) {
    const key = STUDENT_ALIASES[f.label.toLowerCase()];
    if ((key === 'relationship' || key === 'preferred_contact') && out[key] == null) out[key] = f.value;
  }
  return out;
}

function normPhone(s) {
  return String(s || '').replace(/\D+/g, '');
}

function normText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[—–−]/g, '-')
    .replace(/[^a-z0-9@.+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  const na = normText(a);
  const nb = normText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = na.split(' ').filter(Boolean);
  const tb = nb.split(' ').filter(Boolean);
  if (ta.length && tb.length && ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1]) return true;
  return false;
}

function valuesMatch(key, exp, act) {
  if (exp == null || exp === '') return act == null || act === '';
  if (act == null || act === '') return false;
  if (key === 'phone' || key === 'emergency_phone') {
    const ep = normPhone(exp);
    const ap = normPhone(act);
    return ep.length >= 7 && ap.includes(ep.slice(-7));
  }
  if (key === 'birthday' || key === 'date of birth') {
    const isoAct = coerceBirthdayISO(String(act));
    if (isoAct && isoAct === coerceBirthdayISO(String(exp))) return true;
    const e = String(exp).replace(/[^\d]/g, '');
    const a = String(act).replace(/[^\d]/g, '');
    if (e.length >= 8 && a.includes(e.slice(0, 8))) return true;
    // US mmddyyyy vs yyyymmdd soft
    if (e.length === 8 && a.length >= 6) {
      const y = e.slice(0, 4);
      const m = e.slice(4, 6);
      const d = e.slice(6, 8);
      if (a.includes(m) && a.includes(d) && a.includes(y.slice(2))) return true;
    }
    return normText(exp) === normText(act) || normText(act).includes(normText(exp));
  }
  if (key === 'relationship') {
    const e = normText(exp);
    const a = normText(act);
    if (e === a) return true;
    if (e.startsWith(a) || a.startsWith(e)) return true;
    if (e.includes('mother') && a.includes('mother')) return true;
    if (e.includes('father') && a.includes('father')) return true;
    if (e.includes('guardian') && a.includes('guardian')) return true;
    if (e.includes('other') && a.includes('other')) return true;
    return false;
  }
  const e = normText(exp);
  const a = normText(act);
  if (!e || !a) return false;
  if (e === a) return true;
  if (e.includes(a) || a.includes(e)) return true;
  return false;
}

function scoreCase(expected, actual, meta = {}) {
  const rows = [];
  const actIntent = actual?.intent === 'metadata' ? 'student_card' : actual?.intent;
  const accept = expected.accept_intents || (expected.reject ? expected.accept_intents : null);

  if (expected.reject || meta.negative) {
    const people = actIntent === 'parent_card' || actIntent === 'student_card';
    const ok =
      !people &&
      (Array.isArray(accept) ? accept.includes(actIntent) : actIntent !== 'parent_card' && actIntent !== 'student_card');
    rows.push({
      path: 'intent',
      verdict: ok ? 'correct' : 'wrong',
      expected: accept || expected.intent,
      actual: actIntent,
    });
    return rows;
  }

  const wantIntent = expected.intent;
  const intentOk =
    actIntent === wantIntent ||
    (Array.isArray(expected.accept_intents) && expected.accept_intents.includes(actIntent));
  rows.push({
    path: 'intent',
    verdict: intentOk ? 'correct' : 'wrong',
    expected: wantIntent,
    actual: actIntent,
  });

  if (expected.parentGuessName) {
    rows.push({
      path: 'parentGuessName',
      verdict: namesMatch(expected.parentGuessName, actual?.parentGuessName) ? 'correct' : actual?.parentGuessName ? 'wrong' : 'missing',
      expected: expected.parentGuessName,
      actual: actual?.parentGuessName ?? null,
    });
  }
  if (expected.studentGuessName) {
    rows.push({
      path: 'studentGuessName',
      verdict: namesMatch(expected.studentGuessName, actual?.studentGuessName)
        ? 'correct'
        : actual?.studentGuessName
          ? 'wrong'
          : 'missing',
      expected: expected.studentGuessName,
      actual: actual?.studentGuessName ?? null,
    });
  }

  const expMapped = {};
  for (const m of expected.mapped || []) {
    if (m?.key) expMapped[m.key] = m.value;
  }
  // fallback from fields labels
  const actKind = actIntent === 'parent_card' ? 'parent' : 'student';
  const expKind = expected.intent === 'parent_card' ? 'parent' : 'student';
  if (!Object.keys(expMapped).length) Object.assign(expMapped, mapFields(expected.fields || [], expKind));
  const actMapped = mapFields(actual?.fields || [], actKind);

  for (const [key, expVal] of Object.entries(expMapped)) {
    const actVal = actMapped[key];
    if (valuesMatch(key, expVal, actVal)) {
      rows.push({ path: `field.${key}`, verdict: 'correct', expected: expVal, actual: actVal });
    } else if (actVal == null || actVal === '') {
      rows.push({ path: `field.${key}`, verdict: 'missing', expected: expVal, actual: null });
    } else {
      rows.push({ path: `field.${key}`, verdict: 'wrong', expected: expVal, actual: actVal });
    }
  }

  // hallucinations: value present when GT empty/absent for tracked keys
  const emptyKeys = meta.no_hallucinate_empty || [];
  for (const key of emptyKeys) {
    if (key === 'phone_owen') continue;
    if (expMapped[key] != null && String(expMapped[key]).trim()) continue;
    const actVal = actMapped[key];
    if (actVal != null && String(actVal).trim() && !/^none\b/i.test(String(actVal))) {
      rows.push({ path: `field.${key}`, verdict: 'hallucinated', expected: null, actual: actVal });
    }
  }
  // also: any high-confidence-looking act field not in expected mapped
  for (const [key, actVal] of Object.entries(actMapped)) {
    if (expMapped[key] != null) continue;
    if (emptyKeys.includes(key) || meta.soft_match) continue;
    // notes spillover is soft unless empty-notes required
    if (key === 'notes') continue;
    if (actVal != null && String(actVal).trim()) {
      // only count as hallucination when expected explicitly omitted this key
      // for partial cases (no_hallucinate_empty)
      if (emptyKeys.length) {
        rows.push({ path: `field.${key}`, verdict: 'hallucinated', expected: null, actual: actVal });
      }
    }
  }

  if (meta.multi_record && Array.isArray(expected.names) && expected.names.length) {
    const actNames = (actual?.names || []).map((n) => (typeof n === 'string' ? n : n?.name)).filter(Boolean);
    const joined = [
      actual?.parentGuessName,
      actual?.studentGuessName,
      ...actNames,
      ...(actual?.fields || []).map((f) => f.value),
    ]
      .filter(Boolean)
      .map(normText)
      .join(' | ');
    let hit = 0;
    for (const n of expected.names) {
      const name = typeof n === 'string' ? n : n.name;
      if (joined.includes(normText(name)) || namesMatch(name, actual?.parentGuessName) || namesMatch(name, actual?.studentGuessName)) {
        hit += 1;
      }
    }
    const ratio = hit / expected.names.length;
    rows.push({
      path: 'record.names',
      verdict: ratio >= 0.5 ? 'correct' : hit > 0 ? 'wrong' : 'missing',
      expected: expected.names.map((n) => (typeof n === 'string' ? n : n.name)),
      actual: actNames,
      detail: `${hit}/${expected.names.length}`,
    });
  }

  return rows;
}

function summarize(rows) {
  const counts = {
    correct: 0,
    wrong: 0,
    missing: 0,
    hallucinated: 0,
  };
  for (const r of rows) {
    if (counts[r.verdict] != null) counts[r.verdict] += 1;
  }
  const scored = Object.values(counts).reduce((a, b) => a + b, 0);
  const good = counts.correct;
  return { counts, scored, accuracy: scored ? good / scored : 0 };
}


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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function signIn(env, personaName) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY');
  const persona = loadPersona(personaName);
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
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = persona.handle.includes('@') ? persona.handle : `${persona.handle}@users.kelyra.local`;
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

function isQuotaExhausted(result) {
  const t = JSON.stringify(result || {}).toLowerCase();
  return (
    result?.status === 429 ||
    result?.status === 503 ||
    t.includes('resource_exhausted') ||
    t.includes('rate limit') ||
    t.includes('high demand') ||
    t.includes('unavailable') ||
    t.includes('"code\": 503') ||
    t.includes('\"code\":503')
  );
}

async function invokeClassifyOnce({ url, anon, session, imageUrl, teacherNote }) {
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/classify-capture`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      teacherNote: teacherNote || null,
      rosterFirstNames: [],
    }),
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

async function invokeClassify(args) {
  const maxAttempts = Number(process.env.EVAL_PEOPLE_MAX_ATTEMPTS || 5);
  const paceMs = Number(process.env.EVAL_PEOPLE_PACE_MS || 4000);
  const baseBackoffMs = Number(process.env.EVAL_PEOPLE_BACKOFF_MS || 45000);
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      last = await invokeClassifyOnce(args);
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
  // office + teacher both can classify; prefer office for people sheets
  const office = await signIn(env, 'office').catch(async () => signIn(env, 'teacher'));

  console.log('run', stamp, 'cases', manifest.cases.length);
  fs.writeFileSync(
    path.join(runDir, 'context.json'),
    JSON.stringify({ stamp, case_count: manifest.cases.length, persona: 'office|teacher' }, null, 2),
  );

  const perDoc = [];
  const allFieldRows = [];

  for (const entry of manifest.cases) {
    const caseDir = path.join(CORPUS, entry.id);
    const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
    let meta = {};
    const metaPath = path.join(caseDir, 'eval-meta.json');
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

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
      const outPath = path.join(runDir, `${entry.id}__${v.variant}.json`);
      let result;
      const existingOk =
        resume &&
        fs.existsSync(outPath) &&
        (() => {
          try {
            const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
            if (isQuotaExhausted(prev)) return false;
            if (!prev.json || typeof prev.json !== 'object') return false;
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
          result = await invokeClassify({
            url: office.url,
            anon: office.anon,
            session: office.session,
            imageUrl: toDataUrl(v.file),
          });
        } catch (err) {
          result = { status: 0, json: { error: String(err.message || err) } };
        }
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      }
      const actual = result.json?.error && !result.json?.intent ? result.json : result.json;
      const fieldScores = scoreCase(expected, actual, meta);
      const sum = summarize(fieldScores);
      allFieldRows.push(...fieldScores.map((r) => ({ ...r, doc: entry.id, variant: v.variant })));
      perDoc.push({
        id: entry.id,
        kind: entry.kind,
        variant: v.variant,
        http_status: result.status,
        intent: actual?.intent ?? null,
        field_accuracy: sum.accuracy,
        counts: sum.counts,
        fields: fieldScores,
      });
      console.log((sum.accuracy * 100).toFixed(0) + '%');
    }
  }

  const avg = (rows) => (rows.length ? rows.reduce((s, r) => s + r.field_accuracy, 0) / rows.length : 0);
  const hall = allFieldRows.filter((r) => r.verdict === 'hallucinated').length;
  const score = {
    stamp,
    overall_accuracy: avg(perDoc),
    parent_accuracy: avg(perDoc.filter((d) => d.kind === 'parent_card')),
    student_accuracy: avg(perDoc.filter((d) => d.kind === 'student_card')),
    multi_accuracy: avg(perDoc.filter((d) => d.kind === 'multi')),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    hallucinations: hall,
    documents: perDoc,
    field_totals: summarize(allFieldRows).counts,
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'parent',
    (score.parent_accuracy * 100).toFixed(1) + '%',
    'student',
    (score.student_accuracy * 100).toFixed(1) + '%',
    'neg',
    (score.negative_accuracy * 100).toFixed(1) + '%',
    'hallucinations',
    hall,
  );
}


main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});
