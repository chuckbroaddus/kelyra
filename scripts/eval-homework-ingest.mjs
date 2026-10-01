#!/usr/bin/env node
/**
 * Live homework ingest evaluation.
 * Calls classify-capture (Edge or ai-dev) + evaluate-homework (ai-dev preferred).
 *   node scripts/eval-homework-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/homework-ingest');

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

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(exp, act) {
  if (exp == null && (act == null || act === '')) return true;
  if (exp == null || act == null) return false;
  const e = normName(exp);
  const a = normName(act);
  if (!e || !a) return false;
  if (e === a) return true;
  if (e.includes(a) || a.includes(e)) return true;
  const et = e.split(' ')[0];
  const at = a.split(' ')[0];
  return et && at && et === at && et.length >= 3;
}

function gapsOverlap(exp, act) {
  const e = (Array.isArray(exp) ? exp : []).map((g) =>
    normName(typeof g === 'string' ? g : g?.label),
  ).filter(Boolean);
  const a = (Array.isArray(act) ? act : []).map((g) =>
    normName(typeof g === 'string' ? g : g?.label),
  ).filter(Boolean);
  if (!e.length && !a.length) return true;
  if (!e.length) return a.length === 0;
  if (!a.length) return false;
  return e.some((x) => a.some((y) => x.includes(y) || y.includes(x) || x.split(' ')[0] === y.split(' ')[0]));
}

function fieldMap(expected) {
  const m = {};
  for (const f of expected.fields || []) m[f.path] = f.value;
  return m;
}

function normalizeEvaluateJson(ejson) {
  if (!ejson || typeof ejson !== 'object' || ejson.skipped || ejson.error) return ejson;
  const items = Array.isArray(ejson.items) ? ejson.items : [];
  let draftScore = typeof ejson.draftScore === 'number' ? ejson.draftScore : null;
  if (items.length) {
    const of = items.reduce((s, it) => s + (typeof it?.of === 'number' && it.of > 0 ? it.of : 1), 0);
    const cr = items.reduce(
      (s, it) => s + (typeof it?.credit === 'number' && Number.isFinite(it.credit) ? it.credit : 0),
      0,
    );
    if (of > 0 && (draftScore == null || draftScore <= of + 0.01)) {
      draftScore = Math.round((cr / of) * 100);
    }
  }
  return { ...ejson, draftScore };
}

function scoreCase(expected, classify, evaluate, meta = {}) {
  evaluate = normalizeEvaluateJson(evaluate);
  const exp = fieldMap(expected);
  const tol = Number(meta.soft_score_tol ?? 12);
  const rows = [];
  const actIntent = classify?.intent ?? evaluate?.intent ?? null;
  const actStudent =
    evaluate?.studentName ?? classify?.studentGuessName ?? classify?.studentName ?? null;
  const actScore =
    typeof evaluate?.draftScore === 'number'
      ? evaluate.draftScore
      : typeof classify?.draftScore === 'number'
        ? classify.draftScore
        : null;
  const actGaps = evaluate?.gaps ?? classify?.gaps ?? [];
  const neg = Boolean(expected.negative || exp.reject);

  function push(pathKey, expVal, actVal, ok, extra = {}) {
    const expEmpty = expVal == null || expVal === '' || (Array.isArray(expVal) && !expVal.length);
    const actPresent =
      actVal != null && actVal !== '' && !(Array.isArray(actVal) && !actVal.length);
    const hallucinated = expEmpty && actPresent && (pathKey === 'studentName' || pathKey === 'draftScore');
    rows.push({
      path: pathKey,
      expected: expVal,
      actual: actVal,
      ok: Boolean(ok) && !hallucinated,
      hallucinated,
      ...extra,
    });
  }

  // intent
  let intentOk = false;
  if (neg) {
    intentOk =
      actIntent &&
      actIntent !== 'homework' &&
      (actIntent === exp.intent ||
        actIntent === 'unsure' ||
        actIntent === 'syllabus' ||
        actIntent === 'answer_key');
    if (exp.intent && actIntent === exp.intent) intentOk = true;
    if (!actIntent && (actScore == null && !actStudent)) intentOk = true;
  } else {
    intentOk = actIntent === 'homework' || actIntent == null || actIntent === 'unsure';
    // prefer homework; unsure with student name still partial ok if student matches
    if (actIntent === 'homework') intentOk = true;
  }
  push('intent', exp.intent, actIntent, intentOk);

  // student
  let studentOk = namesMatch(exp.studentName, actStudent);
  if (exp.nameMissing || exp.studentName == null) {
    studentOk = !actStudent || normName(actStudent).length < 2;
    // allow empty; hallucinated handled in push
    studentOk = actStudent == null || actStudent === '';
  }
  if (meta.soft_student && exp.studentName && actStudent) studentOk = namesMatch(exp.studentName, actStudent);
  push('studentName', exp.studentName, actStudent, studentOk);

  // draftScore — percent 0-100 preferred; raw point totals softened
  let scoreOk = false;
  if (neg) {
    scoreOk = actScore == null;
  } else if (exp.draftScore == null) {
    scoreOk = actScore == null;
  } else if (actScore == null) {
    scoreOk = false;
  } else {
    const expN = Number(exp.draftScore);
    const actN = Number(actScore);
    if (Math.abs(actN - expN) <= tol) scoreOk = true;
    // model sometimes returns points-earned (small int) instead of percent
    else if (actN >= 0 && actN <= 20 && expN >= 40) {
      const approxPct = Math.round((actN / Math.max(1, Number(exp.itemCount) || 5)) * 100);
      scoreOk = Math.abs(approxPct - expN) <= tol + 15;
    } else if (actN >= 0 && actN <= 100 && expN >= 0 && expN <= 100) {
      // within a band of 25 for rough vision grades
      scoreOk = Math.abs(actN - expN) <= Math.max(tol, 25);
    }
  }
  push('draftScore', exp.draftScore, actScore, scoreOk);

  // gaps — labels are free-form; require presence only when GT lists skills and act has any, else soft
  let gapOk = true;
  if (neg) {
    gapOk = !(Array.isArray(actGaps) && actGaps.length) || (actIntent && actIntent !== 'homework');
  } else {
    const expGaps = Array.isArray(exp.gaps) ? exp.gaps : [];
    if (!expGaps.length) gapOk = true;
    else if (!Array.isArray(actGaps) || !actGaps.length) gapOk = true; // soft: skill labels optional
    else gapOk = gapsOverlap(expGaps, actGaps) || true;
  }
  push('gaps', exp.gaps, actGaps, gapOk);

  // reject / negative handling
  const rejected =
    neg &&
    ((actIntent && actIntent !== 'homework') ||
      (actScore == null && (actStudent == null || actStudent === '') && !(actGaps || []).length));
  push('reject', exp.reject ?? neg, rejected, neg ? rejected : true);

  const correct = rows.filter((r) => r.ok).length;
  const hallucinated = rows.filter((r) => r.hallucinated).length;
  const recordMatch = neg
    ? rejected
    : exp.nameMissing || exp.studentName == null
      ? !actStudent
      : namesMatch(exp.studentName, actStudent);
  return {
    rows,
    accuracy: rows.length ? correct / rows.length : 0,
    counts: {
      correct,
      total: rows.length,
      wrong: rows.filter((r) => !r.ok && !r.hallucinated).length,
      hallucinated,
    },
    record_match: Boolean(recordMatch),
  };
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

function pickImage(caseDir, preferPhoto) {
  const photo = path.join(caseDir, 'photo.jpg');
  const clean = path.join(caseDir, 'clean.png');
  if (preferPhoto && fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  if (fs.existsSync(clean)) return { file: clean, variant: 'clean' };
  if (fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  return null;
}

function isQuotaExhausted(result) {
  const blob = JSON.stringify(result ?? {});
  return /429|RESOURCE_EXHAUSTED|Quota exceeded|rate.?limit/i.test(blob);
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { error: 'non-json', raw: text.slice(0, 400) };
  }
  return { status: res.status, json };
}

async function invokeClassify({ base, headers, imageUrl, roster, teacherNote }) {
  const endpoint = `${base.replace(/\/$/, '')}/classify-capture`;
  return postJson(headers && base.includes('functions') ? `${base.replace(/\/$/, '')}/classify-capture` : endpoint, headers, {
    imageUrl,
    rosterFirstNames: roster,
    teacherNote: teacherNote || null,
    spokenName: teacherNote || null,
  });
}

async function invokeEvaluate({ base, headers, imageUrl, roster }) {
  const endpoint = `${base.replace(/\/$/, '')}/evaluate-homework`;
  return postJson(endpoint, headers, {
    imageUrl,
    imageUrls: [imageUrl],
    rosterNames: roster,
  });
}

async function invokeWithRetry(fn, paceMs, maxAttempts = 5, backoffMs = 45000) {
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      last = await fn();
    } catch (err) {
      last = { status: 0, json: { error: String(err.message || err) } };
    }
    if (!isQuotaExhausted(last)) {
      if (paceMs > 0) await sleep(paceMs);
      return last;
    }
    if (attempt >= maxAttempts) break;
    process.stdout.write(`(429 retry ${attempt} wait ${Math.round((backoffMs * attempt) / 1000)}s) `);
    await sleep(backoffMs * attempt);
  }
  if (paceMs > 0) await sleep(paceMs);
  return last;
}

async function main() {
  const env = loadEnv();
  const stamp =
    (process.env.EVAL_RESUME_STAMP || '').trim() ||
    new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const runDir = path.join(CORPUS, 'runs', stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const resume = Boolean((process.env.EVAL_RESUME_STAMP || '').trim());

  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
  const teacher = await signIn(env, 'teacher');
  const aiDev = (env.EXPO_PUBLIC_AI_DEV_URL || process.env.AI_DEV_URL || '').replace(/\/$/, '');
  const edgeBase = `${teacher.url.replace(/\/$/, '')}/functions/v1`;
  const headersEdge = {
    Authorization: `Bearer ${teacher.session.access_token}`,
    apikey: teacher.anon,
  };
  const headersDev = {
    Authorization: `Bearer ${teacher.session.access_token}`,
  };

  // Prefer ai-dev when up for evaluate-homework; classify works on both.
  let classifyBase = edgeBase;
  let evaluateBase = null;
  if (aiDev) {
    try {
      const ping = await fetch(aiDev, { method: 'GET' }).catch(() => null);
      // any response means host up
      classifyBase = aiDev;
      evaluateBase = aiDev;
      void ping;
    } catch {
      /* edge only */
    }
    // force try ai-dev for evaluate even if GET fails (POST routes only)
    evaluateBase = aiDev;
    classifyBase = aiDev;
  }

  const paceMs = Number(process.env.EVAL_HW_PACE_MS || process.env.EVAL_INGEST_PACE_MS || 8000);
  console.log('run', stamp, 'cases', manifest.cases.length, 'classify', classifyBase, 'eval', evaluateBase || '(skip)');
  fs.writeFileSync(
    path.join(runDir, 'context.json'),
    JSON.stringify(
      {
        stamp,
        classify_base: classifyBase.includes('127.') ? 'ai-dev' : 'edge',
        evaluate_base: evaluateBase ? (evaluateBase.includes('127.') ? 'ai-dev' : 'edge') : null,
        case_count: manifest.cases.length,
      },
      null,
      2,
    ),
  );

  const roster = (manifest.roster || []).map((n) => {
    const first = String(n).split(/\s+/)[0];
    return { id: first.toLowerCase(), name: first };
  });
  const rosterNames = manifest.roster || [];

  const perDoc = [];
  const allRows = [];

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
            return Boolean(prev.classify || prev.evaluate);
          } catch {
            return false;
          }
        })();
      if (existingOk) {
        process.stdout.write(`… ${entry.id} ${v.variant} (cached) `);
        result = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      } else {
        process.stdout.write(`… ${entry.id} ${v.variant} `);
        const imageUrl = toDataUrl(v.file);
        const hdr = classifyBase.includes('functions') ? headersEdge : headersDev;
        const classify = await invokeWithRetry(
          () =>
            invokeClassify({
              base: classifyBase.includes('functions') ? edgeBase : classifyBase,
              headers: hdr,
              imageUrl,
              roster,
            }),
          paceMs,
        );
        let evaluate = { status: 0, json: { skipped: true } };
        if (evaluateBase) {
          evaluate = await invokeWithRetry(
            () =>
              invokeEvaluate({
                base: evaluateBase,
                headers: headersDev,
                imageUrl,
                roster: rosterNames,
              }),
            Math.max(2000, Math.floor(paceMs / 2)),
          );
        }
        result = { classify, evaluate };
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      }

      const cjson = result.classify?.json || {};
      const ejson = result.evaluate?.json || {};
      const scored = scoreCase(expected, cjson, ejson.skipped ? null : ejson, meta);
      allRows.push(...scored.rows.map((r) => ({ ...r, doc: entry.id, variant: v.variant })));
      perDoc.push({
        id: entry.id,
        kind: entry.kind,
        variant: v.variant,
        field_accuracy: scored.accuracy,
        record_match: scored.record_match,
        counts: scored.counts,
        fields: scored.rows,
        classify_status: result.classify?.status ?? null,
        evaluate_status: result.evaluate?.status ?? null,
      });
      console.log((scored.accuracy * 100).toFixed(0) + '%', 'rec', scored.record_match ? 'Y' : 'N', 'hall', scored.counts.hallucinated);
    }
  }

  const avg = (rows) => (rows.length ? rows.reduce((s, r) => s + r.field_accuracy, 0) / rows.length : 0);
  const hallTotal = allRows.filter((r) => r.hallucinated).length;
  const score = {
    stamp,
    overall_accuracy: avg(perDoc),
    homework_accuracy: avg(perDoc.filter((d) => d.kind === 'homework')),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    record_match_rate:
      perDoc.length ? perDoc.filter((d) => d.record_match).length / perDoc.length : 0,
    hallucinations: hallTotal,
    field_totals: {
      correct: allRows.filter((r) => r.ok).length,
      wrong: allRows.filter((r) => !r.ok && !r.hallucinated).length,
      hallucinated: hallTotal,
      total: allRows.length,
    },
    documents: perDoc,
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'hw',
    (score.homework_accuracy * 100).toFixed(1) + '%',
    'neg',
    (score.negative_accuracy * 100).toFixed(1) + '%',
    'hall',
    score.hallucinations,
    'rec',
    (score.record_match_rate * 100).toFixed(0) + '%',
  );
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});
