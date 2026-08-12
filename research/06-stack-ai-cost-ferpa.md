# Cost-effective stack, AI set, and FERPA for Kelyra (2026)

**Status:** Partial  
**Date:** 2026-08-12  
**Query:** Cost-effective AI and technical stack for a hybrid mobile + web teacher app. Primary inputs: voice, camera, short natural language. Must support sparse student records that grow over time, AI homework-gap analysis, personalized practice, a practical grade book, and simple parent/student incentives. Minimal AI set with realistic monthly costs for one teacher with 50–100 students. FERPA considerations.

## Executive takeaway

A 2026 Kelyra build should stay on **one web-native client (Expo or Capacitor)**, hosted Postgres with `jsonb` for sparse student records, a **OneRoster-style grade book**, free push via Firebase Cloud Messaging, and **a single multimodal model** for voice, photos, gap analysis, and practice generation. Public 2026 API pricing in this pass landed on Gemini 3.5 Flash-Lite as the cheapest one-vendor multimodal meter.

No inspected 2026 classroom product is one SKU that photographs homework, files incomplete records, finds individual skill gaps, writes personalized practice, and keeps a grade book; those steps sit in separate tools, and voice-note matching is roster-plus-spoken-name rather than vision or OCR. [S17]

For one teacher with 50–100 students, platform cost can be **$0** on Expo Free plus Supabase Free, or about **$25/month** if the database must not pause, plus Apple’s **$99/year** and Google’s one-time **$25**. AI then tracks one token meter rather than a stack of speech, OCR, and LLM vendors. FERPA treats student names, work, grades, and notes as education-record PII, so either obtain consent, keep vendors under the school-official exception, or strip all identifiers before any uncontrolled model call.

## Hybrid client

Capacitor and Expo both give one modern web/TypeScript codebase that runs in the browser and in native iOS/Android shells, with a first-party camera that works on devices and on the web (PWA camera UI or a file picker). [S1] Expo’s EAS Free plan is $0/month for a solo developer (15 Android and 15 iOS builds, updates to 1K MAUs, 100,000 hosting requests/month and 1 GB storage); Starter is $19/month plus usage. [S2] Flutter can compile one Dart codebase to the same three targets, but its web guide is a poor fit for the text-rich, document-centric screens Kelyra needs for reports and exercise authoring. [S3]

On voice, first-party Expo Speech is text-to-speech only. Short-phrase speech-to-text is documented for Flutter via `speech_to_text` on Android, iOS, and web; Android setup requires `INTERNET` because recognition may use remote services. [S4] For durable offline capture, use SQLite: Expo SQLite persists a queryable database across restarts on Android/iOS (web support is still alpha), and Capacitor should not treat WebView LocalStorage or IndexedDB as durable—those stores can be evicted, Preferences is only for small data, and large offline data needs SQLite. [S5] App-store fees do not depend on the client stack: Apple Developer Program membership is 99 USD per year; Google Play Console registration is a one-time US$25. [S6]

## Records, grade book, and incentives

Store sparse, incrementally growing student metadata as optional JSON keys in PostgreSQL `jsonb` alongside relational tables, with GIN indexes on key existence and containment. [S7] Model the grade book as a relational OneRoster Gradebook service—`lineItems`, results, categories, and score scales—separate from rostering, with each Result keyed to a student and a line item. [S8]

Supabase hosts that Postgres together with Auth, Storage, Edge Functions, and Realtime at $0 (500 MB database, 1 GB files, 50,000 MAU; projects pause after one week of inactivity) or Pro from $25/month (8 GB disk, 100 GB files, 100,000 MAU; never pauses). [S9] Firebase Cloud Messaging delivers iOS, Android, and web push at no per-message charge on Spark and Blaze. [S10] Weekly automated parent texts about missed assignments, grades, and absences are a documented low-variable-cost incentive: one study sent over 32,000 messages at a $63 variable cost and reported 27% fewer course failures and 12% higher class attendance. [S11]

## Minimal AI set and unit costs

Do not add dedicated speech, OCR, and LLM vendors unless a later volume or accuracy need appears. One paid multimodal API covering text, image, video, and audio can transcribe natively (Gemini 3.5 Flash-Lite: 32 tokens per second). Dedicated 2026 speech-to-text is metered per minute at several times that audio-input rate; raw OCR is cheap per page, while structured form/custom extractors are the expensive outlier; OpenAI nano/mini undercut Claude for analysis and practice generation.

| Tool | Role | Rate |
|---|---|---|
| Gemini 3.5 Flash-Lite | Multimodal in/out (incl. thinking) | $0.30 / 1M input, $2.50 / 1M output [S12] |
| Gemini audio on Flash-Lite | Native transcription / audio understanding | ~$0.000576 / min input, before output [S13] |
| OpenAI gpt-4o-mini-transcribe | Dedicated STT | $0.003 / min [S14] |
| OpenAI gpt-transcribe | Dedicated STT | $0.0045 / min |
| OpenAI Whisper / gpt-4o-transcribe | Dedicated STT | $0.006 / min |
| Google Speech-to-Text V2 Standard | Dedicated STT | $0.016 / min (first 500,000 min) |
| Google Speech-to-Text V2 Dynamic Batch | Dedicated STT | $0.003 / min |
| Amazon Textract Detect Document Text | Raw OCR (first 1M pages, US West Oregon) | $0.0015 / page [S15] |
| Google Document AI Enterprise Document OCR | Raw OCR | $1.50 / 1,000 pages after 1,000 free |
| Google Document AI Form Parser / Custom extractor | Structured OCR | $30 / 1,000 pages |
| OpenAI gpt-5-nano | Analysis / practice generation | $0.05 / $0.40 per 1M in/out [S16] |
| OpenAI gpt-5-mini | Analysis / practice generation | $0.25 / $2.00 per 1M in/out |
| Claude Haiku 4.5 | Analysis / practice (vision: ~$1.30 / 1,000 1000×1000 images) | $1 / $5 per 1M tokens |
| Claude Sonnet 5 | Analysis / practice | $2 / $10 per 1M tokens |

For this class size, keep the app on one cheap multimodal model (Flash-Lite in this pricing pass, or gpt-5-nano if the workload is text-only). Optional teacher-priced classroom SKUs are adjacent products, not a substitute for Kelyra’s pipeline: ChatGPT for Teachers is currently free for verified U.S. K–12 teachers through June 2028; MagicSchool is Free or Plus at $8.33/user/month billed annually; CoGrader is Starter free or Standard at $15/month billed annually. [S20]

A packaged monthly AI bill for 50–100 students is **not published**. Any classroom total requires unpublished assumptions about pages, audio minutes, and tokens per student.

## FERPA

Signed, dated written consent is required before a school discloses PII from education records unless a § 99.31 exception applies. Student names are PII; student work, grades, and notes are education records if they are directly related to a student and maintained by the school or a party acting for it. [S18] FERPA does not require a written vendor contract for the school-official exception, but schools typically establish the required “direct control” through a signed contract or terms of service that restrict unauthorized use; PII received under the exception may be used only for the disclosed educational purpose and may not be sold or reused for other purposes. [S19]

ChatGPT for Teachers’ Teacher Access Terms incorporate OpenAI’s Student Data Privacy Agreement, which designates OpenAI as a FERPA school official under the customer’s direct control and limits Student Data use to providing the services. [S20] MagicSchool Free/Plus and CoGrader Starter/Standard publicly claim FERPA compliance, and MagicSchool states it acts as a FERPA school official; MagicSchool’s public plan matrix lists a Custom Data Privacy Agreement only on Enterprise, not on Free or Plus. [S21] FERPA also allows release without consent after all PII is removed if the school reasonably determines the student is not identifiable. Related redaction (anonymized submissions to a model; not retaining underlying student work after a task) avoids a FERPA disclosure only if identifying information never reaches an uncontrolled third party. [S22]

## Implications for Kelyra

1. **One TypeScript client.** Expo or Capacitor, not Flutter, because reports and exercise authoring are document-heavy web screens. Camera is first-party. Offline capture = SQLite, not LocalStorage.
2. **Postgres + `jsonb` for sparse metadata.** Relational roster + OneRoster `lineItems` / results for the grade book. Do not put grades in the JSON blob.
3. **Supabase Free until it pauses; Pro at $25/month for always-on.** FCM for push ($0/message). Parent SMS is evidence-backed but needs A2P 10DLC; do not treat it as free.
4. **One multimodal model, not STT + OCR + LLM.** Dedicated extractors ($30/1k pages) are the cost trap. Add them only if handwritten IEP/roster fields fail.
5. **FERPA is a product path, not a checkbox.** Consent, school-official + direct-control DPA, or strip all identifiers. A lone teacher’s click-through may not bind the school. Paid Gemini/OpenAI tiers claim no training on content; free tiers often do.
6. **Teacher SKUs (MagicSchool, CoGrader, ChatGPT for Teachers) are not the stack.** They are adjacent products. Kelyra still needs its own capture → record → plan → grade book loop.

## Rough monthly envelope (one teacher, 50–100 students)

| Line | Free / early | Always-on |
|---|---|---|
| Client builds (Expo EAS) | $0 | $19 Starter if build limits bite |
| Backend (Supabase) | $0 (pauses after 1 idle week) | $25 Pro |
| Push (FCM) | $0 | $0 |
| App stores | amortized ~$8/month (Apple $99/yr) + $25 once (Play) | same |
| AI (one multimodal API) | usage-metered; no published classroom total | same |
| Parent SMS (optional) | not free; A2P 10DLC + per-segment carrier fees | same |

## Sources

- [S1] Capacitor Documentation (v8) and Camera Plugin API — https://capacitorjs.com/docs
- [S2] Expo Application Services pricing — https://expo.dev/pricing
- [S3] Web support for Flutter — https://docs.flutter.dev/platform-integration/web
- [S4] Expo Speech — https://docs.expo.dev/versions/latest/sdk/speech/
- [S5] Expo SQLite — https://docs.expo.dev/versions/latest/sdk/sqlite/
- [S6] Choosing a Membership - Apple Developer — https://developer.apple.com/support/compare-memberships/
- [S7] PostgreSQL 18 Documentation: 8.14. JSON Types — https://www.postgresql.org/docs/current/datatype-json.html
- [S8] IMS OneRoster Gradebook Service Version 1.2 — https://www.imsglobal.org/spec/oneroster/v1p2/gradebook/info
- [S9] Supabase Pricing — https://supabase.com/pricing
- [S10] Firebase Cloud Messaging — https://firebase.google.com/products/cloud-messaging
- [S11] Bergman & Chan, Leveraging Parents through Low-Cost Technology — https://jhr.uwpress.org/content/early/2019/07/02/jhr.56.1.1118-9837R1
- [S12] Gemini Developer API pricing — https://ai.google.dev/gemini-api/docs/pricing
- [S13] Audio understanding | Gemini API — https://ai.google.dev/gemini-api/docs/audio
- [S14] Pricing | OpenAI API — https://developers.openai.com/api/docs/pricing
- [S15] Document AI pricing | Google Cloud — https://cloud.google.com/products/document-ai/pricing
- [S16] Pricing - Claude Platform Docs — https://platform.claude.com/docs/en/about-claude/pricing
- [S17] Local: `research/03-camera-extract-match-gradebook.md` (cross-checked against `research/02-ad-hoc-student-metadata.md`)
- [S18] 34 CFR § 99.30 — https://www.law.cornell.edu/cfr/text/34/99.30
- [S19] PTAC, Protecting Student Privacy While Using Online Educational Services (Feb 2014) — https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Student%20Privacy%20and%20Online%20Educational%20Services%20%28February%202014%29_0.pdf
- [S20] OpenAI Student Data Privacy Agreement — https://cdn.openai.com/osa/openai-sdpa.pdf
- [S21] MagicSchool Pricing & Plans — https://www.magicschool.ai/pricing
- [S22] 34 CFR § 99.31(b) — https://www.law.cornell.edu/cfr/text/34/99.31

## Coverage and uncertainty

- No inspected 2026 primary page ranks Capacitor, Expo, Flutter, or a PWA as the single most cost-effective stack for this product shape.
- Labor cost (usually dominant) is unpublished; secondary $25K–$60K MVP quotes were not used as findings.
- Whether platform speech APIs stay on-device is unsettled; Expo has no official STT module.
- Expo SQLite on web is officially alpha.
- No packaged monthly infrastructure or AI bill exists for 50–100 students; photo/voice volume, tokens, and SMS cadence dominate any real total.
- Supabase Free auto-pauses after one week; always-on notifications need Pro or another host.
- US A2P 10DLC approval is not guaranteed; unregistered Twilio traffic incurs extra carrier fees not priced on a live account.
- Gemini paid tier says content is not used to improve products; the free tier is. Education/FERPA fitness of consumer Gemini, OpenAI, and Claude APIs was not independently verified.
- Multimodal LLMs can read text in images but are not pretrained IEP/roster/homework field extractors.
- Accuracy of LLM vision on handwritten homework, spoken-name matching in noise, and generated-practice quality were not evaluated.
- No ED document certifies that any named 2026 AI vendor tier satisfies school-official or direct-control requirements.
- A lone teacher’s ChatGPT-for-Teachers click-through may not bind the school.
- MagicSchool lists a custom DPA only on Enterprise. Consumer ChatGPT terms expressly do not apply as school-official instruments.
- OpenAI pages disagree on the ChatGPT for Teachers free-period end date (June 2027 vs June 2028).

### Claims dropped at verification

- Twilio Sole Proprietor Brand registration is $4.50 after the Aug 1, 2025 TCR increase, not $4.
- FERPA school-official is not the only nonconsensual disclosure path; studies, directory information, authorized representatives, transfer, and health/safety also exist.
