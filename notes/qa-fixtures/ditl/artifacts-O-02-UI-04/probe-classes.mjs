// probe classes for S1 bio route
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
function env(k) {
  const envText = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = envText.match(new RegExp('^' + k + '=(.*)$', 'm'));
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
const { data: c, error: ce } = await sb.from('classes').select('id, name, school_id').limit(20);
console.log('classes', ce?.message || null, JSON.stringify(c)?.slice(0, 800));
const { data: st } = await sb.from('students').select('id, display_name, metadata').ilike('display_name', '%Jordan%Lee%').limit(3);
console.log('s1', st?.[0]?.id, Object.keys(st?.[0]?.metadata || {}));
const { data: en } = await sb.from('enrollments').select('class_id, student_id').eq('student_id', st?.[0]?.id).limit(10);
console.log('enroll', JSON.stringify(en));
