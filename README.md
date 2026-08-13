# Kelyra

A hybrid mobile + web tool for one K-12 teacher. Speak a note or photograph student work; Kelyra files it on the right record, drafts skill gaps, and assigns a short practice set. Phone captures. Web reviews, assigns, and keeps a simple grade book.

This repo is the **MVP foundation**. Slice 01 (typed roster) is the first real slice — see [docs/slice-01.md](docs/slice-01.md). Camera, matching, and gaps are not built yet.

Product docs: [docs/vision.md](docs/vision.md) · [docs/mvp.md](docs/mvp.md) · [docs/data-model.md](docs/data-model.md) · [docs/architecture.md](docs/architecture.md)

## Requirements

- Node 20+ (22 is fine)
- npm 10+
- [Expo Go](https://expo.dev/go) on a phone, or a browser for web
- A [Supabase](https://supabase.com) project (when you are ready to persist data)
- An [xAI](https://console.x.ai) API key for later AI work (Edge Function secret only)

## Setup (Slice 01)

Follow the click-by-click guide: **[docs/setup.md](docs/setup.md)**.

Short version:

```bash
cd /Users/chuck/projects/kelyra
npm install
cp .env.example .env
```

1. Create a Supabase project.
2. Turn **off** Authentication → Email → Confirm email.
3. Run `supabase/migrations/20260812000000_slice01_foundation.sql` in the SQL Editor.
4. Put Project URL + anon key in `.env`.
5. `npm run web` → http://localhost:8081

Typecheck: `npm run typecheck`

## Folder structure

```
kelyra/
├── docs/                         Vision, MVP, data model, architecture
├── research/                     Competitive and stack notes
├── notes/                        Scratch
├── assets/images/                App icon and splash
├── src/
│   ├── app/                      Expo Router screens (placeholders)
│   │   ├── capture.tsx           Phone: voice + camera
│   │   ├── inbox.tsx             Unassigned + drafts
│   │   ├── class/[id]/           Web: class, student, grade book, assign
│   │   ├── join.tsx              Student class link
│   │   └── parent.tsx            Parent invite view
│   ├── components/
│   ├── constants/
│   └── lib/
│       ├── supabase/             Anon client only
│       └── ai/                   Adapter *types* only
├── supabase/
│   ├── migrations/               Empty — schema not created yet
│   └── functions/
│       ├── _shared/ai.ts         Server adapter stub
│       ├── transcribe/
│       ├── match-and-analyze/
│       └── generate-practice/
├── .env.example
├── app.json
├── eas.json
└── package.json
```

## Rules that the code must keep

- Model keys stay on the server.
- A capture may have no student. The matcher never inserts a student.
- Nothing is a grade until the teacher Approves.
