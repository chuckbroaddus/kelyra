export type {
  CellStatus,
  Engine,
  EngineAssignment,
  EngineCategory,
  EngineCell,
  EngineSyllabus,
  ExamExemptionPolicy,
  ItemBreakdown,
  LateRule,
  PeriodResult,
  RetakeMethod,
  RetakeRule,
  ScoreAttempt,
  TermResult,
  TermRollup,
  WhatIfResult,
  WhatIfTarget,
  CategoryResult,
} from './types.ts';

export { computePeriod } from './computePeriod.ts';
export { computeTerm } from './computeTerm.ts';
export type { ComputeTermOptions } from './computeTerm.ts';
export { whatIf } from './whatIf.ts';
export { roundPct, storePrecision } from './round.ts';
export { applyLate, daysLate } from './late.ts';
export {
  pickRetakeScore,
  applyRetakeCap,
  parseRetakeRule,
  defaultRetakeRule,
} from './retake.ts';
export {
  defaultExamExemptionPolicy,
  parseExamExemptionPolicy,
  isExamExemptionEligible,
  decideExamExemption,
  rollupWithoutExam,
  preExamAverage,
} from './examExemption.ts';
export {
  resolveGroupStudentScore,
  expandGroupScores,
} from './groupScore.ts';
export type { GroupScoreInput, ResolvedStudentScore, ScoreSourceKind } from './groupScore.ts';
