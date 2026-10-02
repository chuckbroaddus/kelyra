/**
 * nextQuestion + section progress (FR-CHAT-05/07/08).
 */
import {
  SECTION_LABELS,
  getNode,
  isNodeRelevant,
  nodePathsFilled,
  nodesFor,
  reviewNodeId,
  sectionsFor,
} from './graph.ts';
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
  const reviewId = reviewNodeId(session.wizard);

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
    return "Let's set up how your school gives grades. Answer a few questions and I'll fill in the form for you. You can say things like “six-weeks, 70 is passing.” Say “not sure” any time to use the usual choice.";
  }
  return "Let's set up how this class is graded. Answer a few questions and I'll fill in the form for you. Nothing is published until you tap Publish on the form. Say “not sure” any time to use your school's usual choice.";
}

export type SummaryLine = { node_id: string; text: string; tag: 'answered' | 'default' | 'school' };

/** Every relevant answered setting, one line each, tagged by where the value came from. */
export function summaryLines(session: InterviewSession): SummaryLine[] {
  const ctx = graphContext(session);
  const lines: SummaryLine[] = [];
  for (const node of nodesFor(session.wizard)) {
    if (!node.summarize || !node.paths.length) continue;
    if (!isNodeRelevant(node, ctx) && !node.paths.every((p) => session.filled[p]?.evidence === 'school lock')) continue;
    const text = node.summarize(ctx);
    if (!text) continue;
    const fs = node.paths.map((p) => session.filled[p]).filter(Boolean);
    const tag: SummaryLine['tag'] = fs.length && fs.every((f) => f!.evidence === 'school lock')
      ? 'school'
      : fs.some((f) => f!.source === 'assumed' && f!.evidence !== 'class name')
        ? 'default'
        : 'answered';
    lines.push({ node_id: node.id, text, tag });
  }
  return lines;
}

export function readBackSummary(session: InterviewSession): string {
  const lines = summaryLines(session);
  if (lines.length === 0) return 'Nothing answered yet.';
  const body = lines
    .map((l) => `• ${l.text}${l.tag === 'school' ? ' (locked by your school)' : l.tag === 'default' ? ' (usual choice — please check)' : ''}`)
    .join('\n');
  return `Here's what I have:\n${body}`;
}
