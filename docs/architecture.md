# Kelyra technical architecture (MVP)

**Date:** 2026-08-12  
**Maps to:** `docs/vision.md`, `docs/mvp.md`, `docs/data-model.md`  
**Goal:** One teacher, 50–100 students. Ship the capture → file → gap → practice → grade loop fast. Do not build a district platform.

---

## 1. Overall architecture

One TypeScript client. One hosted backend. One server-side AI adapter. No custom Kubernetes, no SIS bus, no offline sync.

```
  Phone (Expo)                    Browser (same Expo web app)
  ────────────                    ──────────────────────────
  camera, mic, inbox              student page, Approve,
                                  generate/assign, grade book,
                                  parent invite
              \                    /
               \                  /
                →  Supabase  ←
                   • Auth (teacher, parent magic link, student class-code session)
                   • Postgres (data-model.md)
                   • Storage (private photos + audio)
                   • Edge Functions (only place API keys live)
                          │
                          ▼
                   AI adapter (server)
                   • transcribe(audio)
                   • readImage(photo)      — roster names, homework
                   • matchName(transcript, roster)
                   • draftGaps(photo, hint)
                   • generatePractice(skill, context)
                          │
                          ▼
                   SpaceXAI (xAI) by default
                   grok-4.6 (vision + JSON drafts)
                   Grok Voice STT (transcripts)
```

**Request path (homework photo)**

1. App uploads photo (and optional audio) to a **private** Storage bucket via a signed path.
2. App inserts a `captures` row with `student_id` null, `status = unassigned`.
3. Edge Function: STT if audio exists → matcher against that class’s enrollments → set `guessed_student_id`. High confidence may auto-attach; otherwise inbox.
4. Once `student_id` is set and `kind = homework`, Edge Function sends the image + short schema to the model. Writes `model_draft`, `skill_gaps` (`draft`), `status = draft`.
5. Teacher Approves on the web: RLS update. Trigger/function writes `assignments` + `submissions` (`approved`). Student/parent still cannot read drafts.

**What never happens**

- Model keys or OAuth tokens in the Expo bundle.
- Client calling the LLM with the full roster of legal names + raw IEP photos.
- Auto-insert of a student from a guessed name.
- Auto-publish of a draft score.

---

## 2. Recommended stack

| Layer | Choice | Role |
|---|---|---|
| **Frontend** | **Expo (React Native + Expo Router)** targeting iOS, Android, and web | One codebase. `expo-camera`, `expo-av` (or `expo-audio`) for capture. Web gets the same routes with a denser layout for grade book / assign. |
| **UI** | React Native Paper or Tamagui — pick one and stop | Fast, not a design system project. |
| **Backend** | **Supabase** | Auth, Postgres, Storage, Edge Functions, RLS. No separate Nest/Rails app in v1. |
| **Database** | **Postgres 15+** on Supabase | Schema from `docs/data-model.md`. Relational grade book. `students.metadata jsonb` unused in UI. |
| **Auth** | Supabase Auth | Teacher: email + magic link or password. Parent: magic link on invite. Student: class `join_code` + pick roster name → signed session with `student_id` claim (custom token or a thin Edge Function). |
| **Storage** | Supabase Storage (private buckets) | `photos/`, `audio/`. Signed URLs, short TTL. Not public. |
| **AI** | **SpaceXAI (xAI)** behind a 5-method adapter | Default: **grok-4.6** for image understanding, gap JSON, practice JSON. **Grok Voice STT** for transcripts. Local dev: Grok CLI OAuth (`npm run ai:dev`, tokens in `~/.grok/auth.json`). Production: `XAI_API_KEY` only in Edge Function secrets. |
| **AI fallback (not wired until needed)** | Gemini 3.5 Flash-Lite | Cheapest published all-in-one meter in `research/06`. Swap inside the adapter if handwriting or cost fails. Do **not** add Document AI / Textract in v1. |
| **Email** | Resend or Postmark | Parent invite link. Not SMS. |
| **Push** | Skip in v1 | Inbox is pull. FCM only when weekly email/SMS appears. |
| **Hosting / builds** | Expo EAS + Supabase cloud | EAS Free until build limits bite. |
| **Stores** | Apple Developer $99/yr, Play $25 once | Needed for a real camera/mic app. Web-only is fine for the first internal week. |

**Repo shape (when we scaffold)**

```
src/
  app/                 Expo Router (capture, inbox, student, gradebook)
  lib/supabase/
  lib/ai/              adapter types only; implementation is Edge Function
supabase/
  migrations/
  functions/
    transcribe/
    match-and-analyze/
    generate-practice/
```

---

## 3. Why this fits the MVP

- **Hybrid without two apps.** Mobile is shutter + mic. Web is the same project with CSS that prefers tables. Flutter web is a poor fit for a grade book. Next.js + a separate native app doubles the work.
- **Speed.** Auth, files, and Postgres are one vendor. RLS encodes “teacher sees class / parent sees one child / student sees assigned to-do.” Matches the publication gate in the data model.
- **Low cost.** Free tiers cover a solo teacher until the project must stay awake ($25 Pro). No dedicated STT + OCR + LLM bill.
- **Image + speech + analysis in two API families, one vendor.** grok-4.6 accepts JPEG/PNG and returns structured drafts. Voice STT is the transcript step. An adapter keeps Gemini (cheaper multimodal) one function swap away.
- **FERPA-aware enough for an individual-teacher MVP.** Keys server-side. Paid API, no training on prompts. Private buckets. Prompts get class first names or opaque codes, not SIS IDs or IEP text. Approve is the only publish. We do **not** claim district school-official status without a DPA.
- **Simplicity over scale.** One region, one teacher, online-only. No CRDT, no offline SQLite, no SIS worker.

---

## 4. Estimated monthly cost (light usage)

Assumptions: 1 teacher, ~30 students, ~5 homework photos/day, ~15 short voice notes/day, ~20 practice generations/month, web + TestFlight. Not a full school.

| Line | Light / early | Always-on (recommended once parents exist) |
|---|---|---|
| Expo EAS | $0 | $0–$19 |
| Supabase | $0 (pauses after 1 idle week) | **$25 Pro** |
| Storage + DB | inside plan | inside $25 |
| SpaceXAI (STT + vision + drafts) | **~$3–15** | **~$8–25** |
| Email invites | < $1 | < $1 |
| App stores | ~$8 amortized (Apple) | same |
| SMS / FCM | $0 (not in MVP) | $0 |
| **Total** | **~$5–25** if you accept pause | **~$35–55** comfortable |

App stores are $99/year + $25 once, not monthly. A photo-heavy month (every paper, every child, every day) can push AI above $25 — put a visible meter and a monthly cap in the teacher settings.

Gemini Flash-Lite as the adapter backend would likely sit at the low end of the AI range; grok-4.6 buys vision quality and one vendor at a higher token price.

---

## 5. Key technical risks

1. **Handwriting and class-list photos.** grok-4.6 vision is documented for images; it is not a pretrained roster/IEP extractor. Confirm-every-name is mandatory. If list extraction is junk, fall back to voice/type add.
2. **Spoken-name match in a noisy room.** STT + string/LLM match against a 30-name list. Nicknames and two Mayas will fail. Unassigned must work or data is lost.
3. **No official Expo STT.** Audio always goes to the network. Capture dies offline (accepted for v1).
4. **Expo web quality.** Grade book on RN-web can be clunky. If it hurts, extract only the web shell to Next.js later — do not start with two clients.
5. **Supabase Free pause.** Parent invite links and draft analysis break if the project sleeps. Budget Pro as soon as anyone but the teacher depends on the app.
6. **FERPA posture is soft.** Teacher click-through ≠ school DPA. Do not send full IEP pages to the model. Do not use a free consumer endpoint.
7. **AI cost and quality unmetered.** No published classroom bill. Instrument tokens per capture on day one.
8. **Student auth is homemade.** Class code + pick-your-name is guessable. Good enough for one classroom; not for a district. Rate-limit and rotate `join_code`.

---

## Build order (engineering)

1. Supabase project, migrations from `data-model.md`, teacher auth, one class, typed add-student.
2. Expo camera + audio upload → `captures` Unassigned.
3. Edge Function: STT + match + homework draft.
4. Web Approve + simple grade book.
5. Generate practice + student class-link to-do.
6. Parent invite.
