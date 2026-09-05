/**
 * Q10: resolve @handle → Auth session without returning the looked-up email to anon.
 * Cos: deploy this function with verify_jwt=false (see supabase/config.toml).
 * Uses service_role only for login_identifier + durable rate check; password grant uses anon key.
 *
 * F02: rate limit is DB-backed (sign_in_handle_rate_check), not a process-local Map.
 * F03: always perform password grant (dummy email on lookup miss) so timing does not
 * hint whether a handle resolves. Responses never include the looked-up email.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const FAIL = 'Invalid login credentials';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;
/** Fallback when SIGN_IN_DUMMY_EMAIL unset. Prefer a real Auth sink user for bcrypt parity. */
const DEFAULT_DUMMY_EMAIL = 'sign-in-dummy@users.kelyra.invalid';

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
  return `${ip}|${handle}`.slice(0, 256);
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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: allowed, error: rateError } = await admin.rpc('sign_in_handle_rate_check', {
    p_bucket: clientBucket(req, handle),
    p_window_ms: WINDOW_MS,
    p_max_attempts: MAX_ATTEMPTS,
  });
  if (rateError || allowed !== true) return json({ error: FAIL }, 429);

  try {
    const { data: email, error: lookupError } = await admin.rpc('login_identifier', {
      p_handle: handle,
    });
    const resolved =
      !lookupError && typeof email === 'string' && email.includes('@') ? email : null;
    const dummy = (Deno.env.get('SIGN_IN_DUMMY_EMAIL') ?? DEFAULT_DUMMY_EMAIL).trim();
    const grantEmail = resolved ?? dummy;

    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: grantEmail, password }),
    });
    const tokenPayload = (await tokenRes.json().catch(() => null)) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
      msg?: string;
    } | null;

    // Miss path always grants against dummy — never return tokens unless lookup resolved.
    if (
      !resolved ||
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
