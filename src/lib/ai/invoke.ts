import { aiDevUrl } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase/client';

/**
 * Call an AI function. In development this hits the local Grok OAuth
 * gateway (`npm run ai:dev`). Later it can hit deployed Edge Functions.
 */
export async function invokeAi<T extends object>(
  name: 'analyze-homework' | 'generate-practice' | 'transcribe',
  body: Record<string, unknown>,
): Promise<T> {
  if (aiDevUrl) {
    return invokeLocal<T>(name, body);
  }
  return invokeEdge<T>(name, body);
}

async function invokeLocal<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const url = `${aiDevUrl.replace(/\/$/, '')}/${name}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Cannot reach Grok at ${aiDevUrl}. Keep npm run ai:dev running on the computer. Phone and computer must be on the same Wi-Fi.`,
    );
  }
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `AI ${name} failed (${response.status}). Is npm run ai:dev running?`);
  }
  return payload;
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
