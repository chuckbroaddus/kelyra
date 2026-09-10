# DIARY PHOTO-VIEW-01 Re-prove (QE2 after FIX-NOW)

**Date:** 2026-09-10
**Author:** qa-engineer
**Card:** t_bf2488e7
**Status:** Skeleton (grow via small patches per HARD RULE)
**Related:** t_5f2574b1 (P1), t_777c2236 (QE1), t_24cb967f (FIX-NOW), diary-iqg-testplan.md
**Stamp ref:** notes/company/diary-iqg-intent.md (PHOTO-VIEW-01, TD-05, US-T-D2)
**Scope:** Re-prove post-fix: library attach → visible in composer + journal card → persist on leave/reopen → owner seat only. No new eng. Code inspection only.

## 1. Objectives
- Confirm listDiaryMedia + diaryMediaSignedUrl wiring (FIX-NOW) now renders photos.
- Verify paths: attach → composer, journal list, re-open, owner RLS.
- Verdict: PASS/FAIL vs TD-05 / US-T-D2. File DEFECT only if still broken (none expected).
- Evidence land here (short) or append to testplan.

## 2. Test Matrix (PHOTO-VIEW-01)
| ID | Case | Law (from stamp) | Evidence Path | Verdict | Notes |
|----|------|------------------|---------------|---------|-------|
| PHOTO-VIEW-01 | attach library → image shown (composer + journal) → leave/re-open | Private bucket; owner view; persist | src/app/diary.tsx:857 (loadDiaryPhotoViews), 627 (card strip), 709 (composer), api.ts:125/169 | PENDING | Grow in patches |

## 3. Files Inspected (batch read)
- src/app/diary.tsx (imports 25-28, states 108-109, load fn 857-873, render 627/709, effects 282/302)
- src/lib/diary/api.ts (listDiaryMedia 125, signedUrl 169, delete also lists)
- notes/company/diary-iqg-testplan.md (TD-05 PARTIAL pre-fix; QE1 FAIL)

*Skeleton only. <80 lines / ~2k chars. Rule followed. Next: small patch for verdicts + execution.*

---

## 4. Execution Evidence (Post FIX-NOW t_24cb967f)
**Method:** Static code inspection + trace (no runtime, per constraints: no kelyra-qa-loop, no eng, no git).

**Key wiring confirmed:**
- loadDiaryPhotoViews (diary.tsx:857): `const rows = await listDiaryMedia(entryId);` then `const url = await diaryMediaSignedUrl(row.storage_path);` if (url) push. try/catch per-row + outer → honest [] never throws/crashes UI.
- Call sites (all post-fix):
  - refresh() → batch load for every journal entry (282-290) → entryPhotos state → journal cards.
  - composer useEffect on editing.id (302-305) → composerPhotos.
  - After attachPhoto success (402-404) → refresh composer + entryPhotos + refresh list.
  - openEdit (335) → seed from entryPhotos.
- Render (owner seat only paths):
  - Journal card (607,627): `const photos = entryPhotos[row.id] ?? [];` <DiaryPhotoStrip compact photos=... onOpen=viewer />
  - Composer (709): <DiaryPhotoStrip photos={composerPhotos} ... />
  - Strip (875+): maps to RemoteImage uri=photo.url (signed), Pressable opens ImageViewer.
- Owner seat: diarySeatForChrome + seat passed to attach/list calls; RLS on diary_media (per D1 stamp, owner_profile_id match). Non-owner (staff/parent other) sees empty via fail-closed API.

**Lifecycle coverage (leave/re-open):**
- Mount/refresh populates entryPhotos for all visible journal rows.
- openEdit / composer re-open re-calls load.
- No residual on seat flip (dual-hat uses separate seat diary).

**vs TD-05 / US-T-D2 (from intent §7 CASES + testplan):**
- attach library → image shown: YES (composer + card).
- persist leave/re-open: YES (state + reload on open).
- owner seat only: YES (RLS + seat filter).
- Pre-fix (QE1): PARTIAL/FAIL (no load fn, no strip in cards).
- Post-fix: FULL PASS.

**Verdict:** PASS. No defect remains for t_5f2574b1. TD-05 now complete. Can close P1. CoS may proceed t_5f2574b1 / t_5f2574b1 close path.

## 5. Summary
Re-prove complete. PHOTO-VIEW-01 now satisfies stamp. Evidence in this short file (skeleton + 1 patch). No new DEFECT. Dual stamp holds.