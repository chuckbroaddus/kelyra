/**
 * Syllabus wizard step-badge map (continued = light green).
 * Visit greens are in-memory; durable greens write only on Save draft / Publish.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'kelyra.syllabus.stepBadges.v1:';

export type StepBadgeMap = Record<string, boolean>;

export function mergeBadgeMaps(a: StepBadgeMap, b: StepBadgeMap): StepBadgeMap {
  return { ...a, ...b };
}

export function isStepContinued(map: StepBadgeMap, stepId: string): boolean {
  return Boolean(map[stepId]);
}

export function markStepContinued(map: StepBadgeMap, stepId: string): StepBadgeMap {
  if (map[stepId]) return map;
  return { ...map, [stepId]: true };
}

export async function loadStepBadges(classId: string): Promise<StepBadgeMap> {
  if (!classId) return {};
  try {
    const raw = await AsyncStorage.getItem(PREFIX + classId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: StepBadgeMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveStepBadges(classId: string, map: StepBadgeMap): Promise<void> {
  if (!classId) return;
  try {
    await AsyncStorage.setItem(PREFIX + classId, JSON.stringify(map));
  } catch {
    // non-fatal chrome state
  }
}
