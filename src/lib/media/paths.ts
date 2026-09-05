/** `{name}.ext` → `{name}_thumb.jpg` (JPEG derivative; matches backfill). Already-thumb paths stay put. */

export function isThumbStoragePath(path: string): boolean {
  return /_thumb(\.[^./]+)?$/.test(path);
}

/** Canonical thumb object key: always `_thumb.jpg` when the source has an extension. */
export function thumbStoragePath(storagePath: string): string {
  if (!storagePath || isThumbStoragePath(storagePath)) return storagePath;
  const slash = storagePath.lastIndexOf('/');
  const dot = storagePath.lastIndexOf('.');
  if (dot <= slash) return `${storagePath}_thumb`;
  return `${storagePath.slice(0, dot)}_thumb.jpg`;
}

/**
 * Pre-convention thumb key that kept the source extension (`a.png` → `a_thumb.png`).
 * Used only as a secondary probe when the canonical `_thumb.jpg` object is missing.
 */
export function legacyThumbStoragePath(storagePath: string): string {
  if (!storagePath || isThumbStoragePath(storagePath)) return storagePath;
  const slash = storagePath.lastIndexOf('/');
  const dot = storagePath.lastIndexOf('.');
  if (dot <= slash) return `${storagePath}_thumb`;
  return `${storagePath.slice(0, dot)}_thumb${storagePath.slice(dot)}`;
}

export function originalStoragePath(storagePath: string): string {
  if (!storagePath) return storagePath;
  return storagePath.replace(/_thumb(\.[^./]+)?$/, '$1');
}

/** Opt-in only. Lists/avatars must not pull multi-MB originals when a thumb is missing. */
export function allowOriginalPhotoFallback(fallbackOriginal?: boolean): boolean {
  return fallbackOriginal === true;
}

/** Disk / expo-image cache key: object path, never the signed token. */
export function cacheKeyForUri(uri: string): string {
  const base = uri.split('?')[0] ?? uri;
  try {
    const url = new URL(uri);
    for (const marker of ['/object/sign/', '/object/public/', '/object/authenticated/']) {
      const at = url.pathname.indexOf(marker);
      if (at >= 0) return decodeURIComponent(url.pathname.slice(at + marker.length));
    }
    return url.pathname.replace(/^\/+/, '') || base;
  } catch {
    return base;
  }
}
