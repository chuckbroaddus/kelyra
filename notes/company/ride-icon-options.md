# RIDE-ICON-D1 — Car Rider Line chrome icon option pack

**Date:** 2026-09-09  
**Author:** senior-developer (designer pack; CoS routed)  
**Status:** Options only — PM chooses; no app code / no IconName lock  
**Research:** `notes/company/ride-icon-research.md`  
**Icon system:** `scripts/build-icons.mjs` (DESIGN=24, ST=1.9, helpers `roundRect` / `line` / `circle` / `poly`)

## Purpose

Replace the misused `work` (paper) glyph on Parent tray **Ride** and Office Manage **Dismissal curb**. Student Assignments keeps `work`.

CEO direction (not a lock): back of a car with a small license plate — core job is photograph or type a plate.

## Shared recipe rules

- White-ink stroke language only (match `login`, `photo`, `work`, `capture`).
- ST = 1.9 unless a filled dot uses stroke 0 + fill true.
- Plate must read at ~22 px tray size (rectangle + 2–3 char ticks).
- Distinct from: `photo`, `file`, `work`, `capture`, `login`, `person`.
- Implementer copies geometry into `RECIPES` + adds `IconName`; designer does not run `npm run icons`.

## Comparison baseline — current `work`

```js
// scripts/build-icons.mjs
work: (p) => {
  roundRect(p, 6.2, 3.2, 11.6, 17.6, 1.2, ST, false);
  line(p, 8.6, 8.4, 15.4, 8.4, ST);
  line(p, 8.6, 11.6, 13.6, 11.6, ST);
},
```

## Options (4)

---

### A — RearPlate (`rideRear`)

**Metaphor:** Dead-rear car + small centered plate (CEO direction #1).  
**Suggested IconName:** `rideRear` (or short `ride` if PM wants one canonical name).

**When it wins**
- Parent tray needs an instant “car line / vehicle ahead” read, not a form.
- Office Manage “Dismissal curb” should match the same vehicle metaphor.
- You want maximum distance from Assignments `work` paper.

**24px risks**
- Roof + body can merge into one blob if roof is too thin — keep roof height ≥ 2.8 units.
- Four plate ticks collapse; use **three** short ticks only.
- Wheels must stay clear of plate (gap ≥ 1.5 units).

**Distinction**
- Not `work`/`file` (portrait page). Not `capture` (lens in body). Not `photo` (stacked frames). Not `person`/`login`.

**Recipe (24 grid, ST=1.9)**

```js
rideRear: (p) => {
  // roof (rear glass / roof cap)
  roundRect(p, 7.0, 3.4, 10.0, 3.2, 1.4, ST, false);
  // body / trunk face
  roundRect(p, 4.6, 5.8, 14.8, 11.0, 1.6, ST, false);
  // taillights (filled dots)
  circle(p, 6.2, 8.6, 0.95, 0, true);
  circle(p, 17.8, 8.6, 0.95, 0, true);
  // license plate (must read at 22px)
  roundRect(p, 8.0, 10.6, 8.0, 3.6, 0.7, ST, false);
  line(p, 9.2, 12.4, 10.6, 12.4, ST);
  line(p, 11.3, 12.4, 12.7, 12.4, ST);
  line(p, 13.4, 12.4, 14.8, 12.4, ST);
  // wheels
  circle(p, 7.4, 18.6, 2.05, ST, false);
  circle(p, 16.6, 18.6, 2.05, ST, false);
},
```

**Ink bbox note:** wheels set bottom; roof sets top — crop will be near-square after uniform scale.

---

### B — RearQuarter (`rideQuarter`)

**Metaphor:** Rear ¾ + plate (research #2).  
**Suggested IconName:** `rideQuarter`.

**When it wins**
- PM wants a slight “car ahead in line” depth cue without a full side view.
- Dead-rear feels too boxy next to other chrome (optional taste call).

**24px risks**
- Depth panel + rear face can read as two stacked cards → confusable with `photo`.
- Keep depth panel narrow (≤ 4.6 wide) and plate fully on the rear face, not on the side.
- Avoid door lines / window grids — noise at tray size.

**Distinction**
- Plate on rear face + single side slab ≠ `photo` double frame. Wheels + taillight ≠ paper.

**Recipe (24 grid, ST=1.9)**

```js
rideQuarter: (p) => {
  // rear face
  roundRect(p, 3.8, 6.2, 12.4, 10.6, 1.4, ST, false);
  // right depth (¾ cue)
  roundRect(p, 14.6, 7.0, 4.6, 9.4, 1.0, ST, false);
  // roof over rear face
  roundRect(p, 5.6, 3.6, 9.0, 3.4, 1.2, ST, false);
  // one taillight on rear face
  circle(p, 5.4, 8.8, 0.9, 0, true);
  // plate on rear face (left-of-center so side slab stays clear)
  roundRect(p, 6.0, 10.8, 7.6, 3.4, 0.7, ST, false);
  line(p, 7.2, 12.5, 8.4, 12.5, ST);
  line(p, 9.1, 12.5, 10.3, 12.5, ST);
  line(p, 11.0, 12.5, 12.2, 12.5, ST);
  // wheels
  circle(p, 6.8, 18.6, 1.95, ST, false);
  circle(p, 15.6, 18.6, 1.95, ST, false);
},
```

---

### C — PlateCue (`ridePlate`)

**Metaphor:** Plate-only + tiny capture/viewfinder cue (research #3).  
**Suggested IconName:** `ridePlate`.

**When it wins**
- Product copy stresses “snap or type the plate” over “car line queue.”
- Smallest possible silhouette; strongest LPR metaphor.

**24px risks**
- Corner brackets can look like a generic crop/focus tool → near `focus` / `capture`.
- Keep brackets **outside** the plate, short (≤ 2.2 units), and **no** center lens circle (that becomes `capture`).
- Plate alone without ticks reads as credit-card / `mail` sibling — ticks are required.

**Distinction**
- No camera body, no stacked photo frames. Wide landscape plate ≠ portrait `work`/`file`.

**Recipe (24 grid, ST=1.9)**

```js
ridePlate: (p) => {
  // plate frame
  roundRect(p, 4.0, 7.4, 16.0, 9.2, 1.3, ST, false);
  // bolt dots
  circle(p, 5.8, 9.2, 0.65, 0, true);
  circle(p, 18.2, 9.2, 0.65, 0, true);
  circle(p, 5.8, 14.8, 0.65, 0, true);
  circle(p, 18.2, 14.8, 0.65, 0, true);
  // state bar
  line(p, 7.2, 9.6, 16.8, 9.6, ST);
  // plate characters
  line(p, 7.0, 12.2, 9.0, 12.2, ST);
  line(p, 10.2, 12.2, 12.2, 12.2, ST);
  line(p, 13.4, 12.2, 15.4, 12.2, ST);
  // viewfinder corners (capture cue — not a lens)
  line(p, 2.6, 5.2, 2.6, 7.2, ST);
  line(p, 2.6, 5.2, 4.6, 5.2, ST);
  line(p, 21.4, 5.2, 21.4, 7.2, ST);
  line(p, 19.4, 5.2, 21.4, 5.2, ST);
  line(p, 2.6, 16.8, 2.6, 18.8, ST);
  line(p, 2.6, 18.8, 4.6, 18.8, ST);
  line(p, 21.4, 16.8, 21.4, 18.8, ST);
  line(p, 19.4, 18.8, 21.4, 18.8, ST);
},
```

---

### D — BumperPlate (`rideBumper`)

**Metaphor:** Bumper bar + hanging plate, minimal body (research #4).  
**Suggested IconName:** `rideBumper`.

**When it wins**
- PM wants curb/line focus (“dismissal curb”) over full vehicle.
- Ultra-simple chrome next to dense tray icons.

**24px risks**
- Bumper alone can read as a minus/toolbar rule — pair with plate **and** two taillight dots.
- Tiny body cap above bumper is optional; if used, keep it short so it does not become a second `work` page.
- Plate height ≥ 3.8 so ticks survive crop+scale.

**Distinction**
- Horizontal bumper + landscape plate ≠ vertical paper. No lens. No person.

**Recipe (24 grid, ST=1.9)**

```js
rideBumper: (p) => {
  // minimal trunk / body cap (optional curb cue)
  roundRect(p, 6.0, 4.6, 12.0, 4.4, 1.2, ST, false);
  // bumper bar
  roundRect(p, 3.2, 9.4, 17.6, 3.0, 1.0, ST, false);
  // taillights on bumper ends
  circle(p, 5.0, 10.9, 0.95, 0, true);
  circle(p, 19.0, 10.9, 0.95, 0, true);
  // plate hanging under bumper
  roundRect(p, 7.2, 13.0, 9.6, 4.2, 0.8, ST, false);
  line(p, 8.6, 15.1, 10.0, 15.1, ST);
  line(p, 10.8, 15.1, 12.2, 15.1, ST);
  line(p, 13.0, 15.1, 14.4, 15.1, ST);
},
```

---

## Side-by-side decision grid

| Option | IconName | Core read | Best seat | Main risk vs existing |
|--------|----------|-----------|-----------|------------------------|
| A RearPlate | `rideRear` | car back + plate | Parent Ride tray | blob if roof too thin |
| B RearQuarter | `rideQuarter` | car ahead + plate | same, if depth wanted | may echo `photo` |
| C PlateCue | `ridePlate` | plate + snap | LPR-first copy | brackets ≈ focus |
| D BumperPlate | `rideBumper` | curb + plate | Office curb row | bumper ≈ plain bar |

## Implementer checklist (after PM pick)

1. Add chosen recipe to `RECIPES` in `scripts/build-icons.mjs`.
2. Extend `IconName` in `src/components/ui/Icon.tsx` (+ web twin if split).
3. `npm run icons`.
4. Swap tray/manage usages only (`trayTabs.ts` Ride, Manage “Dismissal curb`) — **do not** change Student Assignments `work`.
5. Visual QA at 22–24 px light/dark tint.

## PM default (non-binding)

**Prefer Option A (`rideRear`) as the default starting pick** — closest to CEO “dead rear + plate,” strongest tray silhouette vs paper/camera, plate ticks still legible at 22px.

## Preview

Open `notes/company/ride-icon-options.html` (dark #161616 / text #eee; 24px + 48px on dark and light plates).

## Out of scope

App code, `IconName` union change, `npm run icons`, git, locking the winner.
