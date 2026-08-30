Kelyra — implement publish_lesson_pack Edge hook. This hole only.

Chuck signed the Author product-design + author-kelyra-interface on 2026-08-27. The class-app contract is notes/authoring/publish-lesson-pack.md (also kelyra-author/docs/publish-lesson-pack.md). Read that file and implement it. Do not reopen signed auth/FoM/ids. Do not invent a second player, Ask tool, public bucket, or published=true flip.

Product: an authenticated Edge function so a Kelyra teacher or office JWT can upload a lesson pack into private Storage + unpublished lesson_packs. Author is not stuck on a laptop service-role key. Assign stays assignLesson. Students never list the bucket.

Already true (do not redo / do not break):
- lesson_packs SELECT for taught teachers only. No authenticated INSERT/UPDATE/DELETE. Seed / service role only (20260824000001_lesson_assignments.sql).
- Bucket lessons is private. No storage.objects policies. lesson-host reads after a short-lived lesson JWT from student_open_lesson.
- Catalog row never stores a URL. Students have no SELECT on the catalog.
- listLessonPacks filters published=true in src/lib/lessons/api.ts. loadPackSlice / assignLesson do NOT require published. Keep it that way: do not add a published=true filter on assign.
- lesson_packs.published SQL default is true. Omitting the column on INSERT would list the pack. This RPC must always write published: false explicitly.
- lesson_packs has no school_id. A later published=true flip is instance-wide; not this hook.
- scripts/upload-lesson.mjs already writes objects with service role and skips png-original / ava-original / eve-staging. Mirror skip + x-upsert for the prefix. Do not require the laptop key for the teacher path.
- Role names live in supabase/functions/_shared/askToolPolicy.ts (teacher, also_teacher, superintendent, administrator). is_staff is the wrong gate.

Do this:
1. New Edge function supabase/functions/publish-lesson-pack/index.ts. Register [functions.publish-lesson-pack] verify_jwt = true in supabase/config.toml. CORS like student-open-lesson (OPTIONS 204).
2. Caller JWT is the actor. Service role (SUPABASE_SERVICE_ROLE_KEY) writes Storage + upserts lesson_packs only. Never return the service-role key. Never client insert() on lesson_packs.
3. Authz: allow role=teacher OR also_teacher OR superintendent OR administrator. Parent/student/anon = 401. Do NOT require class_teachers. Do NOT use is_staff_profile / is_staff as the gate (that includes teacher and is the wrong name; office is not in class_teachers).
4. Request: Authorization user JWT. Multipart or zip+JSON sidecar. Fields: deck_id, version, storage_deck_id, title, beat_start, beat_end, kind, files. Slug charset ^[A-Za-z0-9][A-Za-z0-9._-]*$ for the three ids and version. kind must be lesson. Required files: index.html AND manifest.json. Skip backup dirs (png-original, ava-original, eve-staging, captions/ava-original). published is NOT a caller field.
5. manifest.json min: spec kelyra.pack/1, kind lesson, deck_id, version, storage_deck_id, beat_start, beat_end, items[{id,stem}]. Manifest ids/kind/beat window must match the request. Class app may ignore the file at Open.
6. Quota: 12,304,812 bytes is a hard 413, not a warning, not a target. Count uploaded bytes after skipping backups.
7. Shared-folder lock: if another lesson_packs row already uses this storage_deck_id+version with a different deck_id, refuse the teacher (409). Slicing a shared folder is office JWT AND replace_live: true only.
8. Protect live FoM: refuse to write lessons/fom-ch01/v4/ or upsert deck_id in {fom-ch01, fom-ch01-s11, fom-ch01-s12, and other live fom-ch01-s* ids} unless office JWT AND explicit replace_live: true. Teachers cannot replace live FoM. Round-trip ids are deck_id=fom-ch01-s11-test, storage_deck_id=fom-ch01-author-test, version v4 or v1.
9. Writes: put objects at {storage_deck_id}/{version}/ in bucket lessons (path on disk is lessons/{storage_deck_id}/{version}/) with x-upsert true for that prefix only. After puts, delete any object still under that version prefix that was not in this request (replace-prefix). Upsert lesson_packs on unique (deck_id, version): title, published: false (column always present), storage_deck_id, beat_start, beat_end, kind if the column exists. Never omit published. Do not touch assignments, submissions, or student tables. Do not add storage.objects policies.
10. 200 body: {ok:true, deck_id, version, storage_deck_id, beat_start, beat_end, title, published:false, bytes}. Errors: 401 unsigned/wrong seat, 400 bad slug / missing index.html or manifest.json / kind not lesson, 409 live FoM or shared-folder lock, 413 over size, 502 storage write failed.
11. Optional small client helper that calls the function with the signed-in user JWT (no service role). Not an Ask tool. Not assign. Not a published flip.
12. Static security tests: teacher/office allowed, parent/student denied, published:false always in the upsert payload, quota 413, live FoM refuse without replace_live, no storage.objects policy added, assignLesson/listLessonPacks published filter unchanged (picker true, assign not).

Out of scope: syllabus/gradebook, studio UI, marketplace, kind=quiz, office catalog SELECT, published=true, deploying the function, applying SQL. If a migration is truly required, put it under supabase/migrations/ and do not apply it (Chief of Staff applies). Do not supabase functions deploy (Chief of Staff deploys).

Preserve unrelated uncommitted work. Do not git reset, checkout, restore, clean, stash, commit, or push.

Done when:
- Function exists, config.toml registered, verify_jwt true.
- Teacher or office JWT can publish unpublished; parent/student cannot.
- published is always false in the write.
- Live FoM path/ids refuse without office+replace_live.
- Over 12,304,812 bytes is 413.
- Typecheck + security tests pass.
- Nothing committed, pushed, or deployed.
