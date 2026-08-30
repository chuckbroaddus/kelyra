/**
 * Drain queued cheap homework drafts and lesson submission reviews.
 * Teacher taps "Draft queued" or a cron hits this.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user?.id) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }
    const { data: jobs, error } = await supabase
      .from('ai_jobs')
      .select('id, capture_id, submission_id, pass, kind')
      .eq('status', 'pending')
      .in('kind', ['homework_draft', 'submission_review'])
      .order('created_at', { ascending: true })
      .limit(20);
    if (error) throw error;
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const job of jobs ?? []) {
      await supabase.from('ai_jobs').update({ status: 'running' }).eq('id', job.id);
      let failed = false;
      let failMessage: string | undefined;
      if (job.kind === 'submission_review') {
        if (!job.submission_id) {
          failed = true;
          failMessage = 'submission_id required';
        } else {
          const res = await supabase.functions.invoke('review-submission', {
            body: { submissionId: job.submission_id, queued: true },
          });
          failed = Boolean(res.error || (res.data as { error?: string } | null)?.error);
          failMessage = failed
            ? String(res.error?.message ?? (res.data as { error?: string })?.error ?? 'failed')
            : undefined;
        }
      } else {
        if (job.capture_id) {
          await supabase.from('captures').update({ ai_status: 'running' }).eq('id', job.capture_id);
        }
        const res = await supabase.functions.invoke('analyze-homework', {
          body: { captureId: job.capture_id, pass: job.pass === 'look-again' ? 'look-again' : 'cheap' },
        });
        failed = Boolean(res.error || (res.data as { error?: string } | null)?.error);
        failMessage = failed
          ? String(res.error?.message ?? (res.data as { error?: string })?.error ?? 'failed')
          : undefined;
      }
      await supabase
        .from('ai_jobs')
        .update({
          status: failed ? 'error' : 'done',
          error: failed ? failMessage ?? 'failed' : null,
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
