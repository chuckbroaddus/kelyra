import AsyncStorage from '@react-native-async-storage/async-storage';

import { isOfficeRole, isTeacherRole, type ProfileHats } from '../school/roles.ts';

/** Client chrome seat for dual-hat office+teacher. Not JWT, not SQL. */
export type ChromeSeatPreference = 'office' | 'teacher';

const SEAT_KEY_PREFIX = 'kelyra.chrome.seat.';

export function chromeSeatStorageKey(profileId: string): string {
  return `${SEAT_KEY_PREFIX}${profileId}`;
}

/** Office job-of-record who also teaches — may sit in Office or Teacher chrome. */
export function canChooseChromeSeat(profile: ProfileHats | null | undefined): boolean {
  return isOfficeRole(profile) && Boolean(profile?.also_teacher);
}

/**
 * Resolve staff chrome.role from hats + explicit seat.
 * Dual-hat defaults to Office so also_teacher cannot force the teacher tray.
 */
export function resolveStaffChromeRole(
  profile: ProfileHats | null | undefined,
  preference: ChromeSeatPreference | null,
): 'superintendent' | 'administrator' | 'teacher' | null {
  if (!profile?.role) return null;
  if (canChooseChromeSeat(profile)) {
    if (preference === 'teacher') return 'teacher';
    return profile.role === 'superintendent' ? 'superintendent' : 'administrator';
  }
  if (isOfficeRole(profile)) {
    return profile.role === 'superintendent' ? 'superintendent' : 'administrator';
  }
  if (isTeacherRole(profile)) return 'teacher';
  return null;
}

export function isOfficeChromeRole(role: string | null | undefined): boolean {
  return role === 'superintendent' || role === 'administrator';
}

export async function loadChromeSeatPreference(
  profileId: string | null | undefined,
): Promise<ChromeSeatPreference | null> {
  if (!profileId) return null;
  try {
    const raw = await AsyncStorage.getItem(chromeSeatStorageKey(profileId));
    if (raw === 'office' || raw === 'teacher') return raw;
  } catch {
    // Missing storage is fine — default via resolveStaffChromeRole.
  }
  return null;
}

export async function saveChromeSeatPreference(
  profileId: string,
  seat: ChromeSeatPreference,
): Promise<void> {
  await AsyncStorage.setItem(chromeSeatStorageKey(profileId), seat);
}
