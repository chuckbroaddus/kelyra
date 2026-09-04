# kelyra-qa-loop P2/P3 backlog

Open P2/P3. P0/P1 from a loop run are fixed in-loop or escalated. Live Kelyra QA P0/P1 stay on `notes/grok-build-queue.md` HOLD (Q1–Q12) and are **not** this list.

This file is what CoS uses for:
- "Do we have any P2/P3?"
- "Let's prioritize the P2/P3 bugs"
- leftover Grok Build credits before a token reset

Chief of Staff appends loop nonblocking findings when a run finishes (dedup by title). Live Kelyra QA P2/P3 can be copied here when Chuck says to. Mark `fixed` when a later loop pass lands the fix. Do not git-commit this file unless Chuck asks.

Default order when spending credits: **P2 before P3**, then **oldest open first**. Chuck can re-rank.

## Open

### ui-design Ask FALLBACK still says Inbox (P3)
- Source: kelyra-qa-loop (2026-09-04)
- Session: `01a06d48-877b-7500-bb4d-3510231f9520`
- Workflow: `wf_01a06d48d6a678f3822806f6fe946d33`
- Request: TEACH-UX leftovers — finish v1 chrome (CEO send 2026-09-04)
- Evidence: docs/ui-design.md §12.4 still documents “Open Inbox or the student’s page.” and “open Inbox” while askPrompt.ts, scripts/ai-dev-server.mjs, and supabase/functions/ask-assistant/index.ts now say Needs.
- Recommendation: Update the Ask hard-limits copy in docs/ui-design.md to Needs so product docs match L6.
- Status: open

### Demoted routes leave ClassTabs with no selected tab (P3)
- Source: kelyra-qa-loop (2026-09-04)
- Session: `01a06b18-de24-7323-8af0-ff1b0a65d2cf`
- Workflow: `wf_01a06b1937e877a1bca37af7a2d8f3e0`
- Request: TEACH-UX Phase B — ClassTabs default cut + Class tray landing (CEO send 2026-09-04)
- Evidence: classTabFromRoute still returns `week` / `heatmap` / `family`, but those keys are absent from CLASS_TABS, so PersonTabs selects nothing on those screens.
- Recommendation: Map demoted panes to a nearby default tab for selection chrome (e.g. heatmap→gradebook, week→today, family→parents) without putting demoted keys back in CLASS_TABS.
- Status: fixed
- Fix note: fixed by TEACH-UX leftovers L4 (session 01a06d48-877b-7500-bb4d-3510231f9520, 2026-09-04)


### Week and Heatmap lack secondary chrome after demotion (P2)
- Source: kelyra-qa-loop (2026-09-04)
- Session: `01a06b18-de24-7323-8af0-ff1b0a65d2cf`
- Workflow: `wf_01a06b1937e877a1bca37af7a2d8f3e0`
- Request: TEACH-UX Phase B — ClassTabs default cut + Class tray landing (CEO send 2026-09-04)
- Evidence: CLASS_TABS omits week/heatmap; hrefForClassTab still returns `?tab=week` and `/gradebook?tab=heatmap`, and those panes still render in `class/[id]/index.tsx` and `gradebook.tsx`. Family is drawer-reachable (`HamburgerDrawer` "Family update"). No Today filter/overflow control for Week and no in-gradebook Heatmap pane switcher were added.
- Recommendation: Add a Today Week filter (or overflow) and a Gradebook heatmap pane control so demoted surfaces stay discoverable without restoring default ClassTab icons.
- Status: fixed
- Fix note: fixed by TEACH-UX leftovers L3 (session 01a06d48-877b-7500-bb4d-3510231f9520, 2026-09-04)


### storage-egress notes drift after S1 code (P2)
- Source: kelyra-qa-loop (2026-09-02) S1 t_785c5388
- Workflow: `wf_01a0652449bd7880aec6e7bb5433931d`
- Evidence: diagnosis section previously claimed list fallback to originals and no upload resize after code flipped both.
- Recommendation: Keep `notes/storage-egress.md` aligned with shipped thumb + resize behavior (docs touch on same run).
- Status: fixed

### Duplicate migration version 20260824000006 (P2)
- Source: kelyra-qa-loop (2026-09-02) S1 t_785c5388
- Workflow: `wf_01a0652449bd7880aec6e7bb5433931d`
- Evidence: `20260824000006_photo_thumbs.sql` and `20260824000006_lesson_section_packs.sql` share the same version prefix.
- Recommendation: Rename photo thumbs retry to a unique later timestamp before any automated migration runner; CoS apply photo_thumbs manually until then.
- Status: open

### Backfill forces .jpg thumbs vs convention extension (P2)
- Source: kelyra-qa-loop (2026-09-02) S1 t_785c5388
- Workflow: `wf_01a0652449bd7880aec6e7bb5433931d`
- Evidence: `scripts/backfill-photo-thumbs.mjs` always ends `_thumb.jpg`; `thumbStoragePath` keeps source extension. Message photos lack assets rows so non-JPEG message thumbs can stay blank after backfill.
- Recommendation: Backfill write convention path, or probe .jpg without falling back to multi-MB original.
- Status: open

### match-key key images use avatar thumb signer (P2)
- Source: kelyra-qa-loop (2026-09-02) S1 t_785c5388
- Workflow: `wf_01a0652449bd7880aec6e7bb5433931d`
- Evidence: `proposal.tsx` loads assignment key `imageUrl` via `signedUrlsForAssetIds()` (thumbs, no original fallback). Match-key may see only 480px derivatives.
- Recommendation: Sign key assets with original signer for match-key; keep thumbs for UI chips.
- Status: open

### Student capture load signs every original up front (P3)
- Source: kelyra-qa-loop (2026-09-02) S1 t_785c5388
- Workflow: `wf_01a0652449bd7880aec6e7bb5433931d`
- Evidence: `listStudentCaptures` signs all originals while WorkRow uses thumbs; focus tab needs originals only for selected capture.
- Recommendation: Lazy-sign originals when opening focus/review.
- Status: open

### Signed URL disk cache not cleared on non-explicit session end (P2)
- Source: kelyra-qa-loop (2026-09-02) S1 t_785c5388
- Workflow: `wf_01a0652449bd7880aec6e7bb5433931d`
- Evidence: AsyncStorage `kelyra.signed-urls.v1` keyed by bucket:path only; cleared in explicit `signOut()` but not on `SIGNED_OUT` / null session refresh.
- Recommendation: Clear on session-null; prefer scoping cache entries by auth user id.
- Status: open

### Narrow remute race if parent re-renders before awaitingGesture clears (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05189-790a-74d2-b43f-733e43fa1a9a`
- Workflow: `wf_01a05189b45871908798fab7530e119e`
- Request: Fix web splash audio — tap never unmutes (CEO 2026-08-30)
- Evidence: tryPlayUnmuted sets el.muted=false then awaits playAsync before setAwaitingGesture(false). SplashVideo still receives isMuted={awaitingGesture} (true) until that state update. A concurrent SplashLanding setState (e.g. beginVideoCrossfade → setIsFadingOut) can re-commit muted={true} briefly before awaitingGesture flips.
- Recommendation: If Safari ever remutes after a late tap, drive web muted only from an imperative flag or clear muted in the same sync turn before any parent setState; not required for acceptance given the short window.
- Status: open


### Web root fill uses minHeight 100% rather than 100vh (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a0516d-be43-7191-b46e-8fa87fc76c3e`
- Workflow: `wf_01a0516e47fd7682880297f57bcd5c1a`
- Request: Web splash US-WEB-1/2/3 center + cover + unmute
- Evidence: SplashLanding root web Platform.select sets width/height/minHeight to '100%' only; expo-reset already sets html/body/#root height 100% and #root display:flex, so the flex chain should fill, but the request also allowed 100vh as belt-and-suspenders.
- Recommendation: Optional: add minHeight: '100vh' (or 100dvh) on web root if live dogfood still shows gutters on a specific browser chrome size.
- Status: open

### SplashLanding can re-lock portrait after unlock while still mounted (P2)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05165-4387-72e3-8367-b5c4624102f6`
- Workflow: `wf_01a051657e457c93b158b6109b0ce456`
- Request: Mobile pre-auth portrait lock; unlock after sign-in (T40)
- Evidence: SplashLanding locks in a useEffect on [width, height] with no session check (SplashLanding.tsx ~109–111). runSignIn unlocks then refresh/replace; AuthProvider unlocks only when session changes. Android uses softwareKeyboardLayoutMode "resize", so a post-unlock window height change (keyboard dismiss) can call lockPreAuthPortrait again. /sign-in also mounts SplashLanding with no auth gate, so a signed-in visit re-locks with nothing to unlock again.
- Recommendation: Gate lock on signed-out state (skip or unlock when session is present), and/or lock once on mount instead of on every dimension change; keep AuthProvider unlock as backup.
- Status: open

### Orientation lock/unlock errors are swallowed (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05165-4387-72e3-8367-b5c4624102f6`
- Workflow: `wf_01a051657e457c93b158b6109b0ce456`
- Request: Mobile pre-auth portrait lock; unlock after sign-in (T40)
- Evidence: lockPreAuthPortrait and unlockAppOrientation catch all errors with empty handlers in screenOrientation.ts.
- Recommendation: Optional light logging in __DEV__ so simulator/unsupported-policy failures are visible during QA.
- Status: open

### Native Video may ignore parent opacity during crossfade (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05153-6ac8-7ef2-a0c8-4964692f2d78`
- Workflow: `wf_01a05153e17e7271ab9f3fb02af5f865`
- Request: Splash end black — architectural rewrite (T38)
- Evidence: SplashLanding fades an Animated.View wrapper (useNativeDriver: true) around expo-av Video; on some native surfaces parent opacity may not composite, so the visual may hard-cut at unmount rather than smoothly fade. Still JPG remains always mounted underneath with explicit mediaBox sizing, so the hold does not depend on the fade.
- Recommendation: Dogfood on iOS/Android; if the cut feels abrupt, unmount at fade start or migrate the player to expo-video while keeping the always-mounted still layer.
- Status: open

### pointerEvents none is only on the inner video layer (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05153-6ac8-7ef2-a0c8-4964692f2d78`
- Workflow: `wf_01a05153e17e7271ab9f3fb02af5f865`
- Request: Splash end black — architectural rewrite (T38)
- Evidence: During fade-out, pointerEvents="none" is set on the Animated.View, but the outer Pressable still receives taps and can call skipSplash mid-fade.
- Recommendation: Optional: also set pointerEvents none on the Pressable while isFadingOut if taps during fade should be ignored; current behavior (skip to CTA+form) is acceptable.
- Status: open


### Redundant atEnd ratio checks when SPLASH_PEAK_RATIO is 1 (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a0513e-280e-7a30-a6db-7b1b45feb94d`
- Workflow: `wf_01a0513e5e0f7ef2abcd74dfbd95f29e`
- Request: Splash still = last frame of ORIGINAL mp4 (CEO correction 2026-08-30)
- Evidence: SplashLanding.tsx onPlaybackStatusUpdate ORs `position >= duration - SPLASH_END_EPSILON_MS` with both `position / duration >= SPLASH_PEAK_RATIO` and `position >= duration * SPLASH_PEAK_RATIO`; with ratio 76/76 those last two are equivalent to `position >= duration` and mostly duplicate the epsilon path.
- Recommendation: Keep didJustFinish + epsilon (and optionally a single ratio check) for clarity; drop the duplicate ratio clauses if this is touched again.
- Status: fixed
- Note: Superseded 2026-08-30 by T38 kelyra-qa-loop `01a05153-6ac8-7ef2-a0c8-4964692f2d78`. Peak-frame / last-frame hold ratio logic removed; logo hold is always-mounted CEO JPG with video crossfade at 0.72 then unmount.

### Q12 security tests are static source assertions only (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041ea-e0c2-7511-b6f8-ef9878a268d2`
- Request: Q12 handle_new_user / ensureTeacherProfile
- Evidence: src/lib/auth/failClosedTeacherProvision.security.test.ts reads migration/TS text and asserts patterns; it does not execute SQL against a live DB.
- Recommendation: Acceptable and matches other Q* security tests; after CoS applies the migration, smoke provision student/parent and confirm no teachers row.
- Status: fixed
- Note: Accepted 2026-09-02 — static source assertions are the Q* evidence path (no live-DB conversion). Test file documents that; adds post-Q12 drift pins for handle_new_user remint / teachers_own and shouldLoadTeacherRow gate. CoS smoke remains operational (provision student/parent → no teachers row).

### Co-teacher photo replace can orphan prior assets (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041b1-ff99-7b00-b4ae-3d2bc816e1b5`
- Request: Q11 students_own co-teacher write
- Evidence: setProfilePhoto updates students/parents.photo_asset_id via the new taught-class UPDATE policy, then calls teacher_unref_asset, which still requires assets.teacher_id = auth.uid() (20260816000000). The RPC error is not checked, so a co-teacher replacing another teacher's upload leaves the old asset referenced-count orphaned.
- Recommendation: Widen teacher_unref_asset (or clear-photo path) to allow unref when the actor may update that person via student_on_taught_class / parent_on_taught_class, and surface unref failures.
- Status: open

### parent_students taught-class SELECT includes sibling links (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041b1-ff99-7b00-b4ae-3d2bc816e1b5`
- Request: Q11 students_own co-teacher write
- Evidence: parent_students_via_taught_class allows SELECT when parent_on_taught_class(parent_id), so a co-teacher of one linked child can read parent_students rows for siblings on other classes (UUIDs). Broader sibling visibility already exists via parent_children is_staff_profile.
- Recommendation: If tightening later, restrict the policy to student_on_taught_class(student_id) only (drop the parent_on_taught_class OR).
- Status: open

### parent_accesses FOR ALL widened to parent_on_taught_class (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041b1-ff99-7b00-b4ae-3d2bc816e1b5`
- Request: Q11 students_own co-teacher write
- Evidence: Migration recreates parent_accesses_via_parent for ALL when p.teacher_id = auth.uid() OR parent_on_taught_class(p.id) OR is_school_admin(). Co-teachers can SELECT/INSERT/DELETE invite tokens for parents of taught students.
- Recommendation: Acceptable for shared-class parent invite UX; keep monitoring so token reads/mints stay limited to taught-class parents and are not logged. No change required for Q11 acceptance.
- Status: open

### sign-in-handle rate limit is in-memory only (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041a7-9a17-7481-aa89-be1c58da6b3c`
- Request: Q10 login_identifier anon oracle
- Evidence: supabase/functions/sign-in-handle/index.ts keeps attempts in a process-local Map (WINDOW_MS/MAX_ATTEMPTS). Deno isolates and cold starts do not share that map, so the 30/15min cap is not durable under multi-instance or restart.
- Recommendation: If password spraying against handles becomes a concern, back the limiter with a shared store (DB/KV) or lean on Auth/WAF limits; email harvest is already closed without a durable limiter.
- Status: open

### Q10 tests are static source assertions only (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041a7-9a17-7481-aa89-be1c58da6b3c`
- Request: Q10 login_identifier anon oracle
- Evidence: src/lib/auth/loginIdentifier.security.test.ts only regex-checks migration SQL, client sources, Edge source, and config.toml; it does not exercise a live anon RPC deny or an Edge round-trip.
- Recommendation: Optional follow-up: add an integration check that anon rpc('login_identifier') fails after the migration and that sign-in-handle returns tokens without an email field.
- Status: open

### In-memory Edge rate limit is soft; timing can still hint username existence (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041a7-9a17-7481-aa89-be1c58da6b3c`
- Request: Q10 login_identifier anon oracle
- Evidence: supabase/functions/sign-in-handle/index.ts keeps attempts in a process-local Map (30 / 15 min per IP|handle) and returns early on RPC miss before Auth bcrypt, so cold starts, multi-isolate fan-out, and response-time differences can still suggest whether a handle resolves. Responses never include the looked-up email.
- Recommendation: Prefer a durable shared limiter (DB/Redis) and optionally a constant-time path (always perform a password grant, including against a dummy when lookup misses) if username-existence resistance must match email-oracle closure.
- Status: open

### Client types still declare login_identifier RPC (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041a7-9a17-7481-aa89-be1c58da6b3c`
- Request: Q10 login_identifier anon oracle
- Evidence: src/lib/supabase/types.ts still lists login_identifier while runtime execute is service_role-only after the migration.
- Recommendation: Optionally drop or narrow the generated client RPC typing in a later types refresh so new client code is less likely to call a dead oracle path.
- Status: open

### also_administrator still gets school-wide profile SELECT via can_message (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0419d-a8da-7742-8390-46ed1c5950ac`
- Request: Q9 profiles_read
- Evidence: New profiles_read includes `public.can_message(auth.uid(), id)`. In 20260819000003_message_directory.sql, can_message treats `also_administrator` as from_admin and returns true for every same-school profile. is_school_admin() / isOfficeRole do not include also_administrator, so a teacher JWT with that hat can still `select * from profiles` for the whole school—same peer set message_directory already exposes.
- Recommendation: Acceptable for Q9 given messaging semantics and unchanged message_directory. If table SELECT must be office-only for school-wide dumps, narrow the policy later so school-wide listing is is_school_admin only and keep can_message/shares_message_thread for targeted hydrate.
- Status: open

### Security coverage is static SQL/string assertions only (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0419d-a8da-7742-8390-46ed1c5950ac`
- Request: Q9 profiles_read
- Evidence: profilesRead.security.test.ts asserts migration text and call-site strings; it does not exercise live RLS as distinct JWTs (student/parent/teacher/office).
- Recommendation: Optional follow-up: add a DB-backed RLS smoke test with role JWTs once the migration is applied to aohibokgilxhqwmupdfv.
- Status: open

### Security tests are SQL string assertions only (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0419d-a8da-7742-8390-46ed1c5950ac`
- Request: Q9 profiles_read
- Evidence: src/lib/school/profilesRead.security.test.ts asserts migration text and call-site source patterns; it does not exercise live JWTs against SELECT on public.profiles.
- Recommendation: Optional later: add a live RLS fixture proving a student/parent JWT cannot SELECT an unrelated same-school profile while self and thread co-member reads succeed.
- Status: open

### Allowed peers still receive full profile rows (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0419d-a8da-7742-8390-46ed1c5950ac`
- Request: Q9 profiles_read
- Evidence: profiles_read permits SELECT of entire profiles rows for can_message / shares_message_thread peers; call sites use select('*') (e.g. src/lib/messages/api.ts listPeopleByIds). Same full-row exposure already exists via message_directory security definer.
- Recommendation: If column minimization is desired later, project display fields for hydrate paths; out of scope for Q9.
- Status: open


### Parent/student UI still gates family-link chrome with isAdminRole (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0418e-822e-7232-be5a-5a07d85eff0e`
- Request: Q8 Ask link_parent_student OR-bypass
- Evidence: src/app/class/[id]/parent/[parentId].tsx sets canLinkChildren = isAdminRole(profile) and shows Add child; src/app/class/[id]/student/[studentId].tsx sets canLinkParents = isAdminRole(profile). isAdminRole is true for also_administrator teachers while isOfficeRole is false. After migration 20260826000007, those clicks fail at admin_set_parent_link / can_link_parent_student.
- Recommendation: Switch Add child / Add parent family-link chrome to isOfficeRole (or accounts.link_parent office seat) so also_administrator teachers do not see actions that the RPC now denies. Out of Q8 Ask-hole scope; track as follow-up.
- Status: open

### Ask create_parent still accepts student_id and calls linkChild (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0418e-822e-7232-be5a-5a07d85eff0e`
- Request: Q8 Ask link_parent_student OR-bypass
- Evidence: src/lib/ai/askTools.ts create_parent (capability parents.invite) resolves student_id/student_name and passes studentId into createParent(); src/lib/parents/api.ts createParent then awaits linkChild(). Teachers keep the tool via parents.invite; after the office-only RPC they cannot mint the family row, but the tool description still says it can link a child and a failed link can leave a newly inserted parent without the child.
- Recommendation: For non-office Ask contexts, omit student link args from create_parent or skip linkChild unless isOfficeRole; keep add_parent_to_class for class attach only.
- Status: open

### parent_students_own RLS still allows teacher-owned direct inserts (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0418e-822e-7232-be5a-5a07d85eff0e`
- Request: Q8 Ask link_parent_student OR-bypass
- Evidence: supabase/migrations/20260816000000_people_photos_delete.sql policy parent_students_own permits insert when the caller owns both parent and student teacher_id rows. linkChild no longer uses that path (rpc-only), but a raw client insert remains possible for teachers who own both cards. Pre-existing; not the Ask OR-bypass.
- Recommendation: Later tighten parent_students write policies so family identity inserts go only through admin_set_parent_link / is_school_admin, without breaking legitimate teacher reads.
- Status: open

### Q8 security tests are mostly source/string assertions (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0418e-822e-7232-be5a-5a07d85eff0e`
- Request: Q8 Ask link_parent_student OR-bypass
- Evidence: src/lib/ai/linkParentStudent.security.test.ts checks isOfficeRole hats and string-matches allowed()/run()/migration/prompt text; it does not call askToolsFor() with a teacher AskToolContext to assert link_parent_student is absent from defs/names at runtime.
- Recommendation: Optional follow-up: runtime askToolsFor(teacher) / askToolsFor(teacher+also_administrator) asserting link_parent_student absent and add_parent_to_class present.
- Status: open

### Residual parent_students_own RLS still allows teacher inserts (P2)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0418e-822e-7232-be5a-5a07d85eff0e`
- Request: Q8 Ask link_parent_student OR-bypass
- Evidence: supabase/migrations/20260816000000_people_photos_delete.sql still defines parent_students_own FOR ALL when the caller owns both parents.teacher_id and students.teacher_id. linkChild no longer uses that path, but a teacher JWT can still PostgREST-insert parent_students for rows they own. Q8 closed the Ask/linkChild/RPC hole only; this policy was not changed.
- Recommendation: In a later migration (not Q8 scope), drop insert/update from parent_students_own or restrict minting to is_school_admin / admin_set_parent_link so teachers cannot mint family identity outside the office RPC.
- Status: open

### Add-child chrome still uses isAdminRole (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a0418e-822e-7232-be5a-5a07d85eff0e`
- Request: Q8 Ask link_parent_student OR-bypass
- Evidence: src/app/class/[id]/parent/[parentId].tsx and student/[studentId].tsx gate Add child / link UI with isAdminRole (includes also_administrator). After 20260826000007, those clicks fail at admin_set_parent_link — fail-closed, not a mint.
- Recommendation: Later UX pass: gate Add-child chrome on isOfficeRole so also_administrator teachers do not see a dead control.
- Status: open


### Q7 regression tests are mostly source-shape assertions (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a04183-243d-74f0-b452-2a65b9674b77`
- Request: Q7 teacher Ask create_class
- Evidence: createClass.security.test.ts proves allowed()/run()/matrix/RPC text order and isOfficeRole(teacher) false, but does not call askToolsFor() with a teacher AskToolContext to assert create_class is absent from names/defs.
- Recommendation: Optional follow-up: add a small behavioral unit test that builds askToolsFor({ profile: { role: 'teacher' }, ... }) and asserts !names.includes('create_class'), plus office profile includes it.
- Status: open

### create_class Ask gate coverage is mostly source-shape assertions (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a04183-243d-74f0-b452-2a65b9674b77`
- Request: Q7 teacher Ask create_class
- Evidence: src/lib/classes/createClass.security.test.ts asserts isOfficeRole for Jacquee-like profiles and string-matches allowed()/run() in askTools.ts, but does not call askToolsFor() with a teacher profile to assert create_class is absent from defs/names at runtime.
- Recommendation: Optional follow-up: add a small runtime unit that builds askToolsFor for role=teacher (and teacher+also_administrator) and asserts create_class is not advertised and run() returns the office-only error.
- Status: open


### Sibling not-in-class RPCs still school-dump to any staff (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a04177-fc7b-7863-b35c-bb0e8ce207c4`
- Request: Q6 school_*_for_link dumps
- Evidence: supabase/migrations/20260818000010_class_directory.sql school_students_not_in_class / school_parents_not_in_class still gate on is_staff_profile + my_school_id. listAvailableStudents still calls school_students_not_in_class. Explicitly out of Q6 scope.
- Recommendation: Track a follow-up to tighten those RPCs the same way (office school-scoped or taught-class only); do not reopen Q6 for it.
- Status: open

### Teacher-owned unlinked parents drop out of listParentsForLinking (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a04177-fc7b-7863-b35c-bb0e8ce207c4`
- Request: Q6 school_*_for_link dumps
- Evidence: school_parents_for_link teacher branch is only parent_on_taught_class; security test asserts absence of p.teacher_id = auth.uid(). listParentsForLinking → loadAllParentRows trusts empty RPC success. Class directory still restores own cards via fillAvailableWithOwnParents; student-page openAddParent uses listParentsForLinking only.
- Recommendation: If product needs the student-page existing-parent picker to include teacher-owned cards with no taught-class link yet, merge listParentsForTeacher into that UI path only—do not widen the RPC.
- Status: open

### Q6 security tests are static SQL/source matching only (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a04177-fc7b-7863-b35c-bb0e8ce207c4`
- Request: Q6 school_*_for_link dumps
- Evidence: src/lib/parents/schoolLinkDirectories.security.test.ts reads migration/api source and asserts regexes; no live PostgREST teacher-vs-office privilege exercise.
- Recommendation: Acceptable for this fix. Optionally add a DB-backed smoke later if a safe CI role exists.
- Status: open


### Authenticated callers can distinguish missing vs unauthorized parent ids (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a0416d-3f52-7592-b803-24c37604f08a`
- Request: Q5 get_parent_card staff PII
- Evidence: supabase/migrations/20260826000005_tighten_get_parent_card.sql loads the row and raises 'not found' before the allowed check; denied callers then get 'not allowed'. The prior function denied non-staff before the existence check.
- Recommendation: Raise a single 'not allowed' (or identical not-found) for both missing and unauthorized ids after authz, so student/parent JWTs cannot enumerate parent UUID existence.
- Status: open

### Office direct parents SELECT remains school-unscoped via parents_admin_all (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a0416d-3f52-7592-b803-24c37604f08a`
- Request: Q5 get_parent_card staff PII
- Evidence: getParent() still does from('parents').select('*') first; parents_admin_all (school_roles migration) allows is_school_admin() with no school predicate, so office can still read a cross-school parent row without hitting the tightened RPC.
- Recommendation: Track as a later office RLS harden (not Q5 RPC scope): scope parents_admin_all to my_school_id / same-school parent linkage so getParent() cannot bypass the school wall.
- Status: open


### Ask image allowlist is duplicated in three places (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a0410e-85f5-7943-9ed8-870cc061fdde`
- Request: Q4 ask-assistant JWT + hydrateAskImages SSRF
- Evidence: Identical logic lives in supabase/functions/_shared/askImageUrl.ts, scripts/lib/ask-image-url.mjs, and src/lib/ai/askImageUrl.ts (tests only for the src copy).
- Recommendation: Keep one shared definition or add a drift check so Edge and ai:dev cannot diverge.
- Status: open

### ai:dev image prep still follows redirects after allowlist (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a0410e-85f5-7943-9ed8-870cc061fdde`
- Request: Q4 ask-assistant JWT + hydrateAskImages SSRF
- Evidence: Edge hydrateAskImages uses fetch(..., { redirect: 'error' }); ai-dev hydrateAskImages calls prepareImageForGrok → loadImageForGrok which fetch(imageUrl) with default redirect following.
- Recommendation: Pass redirect: 'error' (or re-validate Location host) in loadImageForGrok when used from Ask hydration.
- Status: open

### ai:dev image fetch still follows redirects after allowlist (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a0410e-85f5-7943-9ed8-870cc061fdde`
- Request: Q4 ask-assistant JWT + hydrateAskImages SSRF
- Evidence: Edge hydrateAskImages uses fetch(..., { redirect: 'error' }), but ai-dev hydrateAskImages calls prepareImageForGrok → loadImageForGrok → fetch(imageUrl) with default redirect following.
- Recommendation: Pass redirect: 'error' (or manual no-follow) in loadImageForGrok for ask hydration parity with Edge; allowlisted Supabase object GETs do not redirect in normal operation.
- Status: open

### Unreachable non-office navigate branch after create (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040cd-ce0d-7613-934b-0f583e001e55`
- Request: Q3 teachers must not create classes
- Evidence: UI gates Create with isOfficeRole, but onCreate still has else router.replace('/?switch=1').
- Recommendation: Drop the else and always navigate to /admin/class/[id] after office create.
- Status: open

### Remote create_school_class stays staff-open until migration is applied (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040cd-ce0d-7613-934b-0f583e001e55`
- Request: Q3 teachers must not create classes
- Evidence: Prior definition in supabase/migrations/20260819000008_class_teachers_office.sql still authorizes via is_staff_profile (teachers). New 20260826000004_office_only_create_school_class.sql correctly requires is_school_admin() but was intentionally not applied by Build. Until CoS applies it to aohibokgilxhqwmupdfv, a teacher JWT can still call create_school_class directly and mint an unassigned class.
- Recommendation: Apply supabase/migrations/20260826000004_office_only_create_school_class.sql to project aohibokgilxhqwmupdfv before treating the live hole as closed.
- Status: fixed (SQL applied 2026-08-26 by CoS)

### Security regression test is static SQL matching only (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040bc-aa36-7ea3-9a90-40c8714967d0`
- Request: Q2 SQL apply retry (drop pinned_at grant)
- Evidence: src/lib/messages/threadMembersUpdate.security.test.ts reads the migration file and asserts regexes; it does not exercise live PostgREST/Postgres privileges after apply.
- Recommendation: Acceptable for this fix. Optionally add a DB-backed privilege smoke test later if a safe CI role exists.
- Status: open

### Q13 — Setup/README still Slice 01 (P2)
- Source: Kelyra QA (2026-08-22 schema/UI)
- Evidence: Setup/README apply only Slice 01; about 58 migrations skipped; docs still sell join codes.
- Recommendation: Bring setup docs in line with the current migration set. Stop documenting join codes if they are not the product path.
- Status: open

### Q14 — `/admin/matrix` UI is cosmetic (P2)
- Source: Kelyra QA (2026-08-22 schema/UI)
- Evidence: Matrix `can()` is unused in the UI except Ask. Grants look real and do not gate the screens.
- Recommendation: Either wire `can()` into the screens that show the matrix, or stop presenting it as live permission UI.
- Status: open

### Q15 — Stale `active_class_id` after class switch (P2)
- Source: Kelyra QA (2026-08-22 schema/UI)
- Evidence: `setActiveClass` writes the DB, but Capture / Inbox / header keep the previous `active_class_id`.
- Recommendation: After a class switch, those surfaces must read the new active class (invalidate or refetch). No silent writes to the old class.
- Status: open

### Q16 — Alert detail `onOpenWork` is a no-op (P2)
- Source: Kelyra QA (2026-08-22 schema/UI)
- Evidence: Alert detail work opener does not navigate or open the work.
- Recommendation: Make `onOpenWork` open the related work item, or remove the control if it is not in MVP.
- Status: open

### Q17 — iPhone extra `<` when swipe already pops (P2)
- Source: Kelyra QA / Chuck (2026-08-23 iPhone)
- Evidence: Edge swipe already goes back on pushed screens. AppHeader `<` duplicates that. Do not treat this as “restore interactive-pop.”
- Recommendation: Hide the extra iPhone `<` when swipe can pop. Keep `<` on web and where swipe cannot pop. Held prompt is in `notes/grok-build-queue.md` under Q17.
- Status: open

### teachers_own RLS still allows self-INSERT into teachers (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040a5-a12b-7f62-b29b-0df7c7c8abd6`
- Request: Q1 public signup / handle_new_user teacher provision
- Evidence: supabase/migrations/20260812000000_slice01_foundation.sql policy teachers_own for all using/with check (id = auth.uid()). App no longer inserts, but a client with a raw auth session can still PostgREST-insert public.teachers for auth.uid(). Adjacent to held Q12.
- Recommendation: Restrict teachers INSERT to security-definer office/claim paths (drop or narrow teachers_own write), without weakening other RLS. Track with Q12.
- Status: open

### ensureTeacherProfile name implies minting (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040a5-a12b-7f62-b29b-0df7c7c8abd6`
- Request: Q1 public signup / handle_new_user teacher provision
- Evidence: src/lib/auth/api.ts ensureTeacherProfile only selects and returns existing|null; comment says never inserts.
- Recommendation: Rename to loadTeacherProfile (or similar) in a follow-up to match fail-closed behavior.
- Status: open

### Update fail-closed migration not yet live (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040bc-aa36-7ea3-9a90-40c8714967d0`
- Request: Q2 thread_members insert hole QA + security
- Evidence: 20260826000002 is applied on project aohibokgilxhqwmupdfv; 20260826000003 is only in the tree. Until CoS applies it, table-level UPDATE from 000002 still allows PATCH of thread_id under the old self_update policy.
- Recommendation: Apply supabase/migrations/20260826000003_fail_closed_thread_members_update.sql to the same Supabase project, then confirm authenticated UPDATE on thread_id/profile_id fails while last_read_at update still succeeds. Do not rewrite 000002.
- Status: fixed (SQL applied 2026-08-26 by CoS; pinned_at grant removed first)

### UPDATE lockdown not live until CoS applies 000003 (P2)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040bc-aa36-7ea3-9a90-40c8714967d0`
- Request: Q2 thread_members insert hole QA + security
- Evidence: 20260826000002 is applied; 20260826000003 exists only in the tree (revoke + column UPDATE + tightened WITH CHECK). Until applied, live authenticated clients retain table-level UPDATE from 000002 and can PATCH thread_id.
- Recommendation: Chief of Staff should apply supabase/migrations/20260826000003_fail_closed_thread_members_update.sql to project aohibokgilxhqwmupdfv; do not rewrite 000002.
- Status: fixed (SQL applied 2026-08-26 by CoS; pinned_at grant removed first)

### Security regression test is static SQL-string only (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040bc-aa36-7ea3-9a90-40c8714967d0`
- Request: Q2 thread_members insert hole QA + security
- Evidence: src/lib/messages/threadMembersUpdate.security.test.ts asserts migration file contents with regex; it does not exercise PostgREST/Postgres privileges.
- Recommendation: Acceptable for this session (no live PostgREST). Optional later: add a DB-backed privilege smoke test if a safe CI role exists.
- Status: open

### Security regression test is static SQL string matching only (P3)
- Source: kelyra-qa-loop (2026-08-26)
- Session: `01a040bc-aa36-7ea3-9a90-40c8714967d0`
- Request: Q2 thread_members insert hole QA + security
- Evidence: src/lib/messages/threadMembersUpdate.security.test.ts reads migration files and asserts regexes; it does not exercise PostgREST/Postgres privileges.
- Recommendation: Optional later: add an integration check that authenticated INSERT and thread_id UPDATE fail while last_read_at UPDATE as self succeeds.
- Status: open

### Brand placement assertion lives in a fail-closed provision security test file (P3)
- Source: kelyra-qa-loop (2026-08-29)
- Session: `01a05041-9af1-7321-9126-05df3135a7e5`
- Workflow: `wf_01a050420d0f7c838fb3ed027db21177`
- Request: Add full-color KelyraMark above the text wordmark on /sign-in
- Evidence: src/lib/auth/failClosedTeacherProvision.security.test.ts adds test('sign-in: full-color KelyraMark above text wordmark (no tint)') beside Q12 teacher-provision assertions; the check itself only reads sign-in.tsx / KelyraMark.tsx source text.
- Recommendation: Optional later: move the branding source check to a sign-in UI/regression test file so security tests stay focused on authz/provision invariants.
- Status: open

### Landing tests are static source assertions only (P3)
- Source: kelyra-qa-loop (2026-08-29)
- Session: `01a050eb-3d80-7ac3-9185-e907b6e319b8`
- Request: Splash MP4 landing (CEO request 2026-08-29)
- Evidence: splashLanding.test.ts checks index/SplashLanding source strings, asset existence, and that sign-in.tsx still has KelyraMark — it does not exercise runtime orientation switching or expo-av playback.
- Recommendation: Acceptable for this request; optional follow-up could assert exported splashSources keys or a thin orientation helper if logic grows.
- Status: open (partially improved 2026-08-30 — now asserts ownedVideo cleanup + splashAspectForSize; still no runtime expo-av orientation harness)


### ownedVideo is captured after async audio setup, not at effect start (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a0510a-322e-70b0-b2d9-7aedbc897fa7`
- Request: Fix splash orientation black-out (CEO 2026-08-30)
- Evidence: SplashLanding.tsx assigns ownedVideo = videoRef.current only after await enableSplashAudioMode(), guarded by if (cancelled) return. Early blur/unmount before that assignment skips pause/unload (ownedVideo still null). Orientation remount is still safe because cancelled is checked before capture and cleanup never uses videoRef.current.
- Recommendation: Optionally capture ownedVideo synchronously at effect entry (or via a layout/ref callback) so blur cleanup always owns the instance; not required for the orientation black-out fix.
- Status: open

### Cancelled tryPlayUnmuted can still setAwaitingGesture(true) (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a0510a-322e-70b0-b2d9-7aedbc897fa7`
- Request: Fix splash orientation black-out (CEO 2026-08-30)
- Evidence: tryPlayUnmuted's catch calls setAwaitingGesture(true) with no cancelled check. After an orientation swap, a stale failing play on the unloaded prior instance can flip awaitingGesture after the new effect reset, briefly forcing isMuted={true} until the new play path clears it.
- Recommendation: Pass a cancelled/isActive guard into tryPlayUnmuted (or ignore setState when cancelled) so orientation cleanup cannot leave a stale muted/awaiting-gesture state.
- Status: open

### Mid-playback orientation remounts Video and replays (P2)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05119-659e-7cc0-a30d-e1594df5dec0`
- Request: Splash last-frame still + no replay on rotate + shared login hero (CEO 2026-08-30 OOB)
- Evidence: SplashLanding.tsx mounts Video with key={sourceKey} and useFocusEffect depends on sourceKey while hasCompletedSplash is false, so a rotate before didJustFinish unloads and starts the other-aspect MP4 again. Acceptance and guidance only require no replay after first completion.
- Recommendation: If product wants zero replay even mid-animation, on sourceKey change before finish switch to the matching still (or keep a single Video without remounting) instead of remounting with shouldPlay.
- Status: open

### Possible brief first-frame flash at finish before Image swap (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05119-659e-7cc0-a30d-e1594df5dec0`
- Request: Splash last-frame still + no replay on rotate + shared login hero (CEO 2026-08-30 OOB)
- Evidence: Completion path is markCompleted on didJustFinish then a ternary that replaces Video with Image; there is no pre-mounted still overlay. Some platforms snap Video to frame 0 at end before React paints the Image.
- Recommendation: Optionally keep an Image overlay of stillSource under/over Video and reveal it on finish so the last frame never blanks.
- Status: fixed
- Note: Addressed 2026-08-30 by T38 `01a05153-6ac8-7ef2-a0c8-4964692f2d78` — CEO JPG still is always mounted under video; hold no longer depends on last decoded frame or a post-finish Image swap.


## Fixed

### Stale splashBrand still comment (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05133-5656-7502-917a-5b387d7909f5`
- Workflow: `wf_01a051339ba37230a9320575f0bc43ec`
- Request: Fix splash ending on black (CEO 2026-08-30)
- Evidence: src/components/ui/splashBrand.ts still documents splashStillSources as "Second-to-last / non-black end-frame stills", but assets and SplashLanding/tests treat them as peak frame 52.
- Recommendation: Update the comment to say peak neon stills (frame 52 / SPLASH_PEAK_RATIO) so future edits do not re-extract fade-to-black end frames.
- Status: fixed
- Note: Fixed 2026-08-30 by T36 kelyra-qa-loop `01a0513e-280e-7a30-a6db-7b1b45feb94d`. splashBrand.ts now documents last frame of original splash (full neon wordmark hold). Peak-frame-52 wording is obsolete.

### Stale "last-frame/final-frame" wording in tests (P3)
- Source: kelyra-qa-loop (2026-08-30)
- Session: `01a05125-1595-7560-b49f-2299dd5be62c`
- Workflow: `wf_01a05125679a71709a7c4f8db57f84df`
- Request: Unified splash auth screen (CEO 2026-08-30)
- Evidence: splashLanding.test.ts still titles a case "last-frame still"; failClosedTeacherProvision.security.test.ts says "final-frame still"; splashBrand.ts correctly documents second-to-last / non-black stills and the PNGs show the neon wordmark.
- Recommendation: Rename those test titles/comments to second-to-last / non-black end-frame so they match the CEO asset requirement.
- Status: fixed
- Note: Fixed/superseded 2026-08-30 by T36. CEO correction: hold still IS original last frame 76. last-frame wording is now correct.


### Orientation switch may unload the newly mounted video (P2)
- Source: kelyra-qa-loop (2026-08-29)
- Session: `01a050eb-3d80-7ac3-9185-e907b6e319b8`
- Request: Splash MP4 landing (CEO request 2026-08-29) / Fix splash orientation black-out (CEO 2026-08-30)
- Evidence: SplashLanding.tsx keys Video on sourceKey and also puts sourceKey in useFocusEffect deps. On rotate/resize, React remounts Video first, then the prior effect cleanup runs against videoRef.current (now the new instance) and calls unloadAsync before the new effect’s playAsync.
- Fix: Cleanup captures `ownedVideo` and only pause/unload that instance; never `videoRef.current` after a keyed remount. Aspect helper `splashAspectForSize` extracted; last-frame lock on didJustFinish.
- Status: fixed (2026-08-30)

### Web muted autoplay fallback can be undone by isMuted={false} on re-render (P2)
- Source: kelyra-qa-loop (2026-08-29)
- Session: `01a050fa-d1b5-7390-80b3-8e13daa4c7d7`
- Request: Splash fix play once + audio + neon CTA (CEO 2026-08-29) / Fix splash orientation black-out (CEO 2026-08-30)
- Evidence: SplashLanding kept Video isMuted={false} while setAwaitingGesture(true) then setIsMutedAsync(true)+playAsync for web autoplay fallback; expo-av reapplied props.status.isMuted on every render.
- Fix: Drive mute from state via `isMuted={awaitingGesture}` so the muted autoplay fallback is not clobbered on re-render.
- Status: fixed (2026-08-30)

### didJustFinish only sets a ref; no explicit last-frame lock (P3)
- Source: kelyra-qa-loop (2026-08-29)
- Session: `01a050fa-d1b5-7390-80b3-8e13daa4c7d7`
- Request: Splash fix play once + audio + neon CTA (CEO 2026-08-29) / Fix splash orientation black-out (CEO 2026-08-30)
- Evidence: onPlaybackStatusUpdate only set finishedRef when didJustFinish.
- Fix: On didJustFinish, pauseAsync and setPositionAsync(duration - 1) to hold the final frame.
- Status: fixed (2026-08-30)

## Not this list

- Q1–Q12: P0/P1 security and overreach. Still HOLD on `notes/grok-build-queue.md`. Do not burn leftover credits on those unless Chuck names them.
- Q18 / Q19: QA test plans, not product bugs.
- L1 / U3: already sent to Grok Build.
- A1–A4, U1–U2: Agent / UX HOLD, not Kelyra QA findings.
