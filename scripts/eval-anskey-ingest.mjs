#!/usr/bin/env node
/**
 * Live answer-key ingest eval against local ai:dev analyze-answer-key.
 *   node scripts/eval-anskey-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/anskey-ingest');

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startFileServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      const rel = decodeURIComponent((req.url || '/').replace(/^\//, ''));
      const fp = path.normalize(path.join(rootDir, rel));
      if (!fp.startsWith(rootDir) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      res.writeHead(200, { 'Content-Type': mimeFor(fp) });
      fs.createReadStream(fp).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err.message || err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        urlFor(absPath) {
          const rel = path.relative(rootDir, absPath).split(path.sep).join('/');
          return `http://127.0.0.1:${port}/${rel}`;
        },
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function normAns(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[.)\]]+$/g, '')
    .replace(/^(?:answer\s*[:=]\s*)/i, '')
    .replace(/^[a-e]\)\s*/i, '')
    .replace(/[^a-z0-9/.+-]+/g, '')
    .trim();
}

function answersMatch(exp, act) {
  const e = normAns(exp);
  const a = normAns(act);
  if (!e && !a) return true;
  if (!e || !a) return false;
  if (e === a) return true;
  if (e.includes(a) || a.includes(e)) return true;
  const tf = { true: 't', t: 't', yes: 't', y: 't', false: 'f', f: 'f', no: 'f', n: 'f' };
  if (tf[e] && tf[a] && tf[e] === tf[a]) return true;
  return false;
}

function headersMatch(exp, act) {
  if (exp == null || exp === '') return true;
  if (act == null) return false;
  const e = String(exp).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const a = String(act).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!e) return true;
  if (e === a || e.includes(a) || a.includes(e)) return true;
  // handwritten headers: word spacing is ambiguous ("Bio Ch." vs "BIOCH.")
  const es = e.replace(/ /g, '');
  const as = a.replace(/ /g, '');
  return Boolean(as) && (es === as || es.includes(as) || as.includes(es));
}

// scoreCase + main below

function scoreCase(expected, actual, meta) {
  const results = [];
  const negative = Boolean(meta.negative || expected.reject);

  if (negative) {
    const items = Array.isArray(actual?.items) ? actual.items : [];
    const withAns = items.filter((it) => String(it?.answer ?? '').trim());
    const rejected =
      actual?.reject === true ||
      actual?.notAnswerKey === true ||
      /not[_ ]?answer[_ ]?key|wrong document|reject|not a key/i.test(
        JSON.stringify(actual?.warnings || actual?.teacherNote || ''),
      );
    if (withAns.length === 0 || rejected) {
      results.push({ path: 'negative.handled', verdict: 'correct' });
    } else {
      results.push({
        path: 'negative.handled',
        verdict: 'wrong',
        detail: `invented ${withAns.length} answers on negative`,
      });
      for (const it of withAns) {
        results.push({ path: `item.${it.n}.answer`, verdict: 'hallucinated', actual: it.answer });
      }
    }
    return results;
  }

  const expPs = expected.pageState;
  const actPs = actual?.pageState;
  if (expPs) {
    if (actPs === expPs) results.push({ path: 'pageState', verdict: 'correct' });
    else if (meta.soft_page_state && actPs) {
      results.push({ path: 'pageState', verdict: 'correct', detail: 'soft' });
    } else if (!actPs) results.push({ path: 'pageState', verdict: 'missing' });
    else results.push({ path: 'pageState', verdict: 'wrong', expected: expPs, actual: actPs });
  }

  if (expected.header) {
    if (headersMatch(expected.header, actual?.header)) {
      results.push({ path: 'header', verdict: 'correct' });
    } else if (!actual?.header) results.push({ path: 'header', verdict: 'missing' });
    else results.push({ path: 'header', verdict: 'wrong', expected: expected.header, actual: actual.header });
  }

  if (expected.maxScore != null) {
    const ms = actual?.maxScore;
    if (typeof ms === 'number' && Math.abs(ms - expected.maxScore) <= 1) {
      results.push({ path: 'maxScore', verdict: 'correct' });
    } else if (ms == null) results.push({ path: 'maxScore', verdict: 'missing' });
    else results.push({ path: 'maxScore', verdict: 'wrong', expected: expected.maxScore, actual: ms });
  }

  const expItems = Array.isArray(expected.items) ? expected.items : [];
  const actItems = Array.isArray(actual?.items) ? actual.items : [];
  const actByN = new Map(actItems.map((it) => [Number(it.n), it]));

  for (const ei of expItems) {
    const ai = actByN.get(Number(ei.n));
    if (!ai) {
      // optional: item cut at crop edge; accept_absent: borderline legible; legibility: obscured
      // (glare/occlusion) — omitting these is not penalized (reader should not guess).
      if (ei.optional || ei.accept_absent || ei.legibility) {
        results.push({ path: `item.${ei.n}`, verdict: 'correct', detail: 'absent-ok' });
      } else {
        results.push({ path: `item.${ei.n}`, verdict: 'missing' });
      }
      continue;
    }
    results.push({ path: `item.${ei.n}.present`, verdict: 'correct' });
    const expAns = String(ei.answer ?? '').trim();
    const actAns = String(ai.answer ?? '').trim();
    if (ei.accept_absent && expAns && (!actAns || ai.needsTeacher === true) && !answersMatch(expAns, actAns)) {
      results.push({ path: `item.${ei.n}.answer`, verdict: 'correct', detail: 'abstain-ok' });
    } else if (ei.needsTeacher || meta.no_hallucinate_answers) {
      if (!expAns) {
        if (!actAns || ai.needsTeacher) {
          results.push({ path: `item.${ei.n}.answer`, verdict: 'correct', detail: 'needsTeacher' });
        } else {
          results.push({ path: `item.${ei.n}.answer`, verdict: 'hallucinated', actual: actAns });
        }
      } else if (answersMatch(expAns, actAns)) {
        results.push({ path: `item.${ei.n}.answer`, verdict: 'correct' });
      } else {
        results.push({ path: `item.${ei.n}.answer`, verdict: 'wrong', expected: expAns, actual: actAns });
      }
    } else if (answersMatch(expAns, actAns)) {
      results.push({ path: `item.${ei.n}.answer`, verdict: 'correct' });
    } else if (!actAns) {
      results.push({ path: `item.${ei.n}.answer`, verdict: 'missing' });
    } else {
      results.push({ path: `item.${ei.n}.answer`, verdict: 'wrong', expected: expAns, actual: actAns });
    }
    if (ei.points != null && ei.points !== 1) {
      const ap = Number(ai.points ?? 1);
      if (ap === Number(ei.points)) results.push({ path: `item.${ei.n}.points`, verdict: 'correct' });
      else results.push({ path: `item.${ei.n}.points`, verdict: 'wrong', expected: ei.points, actual: ap });
    }
  }

  if (meta.no_hallucinate_extra_items || meta.stated_count) {
    for (const ai of actItems) {
      if (!expItems.some((e) => Number(e.n) === Number(ai.n)) && String(ai.answer ?? '').trim()) {
        results.push({ path: `item.${ai.n}.answer`, verdict: 'hallucinated', actual: ai.answer });
      }
    }
  }
  return results;
}

function summarize(rows) {
  const counts = { correct: 0, wrong: 0, missing: 0, hallucinated: 0 };
  for (const r of rows) {
    if (counts[r.verdict] != null) counts[r.verdict] += 1;
  }
  const scored = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, scored, accuracy: scored ? counts.correct / scored : 0 };
}

/** Category rollup: field accuracy (mean per doc), item-level answer accuracy, hallucinations. */
function byCategory(perDoc, rows) {
  const groups = {
    clean: (c) => c === 'clean' || c === 'clean_photo',
    rough: (c) => c === 'rough',
    handwritten: (c) => c === 'handwritten_clean' || c === 'handwritten_rough',
    negative: (c) => c === 'negative',
    clean_photo: (c) => c === 'clean_photo',
    handwritten_clean: (c) => c === 'handwritten_clean',
    handwritten_rough: (c) => c === 'handwritten_rough',
  };
  const out = {};
  for (const [name, test] of Object.entries(groups)) {
    const docs = perDoc.filter((d) => test(d.category));
    if (!docs.length) continue;
    const rr = rows.filter((r) => test(r.category));
    const itemRows = rr.filter((r) => /^item\.\d+(\.answer)?$/.test(r.path));
    const correct = itemRows.filter((r) => r.verdict === 'correct').length;
    out[name] = {
      docs: docs.length,
      field_accuracy: docs.reduce((s, d) => s + d.field_accuracy, 0) / docs.length,
      item_answer_correct: correct,
      item_answer_total: itemRows.length,
      item_answer_accuracy: itemRows.length ? correct / itemRows.length : 0,
      hallucinated: rr.filter((r) => r.verdict === 'hallucinated').length,
      wrong: rr.filter((r) => r.verdict === 'wrong').length,
      missing: rr.filter((r) => r.verdict === 'missing').length,
    };
  }
  return out;
}

// auth + main below

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
  if (!handleRes.ok || !handlePayload?.access_token) throw new Error('teacher sign-in failed');
  return { url, anon, access_token: handlePayload.access_token };
}

function aiBase(env) {
  return (env.ANSKEY_AI_URL || env.EXPO_PUBLIC_AI_DEV_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
}

async function invokeAnalyze({ aiUrl, token, imageUrl }) {
  const res = await fetch(`${aiUrl}/analyze-answer-key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl }),
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

function variantImage(caseDir, variant) {
  const file = path.join(caseDir, { clean: 'clean.png', photo: 'photo.jpg', rough: 'rough.jpg' }[variant] || '');
  return fs.existsSync(file) ? { file, variant } : null;
}

function caseCategory(entry, meta, variant) {
  if (meta.negative || entry.negative) return 'negative';
  if (meta.handwritten || entry.handwritten) return variant === 'rough' ? 'handwritten_rough' : 'handwritten_clean';
  if (variant === 'rough') return 'rough';
  return variant === 'photo' ? 'clean_photo' : 'clean';
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
  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
  const only = (process.env.EVAL_ANSKEY_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (only.length) manifest.cases = manifest.cases.filter((c) => only.includes(c.id));
  const auth = await signIn(env);
  const aiUrl = aiBase(env);
  try {
    const probe = await fetch(aiUrl + '/');
    console.log('ai', aiUrl, 'probe', probe.status);
  } catch (err) {
    throw new Error(`ai:dev not reachable at ${aiUrl}: ${err.message}`);
  }
  const files = await startFileServer(CORPUS);
  console.log('run', stamp, 'cases', manifest.cases.length, 'ai', aiUrl);
  const paceMs = Number(process.env.EVAL_ANSKEY_PACE_MS || 2500);
  const perDoc = [];
  const allFieldRows = [];
  try {
    for (const entry of manifest.cases) {
      const caseDir = path.join(CORPUS, entry.id);
      const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
      let meta = {};
      const metaPath = path.join(caseDir, 'eval-meta.json');
      if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const variants = [];
      if (Array.isArray(meta.eval_variants) && meta.eval_variants.length) {
        for (const vName of meta.eval_variants) {
          const v = variantImage(caseDir, vName);
          if (v) variants.push(v);
          else console.warn('missing variant image', entry.id, vName);
        }
      } else {
        const clean = pickImage(caseDir, false);
        if (clean) variants.push(clean);
        if (meta.photo || entry.photo) {
          const photo = pickImage(caseDir, true);
          if (photo && photo.file !== clean?.file) variants.push(photo);
        }
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
              return prev?.json && !prev.json.error;
            } catch {
              return false;
            }
          })();
        if (existingOk) {
          process.stdout.write(`... ${entry.id} ${v.variant} (cached) `);
          result = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        } else {
          process.stdout.write(`... ${entry.id} ${v.variant} `);
          const buf = fs.readFileSync(v.file);
          const imageUrl = `data:${mimeFor(v.file)};base64,${buf.toString('base64')}`;
          try {
            result = await invokeAnalyze({
              aiUrl,
              token: auth.access_token,
              imageUrl,
            });
          } catch (err) {
            result = { status: 0, json: { error: String(err.message || err) } };
          }
          fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
          if (paceMs > 0) await sleep(paceMs);
        }
        const actual = result.json || {};
        // clean variant of a rough handwritten case may have fuller truth (nothing obscured)
        const cleanExpPath = path.join(caseDir, 'expected.clean.json');
        const exp =
          v.variant === 'clean' && fs.existsSync(cleanExpPath)
            ? JSON.parse(fs.readFileSync(cleanExpPath, 'utf8'))
            : expected;
        const fieldScores = scoreCase(exp, actual, meta);
        const sum = summarize(fieldScores);
        allFieldRows.push(
          ...fieldScores.map((r) => ({ ...r, doc: entry.id, variant: v.variant, category: caseCategory(entry, meta, v.variant) })),
        );
        perDoc.push({
          id: entry.id,
          kind: entry.kind || meta.kind,
          variant: v.variant,
          category: caseCategory(entry, meta, v.variant),
          http_status: result.status,
          field_accuracy: sum.accuracy,
          counts: sum.counts,
          fields: fieldScores,
          item_count_actual: Array.isArray(actual.items) ? actual.items.length : 0,
        });
        console.log((sum.accuracy * 100).toFixed(0) + '%');
      }
    }
  } finally {
    await files.close();
  }
  const avg = (rows) => (rows.length ? rows.reduce((s, r) => s + r.field_accuracy, 0) / rows.length : 0);
  const score = {
    stamp,
    ai_url: aiUrl,
    overall_accuracy: avg(perDoc),
    answer_key_accuracy: avg(perDoc.filter((d) => d.kind !== 'negative')),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    documents: perDoc,
    field_totals: summarize(allFieldRows).counts,
    by_category: byCategory(perDoc, allFieldRows),
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  const mirror = path.join('/tmp/anskey-ingest-eval', stamp);
  fs.mkdirSync(mirror, { recursive: true });
  fs.copyFileSync(path.join(runDir, 'score.json'), path.join(mirror, 'score.json'));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'key',
    (score.answer_key_accuracy * 100).toFixed(1) + '%',
    'neg',
    (score.negative_accuracy * 100).toFixed(1) + '%',
    'halluc',
    score.field_totals.hallucinated,
  );
  for (const [cat, c] of Object.entries(score.by_category)) {
    console.log(
      `  ${cat.padEnd(18)} docs ${String(c.docs).padStart(2)}  field ${(c.field_accuracy * 100).toFixed(1)}%  items ${(c.item_answer_accuracy * 100).toFixed(1)}% (${c.item_answer_correct}/${c.item_answer_total})  halluc ${c.hallucinated}`,
    );
  }
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});
