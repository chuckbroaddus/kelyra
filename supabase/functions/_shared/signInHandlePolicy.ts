/**
 * Q10 sign-in-handle pure helpers — session shape + grant email pick.
 * Edge keeps service_role RPC + password grant; tests cover token-only responses.
 */

export const DEFAULT_DUMMY_EMAIL = 'sign-in-dummy@users.kelyra.invalid';
export const SIGN_IN_FAIL = 'Invalid login credentials';

export function normalizeSignInHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase().slice(0, 32);
}

/** Resolve login_identifier result to an email or null (miss / bad shape). */
export function resolveLoginEmail(lookup: unknown, lookupError: unknown): string | null {
  if (lookupError) return null;
  if (typeof lookup !== 'string') return null;
  return lookup.includes('@') ? lookup : null;
}

export function pickGrantEmail(resolved: string | null, dummy: string = DEFAULT_DUMMY_EMAIL): string {
  return resolved ?? dummy.trim();
}

export type SessionTokenPayload = {
  access_token?: string;
  refresh_token?: string;
};

/** Tokens only when lookup resolved and grant succeeded — never include email. */
export function shouldReturnSession(
  resolved: string | null,
  tokenOk: boolean,
  payload: SessionTokenPayload | null | undefined,
): boolean {
  return Boolean(
    resolved && tokenOk && payload?.access_token && payload?.refresh_token,
  );
}

/** Success body: access_token + refresh_token only (no email / user / identities). */
export function sessionTokensOnly(payload: SessionTokenPayload): {
  access_token: string;
  refresh_token: string;
} {
  return {
    access_token: payload.access_token as string,
    refresh_token: payload.refresh_token as string,
  };
}

export function sessionResponseKeys(body: Record<string, unknown>): string[] {
  return Object.keys(body).sort();
}
