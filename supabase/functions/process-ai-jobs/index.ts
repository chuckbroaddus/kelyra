/**
 * Drain queued cheap homework drafts. Teacher taps "Draft queued" or a cron hits this.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: jobs, error } = await supabase
      .from('ai_jobs')
      .select('id, capture_id, pass')
      .eq('status', 'pending')
      .eq('kind', 'homework_draft')
      .order('created_at', { ascending: true })
      .limit(20);
    if (error) throw error;
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const job of jobs ?? []) {
      await supabase.from('ai_jobs').update({ status: 'running' }).eq('id', job.id);
      await supabase.from('captures').update({ ai_status: 'running' }).eq('id', job.capture_id);
      const res = await supabase.functions.invoke('analyze-homework', {
        body: { captureId: job.capture_id, pass: job.pass === 'look-again' ? 'look-again' : 'cheap' },
      });
      const failed = Boolean(res.error || (res.data as { error?: string } | null)?.error);
      await supabase
        .from('ai_jobs')
        .update({
          status: failed ? 'error' : 'done',
          error: failed ? String(res.error?.message ?? (res.data as { error?: string })?.error ?? 'failed') : null,
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      results.push({ id: job.id, ok: !failed, error: failed ? 'failed' : undefined });
    }
    return json({ ok: true, processed: results.length, results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'batch failed' }, 500);
  }
});

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors() });
}
