/** Signed-in user client + uniform JSON errors for the small AI Edge functions. */
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
export type UserClient = any;

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Throws HttpError(401) unless the request carries a valid user JWT. */
export async function requireUserClient(req: Request): Promise<UserClient> {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) throw new HttpError('Sign in to Kelyra first.', 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) throw new HttpError('Sign in to Kelyra first.', 401);
  return supabase;
}

export function errorResponse(err: unknown, fallback: string): Response {
  const message = err instanceof Error ? err.message : fallback;
  const status =
    err instanceof HttpError
      ? err.status
      : /GEMINI_API_KEY|XAI_API_KEY/.test(message)
        ? 501
        : /required|not allowed/i.test(message)
          ? 400
          : /timed out/i.test(message)
            ? 504
            : 500;
  return Response.json({ error: message }, { status });
}
