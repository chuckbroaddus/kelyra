# Kelyra

A hybrid mobile + web tool for one K-12 teacher. Speak a note or photograph student work; Kelyra files it on the right record, drafts skill gaps, and assigns a short practice set. Phone captures. Web reviews, assigns, and keeps a simple grade book.

This repo is the **MVP foundation** (Expo + Supabase placeholders). Features are not implemented yet.

Product docs: [docs/vision.md](docs/vision.md) · [docs/mvp.md](docs/mvp.md) · [docs/data-model.md](docs/data-model.md) · [docs/architecture.md](docs/architecture.md)

## Requirements

- Node 20+ (22 is fine)
- npm 10+
- [Expo Go](https://expo.dev/go) on a phone, or a browser for web
- A [Supabase](https://supabase.com) project (when you are ready to persist data)
- An [xAI](https://console.x.ai) API key for later AI work (Edge Function secret only)

## Setup

```bash
git clone <this-repo>
cd kelyra
npm install
cp .env.example .env
# Edit .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Run the app:

```bash
npm run web      # teacher web (grade book / assign)
npm start        # QR code for Expo Go (capture on phone)
npm run ios      # simulator, if Xcode is installed
npm run android  # emulator, if Android Studio is installed
```

Typecheck:

```bash
npm run typecheck
```

### Supabase (later)

1. Create a project in the Supabase dashboard.
2. `npx supabase login` and `npx supabase link --project-ref <ref>`
3. Put the URL and anon key in `.env` (see `.env.example`).
4. Set `XAI_API_KEY` as an Edge Function secret — never `EXPO_PUBLIC_*`.
5. Migrations will implement [docs/data-model.md](docs/data-model.md). None are applied yet.

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
