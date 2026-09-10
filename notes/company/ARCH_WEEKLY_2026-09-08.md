# Kelyra architecture-risk brief — weekly leadership sync

**Date:** 2026-09-08 CT  
**Author:** software-architect  
**Board SoT:** Hermes `kelyra` (blocked=8, ready=0, todo=0, done=190 at write time)  
**No application code. No SQL apply. No DNS.**

---

## OBJECTIVE

Name this week’s top architecture risks (data model, native/web split, FERPA/photos, SQL apply-by-filename, Expo) for leadership. Flag CEO-irreversible items. Do not implement.

## CONTEXT

- 2026-09-08. School-pilot LessonWebView: **srcdoc web**, **html+baseUrl native**. Native KaTeX **data:woff2** (about:blank). RIDE photo+event **7-day TTL in SQL comments/RPC only**.
- Two repos: `~/projects/kelyra` (class app, Expo 57 / RN 0.86.3 / RN-web ~0.21) and `~/projects/kelyra-author` (pack emitter, no student PII).
- Loop boards: class 8764, author 8765. Lesson-dev origin is **:8772**, not those ports.
- **Do not configure kelyra.app DNS** until Chuck says (map + school-pilot HOLD).
- PM weekly (same day): 8 CEO HOLDs stay parked; P0 bets are teacher chrome residual, splash/web, Q18 acceptance **run** (not Build).
- Docs `docs/architecture.md` (2026-08-12) and `docs/data-model.md` (2026-08-16) lag live SQL (105 `supabase/migrations/*.sql`, last filename `20260910000000_diary_ledger.sql`).

## REQUIREMENTS

Structured handoff. Risks only. Spec/ops decisions, not a Build send.

## CONSTRAINTS

- Do not write app code. Do not apply SQL. Do not unblock HOLDs. Do not touch DNS.
- Flag CEO-irreversible items. Human authority on legal, spend, production.

## FILES/AREAS

- Class app: `docs/architecture.md`, `docs/data-model.md`, `docs/setup.md`
- Lesson player: `src/components/ui/LessonWebView.tsx`, `LessonWebView.web.tsx`, `src/lib/lessons/host.ts`
- Math: `src/components/ui/MathText.tsx`, `katexMinCss.ts` (native data:woff2)
- RIDE: `supabase/migrations/20260907000000_ride_schema.sql`, `20260907000001_ride_rpcs.sql`, `src/lib/ride/api.ts`
- Media TTL: `src/lib/media/signedUrl.ts` (photos 3600s; diary 600s)
- Author contract: `~/projects/kelyra-author/docs/package-spec.md`
- Map: `notes/company/KELYRA_MAP.md`
- PM input: `notes/company/PM_WEEKLY_2026-09-08.md`

## WORK PERFORMED

Read map, architecture/data-model/setup, LessonWebView both platforms, KaTeX native CSS, RIDE schema+purge RPC, signed-URL TTLs, Author package spec, Expo `package.json`/`app.json`, live `hermes kanban --board kelyra stats` + blocked list. No code, no SQL, no git commit.

## VERIFICATION

- Kanban 2026-09-08 ~11:13 CT: blocked 8, ready 0, todo 0, done 190. Same 8 HOLD IDs as PM weekly.
- `purgeOldRide()` exists in `src/lib/ride/api.ts` only; admin ride UI calls `archiveDayPhotos`, **not** purge. No `pg_cron` / Edge job found for `dismissal_purge_old`.
- 105 SQL files; apply path is SQL Editor **filename order** (`docs/setup.md`). No `schema_migrations` usage in-repo. Ride RPC header: “Hermes applies. Do not apply from bot.”
- Future-dated filenames already on disk today (08 Sep): `20260909000000_photo_thumbs.sql` (renamed after colliding `20260824*` abort), through `20260910000000_diary_ledger.sql`.
- Class `main` dirty: dashboard/kanban notes + untracked weekly/QA notes only; Author `main` clean.

## RESULT

### Top architecture risks this week

**R1 — SQL apply-by-filename is the live schema SoT (P0 ops)**  
105 files, paste-in-order, “already exists ≠ done.” Timestamp collisions already happened (`20260824000005` aborted; thumbs re-homed to `20260909000000`). Files dated **09–10 Sep** sit on **08 Sep** main — inserting another `20260908*` after those are applied **breaks filename order**. No in-repo applied-version ledger. Bots must not apply. Wrong file on live project is hard to unwind.

**R2 — RIDE 7-day photo/event TTL is declared, not operated (P0 FERPA)**  
SQL: `queue_events` always purge at `ride_school_date()-7`; `line_photos` same unless `archived_at`. RPC returns `storage_paths` and says object delete is **best-effort Edge/cron**. No cron found. No admin caller of `purgeOldRide`. Archive is superintendent-only and **extends** retention. Until a scheduled job deletes rows **and** storage objects, line photos are unbounded.

**R3 — Native/web lesson player split (P1 security + QA)**  
Web: fetch HTML → iframe **srcdoc** + `sandbox="allow-scripts allow-same-origin allow-forms"` + `postMessage(..., '*')`. Native: fetch → WebView `source={{ html, baseUrl }}` + `originWhitelist` http/https/about + allowlist. Two code paths, two threat models. School-pilot stays on this player; **kelyra.app DNS is CEO-held**. Q18 is acceptance-run only (`t_7d367b42` stays blocked as implement).

**R4 — Data-model docs vs live school model (P1 drift)**  
Canonical docs still describe teacher-owned MVP + class `join_code` student auth. Live setup: first login claims superintendent; student/parent are provisioned logins; `/join` → sign-in. RIDE, diary, GAUTH, hats, Ask history, lesson packs are in SQL, not in `data-model.md`. Implementers who trust docs will violate product law (matcher never inserts students; Approve is the only grade; teachers do not create classes).

**R5 — Expo one-client bet under load (P1 delivery)**  
Expo 57 + RN 0.86.3 + RN-web ~0.21 + Metro **static** web. Two WebView stacks: lesson (hosted HTML) vs MathText (about:blank + inlined woff2). PM P0-B is web splash/cover/audio — Expo-web media, not a second web framework. Architecture.md still says “extract Next.js later; do not start with two clients.” Hold that unless CEO opens a web-shell split.

**R6 — Two-repo pack contract (P1 product boundary)**  
Author emits `index.html` + `manifest.json` + audio/img; **student PII never in a pack**. Class app assigns, hosts (`lesson-host/<token>/`), grades. Contract lives in Author `package-spec.md` and class `student_open_lesson` / bridge. Drift = broken Open or FERPA leak into packs. Loop boards 8764/8765 are **QA loop UIs**, not the lesson-dev server (:8772).

**R7 — Photo TTL is not one number (P2 consistency)**  
Homework/profile signed URLs default **3600s**; diary **600s**; lesson open JWT **~1h** (Author spec); RIDE **7 calendar days** then (intended) delete. Signed URL cache is client-side. Short diary TTL does not protect ride line photos.

**R8 — Soft FERPA / no DPA (standing, CEO-legal)**  
Paid model, keys server-side, private buckets, no IEP pages to the model, Approve gate, no public class URL. **Not** school-official status. Architecture.md §5.6 still correct. Do not claim FERPA-compliant district posture.

### CEO-irreversible (do not do this week without Chuck)

1. **kelyra.app DNS / custom domain** — explicit HOLD.
2. **DPA / “school official” claim** — legal, not engineering.
3. **Public / pre-auth class URL** — FERPA fail-closed (`class-landing-architecture.md`).
4. **App Store / Play production** — spend + privacy nutrition labels; camera/mic already in `app.json`.
5. **Live SQL apply out of filename order** or re-running aborted `20260824*` thumbs.
6. **Unblocking PPT (`t_7fb77277`) or Attendance (`t_7b12ad6f`)** — product law, not a refactor.
7. **Hard-delete of production education records** — UI already hard-deletes with no undo (`data-model.md`).

### Architecture decision to keep

One Expo client; one hosted lesson player (dual platform adapters, not two products); Author never holds student PII; SQL applied only by Hermes/CoS by filename; DNS stays off kelyra.app.

### Debt item (not this week’s Build)

Operate RIDE TTL: scheduled `dismissal_purge_old` + storage object delete of returned paths, then prove 8th-day absence. Spec/ops card, not unblocking HOLDs.

## OPEN ISSUES

1. Live DB vs 105-file repo: **unverified** from this pass (no production query). CoS apply log is the missing SoT.
2. RIDE storage-object delete job: missing.
3. `docs/architecture.md` / `docs/data-model.md` stale (join codes, teacher-only). Docs-only refresh is in-scope for this role later; not done here to keep this brief short.
4. Lesson web `allow-same-origin` + srcdoc + `postMessage` target `*` — security residual; do not “fix” in this brief.
5. Board: 8 HOLDs, 0 ready. Any implement of R1/R2 needs CoS card + ARM GRANT — not this ticket as Build.

## ESCALATION NEEDED

- **@chief-of-staff:** Treat RIDE purge+storage delete as **ops**, not a loop on HOLD epics. Confirm whether 20260909/20260910 SQL is already applied before anyone adds another 20260908 file.
- **CEO Chuck:** DNS stays off. No DPA this week. Confirm RIDE line photos may exist >7 days until ops lands (honest FERPA copy).

## RECOMMENDED NEXT ACTION

1. CoS: inventory applied SQL vs `ls supabase/migrations/*.sql | sort` (filename order). Freeze new timestamps to **today-or-later unused** prefixes only.
2. CoS/ops: schedule `dismissal_purge_old` + delete `storage_paths`; do not ask Engineering to invent a second retention model.
3. QA: Q18 lesson-assign **acceptance run** on the existing LessonWebView split (`t_7d367b42` stays blocked as implement).
4. Architect (later, docs-only): refresh `docs/architecture.md` §auth + risks so they match school roles and RIDE/diary TTLs.
5. Do not configure kelyra.app DNS.
