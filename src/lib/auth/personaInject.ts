/**
 * Local UI-proof sign-in. The drive script serves a session on 127.0.0.1
 * and opens `/?kelyra_persona_port=<port>`. This module applies that session.
 * It never reads ~/.kelyra and never logs tokens.
 */

export const PERSONA_PORT_PARAM = 'kelyra_persona_port';
export const UI_PROOF_SEAT_KEY = 'kelyra.ui-proof.seat';

export type UiProofSeat = 'office' | 'teacher' | 'parent';
export type PersonaInjectResult = 'ok' | 'skip' | 'fail';

declare global {
  interface Window {
    __kelyraPersonaInject?: PersonaInjectResult;
  }
}

export function personaPortFromSearch(search: string): number | null {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get(PERSONA_PORT_PARAM);
  if (!value || !/^[0-9]{1,5}$/.test(value)) return null;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

export function personaSessionUrl(port: number): string {
  return `http://127.0.0.1:${port}/session`;
}

export function uiProofSeatFromValue(value: unknown): UiProofSeat | null {
  if (value === 'office' || value === 'teacher' || value === 'parent') return value;
  return null;
}

function mark(result: PersonaInjectResult): PersonaInjectResult {
  if (typeof window !== 'undefined') window.__kelyraPersonaInject = result;
  return result;
}

function browserSearch(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const search = window.location.search;
  return typeof search === 'string' ? search : null;
}

function searchFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    return url.search || null;
  } catch {
    const q = href.indexOf('?');
    return q >= 0 ? href.slice(q) : null;
  }
}

async function nativeSearch(): Promise<string | null> {
  try {
    const Linking = await import('expo-linking');
    const href = (await Linking.getInitialURL()) || Linking.createURL('/');
    return searchFromHref(href);
  } catch {
    return null;
  }
}

export function peekPendingUiProofSeat(): UiProofSeat | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return uiProofSeatFromValue(window.sessionStorage.getItem(UI_PROOF_SEAT_KEY));
  }
  return null;
}

async function rememberSeat(seat: UiProofSeat | null): Promise<void> {
  if (!seat) return;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem(UI_PROOF_SEAT_KEY, seat);
    return;
  }
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(UI_PROOF_SEAT_KEY, seat);
  } catch {
    // Seat hint is best-effort for chrome; session tokens still apply.
  }
}

export async function injectPersonaFromQuery(): Promise<PersonaInjectResult> {
  const search = browserSearch() ?? (await nativeSearch());
  if (search == null) return mark('skip');
  const port = personaPortFromSearch(search);
  if (!port) return mark('skip');
  try {
    const response = await fetch(personaSessionUrl(port));
    const payload = (await response.json().catch(() => null)) as {
      access_token?: string;
      refresh_token?: string;
      seat?: unknown;
    } | null;
    if (!response.ok || !payload?.access_token || !payload.refresh_token) {
      return mark('fail');
    }
    const seat = uiProofSeatFromValue(payload.seat);
    await rememberSeat(seat);
    const { requireSupabase } = await import('@/lib/supabase/client');
    const { error } = await requireSupabase().auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    if (error) return mark('fail');
    if (typeof window !== 'undefined' && window.location && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete(PERSONA_PORT_PARAM);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return mark('ok');
  } catch {
    return mark('fail');
  }
}
