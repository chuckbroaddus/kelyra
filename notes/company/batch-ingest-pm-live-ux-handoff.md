OBJECTIVE:
Disposition two live BATCH-v1 findings from CEO upload (not QE harness). FIX-NOW / SCHEDULE / WONTFIX. Binding. No app code unless you say FIX-NOW.

CONTEXT:
Live batch c8ba779e-6055-4c7c-ab21-7ce9903c7c00: 429-byte CoS fixture → formatMb 0.0 MB; rasterize blank=true → 0 eligible packets; Split Review red “0 packets · roster 7 · Packet count does not match the roster”. Confirm disabled because 0 non-blank (canConfirmSplit), not because roster≠packets. Roster check-off uses danger color + splitRosterMismatch whenever eligible≠roster.

FINDINGS:
1) formatMb toFixed(1) shows 0.0 MB under ~50KB (ClassStackBinder chip).
2) Roster mismatch copy looks like a hard error; stamp is check-off. 1-page stack vs roster 7 will still go red even when Confirm is allowed.

CONSTRAINTS:
No Eng from this card. No git.

ACCEPTANCE:
Disposition each finding.

RECOMMENDED NEXT ACTION:
CoS staffs Eng only for FIX-NOW.
