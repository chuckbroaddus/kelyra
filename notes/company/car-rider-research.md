# Car-Rider / Dismissal Queue Research Note (RIDE-R1)

**Date:** 2026-09-05  
**Author:** chief-of-staff (CEO vision lock; supersedes 2026-09-03 placard/keypad cut)  
**Status:** Complete — **CEO locks closed**. GATE before implement.  
**Prior cut:** 2026-09-03 R1 recommended printed Family ID + staff keypad, **no cameras / no LPR**. Chuck rejected that.  
**Citations:** placa.ai 2026, Schoolhouse Driveline, SchoolPass, PikMyKid, Bloomz (landscape only). v1 mechanic is **Kelyra product law from CEO**.

---

## Executive Summary

Dismissal is a physical queue of **cars**, sometimes **two lines** (typically by grade). Kelyra uses phones already in pockets:

1. The **parent person record** holds vehicles (plate, make, model) — own cars plus **grandma / nanny** cars. Parent adds and removes them. Each vehicle is **today only**, **date range**, or **indefinite**. Staff may attach a plate when the parent has not.
2. Check-in: pick **which children this stop**, then either photograph the **car ahead**, or **I'm first** (photo of empty lane or manual first). The person **behind** identifies this car when they photograph its bumper. The parent does **not** pick which of their cars they are sitting in.
3. Unreadable / unknown plate: type the plate or **speak it** (STT). Same for staff attach.
4. Staff walk photographs cars **1, 2, 3…** on **that line**. Two people claiming first → staff flag + tap to fix order.
5. Staff **check the parent out of this line** when the child is confirmed picked up, so the parent can join the **other line** for a staggered second child.
6. Office **blacklist**. Unknown plates stay visible. Restricted parent sees only **Check in failed** (no reason). Success: **Check in successful, you are XX vehicle in line** (no total).
7. Photos **and** non-photo line events expire **7 days** after that pickup date, unless the **superintendent archives that day's photos** (kept until deleted). Subpoena process is **not v1**.

**Not v1:** Family ID placard; staff keypad as the product; GPS order; pole ANPR / RFID SKU; photo = child released; parent firehose of the school line.

---

## 1. Competitors (landscape, not the spec)

PikMyKid (~$3,750/yr, app + GPS), SchoolPass (LPR poles / RFID / GPS), Driveline (~$935/yr placard + keypad). [1]–[6]  
Kelyra: **phone LPR + predecessor graph + staff walk**, existing hats. 2026-09-03 Driveline-style recommendation is **retired**.

---

## 2. v1 mechanic (CEO lock)

### 2.1 Vehicles on the parent person

- Plate, make, model. Many rows. Includes cars the parent does not drive every day (grandma, nanny).
- Validity: `today` | `from`–`to` (school-local dates) | `indefinite`. Expired rows do not match the line.
- Parent add/remove. Staff attach/override. Staff judgment outranks parent hygiene.
- `plate_norm`: uppercase, no spaces/hyphens. Never invent a parent from a plate.
- At check-in the parent does **not** select “I’m in the Honda.” Identity of *this* bumper comes from the car behind (photo) or staff walk.

### 2.2 Check-in

- Pick children **this stop** (not the whole sibling set). Then:
  - **Behind someone:** photo of the car ahead → place behind that plate; if that plate is known but not in **this line**, insert them in front too; unknown → unknown slot + staff flag; unreadable → retry, type, or speak.
  - **First:** “I’m first” and/or photo of empty pavement. Two firsts on the same line → **staff conflict** on the list; staff tap-corrects order.
- Copy: success **Check in successful, you are XX vehicle in line** (own position, **no** “of 40”). Fail **Check in failed** (restriction, unlinked child, etc. — **no reason** to the parent).
- Plate type-in / STT: parent (car ahead) and staff (attach). STT is input, not grok-tts playback.

### 2.3 Two lines and staggered pickup

- Office configures **lines** (typical: grade bands). Each has its own order.
- Parent may finish line A (child 1), get **checked out by staff**, then check into line B (child 2).
- Duty is per line. Stage pre-call is per line.

### 2.4 Staff walk, nudge, checkout

- Walk **this line**: photo 1, 2, 3… Spine while the walk is open.
- Nudge unsigned-in known plates in-app (no plate, no neighbor kids in the copy).
- **Checkout / release:** staff confirm the child was picked up → parent **leaves this line**. Photo check-in ≠ checkout.
- Staff tap to repair order (duplicate first, wrong bumper).

### 2.5 Blacklist and unknown

- Restriction: parent (and/or vehicle) must not take student S. Duty sees a **flag**, not the office note. Parent sees **Check in failed** only.
- Unknown plate: stays on the **curb** list until attach, wave, or escalate.

### 2.6 Retention

- Line photos and **queue events** delete **7 days** after `school_date` of pickup.
- Within those 7 days, **superintendent** may **archive that day’s photos** (every photo that day — extra evidence in frame). Archived photos **kept until office deletes**. Events still follow the 7-day rule.
- No public bucket. No Ask ingest. Subpoena workflow **out of v1**.

---

## 3. AI

| Job | v1 | Not v1 |
|---|---|---|
| Read plate from photo | Edge, server key | Client keys |
| STT into plate field | Yes | New TTS vendor; grok-tts is playback only |
| Behind / first graph | Yes | GPS |
| Face-match driver | No | |
| Mint people from plate | No | Matcher law |

Unreadable → human path (retry / type / speak / staff).

---

## 4. Limits (honest)

Night, glare, dirty plates, wrong bumper, cloned plates. Staff ordinal + tap-correct beat a bad parent graph. Photographing another car is PII. Two lines can desync if checkout is skipped (staff must checkout).

---

## 5. v1 vs later

**v1:** vehicles + validity; photo / I’m first; two lines; staff walk + checkout; STT/type plate; blacklist; 7-day purge; superintendent photo archive.  
**Later:** poles, RFID, GPS, face verify, SMS, nanny’s own login, subpoena desk.

**OPEN ISSUES:** none for GATE.  
**RECOMMENDED NEXT ACTION:** Hold **RIDE-GATE** until Chuck sends.

## Sources

[1] https://placa.ai/pikmykid-alternatives-school-dismissal  
[2] https://schoolhousedriveline.com  
[3] https://schoolpass.com/solutions/carline-automation  
[4] https://getapp.com/education-childcare-software/a/pikmykid/reviews  
[5] https://schoolhousedriveline.com/school-dismissal-manager-pricing  
[6] https://www.bloomz.com/vs-pikmykid
