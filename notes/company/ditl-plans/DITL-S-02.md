# DITL-S-02 — Student grades Diary Ask

| Field | Value |
|-------|-------|
| Plan ID | DITL-S-02 |
| Title | Student: grades book, how-averages, Diary/ledger, Ask tutor-brief |
| Primary hat | student |
| Other hats | none |
| Support | SUPPORTED grades + Ask; SUPPORTED Diary journal/ledger |
| Regression tags | `grades`, `avg`, `diary`, `ask`, `chrome-student`, `auth`, `ask-dual` |

## Goal / story

Student reviews own grades (All + per-class), understands how grades/why average when published, writes a diary entry with optional photo, opens ledger deep-link if present, uses Ask for help on a focus skill, signs out.

## Preconditions / fixtures

- Student with graded cells and/or published syllabus family/student visibility.
- Diary feature available to student (`/diary`).
- Focus skill or assignment ground for Ask.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in student | `/sign-in` |
| 2 | Grades → All classes grid (own column only) | `/student/grades` |
| 3 | Filter one class; open how-grades / why average if offered | `/student/grades` |
| 4 | Assignment row detail if shipped (S-G4); else note PARTIAL | grades |
| 5 | Hamburger or entry → Diary / Journal | `/diary` |
| 6 | Create entry; optional camera attach; filters/sort if present | `/diary` |
| 7 | Ledger view / deep-link from entry if present | `/diary` ledger UI |
| 8 | **Reverse:** delete or cancel draft entry | `/diary` |
| 9 | Ask with assignment/skill ground | `/ask` |
| 10 | New chat archives prior thread behavior | `/ask` |
| 11 | Confirm no classmate scores visible | grades/people |
| 12 | Sign out | hamburger |

## Lifecycle

Sign-in → review/write/ask → sign-out. Diary entry create→optional delete.

## Multiplicity

Multiple class grade chips; multiple diary entries; Ask history threads.

## Reverse / cancel

Cancel diary draft; clear Ask thread (new chat); back from grade detail.

## Dual-hat

N/A.

## Functions exercised

Student grades; AVG explainers; Diary; Ask; FERPA own-only.

## Explicit non-goals

Teacher gradebook edit; parent Ride; publishing own grades; tutor infinite chat product.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Grades All / class filter | `/student/grades` | explain average / published syllabus read tools |
| Diary create + photo | `/diary` | **Note:** `draft_diary_entry` policy student=`none` → diary Ask **PARTIAL/GAP**; UI diary remains P |
| Ledger deep-link | diary ledger UI | GAP if no tool |
| Ask tutor-brief on focus | tray Ask | primary Ask path; refuse graded finals |
| New chat archive thread | Ask UI | same |

## Suggested QE themes

No classmates in grades; diary photo UI; student diary Ask GAP honest; Ask not a grade.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — diary entries; Ask thread.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Diary journal entry + optional photo | delete entry / discard draft `/diary` | draft then Save — delete via UI; student diary Ask may be GAP | diary rows for student run; photo unref |
| Ask turns | New chat | same | ask_messages archived OK |
| Grades views | read-only | read tools | no grade writes |

**Order:** delete diary test entries → New chat → sign out.
