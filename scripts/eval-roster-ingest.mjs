#!/usr/bin/env node
/**
 * Live roster extract evaluation against local extract-roster (ai:dev).
 *   node scripts/eval-roster-ingest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = process.env.EVAL_CORPUS ? path.resolve(process.env.EVAL_CORPUS) : path.join(ROOT, 'notes/qa-fixtures/roster-ingest');
const AI_URL = (process.env.AI_DEV_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

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

async function signInTeacher(env) {
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
  if (!handleRes.ok || !handlePayload?.access_token) {
    throw new Error('teacher sign-in failed');
  }
  return { access_token: handlePayload.access_token, url, anon };
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
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseFlip(lastFirst) {
  const m = String(lastFirst || '').match(/^([^,]+),\s*(.+)$/);
  if (!m) return lastFirst;
  return `${m[2].trim()} ${m[1].trim()}`;
}

function namesMatch(exp, act) {
  const e = normName(exp);
  const a = normName(act);
  if (!e || !a) return false;
  if (e === a) return true;
  const ef = normName(titleCaseFlip(exp));
  const af = normName(titleCaseFlip(act));
  if (e === af || ef === a || ef === af) return true;
  const es = new Set(e.split(' ').filter(Boolean));
  const as = new Set(a.split(' ').filter(Boolean));
  if (es.size && es.size === as.size && [...es].every((t) => as.has(t))) return true;
  if (es.size === 1 && as.size >= 1 && [...es][0] === [...as][0]) return true;
  if (as.size === 1 && es.size >= 1 && [...as][0] === [...es][0]) return true;
  // OCR soft: small edit distance on full string or last token
  if (editDistance(e, a) <= 2 && Math.min(e.length, a.length) >= 5) return true;
  const et = e.split(' ');
  const at = a.split(' ');
  if (et.length >= 2 && at.length >= 2 && et[0] === at[0] && editDistance(et[et.length - 1], at[at.length - 1]) <= 1) {
    return true;
  }
  if (et.length >= 2 && at.length >= 2 && et[et.length - 1] === at[at.length - 1] && editDistance(et[0], at[0]) <= 1) {
    return true;
  }
  return false;
}

function editDistance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const row = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cur = row[j];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[t.length];
}

function fieldPresent(v) {
  if (v == null) return false;
  if (typeof v === 'string' && !v.trim()) return false;
  return true;
}

function softContact(exp, act) {
  if (!exp && !act) return true;
  if (!exp || !act) return false;
  const e = normName(exp).replace(/@/g, ' ');
  const a = normName(act).replace(/@/g, ' ');
  if (e === a) return true;
  const digits = (s) => String(s).replace(/\D/g, '');
  if (digits(exp).length >= 7 && digits(act).includes(digits(exp))) return true;
  if (digits(act).length >= 7 && digits(exp).includes(digits(act))) return true;
  const et = e.split(' ').filter(Boolean);
  return et.filter((t) => t.length > 2).every((t) => a.includes(t));
}

function softId(exp, act) {
  if (!exp && !act) return true;
  if (!exp || !act) return false;
  return String(exp).replace(/\s/g, '').toLowerCase() === String(act).replace(/\s/g, '').toLowerCase();
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const name = String(row.name ?? row.display_name ?? row.studentName ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return null;
  let parent = row.parent_contact ?? row.parentContact ?? null;
  if (!parent && (row.parent_name || row.parent)) {
    const p = row.parent_name || row.parent;
    const c = row.parent_email || row.email || row.phone;
    parent = c ? `${p} <${c}>` : String(p);
  }
  return {
    name,
    student_id: row.student_id ?? row.studentId ?? row.id_number ?? row.sid ?? null,
    grade: row.grade ?? row.grade_level ?? null,
    period: row.period ?? row.period_number ?? null,
    parent_contact: parent,
    confident: row.confident !== false,
  };
}

function extractActual(payload) {
  const body = payload?.names ? payload : payload?.json ?? payload?.result ?? payload;
  const namesRaw = Array.isArray(body?.names) ? body.names : Array.isArray(body) ? body : [];
  const names = namesRaw.map(normalizeRow).filter(Boolean);
  const rejected =
    body?.rejected === true ||
    body?.document_kind_guess === 'not_roster' ||
    body?.kind === 'negative' ||
    (names.length === 0 &&
      /not.?roster|not a (class )?list/i.test(String(body?.warning || body?.error || body?.message || '')));
  return {
    names,
    rejected: Boolean(rejected),
    document_kind_guess: body?.document_kind_guess ?? null,
    warnings: body?.warnings ?? [],
    raw: body,
  };
}

function scoreCase(expected, actual, meta = {}, variant = 'clean') {
  // Honest GT for degraded images (expected._eval.rough_gt, rough variant only):
  //   absent → removed from GT (reading it anyway = invented); uncertain → not penalised if
  //   missing; uncertain_fields → null OK, a wrong value counts as a hallucination.
  // Crossed-out names (expected._eval.excluded_names) → extra (precision) but not hallucination.
  const rg = variant === 'rough' ? meta.rough_gt || {} : {};
  const absentSet = new Set((rg.absent || []).map(normName));
  const uncSet = new Set((rg.uncertain || []).map(normName));
  const uncFields = rg.uncertain_fields || {};
  const excluded = meta.excluded_names || [];
  const expAll = (expected.names || [])
    .map((r) => {
      const n = normalizeRow(r);
      return n ? { ...n, uncertain: r.uncertain === true || uncSet.has(normName(n.name)) } : null;
    })
    .filter((r) => r && !absentSet.has(normName(r.name)));
  const expNames = [...expAll.filter((r) => !r.uncertain), ...expAll.filter((r) => r.uncertain)];
  const certainCount = expAll.filter((r) => !r.uncertain).length;
  const actNames = actual.names || [];
  const negative = expected.kind === 'negative' || meta.negative;

  if (negative) {
    const emptyOk = actNames.length === 0;
    const rejectedOk = actual.rejected === true || emptyOk;
    const invented = actNames.length;
    const accuracy = emptyOk && rejectedOk ? 1 : emptyOk ? 0.7 : rejectedOk && invented <= 1 ? 0.4 : 0;
    return {
      negative: true,
      accuracy,
      name_recall: emptyOk ? 1 : 0,
      name_precision: emptyOk ? 1 : 0,
      record_f1: emptyOk ? 1 : 0,
      field_accuracy: accuracy,
      hallucinations: invented,
      matched: 0,
      missing: 0,
      extra: invented,
      fields: [
        {
          path: 'negative.reject',
          status: emptyOk && rejectedOk ? 'correct' : 'wrong',
          expected: 'empty+rejected',
          actual: `${actNames.length} names rejected=${actual.rejected}`,
        },
      ],
    };
  }

  const used = new Set();
  let matched = 0;
  let matchedUncertain = 0;
  let fieldCorrect = 0;
  let fieldTotal = 0;
  let hallucinations = 0;
  const fields = [];

  function bestMatchIndex(expName, exclude) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < actNames.length; i++) {
      if (exclude.has(i)) continue;
      if (namesMatch(expName, actNames[i].name)) {
        const d = editDistance(normName(expName), normName(actNames[i].name));
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0) return bestIdx;
    // residual OCR: closest remaining within distance 3 if tokens similar
    for (let i = 0; i < actNames.length; i++) {
      if (exclude.has(i)) continue;
      const d = editDistance(normName(expName), normName(actNames[i].name));
      const et = normName(expName).split(' ');
      const at = normName(actNames[i].name).split(' ');
      const tokenish =
        et.length === at.length ||
        (et.length === 1 && at.length === 1);
      const closeTokens =
        et.length &&
        at.length &&
        Math.min(et.length, at.length) >= 1 &&
        et.every((t, ti) => !at[ti] || editDistance(t, at[ti]) <= 2);
      if ((tokenish || closeTokens) && d <= 4 && d < bestDist && Math.min(normName(expName).length, normName(actNames[i].name).length) >= 4) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  for (const exp of expNames) {
    const bestIdx = bestMatchIndex(exp.name, used);
    if (bestIdx < 0) {
      if (exp.uncertain) {
        fields.push({ path: `name:${exp.name}`, status: 'uncertain_skipped', expected: exp.name, actual: null });
        continue;
      }
      fields.push({ path: `name:${exp.name}`, status: 'missing', expected: exp.name, actual: null });
      fieldTotal += 1;
      continue;
    }
    used.add(bestIdx);
    const act = actNames[bestIdx];
    if (exp.uncertain) {
      matchedUncertain += 1;
      fields.push({ path: `name:${exp.name}`, status: 'uncertain_read', expected: exp.name, actual: act.name });
      for (const key of ['student_id', 'grade', 'period', 'parent_contact']) {
        if (!fieldPresent(exp[key]) && fieldPresent(act[key])) {
          hallucinations += 1;
          fields.push({ path: `${key}:${exp.name}`, status: 'hallucinated', expected: null, actual: act[key] });
        }
      }
      continue;
    }
    matched += 1;
    fields.push({ path: `name:${exp.name}`, status: 'correct', expected: exp.name, actual: act.name });
    fieldTotal += 1;
    fieldCorrect += 1;

    for (const key of ['student_id', 'grade', 'period', 'parent_contact']) {
      const ev = exp[key];
      const av = act[key];
      if (!fieldPresent(ev) && !fieldPresent(av)) continue;
      if ((uncFields[exp.name] || []).includes(key)) {
        if (!fieldPresent(av)) continue;
        const same =
          key === 'parent_contact' ? softContact(ev, av) : key === 'student_id' ? softId(ev, av) : String(ev).trim() === String(av).trim();
        if (same) {
          fields.push({ path: `${key}:${exp.name}`, status: 'uncertain_read', expected: ev, actual: av });
        } else {
          fieldTotal += 1;
          hallucinations += 1;
          fields.push({ path: `${key}:${exp.name}`, status: 'guessed', expected: ev, actual: av });
        }
        continue;
      }
      fieldTotal += 1;
      if (!fieldPresent(ev) && fieldPresent(av)) {
        hallucinations += 1;
        fields.push({ path: `${key}:${exp.name}`, status: 'hallucinated', expected: null, actual: av });
        continue;
      }
      if (fieldPresent(ev) && !fieldPresent(av)) {
        fields.push({ path: `${key}:${exp.name}`, status: 'missing', expected: ev, actual: null });
        continue;
      }
      let ok = false;
      if (key === 'parent_contact') ok = softContact(ev, av);
      else if (key === 'student_id') ok = softId(ev, av);
      else ok = String(ev).trim() === String(av).trim() || normName(ev) === normName(av);
      if (ok) {
        fieldCorrect += 1;
        fields.push({ path: `${key}:${exp.name}`, status: 'correct', expected: ev, actual: av });
      } else {
        fields.push({ path: `${key}:${exp.name}`, status: 'wrong', expected: ev, actual: av });
      }
    }
  }

  let extra = 0;
  for (let i = 0; i < actNames.length; i++) {
    if (used.has(i)) continue;
    if (meta.allow_extra_partial && actNames[i].confident === false) continue;
    extra += 1;
    if (excluded.some((x) => namesMatch(x, actNames[i].name))) {
      fields.push({ path: `extra:${actNames[i].name}`, status: 'crossed_out', expected: null, actual: actNames[i].name });
      continue;
    }
    hallucinations += 1;
    const hidden = [...absentSet].some((x) => namesMatch(x, actNames[i].name));
    fields.push({ path: `extra:${actNames[i].name}`, status: hidden ? 'invented_hidden' : 'extra', expected: null, actual: actNames[i].name });
  }

  const missing = certainCount - matched;
  const okCount = matched + matchedUncertain;
  const precision = actNames.length ? okCount / (okCount + extra || 1) : certainCount === 0 ? 1 : 0;
  const recall = certainCount ? matched / certainCount : 1;
  const record_f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const field_accuracy = fieldTotal ? fieldCorrect / fieldTotal : recall;
  const accuracy = 0.6 * record_f1 + 0.4 * field_accuracy;

  return {
    negative: false,
    accuracy,
    name_recall: recall,
    name_precision: precision,
    record_f1,
    field_accuracy,
    hallucinations,
    matched,
    matched_uncertain: matchedUncertain,
    missing,
    extra,
    fields,
  };
}

// --- invoke + main ---

function roughImage(caseDir) {
  const rough = path.join(caseDir, 'rough.jpg');
  return fs.existsSync(rough) ? { file: rough, variant: 'rough' } : null;
}

function pickImage(caseDir, preferPhoto) {
  const photo = path.join(caseDir, 'photo.jpg');
  const clean = path.join(caseDir, 'clean.png');
  if (preferPhoto && fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  if (fs.existsSync(clean)) return { file: clean, variant: 'clean' };
  if (fs.existsSync(photo)) return { file: photo, variant: 'photo' };
  return null;
}

async function invokeExtract(imageUrl, accessToken) {
  const res = await fetch(`${AI_URL}/extract-roster`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
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

async function main() {
  const env = loadEnv();
  const auth = await signInTeacher(env);
  const stamp =
    (process.env.EVAL_RESUME_STAMP || '').trim() ||
    new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const runDir = path.join(CORPUS, 'runs', stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const resume = Boolean((process.env.EVAL_RESUME_STAMP || '').trim());

  try {
    await fetch(`${AI_URL}/health`);
  } catch (err) {
    console.error('ai-dev not reachable at', AI_URL, String(err.message || err));
    console.error('Start with: npm run ai:dev');
    process.exit(2);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
  console.log('run', stamp, 'cases', manifest.cases.length, 'ai', AI_URL);
  fs.writeFileSync(
    path.join(runDir, 'context.json'),
    JSON.stringify({ stamp, ai_url: AI_URL, case_count: manifest.cases.length }, null, 2),
  );

  const paceMs = Number(process.env.EVAL_ROSTER_PACE_MS || 2500);
  const perDoc = [];
  let halluTotal = 0;

  const only = (process.env.EVAL_ONLY || '').split(',').filter(Boolean);
  for (const entry of manifest.cases) {
    if (only.length && !only.includes(entry.id)) continue;
    const caseDir = path.join(CORPUS, entry.id);
    const expected = JSON.parse(fs.readFileSync(path.join(caseDir, 'expected.json'), 'utf8'));
    let meta = {};
    const metaPath = path.join(caseDir, 'eval-meta.json');
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (expected._eval) meta = { ...meta, ...expected._eval };

    const variants = [];
    const clean = pickImage(caseDir, false);
    if (clean) variants.push(clean);
    const photo = pickImage(caseDir, true);
    if (photo && photo.file !== clean?.file) variants.push(photo);
    const rough = roughImage(caseDir);
    if (rough && process.env.EVAL_SKIP_ROUGH !== '1') variants.push(rough);
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
            return prev.status === 200 && prev.json && !prev.json.error;
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
          result = await invokeExtract(toDataUrl(v.file), auth.access_token);
        } catch (err) {
          result = { status: 0, json: { error: String(err.message || err) } };
        }
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        if (paceMs > 0) await sleep(paceMs);
      }
      const actual = extractActual(result.json);
      const scored = scoreCase(expected, actual, meta, v.variant);
      halluTotal += scored.hallucinations || 0;
      perDoc.push({
        id: entry.id,
        kind: entry.kind,
        variant: v.variant,
        handwritten: Boolean(meta.handwritten),
        rough_case: Boolean(meta.rough),
        effects: meta.effects || [],
        http_status: result.status,
        accuracy: scored.accuracy,
        name_recall: scored.name_recall,
        name_precision: scored.name_precision,
        record_f1: scored.record_f1,
        field_accuracy: scored.field_accuracy,
        hallucinations: scored.hallucinations,
        matched: scored.matched,
        matched_uncertain: scored.matched_uncertain || 0,
        missing: scored.missing,
        extra: scored.extra,
        fields: scored.fields,
        actual_count: actual.names.length,
        rejected: actual.rejected,
      });
      console.log((scored.accuracy * 100).toFixed(0) + '%', `h=${scored.hallucinations}`);
    }
  }

  const avg = (rows, key = 'accuracy') =>
    rows.length ? rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length : 0;

  const score = {
    stamp,
    overall_accuracy: avg(perDoc),
    roster_accuracy: avg(perDoc.filter((d) => d.kind === 'roster')),
    negative_accuracy: avg(perDoc.filter((d) => d.kind === 'negative')),
    clean_accuracy: avg(perDoc.filter((d) => d.variant === 'clean')),
    photo_accuracy: avg(perDoc.filter((d) => d.variant === 'photo')),
    name_recall: avg(
      perDoc.filter((d) => d.kind === 'roster'),
      'name_recall',
    ),
    name_precision: avg(
      perDoc.filter((d) => d.kind === 'roster'),
      'name_precision',
    ),
    record_f1: avg(
      perDoc.filter((d) => d.kind === 'roster'),
      'record_f1',
    ),
    hallucinations_total: halluTotal,
    buckets: bucketize(perDoc),
    documents: perDoc,
  };
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  console.log(
    'overall',
    (score.overall_accuracy * 100).toFixed(1) + '%',
    'roster',
    (score.roster_accuracy * 100).toFixed(1) + '%',
    'neg',
    (score.negative_accuracy * 100).toFixed(1) + '%',
    'hallu',
    halluTotal,
  );
  console.log('bucket                n   acc    fieldAcc recF1  recall prec   hallu negPass');
  for (const [k, b] of Object.entries(score.buckets)) {
    const pct = (x) => (x == null ? '   -  ' : (x * 100).toFixed(1).padStart(5) + '%');
    console.log(
      k.padEnd(20),
      String(b.n).padStart(3),
      pct(b.accuracy),
      pct(b.field_accuracy),
      pct(b.record_f1),
      pct(b.name_recall),
      pct(b.name_precision),
      String(b.hallucinations).padStart(5),
      b.negative_pass == null ? '   -' : `${b.negative_pass}/${b.n}`,
    );
  }
}

/** clean vs mild photo vs rough vs handwritten breakdown (rosters) + negatives. */
function bucketize(docs) {
  const defs = {
    all: () => true,
    clean_print: (d) => d.kind === 'roster' && d.variant === 'clean' && !d.handwritten,
    photo_mild: (d) => d.kind === 'roster' && d.variant === 'photo',
    rough_print: (d) => d.kind === 'roster' && d.variant === 'rough' && !d.handwritten,
    handwritten_all: (d) => d.kind === 'roster' && d.handwritten,
    handwritten_clean: (d) => d.kind === 'roster' && d.handwritten && d.variant !== 'rough',
    handwritten_rough: (d) => d.kind === 'roster' && d.handwritten && d.variant === 'rough',
    rough_all: (d) => d.kind === 'roster' && d.variant === 'rough',
    negatives: (d) => d.kind === 'negative',
    negatives_rough: (d) => d.kind === 'negative' && d.variant === 'rough',
  };
  const avg = (rows, key) => (rows.length ? rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length : null);
  const out = {};
  for (const [k, f] of Object.entries(defs)) {
    const rows = docs.filter(f);
    if (!rows.length) continue;
    const neg = rows.every((r) => r.kind === 'negative');
    out[k] = {
      n: rows.length,
      accuracy: avg(rows, 'accuracy'),
      field_accuracy: neg ? null : avg(rows, 'field_accuracy'),
      record_f1: neg ? null : avg(rows, 'record_f1'),
      name_recall: neg ? null : avg(rows, 'name_recall'),
      name_precision: neg ? null : avg(rows, 'name_precision'),
      hallucinations: rows.reduce((s, r) => s + (r.hallucinations || 0), 0),
      negative_pass: neg ? rows.filter((r) => r.accuracy === 1).length : null,
    };
  }
  return out;
}

main().catch((err) => {
  console.error('eval failed:', err.message || err);
  process.exit(1);
});
