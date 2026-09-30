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

  const label = list.map((s) => (s.state === 'current' ? `→${s.label}` : s.label)).join(' · ');
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
    return "Set up how this school posts grades. Answer a few questions — I'll fill the same draft as the form. You can say things like “six-weeks, 70 is passing.”";
  }
  return 'Build this class syllabus by answering a few questions. Same draft as the wizard — nothing publishes until you open the form and tap Publish.';
}

export function readBackSummary(session: InterviewSession): string {
  const f = session.filled;
  const parts: string[] = [];
  const v = (path: string) => f[path]?.value;
  if (session.wizard === 'school') {
    if (v('level') != null) parts.push(String(v('level')));
    if (v('calendar.template') != null) {
      const t = String(v('calendar.template'));
      parts.push(
        t === 'tx_six_weeks' ? 'six report cards a year' : t.replace(/_/g, ' '),
      );
    }
    if (v('credit.policy') != null) {
      const c = v('credit.policy') as { unit?: string };
      parts.push(c?.unit === 'none' ? 'no credit' : `credit ${c?.unit ?? ''}`);
    }
    if (v('rollup.preset') != null) parts.push(`rollup ${String(v('rollup.preset'))}`);
    if (v('scale.passing_pct') != null) parts.push(`${v('scale.passing_pct')} is passing`);
    else if (v('scale.default_id') != null) parts.push(String(v('scale.default_id')));
    if (v('gpa.mode') != null) parts.push(`GPA ${String(v('gpa.mode'))}`);
    if (v('levels.ap_points') != null) parts.push(`AP A is ${v('levels.ap_points')} weighted`);
  } else {
    if (v('engine') != null) parts.push(String(v('engine')).replace(/_/g, ' '));
    if (v('categories') != null) {
      const cats = v('categories') as Array<{ label: string; weight_percent: number }>;
      if (Array.isArray(cats)) {
        parts.push(cats.map((c) => `${c.label} ${c.weight_percent}`).join('/'));
      }
    }
    if (v('missing_rule') != null) parts.push(`missing=${String(v('missing_rule'))}`);
    if (v('late_rule') != null) {
      const lr = v('late_rule') as { type?: string };
      parts.push(`late=${lr?.type ?? 'none'}`);
    }
  }
  if (parts.length === 0) return 'Nothing captured yet.';
  return `${parts.join(', ')}. Open the form to check dates and publish?`;
}
