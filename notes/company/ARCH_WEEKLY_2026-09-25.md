# Kelyra weekly architecture + tech-debt review

**Date:** 2026-09-25 CT
**Author:** software-architect (cron)
**Board SoT:** Hermes `kelyra`
**No application code. No SQL apply. No git ship.**

---

## OBJECTIVE

Bring **one architecture decision** and **one debt item**. File/update board `kelyra`. Do not implement.

## CONTEXT

- Board 2026-09-25: triage/todo/ready/running 0, blocked 133, done 1098, archived 18. software-architect open: ADR `t_90dfa50e` only (`t_e26bbbcc` capture-delete contract is done).
- Finish list is `Status: current`. Spend order is prove/finish rows, not a docs restamp. FL-09 calendar wheel is `leave` (Chuck 2026-09-24).
- Last week's debt is **closed on disk**, not re-filed: FL-19 `t_24a7645c` done; source cards `t_d3433b09` and `t_06dd401c` done. `20260923090000_register_ingest_file_path_bind.sql` refuses paths outside `{auth.uid()}/ingest/{batch_id}/`. `20260923230000_ingest_files_freeze_storage_path.sql` rejects a later `storage_path` rewrite. Live apply was **not** queried this pass.
- Calendar oldest-school fallback also has a fail-closed file: `20260923224500_calendar_school_id_failclosed.sql`. Not this week's item.
- CEO 2026-09-24 JOURNAL-ATTACH: Journal entries can carry files, not only photos. Migration `20260924213000_diary_media_files.sql` only widens `kind` to `photo|file` and adds `file_name`. Client: `attachDiaryFile` in `src/lib/diary/api.ts`. A1 note `diary-ledger-architecture.md` §2.2 still says `kind` is photo only.
- `docs/architecture.md` restamp (`t_90dfa50e`) stays parked. Do not burn SuperGrok on it. Do not promote HOLD ATTEND/PPT or district TRACK.

## ARCHITECTURE DECISION (this week)

**Journal photos and files stay in the private `diary` bucket, on a seat-scoped path. They are not message attachments.**

1. Bucket `diary` (`public = false`) only. Do **not** upload Journal bytes to `files` / `photos` / `ingest`. Those buckets have thread, class, or worker policies (`is_message_attachment`, ingest service_role). A Journal PDF must not become readable by a thread member.
2. Object path contract: `{auth.uid()}/{seat}/{entry_id}/{media_id}.{ext}`. First segment is the owner. **Seat is part of the path, not only a UI filter.** Dual-hat is the same JWT; the seat wall is otherwise product-only (A1 §3).
3. Row: `diary_media.kind` in `photo|file`. Not a `captures` row. Not Inbox. Not a ledger/audit row. Hard-delete still must not write diary body or media paths into `ledger_events`.
4. Reads: owner-only short-TTL signed URL. Files open with `Linking.openURL` (system handler), not an in-app WebView and not a public object URL.
5. Body link cards may keep the approved Feed-style look. Unfurl output is display-only. Do **not** insert unfurl images or URLs into `diary_media`, ledger, or messages. Do not add a second bucket or a second backend.
6. One Expo client + one Supabase. No kelyra.app DNS. No whole-class PDF to a model.

This records the shape CEO already shipped in the client. It is not a license to restamp `docs/architecture.md` or to change the Journal screen.

## DEBT ITEM (this week)

**`diary_media` insert does not bind `storage_path` to `{uid}/{entry.seat}/{entry_id}/`, and file rows have no type or size cap.**

Grounding:

- Insert policy (`20260910000000_diary_ledger.sql`) checks `owner_profile_id = auth.uid()` and that the entry is owned. It does **not** check `storage_path`.
- Storage insert policy checks `bucket_id = 'diary'` and first path segment = `auth.uid()` only. No seat, no entry id, no mime, no size. Bucket row has no `file_size_limit` / `allowed_mime_types`.
- `attachDiaryFile` sends client mime (fallback `application/octet-stream`), puts a client extension on the object name, and rejects only an empty file. Photos are the same path shape, also unbound in RLS.
- Same owner can therefore point a teacher-seat entry at a parent-seat object (or any other object under their prefix). That skips the seat wall A1 relies on. Cross-user read is still blocked (signed URL needs the caller's prefix).
- `20260924213000_diary_media_files.sql` does not add the check. Client already tells the user the migration may be unapplied. Live apply not verified.
- Delete GC `diary_media_gc_storage()` still `delete from storage.objects`. That is the same class as capture delete `t_9df5ecf1` (still blocked). **Do not widen the capture hotfix to diary from this review.** A later Storage-API slice can name both filenames.

Rank: above ADR restamp, below finish-list prove rows (FL-05, FL-01, …). Not this cron's implement. Fix later = one IQG + devops-release SQL filename (path bind + mime allowlist + byte cap). Do not edit `20260910000000` in place.

## CEO-irreversible (unchanged)

1. kelyra.app DNS
2. DPA / school-official claim
3. Public / pre-auth class URL
4. Second backend / Next.js / SIS
5. Live SQL / git ship outside devops-release
6. Unblocking HOLD PPT/Attendance into architecture.md
7. Sending a whole class PDF to a model
8. Changing an approved Journal screen look from this card

## Structured handoff

**OBJECTIVE:** Weekly architecture decision + one debt item on board kelyra.
**CONTEXT:** Ingest path-bind files exist and source cards are done. Journal files shipped in client + a thin migration. architecture.md restamp still parked. Finish list is current.
**REQUIREMENTS:** One ADR, one debt; tickets updated; no app code.
**CONSTRAINTS:** No git, no SQL apply, no qa-loop, no screen change.
**FILES/AREAS:** `notes/company/ARCH_WEEKLY_2026-09-25.md`; `supabase/migrations/20260924213000_diary_media_files.sql`; `src/lib/diary/api.ts` (`attachDiaryFile`); diary storage policies in `20260910000000_diary_ledger.sql`.
**WORK PERFORMED:** Grounded board + new migrations + Journal attach path. Filed weekly `t_38d39469` (done), decision `t_3945de06` (blocked), debt `t_2afbbd20` (blocked). Commented parked ADR `t_90dfa50e` and capture sibling `t_9df5ecf1`. Did not edit app code.
**VERIFICATION:** Insert policy has no `storage_path` check (lines 188–197). File migration is kind + `file_name` only. FL-19 source cards `done`. ADR `t_90dfa50e` still blocked.
**RESULT:** Decision = Journal bytes stay in private `diary` on a seat-scoped path, not the message `files` bucket. Debt = RLS does not enforce that path, and file rows have no mime/size cap.
**OPEN ISSUES:** Live apply of `20260924213000` and FL-19 SQL not queried. `diary_media_gc_storage` still SQL-deletes `storage.objects` (sibling of `t_9df5ecf1`). Journal link cards call `unfurl_link` (security-definer HTTP get of an https URL) — display-only; do not persist; whether Journal should stop calling it is CoS/security, not a screen change from this card. A1 §2.2 still says photo only.
**ESCALATION NEEDED:** @chief-of-staff — do not staff ADR restamp. Do not put this debt ahead of the finish-list order. When a SQL slice is staffed, one filename for diary path bind + mime/size; do not fold it into the capture Storage-API hotfix.
**RECOMMENDED NEXT ACTION:** Leadership accept the bucket/seat decision. Keep `t_90dfa50e` parked. Leave the debt blocked until CoS has a finish-list gap for it.

---

## CEO accept (2026-09-25 4:23 PM CT)

Chuck accepted the bucket and seat-path decision by voice. Authoritative text is `docs/architecture.md` section **Journal storage (ADR 2026-09-25)**. That section is not the parked restamp (`t_90dfa50e` stays parked). Contradicting diary specs were aligned the same day: `diary-ledger-architecture.md` §2.2–§2.4 (kind is `photo|file`; path includes `.{ext}`), `diary-ledger-security.md` T3 / D1-03, `diary-ledger-acceptance.md` PR-05 / SEC-03.

No app code. No SQL. No Eng dispatch. Enforcement of path bind and mime/size remains `t_2afbbd20`.
