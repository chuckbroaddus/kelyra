# ClassTabs / PersonTabs FoM look — app-wide lock

**Date:** 2026-09-17  
**CEO:** FoM ClassTabs “now look good. Lock them in, update UI/UX spec, implement across all tab rows for all user types.”  
**Hermes:** `t_3a6a6641`

## Product law

Every **destination / pane** horizontal tab row uses `PersonTabs` with:

1. **Hug paint** — selected pill width = `personTabTitleSlot(painted, ceiling)` (short titles stay narrow; do not stretch to ceiling).
2. **Marquee ceiling** — `visibilityReserve`: reserve collapsed 44-hits so **min(3, n)** stay on-screen; extra space shows more tabs; 2-tab shelves keep both.
3. **Scroll** — `personTabScrollX` (center / direction-aware pair); **not** left-pin `x − 12`.
4. **Morph** — `chrome.motion.personTab` = **975 ms**; one implementation in `PersonTabs.tsx`.

Default `labelPolicy` = `visibilityReserve` on `PersonTabs` / `personTabLabelMax`. Legacy `fraction` is opt-out only.

## Spec

- `docs/ui-design.md` §32.2 (title slot + scroll)  
- `docs/ui-design.md` §38 (inventory + exceptions)

## Exceptions (unchanged)

- `FloatingTabTray`
- Form / filter `ChipRow`s
- NT-A `/inbox` `ContextMenuRow` job tabs (do not convert to PersonTabs)

## SoT morph notes

- `notes/company/class-tabs-morph-interpretation-correction.md` (when present)
- kelyra-ux-delta `references/person-tabs-morph.md` (when present)
