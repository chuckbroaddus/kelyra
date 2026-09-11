import { birthdayForSave } from '../date/iso.ts';

/**
 * Ask `update_student` birthday branch — coerce + range before any student write.
 * Empty present value → skip (no patch). Invalid/out-of-range → error (no write).
 * Does not reopen DATE product law; wraps birthdayForSave only.
 */
export type AskStudentBirthdayPrep =
  | { action: 'skip' }
  | { action: 'set'; value: string }
  | { action: 'error'; error: string };

export function prepareAskStudentBirthday(raw: string, now = new Date()): AskStudentBirthdayPrep {
  const result = birthdayForSave(raw, now);
  if (!result.ok) return { action: 'error', error: result.error };
  if (!result.value) return { action: 'skip' };
  return { action: 'set', value: result.value };
}
