/** GB-12 conversational setup interview public API. */
export type {
  InterviewSession,
  InterviewWizard,
  InterviewStatus,
  FilledSlot,
  QuestionNode,
  QuestionChip,
  ExtractionResult,
  ExtractedSlot,
  ProgressSnapshot,
  NextQuestionResult,
  TurnKind,
  TranscriptTurn,
  InterviewSection,
} from './types.ts';

export {
  SCHOOL_NODES,
  SYLLABUS_NODES,
  SECTION_LABELS,
  nodesFor,
  sectionsFor,
  getNode,
  nodePathsFilled,
  isNodeRelevant,
  chipsOf,
  defaultSlotsFor,
  reviewNodeId,
} from './graph.ts';

export { nextQuestion, buildProgress, openingMessage, readBackSummary, summaryLines, graphContext, type SummaryLine } from './nextQuestion.ts';

export {
  createSession,
  applySlotsToSession,
  applySchoolSlots,
  applySyllabusSlots,
  applySlotsToFilled,
  notSureDefaults,
  emptySchoolDraftBag,
  emptySyllabusDraftBag,
  seedSyllabusFilled,
} from './applySlots.ts';

export {
  buildExtractionPrompt,
  parseExtractionResponse,
  heuristicExtract,
  mergeExtractions,
  reconcileSlots,
  legalPaths,
  normalizeSlot,
  normalizeTemplateValue,
} from './extract.ts';

export {
  classifyTurnText,
  answerSideQuestion,
  resolveSideHelpKey,
  injectionDecline,
} from './sideQuestion.ts';

export { beginInterview, processTurn, fillOptionalDefaults, type TurnOutput } from './turn.ts';

export * from './parseAnswers.ts';
export * from './setupFields.ts';
export * from './handoff.ts';
