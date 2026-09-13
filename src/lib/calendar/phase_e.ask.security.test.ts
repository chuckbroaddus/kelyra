import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ASK_TOOL_POLICY,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}
const grants = grantsFromAskDefaults();

test('CAL-S2-08 / Phase E: calendar.read + calendar.write caps registered; not assignments.manage', () => {
  assert.equal(ASK_TOOL_POLICY.calendar_search?.capability, 'calendar.read');
  assert.equal(ASK_TOOL_POLICY.calendar_draft_event?.capability, 'calendar.write');
  assert.equal(ASK_TOOL_POLICY.calendar_search?.need, 'own');
  assert.equal(ASK_TOOL_POLICY.calendar_draft_event?.need, 'own');
  assert.notEqual(ASK_TOOL_POLICY.calendar_search?.capability, 'assignments.manage');
  assert.notEqual(ASK_TOOL_POLICY.calendar_draft_event?.capability, 'assignments.manage');
});

test('Phase E Ask allow matrix: teacher/parent/student/office may search+draft; unknown denied', () => {
  for (const role of ['teacher', 'parent', 'student', 'administrator', 'superintendent'] as const) {
    assert.equal(isAskToolAllowed('calendar_search', { role }, grants), true, role + ' search');
    assert.equal(isAskToolAllowed('calendar_draft_event', { role }, grants), true, role + ' draft');
  }
  assert.equal(isAskToolAllowed('calendar_search', { role: 'teacher' }, grants), true);
  assert.equal(isAskToolAllowed('not_a_real_calendar_tool', { role: 'teacher' }, grants), false);
});

test('Phase E client+edge policy twins include calendar tools', () => {
  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  for (const name of ['calendar_search', 'calendar_draft_event']) {
    assert.match(client, new RegExp(`${name}:\\s*\\{`));
    assert.match(edge, new RegExp(`${name}:\\s*\\{`));
  }
  assert.match(edge, /'calendar\.read'/);
  assert.match(edge, /'calendar\.write'/);
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(matrix, /id: 'calendar\.read'/);
  assert.match(matrix, /id: 'calendar\.write'/);
});

test('Phase E askTools: search uses listCalendarItems; draft parks CR-A; refuse paths; no assignments.manage', () => {
  const tools = read('src/lib/ai/askTools.ts');
  const searchStart = tools.indexOf('calendar_search:');
  const draftStart = tools.indexOf('calendar_draft_event:');
  assert.ok(searchStart > 0 && draftStart > searchStart);
  const search = tools.slice(searchStart, draftStart);
  const draft = tools.slice(draftStart, draftStart + 4500);
  const searchRun = search.slice(search.indexOf('run:'));
  const draftRun = draft.slice(draft.indexOf('run:'));
  assert.match(searchRun, /listCalendarItems/);
  assert.match(searchRun, /calendarSeatForChrome/);
  assert.doesNotMatch(searchRun, /assignments\.manage|teaches_class\(/);
  assert.match(draft, /parkPendingCalendarDraft|buildCalendarAskDraft/);
  assert.match(draft, /REVIEW_DRAFT_BANNER|Review draft/);
  assert.match(draft, /href: '\/calendar'/);
  assert.doesNotMatch(draftRun, /create_class\(|addTypedStudent|approve_capture|from\('students'\)\.insert/);
  assert.doesNotMatch(draftRun, /rpc\('create_calendar_event'/); // Save is CR-A, not Ask
});

test('Phase E migration stamps ai_nl source; named only', () => {
  const sql = read('supabase/migrations/20260918000000_calendar_r2_phase_e_ai_source.sql');
  assert.match(sql, /p_source text default 'manual'/);
  assert.match(sql, /'manual', 'ai_nl'/);
  assert.match(sql, /do not live-apply/i);
});

test('Phase E CR-A EventComposer + Calendar consume parked Ask draft', () => {
  const composer = read('src/components/calendar/EventComposer.tsx');
  assert.match(composer, /initialDraft/);
  assert.match(composer, /REVIEW_DRAFT_BANNER|fromAsk/);
  assert.match(composer, /source: fromAsk \? 'ai_nl' : 'manual'/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /takePendingCalendarDraft/);
  assert.match(screen, /initialDraft/);
});
