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

## Rough / handwritten / multi-car corpus (strict eval)

22 more cases (`scripts/lib/carrider-rough-cases.mjs`, all synthetic), following the roster rough-corpus pattern:

| Set | Cases | Images |
|-----|-------|--------|
| Rough plate shots | R01 angle + glare · R02 dusk · R03 motion blur · R04 mud on plate · R05 paper temp tag + heavy JPEG · R06 Oklahoma plate, thumb over badge · R10 Louisiana, strong keystone + q18 | `clean.png` + `rough.jpg` |
| Rough printed pickup forms / tag | R07 form on a hood (glare) · R08 form at dusk + hand shake · R09 hang tag through the windshield | `clean.png` + `rough.jpg` |
| Handwritten pickup forms | H01 (blue pen) · H02 (crossed-out adult → `excluded_names`) · H03 rough (crumpled, dim) · H04 rough (gel pen, shadow, glare) | `clean.png` (+ `rough.jpg` for H03/H04) |
| Multi-car | M01 readable car behind · M02 background plate sharper than the blurry foreground · M03 two cars side by side, nearer one = GT · M04 foreground cut off by the frame · M05 another car's plate mirrored in the rear window · M06 rough dusk + headlight glare, two background cars | `clean.png` (+ `rough.jpg` for M06) |
| Rough negatives | N04 field-trip permission slip (names = `forbid_names`) · N05 spirit-week flyer | `clean.png` + `rough.jpg` |

Pipeline: `gen-carrider-ingest-fixtures.mjs` → `RENDER_ONLY=… render-carrider-ingest-pngs.mjs` (also writes `layout.json`
from `data-gt-name` boxes) → `degrade-carrider-fixtures.mjs` (seeded sharp degradation → `rough.jpg` + `visibility.json`)
→ `eval-carrider-strict.mjs`.

Ground truth for `rough.jpg` was checked by eye against every image and lives in `eval-meta.json.rough_gt`
(`absent` → must be empty; `uncertain` → empty or exact). By-eye adjustments: R06 plate first character is under the
thumb → `uncertain`; R06 make/model badge covered → `absent`; R09 "Patel" on the second rider line is washed out by
glare → `uncertain_names`. Multi-car GT is the **foreground (closest) car only**; `background_plates` lists every other
plate in the frame (M05 also lists the mirrored/reordered readings) and returning one = hallucination + `picked_wrong_car`.

Strict scoring (`eval-carrider-strict.mjs`): plate and tag exact after alphanumeric normalization (O↔0 mismatches fail
and are counted separately as `o0_soft`); make/model exact after lower-case + alnum (aliases VW/Chevy); every expected
name exact, every extra name a hallucination. Buckets: `clean`, `mild` (`photo.jpg`), `rough`, `handwritten`,
`handwritten_rough`, `multi_car`, `multi_car_rough`, `negatives`, `negatives_rough`, plus `crop` (`EVAL_CROP=` — rough.jpg
cropped to the GT boxes, to test whether resolution is the cause).

```bash
npm run eval:carrider:strict                          # regenerate rough images + strict eval (all buckets)
EVAL_CROP=R03,R10,H03 node scripts/eval-carrider-strict.mjs   # cropped-to-text check
```
