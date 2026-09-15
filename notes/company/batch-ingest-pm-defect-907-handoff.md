OBJECTIVE:
Disposition DEFECT t_90708677 (P2: click Upload class stack, no input[type=file] in DOM). FIX-NOW / SCHEDULE / WONTFIX. Binding. No app code.

CONTEXT:
capture.tsx setStackOpen(true) opens ClassStackBinder. File input is created in JS on “Choose files” (document.createElement), not a permanent DOM node. Class must be bound first. Empty Capture ids already WONTFIX (t_3069eb63).

REQUIREMENTS:
If WONTFIX, say QE must drive binder + Choose files. FIX-NOW only if stamp requires a stable file input.

CONSTRAINTS:
No Eng unless FIX-NOW. No git.

ACCEPTANCE:
Disposition stamp.

RECOMMENDED NEXT ACTION:
CoS staffs Eng only if FIX-NOW.
