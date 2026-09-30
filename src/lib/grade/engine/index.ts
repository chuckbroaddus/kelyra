export type {
  CellStatus,
  Engine,
  EngineAssignment,
  EngineCategory,
  EngineCell,
  EngineSyllabus,
  ItemBreakdown,
  LateRule,
  PeriodResult,
  TermResult,
  TermRollup,
  WhatIfResult,
  WhatIfTarget,
  CategoryResult,
} from './types.ts';

export { computePeriod } from './computePeriod.ts';
export { computeTerm } from './computeTerm.ts';
export { whatIf } from './whatIf.ts';
export { roundPct, storePrecision } from './round.ts';
export { applyLate, daysLate } from './late.ts';
