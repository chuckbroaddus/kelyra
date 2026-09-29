import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
function env(k) {
  const envText = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = envText.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
const sb = createClient(env('EXPO_PUBLIC_SUPABASE_URL'), env('EXPO_PUBLIC_SUPABASE_ANON_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await sb.auth.signInWithPassword({
  email: 'ditl-admin@ditl.test',
  password: 'DITL-admin-test',
});
console.log('auth', error?.message || 'ok');
const uid = data.user.id;
const { data: t, error: te } = await sb.from('teachers').select('*').eq('id', uid).maybeSingle();
console.log('teacher', te?.message || t);
const { data: p } = await sb.from('profiles').select('id,role,also_teacher,also_administrator,parent_id,school_id,display_name').eq('id', uid).single();
console.log('profile', p);
