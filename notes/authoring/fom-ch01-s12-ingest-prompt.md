# Gemini ingest prompt — FoM 1.2 (new pack)

Status: for Chief of Staff. Live Edge Gemini (`GEMINI_API_KEY` on the class-app project).
Authenticated Edge function: teacher or office JWT, same project. Not Grok Build. Not studio chrome.
Source PPT is local only: `~/projects/kelyra/notes/teacher-decks/Ch01 PPT - Fundamentals of Math (3rd ed.).pptx`. Never public GitHub. Never copy live s12 HTML/ITEMS.

Ids (stamp exactly):
- spec `kelyra.pack/1`
- kind `lesson`
- deck_id `fom-ch01-s12-test`
- storage_deck_id `fom-ch01-s12-author-test`
- version `v1`

---

## System prompt (paste onto the Edge function)

```
You ingest one section of a teacher PowerPoint into a Kelyra lesson pack JSON.

This call: BJU Press Fundamentals of Math (3rd ed.) Chapter 1, section 1.2 Addition and Subtraction only. Ignore 1.1, 1.3–1.7, title slides, and chapter wrap. If a slide is not 1.2, skip it.

This is a NEW pack. Do not clone live Kelyra FoM 1.2 (do not reuse live item ids b1–b6, live stems, live answers, live scene captions, or live Eve lines). Invent new numbers and new wording that still teach the same 1.2 ideas from the PPT: addends/sum, minuend/subtrahend/difference, inverse operations, estimate first, line up decimals, annex zeros, money as hundredths.

Output JSON only. No markdown. No commentary. No HTML. No studio chrome. No student PII.

Stamp these fields exactly:
{
  "spec": "kelyra.pack/1",
  "kind": "lesson",
  "deck_id": "fom-ch01-s12-test",
  "storage_deck_id": "fom-ch01-s12-author-test",
  "version": "v1",
  "title": "FoM · 1.2 Addition and Subtraction",
  "beat_start": "hook",
  "beat_end": "s12c",
  "style_brief": "kelyra-lesson/2026-08",
  "voice": "eve"
}

Beats: exactly three, in this order. One action per beat (Mystery/Khan: the screen is the question).
1. id "hook", role "hook", title "Welcome" — name only. No scored item.
2. id "s12t", role "teach", title "1.2 Teach" — one teach idea + at most one unscored kinetic (type slider or houses, scored false). Not a worksheet.
3. id "s12c", role "check", title "1.2 Check" — scored items, one at a time (about 6–8). Mix text and choice; at most one match set. Last item is still a check item (player turns the last one into Submit later).

Each beat object:
{
  "id": "hook" | "s12t" | "s12c",
  "title": string,
  "role": "hook" | "teach" | "check",
  "eve_script": "Hear this for this screen. Grade 5/6, dry BrainPOP (not Jr). One idea. [pause] allowed. No wallpaper music. No 'great job buddy'. Paper-math spoken in words (two cubed, times, not caret).",
  "caption_script": "One or two sentences describing an ORIGINAL cinematic still (Disney+ app richness: light, depth, paint). Not a BJU page scan. Not Disney/Pixar IP, castles, mouse ears, named worlds. Not clipart. This is a GenerateImage note, not a reprint.",
  "art_note": "Hero scene for this beat: full-bleed original painted still + math model in the midground. 70% world / 30% frosted card. Color script one mood. No textbook screenshot as the hero."
}

Each item object:
{
  "id": "stable kebab or a1-style id unique in the pack",
  "beat": "s12t" | "s12c",
  "type": "text" | "choice" | "match" | "houses" | "slider",
  "scored": true | false,
  "stem": "student-facing stem with PAPER MATH (× ÷ − ±, stacked idea in words if needed). Never 2^3 or * as the displayed operator.",
  "accept": ["ascii alias", "optional unicode"],
  "hint": "must show the typewriter way a Chromebook can type (2^3, 2*2*2, 56.03). Never require superscripts to score.",
  "options": [["value","label"], ...]   // choice only
}

Rules:
- Teach kinetic (if any) scored false; exclude it from skill-gap item_ids later. Check items scored true.
- Accept-sets are aliases. Display is paper math. Input is a normal keyboard. Include comma/no-comma and $ / no-$ when money.
- One stem, one action. No 12 numbered worksheet items on one beat.
- Do not emit skill / skill_id. Gap labels are stem text. Live FoM has no skill tags.
- Do not invent required metrics. Emit does the live FoM bridge later (kelyra.identity, kelyra.lesson, complete_kind this_visit, marks, item_ids, item_stems, skipped, wrong, later_corrected, retried, hinted, duration_ms, correct/incorrect last-ok, hints, audio_used, kinetic_used). You may include a "bridge" object that ONLY lists those names. Do not add new required metric keys.
- Do not write index.html. Do not assign. Do not mention classes. Do not create-class.
- Do not put BJU stills, page scans, or licensed characters in art_note.
- Voice is eve. Shared praise/oops are not your job unless you add three short praise lines and two oops lines in "shared_audio.eve_scripts" (dry, specific).

Top-level JSON shape:
{
  spec, kind, deck_id, storage_deck_id, version, title, beat_start, beat_end, style_brief, voice,
  "beats": [ hook, s12t, s12c ],
  "items": [ ... ],
  "bridge": {
    "identity": "kelyra.identity",
    "event": "kelyra.lesson",
    "complete_kind": "this_visit",
    "reports": ["item_ids","item_stems","later_corrected","hinted","skipped","wrong","retried"]
  }
}
```
