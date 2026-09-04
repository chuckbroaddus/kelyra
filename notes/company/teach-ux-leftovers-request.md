# TEACH-UX leftovers — finish v1 chrome (CEO send 2026-09-04)

CEO: finish the TEACH-UX track. Sequenced A–D + DOC already landed in this dirty tree — **preserve them**. This loop is the parked leftovers only. No SQL. No git commit/push.

Grounding: notes/company/teacher-ux-plan.md; live chrome after A–D.

## In scope (must)

### L1 — Dual-hat teacher seat Needs count (P2 t_fc134d29)
Gate `countNeedsYou` / needs badge on **chrome seat** (`role === 'teacher'`), not `isOfficeRole(profile)`. Dual-hat Teach seat gets the same needsCount as a pure teacher. Office seat stays 0/office chrome. Do not merge trays.

### L2 — Needs badge vs `/inbox` list (P2 t_92a09fde)
Badge and `/inbox` must agree. Either include turned-in on `/inbox` under the Needs noun, or thin `needsCount` to what `/inbox` lists. Count-only. Route stays `/inbox`.

### L3 — Week / Heatmap discoverable after demotion (P2 t_110c2aaf)
Do **not** restore week/heatmap as default CLASS_TABS icons. Add Today Week filter (or overflow) and Gradebook heatmap pane control. Family stays drawer-reachable.

### L4 — Demoted routes highlight a nearby tab (P3 t_e5a7a694)
Map week→today, heatmap→gradebook, family→parents for PersonTabs selection chrome. Demoted keys stay out of CLASS_TABS.

### L5 — Header search copy follows seat (P3 t_0caf5e90)
AppHeader search placeholder from `chrome.role` (seat), not `isOfficeRole(profile)`. Teacher seat is class-scoped, not “Find a person”. Search data gate stays office-seat-only (`listDirectory` unchanged).

### L6 — Edge / ai-dev Ask FALLBACK Needs (P3 t_2416e2ba)
`src/lib/ai/askPrompt.ts` already says Needs. Align `scripts/ai-dev-server.mjs` and `supabase/functions/ask-assistant/index.ts` FALLBACK to Needs. Copy only — do not weaken Ask policy / officeOnly / teacherSeatOnly. Do not deploy Edge unless a named CoS step is required; changing the function source is enough for this loop.

## Out of scope
- SEC-09 JWT activity/matrix fixtures (t_b5d0a16a) — leave parked
- New tray tabs, route rename `/needs`, seat SQL, student skin, ClassTabs recut
- git commit/push

## Tests
- Dual-hat teacher seat needsCount === pure teacher; office seat not badged Needs
- Badge count matches `/inbox` contents (or documented thinner set is consistent)
- CLASS_TABS still ≤7; week/heatmap not default icons; still reachable
- Demoted deep-links highlight nearby default tab
- Teacher-seat header search copy not office directory
- Ask FALLBACK strings Needs in askPrompt + ai-dev + ask-assistant
- Phase A/B/C/D tests still green
- Matcher never inserts; canCreateClass untouched; no EXPO_PUBLIC_*

## Constraints
Preserve dirty tree. No git reset. Children never call `ask_user_question`.

## Acceptance
L1–L6. A–D intact. Terminal passed or escalated with named P0/P1 only.
