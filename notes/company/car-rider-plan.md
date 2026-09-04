# RIDE-P1: Car-rider feature set, UI/UX, AI, implementation tasks

**Date:** 2026-09-03  
**Author:** chief-of-staff (unblocking; same path as LAND-P1 — PM grok-4.5 stream could not finish a one-shot plan write)  
**Card:** `t_510bdb5c` · Parent research: `t_253258c7`  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no `IconName`, no kelyra-qa-loop, no git push.  
**Depends on:** `notes/company/car-rider-research.md` (RIDE-R1, 2026-09-03)  
**Also grounded in:** hat walls, twin separation, “teachers do not create classes,” CAL-P1 join-not-duplicate, TEACH-UX desk vs office.

**Audience:** CEO / Chief of Staff review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Car-rider queue** | Parent arrives → one household check-in → **ordered live list** so staff stage kids in arrival order | Not ANPR/RFID, not a new parent app, not GPS-as-truth, not a school-wide parent firehose |
| **Family ID** | One printed placard (or QR) per household at **this school** | Not a student ID; not a sibling merge across families |
| **Staff list** | Large-type ordered queue on phone/iPad they already have | Not new hardware, not walkie-only as the product |
| **AI** | Optional staff “who’s next for wing B” / parent “I’m in line” **if** Kelyra parent surface exists | Not photo-match theater, not predictive ETA from GPS |

**CEO bar (RIDE-R1):** Real-time ordered dismissal, **no special equipment**, minimal admin setup, lowest effort for parents and staff.

---

## 1. Problem statement

Dismissal is a physical queue. Competitors either push a **parent app + GPS** (PikMyKid-style: install fatigue, location prompts, flaky loops) or a **printed Family ID + staff keypad** (Schoolhouse Driveline-style: ~$935/yr, no parent app). Walkie/Google-Form hacks are free and error-prone.

Kelyra already has hats, households, and phones. v1 should feel like Driveline **inside Kelyra**, not a second dismissal vendor.

---

## 2. Explicit non-goals

| Non-goal | Why |
|---|---|
| ANPR / cameras / RFID / beacons in v1 | CEO: no special equipment |
| Required new parent app install | Fatigue; Driveline wins on this |
| GPS as queue order | Pickup loops block signal; advisory only later |
| Auto-release without staff eyes | Wrong-child risk; tag possession ≠ identity |
| School-wide parent firehose of every car in line | FERPA; only this school’s duty staff + that household |
| Mixing twins into one unlabeled pickup | Hard product law — household link is explicit |
| Class create / office directory from this surface | Teachers do not create classes |
| Replacing bus routing / aftercare billing | Flags only |
| kelyra.app public dismissal URL | Login + RLS; no anonymous live queue |

---

## 3. Hats — user stories (v1)

### Parent / driver (linked household)

- Receives **one Family ID** (large digits + optional QR) to print once (visor/window).
- Arrives, placard visible. **No tap required** for v1 if staff enter the ID.
- Later (optional): “I’m in line” from existing Kelyra parent surface — **explicit tap**, not geofence.
- Can cancel / “left the line” (staff or parent tap) so the household drops out of order.
- Sees only **their** household status, not the full school queue.

### Staff — curb / dispatcher (duty roster)

- Phone or existing iPad: number pad / search → enter Family ID → household jumps onto the **live ordered list** (arrival time).
- Large type: next N households, student names, zone (car A/B), sibling names together.
- Confirm **release** at curb (visual match). Never auto-release.
- Offline: last cached list + manual mark; sync when back.

### Staff — classroom / staging

- Same ordered list, filter by wing/zone: “who’s next for wing B.”
- One household check-in **stages all linked siblings** at this school (never another family’s kids).

### Office

- Print/reissue Family IDs; link students to a household; set default mode (car / aftercare / bus); day-of override.
- No week-long config wizard.

### Student

- No car-rider UI in v1 (stay in class until called).

---

## 4. Check-in mechanic (v1)

**Primary:** Printed **Family ID placard** (Driveline pattern). Staff types or scans QR with the **phone camera they already have**.

**Household:** One ID → all enrolled siblings at this campus. Check-in once.

**Cancel / leave line:** Staff or parent marks `left`; position vacated; no silent linger.

**Multi-window:** Per-student flag `car` | `aftercare` | `bus`. List filters by window. Day-of override without a calendar product.

**Not v1 order source:** GPS.

---

## 5. Staff UX

| Surface | v1 |
|---|---|
| Parent phone | Optional status only; placard is enough |
| Dispatcher | Big keypad + ordered list + search by ID/name |
| Classroom | Read-only large list, zone filter, auto-refresh |
| Device | Existing phone/iPad; landscape OK **after** sign-in |

No new wall hardware required; a spare iPad on a music stand is a **deployment choice**, not a SKU.

---

## 6. Visibility matrix (fail closed)

| Viewer | Sees |
|---|---|
| Parent | Own household: in line / waiting / released — **this school** |
| Curb staff | Live queue for **assigned** windows/zones |
| Classroom staff | Same queue, names of students they may stage |
| Other parents | Nothing |
| Other schools | Nothing |
| Twins | Same household ID only if they **are** one household; never cross-family |
| Anonymous | Nothing |

RLS: school + duty role + household link. No `is_staff` widen. No class-create.

---

## 7. AI (only where it earns keep)

| v1 | Later |
|---|---|
| Staff NL: “who’s next for wing B” → **filter** the existing list | Photo match / LPR |
| Parent NL “I’m in line” **if** parent surface exists, maps to **that** household | GPS ETA |
| | Predictive “they’re usually late” |

No invented students. Unassigned NL → confirm picker.

---

## 8. Safety

- Tag = possession, not identity. **Staff confirm** at curb.
- Late parent: row stays `waiting`; optional later SMS (not v1).
- Offline: cache + walkie fallback; log manual overrides.
- Stolen/shared tag: office reissue; old ID void.

---

## 9. Implementation tasks (phased, no code here)

**P0 — data (architect later)**  
Household Family ID; student↔household; window flags; queue events (check-in, left, released) with timestamps.

**P1 — staff**  
Keypad/QR check-in; ordered live list; zone filter; release confirm; classroom read view.

**P2 — office**  
Print sheet / PDF placards; reissue; day-of window override.

**P3 — parent (optional)**  
Status + cancel; “I’m in line” tap. No new app store listing required if inside Kelyra.

**P4 — later**  
GPS advisory, photo verify, SMS, ANPR.

Each phase: RLS tests, twin/household tests, no firehose. **kelyra-qa-loop only when Chuck says send.**

---

## 10. v1 vs later

| v1 | Later |
|---|---|
| Placard + staff device | ANPR / RFID |
| Household one-check-in | Carpools across families |
| Staff visual confirm | Photo ID at curb |
| No GPS order | GPS advisory + disclaimer |
| No parent install | Kelyra parent tap |

---

## 11. Acceptance for this card

- This file exists for CEO/CoS review.
- No application code, no SQL, no git push, no kelyra-qa-loop.
- Next: Chuck reviews; **do not** staff `senior-developer` until he says send.
