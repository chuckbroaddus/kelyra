/**
 * GB-18 school-locked syllabus fields (FR-SYL-18, FR-FORM-T01, §11.9).
 * Generic field keys so GB-15 retake/floor and this card merge either order.
 */
import type { LateRule } from '../grade/engine/types.ts';

/** Canonical lockable syllabus field keys (SRS + card list). */
export const LOCK_FIELD_KEYS = [
  'engine',
  'categories',
  'scale',
  'floor',
  'late',
  'drop_lowest',
  'retake',
  'assignment_max',
  'book_mode',
  'rollup',
] as const;

export type LockFieldKey = (typeof LOCK_FIELD_KEYS)[number];
export type SyllabusLocks = Record<LockFieldKey, boolean>;
export type LockReasons = Partial<Record<LockFieldKey, string>>;

export type LockedValueBag = {
  engine?: string | null;
  categories?: unknown;
  scale_id?: string | null;
  floor?: number | null;
  late_rule?: LateRule | null;
  drop_lowest?: number | null;
  retake?: unknown;
  assignment_max?: number | null;
  book_mode?: string | null;
  rollup_preset?: string | null;
  exam_weight?: number | null;
};

export type SchoolLockPolicy = {
  locks: SyllabusLocks;
  lock_reasons: LockReasons;
  values: LockedValueBag;
};

// defaults + helpers continue below
export const DEFAULT_LOCKS: SyllabusLocks = {
  engine: false,
  categories: false,
  scale: true,
  floor: false,
  late: false,
  drop_lowest: false,
  retake: false,
  assignment_max: false,
  book_mode: false,
  rollup: true,
};

export const DEFAULT_LOCK_REASONS: Record<LockFieldKey, string> = {
  engine: 'School grading policy locks the calculation engine.',
  categories: 'School grading policy locks category structure or weights.',
  scale: 'Letter scale is set by the school grading policy.',
  floor: 'Period floor is set by the school grading policy.',
  late: 'Late penalty rule is set by the school grading policy.',
  drop_lowest: 'Drop-lowest policy is set by the school.',
  retake: 'Retake rules are set by the school grading policy.',
  assignment_max: 'Assignment max points policy is set by the school.',
  book_mode: 'Book reset mode is set by the school calendar policy.',
  rollup: 'Term rollup / exam weight is set by the school calendar.',
};

/** Draft path roots that conflict when the lock key is on (ingest/interview). */
export const LOCK_FIELD_TO_PATHS: Record<LockFieldKey, string[]> = {
  engine: ['syllabus.engine', 'engine', 'syllabus.within_category', 'within_category'],
  categories: ['syllabus.categories', 'categories'],
  scale: ['scale.list', 'scale.bands', 'scale.default_id', 'syllabus.scale_id'],
  floor: ['syllabus.floor', 'floor'],
  late: ['syllabus.late_rule', 'late_rule', 'late'],
  drop_lowest: ['syllabus.categories', 'categories', 'drop_lowest'],
  retake: ['syllabus.retake', 'retake', 'retakes'],
  assignment_max: ['syllabus.assignment_max', 'assignment_max'],
  book_mode: ['syllabus.book_mode', 'book_mode'],
  rollup: [
    'syllabus.rollup_preset',
    'syllabus.exam_weight',
    'rollup_preset',
    'exam_weight',
    'rollup.preset',
  ],
};

export function emptyLocks(overrides?: Partial<SyllabusLocks>): SyllabusLocks {
  return { ...DEFAULT_LOCKS, ...(overrides ?? {}) };
}

export function parseLocks(raw: unknown): SyllabusLocks {
  const base = emptyLocks();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  for (const k of LOCK_FIELD_KEYS) {
    if (typeof o[k] === 'boolean') base[k] = o[k] as boolean;
  }
  if (typeof o.weights === 'boolean') base.categories = o.weights;
  return base;
}

export function parseLockReasons(raw: unknown, locks?: SyllabusLocks): LockReasons {
  const out: LockReasons = {};
  const L = locks ?? emptyLocks();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    for (const k of LOCK_FIELD_KEYS) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
  }
  for (const k of LOCK_FIELD_KEYS) {
    if (L[k] && !out[k]) out[k] = DEFAULT_LOCK_REASONS[k];
  }
  return out;
}

export function lockReason(policy: SchoolLockPolicy, key: LockFieldKey): string {
  if (!policy.locks[key]) return '';
  return policy.lock_reasons[key] ?? DEFAULT_LOCK_REASONS[key];
}

export function isLockOn(policy: SchoolLockPolicy | SyllabusLocks, key: LockFieldKey): boolean {
  if ('locks' in policy) return policy.locks[key] === true;
  return policy[key] === true;
}

/** Paths for merge/ingest when locks are on. */
export function lockedPathsFromLocks(
  locks: SyllabusLocks | Record<string, boolean> | null | undefined,
): string[] {
  if (!locks) return [];
  const parsed = parseLocks(locks);
  const out: string[] = [];
  for (const k of LOCK_FIELD_KEYS) {
    if (!parsed[k]) continue;
    out.push(...LOCK_FIELD_TO_PATHS[k]);
  }
  return [...new Set(out)];
}

export function pathConflictsWithLocks(path: string, locks: SyllabusLocks): boolean {
  const locked = lockedPathsFromLocks(locks);
  return locked.some(
    (lp) => path === lp || path.startsWith(`${lp}.`) || lp.startsWith(`${path}.`),
  );
}

export type SyllabusFieldBag = {
  engine?: unknown;
  categories?: unknown;
  scale_id?: unknown;
  floor?: unknown;
  late_rule?: unknown;
  drop_lowest?: unknown;
  retake?: unknown;
  assignment_max?: unknown;
  book_mode?: unknown;
  rollup_preset?: unknown;
  exam_weight?: unknown;
  locks?: unknown;
  [key: string]: unknown;
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Apply school locked values onto a class syllabus bag.
 * Unlocked fields keep class values; locked fields take school values when provided.
 */
export function resolveInheritedSyllabus<T extends SyllabusFieldBag>(
  classValues: T,
  policy: SchoolLockPolicy,
): T {
  const next: SyllabusFieldBag = { ...classValues };
  const v = policy.values ?? {};
  if (policy.locks.engine && v.engine != null) next.engine = v.engine;
  if (policy.locks.categories && v.categories != null) next.categories = v.categories;
  if (policy.locks.scale && v.scale_id != null) next.scale_id = v.scale_id;
  if (policy.locks.floor && v.floor !== undefined) next.floor = v.floor;
  if (policy.locks.late && v.late_rule != null) next.late_rule = v.late_rule;
  if (policy.locks.drop_lowest && v.drop_lowest !== undefined) next.drop_lowest = v.drop_lowest;
  if (policy.locks.retake && v.retake !== undefined) next.retake = v.retake;
  if (policy.locks.assignment_max && v.assignment_max !== undefined) {
    next.assignment_max = v.assignment_max;
  }
  if (policy.locks.book_mode && v.book_mode != null) next.book_mode = v.book_mode;
  if (policy.locks.rollup) {
    if (v.rollup_preset !== undefined) next.rollup_preset = v.rollup_preset;
    if (v.exam_weight !== undefined) next.exam_weight = v.exam_weight;
  }
  return next as T;
}

export type LockedEditRejection = {
  field: LockFieldKey;
  reason: string;
  message: string;
};

/**
 * Pure save-path guard: proposed edits that touch locked fields vs baseline are rejected.
 * Missing keys (undefined) are not edits — callers should carry those forward first.
 */
export function rejectLockedFieldEdits(
  baseline: SyllabusFieldBag,
  proposed: SyllabusFieldBag,
  policy: SchoolLockPolicy,
): LockedEditRejection[] {
  const rejections: LockedEditRejection[] = [];
  const check = (key: LockFieldKey, baseVal: unknown, propVal: unknown) => {
    if (!policy.locks[key]) return;
    if (propVal === undefined) return;
    if (deepEqual(baseVal, propVal)) return;
    const reason = lockReason(policy, key);
    rejections.push({
      field: key,
      reason,
      message: `Locked field "${key}" cannot be edited by the teacher. ${reason}`,
    });
  };

  check('engine', baseline.engine, proposed.engine);
  check('categories', baseline.categories, proposed.categories);
  check('scale', baseline.scale_id, proposed.scale_id);
  check('floor', baseline.floor, proposed.floor);
  check('late', baseline.late_rule, proposed.late_rule);
  check('drop_lowest', baseline.drop_lowest, proposed.drop_lowest);
  check('retake', baseline.retake, proposed.retake);
  check('assignment_max', baseline.assignment_max, proposed.assignment_max);
  check('book_mode', baseline.book_mode, proposed.book_mode);
  if (policy.locks.rollup) {
    check('rollup', baseline.rollup_preset, proposed.rollup_preset);
    if (
      proposed.exam_weight !== undefined &&
      !deepEqual(baseline.exam_weight, proposed.exam_weight)
    ) {
      const reason = lockReason(policy, 'rollup');
      rejections.push({
        field: 'rollup',
        reason,
        message: `Locked field "rollup" cannot be edited by the teacher. ${reason}`,
      });
    }
  }
  return rejections;
}

/**
 * Prefer baseline, then school policy values, then proposed (for unlocked / missing baseline).
 * Used so Save draft never wipes school-locked rollup/scale/etc. with wizard defaults.
 */
function lockedValuePrefer(
  baseline: unknown,
  school: unknown,
  proposed: unknown,
): unknown {
  if (baseline !== undefined) return baseline;
  if (school !== undefined) return school;
  return proposed;
}

/**
 * Force locked keys on a save/publish bag to stored or school values.
 * Unlocked keys keep `proposed`. Does not delete keys — always carries a concrete value
 * so RPC normalize cannot turn "omit" into null and trip the lock assert.
 */
export function carryForwardLockedFields<T extends SyllabusFieldBag>(
  proposed: T,
  baseline: SyllabusFieldBag,
  policy: SchoolLockPolicy,
): T {
  const next: SyllabusFieldBag = { ...proposed };
  const v = policy.values ?? {};
  if (policy.locks.engine) {
    next.engine = lockedValuePrefer(baseline.engine, v.engine, next.engine);
  }
  if (policy.locks.categories) {
    next.categories = lockedValuePrefer(baseline.categories, v.categories, next.categories);
  }
  if (policy.locks.scale) {
    next.scale_id = lockedValuePrefer(baseline.scale_id, v.scale_id, next.scale_id);
  }
  if (policy.locks.floor) {
    next.floor = lockedValuePrefer(baseline.floor, v.floor, next.floor);
  }
  if (policy.locks.late) {
    next.late_rule = lockedValuePrefer(baseline.late_rule, v.late_rule, next.late_rule);
  }
  if (policy.locks.drop_lowest) {
    next.drop_lowest = lockedValuePrefer(baseline.drop_lowest, v.drop_lowest, next.drop_lowest);
  }
  if (policy.locks.retake) {
    next.retake = lockedValuePrefer(baseline.retake, v.retake, next.retake);
  }
  if (policy.locks.assignment_max) {
    next.assignment_max = lockedValuePrefer(
      baseline.assignment_max,
      v.assignment_max,
      next.assignment_max,
    );
  }
  if (policy.locks.book_mode) {
    next.book_mode = lockedValuePrefer(baseline.book_mode, v.book_mode, next.book_mode);
  }
  if (policy.locks.rollup) {
    next.rollup_preset = lockedValuePrefer(
      baseline.rollup_preset,
      v.rollup_preset,
      next.rollup_preset,
    ) as string | null | undefined;
    next.exam_weight = lockedValuePrefer(
      baseline.exam_weight,
      v.exam_weight,
      next.exam_weight,
    ) as number | null | undefined;
  }
  return next as T;
}

/** §11 item 9: locked late-work policy cannot be edited by the teacher. */
export function assertLatePolicyEditable(
  baselineLate: unknown,
  proposedLate: unknown,
  policy: SchoolLockPolicy,
): LockedEditRejection | null {
  const hits = rejectLockedFieldEdits(
    { late_rule: baselineLate },
    { late_rule: proposedLate },
    policy,
  );
  return hits[0] ?? null;
}

export function buildSchoolLockPolicy(input: {
  locks?: Partial<SyllabusLocks> | null;
  lock_reasons?: LockReasons | null;
  values?: LockedValueBag | null;
}): SchoolLockPolicy {
  const locks = parseLocks({ ...DEFAULT_LOCKS, ...(input.locks ?? {}) });
  return {
    locks,
    lock_reasons: parseLockReasons(input.lock_reasons ?? {}, locks),
    values: { ...(input.values ?? {}) },
  };
}

/**
 * Strip teacher overrides on locked keys when copying (FR-TPL-01).
 * Copy never carries locked overrides; target inherits school locks.
 */
export function stripLockedOverrides<T extends SyllabusFieldBag>(
  source: T,
  targetPolicy: SchoolLockPolicy,
): T {
  const next: SyllabusFieldBag = { ...source };
  if (targetPolicy.locks.engine) delete next.engine;
  if (targetPolicy.locks.categories) delete next.categories;
  if (targetPolicy.locks.scale) delete next.scale_id;
  if (targetPolicy.locks.floor) delete next.floor;
  if (targetPolicy.locks.late) delete next.late_rule;
  if (targetPolicy.locks.drop_lowest) delete next.drop_lowest;
  if (targetPolicy.locks.retake) delete next.retake;
  if (targetPolicy.locks.assignment_max) delete next.assignment_max;
  if (targetPolicy.locks.book_mode) delete next.book_mode;
  if (targetPolicy.locks.rollup) {
    delete next.rollup_preset;
    delete next.exam_weight;
  }
  delete next.locks;
  return resolveInheritedSyllabus(next as T, targetPolicy);
}

export function setLock(
  policy: SchoolLockPolicy,
  key: LockFieldKey,
  locked: boolean,
  reason?: string | null,
): SchoolLockPolicy {
  const locks = { ...policy.locks, [key]: locked };
  const lock_reasons = { ...policy.lock_reasons };
  if (locked) {
    lock_reasons[key] = (reason && reason.trim()) || DEFAULT_LOCK_REASONS[key];
  } else {
    delete lock_reasons[key];
  }
  return { ...policy, locks, lock_reasons };
}
