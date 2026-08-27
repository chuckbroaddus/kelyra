/** Project storage host for Ask image hydration (SSRF allowlist). */
export const ASK_STORAGE_HOST = 'aohibokgilxhqwmupdfv.supabase.co';

const METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata',
  'metadata.goog',
  'instance-data',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

function isBlockedIpHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
  if (host === '169.254.169.254') return true;

  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

/**
 * Ask may hydrate `data:` images as-is, or https objects on this project's
 * Supabase Storage. Everything else is rejected (SSRF).
 */
export function isAllowedAskImageUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  if (url.startsWith('data:')) return true;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();
  if (METADATA_HOSTS.has(host) || isBlockedIpHost(host)) return false;
  if (host !== ASK_STORAGE_HOST) return false;
  if (!parsed.pathname.startsWith('/storage/v1/object/')) return false;
  return true;
}
