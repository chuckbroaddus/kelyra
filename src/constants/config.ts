import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

export const appName = 'Kelyra';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const configuredAiUrl = (process.env.EXPO_PUBLIC_AI_DEV_URL ?? '').replace(/\/$/, '');

/**
 * Local Grok OAuth gateway.
 * On a phone, localhost is the phone — rewrite to the Metro/computer host.
 */
export const aiDevUrl = resolveAiDevUrl();

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 0;
}

export function isAiConfigured(): boolean {
  return aiDevUrl.startsWith('http');
}

function resolveAiDevUrl(): string {
  const configuredHost = hostnameOf(configuredAiUrl);
  const lanHost = firstLanHost();
  if (lanHost && (!configuredAiUrl || isLoopback(configuredHost))) {
    return `http://${lanHost}:${portOf(configuredAiUrl) || '8787'}`;
  }
  return configuredAiUrl;
}

function firstLanHost(): string | null {
  for (const host of candidateHosts()) {
    if (host && !isLoopback(host)) return host;
  }
  return null;
}

function candidateHosts(): string[] {
  const hosts: string[] = [];
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  const fromScript = scriptURL?.match(/https?:\/\/([^/:]+)/)?.[1];
  if (fromScript) hosts.push(fromScript);

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) hosts.push(hostUri.split(':')[0] ?? '');

  const linking = Constants.linkingUri;
  if (linking) {
    const cleaned = linking.replace(/^(exp|https?):\/\//, '').split('/')[0] ?? '';
    hosts.push(cleaned.split(':')[0] ?? '');
  }
  return hosts.filter(Boolean);
}

function hostnameOf(url: string): string | null {
  return url.match(/^https?:\/\/([^/:]+)/)?.[1] ?? null;
}

function portOf(url: string): string | null {
  return url.match(/^https?:\/\/[^/:]+:(\d+)/)?.[1] ?? null;
}

function isLoopback(host: string | null): boolean {
  return !host || host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
