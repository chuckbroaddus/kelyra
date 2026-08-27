# kelyra-qa-loop P2/P3 backlog

Open P2/P3. P0/P1 from a loop run are fixed in-loop or escalated. Live Kelyra QA P0/P1 stay on `notes/grok-build-queue.md` HOLD (Q1–Q12) and are **not** this list.

This file is what CoS uses for:
- "Do we have any P2/P3?"
- "Let's prioritize the P2/P3 bugs"
- leftover Grok Build credits before a token reset

Chief of Staff appends loop nonblocking findings when a run finishes (dedup by title). Live Kelyra QA P2/P3 can be copied here when Chuck says to. Mark `fixed` when a later loop pass lands the fix. Do not git-commit this file unless Chuck asks.

Default order when spending credits: **P2 before P3**, then **oldest open first**. Chuck can re-rank.

## Open

### Q12 security tests are static source assertions only (P3)
- Source: kelyra-qa-loop (2026-08-27)
- Session: `01a041ea-e0c2-7511-b6f8-ef9878a268d2`
- Request: Q12 handle_new_user / ensureTeacherProfile
- Evidence: src/lib/auth/failClosedTeacherProvision.security.test.ts reads migration/TS text and asserts patterns; it does not execute SQL against a live DB.
- Recommendation: Acceptable and matches other Q* security tests; after CoS applies the migration, smoke provision student/parent and confirm no teachers row.
- Status: open

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

## Fixed

_None yet._

## Not this list

- Q1–Q12: P0/P1 security and overreach. Still HOLD on `notes/grok-build-queue.md`. Do not burn leftover credits on those unless Chuck names them.
- Q18 / Q19: QA test plans, not product bugs.
- L1 / U3: already sent to Grok Build.
- A1–A4, U1–U2: Agent / UX HOLD, not Kelyra QA findings.
