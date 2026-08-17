import { AppState, type AppStateStatus } from 'react-native';

import { aiDevUrl } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase/client';

const FOREGROUND_NETWORK_TRIES = 4;
const RESUME_SETTLE_MS = 450;

/**
 * Call an AI function. In development this hits the local Grok OAuth
 * gateway (`npm run ai:dev`). Later it can hit deployed Edge Functions.
 */
export async function invokeAi<T extends object>(
  name:
    | 'analyze-homework'
    | 'generate-practice'
    | 'transcribe'
    | 'extract-roster'
    | 'transcribe-audio'
    | 'interpret-speech'
    | 'evaluate-homework'
    | 'ask-assistant'
    | 'classify-capture'
    | 'crop-portrait'
    | 'cutout-portrait'
    | 'analyze-answer-key'
    | 'match-key',
  body: Record<string, unknown>,
): Promise<T> {
  if (aiDevUrl) {
    return invokeLocal<T>(name, body);
  }
  return invokeEdge<T>(name, body);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAppSuspended(state: AppStateStatus): boolean {
  // `inactive` is the camera, a notification shade, or a transition.
  // Only `background` means iOS has torn down the LAN fetch.
  return state === 'background';
}

/** True if we actually waited for a resume (caller may add a short settle). */
function waitUntilAppResumed(): Promise<boolean> {
  if (!isAppSuspended(AppState.currentState)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!isAppSuspended(next)) {
        sub.remove();
        resolve(true);
      }
    });
  });
}

function isAbortLike(err: unknown): boolean {
  if (typeof err === 'object' && err && 'name' in err && (err as { name: string }).name === 'AbortError') {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return /aborted|cancelled|canceled/i.test(message);
}

function isTransientNetworkFailure(err: unknown): boolean {
  if (isAbortLike(err)) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /network request failed|failed to fetch|the network connection was lost|could not connect|load failed|timed out|timeout|network error|internet connection/i.test(
    message,
  );
}

class AiHttpError extends Error {}

async function invokeLocal<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const url = `${aiDevUrl.replace(/\/$/, '')}/${name}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const jsonBody = JSON.stringify(body);

  let foregroundFailures = 0;
  // iOS suspends the JS thread and cancels in-flight LAN fetches when the
  // teacher swipes to another app. That looks exactly like "server is down"
  // unless we wait to be foreground again and retry.
  while (foregroundFailures < FOREGROUND_NETWORK_TRIES) {
    const resumed = await waitUntilAppResumed();
    if (resumed) await sleep(RESUME_SETTLE_MS);

    const controller = new AbortController();
    let leftApp = false;
    const onAppState = (next: AppStateStatus) => {
      if (next === 'background') {
        leftApp = true;
        controller.abort();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: jsonBody,
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
      if (!response.ok || payload.error) {
        throw new AiHttpError(payload.error || `AI ${name} failed (${response.status}). Is npm run ai:dev running?`);
      }
      return payload;
    } catch (err) {
      if (err instanceof AiHttpError) throw err;

      const stillBackgrounded = isAppSuspended(AppState.currentState);
      if (leftApp || stillBackgrounded || isAbortLike(err)) {
        continue;
      }
      if (!isTransientNetworkFailure(err)) {
        break;
      }
      foregroundFailures += 1;
      if (foregroundFailures < FOREGROUND_NETWORK_TRIES) {
        await sleep(350 * foregroundFailures);
      }
    } finally {
      sub.remove();
    }
  }

  throw new Error(
    `Cannot reach Grok at ${aiDevUrl}. Keep npm run ai:dev running on the computer. Phone and computer must be on the same Wi-Fi.`,
  );
}

async function invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke(name, { body });
  const payload = (data ?? {}) as T & { error?: string };
  if (error) {
    throw new Error(
      error.message.includes('Failed to send') || error.message.includes('not found')
        ? `AI ${name} is not deployed. For local Grok OAuth, set EXPO_PUBLIC_AI_DEV_URL and run npm run ai:dev.`
        : error.message,
    );
  }
  if (payload.error) throw new Error(payload.error);
  return payload;
}
