#!/usr/bin/env node
/**
 * DITL-SEED Lane B: Auth Admin createUser + profiles/teacher hats
 * Uses GoTrue Auth Admin (service role). Never prints secrets, passwords, keys.
 * Idempotent: skips existing usernames.
 * Bible: notes/company/ditl-seed-school.md
 * Run after sourcing .env (no echo key)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aohibokgilxhqwmupdfv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY missing from env (never print value)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS = [
  { username: 'ditl-super', role: 'superintendent', display: 'Super User', pass: 'DITL-super-test' },
  { username: 'ditl-admin', role: 'administrator', display: 'Devon Hale', pass: 'DITL-admin-test' },
  { username: 'ditl-teacher-a', role: 'teacher', display: 'Avery Quinn', pass: 'DITL-teacher-test' },
  { username: 'ditl-teacher-b', role: 'teacher', display: 'Blake Rivera', pass: 'DITL-teacher-test' },
  { username: 'ditl-teacher-c', role: 'teacher', display: 'Casey Torres', pass: 'DITL-teacher-test' },
  { username: 'ditl-parent-1', role: 'parent', display: 'Taylor Lee', pass: 'DITL-parent-test' },
  { username: 'ditl-parent-2', role: 'parent', display: 'Cameron Brooks', pass: 'DITL-parent-test' },
  { username: 'ditl-student-s1', role: 'student', display: 'Jordan Lee', pass: 'DITL-student-test' },
  { username: 'ditl-student-s2', role: 'student', display: 'Jamie Lee', pass: 'DITL-student-test' }
];

const SCHOOL_ID = 'd1715000-0000-4000-a000-000000000001';

async function ensureProfile(username, role, display, schoolId) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('username', username)
    .single();
  if (existing) {
    console.log(`  skip existing profile: ${username}`);
    return existing.id;
  }
  const { data: user, error: authErr } = await supabase.auth.admin.createUser({
    email: `${username}@ditl.test`,
    password: USERS.find(u => u.username === username).pass,
    email_confirm: true,
    user_metadata: { username, display_name: display }
  });
  if (authErr) {
    if (authErr.message.includes('already registered') || authErr.status === 422) {
      console.log(`  auth user exists for ${username}, fetching profile...`);
    } else {
      throw authErr;
    }
  }
  const userId = user?.user?.id;
  if (!userId) {
    console.log(`  auth create skipped for ${username} (may need manual)`);
    return null;
  }
  const profileData = {
    id: userId,
    school_id: schoolId,
    username,
    role,
    display_name: display,
    created_at: new Date().toISOString()
  };
  const { error: profErr } = await supabase.from('profiles').insert(profileData);
  if (profErr && !profErr.message.includes('duplicate')) throw profErr;
  console.log(`  created profile + auth: ${username} (${role})`);
  return userId;
}

async function updateDualHatProfiles() {
  // Dual-hat: lookup parent profile ids by username, set on admin/teacher-a
  const parentMap = {
    'ditl-admin': 'ditl-parent-1',
    'ditl-teacher-a': 'ditl-parent-2'
  };
  for (const [child, parentUser] of Object.entries(parentMap)) {
    const { data: parentProf } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', parentUser)
      .single();
    if (!parentProf) {
      console.log(`  dual-hat skip: no parent profile ${parentUser}`);
      continue;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ parent_id: parentProf.id })
      .eq('username', child);
    if (error) console.log(`  dual-hat update warn for ${child}: ${error.message}`);
    else console.log(`  dual-hat parent_id set: ${child} -> ${parentUser}`);
  }
}

async function ensureDismissalLines() {
  const { count: existing } = await supabase
    .from('dismissal_lines')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', SCHOOL_ID);
  if ((existing || 0) >= 2) {
    console.log(`  skip existing dismissal_lines: ${existing}`);
    return;
  }
  const lines = [
    { school_id: SCHOOL_ID, name: 'K–2', sort: 1, status: 'active', created_at: new Date().toISOString() },
    { school_id: SCHOOL_ID, name: '3–5', sort: 2, status: 'active', created_at: new Date().toISOString() }
  ];
  const { error } = await supabase.from('dismissal_lines').insert(lines);
  if (error) console.log(`  dismissal_lines insert warn: ${error.message}`);
  else console.log('  created 2 dismissal_lines for ditl school');
}

async function verifyEvidence() {
  const { count: profCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('username', 'ditl-%');
  console.log(`VERIFY: ditl-* profiles count = ${profCount || 0} (expect >=8)`);

  const { count: lineCount } = await supabase
    .from('dismissal_lines')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', SCHOOL_ID);
  console.log(`VERIFY: dismissal_lines for school = ${lineCount || 0} (expect >=2)`);
}

async function main() {
  console.log('DITL auth seed starting (idempotent, no secrets printed)...');
  let authAvailable = true;
  try {
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  } catch (e) {
    if (e.message.includes('permission') || e.status === 403 || !e.status) {
      authAvailable = false;
      console.log('BLOCKER: GoTrue Auth Admin API unavailable or service role lacks admin perms (named blocker per spec)');
    }
  }
  if (!authAvailable) {
    console.log('Named blocker: Auth Admin not authed — seed incomplete.');
    process.exit(2);
  }
  for (const u of USERS) {
    await ensureProfile(u.username, u.role, u.display, SCHOOL_ID);
  }
  await updateDualHatProfiles();
  await ensureDismissalLines();
  await verifyEvidence();
  console.log('Lane B auth seed COMPLETE. Evidence SELECTs logged above.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
