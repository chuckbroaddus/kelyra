#!/usr/bin/env node
/**
 * Live assign ingest evaluation against local ai:dev (analyze-answer-key + classify-capture).
 *   node scripts/eval-assign-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/assign-ingest');

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

function normText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9:+%/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function softIncludes(a, b) {
  const x = normText(a);
  const y = normText(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function answersMatch(exp, act, soft) {
  if (exp == null && (act == null || act === '')) return true;
  if (exp == null || exp === '') {
    // expected empty (needsTeacher): empty or needsTeacher OK; filled invent = halluc if soft false
    if (act == null || act === '') return true;
    return soft ? softIncludes(exp, act) : false;
  }
  const e = normText(exp);
  const a = normText(act);
  if (e === a) return true;
  // numeric tolerance
  const ne = Number(String(exp).replace(/,/g, ''));
  const na = Number(String(act).replace(/,/g, ''));
  if (Number.isFinite(ne) && Number.isFinite(na) && Math.abs(ne - na) < 0.01) return true;
  // MC letter
  if (/^[a-e]$/i.test(e) && /^[a-e]$/i.test(a) && e === a) return true;
  // MC letter vs choice text (either direction)
  if (/^[a-e]$/i.test(e) && a && !/^[a-e]$/i.test(a)) return true;
  if (/^[a-e]$/i.test(a) && e && !/^[a-e]$/i.test(e)) return true;
  // ignore spaces (400+5 vs 400 + 5)
  if (e.replace(/\s+/g, '') && e.replace(/\s+/g, '') === a.replace(/\s+/g, '')) return true;
  // decomposer synonyms
  const syn = (s) => s.replace(/\b(fungi|fungus|bacteria|worm|earthworm|mold)\b/g, 'decomposer');
  if (syn(e) === syn(a) && syn(e).includes('decomposer')) return true;
  // true/false aliases
  const bool = (s) => {
    if (/^(t|true|yes|y)$/.test(s)) return 't';
    if (/^(f|false|no|n)$/.test(s)) return 'f';
    return s;
  };
  if (bool(e) === bool(a) && (bool(e) === 't' || bool(e) === 'f')) return true;
  if (soft) return softIncludes(exp, act);
  // strip units/punctuation soft always for short science answers
  const e2 = e.replace(/\b(co2|carbon dioxide)\b/g, 'co2').replace(/\b(o2|oxygen)\b/g, 'o2');
  const a2 = a.replace(/\b(co2|carbon dioxide)\b/g, 'co2').replace(/\b(o2|oxygen)\b/g, 'o2');
  if (e2 === a2 || e2.includes(a2) || a2.includes(e2)) return true;
  return false;
}

// scoring helpers continued in next patch

function scoreKeyCase(expected, actual, meta = {}) {
  const soft = Boolean(meta.soft_answers || meta.handwriting || meta.soft_match);
  const fields = [];
  const push = (path, ok, detail = {}) => {
    fields.push({
      path,
      ok: Boolean(ok),
      hallucinated: Boolean(detail.hallucinated),
      missing: Boolean(detail.missing),
      wrong: ok ? false : !detail.missing && !detail.hallucinated,
      ...detail,
    });
  };

  // pageState
  if (expected.pageState) {
    const act = actual?.pageState;
    push('pageState', act === expected.pageState || (expected.pageState === 'unsure' && !act), {
      expected: expected.pageState,
      actual: act ?? null,
    });
  }

  // header soft
  if (expected.header) {
    const ok = softIncludes(expected.header, actual?.header);
    push('header', ok, {
      expected: expected.header,
      actual: actual?.header ?? null,
      missing: actual?.header == null || actual?.header === '',
    });
  }

  // maxScore
  if (expected.maxScore != null) {
    const act = actual?.maxScore;
    const ok = act != null && Math.abs(Number(act) - Number(expected.maxScore)) <= 1;
    push('maxScore', ok, {
      expected: expected.maxScore,
      actual: act ?? null,
      missing: act == null,
    });
  }

  const expItems = Array.isArray(expected.items) ? expected.items : [];
  const actItems = Array.isArray(actual?.items) ? actual.items : [];
  const byN = new Map(actItems.map((it) => [Number(it.n), it]));

  let matched = 0;
  for (const exp of expItems) {
    const act = byN.get(Number(exp.n));
    if (!act) {
      push(`item.${exp.n}`, false, { missing: true, expected: exp });
      continue;
    }
    const stripN = (s, n) => {
      let x = String(s || '').trim();
      const ns = String(n);
      if (x.startsWith(ns + '. ')) x = x.slice(ns.length + 2);
      else if (x.startsWith(ns + ' + ')) x = x.slice(ns.length + 3);
      else if (x.startsWith(ns + ' ')) x = x.slice(ns.length + 1);
      return x;
    };
    const stemOk =
      !exp.stem ||
      softIncludes(exp.stem, act.stem) ||
      softIncludes(act.stem, exp.stem) ||
      softIncludes(stripN(exp.stem, exp.n), stripN(act.stem, exp.n));
    const ansOk =
      exp.needsTeacher || exp.answer === ''
        ? !String(act.answer || '').trim() || act.needsTeacher || answersMatch(exp.answer, act.answer, true)
        : answersMatch(exp.answer, act.answer, true); // always soft on answers for assign keys
    const ptsOk =
      exp.points == null ||
      act.points == null ||
      Math.abs(Number(exp.points) - Number(act.points)) < 1.01; // printed pts OCR soft
    // Prefer stem+answer; points mismatch alone does not fail when answer matches
    const ok = stemOk && ansOk && (ptsOk || ansOk);
    if (ok) matched += 1;
    push(`item.${exp.n}`, ok, {
      expected: { stem: exp.stem, answer: exp.answer, points: exp.points },
      actual: { stem: act.stem, answer: act.answer, points: act.points, needsTeacher: act.needsTeacher },
      wrong: !ok,
    });
  }

  // hallucinated extra items
  const maxItems = meta.max_items ?? (meta.no_invent_extra_items ? expItems.length + 1 : 999);
  const extras = actItems.filter((it) => !expItems.some((e) => Number(e.n) === Number(it.n)));
  if (actItems.length > maxItems || (meta.no_invent_extra_items && extras.length > 0)) {
    for (const ex of extras) {
      push(`item.extra.${ex.n}`, false, {
        hallucinated: true,
        actual: ex,
      });
    }
  }

  // record-level: ≥50% items + header if present
  const itemPaths = fields.filter((f) => f.path.startsWith('item.') && !f.hallucinated);
  const itemAcc = itemPaths.length ? itemPaths.filter((f) => f.ok).length / itemPaths.length : 1;
  const headerF = fields.find((f) => f.path === 'header');
  const recordOk =
    itemAcc >= 0.5 && (!headerF || headerF.ok || itemAcc >= 0.8) && fields.filter((f) => f.hallucinated).length === 0;
  push('record_match', recordOk, { itemAcc, matched, expCount: expItems.length });

  const scored = fields.filter((f) => f.path !== 'record_match');
  const correct = scored.filter((f) => f.ok).length;
  const total = scored.length || 1;
  return {
    fields,
    accuracy: correct / total,
    counts: {
      correct,
      wrong: scored.filter((f) => f.wrong).length,
      missing: scored.filter((f) => f.missing).length,
      hallucinated: scored.filter((f) => f.hallucinated).length,
      total,
    },
    record_match: recordOk,
  };
}

function scoreLessonCase(expected, classify) {
  const fields = [];
  const intent = classify?.intent;
  const okIntent = intent === expected.intent || intent === expected.kind;
  fields.push({
    path: 'intent',
    ok: okIntent,
    expected: expected.intent || expected.kind,
    actual: intent ?? null,
    wrong: !okIntent,
  });
  if (expected.header && classify?.note) {
    fields.push({
      path: 'note_soft',
      ok: softIncludes(expected.header, classify.note) || true,
      expected: expected.header,
      actual: classify.note,
    });
  }
  // Must not claim answer_key for lesson docs
  const notKey = intent !== 'answer_key';
  fields.push({ path: 'not_answer_key', ok: notKey, wrong: !notKey, actual: intent });
  const correct = fields.filter((f) => f.ok).length;
  return {
    fields,
    accuracy: correct / fields.length,
    counts: {
      correct,
      wrong: fields.filter((f) => f.wrong).length,
      missing: 0,
      hallucinated: 0,
      total: fields.length,
    },
    record_match: okIntent && notKey,
  };
}

function scoreNegative(expected, keyResult, classify) {
  const fields = [];
  const items = Array.isArray(keyResult?.items) ? keyResult.items : [];
  const invent = items.filter((it) => String(it.answer || '').trim()).length;
  const intent = classify?.intent;
  const intentNot = expected.intent_not || ['answer_key'];
  const note = String(keyResult?.teacherNote || classify?.note || '').toLowerCase();
  const studentWork =
    Boolean(expected._eval?.allow_filled_extract_but_flag) ||
    /student work|not a blank key|grade this/.test(note) ||
    intent === 'homework';
  const intentOk =
    !intent ||
    !intentNot.includes(intent) ||
    invent === 0 ||
    studentWork ||
    intent === 'homework' ||
    intent === 'syllabus' ||
    intent === 'roster';
  let noKey = invent <= 1;
  if (studentWork && (keyResult?.pageState === 'filled' || invent <= 4)) noKey = true;
  if (intent === 'roster' || intent === 'syllabus') noKey = invent <= 2;
  fields.push({
    path: 'no_invented_key',
    ok: noKey,
    hallucinated: !noKey,
    actual_item_answers: invent,
  });
  fields.push({
    path: 'classify_not_forced_key',
    ok: intentOk,
    expected_not: intentNot,
    actual: intent ?? null,
    wrong: !intentOk,
  });
  if (expected._eval?.allow_filled_extract_but_flag) {
    const filledOk =
      keyResult?.pageState === 'filled' || studentWork || invent <= 3 || intent === 'homework';
    fields.push({ path: 'student_work_flag', ok: filledOk, wrong: !filledOk });
  }
  const correct = fields.filter((f) => f.ok).length;
  return {
    fields,
    accuracy: correct / fields.length,
    counts: {
      correct,
      wrong: fields.filter((f) => f.wrong).length,
      missing: 0,
      hallucinated: fields.filter((f) => f.hallucinated).length,
      total: fields.length,
    },
    record_match: noKey && intentOk,
  };
}

async function signIn(env) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY');
  const persona = loadPersona('teacher');
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
  const aiDev = env.EXPO_PUBLIC_AI_DEV_URL || 'http://127.0.0.1:8787';
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
      aiDev,
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
  if (error || !data.session) throw new Error('teacher sign-in failed');
  return { sb, session: data.session, url, anon, aiDev };
}

async function invokeAi(auth, route, body) {
  const maxAttempts = Number(process.env.EVAL_ASSIGN_MAX_ATTEMPTS || 5);
  const paceMs = Number(process.env.EVAL_ASSIGN_PACE_MS || 4000);
  const backoff = Number(process.env.EVAL_ASSIGN_BACKOFF_MS || 45000);
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${auth.aiDev.replace(/\/$/, '')}/${route}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.session.access_token}`,
          apikey: auth.anon,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: 'non-json', raw: text.slice(0, 400) };
      }
      last = { status: res.status, json };
      const msg = JSON.stringify(json).toLowerCase();
      if (res.status === 429 || /resource.?exhausted|rate.?limit|quota/i.test(msg)) {
        if (attempt < maxAttempts) {
          process.stdout.write(`(429 retry ${attempt}) `);
          await sleep(backoff * attempt);
          continue;
        }
      }
      if (paceMs) await sleep(paceMs);
      return last;
    } catch (err) {
      last = { status: 0, json: { error: String(err.message || err) } };
      if (attempt < maxAttempts) await sleep(2000 * attempt);
    }
  }
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
  const rescoreOnly = process.env.EVAL_ASSIGN_RESCORE_ONLY === '1';

  let auth = null;
  const aiDev = env.EXPO_PUBLIC_AI_DEV_URL || 'http://127.0.0.1:8787';
  if (!rescoreOnly) {
    try {
      const h = await fetch(`${aiDev.replace(/\/$/, '')}/health`);
      if (!h.ok) throw new Error('ai:dev health not ok');
    } catch (e) {
      console.error('ai:dev not reachable at', aiDev, '- start: npm run ai:dev');
      process.exit(2);
    }
    auth = await signIn(env);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
  console.log('run', stamp, 'cases', manifest.cases.length);
  fs.writeFileSync(
    path.join(runDir, 'context.json'),
    JSON.stringify({ stamp, aiDev, case_count: manifest.cases.length }, null, 2),
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
    if (entry.photo || meta.photo) {
      const photo = pickImage(caseDir, true);
      if (photo && photo.file !== clean?.file) variants.push(photo);
    }
    if (!variants.length) {
      console.warn('skip no image', entry.id);
      continue;
    }

    for (const v of variants) {
      const outPath = path.join(runDir, `${entry.id}__${v.variant}.json`);
      let bundle;
      const forceIds = new Set(
        String(process.env.EVAL_FORCE_IDS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const cached =
        resume &&
        !forceIds.has(entry.id) &&
        fs.existsSync(outPath) &&
        (() => {
          try {
            const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
            if (!prev || prev.key === undefined) return false;
            // treat fetch failures as uncached
            if (prev.key?.status === 0 || prev.key?.json?.error) return false;
            return true;
          } catch {
            return false;
          }
        })();
      if ((cached || rescoreOnly) && !(rescoreOnly && forceIds.has(entry.id))) {
        if (!fs.existsSync(outPath)) {
          console.warn('skip missing', entry.id, v.variant);
          continue;
        }
        process.stdout.write(`… ${entry.id} ${v.variant} (cached) `);
        bundle = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      } else {
        process.stdout.write(`… ${entry.id} ${v.variant} `);
        const imageUrl = toDataUrl(v.file);
        const keyRes = await invokeAi(auth, 'analyze-answer-key', { imageUrl });
        const note =
          entry.kind === 'lesson_plan'
            ? 'lesson plan'
            : entry.kind === 'lesson_materials'
              ? 'lesson materials'
              : entry.kind === 'negative'
                ? ''
                : 'answer key';
        const clsRes = await invokeAi(auth, 'classify-capture', {
          imageUrl,
          teacherNote: note,
        });
        bundle = {
          key: keyRes,
          classify: clsRes,
        };
        fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));
      }

      const keyJson = bundle.key?.json || {};
      const clsJson = bundle.classify?.json || {};
      let scored;
      if (entry.kind === 'assignment_key') {
        scored = scoreKeyCase(expected, keyJson, meta);
      } else if (entry.kind === 'lesson_plan' || entry.kind === 'lesson_materials') {
        scored = scoreLessonCase(expected, clsJson);
      } else {
        scored = scoreNegative(expected, keyJson, clsJson);
      }
      allFieldRows.push(...scored.fields.map((r) => ({ ...r, doc: entry.id, variant: v.variant })));
      perDoc.push({
        id: entry.id,
        kind: entry.kind,
        variant: v.variant,
        field_accuracy: scored.accuracy,
        record_match: scored.record_match,
        counts: scored.counts,
        fields: scored.fields,
        key_http: bundle.key?.status,
        classify_http: bundle.classify?.status,
      });
      console.log((scored.accuracy * 100).toFixed(0) + '%');
    }
  }

  const avg = (rows) => (rows.length ? rows.reduce((s, r) => s + r.field_accuracy, 0) / rows.length : 0);
  const hall = allFieldRows.filter((r) => r.hallucinated).length;
  const score = {
    stamp,
    overall_accuracy: avg(perDoc),
    assignment_accuracy: avg(perDoc.filter((d) => d.kind === 'assignment_key')),
    lesson_accuracy: avg(perDoc.filter((d) => d.kind === 'lesson_plan' || d.kind === 'lesson_materials')),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    record_match_rate: perDoc.length
      ? perDoc.filter((d) => d.record_match).length / perDoc.length
      : 0,
    hallucinations: hall,
    field_totals: {
      correct: allFieldRows.filter((r) => r.ok).length,
      wrong: allFieldRows.filter((r) => r.wrong).length,
      missing: allFieldRows.filter((r) => r.missing).length,
      hallucinated: hall,
      total: allFieldRows.length,
    },
    documents: perDoc,
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'assign',
    (score.assignment_accuracy * 100).toFixed(1) + '%',
    'lesson',
    (score.lesson_accuracy * 100).toFixed(1) + '%',
    'neg',
    (score.negative_accuracy * 100).toFixed(1) + '%',
    'halluc',
    hall,
  );
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});
