# Car-rider ingest fixture corpus

Reusable evaluation set for Ride LPR + vehicle/hang-tag/check-in/authorized-pickup capture.

## Inventory (code map)

See section below — target fields match `ride-lpr` + Capture vehicle path.

## Layout

Each case folder (`V01`…, `T01`…, `F01`…, `N01`…):

- `source.html` — synthetic printable source
- `clean.png` — rendered page
- `photo.jpg` — photo-like capture when listed
- `expected.json` — ground truth LPR/form shape
- `eval-meta.json` — scorer hints (`negative`, `prefer_photo`, …)
- `notes.md` — what the case exercises

Root:

- `MANIFEST.json` — index
- `runs/<YYYYMMDDHHMM>/` — live edge responses + `score.json`

## Regenerate

```bash
node scripts/gen-carrider-ingest-fixtures.mjs
node scripts/render-carrider-ingest-pngs.mjs
```

## Live eval

```bash
npm run eval:carrider
# or
node scripts/eval-carrider-ingest.mjs
```

Requires checkout `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) and personas in `~/.kelyra/ui-personas.json` (teacher). Never print secrets.

## Target data model (SoT)

Edge `ride-lpr` JSON (vehicle + extended form fields):

| Field | Meaning |
|-------|---------|
| `document_kind` | `vehicle_photo` \| `hang_tag` \| `check_in_sheet` \| `authorized_pickup` \| `rejected` \| `unknown` |
| `plate` | Primary plate, A–Z0–9 only (or null if unreadable) |
| `plateFront` / `plateBack` | Side-specific when visible |
| `make` / `model` | Only when clearly readable — never invent |
| `side` | `front` \| `back` \| `unknown` |
| `tag_number` | Car-tag / hang-tag id when present |
| `riders` | Student rider display names on tag/sheet (synthetic) |
| `authorized_pickups` | Authorized pickup names on forms |
| `unreadable` | true when plate/tag primary id cannot be read |
| `confidence` | 0–1 |
| `reject_reason` | Short reason when `document_kind=rejected` |

## Code paths

| Layer | Path |
|-------|------|
| Capture classify | `supabase/functions/classify-capture` — intent `vehicle` |
| Capture speech | `src/lib/matching/captureSpeech.ts`, `src/app/capture.tsx` spokenSuggestsIntent |
| Capture UI | `src/app/capture.tsx` vehicle fields + `saveVehicleConfirm` |
| Seat jobs | `src/lib/capture/seatJobs.ts` Vehicle / plate |
| Proposal | `src/app/proposal.tsx` vehicle chip |
| LPR edge | `supabase/functions/ride-lpr` |
| Client LPR | `src/lib/ride/api.ts` `invokeRideLpr`, `uploadRidePhoto`, `staffAttachVehicle` |
| Plate norm | `src/lib/ride/plate.ts` `plateNorm` |
| Staff curb | `src/app/ride/index.tsx` walk photo → LPR → attach |
| Parent ride | `src/app/parent/ride.tsx` ahead-plate LPR |
| Parent vehicles | `src/app/parent/vehicles.tsx` |
| Admin ride | `src/app/admin/ride/index.tsx` |
| RPCs | `parent_list_vehicles`, `parent_upsert_vehicle`, `staff_attach_vehicle`, `dismissal_*`, `office_set_pickup_restriction` |

Matcher never invents a parent. Nothing attaches without staff/parent confirm when parent unknown.
