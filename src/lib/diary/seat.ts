import {
  isOfficeChromeRole,
  resolveStaffChromeRole,
  type ChromeSeatPreference,
} from '@/lib/chrome/seat';
import { isAlsoParent, isOfficeRole, isTeacherRole, type ProfileHats } from '@/lib/school/roles';

/** Diary / ledger chrome seat (not profiles.role job-of-record). */
export type DiarySeat = 'teacher' | 'staff' | 'parent';

export function diarySeatForChrome(input: {
  profile: ProfileHats | null | undefined;
  chromeRole: string | null | undefined;
  chromeSeatPreference?: ChromeSeatPreference | null;
}): DiarySeat | null {
  const { profile, chromeRole } = input;
  if (!profile?.role) return null;
  if (profile.role === 'student') return null;

  if (chromeRole === 'parent' || (profile.role === 'parent' && !isOfficeRole(profile) && !isTeacherRole(profile))) {
    return 'parent';
  }

  if (isOfficeChromeRole(chromeRole)) return 'staff';

  if (chromeRole === 'teacher' || isTeacherRole(profile)) return 'teacher';

  if (isOfficeRole(profile)) {
    const resolved = resolveStaffChromeRole(profile, input.chromeSeatPreference ?? null);
    if (isOfficeChromeRole(resolved)) return 'staff';
    if (resolved === 'teacher') return 'teacher';
  }

  if (isAlsoParent(profile)) return 'parent';
  return null;
}

export function canOpenDiary(profile: ProfileHats | null | undefined): boolean {
  if (!profile?.role || profile.role === 'student') return false;
  return (
    isTeacherRole(profile) ||
    isOfficeRole(profile) ||
    isAlsoParent(profile) ||
    profile.role === 'parent'
  );
}
