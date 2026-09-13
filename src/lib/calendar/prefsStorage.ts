import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  calPrefsKey,
  parseCalPrefsJson,
  type CalPrefsV1,
} from './prefs.ts';
import type { CalendarSeat } from './types.ts';

export async function loadCalPrefs(
  profileId: string,
  seat: CalendarSeat,
  childStudentId?: string | null,
): Promise<CalPrefsV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(calPrefsKey(profileId, seat, childStudentId));
    return parseCalPrefsJson(raw);
  } catch {
    return null;
  }
}

export async function saveCalPrefs(
  profileId: string,
  seat: CalendarSeat,
  childStudentId: string | null | undefined,
  prefs: CalPrefsV1,
): Promise<void> {
  await AsyncStorage.setItem(
    calPrefsKey(profileId, seat, childStudentId),
    JSON.stringify(prefs),
  );
}
