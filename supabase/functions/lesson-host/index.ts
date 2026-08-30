/**
 * Same-origin static gateway for private bucket `lessons`.
 * Verifies a short-lived lesson JWT (not the user session) and streams
 * lessons/{deck_id}/{version}/… so relative audio/img stay under this token prefix.
 *
 * Service role is used only to read the private object after JWT verify.
 * It is not the actor for assign / results. See notes/lessons-policy.md.
 */

import { LESSON_BRIDGE_JS } from '../_shared/lessonBridge.ts';
import { getLessonHostSecret, verifyLessonJwt } from '../_shared/lessonJwt.ts';

const BUCKET = 'lessons';
const BRIDGE_PATH = '__kelyra/bridge.js';

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
};

function cors(extra: Record<string, string> = {}): Headers {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Cache-Control': 'private, max-age=120',
    ...extra,
  };
  // Supabase rewrites GET text/html to text/plain without a custom domain.
  // nosniff then makes the browser print the lesson source. Skip it for HTML.
  const type = headers['Content-Type'] ?? '';
  if (!type.startsWith('text/html')) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }
  return new Headers(headers);
}

function fail(status: number, message: string) {
  return new Response(message, { status, headers: cors({ 'Content-Type': 'text/plain; charset=utf-8' }) });
}

function extOf(path: string): string {
  const base = path.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i >= 0 ? base.slice(i + 1).toLowerCase() : '';
}

function parseTokenPath(url: URL): { token: string; rest: string } | null {
  const raw = url.pathname.replace(/^\/functions\/v1\/lesson-host\/?/, '/').replace(/^\/lesson-host\/?/, '/');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return null;
  // JWT is header.body.sig — three base64url segments joined by dots, no slashes.
  const token = parts[0]!;
  const rest = parts.slice(1).join('/');
  return { token, rest };
}

function safeRest(rest: string): string | null {
  const trimmed = rest.replace(/^\/+/, '');
  if (!trimmed) return 'index.html';
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const parts = decoded.split('/').filter((p) => p && p !== '.');
  if (parts.some((p) => p === '..' || p.includes('\\'))) return null;
  return parts.join('/');
}

function injectBridge(html: string): string {
  const tag = '<script src="__kelyra/bridge.js"></script>';
  if (html.includes('__kelyra/bridge.js')) return html;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);
  return `${tag}\n${html}`;
}

async function streamObject(prefix: string, objectPath: string): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !service) return fail(500, 'Lesson host is not configured');
  const key = `${prefix}/${objectPath}`.replace(/\/+/g, '/');
  const target = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${BUCKET}/${key}`;
  const res = await fetch(target, {
    headers: { Authorization: `Bearer ${service}`, apikey: service },
  });
  if (res.status === 404) return fail(404, 'Not found');
  if (!res.ok) return fail(res.status === 401 || res.status === 403 ? 404 : 502, 'Not found');
  const ext = extOf(objectPath);
  const type = TYPES[ext] ?? res.headers.get('content-type') ?? 'application/octet-stream';
  let body: BodyInit = res.body ?? new Uint8Array();
  if (ext === 'html' || ext === 'htm') {
    const text = injectBridge(await res.text());
    body = text;
  }
  return new Response(body, {
    status: 200,
    headers: cors({
      'Content-Type': type,
      'Cache-Control': ext === 'html' || ext === 'htm' ? 'private, no-store' : 'private, max-age=300',
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'Method not allowed');

  const secret = await getLessonHostSecret();
  if (!secret) return fail(503, 'Lesson host is not configured');

  const parsed = parseTokenPath(new URL(req.url));
  if (!parsed) return fail(401, 'Sign in to Kelyra to open this lesson.');

  let claims;
  try {
    claims = await verifyLessonJwt(parsed.token, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bad token';
    if (message === 'expired') return fail(401, 'expired');
    return fail(401, 'Sign in to Kelyra to open this lesson.');
  }

  const rest = safeRest(parsed.rest);
  if (!rest) return fail(400, 'Not found');
  if (rest === BRIDGE_PATH) {
    return new Response(LESSON_BRIDGE_JS, {
      headers: cors({
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
      }),
    });
  }

  try {
    return await streamObject(claims.prefix, rest);
  } catch {
    return fail(502, 'Not found');
  }
});
