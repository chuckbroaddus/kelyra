import type { RollupPresetKey, TermRollup } from './types.ts';

export const ROLLUP_PRESET_KEYS: readonly RollupPresetKey[] = [
  '2/7+1/7',
  '40/40/20',
  '45/45/10',
  '3/7+3/7+1/7',
  '85/15',
  '25x4',
  '50/50',
  'year_mean',
] as const;

const WEIGHT_EPS = 0.0001;

/** True when component weights sum to 1 within ±0.0001. */
export function rollupWeightsValid(
  components: { weight: number }[],
  eps: number = WEIGHT_EPS,
): boolean {
  if (components.length === 0) return false;
  let sum = 0;
  for (const c of components) {
    if (!Number.isFinite(c.weight) || c.weight < 0) return false;
    sum += c.weight;
  }
  return Math.abs(sum - 1) <= eps;
}

export function assertRollupWeights(components: { weight: number }[]): void {
  if (!rollupWeightsValid(components)) {
    const sum = components.reduce((a, c) => a + c.weight, 0);
    throw new Error(`rollup weights must sum to 1 (±${WEIGHT_EPS}); got ${sum}`);
  }
}

export type PresetWeights = {
  child_weights: number[];
  exam_weight: number;
  exam_enabled: boolean;
};

/**
 * Resolve a named rollup preset to child + optional exam weights.
 * `childCount` is the number of marking-period (or credit-term) children.
 */
export function weightsForPreset(key: RollupPresetKey, childCount: number): PresetWeights {
  if (!Number.isInteger(childCount) || childCount < 1) {
    throw new Error(`childCount must be a positive integer, got ${childCount}`);
  }

  switch (key) {
    case '2/7+1/7': {
      // three six-weeks @ 2/7 + exam 1/7
      if (childCount !== 3) {
        throw new Error('2/7+1/7 expects exactly 3 children');
      }
      return {
        child_weights: [2 / 7, 2 / 7, 2 / 7],
        exam_weight: 1 / 7,
        exam_enabled: true,
      };
    }
    case '40/40/20': {
      if (childCount !== 2) throw new Error('40/40/20 expects exactly 2 children');
      return { child_weights: [0.4, 0.4], exam_weight: 0.2, exam_enabled: true };
    }
    case '45/45/10': {
      if (childCount !== 2) throw new Error('45/45/10 expects exactly 2 children');
      return { child_weights: [0.45, 0.45], exam_weight: 0.1, exam_enabled: true };
    }
    case '3/7+3/7+1/7': {
      if (childCount !== 2) throw new Error('3/7+3/7+1/7 expects exactly 2 children');
      return {
        child_weights: [3 / 7, 3 / 7],
        exam_weight: 1 / 7,
        exam_enabled: true,
      };
    }
    case '85/15': {
      // 85% equal mean of children + 15% exam
      const each = 0.85 / childCount;
      return {
        child_weights: Array.from({ length: childCount }, () => each),
        exam_weight: 0.15,
        exam_enabled: true,
      };
    }
    case '25x4': {
      if (childCount !== 4) throw new Error('25x4 expects exactly 4 children');
      return {
        child_weights: [0.25, 0.25, 0.25, 0.25],
        exam_weight: 0,
        exam_enabled: false,
      };
    }
    case '50/50': {
      if (childCount !== 2) throw new Error('50/50 expects exactly 2 children');
      return {
        child_weights: [0.5, 0.5],
        exam_weight: 0,
        exam_enabled: false,
      };
    }
    case 'year_mean': {
      const each = 1 / childCount;
      return {
        child_weights: Array.from({ length: childCount }, () => each),
        exam_weight: 0,
        exam_enabled: false,
      };
    }
    default: {
      const _exhaustive: never = key;
      throw new Error(`unknown rollup preset: ${String(_exhaustive)}`);
    }
  }
}

export function buildTermRollup(input: {
  term_id: string;
  child_period_ids: string[];
  preset: RollupPresetKey;
  exam_code?: string;
  missing_child?: 'renormalize' | 'block';
}): TermRollup {
  const w = weightsForPreset(input.preset, input.child_period_ids.length);
  if (w.child_weights.length !== input.child_period_ids.length) {
    throw new Error('preset child weight count mismatch');
  }
  const components: TermRollup['components'] = input.child_period_ids.map((period_id, i) => ({
    period_id,
    weight: w.child_weights[i]!,
  }));
  const examCode = input.exam_code ?? 'E';
  if (w.exam_enabled) {
    components.push({ period_id: examCode, weight: w.exam_weight });
  }
  assertRollupWeights(components);
  return {
    term_id: input.term_id,
    components,
    exam: { enabled: w.exam_enabled, code: examCode },
    missing_child: input.missing_child ?? 'renormalize',
  };
}
