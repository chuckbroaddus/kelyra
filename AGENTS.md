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
- **Icons:** never invent View-stroke glyphs for chrome. Add or change a recipe in `scripts/build-icons.mjs`, run `npm run icons` (writes `assets/icons/*.png` + `src/components/ui/iconAssets.ts`). Each PNG is cropped to ink, then uniformly scaled so the longest axis fills the same square. `Icon` / `Icon.web` render those assets with tint. New names go on `IconName` too. Full-color brand marks live in `assets/brand/` and render without tint (`KelyraMark`). Do not run them through the white-ink pipeline. School logos go through `cutout-logo` then a local circular punch (`punchSchoolLogo` on web). Grok says whether the mark is a disk; we flood the plate from the edges and clip to the inscribed circle (r ≤ 0.5) so square-photo corners cannot stay. Re-upload the logo after changing the cutter.
