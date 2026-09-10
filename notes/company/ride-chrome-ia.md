# Ride chrome IA — pointer (not SoT)

**Date:** 2026-09-09  
**Status:** Index only. **Canonical law:** `docs/ui-design.md`  
**Locks:** CEO accepted PM P-02/P-03; glyph LOCKED in `notes/company/ride-icon-decision.md` (IconName `ride`, RearPlate). Product/LPR: `notes/company/car-rider-*.md`.

## Parent floating tray (shipped)

| Key | Icon | Label | href |
|---|---|---|---|
| `home` | `today` | Home | `/parent` |
| `ride` | **`ride`** | Ride | `/parent/ride` |
| `ask` | `ask` | Ask | `/ask` |

Source of truth in code: `src/lib/chrome/trayTabs.ts` `tabsFor('parent')`.

## Office

**No Ride tray tab.** Tray remains **Feed · Classes · People · Manage · Ask**. Dismissal curb / Ride office = **Manage altitude** (Manage pane + duty routes). Dual-hat never merges trays.

## Dual-hat staff → parent Ride

**SoT:** HamburgerDrawer **Parent** altitude row (Teach/Office class) → preference `parent` → tray **Home · Ride · Ask** → land `/parent`. **My children** remains orthogonal deep-link (not Ride SoT). Full law: `docs/ui-design.md` §31.4b.

## Spec map (ui-design.md)

| Topic | Section |
|---|---|
| Shorter-tray gloss vs locked counts | §3.1 |
| Student 6 / parent 3 / office no Ride | §3.4 |
| Parent Home / Ride wordmarks | §3.5 |
| IconName `ride` ownership | §10.17 |
| Parent Home + Ride chrome pointer | §13.13 / §13.13b |
| Role tray cells | §31.1 |
| Dual-hat / no office Ride | §31.4b |
| Parent seat altitude (G3 / Ride entry) | §31.4b Parent seat subsection; lock `ride-iqg-pm-lock.md` §1 |
| Locked tray counts | §34.2 |
| Manage curb (not sixth tab) | §36.1 / Manage pane |

## Non-goals

- Reopen Ride icon options  
- Office tray Ride for parity  
- Cut student 6-tab tray  
- Invent View-stroke outside `npm run icons`
