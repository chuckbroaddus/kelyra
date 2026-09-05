# RIDE-A1: Architecture — car-rider queue (photo / plate)

**Date:** 2026-09-05  
**Author:** chief-of-staff (CEO vision lock)  
**Status:** Architecture only — **no SQL**. GATE before implement.  
**Live ground:** `docs/data-model.md`, `my_school_id`, private `photos`, `write_audit`. No vehicle/queue tables today.

---

## 0. Law

| Q | A |
|---|---|
| Order | Per **line**: staff walk seq if open, else predecessor graph + I’m-first. Never GPS. Server clock/seq. |
| Pickup unit | Signed-in parent + selected children **this stop** + **this line**. Own bumper identity from the car behind or staff walk — not a self-picked vehicle. |
| Checkout | Curb only. Photo ≠ released. |
| LPR / STT | Server/OS; no `EXPO_PUBLIC_` vision keys. |
| Retention | Photos + `queue_events` purge **7 days** after `school_date`. Superintendent `archive` of **that day’s photos** exempts those assets until delete. |
| Implement? | **NO until GATE send.** |

---

## 1. Sketch (not a migration)

Stamp `school_id` on every row.

### `dismissal_lines`

`id`, `school_id`, `name` (e.g. K–2), `sort`, `status`. Duty and events point at `line_id`.

### `parent_vehicles`

`parent_id`, `plate_raw`, `plate_norm`, `make`, `model`, `label` (optional “nanny”), `source` parent|staff, `status` active|void,  
`validity_kind` `today` | `range` | `indefinite`, `valid_from` date, `valid_to` date (school-local).  
Expired ⇒ not used for match. Parent upsert/delete (void). Staff attach.

Active unique `(school_id, plate_norm)` among non-void **currently valid** rows — staff voids on conflict; no silent two-owners.

### `pickup_restrictions`

`student_id` + `parent_id` (optional `vehicle_id`). Duty flag only. Parent copy never includes reason.

### `dismissal_duty`

`curb` | `stage` + `line_id` (null = all lines). Not `is_staff`.

### `line_photos`

`line_id`, `school_date`, `asset_id` private, `kind` `parent_ahead` | `parent_first` | `staff_walk`, `staff_seq`, `walk_id`, plate read, unknown/unreadable, `ahead_vehicle_id`, `archived_at` (set by superintendent archive job for that date), `occurred_at` server.

### `queue_events`

`line_id`, kinds: `check_in`, `im_first`, `ahead_insert`, `staff_place`, `order_fix`, `left`, `released` (checkout), `nudge`, `restrict_block`, `attach_vehicle`, `plate_typed`, `plate_stt`.  
`student_ids` this stop. Server `occurred_at`. Purge with 7-day job (photos not archived go too).

**Order:** walk seq > staff `order_fix` > predecessor / I’m-first graph. Two `im_first` on same line without fix ⇒ `conflict_first` on live DTO.

**Checkout:** `released` for this `line_id` + those children. Parent may `check_in` on another line after.

### Live RPCs

- `dismissal_queue_live(line_id)` duty/office  
- `dismissal_my_trip()` → status, **position XX**, selected children, line id. No total, no neighbor plates  
- `dismissal_parent_check_in` photo and/or `im_first` + student ids + line  
- `dismissal_staff_walk_photo` / `dismissal_order_fix` / `dismissal_release` (checkout) curb  
- `parent_upsert_vehicle` / `staff_attach_vehicle` (plate via LPR, typed, or STT string — server stores text, not audio by default)  
- `office_set_pickup_restriction` admin  
- `superintendent_archive_day_photos(school_date)` superintendent only + `write_audit`

Token `/parent` deny. Student deny. Client cannot set seq / `occurred_at` / neighbor UUID.

**LPR Edge:** JWT, server key, private bytes.  
**STT:** field receives text; if cloud STT, server-side only.

**7-day job:** delete `queue_events` and `line_photos` (and storage objects) where `school_date` < today-7 **and** photo not archived. Do not CASCADE from parent delete; null display FKs; purge still runs on date.

---

## 2. Why not X

Metadata plates; placard check-in; GPS rank; client INSERT; LPR mint people; auto-stage all siblings; public photos; parent self-selected vehicle as order key.
