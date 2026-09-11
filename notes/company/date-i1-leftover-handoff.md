# DATE-I1 leftover P2/P3 handoff (CEO close-out)

**Date:** 2026-09-10  
**Kanban:** `t_0158eebf`  
**SQL apply:** **do not apply in this loop** — CoS / devops-release only.

## Harvest disposition

| ID | Sev | Status | Evidence |
|---|---|---|---|
| `t_80e8d6fb` | P2 | **Landed** | `src/lib/ai/askTools.ts` `update_student` routes birthday through `birthdayForSave` before `patchStudentMetadata`. Guard test: `src/lib/date/iso.test.ts` Ask path. |
| `t_6e54a359` | P2 | **Landed** | `DateInput.tsx`: `role=dialog`, Esc → cancel + focus return; `dateCalendar.tsx`: arrow/Page/Enter grid keys + live region. |
| `t_5a975f9a` | P2 | **Landed** | Teacher Details + parent child edit: `birthdayUnchanged` skips validate when optional birthday unchanged so name-only save proceeds; changed/bad birthday still validates before rename. |
| `t_2340bf0e` | P3 | **Landed** | `colors.overlay` on `Palette` (`theme.ts`); DateInput sheet/popover scrim uses `colors.overlay` (no hardcoded rgba in DateInput). |
| `t_f51c6182` | P3 | **Landed** | `DateInput.tsx` `useEffect(() => () => releaseDateHost(instanceId), [instanceId])`. |
| `t_7e546fa4` | P3 | **Landed** | `iso.test.ts` — too-young (`today−1y` / after max) expects range error; no silent clamp. |
| `t_f2fcb0ff` | P3 | **Produced (not applied)** | `supabase/migrations/20260910000005_student_birthday_bounds.sql` — shape + today−22y…today−3y on metadata birthday change; legacy unchanged rows pass. |
| `t_6eba3c85` | P3 | **Landed** | Desktop web (`Platform.OS === 'web' && width ≥ 768` + measure) field-anchored; wide tablet / missing measure may stay centered (docked rule). |

## Tests / typecheck

- `npx tsx --test src/lib/date/iso.test.ts` — 15/15 pass (incl. too-young + Ask guard + birthdayUnchanged).
- `npx tsc --noEmit -p tsconfig.json` — clean.

## SQL for devops (filenames only)

1. `supabase/migrations/20260910000005_student_birthday_bounds.sql`

## Leftover IDs still open on Kanban

CoS closes after land: `t_80e8d6fb`, `t_6e54a359`, `t_5a975f9a`, `t_2340bf0e`, `t_f51c6182`, `t_7e546fa4`, `t_f2fcb0ff` (after SQL apply if desired), `t_6eba3c85`, parent `t_0158eebf`.

No product-law reopen. No git commit/merge/push from this loop.
