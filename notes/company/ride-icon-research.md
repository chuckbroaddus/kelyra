# Kelyra Car Rider Line Chrome Icon Research Brief (RIDE-ICON-01)

**Date:** 2026-09-09  
**Author:** research-feedback (per CEO directive)  
**Status:** Research complete — handoff to ui-ux-designer for option packs  
**Related:** notes/company/car-rider-research.md (v1 mechanic: phone LPR + plate photo for car line queue)  
**Citations:** [1] car-rider-research.md (CEO lock on photo/LPR not placard), [2] PikMyKid.com dismissal pages (car line focus, no public tray icon screenshots), [3] SchoolPass.com carline-automation (LPR emphasis), [4] SchoolhouseDriveline.com (placard/keypad heritage), [5] Apple SF Symbols HIG 2026, [6] Material/Fluent icon libraries (car.rear patterns).

---

## Executive Summary

Current `work` icon (rounded rectangle + two text lines = paper/document glyph) is used for:
- Parent floating tray Ride tab (`src/lib/chrome/trayTabs.ts:49`)
- Office Manage list row "Dismissal curb" (`src/app/index.tsx`)

This reads as "assignment/paper" and does not convey the core action: **photograph or enter a license plate** on the back of a car ahead in the dismissal line. CEO Chuck requests a change to evoke "back of a car with a small license plate."

Feature context (from car-rider-research.md): Parents photograph the car ahead (LPR), staff walk photos, type/speak plate. Not a printed Family ID placard product. Student Assignments tray correctly retains `work` as paper.

No app code, no icon implementation, no kelyra-qa-loop. This brief supplies evidence and 3–4 metaphor directions only.

---

## Competitor Patterns (2026, public sources only)

- **PikMyKid**: Heavy emphasis on car-rider line, real-time parent arrival announcement, GPS/carline. Marketing assets show car-line illustrations but no public in-app tab-bar icons (login-walled apps). Dismissal management centers on vehicle arrival, not placards in v1 descriptions. [2]
- **SchoolPass**: Carline Automation + LPR cameras/RFID/GPS. Parent app supports vehicle photo upload + plate entry for automation. Iconography in public materials leans toward vehicle/traffic flow rather than paper forms. [3]
- **Driveline / Schoolhouse Driveline**: Historically placard + keypad; newer "Driveline Family" app shifts toward mobile. Public site highlights secure car line pickups; no visible tray icons. [4]
- **HangTag / School Dismissal Manager / CurbSmart**: Similar carline focus; marketing uses vehicle queue visuals. No public small-icon examples.

**Observation:** Competitor public assets avoid detailed side-view cars or kid silhouettes at small sizes. LPR-focused products (SchoolPass) favor vehicle-rear or plate metaphors when visible. No evidence of clipboard/paper for car-rider tabs.

**System icon libraries (latest 2026 patterns):**
- SF Symbols: `car.rear`, `car.rear.and.tire.marks`, `licenseplate` (or `license.plate`), `car.side.rear` variants exist and are recommended for vehicle context. Designed for 22–28 pt readability; multi-layer for tinting. [5]
- Material Icons / Fluent UI: `directions_car`, `local_taxi`, rear-view approximations via `directions_car_filled`; plate often composed as `credit_card` + car or custom. Rear 3/4 and dead-rear glyphs scale cleanly. [6]

---

## 24px Tray / Chrome Readability Analysis

Kelyra icons: 24-unit design grid, white-ink recipes, cropped to ink bbox, uniformly scaled, tinted (per `scripts/build-icons.mjs`).

At 22–24 px (system tray, list rows, tab bars):
- **Fails / becomes noise:**
  - Full car side view (windshield, doors, wheels too fine → blob or generic rectangle).
  - Kid silhouette or person-in-car (detail lost; confuses with `person` / `login`).
  - Generic side-profile car (loses "rear" directionality; reads as "transport" not "photograph plate").
  - Clipboard / paper (current `work` — already conflicts with Assignments).
  - Windshield-heavy front view (glare metaphor irrelevant; too complex).

- **Succeeds / remains legible:**
  - Dead-rear car outline (simple rectangle + wheels + roof line + small centered plate rectangle).
  - Rear 3/4 view (adds depth cue without extra lines; plate still focal).
  - Plate-only (bold rectangle with 3–4 character slots or "ABC 123" hint; pairs with subtle camera dot if needed).
  - Minimal bumper + plate (horizontal bar + small plate below).

CEO direction (back of car + small license plate) aligns with the legible rear/plate group.

---

## Metaphor Directions (3–4 options for designer)

Do not pick or design packs. These are evidence-based starting points:

1. **CEO Direction — Dead-rear car with prominent small license plate**  
   Simple car rear silhouette (rounded top, two wheels, horizontal bumper) with a clearly legible rectangular plate area (2–3 character slots or "plate" hint) centered on trunk. Emphasizes "photograph the plate ahead." Distinguishes from generic `car` by the plate focus. Matches LPR core action.

2. **Rear 3/4 view with plate emphasis**  
   Slight angle on rear (common in parking/LPR apps) showing one taillight + plate area. Adds spatial cue for "car ahead in line" without losing small-size clarity. Plate remains the visual weight.

3. **Plate-only / Plate + subtle capture cue**  
   Isolated license plate glyph (rectangle with divider or state-like frame) possibly with a minimal camera-flash dot or viewfinder corner. Strongest direct tie to "enter/photograph plate." May need differentiation from pure `photo` or `capture` icons.

4. **Stylized bumper + plate (minimalist)**  
   Horizontal bumper bar + centered plate rectangle, no full car body. Ultra-simple for 24 px; reads instantly as "car line / plate." Used in some parking apps for curb focus.

All directions must:
- Use white-ink recipe style (no View-stroke glyphs).
- Be added as new recipe in `scripts/build-icons.mjs` + new `IconName`.
- Remain visually distinct from existing: `photo`, `file`, `work` (paper), `capture`, `login`/`person`, `feed`, `manage`.

---

## Accessibility & Distinction Notes

- Must not be confusable with `photo` (camera body) or `capture` at tray size.
- Plate focus + car-rear shape separates from `work` (paper) and `file`.
- Avoid any person/kid elements (already used in `person` tab).
- High-contrast white ink + uniform scale ensures tint works in light/dark.
- Screen-reader label: "Ride" or "Car Rider Line" (already in tray); icon is visual only.

---

## Recommended Next Action (Handoff)

- ui-ux-designer: Produce 3–4 visual option packs from the metaphor directions above (no final pick).
- product-manager: Review packs against CEO direction + 24 px tests.
- No implementation until after designer/PM step.
- Citations and competitor notes above are the evidence base.

**Files referenced (read-only):**  
- notes/company/car-rider-research.md  
- scripts/build-icons.mjs (work recipe)  
- src/lib/chrome/trayTabs.ts (Ride tab usage)  

This brief satisfies the research requirement. Designer owns option packs.