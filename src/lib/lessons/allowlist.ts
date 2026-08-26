import { supabaseUrl } from '@/constants/config';
import { lessonDevOrigin, lessonHostOrigin } from '@/lib/lessons/host';

const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

export { lessonHostOrigin };

export function allowedLessonOrigins(extra: string[] = []): string[] {
  const origins = new Set<string>();
  if (supabaseUrl) origins.add(lessonHostOrigin());
  const dev = lessonDevOrigin();
  if (dev) origins.add(dev);
  for (const item of extra) {
    if (item) origins.add(item.replace(/\/$/, ''));
  }
  return [...origins];
}

export function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isAllowedLessonNavigation(url: string, documentUrl: string, extra: string[] = []): boolean {
  if (!url || url === 'about:blank' || url.startsWith('about:srcdoc')) return true;
  const origin = originOf(url);
  const doc = originOf(documentUrl);
  if (origin && doc && origin === doc) return true;
  if (!origin) return false;
  return allowedLessonOrigins(extra).some((allowed) => origin === allowed);
}

/** Font stylesheet/fetch only — never a top-level navigation. */
export function isAllowedLessonSubresource(url: string, documentUrl: string, extra: string[] = []): boolean {
  if (isAllowedLessonNavigation(url, documentUrl, extra)) return true;
  const host = hostOf(url);
  return Boolean(host && FONT_HOSTS.has(host));
}

export function isFontHost(url: string): boolean {
  const host = hostOf(url);
  return Boolean(host && FONT_HOSTS.has(host));
}

export const OFF_ALLOWLIST_COPY = 'That link is not part of this lesson.';
export const EXPIRY_COPY = 'Could not keep the lesson open';
export const EMPTY_CATALOG_COPY = 'No lessons yet.';
