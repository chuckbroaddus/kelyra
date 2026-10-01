/**
 * Side-question detection + HelpTopic answers (FR-CHAT-22).
 * Does not write slots or advance the graph.
 */
import { getBundledHelpTopic, type HelpTopic } from '../help/helpTopics.ts';
import { getNode } from './graph.ts';
import { HELP_AFFECT_WORDS } from '../grade/plainLabels.ts';
import type { InterviewSession, QuestionNode, TurnKind } from './types.ts';

const SIDE_RE =
  /\bwhat if\b|\bexplain\b|\brepercussion|\bdifference between\b|\bcan you give an example\b|\bwhat does\b|\bwhy (do|does|is|are)\b|\bhow does\b/i;

const INJECTION_RE =
  /\bcurve\b.*\b(school|everyone|class)\b|\bdelete all grades\b|\bpublish now\b|\bforge\b/i;

const NAV_RE = /^(open (the )?form|show (the )?wizard|start over|reset)$/i;

export function classifyTurnText(text: string): TurnKind {
  const t = text.trim();
  if (!t) return 'slot_answer';
  if (NAV_RE.test(t) || /start over|open the form/i.test(t)) return 'navigation';
  if (INJECTION_RE.test(t)) return 'injection';
  if (SIDE_RE.test(t)) return 'side_question';
  return 'slot_answer';
}

export function resolveSideHelpKey(
  session: InterviewSession,
  userText: string,
  hintedKey?: string | null,
): string {
  if (hintedKey && getBundledHelpTopic(hintedKey)) return hintedKey;
  const pending = session.pending_node ? getNode(session.wizard, session.pending_node) : null;
  if (pending?.help_key && getBundledHelpTopic(pending.help_key)) return pending.help_key;
  const lower = userText.toLowerCase();
  if (/total points|points engine/i.test(lower)) return 'help.engine.points';
  if (/missing|omit|zero/i.test(lower)) return 'help.missing';
  if (/late/i.test(lower)) return 'help.late';
  if (/gpa|weighted|ap/i.test(lower)) return 'help.gpa.weighted';
  if (/six.?week|calendar|report card/i.test(lower)) return 'help.glyphs.6w';
  if (/pass(ing)?|scale|letter/i.test(lower)) return 'help.scale.tx70';
  if (/rollup|2\/7|exam/i.test(lower)) return 'help.rollup.2_7';
  return pending?.help_key ?? 'help.chat.what_if';
}

function affectsSentence(topic: HelpTopic): string {
  if (!topic.affects.length) return '';
  const names = topic.affects.map((a) => HELP_AFFECT_WORDS[a] ?? a.replace(/_/g, ' '));
  return `This changes: ${names.join(', ')}.`;
}

export function answerSideQuestion(input: {
  session: InterviewSession;
  userText: string;
  topicKey?: string | null;
  followUpCount?: number;
}): {
  answer: string;
  topic_key: string;
  pending: QuestionNode | null;
  offer_form_help: boolean;
} {
  const key = resolveSideHelpKey(input.session, input.userText, input.topicKey);
  const topic =
    getBundledHelpTopic(key) ??
    getBundledHelpTopic('help.chat.what_if') ??
    ({
      key,
      title: 'Help',
      body: 'That choice changes how current grades and report cards are figured. Nothing is published until you publish.',
      meaning: 'Setup choices change averages and report cards. Saved grades don’t change until you publish.',
      affects: ['live_grade', 'report_card'] as HelpTopic['affects'],
      example: 'Check the sample students on the form after you pick an option.',
      sru_ref: 'FR-CHAT-22',
    } satisfies HelpTopic);

  const pending = input.session.pending_node
    ? getNode(input.session.wizard, input.session.pending_node)
    : null;
  const follow = input.followUpCount ?? 0;
  const offer = follow >= 2;

  const parts = [
    topic.meaning,
    topic.example ? `Example: ${topic.example}` : null,
    affectsSentence(topic),
    'Nothing is saved until you tap a choice or answer the question.',
    pending ? `Still on: ${pending.question}` : null,
    offer ? 'Want to see the full form instead? Tap Open the form.' : null,
  ].filter(Boolean);

  return {
    answer: parts.join(' '),
    topic_key: topic.key,
    pending,
    offer_form_help: offer,
  };
}

export function injectionDecline(pending: QuestionNode | null): string {
  const base =
    "I can't do that here. I can only help fill in your grading setup. I can't curve grades, change scores, or publish.";
  if (!pending) return base;
  return `${base} Still on: ${pending.question}`;
}
