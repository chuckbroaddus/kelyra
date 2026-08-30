import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Q4 config: ask-assistant verify_jwt true; lesson-host stays false', () => {
  const toml = read('supabase/config.toml');
  assert.match(toml, /\[functions\.ask-assistant\]\s*\nverify_jwt\s*=\s*true/);
  assert.match(toml, /\[functions\.classify-capture\]\s*\nverify_jwt\s*=\s*true/);
  assert.match(toml, /\[functions\.process-ai-jobs\]\s*\nverify_jwt\s*=\s*true/);
  assert.match(toml, /\[functions\.lesson-host\]\s*\nverify_jwt\s*=\s*false/);
});

test('Q4 Edge ask-assistant: Bearer + getUser 401 before xAI or hydrate', () => {
  const src = read('supabase/functions/ask-assistant/index.ts');
  assert.match(src, /authorization\.startsWith\('Bearer '/);
  assert.match(src, /supabase\.auth\.getUser\(\)/);
  assert.match(src, /status:\s*401/);
  assert.match(src, /SUPABASE_ANON_KEY/);
  assert.doesNotMatch(src, /SERVICE_ROLE|service_role/);
  assert.doesNotMatch(src, /body\.role\b/);
  const authGateEnd = src.indexOf("Sign in to Kelyra first.' }, { status: 401 });", src.indexOf('auth.getUser()'));
  const hydrateAt = src.indexOf('await hydrateAskImages');
  const meteredAt = src.indexOf('await callMetered');
  assert.ok(authGateEnd > 0 && hydrateAt > authGateEnd && meteredAt > hydrateAt);
});

test('Q4 hydrateAskImages allowlists project storage only', () => {
  const edge = read('supabase/functions/ask-assistant/index.ts');
  assert.match(edge, /isAllowedAskImageUrl/);
  assert.match(edge, /redirect:\s*'error'/);
  assert.match(edge, /A photo was attached but could not be opened/);

  const allow = read('supabase/functions/_shared/askImageUrl.ts');
  assert.match(allow, /aohibokgilxhqwmupdfv\.supabase\.co/);
  assert.match(allow, /\/storage\/v1\/object\//);
  assert.match(allow, /169\.254\.169\.254/);
  assert.match(allow, /metadata\.google\.internal/);

  const dev = read('scripts/ai-dev-server.mjs');
  assert.match(dev, /isAllowedAskImageUrl/);
  assert.match(dev, /from '\.\/lib\/ask-image-url\.mjs'/);
});

test('Q4 ai:dev ask-assistant getUser before spend; Bearer prefix kept', () => {
  const src = read('scripts/ai-dev-server.mjs');
  assert.match(src, /authorization\?\.startsWith\('Bearer '/);
  const askBlock = src.slice(src.indexOf("route === 'ask-assistant'"), src.indexOf("route === 'classify-capture'"));
  assert.match(askBlock, /supabase\.auth\.getUser\(\)/);
  assert.match(askBlock, /401/);
  assert.match(askBlock, /Sign in to Kelyra first/);
});

test('Q4 classify-capture and process-ai-jobs also require getUser', () => {
  const classify = read('supabase/functions/classify-capture/index.ts');
  assert.match(classify, /auth\.getUser\(\)/);
  assert.match(classify, /status:\s*401/);

  const jobs = read('supabase/functions/process-ai-jobs/index.ts');
  assert.match(jobs, /auth\.getUser\(\)/);
  assert.match(jobs, /json\(\{ error: 'Sign in to Kelyra first\.' \}, 401\)/);
});

test('A1 Edge ask-assistant loads profile+grants and filters tools by policy', () => {
  const src = read('supabase/functions/ask-assistant/index.ts');
  assert.match(src, /from\('profiles'\)/);
  assert.match(src, /from\('capability_grants'\)/);
  assert.match(src, /filterAskToolDefs/);
  assert.match(src, /mergeAskGrants/);
  assert.match(src, /askActorSystemLine/);
  assert.match(src, /tools=\$\{tools\.length\}\/\$\{requested\.length\} \(policy\)/);
  assert.doesNotMatch(src, /SERVICE_ROLE|service_role/);
  assert.doesNotMatch(src, /body\.role\b/);
  const getUserAt = src.indexOf('auth.getUser()');
  const profileAt = src.indexOf("from('profiles')", getUserAt);
  const filterAt = src.indexOf('filterAskToolDefs(requested', getUserAt);
  const meteredAt = src.indexOf('await callMetered');
  assert.ok(getUserAt > 0 && profileAt > getUserAt && filterAt > profileAt && meteredAt > filterAt);
});
