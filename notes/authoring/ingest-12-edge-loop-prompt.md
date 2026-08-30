Kelyra — authenticated Edge Gemini ingest for a NEW FoM 1.2 pack JSON. This hole only.

Chuck signed Author product-design + package-spec first slice 3: ingest the local BJU Ch1 PPT targeting 1.2 as a *new* pack, only after 1.1 round-tripped (it has). Do not reopen signed publish/FoM/ids. Do not clone live fom-ch01-s12. Do not build studio chrome. Do not emit index.html in this hole. Do not assign. Do not git commit or push.

Product: a teacher or office JWT calls a new Edge function. Live GEMINI_API_KEY (already on this project) proposes beats + Eve scripts + accept-sets as JSON. Author generation credits wallet is later; this trial meters through existing Edge callMetered. Not Edge XAI (that key is off). Local ai:dev stays Grok and is out of this hole.

Read and use the system prompt in notes/authoring/fom-ch01-s12-ingest-prompt.md (inside the fenced System prompt). Stamp exactly:
- spec=kelyra.pack/1
- kind=lesson
- deck_id=fom-ch01-s12-test
- storage_deck_id=fom-ch01-s12-author-test
- version=v1
- title=FoM · 1.2 Addition and Subtraction
- beat_start=hook
- beat_end=s12c
- style_brief=kelyra-lesson/2026-08
- voice=eve

Live gold to NOT copy: lesson_packs fom-ch01-s12 / v4 / storage fom-ch01, beat_start s12t, beat_end s12c. Do not reuse live item ids b1–b6 or live stems.

Do this:
1. New Edge function supabase/functions/ingest-lesson-pack/index.ts. Register [functions.ingest-lesson-pack] verify_jwt = true in supabase/config.toml. CORS like publish-lesson-pack / ask-assistant (OPTIONS 204).
2. Authz: same as publish-lesson-pack. Caller JWT. Allow role=teacher OR also_teacher OR superintendent OR administrator. Parent/student/anon = 401. Not is_staff. Not class_teachers-required. getUser via user client. Never service-role as the actor. Never return the service-role key.
3. Body: JSON or multipart. Accept slide images (input_image / files) and/or text extracted from the PPT. Do NOT require a raw .pptx (Gemini will not parse Office XML). Cap: refuse a ridiculous image count; 1.2 only, not the whole chapter. Keep well under Edge body limits.
4. Call existing callMetered with job 'lesson-outline' (already in AiJob). Prefer GEMINI_API_KEY path already in _shared/ai.ts. System prompt = the ingest prompt file. Response JSON only. Parse/validate stamps + three beats hook/s12t/s12c + items[].stem. 400 if Gemini returns markdown or missing stamps.
5. Do not write Storage. Do not upsert lesson_packs. Do not GenerateImage stills. Do not TTS. JSON draft only.
6. Client helper optional: src/lib/lessons/ingestLessonPack.ts that POSTs with the signed-in user JWT (no service role). Tests that do not need a live Gemini call: authz source assertions, verify_jwt, stamp constants, job name, pptx not required.
7. If AiJob / src/lib/ai/policy.ts / scripts/lib/ai-policy.mjs must stay in sync to add nothing — lesson-outline already exists. Do not invent a new required metric. Do not add a new AiJob unless lesson-outline cannot be used; if you must add, sync all three policy files.

Out of scope: Author CLI, packing index.html, publish-lesson-pack changes, TTS, stills, Lesson QA screenshots, syllabus, git commit/push, deploying (Chief of Staff deploys). Do not edit ~/projects/kelyra-author.

Preserve unrelated uncommitted work (including src/components/ui/LessonWebView.web.tsx cross-origin guard). Do not git reset, checkout, restore, clean, stash, commit, or push.
If SQL is needed, put a full migration under supabase/migrations/ and do not apply it (Chief of Staff applies). Unlikely this hole needs SQL.

Orchestrator: launch kelyra-qa-loop with this full request. Do not implement in the parent. Keep this turn open until the run is terminal. Children must never call ask_user_question.

Done when: typecheck passes, source tests pass, function is in the tree with verify_jwt true, nothing committed or pushed, no BJU media added to git.
