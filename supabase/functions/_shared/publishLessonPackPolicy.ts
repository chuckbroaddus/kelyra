/**
 * Publish-lesson-pack allowlist + live FoM wall.
 * Imported by the Edge function and node security tests (role-hat fixtures).
 * Keep canPublish identical to the teacher/office seat wall — not is_staff.
 */

import { isOfficeRole, type ProfileHats } from './askToolPolicy.ts';

/** Live FoM Ch01 catalog + storage wall. Test ids (…-test) are not live. */
export const LIVE_FOM_STORAGE = 'fom-ch01';
export const LIVE_FOM_VERSION = 'v4';
export const LIVE_FOM_DECK = /^fom-ch01(?:-s\d+)?$/;

/** Teacher seat, also_teacher hat, or office role. Parents/students/anon = false. */
export function canPublish(profile: ProfileHats | null | undefined): boolean {
  if (!profile?.role) return false;
  if (profile.role === 'teacher') return true;
  if (profile.also_teacher) return true;
  if (profile.role === 'superintendent' || profile.role === 'administrator') return true;
  return false;
}

export function isLiveFomDeckId(deckId: string): boolean {
  return LIVE_FOM_DECK.test(deckId);
}

export function isLiveFomStoragePath(storageDeckId: string, version: string): boolean {
  return storageDeckId === LIVE_FOM_STORAGE && version === LIVE_FOM_VERSION;
}

/** True when live FoM / shared-folder write is allowed (office + replace_live). */
export function mayReplaceProtectedPack(
  profile: ProfileHats | null | undefined,
  replaceLive: boolean,
): boolean {
  return Boolean(isOfficeRole(profile) && replaceLive);
}

export function isLiveFomHit(deckId: string, storageDeckId: string, version: string): boolean {
  return isLiveFomDeckId(deckId) || isLiveFomStoragePath(storageDeckId, version);
}

export { isOfficeRole };
export type { ProfileHats };
