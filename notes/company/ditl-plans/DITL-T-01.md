# DITL-T-01 — Teacher Capture morning (BATCH-v1 UPDATE)

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-01 |
| Title | Teacher morning: roster-ready class, phone capture + BATCH-v1 web stack ingest alternate, Unassigned, Pack B keyed confirm+Approve |
| Primary hat | teacher |
| Other hats | none |
| Support | SUPPORTED M1–M4 capture/match/inbox; KEYGRADE Pack B phone confirm+Approve (CEO #4); BATCH-v1 class-stack web path (CE-A · SR-A · phone-gate · PR-A · NA-A) |
| Regression tags | `auth`, `capture`, `matcher`, `inbox`, `approve`, `keygrade`, `chrome-teacher`, `mobile`, `ask-dual`, `batch-ingest` |
| KEYGRADE | Pack B — contextual inline confirm + phone Approve on Capture review (`keygrade-phone-approve-options.md`; IQG `t_91db8376`) |
| BATCH | Web Upload class stack → Split Review (required) → captures → Inbox/Needs; phone = status / “open on computer” (not primary Split Review). PM lock CE-A SR-A phone-gate PR-A NA-A. Intent §9 UPDATE_PLANS. |

## Goal / story

Before/during morning blocks, the teacher uses phone chrome: confirms active class, captures exit-ticket photos with spoken names, handles a no-match Unassigned, skims Needs for drafts. For **keyed captures** (assignment has key): on Capture review, does **Pack B** per-item confirm (contextual bottom sheet) and taps **Approve this capture** on phone — publishes `approved_score` (CEO #4). Web Approve remains a valid alternate (T-02), not exclusive. Unassigned / matcher laws unchanged (matcher never INSERT). Signs out or leaves session cleanly.

**BATCH-v1 alternate (additive):** On **web** (Chromebook/Mac/Windows), teacher uses **Upload class stack** (CE-A: Capture overflow / Capture stack mode; quiet Needs empty-state link). Binds **exactly one class** before file accept. Completes **Split Review** at least once (SR-A: filmstrip + packets; split/merge/blank/reorder; Confirm disabled if 0 packets). Confirm → packets become captures (unnamed → Inbox / `student_id` null; named/attached later via NA-A Inbox only — no name UI in Split Review). Never auto-Approve; never invent student; never send whole-class PDF to model. **Phone gate honesty (SR-A + phone gate):** phone entry/status may show progress / “Open Kelyra on a computer to split this scan” / optional single-PDF TUS start then waiting-to-split — **not** primary Split Review on 4″; no fake folder watch.

## Preconditions / fixtures

- Teacher login; ≥1 class with roster (≥3 students including similar names if possible).
- `active_class_id` set; second class optional for multiplicity.
- Camera/mic permissions; network on.
- Empty or seeded Unassigned for contrast.
- **BATCH:** web browser ≥ tablet/desktop width preferred for Split Review; synthetic PDFs under `notes/qa-fixtures/batch-ingest/` (no real student names): e.g. `F-ART-BATCH-MATH-25P.pdf` (25×1), duplex-blanks, two-PDF, oversized/encrypted for soft-warn / hard-fail beats if exercised.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in teacher | `/sign-in` |
| 2 | Confirm tray **Desk · Capture · Needs · Class · Ask** (5; no Ride; **no** sixth tray tab for batch) | Teacher tray |
| 3 | Desk / class home: active class visible | `/` or `/class/{id}` |
| 4 | If needed: Class setup glance roster | `/class/{id}/setup` |
| 5 | Tray **Capture** | `/capture` |
| 6 | Photo + speak name → high-confidence file to student | `/capture` |
| 7 | Photo + ambiguous/no name → Unassigned | `/capture` |
| 8 | Voice-only observation note on named student | `/capture` |
| 9 | **Reverse:** discard/cancel a capture before save if UI allows | `/capture` |
| 10 | Needs/Inbox: see Unassigned + draft-ready items | `/inbox` |
| 11 | Assign Unassigned item to correct student (one tap file); matcher never INSERT | `/inbox` |
| 12 | **Keyed capture — Pack B confirm:** open Capture review carousel; per-item contextual bottom sheet (MC/numeric); twins confirm if shown; one-tap **Confirm & next** | `/capture` review |
| 13 | **Keyed capture — Pack B phone Approve:** tap **Approve this capture** on same review screen; confirm `approved_score` published; Teach seat only | `/capture` review |
| 14 | Optional: leave a non-keyed draft without Approve (Approve still not required for non-keyed inbox skim) | `/inbox` |
| 15 | Optional class switch: capture goes to active class only | class switcher / Desk |
| 16 | **BATCH-v1 alternate (web stack):** From Capture (CE-A) open **Upload class stack**; bind one class; upload fixture PDF(s); set N; enter **Split Review** (required even if count = roster×N); split/merge/blank as needed; Confirm → packets land as captures in Inbox/Needs (no auto-Approve) | web Capture / batch upload · Split Review |
| 17 | **BATCH phone gate honesty:** On phone, stack entry shows status / “open on computer for split” (or waiting after optional single-file share) — does **not** claim primary Split Review on phone | phone Capture / status |
| 18 | Optional: cancel batch before Confirm → no captures from that staged stack | Split Review / Cancel |
| 19 | Sign out | hamburger |

## Lifecycle

Sign-in → capture loop → inbox triage (file Unassigned) → **Pack B confirm → phone Approve** for keyed captures → sign-out. Web Approve (T-02) is alternate, not required for the phone keyed path.

**BATCH alternate entry:** Sign-in (web) → Upload class stack (class bound) → Split Review → Confirm → same captures/Inbox/Needs pipeline → (Approve later on T-01 Pack B or T-02 web). Phone may only hand off / show status (“open on computer”).

## Multiplicity

Multiple captures; optional two classes — active class isolation. Matcher never inserts student. Twins / same first name: Pack B confirm UI; never auto-pick.

**BATCH:** multi-PDF upload; variable pages via **manual** split only; parallel batches allowed per PM (each class-bound); two periods in one physical stack = teacher error steered to rescan/split by class — do not auto-partition by period.

## Reverse / cancel

Cancel capture; reassign from Unassigned; change suggested name chip when shown; navigate away / discard before Pack B Approve = no publish; override extract cells pre-Approve on Pack B sheet.

**BATCH:** Cancel before Confirm discards staged pages (no capture inserts); navigating away persists draft split for batch id until Confirm/Cancel/TTL; change files before Confirm invalidates prior split guess and re-enters Split Review.

## Dual-hat

None (see DH-01 — Teach seat only for stack; Parent seat has zero stack chrome).

## Functions exercised

Capture photo/voice; matcher; Unassigned inbox; active class; teacher chrome; Pack B per-item confirm; phone Approve (`approved_score`); BATCH-v1 stack upload + Split Review (web) + phone gate/status.

## Explicit non-goals

Generate practice; parent messaging; Ride duty; face match/OCR names; multi-student page split beyond BATCH fixed-N + human Split Review; Parent-seat Approve; office/superintendent KEYGRADE chrome; matcher INSERT student; auto-publish without Approve; Ask `grade_photo` / Ask Approve; **hot-folder / Drive watch / QR / student or parent upload / whole-PDF to model / phone-primary Split Review / sixth tray tab / permanent global batch banner**.

**Removed (Pack B / CEO #4):** “Approve is web-only” / “teacher does NOT Approve on phone.” Phone Approve for keyed captures is **in-scope** on this plan. Gap Approve + bulk/multi-class desk remain on **T-02** as the web alternate.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Tray / active class | Desk · Capture · Needs · Class · Ask | `get_app_state` / `list_classes` |
| Photo+voice capture | `/capture` | **PHYSICAL-ONLY** camera/mic |
| Unassigned + file to student | `/inbox` | `list_inbox`; assign may be UI-primary if no file tool |
| Voice observation note | `/capture` | PHYSICAL-ONLY |
| Cancel capture | UI discard | — |
| Pack B confirm (keyed) | `/capture` review bottom sheet | UI-primary; Ask must not publish |
| Pack B phone Approve (keyed) | **Approve this capture** on review | `approve_capture` if capability; else UI-primary — Teach seat only |
| Class isolation | class switcher | Ask class ground; switch clears assignment ground |
| Desk summarize | Desk | `summarize_class_desk` |
| BATCH Upload stack + Split Review | web CE-A / SR-A flow | — (physical upload + manual UI only; Ask must not Confirm split or invent packets) |
| BATCH phone gate | phone status / deep link | — |

## Suggested QE themes

Match confidence; Unassigned never invents roster; active class boundary; physical capture not faked via Ask; Pack B confirm then phone Approve publishes; no publish without Approve; Parent seat cannot Approve; **BATCH:** class bind before accept; Split Review required every batch; Confirm → captures only; zero auto-Approve; phone status honesty (“open on computer”); NA-A name assign only in Inbox after Confirm.

## Artifacts + DB assert (refine-2)

| Beat | Fixture artifact | Format / subject | DB fields to assert after ingest |
|------|------------------|------------------|----------------------------------|
| 6 matched capture | `F-ART-HW-MATH-HW` | handwritten photo; math homework | `captures.student_id` = spoken-name match (not OCR-required); `photo_asset_id` set; status draft/inbox per product |
| 7 Unassigned | `F-ART-HW-ENG-TYPED` | typed/print photo; English | `captures.student_id` null; Unassigned inbox row |
| 8 voice note | no page | voice-only | capture note path; no invented student |
| 12–13 keyed Pack B | `F-ART-HW-MATH-ALG-TYPED` or keyed HW + key | homework + key (MC/numeric) | after confirm+Approve: `approved_score` set; pre-Approve family must not see draft; `captures.student_id` non-null before Approve |
| 16–18 BATCH stack | `F-ART-BATCH-MATH-25P.pdf` (+ duplex/two-PDF/oversized under `notes/qa-fixtures/batch-ingest/`) | class stack PDF(s) | After Confirm: one `captures` row per packet; `class_id` bound; unnamed packets `student_id` null → Inbox; **no** `approved_score` from Confirm alone; cancel → zero inserts |

**Matcher law:** spoken name + photo for student match (mvp). Written name on page is optional realism — **do not fail** if OCR name is unused. Matcher **never INSERT** student; Unassigned stays first-class until filed. BATCH does not bypass matcher laws (NA-A Inbox only).

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — captures, assets, inbox filings, batch staged/confirmed packets.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Homework captures + photo/audio `assets` | Needs discard or teacher delete capture | `delete_gap` if gap; capture delete **PARTIAL** if no tool — use UI | `captures` for this run gone; no leftover Unassigned from run |
| Filed Unassigned → student | delete capture if test-only | same | capture row gone |
| Voice observation note | delete capture | PARTIAL | no orphan note capture |
| Pack B phone-Approved keyed cell | delete test capture / revert cell per product | PARTIAL | no leftover `approved_score` on ditl-only keyed work |
| BATCH stack captures / batch rows | Cancel incomplete batch; delete confirmed test captures | PARTIAL | no leftover batch captures/assets from run |

**Isolation:** delete only captures/assets created this run. Never delete roster students.
**Order:** discard drafts → cancel open batches → delete captures (gaps cascade) → unref assets → sign out. Idempotent.

## Changelog

- **2026-09-10 (t_21f95d30):** KEYGRADE Pack B — add phone per-item confirm + Approve for keyed captures; keep Unassigned/matcher laws; remove web-only Approve non-goal (CEO #4 / IQG `t_91db8376`).
- **2026-09-12 (t_407a9f4a / IQG-BATCH UPDATE_PLANS):** BATCH-v1 — additive web class-stack path (CE-A · SR-A · phone-gate · PR-A · NA-A); phone honesty “open on computer”; fixtures `notes/qa-fixtures/batch-ingest/`; no NEW_DITL; Parent/Student/Office plans unchanged.
