import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  invalidateNeedsCountCache,
  NEEDS_COUNT_TTL_MS,
  needsCountCacheHit,
  peekNeedsCountCache,
  readNeedsCountCached,
} from './needsCountCache.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('PERF shared filters: badge predicates ≡ list membership (L2 / PERF-18)', () => {
  const api = read('src/lib/captures/api.ts');
  assert.match(api, /NEEDS_CAPTURE_STATUSES = \['unassigned', 'attached', 'draft'\]/);
  assert.match(api, /NEEDS_SUBMISSION_STATUSES = \['completed'\]/);
  assert.match(api, /export function needsCaptureFilter/);
  assert.match(api, /export function completedSubmissionFilter/);

  const countAt = api.indexOf('export async function countNeedsYou');
  const countBody = api.slice(countAt, api.indexOf('export async function listTurnedIn'));
  assert.match(countBody, /needsCaptureFilter|countInbox/);
  assert.match(countBody, /completedSubmissionFilter\(\)/);

  const listAt = api.indexOf('export async function listInbox');
  const listBody = api.slice(listAt, api.indexOf('export async function signInboxThumbs'));
  assert.match(listBody, /needsCaptureFilter\(\)/);

  const turnedAt = api.indexOf('export async function listTurnedIn');
  const turnedBody = api.slice(turnedAt, api.indexOf('export async function listThisWeek'));
  assert.match(turnedBody, /completedSubmissionFilter\(\)/);
});

test('PERF-09: list path omits draft JSON columns', () => {
  const api = read('src/lib/captures/api.ts');
  assert.match(api, /INBOX_LIST_COLUMNS/);
  assert.match(api, /TURNED_IN_LIST_COLUMNS/);
  assert.doesNotMatch(api, /INBOX_LIST_COLUMNS =[^;]*model_draft/);
  assert.doesNotMatch(api, /INBOX_LIST_COLUMNS =[^;]*explain_draft/);
  assert.doesNotMatch(api, /TURNED_IN_LIST_COLUMNS =[^;]*answers/);
  assert.doesNotMatch(api, /TURNED_IN_LIST_COLUMNS =[^;]*model_draft/);
});

test('S1 inbox: first paint does not wait on roster / thumbs / refreshTeacher when class known', () => {
  const inbox = read('src/app/inbox.tsx');
  assert.match(inbox, /listInbox\(resolvedId,\s*\{\s*signThumbs:\s*false\s*\}\)/);
  assert.match(inbox, /signInboxThumbs/);
  assert.match(inbox, /ensureRoster/);
  assert.match(inbox, /openAssign/);
  // Roster only from assign sheet path, not cold load waterfall.
  const loadAt = inbox.indexOf('const load = useCallback');
  const loadEnd = inbox.indexOf('useFocusEffect', loadAt);
  const loadBody = inbox.slice(loadAt, loadEnd);
  assert.doesNotMatch(loadBody, /listRoster/);
  // refreshTeacher only inside true-cold unknown classId branch (PERF-01).
  assert.match(loadBody, /if \(!resolvedId\)\s*\{[\s\S]*?await refreshTeacher\(\)/);
  assert.doesNotMatch(loadBody, /await refreshTeacher\(\);\s*(?:\/\/[^\n]*\n\s*)*(?:const|let|var|setClassId|setRoster|listInbox)/);
  assert.match(inbox, /Promise\.all\(\[\s*listInbox\(resolvedId/);
});

test('S1 empty ≠ loading: WorkingLine / empty gated on rowsReady', () => {
  const inbox = read('src/app/inbox.tsx');
  assert.match(inbox, /rowsReady/);
  assert.match(inbox, /showWorking = !rowsReady && items\.length === 0 && turned\.length === 0/);
  assert.match(inbox, /showEmpty = rowsReady && !status && items\.length === 0 && turned\.length === 0/);
  assert.match(inbox, /showWorking \? <WorkingLine/);
  assert.match(inbox, /showEmpty \?/);
  assert.doesNotMatch(inbox, /\bloaded\b/);
});

test('US-PERF-05 / TP-17: class switch clears prior-class rows before lists settle', () => {
  const inbox = read('src/app/inbox.tsx');
  assert.match(inbox, /rowsClassIdRef/);
  const loadAt = inbox.indexOf('const load = useCallback');
  const loadEnd = inbox.indexOf('useFocusEffect', loadAt);
  const loadBody = inbox.slice(loadAt, loadEnd);
  assert.match(loadBody, /classChanged/);
  assert.match(loadBody, /rowsClassIdRef\.current !== resolvedId/);
  // Clear rows + rowsReady before Promise.all — not only after.
  const clearAt = loadBody.indexOf('setItems([])');
  const listsAt = loadBody.indexOf('Promise.all');
  assert.ok(clearAt > 0 && listsAt > clearAt, 'must clear items before fetching new class lists');
  assert.match(loadBody.slice(0, listsAt), /setTurned\(\[\]\)/);
  assert.match(loadBody.slice(0, listsAt), /setRowsReady\(false\)/);
  // Soft-refresh keep-rows only when same class; bind rowsClassId after settle.
  assert.match(loadBody, /rowsClassIdRef\.current = resolvedId/);
  assert.match(loadBody, /Soft refresh keeps prior rows only for the same classId/);
});

test('S1 mutations invalidate Needs chrome cache', () => {
  const inbox = read('src/app/inbox.tsx');
  assert.match(inbox, /refreshChrome/);
  assert.match(inbox, /attachCapture[\s\S]*refreshChrome\(\)/);
  assert.match(inbox, /deleteCapture[\s\S]*refreshChrome\(\)/);
  assert.match(inbox, /markNoteOnly[\s\S]*refreshChrome\(\)/);
});

test('S2 Needs TTL cache: hit skip + invalidate + inflight dedup', async () => {
  invalidateNeedsCountCache();
  assert.ok(NEEDS_COUNT_TTL_MS >= 10_000 && NEEDS_COUNT_TTL_MS <= 15_000);

  let fetches = 0;
  const fetch = async () => {
    fetches += 1;
    return 7;
  };

  const a = await readNeedsCountCached('c1', fetch);
  const b = await readNeedsCountCached('c1', fetch);
  assert.equal(a, 7);
  assert.equal(b, 7);
  assert.equal(fetches, 1);
  assert.equal(peekNeedsCountCache()?.count, 7);
  assert.equal(needsCountCacheHit('c1'), true);

  invalidateNeedsCountCache();
  assert.equal(needsCountCacheHit('c1'), false);
  const c = await readNeedsCountCached('c1', fetch);
  assert.equal(c, 7);
  assert.equal(fetches, 2);

  // Same-tick inflight dedup.
  invalidateNeedsCountCache();
  let resolveFetch!: (n: number) => void;
  const slow = new Promise<number>((resolve) => {
    resolveFetch = resolve;
  });
  let slowFetches = 0;
  const slowFetch = async () => {
    slowFetches += 1;
    return slow;
  };
  const p1 = readNeedsCountCached('c2', slowFetch);
  const p2 = readNeedsCountCached('c2', slowFetch);
  resolveFetch(3);
  assert.deepEqual(await Promise.all([p1, p2]), [3, 3]);
  assert.equal(slowFetches, 1);
});

test('QG-08 / PERF-11: invalidate mid-flight drops inflight and fetches fresh (no stale snap poison)', async () => {
  invalidateNeedsCountCache();

  let resolveStale!: (n: number) => void;
  const staleBody = new Promise<number>((resolve) => {
    resolveStale = resolve;
  });
  let fetches = 0;
  const staleFetch = async () => {
    fetches += 1;
    return staleBody;
  };

  const staleRead = readNeedsCountCached('cMut', staleFetch);
  await Promise.resolve();
  assert.equal(fetches, 1);

  // Mutation path: refreshChrome → invalidate while countNeedsYou still in flight.
  invalidateNeedsCountCache();
  assert.equal(peekNeedsCountCache(), null);
  assert.equal(needsCountCacheHit('cMut'), false);

  let resolveFresh!: (n: number) => void;
  const freshBody = new Promise<number>((resolve) => {
    resolveFresh = resolve;
  });
  const freshFetch = async () => {
    fetches += 1;
    return freshBody;
  };
  const freshRead = readNeedsCountCached('cMut', freshFetch);
  await Promise.resolve();
  assert.equal(fetches, 2, 'post-invalidate read must not join cleared inflight');

  resolveStale(99);
  assert.equal(await staleRead, 99);
  // Stale completion must not poison snap for hop/mutation freshness.
  assert.equal(peekNeedsCountCache(), null);

  resolveFresh(4);
  assert.equal(await freshRead, 4);
  assert.equal(peekNeedsCountCache()?.count, 4);
  assert.equal(needsCountCacheHit('cMut'), true);
});

test('t_21501990: refreshBell discards Needs count when epoch moved during await', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  const cache = read('src/lib/chrome/needsCountCache.ts');
  assert.match(cache, /export function needsCountEpoch/);
  assert.match(chrome, /needsCountEpoch/);
  assert.match(chrome, /bellEpoch/);
  assert.match(chrome, /bellEpoch !== needsCountEpoch\(\)/);
  // Must return before setNeedsCount when epoch moved.
  const bellAt = chrome.indexOf('const refreshBell = useCallback');
  assert.ok(bellAt > 0);
  const setNeeds = chrome.indexOf('setNeedsCount(work)', bellAt);
  const discard = chrome.indexOf('bellEpoch !== needsCountEpoch()', bellAt);
  assert.ok(discard > 0 && discard < setNeeds, 'epoch discard before setNeedsCount(work)');
});

test('S2 ChromeProvider: pathname hop cache hit skips listClasses + countNeedsYou', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /needsCountCacheHit/);
  assert.match(chrome, /hopSameClass && cacheHit/);
  assert.match(chrome, /invalidateNeedsCountCache/);
  assert.match(chrome, /readNeedsCountCached/);
  assert.match(chrome, /NEEDS_COUNT_TTL_MS|needsCountCache/);
  // Cheap path returns before listClasses.
  const effectAt = chrome.indexOf('const pathClass = pathname.match');
  assert.ok(effectAt > 0);
  const hopReturn = chrome.indexOf('if (hopSameClass && cacheHit)', effectAt);
  const listClassesAt = chrome.indexOf('await listClasses()', hopReturn);
  assert.ok(hopReturn > 0);
  assert.ok(listClassesAt > hopReturn);
  const hopBlock = chrome.slice(hopReturn, listClassesAt);
  assert.match(hopBlock, /return;/);
  assert.doesNotMatch(hopBlock, /listClasses|countNeedsYou/);
});

test('S2 dual-hat: Needs only when chrome.role === teacher (PERF-17 / QG-06)', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /role === 'teacher'/);
  assert.match(chrome, /setNeedsCount\(0\)/);
  assert.doesNotMatch(chrome, /isOfficeRole\(profile\) \? 0 : await/);
});

test('PERF-16: refreshTeacher skips setTeacher when id + active_class_id unchanged', () => {
  const auth = read('src/lib/auth/AuthProvider.tsx');
  const fnAt = auth.indexOf('const refreshTeacher = async');
  const fnBody = auth.slice(fnAt, auth.indexOf('const setActiveClassId', fnAt));
  assert.match(fnBody, /current\.id === loaded\.id/);
  assert.match(fnBody, /current\.active_class_id === loaded\.active_class_id/);
  assert.match(fnBody, /return current/);
});

test('PERF-19/20: badge not driven by inbox thumbs; turned-in list uncapped with count', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.doesNotMatch(chrome, /listInbox|signInboxThumbs|hydrateCaptures/);
  const api = read('src/lib/captures/api.ts');
  const turnedAt = api.indexOf('export async function listTurnedIn');
  const turnedBody = api.slice(turnedAt, api.indexOf('export async function listThisWeek'));
  assert.doesNotMatch(turnedBody, /\.limit\(/);
  const countAt = api.indexOf('export async function countNeedsYou');
  const countBody = api.slice(countAt, api.indexOf('export type TurnedInItem'));
  assert.doesNotMatch(countBody, /\.limit\(/);
});
