OBJECTIVE:
Implement BATCH-v1 **I3**: Split Review (SR-A) persist + keyboard S/M/B + Confirm RPC → captures. Launch kelyra-qa-loop. No git. No live SQL apply.

CONTEXT:
Dual IQG MET. Chrome SR-A web/tablet filmstrip; phone gate (not primary splitter). NA-A Inbox only after Confirm.
I0+I1 merged PR 104 live. I2 worker PR 107 merged. Live ingest_batches already has pages_done (I2 column present — skip re-apply 000003).
PM: notes/company/batch-ingest-pm-lock.md BATCH-06/07/08 if present; else GitHub main.
Architecture I3: always Split Review; Confirm disabled at 0 packets; each non-blank packet → capture student_id null status unassigned; never Approve; never invent student.

REQUIREMENTS:
- SR-A: filmstrip + packet stacks; roster count check-off not per-packet name
- Keyboard: S split, M merge, B blank
- Confirm → captures; teacher_confirmed_split
- 0 packets → Confirm disabled
- Teach seat / class already bound (I1)
- No FileReader-all class PDF to model

CONSTRAINTS:
No git commit/push. No supabase apply. No hot folder. No I4/I5. Children: no ask_user_question.

FILES/AREAS:
src/components/ingest/ Split Review
src/lib/ingest/
docs/ui-design.md Capture
workers/ingest-rasterize (consume pages_done only)

ACCEPTANCE:
Loop terminal; Split Review before any capture insert; unnamed captures only.

RECOMMENDED NEXT ACTION:
I4 after I3 passed.
