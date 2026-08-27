# Kelyra Grok Build queue

Credits back: **Monday 24 Aug 2026, 1:40 AM America/Chicago**.
Nothing in this list is sent until Chuck reviews and says send.
Status: HOLD unless noted.

Chuck will prioritize this list later. Chief of Staff keeps it current.

Loop P2/P3 (nonblocking findings from `kelyra-qa-loop`) are tracked in `notes/qa-loop-backlog.md`, not in the HOLD tables below. Ask CoS to list, prioritize, or burn leftover Grok Build credits on them.

---

## P0 — Security / access (Kelyra QA)

| ID | Item | Source | Status |
|----|------|--------|--------|
| Q1 | Public signup + `handle_new_user` always provisions a teacher | QA | APPLIED 2026-08-26 |
| Q2 | Any authenticated user can INSERT `message_thread_members` and read that thread (UPDATE thread_id hop also locked) | QA | APPLIED 2026-08-26; UPDATE lockdown APPLIED 2026-08-26 |
| Q3 | Teacher create-class: orphaned class, home opens office class they cannot use (also a product blocker) | QA | APPLIED 2026-08-26 |
| Q4 | `ask-assistant` no JWT/role check; `hydrateAskImages` arbitrary URL fetch if deployed | QA | APPLIED 2026-08-27 (Edge live) |

## P1 — Data / staff overreach (Kelyra QA)

| ID | Item | Source | Status |
|----|------|--------|--------|
| Q5 | `get_parent_card`: any staff gets full parent PII | QA | APPLIED 2026-08-26 |
| Q6 | `school_students_for_link` / `school_parents_for_link` dump whole school to any staff | QA | APPLIED 2026-08-26 |
| Q7 | Teacher Ask `create_class` → unassigned office class (`is_staff` only) | QA | PASSED 2026-08-26 (no SQL; Ask advertise gate) |
| Q8 | Ask `link_parent_student` OR-bypass; teachers should not link families | QA | APPLIED 2026-08-27 |
| Q9 | `profiles_read` any login SELECTs all profiles | QA | APPLIED 2026-08-27 |
| Q10 | `login_identifier` granted to anon (username → email oracle) | QA | APPLIED 2026-08-27 |
| Q11 | `students_own` leftover; co-teacher can see roster, cannot write | QA | APPLIED 2026-08-27 |
| Q12 | `handle_new_user` + `ensureTeacherProfile` can recreate teacher rows after student/parent provision | QA | APPLIED 2026-08-27 |

## P2 — Setup / product blockers (Kelyra QA)

| ID | Item | Source | Status |
|----|------|--------|--------|
| Q13 | Setup/README still Slice 01; ~58 migrations skipped; docs still sell join codes | QA | on P2/P3 backlog |
| Q14 | `/admin/matrix` UI is cosmetic (`can()` without grants except Ask) | QA | on P2/P3 backlog |
| Q15 | `setActiveClass` writes DB; Capture/Inbox/header keep stale `active_class_id` | QA | on P2/P3 backlog |
| Q16 | Alert detail `onOpenWork` is a no-op | QA | on P2/P3 backlog |

## P2 — In-app Agent control plane (Kelyra Agent)

Do not add tools that ride `is_staff` / open thread-member insert.

| ID | Item | Source | Status |
|----|------|--------|--------|
| A1 | Tool-runner: getUser + policy map + server-filtered tools; no service-role exec | Agent | HOLD |
| A2 | Safe reads: grade cells, class desk, completion, inbox, my practice, children progress, unread, feed, audit search | Agent | HOLD |
| A3 | Messages list + send as member (no add-member until Q2) | Agent | HOLD |
| A4 | Backlog do-not-send: Approve, deletes, admin logins/hats/matrix/school identity, PPT-to-practice | Agent | HOLD (do not send) |

## P2 — Teacher UI (Kelyra UX)

Superintendent look applied to teacher. Waiting on Apple Note “Not on KELYRA”.

| ID | Item | Source | Status |
|----|------|--------|--------|
| U1 | Teacher SHELL: superintendent chrome; Grade/Class/Student altitude tabs; no create-class; tray 5; hamburger switches existing classes only | UX | HOLD |
| U2 | Home body per altitude (grade summary / class desk / student desk); no Approve on Home; empty-no-class card with no Create | UX | HOLD |

---


## P2 — iPhone back navigation (Kelyra QA)

| ID | Item | Source | Status |
|----|------|--------|--------|
| Q17 | iOS: hide redundant AppHeader `<` when edge-swipe already pops; keep `<` on web and where swipe cannot pop | QA | on P2/P3 backlog |

Chuck (iPhone, 2026-08-23): swipe-back already works. The top-left `<` duplicates the same action. Do not treat this as “restore interactive-pop.”

### Q17 held Grok Build prompt

```
Kelyra iPhone back affordance — PATTERN (do not one-screen patch).

Confirmed on device (Chuck, iPhone): edge swipe left-to-right already goes back on pushed screens. The custom top-left “<” in AppHeader does the same pop. That is a duplicate, not a missing native gesture.

Goal:
- iOS: hide the AppHeader back chevron (Icon name="back") when the screen can already be dismissed with the system/stack edge-swipe.
- Keep an explicit “<” (or equivalent) on web, and anywhere swipe cannot pop: tab/root screens that are not on a stack, first screen of a stack if you still need a way out, Android if you want a visible back, sheets/modals that are not stack pops.
- Do not change product auth/RLS. Do not privilege-leak office routes into teacher/student/parent chrome.

Do NOT:
- Treat this as “restore interactive-pop” or “animation: none killed swipe.” A code audit saw headerShown: false and animation: 'none' on Stacks — that is a hypothesis only. Device behavior wins: swipe already works. Do not churn navigation animation / gestureEnabled unless a specific screen actually fails swipe in QA.
- Add a second native header. Keep AppHeader as chrome.

Where the chevron lives today:
- src/components/ui/AppHeader.tsx — showBack = isChromePushed(pathname) && !kelyraMark
- src/lib/chrome/ChromeProvider.tsx — isPushedPath
- src/components/ui/AppShell.tsx — AppHeader above the Stack

Implementation:
1) One helper, used by AppHeader only: showChromeBack({ platform, canGoBack, isTabRoot, swipePops }).
   - iOS + swipePops (pushed stack screen): showBack = false
   - web (and Android if no reliable swipe-pop): showBack = true when isPushedPath / canGoBack
   - tab/root (/, capture, inbox, todo, ask, class desk, parent tab home for parent role): showBack = false on all platforms

2) isPushedPath mismatches (still fix; they make a chevron appear where it should not, or omit it where web needs it):
   - /parent is parent TAB home AND isPushedPath → no chevron for parent role on /parent; staff who pushed /parent from elsewhere may still need back on web.
   - /password is in isPushedPath but AppHeader is null (role none) — leave forced-password with no chrome unless product wants a way out.
   - Class cluster (gradebook, setup, assignments, family, parents, assign): if they are real stack pushes, iOS should swipe (Chuck: swipe works); web still needs `<` if they are pushed. If they are meant as tab-switch, use replace and no chevron.

3) proposal.tsx GhostButton “Back” + setPushedBackHandler: do not leave two visible back controls on iOS. Keep dirty-discard on both swipe (beforeRemove) and any remaining Back control on web.

4) Do not copy-paste per-screen BackButtons. Do not enable/disable gestureEnabled globally as the fix.

Manual QA:
- iPhone: pushed student/parent/assignment/messages/search/proposal — swipe back works AND no top-left `<`. Tab roots still have no `<`.
- Web: same pushed screens still show `<`.
- Proposal dirty: swipe (iOS) or `<` (web) still confirm discard.
```

## P2 — Interactive lesson assignment (Kelyra QA)

| ID | Item | Source | Status |
|----|------|--------|--------|
| Q18 | App acceptance: assign interactive lesson as work; results on student record (Grade/Class/Student); privilege isolation | QA | HOLD (test plan, not a Build send) |

Plan (not a Grok Build prompt): `notes/qa-lesson-assignment-acceptance.md`

## P2 — Interactive lessons as assigned work (Prompt)

| ID | Item | Source | Status |
|----|------|--------|--------|
| L1 | Assign hosted lesson; student WebView; results on student record (hosting + identity/metrics + UX + privilege wall) | Ship, Lesson, UX, QA | HOLD |

Sources: `notes/interactive-lessons-assign.md`, `notes/qa-lesson-assignment-acceptance.md`. Ask wrap (`notes/ask-lessons-capability.md`) is later, not this send. Q18 is the QA plan; this is the Build prompt.

### L1 held Grok Build prompt

```
Kelyra — assign an interactive lesson as student work (one slice).

HOLD. Do not treat this as a send. Implement only when Chuck or Chief of Staff says send.

Goal: a teacher assigns a hosted FoM-style lesson pack like other work. The student opens it in-app WebView. Completing it writes results onto that student’s record. Grade / Class / Student altitudes can see it. Not a second LMS.

Hard rules:
- Teachers do not create classes. No Create class on this flow. Assign only to classes the teacher already teaches (office-assigned / existing). Grade altitude may multi-select those classes; Student altitude assigns to this student only.
- Do not invent RLS or new SECURITY DEFINER that is wider than existing taught-class assignment/submission access. User JWT only. No service-role as the actor. Do not ride `is_staff`. Do not stack lesson results on known holes (thread-member insert, `school_*_for_link`, `get_parent_card`). If a new table or bucket policy is required, fail closed to the same wall as “work on a student in a class I teach.” Document the policy; do not copy office dumps.
- Nothing is a grade until existing Approve. Metrics are evidence. Matcher never inserts a student. Model keys stay server-side.
- Do not git-commit `notes/teacher-decks/` or BJU-derived stills. Do not buy a domain. Do not Expo-bundle the deck.
- Phone captures; web reviews, assigns, and grades. Lesson *player* is phone-first. Teacher assign/review stays native 640 lists.
- Icons: do not invent View-stroke glyphs; use existing Icon pipeline if any new chrome name is truly required (prefer existing).

Nearby pattern: practice assign from the student record (`assignPractice` → `practice_sets` / assignments kind `practice` / `submissions`). Lessons should feel like the same “work on the student.” Reuse assignment + submission cells. Store `deck_id` + `version` (or `lesson_pack_id`) on the assignment, not a raw URL.

--- Hosting (Ship) ---

Private Supabase Storage bucket `lessons` + Edge Function `lesson-host` as a same-origin static gateway. The Expo app does not host HTML.

Why not alternatives: a per-object signed URL on `index.html` 403s relative `audio/` and `img/` (`Audio()` cannot append query tokens). A public bucket leaks stills. EAS hosting bakes curriculum into the binary and skips per-student expiry.

Layout:
  lessons/{deck_id}/{version}/index.html
  lessons/{deck_id}/{version}/audio/...
  lessons/{deck_id}/{version}/img/...
Example: `lessons/fom-ch01/v4/index.html`. Teacher or admin script uploads the folder. Students never list the bucket. New version = new prefix; in-flight tokens keep the old prefix until they expire.

Launch:
1. Teacher assigns in native UI. Row stores deck_id + version, not a URL.
2. Student taps Open. Authed RPC/Edge `student_open_lesson(assignment_id)` checks the submission cell belongs to that student, then mints a short-lived JWT (~1h: student_id, assignment_id, storage prefix).
3. App loads that URL as the WebView *top-level* document. Shape (illustrative, no custom domain): `https://<project>.supabase.co/functions/v1/lesson-host/<token>/index.html`. Do not persist the token in WorkRow, chrome, or share.
4. `lesson-host` verifies JWT, maps the remaining path onto `lessons/{deck_id}/{version}/…`, streams the object so relative assets stay same-origin under the same token prefix.
5. Token expiry mid-session: re-sign once and reload; then calm retry copy. Never dump to Safari.
6. Do not put student identity or resume beat in the URL. `?beat=` is QA only.

Dev allowlist: `http://localhost:8772` and LAN `:8772` (today’s `PORT_LESSON=8772`). Prod HTTPS (iOS ATS). No mixed-content assets in prod.

WebView navigations allowlist: prod `lesson-host` origin + local/LAN `:8772`. Block other *page* navigations. Subresources allowed: relative `audio/` `img/` plus Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) as stylesheet/font fetch only — the WebView must not *navigate* to Google.

Top-level load, not iframe. No lesson cookies. Do not copy Kelyra auth cookies into the WebView. Audio: in-page tap-to-play; inline / playsInline.

Student-visible: deck title + assignment name. Never show signed token, storage path, copy-paste lesson URL, bucket names, or JWT.

Local playable deck (gitignored): `notes/teacher-decks/fom-ch01-v4/` (`index.html` + relative audio/img). Confirm Storage size with Chuck before a surprise quota (scene PNGs are multi-MB).

--- Identity + metrics (Lesson) ---

Lesson origin ≠ Expo origin is expected. Identity and resume are `postMessage` between the page and the native WebView host. Not the URL. Not cookies.

On open, native injects identity that matches the JWT student + that assignment’s class: school, class, teacher, student. Visible on the live page or in a documented HUD/debug strip. Not an anonymous preview. S2 must never see S1’s name/id. Teacher tokens and superuser flags must not appear.

Resume: new signed URL each Open. Page localStorage (today `kelyra-fom-ch01-v4`) is a device cache only, not a Kelyra session.

Done: lesson `postMessage` or server; then pop to To-do as Done. No second native Done bar if the page already has Done.

On complete, persist once (names may differ; all must land):
- elapsed time (started, duration, completed at)
- correct / incorrect counts or per-item outcomes
- marks if the page scores
- hint count (or which beats)
- audio used
- kinetic / drag used
- extras the page emits (attempts, skipped beats, reduced-motion, …) — do not drop extras with no schema note

Partial leave: in-progress vs abandoned, documented. Never write another student’s row. Repeat: new attempt *or* overwrite — pick one and show it clearly on the record. Client sends once; teacher record updates (one refresh OK for v1).

--- UX (assign + player + teacher record) ---

Teacher assign is native. No WebView. No new tray tab, no sixth icon, no Lessons hamburger root.

- Class altitude (default): existing Assignments cabinet `/class/{id}/assignments`. Same New assignment control; type **Lesson** beside Practice. Must attach to Class A, not an unassigned office class, not a new class. If chrome “active” class is Class B, do not attach Class A’s lesson to Class B (fail closed or picker lists taught classes only).
- Grade altitude: multi-select the teacher’s existing classes in that grade. Still no create-class.
- Student altitude: this student only; who-list pre-filled and locked.
- Create/edit: existing `/assignment/{id}` (or equivalent). Catalog picker for deck_id + version. No URL field. Empty catalog copy: “No lessons yet.” Wordmark = title or “New assignment.” Hamburger hidden. Q17: web shows `<`; iPhone omits it when edge-swipe already pops.

Student To-do: same WorkRow as other work. Pills: Lesson / Due / Assigned or In progress or Done. No URL, no Open in Safari, no token. Tap opens the Lesson player (pushed).

Lesson player:
- Hide floating tray. Header wordmark = assignment title (marquee, no ellipsis). Hamburger hidden. No share, no Safari, no header refresh. Pull-to-refresh off (do not steal drag).
- Full-bleed WebView. No address bar.
- Open: `student_open_lesson` then top-level `lesson-host` token `index.html` (or `:8772` in dev).
- Off-allowlist toast: “That link is not part of this lesson.”
- Expiry fail: “Could not keep the lesson open” plus Try again.
- Q17: iPhone no extra back chevron (swipe pops); web has chevron.
- Never dump to system browser (browser is a bug fallback, not a supported player).

Teacher review — evidence, not a grade until Approve. Show only what Lesson emits. Omit empty rows. No chart library. ListRow / WorkRow / pills.

- Student altitude: work row for the lesson; tap attempt detail (title, due, status, metric rows). Optional Open lesson is teacher preview, not a student token.
- Class altitude: assignment row or gradebook column like other work. Cell Done / In progress. Tap = attempt detail. Distinguishable from `kind: practice`. Lessons never enter Capture or Inbox.
- Grade altitude: per-class n/m done as ListRow status. Tap class → Class altitude. Only classes this teacher teaches. No auto-email of scores.

Copy never includes “Open in browser.”

--- Privilege wall (QA; slice fails if this fails) ---

Actors use the app + user JWT only. Preconditions: two teachers, two classes, no create-class control on the teacher shell for this pass.

- Teacher B: cannot open S1 record, list Class A submissions, or read lesson results / Ask about S1.
- Teacher A: cannot read a Class B student the same way.
- Student S1: only own results; no class roll-up of S2; opening S2’s assignment id / student id in the query fails closed (identity stays S1 or page refuses).
- Parent of S1: only linked children; not S2.
- Anon / other school: guessed assignment UUID → no row.
- Teacher A (normal, not superintendent): assign + read for *taught* class only. No office class create, no `create_school_class` teacher-less class, no matrix, no other-class directory. In-app AI must not do superuser reads/writes.
- Logged out copy of a lesson URL: sign-in. S2 must not play as S1.

Do not implement Ask tools `assign_lesson` / `open_lesson` / `read_lesson_results` in this send. When they exist later they wrap the same APIs the screens use, still user JWT, still not `is_staff`.

--- Done when ---

Behaviors A–D in `notes/qa-lesson-assignment-acceptance.md` hold on web (and iPhone if WebView). E1–E7 fail closed. Relative audio/img load under `lesson-host`. Identity on the page matches the JWT student. Catalog has no URL field. `lessons` bucket is private. No new class was created. `notes/teacher-decks/` was not committed.

--- Out of scope v1 ---

Teacher HTML upload; public/unlisted URLs; parent WebView; system browser as supported player; new tray tab; charts or AI tutor in player chrome; iframe wrapper; custom domain/CDN; Ask tools; git push of decks; Q17 as its own patch (honor it on these new screens only).
```

## P2 — Office password reset (Kelyra QA)

| ID | Item | Source | Status |
|----|------|--------|--------|
| Q19 | Office (admin/superintendent) can reset a school login; teachers cannot; `/password` self-service stays | QA | HOLD (test plan, not a Build send) |

Plan: `notes/qa-office-password-reset-acceptance.md`  
Jacquee-as-teacher fail closed. L2 Assign/Preview separate. Q17 HOLD.

## P2 — Office password reset (Prompt)

| ID | Item | Source | Status |
|----|------|--------|--------|
| U3 | Office People: admin/superintendent reset someone else’s password; teachers cannot; reuse `must_change_password` | UX, QA | HOLD |

Sources: `notes/office-people-reset-password.md`, `notes/qa-office-password-reset-acceptance.md` (Q19 is the test plan).

### U3 held Grok Build prompt

```
Kelyra — office reset of someone else’s password (one slice).

HOLD. Do not treat this as a send. Implement only when Chuck or Chief of Staff says send.

Goal: Administrator and superintendent can reset a school login from office People. Teachers cannot. This is office reset of someone else, not self-service Change password on /password.

Hard rules:
- Privilege wall: `is_school_admin` / superintendent (office hats). Same wall as `accounts.create` / `admin_create_login` (superintendent all, administrator school, teacher none). NOT `class_teachers`. NOT `is_staff` widen. A teacher of FoM cannot reset those students’ auth passwords.
- User JWT only. No service-role in the Expo client. Do not invent RLS or SECURITY DEFINER wider than that office wall. Do not ride thread-member insert, `school_*_for_link`, or `get_parent_card`.
- Teachers do not create classes. Reset does not create a class, change hats, provision a user, or mint a student. Reset is not Create login.
- Reuse today’s pattern: `admin_create_login` already sets a temporary password + `must_change_password` true; Chrome forces `/password`. Reset does the same for an existing login. Do not invent email magic links.
- Username does not change. Email is not the sign-in. Kelyra signs in with @username + password.
- Self-service `/password` (`src/app/password.tsx`) stays for the signed-in user. Do not remove it or make it office-only.
- Hide Reset on your own row (use Profile Change password). Hide the control for teachers; do not show an error tease.
- Do not log the new password. Show the temp once, then never again if they leave the sheet.
- Icons: reuse existing swipe recipe. Do not invent View-stroke glyphs.

Who: superintendent and administrator on office People. Applies to school logins: teachers, students, parents, other staff. Same control, same sheet. Not parents as actors. Not a class teacher who opened a student record.

Where:
- Office PeopleAdmin (Staff / Parents / Students): swipe on the ListRow, label “Reset password” (existing swipe recipe; tone wash or brand, not delete).
- Ghost “Reset password” on the office person account `/profile?person=…` under identity, next to hats.
- Do NOT put it on teacher Class Setup, student person tabs, Practice/Work, Capture, Inbox, Assign, or Ask as a superuser bypass.
- Create login stays where it is.

Sheet: pushed or ConfirmSheet-scale FormSheet. Title “Reset password.” Lead: They will sign in with @username and this password, then choose a new one.
Field: Temporary password (office can type; optional Generate fills a pronounceable temp, 8+ chars). Ghost Save.
Success: keep the temp on screen once with Copy. Status: “Password reset. They must change it at next sign-in.”
Cancel does nothing.
No login yet (no username): cannot reset — copy “No login yet, create one from People.”
Q17: if this is a pushed screen, iPhone omits extra `<` when swipe pops; web keeps `<`.

Server: one office RPC (e.g. `admin_reset_login_password`) gated like `admin_create_login`. Sets Auth password + `profiles.must_change_password = true` for that school profile. Fail closed for teacher JWT (Jacquee-as-teacher: RPC error / empty, no password change). Fail closed for a random `auth.users` UUID outside this school. In-app AI / Ask must not reset passwords for a teacher account (`is_staff` forbidden).

After reset: target signs in with temp, lands on `/password`, sets a new password; old password dead.

Copy:
- Swipe/button: Reset password
- Success: Password reset. They must change it at next sign-in.
- Teacher: omit the control.
- Self: omit.

Acceptance (Q19 — fold these into the slice; do not treat as a later prompt):
Actors use app + user JWT only. No service role as the actor. Separate from L1/L2 lesson assign and Q17.

Fail closed — Jacquee-as-teacher (@jacquee, not also_administrator):
- T1: People / hamburger / student card / Ask: no Reset password for anyone (including herself as office reset). Omit the control; no error tease.
- T2: jacquee JWT calling the reset RPC or a direct `from('…')` write: error / empty. No password change.
- T3: Ask “reset Colton’s password” / “reset @goodapple”: tool denied or no-op. Must not ride `is_staff`.
- T4: Jacquee still uses `/password` when *her* `must_change_password` is true (self-service only).
Fail the slice if a teacher JWT resets any auth user.

Pass — office:
- O1: Administrator (not Jacquee-teacher) resets a school login (FoM student or @goodapple in this school): succeeds; temp shown once; target `must_change_password` true.
- O2: Target signs in with temp, lands on `/password`, sets a new password; old password dead.
- O3: Superintendent same as O1–O2 on a different login.
- O4: Cannot reset a login outside the school / a random `auth.users` UUID.
- O5: Reset does not create a class, change hats, or provision a new user.

`/password` stays:
- P1: Forced change after create-login or office reset still works. Not removed, not office-only.
- P2: User with `must_change_password` false is not forced through office reset. Do not block `/password` for office-forced users.

Privilege extras: teaching FoM does not grant reset on those students’ auth passwords. In-app AI must not reset passwords. Do not log the new password.

Done when: T1–T4 fail closed for @jacquee; O1–O5 pass for administrator and superintendent; P1 intact. No create-class. No email reset link.

Out of scope: teacher create-class; teacher Add as a new student; email reset links; changing @username; reset from Capture/Inbox/Assign; Ask reset tool; Q17 as its own patch; L1/L2 lesson assign.
```


## P1 — Storage egress (Chief of Staff)

| ID | Item | Source | Status |
|----|------|--------|--------|
| S1 | Cut Storage egress: resize + thumbs for lists; keep originals for viewer; stop unique signed URLs busting cache | CoS | SENT 2026-08-24 14:21 CT |

Sources: `notes/storage-egress.md`. Org Free over Egress 8.62/5 GB, grace to 17 Sep 2026. Photos 132 × ~3 MB. Not DB size.

### S1 held Grok Build prompt

```
Kelyra — cut Supabase Storage egress (one slice).

SENT 2026-08-24 14:21 CT (notes/s1-send-now.txt).

Context: Free org is over quota on Egress (8.62 / 5 GB), grace until 17 Sep 2026, then 402. Database 30 MB, stored files ~40 MB dashboard / ~230 MB object metadata. Almost all egress is Storage. Photos bucket: 132 JPEGs, many 2.8–3.3 MB phone stills. Audio is 8 MB. lessons bucket empty. Cached egress 2.56 GB vs 8.62 uncached.

Cause (verify, non-binding): lists load full originals via createSignedUrl (3600s). New token each session = CDN miss. normalizePhoto quality 0.8 with no resize. hydrateCaptures signs every inbox page at full size. RN Image uses the signed URL as cache key.

Goal: lists and avatars must not download 3 MB originals. Viewer/AI may still use the original. Stay on private buckets. User JWT. Do not public-bucket student photos. Do not move Postgres off Supabase. Do not add Cloudflare R2 in this slice.

Do this:
1. On photo upload, store a list/avatar derivative (e.g. max edge 480 or 96) plus the original (or replace original with a max-edge ~1600 JPEG if quality allows — do not silently destroy evidence photos without a full-size kept for Capture review). Prefer: original + `*_thumb` in the same photos bucket, assets row points at both or a convention on storage_path.
2. Inbox, People avatars, WorkRow, message thumbs, roster: signed URL of the **thumb** only.
3. ImageViewer / Capture review / analyze-homework / Ask photo: original.
4. Stop cache-busting: persist signed URLs until near expiry (disk or AsyncStorage keyed by storage_path, not process memory only). Prefer expo-image (or equivalent) cacheKey = asset id / path, not the tokenized URL.
5. Upload: resize before send (max long edge, JPEG quality) so new captures are not 3 MB. Existing 3 MB files: generate thumbs in a one-shot script Chuck/CoS can run; do not download-all in the client.
6. Cache-Control on upload if Storage honors it for signed objects.

Do not: public photos bucket; email the files out; git-commit notes/teacher-decks/; create-class; is_staff widen; Cloudflare/R2 in this pass.

Done when: a full Inbox + People load does not fetch 3 MB originals for thumbs; new captures are much smaller; signed URL reuse does not mint a new token every app open. Typecheck clean.

If SQL is needed, put a migration and tell Chief of Staff to apply it.
```


## P1 — Section-sized lessons (Chief of Staff)

| ID | Item | Source | Status |
|----|------|--------|--------|
| L4 | Split FoM Ch01 into assignable 1.1–1.7 + locked student name | trial teacher via Chuck | LANDED 2026-08-24. CoS: apply `20260824000006_lesson_section_packs.sql`. Do not upload deck unless Chuck confirms quota. |

Sources: `notes/lesson-sections.md`. After L3. Do not collide with player chrome.

### L4 held Grok Build prompt

```
Kelyra — section-sized hosted lessons (one slice).

HOLD until Chuck or Chief of Staff says send. Land after L3 (X exit / swipe stays on the page). Do not reopen L2 IA.

Trial teacher: they teach one textbook section at a time. Assigning all of Fundamentals of Math Chapter 1 as one lesson is too coarse.

Current: one lesson_packs row fom-ch01 / v4, "Fundamentals of Math · Chapter 1". Playable notes/teacher-decks/fom-ch01-v4/index.html (gitignored). 14 beats. Picker is already one chip per pack row. student_open_lesson JWT prefix is {deck_id}/{version}. Identity/resume is postMessage, not the URL. ?beat= is QA only. Page key kelyra-fom-ch01-v4 is whole-chapter.

Goal: Jacquee can assign 1.3 only. Student Open plays only that section. Completing it reports that assignment. Next/swipe cannot walk into 1.4.

BJU titles (from the Ch01 PPT — use these, do not invent):
1.1 Ordering and Rounding
1.2 Addition and Subtraction
1.3 Multiplication
1.4 Division
1.5 Exponents
1.6 Square Roots
1.7 Order of Operations

Do this:
1. Keep ONE HTML + shared audio/img. Storage prefix stays lessons/fom-ch01/v4/. Do not copy scene PNGs per section (S1 egress).
2. Seed seven published packs: deck_id fom-ch01-s11 … fom-ch01-s17, version v4, titles as above (picker may prefix FoM ·). Hook rides with 1.1. Finished rides with 1.7. Teach+Check is one assignment. Optional unpublished/review "Chapter 1 (all)" on fom-ch01; default picker is the seven sections.
3. Pack metadata: storage_deck_id always fom-ch01, plus beat_start/beat_end (or beat ids). JWT/host prefix must be fom-ch01/v4, not fom-ch01-s11/v4 (that path does not exist). Copy window onto the assignment or look it up at open.
4. Pass the beat window on identity postMessage. Do NOT use ?section= or ?beatStart= for students. Page subsets BEATS, HUD pips n/k for that pack, Next/swipe cannot leave the window. Per-pack localStorage (kelyra-fom-ch01-s11-v4). Slice Done completes that assignment only. L3 X still exits without wiping saved answers.
5. Dev :8772 uses the same identity gate. Do not serve the ungated chapter for every pack.
6. Assign UI: no new tabs. Existing Lesson chips list the new rows. Do not reuse assignments.section (practice gradebook).
7. SQL in a migration. Tell Chief of Staff to apply it. Do not upload the deck to Storage unless Chuck confirms quota.

Do not: public lessons bucket; git-commit notes/teacher-decks/; create-class; is_staff widen; S1 thumbs; Cloudflare; new Grok Build session for SQL retry (CoS resumes).

Done when: Jacquee assigns FoM · 1.3 Multiplication only; student Open is 1.3 Teach+Check; 1.2 answers still there if they had 1.2 assigned; typecheck clean.
```


## Parking

- Growth: after local school pilot
- Apple Note “Note on KELYRA” (read 2026-08-22): teachers must not create classes; Grade / Class / Student view switcher. UX revising U1/U2.
- Grok Build send window: after Mon 1:40 AM CT

## Changelog
- 2026-08-27 ~06:46 CT — Q4 Edge redeployed: ask-assistant, classify-capture, process-ai-jobs (verify_jwt=true). Unauthed Ask/SSRF closed on live.
- 2026-08-27 ~01:44 CT — Q12 loop passed; SQL fail_closed_teacher_provision applying; overnight Q9–Q12 chain done.
- 2026-08-27 ~01:30 CT — Q11 loop passed (3 security repair cycles); SQL students_write_via_taught_class applying; 3 P2/P3 filed; launching Q12.
- 2026-08-27 ~00:28 CT — Q10 loop passed; SQL `revoke_login_identifier_anon` applied; Edge `sign-in-handle` deployed (verify_jwt=false); 4 P2/P3 filed; launching Q11.

- 2026-08-26 19:54 CT — Q2 migration applied (`fail_closed_thread_members_insert`). Loop cancelled mid-run after implementer wrote the file; SQL applied by CoS.

- 2026-08-26 19:52 CT — Q2 sent to Grok Build (new session). thread_members_insert still auth.uid() is not null.

- 2026-08-26 19:48 CT — Q1 loop passed; SQL applied (`fail_closed_new_user`). Create-teacher button gone. handle_new_user no longer inserts teachers.

- 2026-08-26 19:35 CT — Q1 sent to Grok Build (new session). Still present: Create teacher account + handle_new_user inserts teachers.

- 2026-08-22 18:54 CT — list created from first QA pass, Agent matrix, UX teacher pack

- 2026-08-22 19:03 CT — UX revised U1/U2 from Note on KELYRA (no teacher create-class; Grade/Class/Student zooms)

- 2026-08-23 20:30 CT — Q17 iPhone back-nav pattern held (QA)

- 2026-08-23 20:36 CT — Q17 rewritten: swipe already works on iPhone; hide duplicate AppHeader `<` on iOS only (Chuck)

- 2026-08-23 20:47 CT — Q18 lesson-assignment app acceptance test plan parked (HOLD; not a Build send)

- 2026-08-23 21:30 CT — L1 interactive-lesson assign Build prompt parked (HOLD; not a send). Sources: Ship/UX in interactive-lessons-assign.md, QA plan, Agent Ask notes later.

- 2026-08-24 10:53 CT — Q19 office password-reset acceptance parked (HOLD; not a Build send)

- 2026-08-24 10:55 CT — U3 office People reset-password Build prompt parked (HOLD; not a send). Spec: notes/office-people-reset-password.md.

- 2026-08-24 10:56 CT — U3 folded Q19 acceptance (T1–T4 / O1–O5 / P1–P2). Still HOLD; not a send.

- 2026-08-24 14:20 CT — S1 Storage egress Build prompt parked (HOLD). notes/storage-egress.md

- 2026-08-24 14:20 CT — L4 section-sized lessons parked (HOLD). notes/lesson-sections.md

- 2026-08-24 14:22 CT — L4 titles from BJU PPT; gate via identity postMessage not ?section=

- 2026-08-24 14:21 CT — S1 sent to Grok Build (new session). notes/s1-send-now.txt

- 2026-08-24 14:25 CT — L4 sent (sections + locked assignment name). notes/l4-send-now.txt
