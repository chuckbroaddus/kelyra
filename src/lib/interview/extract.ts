/**
 * Slot extraction prompt builder + JSON parser (no live AI in unit tests).
 */
import { getNode, nodesFor } from './graph.ts';
import type { ExtractionResult, ExtractedSlot, InterviewSession, QuestionNode, TurnKind } from './types.ts';

const LEGAL_PATHS_SCHOOL = [
  'level',
  'calendar.template',
  'credit.policy',
  'rollup.preset',
  'exam.separate',
  'scale.default_id',
  'scale.passing_pct',
  'gpa.mode',
  'gpa.weighted_bonus',
  'levels.ap_points',
  'gpa.exclude',
  'locks.map',
];

const LEGAL_PATHS_SYLLABUS = [
  'engine',
  'categories',
  'within_category',
  'missing_rule',
  'late_rule',
  'drop_lowest',
  'extra_credit',
  'retakes',
];

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
Already filled: ${filled || '(none)'}
${pendingLine}
Graph:
${nodes}
Rules: extract every matching slot; six-weeks→tx_six_weeks; 70 passing→texas_no_d+70; AP 5.0→weighted+ap_points 5; side Q empty slots; never publish.
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
  if ((path === 'scale.passing_pct' || path === 'levels.ap_points') && typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) v = n;
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
  if (chipId && pending) {
    const chip = pending.chips.find((c) => c.id === chipId);
    if (chip?.action === 'not_sure') {
      return { turn_kind: 'slot_answer', slots: [], navigation: null, restate: 'Applying recommended default.' };
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
        restate: `Recorded: ${chip.label}`,
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
  if (session.wizard === 'school') {
    if (/six[\s-]?week|6[\s-]?week/i.test(t)) {
      slots.push({ path: 'calendar.template', value: 'tx_six_weeks', confidence: 0.9, evidence: 'six-weeks' });
    }
    if (/nine[\s-]?week|9[\s-]?week/i.test(t)) {
      slots.push({ path: 'calendar.template', value: 'nine_weeks', confidence: 0.9, evidence: 'nine-weeks' });
    }
    if (/70\s+is\s+passing|passing\s+is\s+70|pass(?:ing)?\s*70|70\s+pass/i.test(t)) {
      slots.push({ path: 'scale.default_id', value: 'texas_no_d', confidence: 0.88, evidence: 'passing' });
      slots.push({ path: 'scale.passing_pct', value: 70, confidence: 0.9, evidence: 'passing' });
    }
    if (/\bap\b.*\b(5\.0|5)\b|\b(5\.0|5)\b.*\bap\b|ap\s+is\s+5/i.test(t)) {
      slots.push({ path: 'gpa.mode', value: 'unweighted_and_weighted', confidence: 0.85, evidence: 'AP' });
      slots.push({ path: 'gpa.weighted_bonus', value: 'numeric_5', confidence: 0.85, evidence: 'AP' });
      slots.push({ path: 'levels.ap_points', value: 5.0, confidence: 0.9, evidence: 'AP is 5.0' });
    }
  } else {
    if (/total points/i.test(t)) slots.push({ path: 'engine', value: 'total_points', confidence: 0.9 });
    else if (/weighted/i.test(t) && /percent|equal/i.test(t)) {
      slots.push({ path: 'engine', value: 'weighted_percent_inside', confidence: 0.85 });
    } else if (/weighted/i.test(t)) {
      slots.push({ path: 'engine', value: 'weighted_points_inside', confidence: 0.85 });
    }
  }

  if (slots.length) {
    return {
      turn_kind: 'slot_answer',
      slots,
      restate: `I heard ${slots.map((s) => `${s.path}=${JSON.stringify(s.value)}`).join(', ')}.`,
    };
  }
  return { turn_kind: 'slot_answer', slots: [], restate: null };
}
