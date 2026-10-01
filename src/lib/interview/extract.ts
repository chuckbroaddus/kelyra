/**
 * Slot extraction prompt builder + JSON parser (no live AI in unit tests).
 */
import { chipsOf, getNode, has, isNodeRelevant, nodesFor } from './graph.ts';
import { isNotSure, parseLateRule } from './parseAnswers.ts';
import type { ExtractionResult, ExtractedSlot, InterviewSession, QuestionNode, TurnKind } from './types.ts';

const LEGAL_PATHS_SCHOOL = [
  'level',
  'calendar.template',
  'calendar.year_start',
  'calendar.year_end',
  'credit.policy',
  'credit.exam_exemption',
  'rollup.preset',
  'scale.default_id',
  'scale.passing_pct',
  'scale.rounding',
  'gpa.mode',
  'gpa.weighted_bonus',
  'levels.ap_points',
  'gpa.include',
  'gpa.repeat',
  'locks.map',
];

/** SyllabusWizardDraft keys (same fields the document ingest maps syllabus.* onto). */
const LEGAL_PATHS_SYLLABUS = [
  'engine',
  'categories',
  'within_category',
  'drop_lowest',
  'missing_rule',
  'floor',
  'late_rule',
  'extra_credit_method',
  'extra_credit_allowed',
  'ec_cap',
  'ceiling',
  'retake',
  'rounding',
  'term_structure',
  'book_mode',
  'exam_weight',
  'rollup_preset',
  'empty_category',
  'title',
];

const SHAPES_SYLLABUS = `Value shapes (use exactly):
engine: total_points|weighted_points_inside|weighted_percent_inside|item_weights|none
categories: [{"key":"tests","label":"Tests","weight_percent":50}] (weights must total 100)
within_category: points_inside|percent_inside
drop_lowest: {"<category key>": n} ({} = no drops)
missing_rule: zero|floor|omit (floor needs floor: number)
late_rule: {"type":"none|flat|per_day|per_hour","amount":n,"unit":"percent|points","floor_pct":n|null,"hard_deadline_days":n|null,"grace_hours":n}
extra_credit_method: A|B|C; extra_credit_allowed: boolean; ec_cap: number|null; ceiling: number|null
retake: null | {"eligible_category_ids":[],"attempts":1,"method":"replace|higher_of|average","cap":n|null,"window_days":n|null}
rounding: nearest_whole|half_up|truncate|none; floor: number|null
term_structure: quarters|semesters|year|custom; book_mode: reset_each_marking_period|rolling_year
exam_weight: number|null; rollup_preset: 2/7+1/7|40/40/20|45/45/10|85/15|50/50|year_mean|null
empty_category: renormalize|zero; title: string`;

const SHAPES_SCHOOL = `Value shapes (use exactly):
level: elementary|middle|high|college|mixed
calendar.template: tx_six_weeks|nine_weeks|trimester|college_term|elementary_year_4|elementary_year_6
calendar.year_start / calendar.year_end: YYYY-MM-DD
credit.policy: {"unit":"semester_0_5|year_1_0|none","year_link":bool,"attendance_gate":bool}
credit.exam_exemption: {"enabled":bool,"min_avg":n|null,"max_absences":n|null,"renormalize":true}
rollup.preset: 2/7+1/7|40/40/20|45/45/10|3/7+3/7+1/7|85/15|25x4|50/50|year_mean
scale.default_id: us_10|texas_with_d|texas_no_d|college_plus_minus|seven_point|esnu; scale.passing_pct: number
scale.rounding: nearest_whole|half_up|truncate
gpa.mode: off|unweighted|unweighted_and_weighted|with_rank
gpa.weighted_bonus: default|numeric_5|numeric_6|none; levels.ap_points: number
gpa.include: {"pe":bool,"athletics":bool,"pass_fail":bool,"aide":bool,"recovery":bool}
gpa.repeat: include_both|replace|average|forgive_d_f
locks.map: {"engine":bool,"categories":bool,"scale":bool,"floor":bool,"late":bool,"drop_lowest":bool,"retake":bool,"assignment_max":bool,"book_mode":bool,"rollup":bool}`;

export function legalPaths(wizard: InterviewSession['wizard']): string[] {
  return wizard === 'school' ? LEGAL_PATHS_SCHOOL : LEGAL_PATHS_SYLLABUS;
}

export function buildExtractionPrompt(
  session: InterviewSession,
  userText: string,
  pending: QuestionNode | null,
): string {
  const paths = legalPaths(session.wizard).join(', ');
  const filled = Object.entries(session.filled)
    .map(([k, v]) => `${k}=${JSON.stringify(v.value)}`)
    .join('; ');
  const pendingLine = pending
    ? `Pending node ${pending.id}: ${pending.question}\nChips: ${pending.chips.map((c) => c.label).join(' | ')}`
    : 'No pending node (review).';
  const nodes = nodesFor(session.wizard)
    .map((n) => `${n.id}[${n.paths.join('|')}]: ${n.question}`)
    .join('\n');

  return `You extract grading-setup slots for a Kelyra ${session.wizard} interview.
Return JSON only, no markdown:
{
  "turn_kind": "slot_answer|side_question|navigation|injection",
  "slots": [{"path":"legal path","value":...,"confidence":0.0,"evidence":"quote"}],
  "side_topic_key": "help.* or null",
  "navigation": "open_form|start_over|confirm|photo|null",
  "restate": "one sentence or null",
  "raw_summary": "short"
}
Legal paths: ${paths}
${session.wizard === 'school' ? SHAPES_SCHOOL : SHAPES_SYLLABUS}
${session.wizard === 'syllabus' ? 'Extra credit methods: A = no extra credit (or it only replaces low work); B = bonus points added on top of earned points; C = extra credit is its own category. "No extra credit" → extra_credit_method A + extra_credit_allowed false.\nIf within_category is percent_inside the engine is weighted_percent_inside; points_inside → weighted_points_inside.' : ''}
Already filled: ${filled || '(none)'}
${pendingLine}
Graph:
${nodes}
Rules: extract every matching slot for any legal path the teacher mentions (not only the pending one); six-weeks→tx_six_weeks; 70 passing→texas_no_d+70; AP 5.0→weighted+ap_points 5; "not sure"/"use the default" → slots [] (client applies the school default); side Q empty slots; never invent values the user did not say; never publish.
User message:
${userText}`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function safeJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizeTemplateValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const s = raw.toLowerCase().trim();
  if (/six[\s-]?week|6[\s-]?week/.test(s)) return 'tx_six_weeks';
  if (/nine[\s-]?week|9[\s-]?week|quarter/.test(s)) return 'nine_weeks';
  if (/trimester/.test(s)) return 'trimester';
  if (/semester/.test(s) && !/six/.test(s)) return 'college_term';
  return raw;
}

export function normalizeSlot(path: string, value: unknown): ExtractedSlot | null {
  if (!path) return null;
  let v = value;
  if (path === 'calendar.template') v = normalizeTemplateValue(value);
  const numeric = ['scale.passing_pct', 'levels.ap_points', 'floor', 'ec_cap', 'ceiling', 'exam_weight'];
  if (numeric.includes(path) && typeof value === 'string') {
    const n = Number(value.replace(/%/g, ''));
    if (Number.isFinite(n)) v = n;
  }
  if (path === 'late_rule') {
    if (typeof value === 'string') v = parseLateRule(value) ?? { type: 'none' };
    else if (value && typeof value === 'object') {
      const o = { ...(value as Record<string, unknown>) };
      if (o.type === 'flat_percent' || o.type === 'flat_points') {
        o.unit = o.type === 'flat_points' ? 'points' : 'percent';
        o.type = 'flat';
      }
      if (o.type === 'percent_per_day') o.type = 'per_day';
      if (o.type === 'not_accepted') {
        o.type = 'none';
        o.hard_deadline_days = 0;
      }
      if (o.amount == null && o.percent != null) o.amount = Number(o.percent);
      delete o.percent;
      delete o.max_percent;
      v = o;
    }
  }
  if (path === 'missing_rule' && value === 'floor_50') v = 'floor';
  if (path === 'extra_credit_method' && typeof value === 'string') v = value.toUpperCase();
  if (path === 'categories' && Array.isArray(value)) {
    v = value
      .filter((c) => c && typeof c === 'object')
      .map((c, i) => {
        const o = c as Record<string, unknown>;
        const label = String(o.label ?? o.name ?? `Category ${i + 1}`);
        const key = String(o.key ?? label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || `cat_${i + 1}`;
        return { key: /^[a-z]/.test(key) ? key : `cat_${key}`, label, weight_percent: Number(o.weight_percent ?? o.weight ?? 0) };
      });
  }
  return { path, value: v };
}

export function parseExtractionResponse(
  raw: unknown,
  wizard: InterviewSession['wizard'],
): ExtractionResult {
  const obj = typeof raw === 'string' ? safeJson(raw) : asRecord(raw);
  if (!obj) {
    return { turn_kind: 'slot_answer', slots: [], restate: null, navigation: null };
  }
  const kindRaw = String(obj.turn_kind ?? 'slot_answer');
  const turn_kind = (
    ['slot_answer', 'side_question', 'navigation', 'injection'].includes(kindRaw) ? kindRaw : 'slot_answer'
  ) as TurnKind;
  const legal = new Set(legalPaths(wizard));
  const slotsIn = Array.isArray(obj.slots) ? obj.slots : [];
  const slots: ExtractedSlot[] = [];
  for (const row of slotsIn) {
    const r = asRecord(row);
    if (!r) continue;
    const path = String(r.path ?? '');
    if (!legal.has(path)) continue;
    const n = normalizeSlot(path, r.value);
    if (!n) continue;
    slots.push({
      ...n,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.8,
      evidence: typeof r.evidence === 'string' ? r.evidence : null,
    });
  }
  const navRaw = obj.navigation == null ? null : String(obj.navigation);
  const navigation =
    navRaw && ['open_form', 'start_over', 'confirm', 'photo'].includes(navRaw)
      ? (navRaw as ExtractionResult['navigation'])
      : null;
  return {
    turn_kind,
    slots,
    side_topic_key: typeof obj.side_topic_key === 'string' ? obj.side_topic_key : null,
    navigation,
    restate: typeof obj.restate === 'string' ? obj.restate : null,
    raw_summary: typeof obj.raw_summary === 'string' ? obj.raw_summary : null,
  };
}

export function heuristicExtract(
  session: InterviewSession,
  userText: string,
  chipId?: string | null,
): ExtractionResult {
  const pending = session.pending_node ? getNode(session.wizard, session.pending_node) : null;
  const ctx = { wizard: session.wizard, filled: session.filled, draft: session.draft };
  if (chipId && pending) {
    const chip = chipsOf(pending, ctx).find((c) => c.id === chipId);
    if (chip?.action === 'edit') {
      return { turn_kind: 'navigation', slots: [], navigation: null, restate: chip.edit_node ?? null };
    }
    if (chip?.action === 'defaults_rest') {
      return { turn_kind: 'slot_answer', slots: [], navigation: null, restate: 'OK, I’ll use the usual choices for the rest. You can change any of them on the summary.' };
    }
    if (chip?.action === 'not_sure') {
      return { turn_kind: 'slot_answer', slots: [], navigation: null, restate: 'No problem. I’ll use the usual choice, and you can change it later.' };
    }
    if (chip?.action === 'open_form') {
      return { turn_kind: 'navigation', slots: [], navigation: 'open_form' };
    }
    if (chip?.action === 'start_over') {
      return { turn_kind: 'navigation', slots: [], navigation: 'start_over' };
    }
    if (chip?.action === 'photo') {
      return { turn_kind: 'navigation', slots: [], navigation: 'photo' };
    }
    if (chip?.slots?.length) {
      return {
        turn_kind: 'slot_answer',
        slots: chip.slots.map((s) => ({ path: s.path, value: s.value, confidence: 1, evidence: chip.label })),
        restate: null,
      };
    }
  }

  const t = userText.trim();
  const lower = t.toLowerCase();
  if (/^(open (the )?form|show (the )?form|go to (the )?wizard)/i.test(lower)) {
    return { turn_kind: 'navigation', slots: [], navigation: 'open_form' };
  }
  if (/start over|reset|begin again/i.test(lower)) {
    return { turn_kind: 'navigation', slots: [], navigation: 'start_over' };
  }
  if (/\bwhat if\b|\bexplain\b|\brepercussion|\bdifference between\b|\bexample\b|\bwhat does\b/i.test(lower)) {
    return {
      turn_kind: 'side_question',
      slots: [],
      side_topic_key: pending?.help_key ?? 'help.chat.what_if',
      restate: null,
    };
  }

  const slots: ExtractedSlot[] = [];
  const push = (list: ExtractedSlot[]) => {
    for (const x of list) {
      const i = slots.findIndex((y) => y.path === x.path);
      if (i >= 0) continue;
      slots.push(x);
    }
  };
  if (isNotSure(t) && pending && !/\d/.test(t)) {
    return { turn_kind: 'slot_answer', slots: [], restate: 'No problem. I’ll use the usual choice, and you can change it later.' };
  }
  // 1) The pending question's own parser.
  if (pending?.parse) push(pending.parse(t, ctx));
  // 2) Sweep other questions so one sentence can answer several (“skip ones already known”).
  for (const node of nodesFor(session.wizard)) {
    if (!node.parse || node === pending) continue;
    if (!isNodeRelevant(node, ctx) && !node.paths.some((p) => has(session.filled, p))) continue;
    if (!sweepGate(node.id, t)) continue;
    const found = node.parse(t, ctx);
    if (!found.length || node.validate?.(found, ctx)) continue;
    if (node.id === 'T-Q2' && found.some((x) => Array.isArray(x.value) && x.value.length < 2)) continue;
    push(found);
  }
  if (session.wizard === 'school') {
    if (/six[\s-]?week|6[\s-]?week/i.test(t)) {
      push([{ path: 'calendar.template', value: 'tx_six_weeks', confidence: 0.9, evidence: 'six-weeks' }]);
    }
    if (/nine[\s-]?week|9[\s-]?week/i.test(t)) {
      push([{ path: 'calendar.template', value: 'nine_weeks', confidence: 0.9, evidence: 'nine-weeks' }]);
    }
    if (/70\s+is\s+passing|passing\s+is\s+70|pass(?:ing)?\s*70|70\s+pass/i.test(t)) {
      push([
        { path: 'scale.default_id', value: 'texas_no_d', confidence: 0.88, evidence: 'passing' },
        { path: 'scale.passing_pct', value: 70, confidence: 0.9, evidence: 'passing' },
      ]);
    }
    if (/\bap\b.*\b(5\.0|5)\b|\b(5\.0|5)\b.*\bap\b|ap\s+is\s+5/i.test(t)) {
      push([
        { path: 'gpa.mode', value: 'unweighted_and_weighted', confidence: 0.85, evidence: 'AP' },
        { path: 'gpa.weighted_bonus', value: 'numeric_5', confidence: 0.85, evidence: 'AP' },
        { path: 'levels.ap_points', value: 5.0, confidence: 0.9, evidence: 'AP is 5.0' },
      ]);
    }
  }

  if (slots.length) {
    return { turn_kind: 'slot_answer', slots, restate: null };
  }
  return { turn_kind: 'slot_answer', slots: [], restate: null };
}

/** Keyword gates so the cross-question sweep only fires on clear mentions. */
function sweepGate(nodeId: string, text: string): boolean {
  const t = text.toLowerCase();
  switch (nodeId) {
    case 'T-Q1':
      return /total points|weighted|categor|no overall grade|own weight/.test(t);
    case 'T-Q2':
      return /\d+\s*%?\s*(,|and)|\d+\s*\/\s*\d+/.test(t) && /[a-z]{3,}\s*\d+|\d+\s*%\s*[a-z]{3,}/.test(t);
    case 'T-Q4':
      return /\bdrop/.test(t);
    case 'T-Q5':
      return /missing/.test(t);
    case 'T-Q6':
      return /\blate\b/.test(t);
    case 'T-Q7':
      return /extra credit|bonus/.test(t);
    case 'T-Q7b':
      return /extra credit|bonus|over 100|max(imum)? (average|grade)/.test(t) && /cap|max|over|limit/.test(t);
    case 'T-Q8':
      return /retake|redo|re-?do|re-?test/.test(t);
    case 'T-Q9':
      return /(period|report card|lowest (grade|average)|minimum (grade|average)) /.test(t) || /floor of \d+ (for|on) (the )?(period|report)/.test(t);
    case 'T-Q10':
      return /round/.test(t);
    case 'T-Q11':
      return /quarter|semester|rolling|reset|fresh start|whole year/.test(t);
    case 'T-Q12':
      return /exam/.test(t);
    case 'T-Q13':
      return /empty categor|no grades yet/.test(t);
    case 'S-Q1':
      return /\b(elementary|middle|high|college) school\b/.test(t);
    case 'S-Q2b':
      return /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d/.test(t) || /\d{4}-\d{2}-\d{2}/.test(t);
    case 'S-Q3':
      return /credit/.test(t);
    case 'S-Q4':
      return /\d\/\d|50\s*\/\s*50/.test(t);
    case 'S-Q5':
      return /exempt/.test(t);
    case 'S-Q6b':
      return /round/.test(t);
    default:
      return false;
  }
}

const NULL_INVALID = new Set([
  'engine',
  'categories',
  'missing_rule',
  'late_rule',
  'extra_credit_method',
  'extra_credit_allowed',
  'rounding',
  'term_structure',
  'book_mode',
  'empty_category',
  'title',
  'drop_lowest',
  'level',
  'calendar.template',
  'credit.policy',
  'rollup.preset',
  'scale.default_id',
  'scale.passing_pct',
  'gpa.mode',
  'locks.map',
]);

/** Make a slot set internally consistent (LLM answers can contradict themselves). */
export function reconcileSlots(wizard: InterviewSession['wizard'], slots: ExtractedSlot[]): ExtractedSlot[] {
  let out = slots.filter((x) => !(x.value == null && NULL_INVALID.has(x.path)));
  if (wizard !== 'syllabus') return out;
  const get = (p: string) => out.find((x) => x.path === p);
  const set = (p: string, value: unknown) => {
    const i = out.findIndex((x) => x.path === p);
    const row = { path: p, value, confidence: 0.9, evidence: 'reconciled' };
    if (i >= 0) out[i] = { ...out[i]!, value };
    else out = [...out, row];
  };
  const allowed = get('extra_credit_allowed');
  if (allowed?.value === false) {
    set('extra_credit_method', 'A');
    if (!get('ec_cap')) set('ec_cap', null);
  }
  const within = get('within_category');
  const engine = get('engine');
  if (within && (within.value === 'points_inside' || within.value === 'percent_inside')) {
    if (!engine || engine.value === 'weighted_points_inside' || engine.value === 'weighted_percent_inside') {
      set('engine', within.value === 'points_inside' ? 'weighted_points_inside' : 'weighted_percent_inside');
    }
  }
  return out;
}

const COUPLED_PATHS: Record<string, string[]> = {
  engine: ['within_category'],
  within_category: ['engine'],
  extra_credit_method: ['extra_credit_allowed'],
  extra_credit_allowed: ['extra_credit_method'],
  missing_rule: ['floor'],
  term_structure: ['book_mode'],
  exam_weight: ['rollup_preset'],
  ec_cap: ['ceiling'],
};

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /\?/.test(t) || /^(what|why|how|when|which|who|should|can|could|would|does|do|is|are|will|explain|tell me)\b/.test(t) || /\bwhat if\b|\bexplain\b|\bdifference\b|\bexample\b|\bmean\b/.test(t);
}

/**
 * Combine the model extraction with the deterministic parsers:
 * the pending question's own parser wins on its paths (short answers are
 * parsed exactly), the model wins elsewhere, and each fills the other's gaps.
 */
export function mergeExtractions(
  session: InterviewSession,
  userText: string,
  model: ExtractionResult,
): ExtractionResult {
  const local = heuristicExtract(session, userText);
  if (model.turn_kind === 'injection') return model;
  // Only trust a model “side question” when the text reads like a question;
  // otherwise gibberish (“purple monkey”) would re-ask forever instead of
  // counting toward the two-miss default.
  if (model.turn_kind === 'side_question' && local.slots.length === 0 && looksLikeQuestion(userText)) return model;
  if (model.turn_kind === 'navigation' && model.navigation) return model;
  const pending = session.pending_node ? getNode(session.wizard, session.pending_node) : null;
  const pendingPaths = new Set(pending?.paths ?? []);
  // The pending parser also owns the paths its answer couples to (engine ↔ within, etc.),
  // so the model cannot flip a short answer through reconcileSlots.
  for (const p of [...pendingPaths]) for (const q of COUPLED_PATHS[p] ?? []) pendingPaths.add(q);
  const byPath = new Map<string, ExtractedSlot>();
  for (const m of model.slots) byPath.set(m.path, m);
  for (const l of local.slots) {
    if (!byPath.has(l.path) || pendingPaths.has(l.path)) byPath.set(l.path, l);
  }
  return {
    turn_kind: 'slot_answer',
    slots: reconcileSlots(session.wizard, [...byPath.values()]),
    side_topic_key: null,
    navigation: null,
    restate: null,
    raw_summary: model.raw_summary ?? null,
  };
}
