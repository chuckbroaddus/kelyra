/**
 * Pure turn processor: extraction result in → updated session + assistant reply.
 */
import { applySlotsToSession, createSession, notSureDefaults } from './applySlots.ts';
import { chipsOf, getNode, isNodeRelevant, nodePathsFilled, nodesFor } from './graph.ts';
import { nextQuestion, openingMessage, readBackSummary } from './nextQuestion.ts';
import { answerSideQuestion, injectionDecline } from './sideQuestion.ts';
import { isNotSure } from './parseAnswers.ts';
import type {
  ExtractionResult,
  GraphContext,
  InterviewSession,
  QuestionChip,
  QuestionNode,
  TranscriptTurn,
} from './types.ts';

function stamp(role: TranscriptTurn['role'], text: string, extra?: Partial<TranscriptTurn>): TranscriptTurn {
  return { role, text, at: new Date().toISOString(), ...extra };
}

export type TurnOutput = {
  session: InterviewSession;
  assistant_text: string;
  effects: string | null;
  question: QuestionNode | null;
  chips: QuestionChip[];
  progress_label: string;
  handoff: 'wizard_review' | 'photo' | null;
  open_wizard_step: boolean;
};

function ctxOf(s: InterviewSession): GraphContext {
  return { wizard: s.wizard, filled: s.filled, draft: s.draft };
}

function withTranscript(session: InterviewSession, turns: TranscriptTurn[]): InterviewSession {
  return { ...session, transcript: [...session.transcript, ...turns], updated_at: new Date().toISOString() };
}

function out(
  s: InterviewSession,
  text: string,
  node: QuestionNode | null,
  extra?: Partial<TurnOutput>,
): TurnOutput {
  return {
    session: s,
    assistant_text: text,
    effects: null,
    question: node,
    chips: chipsOf(node, ctxOf(s)),
    progress_label: nextQuestion(s).progress.label,
    handoff: null,
    open_wizard_step: false,
    ...extra,
  };
}

export function beginInterview(session: InterviewSession): TurnOutput {
  const nq = nextQuestion(session);
  const open = openingMessage(session.wizard);
  const q = nq.node;
  const known = Object.values(session.filled).filter((f) => f.evidence === 'school lock').length;
  const knownLine = known ? `\n\nI skipped ${known} setting${known > 1 ? 's' : ''} your school already sets.` : '';
  const text = q ? `${open}${knownLine}\n\n${q.question}` : open;
  let next = withTranscript(session, [stamp('assistant', text, { node_id: q?.id })]);
  next = {
    ...next,
    pending_node: q?.id ?? null,
    next_node: q?.id ?? null,
    asked: q ? [...next.asked, q.id] : next.asked,
    status: nq.done ? 'confirm' : 'active',
  };
  return out(next, text, q);
}

/** Plain-language read-back of what this answer set (uses the review summary lines). */
function restateSlots(s: InterviewSession, paths: string[]): string {
  const ctx = ctxOf(s);
  const lines = nodesFor(s.wizard)
    .filter((n) => n.summarize && n.paths.some((p) => paths.includes(p)))
    .map((n) => n.summarize!(ctx))
    .filter((x): x is string => Boolean(x));
  return lines.length ? `Got it — ${lines.join(' · ')}.` : 'Got it.';
}

/** Ask the next unanswered question (or the review summary). */
function advance(s: InterviewSession, lead: string): TurnOutput {
  const nq = nextQuestion(s);
  let assistant = lead;
  if (nq.done && nq.node) {
    const read = readBackSummary(s);
    assistant = `${assistant}${assistant ? '\n\n' : ''}${read}\n\n${nq.node.question}`;
    s = {
      ...s,
      status: 'confirm',
      pending_node: nq.node.id,
      next_node: nq.node.id,
      asked: s.asked.includes(nq.node.id) ? s.asked : [...s.asked, nq.node.id],
    };
  } else if (nq.node) {
    assistant = `${assistant}${assistant ? '\n\n' : ''}${nq.node.question}`;
    s = {
      ...s,
      pending_node: nq.node.id,
      next_node: nq.node.id,
      asked: s.asked.includes(nq.node.id) ? s.asked : [...s.asked, nq.node.id],
      status: 'active',
    };
  }
  s = withTranscript(s, [stamp('assistant', assistant, { node_id: nq.node?.id })]);
  return out(s, assistant, nq.node);
}

/** Fill every remaining optional node with its default (“use defaults for the rest”). */
export function fillOptionalDefaults(session: InterviewSession): InterviewSession {
  let s = session;
  for (const node of nodesFor(s.wizard)) {
    if (!node.optional || !node.paths.length) continue;
    if (!isNodeRelevant(node, ctxOf(s))) continue;
    if (nodePathsFilled(node, s.filled)) continue;
    const missing = notSureDefaults(s, node.id).filter((x) => !Object.prototype.hasOwnProperty.call(s.filled, x.path));
    if (missing.length) s = applySlotsToSession(s, missing, 'assumed');
  }
  return s;
}

export function processTurn(
  session: InterviewSession,
  userText: string,
  extraction: ExtractionResult,
  opts?: { chipId?: string | null; notSure?: boolean },
): TurnOutput {
  const pendingId = session.pending_node;
  const pending = pendingId ? getNode(session.wizard, pendingId) : null;
  const userTurn = stamp('user', userText, { node_id: pendingId, kind: extraction.turn_kind });
  let s = withTranscript(session, [userTurn]);
  const chip = opts?.chipId && pending ? chipsOf(pending, ctxOf(session)).find((c) => c.id === opts.chipId) : null;

  if (extraction.turn_kind === 'injection') {
    const msg = injectionDecline(pending);
    s = withTranscript(s, [stamp('assistant', msg, { node_id: pendingId, kind: 'injection' })]);
    return out(s, msg, pending);
  }

  // “Not sure” always means take the default, whatever the model labeled the turn.
  if (extraction.turn_kind !== 'slot_answer' && !extraction.navigation && extraction.slots.length === 0 && isNotSure(userText) && !/\d/.test(userText)) {
    extraction = { ...extraction, turn_kind: 'slot_answer' };
  }

  if (extraction.turn_kind === 'side_question') {
    const side = answerSideQuestion({
      session: s,
      userText,
      topicKey: extraction.side_topic_key,
      followUpCount: pendingId ? (s.failed_parses[`side:${pendingId}`] ?? 0) : 0,
    });
    if (pendingId) {
      s = {
        ...s,
        failed_parses: {
          ...s.failed_parses,
          [`side:${pendingId}`]: (s.failed_parses[`side:${pendingId}`] ?? 0) + 1,
        },
      };
    }
    const restated = pending ? `${side.answer}\n\n${pending.question}` : side.answer;
    s = withTranscript(s, [stamp('assistant', restated, { node_id: pendingId, kind: 'side_question' })]);
    return out(s, restated, pending);
  }

  // Review “Edit …” chip: clear that question's answers and re-ask it.
  if (chip?.action === 'edit' && chip.edit_node) {
    const target = getNode(s.wizard, chip.edit_node);
    if (target) {
      const filled = { ...s.filled };
      for (const p of target.paths) {
        if (filled[p]?.evidence !== 'school lock') delete filled[p];
      }
      s = { ...s, filled, status: 'active', pending_node: target.id, next_node: target.id };
      const msg = `Sure — let's change that.\n\n${target.question}`;
      s = withTranscript(s, [stamp('assistant', msg, { node_id: target.id })]);
      return out(s, msg, target);
    }
  }

  if (extraction.navigation === 'open_form' || extraction.navigation === 'confirm') {
    s = fillOptionalDefaults(s);
    s = { ...s, status: 'handed_off', next_node: null, pending_node: null };
    const msg = 'Opening the form with your answers filled in. Nothing is published until you tap Publish there.';
    s = withTranscript(s, [stamp('assistant', msg, { kind: 'navigation' })]);
    return out(s, msg, null, { chips: [], handoff: 'wizard_review' });
  }

  if (extraction.navigation === 'photo') {
    const msg = 'Your photo will fill in the same form. Come back afterward to answer any questions that are left.';
    s = withTranscript(s, [stamp('assistant', msg, { kind: 'navigation' })]);
    return out(s, msg, pending, { handoff: 'photo' });
  }

  if (extraction.navigation === 'start_over') {
    const fresh = createSession({
      wizard: s.wizard,
      school_id: s.school_id,
      class_id: s.class_id,
      owner_id: s.owner_id,
      id: s.id,
      existing_draft: s.base_draft ?? null,
      class_name: s.class_name ?? null,
    });
    return beginInterview(fresh);
  }

  if (chip?.action === 'defaults_rest') {
    s = fillOptionalDefaults(s);
    return advance(s, 'OK, I’ll use the usual choices for the rest. You can change any of them below.');
  }

  let slots = extraction.slots;
  const notSure =
    opts?.notSure || chip?.action === 'not_sure' || (isNotSure(userText) && !/\d/.test(userText));
  let lead = '';
  if (notSure && pendingId && slots.length === 0) {
    slots = notSureDefaults(s, pendingId);
    s = applySlotsToSession(s, slots, 'assumed');
    lead = 'No problem. I’ll use the usual choice for now, and you can change it on the summary.';
  } else if (slots.length > 0) {
    const problem = pending?.validate?.(slots, ctxOf(s)) ?? null;
    if (problem && pending) {
      s = withTranscript(s, [stamp('assistant', problem, { node_id: pendingId })]);
      return out(s, problem, pending);
    }
    const source = opts?.chipId ? 'chip' : 'text';
    s = applySlotsToSession(s, slots, source);
  } else if (pendingId) {
    const fails = (s.failed_parses[pendingId] ?? 0) + 1;
    s = { ...s, failed_parses: { ...s.failed_parses, [pendingId]: fails } };
    if (fails >= 2 && pending && pending.paths.length) {
      // Never dead-end: take the default, flag it on the summary, keep going.
      const d = notSureDefaults(s, pendingId);
      s = applySlotsToSession(s, d, 'assumed');
      return advance(s, "Sorry, I still didn’t understand, so I used your school's usual choice for now. It's marked on the summary for you to check.");
    }
    const msg = pending
      ? `Sorry, I didn't understand that. Tap a choice or say it another way.\n\n${pending.question}`
      : 'Sorry, I didn’t understand that. Tap a choice or type a short answer.';
    s = withTranscript(s, [stamp('assistant', msg, { node_id: pendingId })]);
    return out(s, msg, pending);
  }

  const effects =
    pending && slots.length ? pending.effects?.(ctxOf(s)) ?? null : null;
  if (!lead) {
    if (extraction.restate) lead = extraction.restate;
    else if (slots.length) lead = restateSlots(s, slots.map((x) => x.path));
  }
  if (effects) lead = `${lead}${lead ? ' ' : ''}${effects}`;
  const res = advance(s, lead);
  return { ...res, effects };
}
