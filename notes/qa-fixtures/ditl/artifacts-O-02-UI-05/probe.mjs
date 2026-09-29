import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
function env(k) {
  const t = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = t.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
const URL = env('EXPO_PUBLIC_SUPABASE_URL');
const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const r = await fetch(URL + '/functions/v1/sign-in-handle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
  body: JSON.stringify({ handle: 'ditl-admin', password: PASS }),
});
const j = await r.json();
console.log('auth', r.status, Boolean(j.access_token));
const sb = createClient(URL, ANON, {
  global: { headers: { Authorization: 'Bearer ' + j.access_token } },
  auth: { persistSession: false, autoRefreshToken: false },
});
await sb.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
const { data: st, error: e1 } = await sb.from('students').select('id, display_name, metadata').limit(15);
console.log('students err', e1?.message || null, 'n', st?.length);
console.log((st || []).map((x) => x.display_name + ' ' + x.id).join('\n'));
const { data: st2, error: e2 } = await sb
  .from('students')
  .select('id, display_name')
  .ilike('display_name', '%Jordan%')
  .limit(5);
console.log('jordan', e2?.message || null, JSON.stringify(st2));
