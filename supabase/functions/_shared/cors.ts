/**
 * CORS headers for edge functions the web app calls straight from the browser
 * (supabase.functions.invoke). The OPTIONS preflight AND every JSON / error reply need them,
 * or the browser drops the response and the feature silently fails.
 */
export function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/** Wrap a handler: 204 preflight with CORS, and CORS on every response the handler returns. */
export function withCors(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
    const res = await handler(req);
    for (const [key, value] of Object.entries(cors())) res.headers.set(key, value);
    return res;
  };
}
