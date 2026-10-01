/**
 * nextQuestion + section progress (FR-CHAT-05/07/08).
 */
import {
  SECTION_LABELS,
  getNode,
  isNodeRelevant,
  nodePathsFilled,
  nodesFor,
  sectionsFor,
} from './graph.ts';
import { interviewSlotValue } from '../grade/plainLabels.ts';
import type {
  GraphContext,
  InterviewSection,
  InterviewSession,
  InterviewWizard,
  NextQuestionResult,
  ProgressSnapshot,
  QuestionNode,
} from './types.ts';

export function graphContext(session: InterviewSession): GraphContext {
  return {
    wizard: session.wizard,
    filled: session.filled,
    draft: session.draft,
  };
}

export function buildProgress(
  wizard: InterviewWizard,
  current: QuestionNode | null,
  filled: InterviewSession['filled'],
  draft: Record<string, unknown>,
): ProgressSnapshot {
  const sections = sectionsFor(wizard);
  const ctx: GraphContext = { wizard, filled, draft };
  const nodes = nodesFor(wizard);
  const currentSection: InterviewSection = current?.section ?? 'review';

  const sectionState = (sec: InterviewSection): 'done' | 'current' | 'todo' => {
    if (sec === currentSection) return 'current';
    const secNodes = nodes.filter((n) => n.section === sec && isNodeRelevant(n, ctx));
    if (secNodes.length === 0) return 'done';
    const allFilled = secNodes.every((n) => n.paths.length === 0 || nodePathsFilled(n, filled));
    if (allFilled && sections.indexOf(sec) < sections.indexOf(currentSection)) return 'done';
    if (allFilled && sec !== 'review') return 'done';
    return 'todo';
  };

  const list = sections.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    state: sectionState(id),
  }));

  const label = list.map((s) => (s.state === 'current' ? `▸ ${s.label}` : s.label)).join(' · ');
  return { sections: list, current_section: currentSection, label };
}

/** First unfilled required node; review node when all done. */
export function nextQuestion(session: InterviewSession): NextQuestionResult {
  const ctx = graphContext(session);
  const nodes = nodesFor(session.wizard);
  const reviewId = session.wizard === 'school' ? 'S-Q10' : 'T-Q7';

  for (const node of nodes) {
    if (node.id === reviewId) continue;
    if (!isNodeRelevant(node, ctx)) continue;
    if (nodePathsFilled(node, session.filled)) continue;
    return {
      node,
      done: false,
      progress: buildProgress(session.wizard, node, session.filled, session.draft),
    };
  }

  const review = getNode(session.wizard, reviewId);
  return {
    node: review,
    done: true,
    progress: buildProgress(session.wizard, review, session.filled, session.draft),
  };
}

export function openingMessage(wizard: InterviewWizard): string {
  if (wizard === 'school') {
    return "Let's set up how your school gives grades. Answer a few questions and I'll fill in the form for you. You can say things like “six-weeks, 70 is passing.”";
  }
  return "Let's set up how this class is graded. Answer a few questions and I'll fill in the form for you. Nothing is published until you open the form and tap Publish.";
}

export function readBackSummary(session: InterviewSession): string {
  const f = session.filled;
  const parts: string[] = [];
  const v = (path: string) => f[path]?.value;
  if (session.wizard === 'school') {
    if (v('level') != null) parts.push(interviewSlotValue('level', v('level')));
    if (v('calendar.template') != null) {
      const t = String(v('calendar.template'));
      parts.push(
        t === 'tx_six_weeks' ? 'six report cards a year' : interviewSlotValue('calendar.template', t),
      );
    }
    if (v('credit.policy') != null) {
      parts.push(interviewSlotValue('credit.policy', v('credit.policy')));
    }
    if (v('rollup.preset') != null) {
      parts.push(`semester grade: ${interviewSlotValue('rollup.preset', v('rollup.preset'))}`);
    }
    if (v('scale.passing_pct') != null) parts.push(`${v('scale.passing_pct')} is passing`);
    else if (v('scale.default_id') != null) parts.push(interviewSlotValue('scale.default_id', v('scale.default_id')));
    if (v('gpa.mode') != null) parts.push(interviewSlotValue('gpa.mode', v('gpa.mode')));
    if (v('levels.ap_points') != null) parts.push(`an A in AP is worth ${v('levels.ap_points')} points`);
  } else {
    if (v('engine') != null) parts.push(interviewSlotValue('engine', v('engine')));
    if (v('categories') != null) {
      const cats = v('categories') as Array<{ label: string; weight_percent: number }>;
      if (Array.isArray(cats)) {
        parts.push(cats.map((c) => `${c.label} ${c.weight_percent}%`).join(', '));
      }
    }
    if (v('missing_rule') != null) parts.push(`missing work: ${interviewSlotValue('missing_rule', v('missing_rule')).toLowerCase()}`);
    if (v('late_rule') != null) {
      parts.push(`late work: ${interviewSlotValue('late_rule', v('late_rule')).toLowerCase()}`);
    }
  }
  if (parts.length === 0) return 'Nothing answered yet.';
  return `Here's what I have: ${parts.join('; ')}. Open the form to check the dates and publish?`;
}
