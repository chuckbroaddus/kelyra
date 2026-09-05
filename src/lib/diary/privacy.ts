/** Honest RLS-only (model C) privacy copy. Forbidden E2E / “only you” theater. */

export const DIARY_PRIVACY_TITLE = 'Private to you in Kelyra';

export const DIARY_PRIVACY_BODY =
  'Private to you in Kelyra. School IT or a legal process could still access server-held data.';

export const DIARY_FERPA_NOTE =
  'Personal reflection — not the official student file. Diary does not send notes to the principal, Feed, or the student Log.';

export const DIARY_PRIVACY_ACK_KEY_PREFIX = 'kelyra.diary.privacyAck.';

export function diaryPrivacyAckKey(profileId: string): string {
  return `${DIARY_PRIVACY_ACK_KEY_PREFIX}${profileId}`;
}

/** Strings that must never appear in diary privacy UI under model C. */
export const DIARY_FORBIDDEN_PRIVACY_PHRASES = [
  'end-to-end encrypted',
  'only you can ever see this',
  'unreadable by Kelyra',
] as const;

export function diaryPrivacyCopyIsHonest(text: string): boolean {
  const lower = text.toLowerCase();
  return !DIARY_FORBIDDEN_PRIVACY_PHRASES.some((phrase) => lower.includes(phrase));
}
