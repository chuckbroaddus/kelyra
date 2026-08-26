/** HS256 lesson-host tokens. Not a user session. No student name in the payload. */

export type LessonJwtPayload = {
  sub: string;
  role: 'student' | 'preview';
  aid: string;
  prefix: string;
  exp: number;
  iat: number;
};

function b64url(data: ArrayBuffer | string): string {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlJson(value: unknown): string {
  return b64url(JSON.stringify(value));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signLessonJwt(payload: LessonJwtPayload, secret: string): Promise<string> {
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyLessonJwt(token: string, secret: string): Promise<LessonJwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const [header, body, sig] = parts;
  const key = await hmacKey(secret);
  const expected = b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`)));
  if (expected !== sig) throw new Error('bad token');
  const json = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as LessonJwtPayload;
  if (!json || typeof json !== 'object') throw new Error('bad token');
  if (typeof json.exp !== 'number' || json.exp * 1000 < Date.now()) throw new Error('expired');
  if (json.role !== 'student' && json.role !== 'preview') throw new Error('bad token');
  if (!json.sub || !json.aid || !json.prefix) throw new Error('bad token');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(json.prefix)) {
    throw new Error('bad token');
  }
  return json;
}

export function lessonTtlSec(): number {
  return 60 * 60;
}
