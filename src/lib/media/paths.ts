/** `{name}.jpg` → `{name}_thumb.jpg`. Already-thumb paths stay put. */

export function isThumbStoragePath(path: string): boolean {
  return /_thumb(\.[^./]+)?$/.test(path);
}

export function thumbStoragePath(storagePath: string): string {
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

/** Faces use thumbs only. Homework stills may fall back to the original object. */
export function allowOriginalPhotoFallback(fallbackOriginal?: boolean): boolean {
  return fallbackOriginal !== false;
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
