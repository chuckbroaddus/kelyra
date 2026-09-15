# CAL-R3 PERF — CEO send 2026-09-14 “I want it fixed”

**Launch `kelyra-qa-loop` only.** No inline implement. No ask_user_question. No git commit/merge/push. No live SQL unless a new RPC is required — then **name filename only** (devops-release applies).

## OBJECTIVE
Fix sluggish Calendar R3 UI. Product laws unchanged (hats, twins, hidden, CE-A, Desk, chips, lean composer).

## MUST (from CoS eval of shipped tree)
1. **Year fetch:** do **not** pull every event Jan 1–Dec 31 for dots. Prefetch compact per-day tint/count (client index or thin RPC). Keep ≤4 role tints. Empty days stay empty.
2. **Tint index:** `dayRoleTints` must not scan all items per cell. Build `Map<iso, tints>` once; YearGrid + MonthGrid O(1) lookup.
3. **YearGrid:** stop ~365 nested Pressables as the scroll body if it janks. Virtualize months (FlashList / month pages) or flatten press targets. Memo month blocks.
4. **AgendaList:** virtualize (FlashList) if list can exceed ~40 rows. Do not map entire year in a Screen ScrollView.
5. **Nested scroll:** Day/Week timeline must not fight `Screen` ScrollView (one scroll owner, or disable outer scroll while timeline is up).
6. **Pinch:** must not block vertical scroll; debounce 7↔5↔3 so it doesn’t relayout every pixel.
7. **Reload:** don’t refetch full year on chip toggle if client filter of current window is enough (chips ≠ security; RPC still hat-walled). Chip refilter target ≤16ms of already-fetched data when window is day/week/month.
8. **Tests:** unit tests for tint index + year bounds not loading 365-day item list for dots. Typecheck green. Unrelated dirty tree: do not edit to make tsc pass.

## NEVER
FullCalendar/Wix Agenda. Rainbow colors. 6th tray. Desk rewrite. Diary. teaches_class for family/hidden. Invented icons. EXPO_PUBLIC keys.

## ACCEPTANCE
Year and month open/scroll without hitch on phone-class density. Week/day scroll one-owner. Loop passed. Name any SQL.

## NEXT
CoS: SQL → devops-release; QAS/QE prove-out perf; leftover P2/P3 sticky.
