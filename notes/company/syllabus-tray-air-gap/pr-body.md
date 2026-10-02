## Summary
- Follow-up to #395: iPhone still showed an opaque fill in the **air gap between** the Syllabus action tray and the system tray when stacked (after swipe-down).
- Root causes addressed:
  1. iOS `KeyboardAvoidingView` stayed enabled with `behavior="padding"` even with the keyboard closed, which can shrink the scroller and leave a solid `colors.bg` band in the tray zone. KAV is now `enabled={keyboardUp}` only.
  2. ScrollView + tray float hosts now force `backgroundColor: 'transparent'` so only the rounded action/system **cards** paint elevated fill.
  3. Syllabus nav sits in a full-bleed transparent `navHost` overlay; `stackGap` widened to **12** (chrome bump reserve matches).
- Other screens' system tray still uses shared `FloatingTabTray` (transparent host, elevated frame only).

## Verification
- `npm run typecheck` — pass
- `node --test src/lib/syllabus/wizardChrome.test.ts` — 4/4 pass
- Screenshot: `notes/company/syllabus-tray-air-gap/mockup.png`

## Test plan
- [ ] iPhone Syllabus stacked (swipe-down): true air gap between action tray and system tray; scroll text visible in the gap (no solid band)
- [ ] Swipe-up: action tray slides into system tray spot; system tray hides
- [ ] Home / Class: system tray unchanged
- [ ] Keyboard open on Syllabus: fields still avoid keyboard

RAPID — hand to DevOps for merge.
