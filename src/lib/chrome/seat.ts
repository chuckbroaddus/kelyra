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

/** Seat-root href for Option A switch — always land root, never stay-on-compatible-route. */
export function chromeSeatRootHref(seat: ChromeSeatPreference): string {
  return seat === 'parent' ? '/parent' : '/';
}

/**
 * When optimistic seatNavPath may clear. /class/* is teacher landing only — never clear
 * office seat-root `/` while the router is still on a prior teacher /class/* path.
 */
export function shouldClearSeatNavPath(input: {
  seatNavPath: string | null;
  pathname: string;
  /** Post-commit chrome.role (after preference resolve). */
  role: string | null | undefined;
}): boolean {
  const { seatNavPath, pathname, role } = input;
  if (!seatNavPath) return false;
  if (pathname === seatNavPath) return true;
  if (seatNavPath === '/') {
    if (pathname === '') return true;
    // Teacher Desk often redirects `/` → `/class/{id}`; only then is /class/* arrived root.
    if (/^\/class\//.test(pathname) && role === 'teacher') return true;
    return false;
  }
  if (seatNavPath === '/parent' && pathname.startsWith('/parent')) return true;
  return false;
}

/** Pathname used for wordmark/tray while a seat switch is in flight. */
export function chromePathnameForSeatNav(
  seatNavPath: string | null,
  pathname: string,
): string {
  return seatNavPath ?? pathname;
}

/**
 * Other office↔teacher hamburger row when already on an office or teacher seat.
 * Null on parent / none — parent drawer lists Office and Teach separately.
 */
export function otherOfficeTeacherSeatRow(
  role: string | null | undefined,
): {
  seat: 'office' | 'teacher';
  label: 'Office' | 'Teach';
  accessibilityLabel: string;
} | null {
  if (isOfficeChromeRole(role)) {
    return {
      seat: 'teacher',
      label: 'Teach',
      accessibilityLabel: 'Switch to Teach seat',
    };
  }
  if (role === 'teacher') {
    return {
      seat: 'office',
      label: 'Office',
      accessibilityLabel: 'Switch to Office seat',
    };
  }
  return null;
}

/**
 * Cold-start restore for dual-hat preference (DH-07 / §31.4b).
 * Parent is session-only altitude — never restore across force-quit / cold launch.
 * Office↔teacher may persist.
 */
export function coldStartChromeSeatPreference(
  raw: string | null | undefined,
): 'office' | 'teacher' | null {
  if (raw === 'office' || raw === 'teacher') return raw;
  return null;
}

export async function loadChromeSeatPreference(
  profileId: string | null | undefined,
): Promise<ChromeSeatPreference | null> {
  if (!profileId) return null;
  try {
    const key = chromeSeatStorageKey(profileId);
    const raw = await AsyncStorage.getItem(key);
    const seat = coldStartChromeSeatPreference(raw);
    // Drop stale parent so a later read cannot resurrect Parent tray.
    if (raw === 'parent') {
      await AsyncStorage.removeItem(key);
    }
    return seat;
  } catch {
    // Missing storage is fine — default via resolveStaffChromeRole.
  }
  return null;
}

export async function saveChromeSeatPreference(
  profileId: string,
  seat: ChromeSeatPreference,
): Promise<void> {
  const key = chromeSeatStorageKey(profileId);
  // Parent is in-session only (DH-07). Clearing leaves job-of-record default on cold start.
  if (seat === 'parent') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, seat);
}
