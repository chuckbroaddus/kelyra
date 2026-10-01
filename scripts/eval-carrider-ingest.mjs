#!/usr/bin/env node
/**
 * Live car-rider ingest eval against deployed ride-lpr.
 *   node scripts/eval-carrider-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/carrider-ingest');

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

function plateNorm(s) {
  return String(s ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function nameNorm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function emptyish(v) {
  if (v == null) return true;
  if (typeof v === 'string' && !v.trim()) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function namesMatch(exp, act) {
  const e = (Array.isArray(exp) ? exp : []).map(nameNorm).filter(Boolean).sort();
  const a = (Array.isArray(act) ? act : []).map(nameNorm).filter(Boolean).sort();
  if (!e.length && !a.length) return true;
  if (!e.length) return false;
  return e.every((n) => a.some((x) => x === n || x.includes(n) || n.includes(x)));
}

function fieldEqual(pathKey, exp, act) {
  if (pathKey === 'plate' || pathKey === 'plateFront' || pathKey === 'plateBack') {
    if (emptyish(exp) && emptyish(act)) return true;
    const e = plateNorm(exp);
    const a = plateNorm(act);
    if (!e || !a) return false;
    if (e === a) return true;
    // soft: O/0 ambiguity on plates
    const soft = (s) => s.replace(/O/g, '0');
    return soft(e) === soft(a);
  }
  if (pathKey === 'make' || pathKey === 'model') {
    if (emptyish(exp) && emptyish(act)) return true;
    const e = nameNorm(exp);
    const a = nameNorm(act);
    if (!e) return emptyish(act);
    return a === e || a.includes(e) || e.includes(a);
  }
  if (pathKey === 'tag_number') {
    if (emptyish(exp) && emptyish(act)) return true;
    return plateNorm(exp) === plateNorm(act);
  }
  if (pathKey === 'riders' || pathKey === 'authorized_pickups') {
    return namesMatch(exp, act);
  }
  if (pathKey === 'unreadable') return Boolean(exp) === Boolean(act);
  if (pathKey === 'document_kind') {
    const e = String(exp || '').toLowerCase();
    const a = String(act || '').toLowerCase();
    if (e === a) return true;
    if (e === 'rejected' && (a === 'rejected' || a === 'unknown')) return true;
    return false;
  }
  if (pathKey === 'side') {
    const e = String(exp || 'unknown');
    const a = String(act || 'unknown');
    if (e === a) return true;
    if (e === 'unknown' || a === 'unknown') return true;
    return false;
  }
  return exp === act;
}

const DEFAULT_FIELDS = [
  'document_kind',
  'plate',
  'plateFront',
  'plateBack',
  'make',
  'model',
  'side',
  'tag_number',
  'riders',
  'authorized_pickups',
  'unreadable',
];

function scoreCase(expected, actual, meta) {
  const fields = meta.fields?.length ? meta.fields : DEFAULT_FIELDS;
  const rows = [];
  let correct = 0;
  let wrong = 0;
  let missing = 0;
  let hallucinated = 0;

  for (const key of fields) {
    const exp = expected[key];
    const act = actual?.[key];
    const expEmpty = emptyish(exp);
    const actEmpty = emptyish(act);

    if (expEmpty && actEmpty) {
      rows.push({ path: key, result: 'correct_empty', exp, act });
      correct += 1;
      continue;
    }
    if (expEmpty && !actEmpty) {
      rows.push({ path: key, result: 'hallucinated', exp, act });
      hallucinated += 1;
      wrong += 1;
      continue;
    }
    if (!expEmpty && actEmpty) {
      rows.push({ path: key, result: 'missing', exp, act });
      missing += 1;
      wrong += 1;
      continue;
    }
    if (fieldEqual(key, exp, act)) {
      rows.push({ path: key, result: 'correct', exp, act });
      correct += 1;
    } else {
      rows.push({ path: key, result: 'wrong', exp, act });
      wrong += 1;
    }
  }

  if (meta.negative) {
    if (!emptyish(actual?.plate) || !emptyish(actual?.make) || !emptyish(actual?.model)) {
      rows.push({
        path: '_negative_no_invent',
        result: 'hallucinated',
        exp: null,
        act: { plate: actual?.plate, make: actual?.make, model: actual?.model },
      });
      hallucinated += 1;
      wrong += 1;
    } else {
      rows.push({ path: '_negative_no_invent', result: 'correct', exp: null, act: null });
      correct += 1;
    }
    const kindOk =
      actual?.document_kind === 'rejected' ||
      actual?.document_kind === 'unknown' ||
      actual?.unreadable === true;
    if (!kindOk) {
      rows.push({ path: '_negative_reject', result: 'wrong', exp: 'rejected', act: actual?.document_kind });
      wrong += 1;
    } else {
      rows.push({ path: '_negative_reject', result: 'correct', exp: 'rejected', act: actual?.document_kind });
      correct += 1;
    }
  }

  const total = correct + wrong;
  return {
    rows,
    counts: { correct, wrong, missing, hallucinated, total },
    accuracy: total ? correct / total : 0,
  };
}

// MAIN below

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

function mimeFor(p) {
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function pickImage(caseDir, preferPhoto) {
  const photo = path.join(caseDir, 'photo.jpg');
  const clean = path.join(caseDir, 'clean.png');
  if (preferPhoto && fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  if (fs.existsSync(clean)) return { file: clean, variant: 'clean' };
  if (fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  return null;
}

async function uploadAndInvoke({ sb, session, url, anon, filePath, storageKey }) {
  const buf = fs.readFileSync(filePath);
  const contentType = mimeFor(filePath);
  const { error: upErr } = await sb.storage.from('photos').upload(storageKey, buf, {
    contentType,
    upsert: true,
  });
  if (upErr) throw new Error(`upload failed: ${upErr.message}`);

  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/ride-lpr`;
  const maxAttempts = Number(process.env.EVAL_CARRIDER_MAX_ATTEMPTS || 4);
  let last = { status: 0, json: { error: 'no attempt' } };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storagePath: storageKey }),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: 'non-json', raw: text.slice(0, 400) };
    }
    last = { status: res.status, json };
    const blob = JSON.stringify(json);
    const retryable = /503|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|429|rate.?limit/i.test(blob);
    if (!retryable) return last;
    if (attempt < maxAttempts) {
      process.stdout.write(`(retry ${attempt}) `);
      await sleep(8000 * attempt);
    }
  }
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
  const { data: user } = await teacher.sb.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) throw new Error('no user id');

  console.log('run', stamp, 'cases', manifest.cases.length);
  fs.writeFileSync(
    path.join(runDir, 'context.json'),
    JSON.stringify({ stamp, user_id: userId, case_count: manifest.cases.length }, null, 2),
  );

  const perDoc = [];
  const allRows = [];
  const paceMs = Number(process.env.EVAL_CARRIDER_PACE_MS || 2500);

  for (const entry of manifest.cases) {
    const caseDir = path.join(CORPUS, entry.id);
    const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
    let meta = {};
    const metaPath = path.join(caseDir, 'eval-meta.json');
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const variants = [];
    const clean = pickImage(caseDir, false);
    if (clean) variants.push(clean);
    if (meta.photo || entry.photo) {
      const photo = pickImage(caseDir, true);
      if (photo && photo.file !== clean?.file) variants.push(photo);
    }
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
            return prev?.json && typeof prev.json === 'object';
          } catch {
            return false;
          }
        })();
      if (existingOk) {
        process.stdout.write(`… ${entry.id} ${v.variant} (cached) `);
        result = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      } else {
        process.stdout.write(`… ${entry.id} ${v.variant} `);
        const storageKey = `${userId}/ride-eval/${stamp}/${entry.id}-${v.variant}${path.extname(v.file)}`;
        try {
          result = await uploadAndInvoke({
            sb: teacher.sb,
            session: teacher.session,
            url: teacher.url,
            anon: teacher.anon,
            filePath: v.file,
            storageKey,
          });
        } catch (err) {
          result = { status: 0, json: { error: String(err.message || err), unreadable: true } };
        }
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        if (paceMs > 0) await sleep(paceMs);
      }
      const actual = result.json || {};
      const scored = scoreCase(expected, actual, {
        ...meta,
        negative: meta.negative || entry.negative,
      });
      allRows.push(...scored.rows.map((r) => ({ ...r, doc: entry.id, variant: v.variant })));
      perDoc.push({
        id: entry.id,
        kind: entry.kind,
        variant: v.variant,
        http_status: result.status,
        field_accuracy: scored.accuracy,
        counts: scored.counts,
        fields: scored.rows,
        actual_summary: {
          document_kind: actual.document_kind ?? null,
          plate: actual.plate ?? null,
          make: actual.make ?? null,
          model: actual.model ?? null,
          unreadable: actual.unreadable ?? null,
        },
      });
      console.log((scored.accuracy * 100).toFixed(0) + '%');
    }
  }

  const avg = (rows) => (rows.length ? rows.reduce((s, r) => s + r.field_accuracy, 0) / rows.length : 0);
  const hall = allRows.filter((r) => r.result === 'hallucinated').length;
  const score = {
    stamp,
    overall_accuracy: avg(perDoc),
    vehicle_accuracy: avg(perDoc.filter((d) => d.kind === 'vehicle_photo')),
    hang_tag_accuracy: avg(perDoc.filter((d) => d.kind === 'hang_tag')),
    form_accuracy: avg(
      perDoc.filter((d) => d.kind === 'check_in_sheet' || d.kind === 'authorized_pickup'),
    ),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    hallucinations: hall,
    field_totals: {
      correct: allRows.filter((r) => r.result === 'correct' || r.result === 'correct_empty').length,
      wrong: allRows.filter((r) => r.result === 'wrong').length,
      missing: allRows.filter((r) => r.result === 'missing').length,
      hallucinated: hall,
    },
    documents: perDoc,
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'veh',
    (score.vehicle_accuracy * 100).toFixed(1) + '%',
    'neg',
    (score.negative_accuracy * 100).toFixed(1) + '%',
    'hall',
    hall,
  );
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});
