#!/usr/bin/env node
/**
 * Starter evals (10-20 cases each) for the AI routes that had none:
 *   ask (ask-assistant), setup-interview, explain (explain-capture), practice (generate-practice),
 *   review (shared review prompt on the strong tier).
 * Suites live in notes/qa-fixtures/ai-starter/<suite>.json. Each case lists rubric checks; a case
 * passes when every check passes. Every call records latencyMs.
 *
 *   node scripts/eval-ai-starter.mjs                 # all suites, Edge (default)
 *   EVAL_SUITE=ask,practice node scripts/eval-ai-starter.mjs
 *   EVAL_TARGET=dev node scripts/eval-ai-starter.mjs # local ai:dev
 *
 * Stops on a Gemini daily-quota error (no retries) and marks the run partial.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  callAi,
  isDailyQuotaError,
  latencyStats,
  loadEvalEnv,
  resolveAiTarget,
  signInPersona,
} from './lib/eval-target.mjs';
import { buildAskInstructions } from '../src/lib/ai/askPrompt.ts';
import { submissionReviewPrompt } from '../supabase/functions/_shared/aiPrompts.ts';
import { keyedScore, reconcileDraftScore } from '../supabase/functions/_shared/reviewScore.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'notes/qa-fixtures/ai-starter');
const FIXTURES = path.join(ROOT, 'notes/qa-fixtures');
const SUITES = ['ask', 'setup-interview', 'explain', 'practice', 'review'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(obj, dotted) {
  return String(dotted)
    .split('.')
    .reduce((v, k) => (v == null ? undefined : v[k]), obj);
}

/** First {...} object in a model reply (review suite returns JSON inside Ask text). */
export function firstJsonObject(text) {
  const s = String(text ?? '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toDataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

/** Text the rubric reads for one suite's response. */
function replyText(suite, json) {
  if (!json || typeof json !== 'object') return '';
  if (suite === 'ask' || suite === 'review') return String(json.text ?? '');
  if (suite === 'setup-interview') return JSON.stringify(json.extraction ?? {});
  if (suite === 'explain') return JSON.stringify(json.explain_draft ?? {});
  if (suite === 'practice') return JSON.stringify(json.items ?? []);
  return JSON.stringify(json);
}

const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const lower = (t) => String(t ?? '').toLowerCase();

/** Items + answers back out of formatWork-shaped text ("1. prompt / Expected: k / Student: s"). */
export function parseWorkText(work) {
  const items = [];
  const answers = {};
  for (const line of String(work ?? '').split('\n')) {
    const item = /^(\d+)\.\s/.exec(line);
    if (item) {
      items.push({ id: `item-${item[1]}` });
      continue;
    }
    const cur = items[items.length - 1];
    if (!cur) continue;
    const exp = /^\s+Expected:\s*(.*)$/.exec(line);
    if (exp) cur.answerKey = exp[1].trim();
    const stu = /^\s+Student:\s*(.*)$/.exec(line);
    if (stu) answers[cur.id] = stu[1].trim() === '(blank)' ? '' : stu[1].trim();
  }
  return { items, answers };
}

/** @returns {Array<{ name: string, pass: boolean, detail?: string }>} */
export function runChecks(suite, checks, res, c = {}) {
  const out = [];
  const add = (name, pass, detail) => out.push({ name, pass: Boolean(pass), ...(detail ? { detail } : {}) });
  const json = res.json ?? {};
  const text = replyText(suite, json);
  const t = lower(text);
  const status = checks.status ?? 200;
  add('status', res.status === status, `got ${res.status}`);
  if (checks.textIncludesAny) add('includesAny', checks.textIncludesAny.some((k) => t.includes(lower(k))));
  if (checks.textIncludesAll) add('includesAll', checks.textIncludesAll.every((k) => t.includes(lower(k))));
  if (checks.textExcludes) {
    const hit = checks.textExcludes.filter((k) => t.includes(lower(k)));
    add('excludes', hit.length === 0, hit.join(','));
  }
  if (checks.textExcludesRegex) add('excludesRegex', !new RegExp(checks.textExcludesRegex, 'i').test(text));
  if (checks.maxWords) add('maxWords', words(text) <= checks.maxWords, `${words(text)} words`);
  for (const [p, v] of Object.entries(checks.jsonEquals ?? {})) add(`eq ${p}`, get(json, p) === v, `got ${JSON.stringify(get(json, p))}`);
  for (const [p, v] of Object.entries(checks.jsonNotEquals ?? {})) add(`ne ${p}`, get(json, p) !== v, `got ${JSON.stringify(get(json, p))}`);

  if (suite === 'setup-interview') {
    const slots = Array.isArray(json.extraction?.slots) ? json.extraction.slots : [];
    const paths = slots.map((s) => String(s?.path ?? ''));
    for (const p of checks.slotPaths ?? []) add(`slot ${p}`, paths.includes(p), paths.join(','));
    for (const [p, v] of Object.entries(checks.slotValues ?? {})) {
      const slot = slots.find((s) => s?.path === p);
      add(`slot ${p}~${v}`, slot != null && lower(JSON.stringify(slot.value)).includes(lower(v)), JSON.stringify(slot?.value));
    }
    if (checks.slotCountMax != null) add('slotCountMax', slots.length <= checks.slotCountMax, `${slots.length}`);
    if (checks.slotCountMin != null) add('slotCountMin', slots.length >= checks.slotCountMin, `${slots.length}`);
  }
  if (suite === 'explain') {
    const steps = Array.isArray(json.explain_draft?.steps) ? json.explain_draft.steps : [];
    add('steps 3-8', steps.length >= (checks.stepsMin ?? 3) && steps.length <= (checks.stepsMax ?? 8), `${steps.length}`);
    add('ephemeral (no write)', json.parked === false, `parked=${json.parked}`);
  }
  if (suite === 'practice') {
    const items = Array.isArray(json.items) ? json.items : [];
    add('items count', items.length >= (checks.itemsMin ?? 4) && items.length <= (checks.itemsMax ?? 6), `${items.length}`);
    for (const k of checks.itemsHave ?? []) add(`items.${k}`, items.length > 0 && items.every((it) => String(it?.[k] ?? '').trim()));
  }
  if (suite === 'review') {
    const r = firstJsonObject(json.text);
    add('json reply', r != null);
    const gaps = Array.isArray(r?.gaps) ? r.gaps.filter((g) => String(g?.label ?? '').trim()) : [];
    const items = Array.isArray(r?.items) ? r.items : [];
    const modelScore = typeof r?.draftScore === 'number' ? r.draftScore : null;
    // Same post-processing review-submission applies before saving the draft.
    const { items: keyed, answers } = parseWorkText(c.work);
    const score = reconcileDraftScore(modelScore, keyedScore(keyed, answers));
    if (checks.gapsMin != null) add('gapsMin', gaps.length >= checks.gapsMin, `${gaps.length}`);
    if (checks.gapsMax != null) add('gapsMax', gaps.length <= checks.gapsMax, `${gaps.length}`);
    if (checks.itemsMin != null) add('itemsMin', items.length >= checks.itemsMin, `${items.length}`);
    if (checks.itemsMax != null) add('itemsMax', items.length <= checks.itemsMax, `${items.length}`);
    if (checks.scoreMin != null) add('scoreMin', score != null && score >= checks.scoreMin, `${score}`);
    if (checks.scoreMax != null) add('scoreMax', score == null || score <= checks.scoreMax, `${score}`);
    if (checks.gapAny) add('gapAny', gaps.some((g) => checks.gapAny.some((k) => lower(g.label).includes(lower(k)))), gaps.map((g) => g.label).join(';'));
    if (checks.excludes) {
      const blob = lower(JSON.stringify(r ?? {}));
      add('noNames', !checks.excludes.some((k) => blob.includes(lower(k))));
    }
  }
  return out;
}

function bodyFor(suite, spec, c) {
  if (suite === 'ask') {
    const instructions = buildAskInstructions({
      role: c.persona === 'student' ? 'student' : 'teacher',
      toolNames: [],
      context: {
        role: c.persona === 'student' ? 'student' : 'teacher',
        displayName: null,
        handle: null,
        classId: null,
        className: null,
        classCount: 1,
        studentId: null,
        screen: 'home',
      },
    });
    return { instructions, input: [{ role: 'user', content: c.q }] };
  }
  if (suite === 'setup-interview') return { kind: 'syllabus', classId: spec.classId, userText: c.text, session: null };
  if (suite === 'explain') {
    return { captureId: spec.anchorCaptureId, classId: spec.classId, imageUrl: toDataUrl(path.join(FIXTURES, c.fixture)) };
  }
  if (suite === 'practice') return { skillLabel: c.skillLabel };
  if (suite === 'review') {
    return { instructions: '', input: [{ role: 'user', content: `${submissionReviewPrompt}\n\n${c.work}` }] };
  }
  throw new Error(`unknown suite ${suite}`);
}

async function main() {
  const env = loadEvalEnv();
  const target = resolveAiTarget(env);
  const want = String(process.env.EVAL_SUITE || '').split(',').map((s) => s.trim()).filter(Boolean);
  const suites = want.length ? want : SUITES;
  const only = String(process.env.EVAL_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  const paceMs = Number(process.env.EVAL_STARTER_PACE_MS || 3000);
  const stamp = (process.env.EVAL_RESUME_STAMP || '').trim() || new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const runDir = path.join(DIR, 'runs', stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const sessions = {};
  const session = async (persona) => (sessions[persona] ??= await signInPersona(env, persona));
  const summary = { stamp, target: target.kind, suites: {}, partial_quota_stop: false };
  console.log('run', stamp, target.label, suites.join(','));

  outer: for (const suite of suites) {
    const spec = JSON.parse(fs.readFileSync(path.join(DIR, `${suite}.json`), 'utf8'));
    const rows = [];
    for (const c of spec.cases) {
      if (only.length && !only.includes(c.id)) continue;
      const persona = c.persona || spec.persona || 'teacher';
      const auth = await session(persona);
      const res = await callAi(target, spec.fn, bodyFor(suite, spec, c), auth, { timeoutMs: 120000 });
      const checks = runChecks(suite, c.checks ?? {}, res, c);
      const passed = checks.filter((k) => k.pass).length;
      const row = {
        id: c.id,
        persona,
        status: res.status,
        latencyMs: res.latencyMs,
        pass: passed === checks.length,
        check_score: checks.length ? passed / checks.length : 0,
        checks,
        reply: replyText(suite, res.json).slice(0, 1500),
        error: res.json?.error ?? null,
      };
      rows.push(row);
      console.log(`  ${suite} ${c.id} ${row.pass ? 'PASS' : 'FAIL'} ${passed}/${checks.length} ${res.status} ${res.latencyMs}ms${row.pass ? '' : ' ' + checks.filter((k) => !k.pass).map((k) => k.name).join(',')}`);
      if (isDailyQuotaError(res.json?.error)) {
        summary.partial_quota_stop = true;
        console.warn('Gemini daily quota hit — stopping (partial run).');
        fs.writeFileSync(path.join(runDir, `${suite}.json`), JSON.stringify(rows, null, 2));
        summary.suites[suite] = tally(rows);
        break outer;
      }
      if (paceMs) await sleep(paceMs);
    }
    fs.writeFileSync(path.join(runDir, `${suite}.json`), JSON.stringify(rows, null, 2));
    summary.suites[suite] = tally(rows);
  }
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(summary, null, 2));
  console.log('score', path.join(runDir, 'score.json'));
  for (const [s, t] of Object.entries(summary.suites)) {
    console.log(`  ${s.padEnd(16)} pass ${t.passed}/${t.n} (${(t.pass_rate * 100).toFixed(0)}%) checks ${(t.check_rate * 100).toFixed(1)}% latency p50 ${t.latency_ms?.p50 ?? '-'}ms p90 ${t.latency_ms?.p90 ?? '-'}ms`);
  }
}

function tally(rows) {
  const n = rows.length;
  const passed = rows.filter((r) => r.pass).length;
  return {
    n,
    passed,
    pass_rate: n ? passed / n : 0,
    check_rate: n ? rows.reduce((s, r) => s + r.check_score, 0) / n : 0,
    latency_ms: latencyStats(rows.map((r) => r.latencyMs)),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('eval failed:', err.message || err);
    process.exit(1);
  });
}
