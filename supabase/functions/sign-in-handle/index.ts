/**
 * Q10: resolve @handle → Auth session without returning the looked-up email to anon.
 * Cos: deploy this function with verify_jwt=false (see supabase/config.toml).
 * Uses service_role only for login_identifier; password grant uses the anon key.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const FAIL = 'Invalid login credentials';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;

type AttemptBucket = { windowStartedAt: number; count: number };
const attempts = new Map<string, AttemptBucket>();

function corsHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase().slice(0, 32);
}

function clientBucket(req: Request, handle: string): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ip = forwarded || req.headers.get('cf-connecting-ip')?.trim() || 'unknown';
  return `${ip}|${handle}`;
}

function allowAttempt(bucket: string): boolean {
  const now = Date.now();
  const row = attempts.get(bucket);
  if (!row || now - row.windowStartedAt >= WINDOW_MS) {
    attempts.set(bucket, { windowStartedAt: now, count: 1 });
    return true;
  }
  row.count += 1;
  return row.count <= MAX_ATTEMPTS;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anon || !serviceKey) return json({ error: 'Sign-in is not configured' }, 503);

  let body: { handle?: string; password?: string } = {};
  try {
    body = (await req.json()) as { handle?: string; password?: string };
  } catch {
    return json({ error: FAIL }, 401);
  }

  const handle = normalizeHandle(String(body.handle ?? ''));
  const password = String(body.password ?? '');
  if (handle.length < 2 || password.length < 6) return json({ error: FAIL }, 401);
  if (!allowAttempt(clientBucket(req, handle))) return json({ error: FAIL }, 429);

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: email, error: lookupError } = await admin.rpc('login_identifier', {
      p_handle: handle,
    });
    if (lookupError || typeof email !== 'string' || !email.includes('@')) {
      return json({ error: FAIL }, 401);
    }

    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const tokenPayload = (await tokenRes.json().catch(() => null)) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
      msg?: string;
    } | null;

    if (
      !tokenRes.ok ||
      !tokenPayload?.access_token ||
      !tokenPayload?.refresh_token
    ) {
      return json({ error: FAIL }, 401);
    }

    // Session tokens only — never echo the resolved email.
    return json({
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
    });
  } catch {
    return json({ error: FAIL }, 401);
  }
});
