/**
 * Pure turn processor: extraction result in → updated session + assistant reply.
 */
import { applySlotsToSession, createSession, notSureDefaults } from './applySlots.ts';
import { getNode } from './graph.ts';
import { nextQuestion, openingMessage, readBackSummary } from './nextQuestion.ts';
import { answerSideQuestion, injectionDecline } from './sideQuestion.ts';
import type {
  ExtractionResult,
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

function withTranscript(session: InterviewSession, turns: TranscriptTurn[]): InterviewSession {
  return { ...session, transcript: [...session.transcript, ...turns], updated_at: new Date().toISOString() };
}

export function beginInterview(session: InterviewSession): TurnOutput {
  const nq = nextQuestion(session);
  const open = openingMessage(session.wizard);
  const q = nq.node;
  const text = q ? `${open}\n\n${q.question}` : open;
  let next = withTranscript(session, [stamp('assistant', text, { node_id: q?.id })]);
  next = {
    ...next,
    pending_node: q?.id ?? null,
    next_node: q?.id ?? null,
    asked: q ? [...next.asked, q.id] : next.asked,
  };
  return {
    session: next,
    assistant_text: text,
    effects: null,
    question: q,
    chips: q?.chips ?? [],
    progress_label: nq.progress.label,
    handoff: null,
    open_wizard_step: false,
  };
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

  if (extraction.turn_kind === 'injection') {
    const msg = injectionDecline(pending);
    s = withTranscript(s, [stamp('assistant', msg, { node_id: pendingId, kind: 'injection' })]);
    return {
      session: s,
      assistant_text: msg,
      effects: null,
      question: pending,
      chips: pending?.chips ?? [],
      progress_label: nextQuestion(s).progress.label,
      handoff: null,
      open_wizard_step: false,
    };
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
    return {
      session: s,
      assistant_text: restated,
      effects: null,
      question: pending,
      chips: pending?.chips ?? [],
      progress_label: nextQuestion(s).progress.label,
      handoff: null,
      open_wizard_step: false,
    };
  }

  if (extraction.navigation === 'open_form' || extraction.navigation === 'confirm') {
    s = { ...s, status: 'handed_off', next_node: null, pending_node: null };
    const msg = 'Opening the form with your draft. Publish stays on the form.';
    s = withTranscript(s, [stamp('assistant', msg, { kind: 'navigation' })]);
    return {
      session: s,
      assistant_text: msg,
      effects: null,
      question: null,
      chips: [],
      progress_label: nextQuestion(s).progress.label,
      handoff: 'wizard_review',
      open_wizard_step: false,
    };
  }

  if (extraction.navigation === 'photo') {
    const msg = 'Photo import uses the same draft. Come back to finish remaining questions after.';
    s = withTranscript(s, [stamp('assistant', msg, { kind: 'navigation' })]);
    return {
      session: s,
      assistant_text: msg,
      effects: null,
      question: pending,
      chips: pending?.chips ?? [],
      progress_label: nextQuestion(s).progress.label,
      handoff: 'photo',
      open_wizard_step: false,
    };
  }

  if (extraction.navigation === 'start_over') {
    const fresh = createSession({
      wizard: s.wizard,
      school_id: s.school_id,
      class_id: s.class_id,
      owner_id: s.owner_id,
      id: s.id,
    });
    return beginInterview(fresh);
  }

  // slot path continued in next patch marker
  let slots = extraction.slots;
  const notSure =
    opts?.notSure || opts?.chipId === 'ns' || /i'?m not sure|not sure/i.test(userText.trim());
  if (notSure && pendingId && slots.length === 0) {
    slots = notSureDefaults(s, pendingId);
    s = applySlotsToSession(s, slots, 'assumed');
  } else if (slots.length > 0) {
    const source = opts?.chipId ? 'chip' : 'text';
    s = applySlotsToSession(s, slots, source);
  } else if (pendingId) {
    const fails = (s.failed_parses[pendingId] ?? 0) + 1;
    s = { ...s, failed_parses: { ...s.failed_parses, [pendingId]: fails } };
    if (fails >= 2) {
      const msg = 'I could not parse that twice. Opening that step on the form instead.';
      s = withTranscript(s, [stamp('assistant', msg, { node_id: pendingId })]);
      s = { ...s, status: 'handed_off' };
      return {
        session: s,
        assistant_text: msg,
        effects: null,
        question: null,
        chips: [],
        progress_label: nextQuestion(s).progress.label,
        handoff: 'wizard_review',
        open_wizard_step: true,
      };
    }
    const msg = pending
      ? `I didn't catch a value. ${pending.question}`
      : 'I did not catch a value. Try a chip or a short answer.';
    s = withTranscript(s, [stamp('assistant', msg, { node_id: pendingId })]);
    return {
      session: s,
      assistant_text: msg,
      effects: null,
      question: pending,
      chips: pending?.chips ?? [],
      progress_label: nextQuestion(s).progress.label,
      handoff: null,
      open_wizard_step: false,
    };
  }

  const nq = nextQuestion(s);
  const effects =
    pending && slots.length
      ? pending.effects?.({ wizard: s.wizard, filled: s.filled, draft: s.draft }) ?? null
      : null;

  let assistant = '';
  if (extraction.restate) assistant = extraction.restate;
  else if (slots.length) assistant = `Got it: ${slots.map((x) => x.path).join(', ')}.`;
  if (effects) assistant = `${assistant}${assistant ? ' ' : ''}${effects}`;

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
  return {
    session: s,
    assistant_text: assistant,
    effects,
    question: nq.node,
    chips: nq.node?.chips ?? [],
    progress_label: nq.progress.label,
    handoff: null,
    open_wizard_step: false,
  };
}
