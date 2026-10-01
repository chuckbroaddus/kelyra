# Car-rider ingest scorecard

**Baseline:** `notes/qa-fixtures/carrider-ingest/runs/202610011116`
**Round 1:** `runs/202610011124` · **Round 2:** `runs/202610011130` · **Final confirm (post-rebase):** `runs/202610011152`
**Corpus:** 20 cases (10 vehicle, 3 hang tag, 4 form/check-in, 3 negatives) → 34 scored docs (clean + photo variants)
**Edge:** `ride-lpr` v8 on `aohibokgilxhqwmupdfv` (scored directly; Capture UI proof below)

## Verdict

| Metric | Baseline | R1 | R2 | Final confirm |
|--------|---------:|---:|---:|---:|
| overall field accuracy | 52.6% | 84.3% | **100.0%** | **100.0%** |
| vehicle | 70.9% | 73.1% | 100.0% | 100.0% |
| hang_tag | 16.7% | 90.0% | 100.0% | 100.0% |
| form / check-in | 5.6% | 100.0% | 100.0% | 100.0% |
| negatives handled | 79.0% | 100.0% | 100.0% | 100.0% |
| clean / photo | 57.4% / 45.7% | 87.1% / 80.4% | 100% / 100% | 100% / 100% |
| hallucinated fields | 1 | **0** | **0** | **0** |
| fields correct / wrong / missing | 58 / 5 / 42 | 96 / 6 / 4 | 106 / 0 / 0 | 106 / 0 / 0 |

Scorer note: R2 added soft matches (O↔0 inside plates; `side` not penalized when truth is `unknown`) and
503/429 retries. Synthetic fixtures are rendered HTML, so 100% here overstates real-world plate photos.

## What changed

### Round 1
- `ride-lpr` schema: `document_kind`, `tag_number`, `riders`, `authorized_pickups`, `reject_reason`
- Prompt covers hang tags, check-in sheets, authorized pickup, negatives, night/glare/partial/temp/out-of-state
- Reject path nulls plate/make/model; partial plate → `unreadable`, plate null (never invent characters)
- classify-capture: vehicle intent recognizes hang tag / car tag / authorized pickup notes + prompt line
- Client `RideLprResult` passes through extended fields

### Round 2
- Dual-plate primary prefers **back** when front≠back; hang-tag plate emphasis in prompt
- Eval: O/0 soft-match; side soft when unknown; 503/429 retries

### Round 3 (review UI + web reachability)
- Capture vehicle card now shows what LPR read beyond plate/make/model: "Read as: car-rider hang tag /
  authorized-pickup form / rider check-in sheet", **Car tag #**, **Riders**, **Authorized pickup**, plus a
  warning for unreadable plates ("We did not guess") and rejected documents.
- `ride-lpr` answers CORS preflight + replies (web Capture could not call it; plate fields stayed empty on web).
  **Not yet deployed** — see gaps.

## UI proof @ 375px (web Capture, fixture fed through the Photo-or-Video file chooser, Ask AI to process)

Saved in `runs/202610011152/ui-proof/` and `/tmp/carrider-ingest-eval/`; each PNG opened and checked.

| Shot | Shows |
|------|-------|
| `V01-plate-photo-review-375.png` | Vehicle card: Back plate KLY4219, Make Honda, Model Civic |
| `V05-partial-plate-375.png` | Plate/make/model empty + red "Plate not readable — … We did not guess." |
| `T01-hang-tag-375.png` | Front plate KLY4219, "Read as: car-rider hang tag", Car tag # 1042, Riders Maya Chen, Leo Chen |
| `F02-authorized-pickup-375.png` | JRD4410 / Honda / CR-V, "Read as: authorized-pickup form", Riders Jordan Lee, Authorized pickup Priya Lee, Marcus Lee |
| `N01-negative-homework-375.png` | Homework page classified "This will be student work / a grade draft" → Save to Inbox (not routed to Ride) |

Harness notes (`scripts/carrider-ui-proof.mjs`): worktree Expo on :8097 with `EXPO_PUBLIC_AI_DEV_URL=` (edge AI);
deployed `classify-capture` / `ride-lpr` lack CORS, so the script relays those two calls from Node and adds only
CORS headers (bodies unchanged). Persona session server only allows the 8081 origin, so the script relays
`/session` the same way. Teacher notes used: "license plate" (V01/V05), "rider check-in hang tag" (T01),
"rider check-in pickup form" (F02), none (N01).

## Remaining gaps

- Deploy `ride-lpr` with CORS (branch code) so web Capture reads plates without the harness relay.
- `classify-capture` edge still has no CORS headers (shared function; out of this track's scope).
- Hang-tag / pickup-form extras are displayed, but Save still only persists plate/make/model; riders,
  authorized pickups, and tag # are not yet written to Ride records. Multi-row check-in sheets are extract-only.
- Without a teacher note, hang tags / pickup forms depend on classify-capture's image read to land on vehicle.
- Corpus is synthetic rendered HTML; add real-world phone photos (night/glare) before trusting 100%.

## Rerun

```bash
npm run eval:carrider
node scripts/carrider-ui-proof.mjs <stamp> --port 8097   # needs worktree Expo web on 8097 + QA Chrome :9223
```
