# Kelyra agent notes

Product and architecture live in `docs/`. Do not invent features past the tightened MVP.

- Vision: `docs/vision.md`
- MVP + flows: `docs/mvp.md`
- Data model: `docs/data-model.md`
- Stack: `docs/architecture.md`

Rules:

- Phone captures; web reviews, assigns, and grades.
- Model keys stay server-side. Local development uses Grok CLI OAuth (`npm run ai:dev` + `~/.grok/auth.json`). Production Edge Functions use `XAI_API_KEY`. Never `EXPO_PUBLIC_*` tokens.
- A capture may have `student_id` null. The matcher never inserts a student.
- Nothing is a grade until the teacher Approves.
