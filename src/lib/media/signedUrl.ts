import AsyncStorage from '@react-native-async-storage/async-storage';

import { allowOriginalPhotoFallback, originalStoragePath, thumbStoragePath } from '@/lib/media/paths';
import { requireSupabase } from '@/lib/supabase/client';

const STORAGE_KEY_PREFIX = 'kelyra.signed-urls.v1';
const SIGN_TTL_SEC = 3600;
const REFRESH_MS = 5 * 60 * 1000;

type Bucket = 'photos' | 'audio' | 'files';
type Entry = { url: string; exp: number };

let memory = new Map<string, Entry>();
const missingUntil = new Map<string, number>();
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const inflight = new Map<string, Promise<Map<string, string>>>();
const MISS_MS = 10 * 60 * 1000;
/** Auth user id the in-memory + disk cache is bound to (null = logged out / cleared). */
let cacheUserId: string | null = null;

function diskKeyFor(userId: string | null): string | null {
  if (!userId) return null;
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

async function removeAllSignedUrlDiskKeys(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(
      (key) => key === STORAGE_KEY_PREFIX || key.startsWith(`${STORAGE_KEY_PREFIX}:`),
    );
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_PREFIX);
    } catch {
      // Local cache only.
    }
  }
}

function cacheId(bucket: Bucket, path: string): string {
  return `${bucket}:${path}`;
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const diskKey = diskKeyFor(cacheUserId);
  if (!diskKey) return;
  try {
    const raw = await AsyncStorage.getItem(diskKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    const now = Date.now();
    for (const [key, value] of Object.entries(parsed)) {
      if (value?.url && typeof value.exp === 'number' && value.exp - REFRESH_MS > now) {
        memory.set(key, value);
      }
    }
  } catch {
    // Corrupt cache is ignored; we re-sign.
  }
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const now = Date.now();
    const obj: Record<string, Entry> = {};
    for (const [key, value] of memory) {
      if (value.exp > now) obj[key] = value;
    }
    const diskKey = diskKeyFor(cacheUserId);
    if (diskKey) void AsyncStorage.setItem(diskKey, JSON.stringify(obj)).catch(() => undefined);
  }, 200);
}

function isKnownMissing(bucket: Bucket, path: string): boolean {
  const until = missingUntil.get(cacheId(bucket, path));
  return until != null && until > Date.now();
}

function rememberMissing(bucket: Bucket, path: string): void {
  missingUntil.set(cacheId(bucket, path), Date.now() + MISS_MS);
}

export async function clearSignedUrlCache(): Promise<void> {
  memory = new Map();
  missingUntil.clear();
  hydrated = true;
  cacheUserId = null;
  await removeAllSignedUrlDiskKeys();
}

/**
 * Bind the signed-URL cache to an auth user (or clear when session is null / SIGNED_OUT).
 * Prefer scoping disk keys by user id so a prior session cannot leak URLs.
 */
export async function bindSignedUrlCacheUser(userId: string | null | undefined): Promise<void> {
  const next = userId || null;
  if (next === cacheUserId && (next != null || hydrated)) return;
  memory = new Map();
  missingUntil.clear();
  hydrated = false;
  cacheUserId = next;
  if (!next) {
    hydrated = true;
    await removeAllSignedUrlDiskKeys();
    return;
  }
  // Drop legacy unscoped key so old sessions cannot resurrect cross-user URLs.
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_PREFIX);
  } catch {
    // Local cache only.
  }
}

export async function signedUrls(bucket: Bucket, paths: string[]): Promise<Map<string, string>> {
  await hydrate();
  const unique = [...new Set(paths.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const now = Date.now();
  const need: string[] = [];
  for (const path of unique) {
    const hit = memory.get(cacheId(bucket, path));
    if (hit && hit.exp - REFRESH_MS > now) out.set(path, hit.url);
    else if (!isKnownMissing(bucket, path)) need.push(path);
  }
  if (!need.length) return out;

  const flightKey = `${bucket}|${need.slice().sort().join('\0')}`;
  const pending = inflight.get(flightKey);
  const work =
    pending ??
    (async () => {
      const minted = new Map<string, string>();
      const supabase = requireSupabase();
      const exp = Date.now() + SIGN_TTL_SEC * 1000;
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(need, SIGN_TTL_SEC);
      if (!error && data?.length) {
        for (const row of data) {
          const path = row.path;
          const url = row.signedUrl;
          if (path && url && !row.error) {
            memory.set(cacheId(bucket, path), { url, exp });
            minted.set(path, url);
          } else if (path) {
            rememberMissing(bucket, path);
          }
        }
        for (const path of need) {
          if (!minted.has(path)) rememberMissing(bucket, path);
        }
      } else {
        await Promise.all(
          need.map(async (path) => {
            const { data: one, error: oneError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, SIGN_TTL_SEC);
            if (oneError || !one?.signedUrl) {
              rememberMissing(bucket, path);
              return;
            }
            memory.set(cacheId(bucket, path), { url: one.signedUrl, exp });
            minted.set(path, one.signedUrl);
          }),
        );
      }
      schedulePersist();
      return minted;
    })();

  if (!pending) inflight.set(flightKey, work);
  try {
    const minted = await work;
    for (const [path, url] of minted) out.set(path, url);
    return out;
  } finally {
    inflight.delete(flightKey);
  }
}

export async function signedUrl(bucket: Bucket, path: string): Promise<string | null> {
  if (!path) return null;
  return (await signedUrls(bucket, [path])).get(path) ?? null;
}

export type ThumbSignOptions = {
  /**
   * Opt-in: when the `_thumb` object is missing, sign the original (multi-MB).
   * Default is false — lists/avatars stay blank or initials rather than egress.
   */
  fallbackOriginal?: boolean;
};

export async function signedThumbUrls(
  originalPaths: string[],
  knownThumbs?: Map<string, string | null | undefined>,
  options?: ThumbSignOptions,
): Promise<Map<string, string>> {
  const originals = [...new Set(originalPaths.filter(Boolean))];
  const out = new Map<string, string>();
  if (!originals.length) return out;

  const thumbFor = (path: string) => knownThumbs?.get(path) || thumbStoragePath(path);
  const thumbPaths = [...new Set(originals.map(thumbFor).filter(Boolean))];
  const thumbs = await signedUrls('photos', thumbPaths);
  const missing: string[] = [];
  for (const path of originals) {
    const url = thumbs.get(thumbFor(path));
    if (url) out.set(path, url);
    else missing.push(path);
  }
  if (!missing.length || !allowOriginalPhotoFallback(options?.fallbackOriginal)) return out;

  const origs = await signedUrls(
    'photos',
    missing.map((path) => originalStoragePath(path)),
  );
  for (const path of missing) {
    const url = origs.get(originalStoragePath(path));
    if (url) out.set(path, url);
  }
  return out;
}

export async function signedThumbUrl(
  originalPath: string,
  thumbPath?: string | null,
  options?: ThumbSignOptions,
): Promise<string | null> {
  if (!originalPath) return null;
  const known = thumbPath ? new Map([[originalPath, thumbPath]]) : undefined;
  return (await signedThumbUrls([originalPath], known, options)).get(originalPath) ?? null;
}
