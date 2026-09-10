# Kelyra Date Input Research (DIR-1)

**Date:** 2026-09-09  
**Author:** research-feedback  
**Status:** Complete for CoS handoff to ui-ux-designer  
**CEO directive (2026-09-09):** Mobile = iOS-like rolodex/drum wheels (month·day·year). Web (as appropriate) = popup calendar (month view, Sun–Sat grid, header month/year dropdowns that refresh grid). Match current platform patterns. UseTheme() tokens only. No invented chrome. Canonical spec later in docs/ui-design.md (designer owns).  
**Scope:** Research only. Inventory of existing Kelyra date surfaces. Risks. Handoff questions (questions only). Recommendation on shared primitive. No designs, no option packs, no code changes, no docs/ui-design.md edits.

## 1. Cited Platform Patterns

### iOS (UIDatePicker)
- Primary for phone: `UIDatePicker` with `datePickerMode = .date` and `preferredDatePickerStyle = .wheels` (classic rolodex/drum: independent spinning columns for month, day, year). 
- Other styles (iOS 13.4+): `.compact` (tappable field → popover calendar/clock), `.inline` (embedded calendar).
- Config: `minimumDate` / `maximumDate`, `locale` (defaults to device, affects formatting and wheel order), `calendar`, `timeZone`.
- Date-only (no time component). Reports `Date` (calendar/timezone agnostic internally).
- Accessibility: `accessibilityLabel`, `accessibilityTraits = .adjustable`; full VoiceOver support for wheels (announces current value, increments). Supports dynamic type.
- Tablet: Same as phone; wheels scale or compact preferred in forms.
- Sources: Apple UIDatePicker docs (developer.apple.com/documentation/uikit/uidatepicker); SwiftUI DatePicker equivalents (WheelDatePickerStyle, GraphicalDatePickerStyle).

### Android (Material Design 3 Date Pickers)
- Variants (device-agnostic names in M3): 
  - Modal date picker: full-screen dialog on compact (phone), calendar grid + year dropdown + header selection.
  - Docked date picker: text field input + dropdown calendar (larger screens/tablet/desktop).
  - Modal date input: keyboard numeric entry (compact layouts, fallback).
- Calendar view: month grid, month/year navigation (dropdown for year), current/selected day highlight. Supports single date or range.
- For distant dates (e.g., birth year): prefer input or wheels-style if available; calendar for near-term (due dates).
- Config: min/max dates, locale/device settings, dynamic color.
- Touch targets: min 48dp recommended. Orientation adapts.
- Accessibility: TalkBack support, large targets, keyboard fallback on larger screens. ARIA-like semantics in Compose/Material.
- Tablet vs phone: Modal full-screen on phone; docked/calendar inline on tablet.
- Sources: m3.material.io/components/date-pickers/overview and guidelines; Material Design date pickers (m2/m3 docs on calendar, input, docked).

### Web (Native + Custom Popover Patterns)
- Native: `<input type="date">` — browser/OS renders picker (often calendar popover or wheels on mobile Safari/Chrome). Value normalized to `yyyy-mm-dd`. Supports `min`/`max` attributes, locale formatting (display vs storage). Varies by UA (Chrome calendar grid, Safari wheels-ish).
- Custom popover (recommended for control/consistency): Dialog/popover triggered from text field or button. 
  - Month view: Sun–Sat header grid (7 columns).
  - Header: month label + year dropdown (select updates grid immediately); prev/next month arrows.
  - Keyboard: arrows move focus in grid, Enter/ Space select, Esc close, Tab between controls. Home/End for month edges.
  - Pointer + keyboard both first-class.
- Distinctions:
  - Mobile web (phone): Full-screen modal or bottom sheet calendar (touch-friendly 48px+ targets); wheels via native or custom.
  - Tablet web: Docked or inline calendar + input.
  - Desktop web: Popup/dropdown calendar from input field; keyboard-first.
- Accessibility (WAI-ARIA APG Date Picker Dialog pattern + WCAG):
  - Role=dialog or combobox + aria-haspopup.
  - Live region announces focused date/grid changes.
  - Labels: "Choose date", selected date reflected in button name.
  - Locale: browser Intl / navigator.language; format display locally, store ISO.
  - Date-only (no time). min/max enforced.
  - VoiceOver (macOS/iOS Safari): grid navigation, announcements; TalkBack (Android Chrome) similar.
  - Keyboard-only: full support required; no trap focus.
- Best practice: Provide both native input fallback + enhanced popover. Avoid reinventing for simple cases; enhance for school UX (e.g., school year bounds).
- Sources: MDN <input type="date">; WAI-ARIA Authoring Practices Guide (w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/); 24a11y calendar accessibility; USWDS date picker tests; React Aria / Spectrum patterns.

Current (2026) consensus: Wheels/drum dominant on iOS phone for discoverability; calendar grid + year dropdown on web/Android for scanning; input fallback everywhere for power users / accessibility edge cases. Consistent min/max, locale, and clear selected state.

## 2. Kelyra Date Surfaces Inventory (Existing — Do Not Change)

Searched docs/data-model.md, docs/mvp.md, docs/vision.md, notes/company/calendar-research.md, and repo patterns (no src/ changes performed).

- **Student birthday** (`students.metadata.birthday`): string `YYYY-MM-DD` (full storage). 
  - Display: teacher Details screen shows full or formatted; parent `/parent` view shows `birthday_md` only (month + day, e.g., "Mar 14"; year omitted for privacy). Student `/todo` never sees.
  - Type: date-only. Optional. No year in some views.
  - Surfaces: Teacher student details edit; parent child summary.
- **Assignment / practice due dates**: Implied in `assignments`, `practice_sets`, `submissions` (due for assigned work). 
  - Surfaces: Web grade book / assign flow (teacher), calendar overlays (future layered view per calendar-research.md: school/class/sport/personal, draft/published, hat visibility). Mobile read-only likely.
  - Type: date (future dates typical).
- **System timestamps** (`created_at`, `updated_at` etc. on classes, students, captures, submissions, enrollments, parents): timestamptz, auto, not user-editable date inputs.
- **Other potential** (from enrollment/roster flows, class metadata): None explicit in MVP data model for user date entry beyond birthday and assignment dues. No enrollment start/end dates, no parent DOBs, no event dates in v1.
- **Hats/roles**: Teacher/office (full edit), parent (read month+day on own children), student (none), signed-out (none — no date fields exposed).
- No time components anywhere. All date-only.

Full inventory lives in data-model.md (metadata keys, assignment relations) and calendar-research.md (due date context). No changes made.

## 3. Risks

- **Timezone / school-local date vs UTC**: Store as `date` (YYYY-MM-DD) or `timestamptz` normalized to school midnight in local tz. Display uses device/school locale. Avoid UTC drift on mobile (Expo RN Date handling) vs web. Birthday especially sensitive (no year + local month/day).
- **Privacy (twins/FERPA)**: Birthday year omission already mitigates (per data-model). N/A for non-PII fields like due dates. Matcher never creates students; captures can be unassigned.
- **Locale/format mismatch**: US schools expect MM/DD/YYYY display/input; others DD/MM. Wheels/calendar must respect device locale but allow override? Storage always ISO.
- **Min/max enforcement**: Critical for birthday (e.g., 5–18 yrs ago) vs due dates (today+). Edge cases: leap years, invalid dates.
- **Accessibility gaps**: Incomplete ARIA on custom web calendar → VoiceOver/TalkBack failures. Keyboard-only users stuck without fallback.
- **Mobile vs web parity**: RN wheels on phone; web popover must feel equivalent without native drift.
- **No PII risk in due dates**; birthday is the only potential (handled by display rules).

## 4. Recommendation

One shared primitive (`DateInput` or equivalent, theme-token driven, locale/minmax aware, wheels on mobile RN, popover calendar on web) over per-screen implementations. Ensures consistency across birthday (special display rules), due dates, future calendar surfaces, and all hats. Reduces duplication and accessibility drift. Per-screen only if surface-specific constraints (e.g., read-only parent view) demand it.

## 5. Designer Handoff Questions (Questions Only — No Mockups or Options)

- How should birthday (month+day only, year-stripped for parent view, optional, historical range) differ in presentation/entry from assignment due dates (full date, future-oriented, required on assign)?
- What default min/max ranges per surface (birthday age bounds, due date today+7 or open, school-year constraints)?
- Locale handling strategy: device default + explicit school override? How to surface format (display vs storage) to users?
- Keyboard entry fallback required on web (text input + parse) alongside popover/wheels, or native <input type=date> sufficient?
- Integration points with existing useTheme() tokens (spacing, colors, typography, focus states) — any new token needs identified?
- Accessibility priorities: full VoiceOver/TalkBack grid/wheel support, live regions for calendar changes, ARIA roles for popovers?
- Tablet breakpoint behavior: wheels, docked calendar, or hybrid vs strict phone (modal) / desktop (popover)?
- Error/empty states for invalid/out-of-range dates, especially on birthday privacy view?
- Any surfaces beyond student Details and assignment dues that may need date entry in near-term (enrollments, events)?
- Confirmation needed on "date-only, never time" across all fields?

## Sources Summary
- Apple: UIDatePicker class docs.
- Material: M3 date-pickers overview/guidelines.
- Web: MDN input/date, WAI-ARIA date picker dialog example, accessibility articles (24a11y, WebAIM).
- Kelyra: docs/data-model.md (lines ~386,440 for birthday), docs/mvp.md, notes/company/calendar-research.md.

File ready for CoS to staff ui-ux-designer. No further action per constraints.