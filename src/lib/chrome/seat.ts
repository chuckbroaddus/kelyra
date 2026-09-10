import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isAlsoParent,
  isOfficeRole,
  isStaffRole,
  type ProfileHats,
} from '../school/roles.ts';

/** Client chrome seat for dual-hat staff. Not JWT, not SQL. */
export type ChromeSeatPreference = 'office' | 'teacher' | 'parent';

const SEAT_KEY_PREFIX = 'kelyra.chrome.seat.';

export function chromeSeatStorageKey(profileId: string): string {
  return `${SEAT_KEY_PREFIX}${profileId}`;
}

/**
 * Seats a staff profile may sit in. Job-of-record first; also_teacher / also_parent add seats.
 * Pure parent login is not staff — empty list.
 */
export function availableChromeSeats(
  profile: ProfileHats | null | undefined,
): ChromeSeatPreference[] {
  if (!profile?.role || !isStaffRole(profile)) return [];
  const seats: ChromeSeatPreference[] = [];
  if (isOfficeRole(profile)) seats.push('office');
  if (profile.role === 'teacher' || Boolean(profile.also_teacher)) seats.push('teacher');
  if (isAlsoParent(profile)) seats.push('parent');
  return seats;
}

/** True when more than one chrome seat is available (office↔teacher and/or parent). */
export function canChooseChromeSeat(profile: ProfileHats | null | undefined): boolean {
  return availableChromeSeats(profile).length > 1;
}

/** Job-of-record default: office > teacher > parent. Never default into Parent. */
export function defaultChromeSeat(
  profile: ProfileHats | null | undefined,
): ChromeSeatPreference | null {
  const seats = availableChromeSeats(profile);
  if (seats.length === 0) return null;
  if (seats.includes('office')) return 'office';
  if (seats.includes('teacher')) return 'teacher';
  return seats[0] ?? null;
}

/**
 * Resolve chrome.role from hats + explicit seat.
 * Dual-hat office+teacher defaults to Office so also_teacher cannot force the teacher tray.
 * Parent seat flips chrome.role to `parent` (full parent tray including Ride) — never merges trays.
 */
export function resolveStaffChromeRole(
  profile: ProfileHats | null | undefined,
  preference: ChromeSeatPreference | null,
): 'superintendent' | 'administrator' | 'teacher' | 'parent' | null {
  if (!profile?.role) return null;

  const seats = availableChromeSeats(profile);
  if (seats.length > 0) {
    const seat =
      preference && seats.includes(preference) ? preference : defaultChromeSeat(profile);
    if (seat === 'parent') return 'parent';
    if (seat === 'teacher') return 'teacher';
    if (seat === 'office') {
      return profile.role === 'superintendent' ? 'superintendent' : 'administrator';
    }
  }

  if (isOfficeRole(profile)) {
    return profile.role === 'superintendent' ? 'superintendent' : 'administrator';
  }
  if (profile.role === 'teacher') return 'teacher';
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
    if (raw === 'office' || raw === 'teacher' || raw === 'parent') return raw;
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
