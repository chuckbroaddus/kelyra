import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import { supabaseUrl } from '@/constants/config';

const configured = (process.env.EXPO_PUBLIC_LESSON_DEV_URL ?? '').replace(/\/$/, '');

export function lessonHostOrigin(base = supabaseUrl): string {
  return `${base.replace(/\/$/, '')}/functions/v1/lesson-host`;
}

export function lessonDevOrigin(): string | null {
  const resolved = resolveLessonDevUrl();
  return resolved || null;
}

export function useDevLessonServer(): boolean {
  return Boolean(lessonDevOrigin() && (typeof __DEV__ !== 'undefined' ? __DEV__ : false));
}

export function lessonDocumentUrl(token: string, path = 'index.html'): string {
  const dev = lessonDevOrigin();
  if (dev && (typeof __DEV__ !== 'undefined' ? __DEV__ : false)) {
    return `${dev}/${path.replace(/^\//, '')}`;
  }
  return `${lessonHostOrigin(supabaseUrl)}/${token}/${path.replace(/^\//, '')}`;
}

function resolveLessonDevUrl(): string {
  const fallback = configured || (typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://localhost:8772' : '');
  const configuredHost = hostnameOf(fallback);
  const lanHost = firstLanHost();
  if (lanHost && (!fallback || isLoopback(configuredHost))) {
    return `http://${lanHost}:${portOf(fallback) || '8772'}`;
  }
  return fallback;
}

function firstLanHost(): string | null {
  if (Platform.OS === 'web') return null;
  for (const host of candidateHosts()) {
    if (host && !isLoopback(host)) return host;
  }
  return null;
}

function candidateHosts(): string[] {
  const hosts: string[] = [];
  const pushHost = (raw?: string | null) => {
    if (!raw) return;
    const cleaned = String(raw)
      .replace(/^(exp|exps|http|https):\/\//i, '')
      .split('/')[0] ?? '';
    const host = (cleaned.split(':')[0] ?? '').replace(/^\[|\]$/g, '');
    if (host) hosts.push(host);
  };
  pushHost(NativeModules.SourceCode?.scriptURL as string | undefined);
  pushHost(Constants.expoConfig?.hostUri);
  pushHost(Constants.linkingUri);
  const go = Constants.expoGoConfig as { debuggerHost?: string } | null;
  pushHost(go?.debuggerHost);
  const manifest = (Constants as { manifest?: { debuggerHost?: string; hostUri?: string } | null }).manifest;
  pushHost(manifest?.debuggerHost);
  pushHost(manifest?.hostUri);
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
