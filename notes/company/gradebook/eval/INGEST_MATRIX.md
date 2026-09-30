# GB ingest coverage matrix (SRS §5.12 / §11.19–20)

Evaluation-only. Corpus lives at `notes/qa-fixtures/gradebook-ingest/`.

## Extractable fields

### Syllabus (`wizard=syllabus`) — allowed paths

| Path | Values under test | Cases |
|------|-------------------|-------|
| `syllabus.title` | Course titles | S01–S10, S11–S12 |
| `syllabus.engine` | total_points, weighted_points_inside, weighted_percent_inside | S02, S03, S01/S04–S10 |
| `syllabus.within_category` | null/ambiguous → needs_review; points_inside; percent_inside | S01 (amb), S03, S04 |
| `syllabus.categories` | 2–7 cats; weights 50/50, 90-sum, 110-sum; drop_lowest; never_drop | S01,S05,S06,S07,S08 |
| `syllabus.late_rule` | none, flat, per_day, per_hour, floor, hard_deadline | S01,S02,S04,S05,S09,S10 |
| `syllabus.missing_rule` | zero, floor, omit | S02,S04,S08 |
| `syllabus.extra_credit_method` | A/B/C + cap | S03,S07,S09 |
| `syllabus.ec_cap` | numeric | S07 |
| `syllabus.floor` / `ceiling` | period floor/ceiling | S06,S10 |
| `syllabus.retake` | method + cap | S06,S08 |
| `syllabus.rounding` | nearest_whole | S05 |
| `syllabus.narrative` | free text leftover | S09 |
| scale override (via narrative/notes if path absent) | 10-pt, TX70, plus/minus | S04,S10 |
| conduct mark | mentioned in body | S08 |
| lock conflict homework ≤10% | expected conflict when school lock present | S05 notes |

### School policy (`wizard=school`) — allowed paths

| Path | Values under test | Cases |
|------|-------------------|-------|
| `calendar.template` / `period_model` | six_weeks, nine_weeks, semester, trimester | H01–H04 |
| `rollup.preset` | 2/7+1/7, 40/40/20, 45/45/10, 50/50, 85/15 | H01,H02,H03,H05,H06 |
| `credit.passing_threshold` | 60, 70 | H01,H07 |
| `credit.year_link` | true | H04 |
| `scale.bands` / list | no-D TX, plus/minus | H07,H08 |
| `qp.tables` / `qp.method` | numeric-band 4/5/6 chart; letter bonus | H01,H09 |
| `levels.list` | Honors, AP, IB SL/HL, Dual Credit, OnRamps | H01,H05,H09,H10 |
| `gpa.mode` / include / repeat / rank | PE, P/F, CBE, recovery, pre-9; forgive; rank | H06,H08,H10 |
| `locks.map` | homework ≤ 10% | H03 |
| exam exemption | threshold in notes/rollup | H02 |
| eligibility | UIL / athletic | H06 |
| transfer letter→percent | map table | H08 |

## Case assignment

### Syllabi S01–S10

| ID | Focus | Engine | Cats/weights | Late | Other |
|----|-------|--------|--------------|------|-------|
| **S01** | §11.19 exact | weighted_percent_inside | Tests 50 / Daily 50 | −10%/day | drop 1 daily; within_category needs_review |
| S02 | total points | total_points | no % weights | none | missing=0 |
| S03 | points-inside | weighted_points_inside | 3 cats pts | flat −20 | EC method B |
| S04 | percent-inside + TX scale | weighted_percent_inside | 4 cats =100 | per_hour | missing=omit; TX70 |
| S05 | weights sum **90** | weighted_percent_inside | 3 cats 40/30/20 | floor 50 | FR-AI-21 no renormalize |
| S06 | weights sum **110** | weighted_percent_inside | 3 cats 50/40/20 | hard deadline | floor 50 ceiling 100; retake max 70 |
| S07 | 7 categories | weighted_percent_inside | 7 cats =100 | per_day 5 | drop 2 quizzes; never-drop tests; EC A cap 5 |
| S08 | missing floor + conduct | weighted_percent_inside | 2 cats | none | missing floor 50; conduct; retake replace |
| S09 | handwritten-style + EC C | weighted_percent_inside | 5 cats | flat | EC C; narrative |
| S10 | plus/minus scale override | weighted_percent_inside | 3 cats | per_day 10 floor 0 | ceiling 100 |

### Handbooks H01–H10

| ID | Focus |
|----|-------|
| **H01** | §11.20 exact: six-weeks + 2/7+1/7 + AP 5.0 + pass 70 |
| H02 | nine-weeks + 40/40/20 + exam exemption ≥90 |
| H03 | semester + 45/45/10 + homework lock ≤10% |
| H04 | trimester + 50/50 + year-link credit |
| H05 | six-weeks + 85/15 + IB SL/HL + Dual Credit |
| H06 | nine-weeks + eligibility + PE/P/F exclude |
| H07 | pass 60 + no-D letter scale |
| H08 | plus/minus + transfer map + rank GPA |
| H09 | **numeric chart** 97–100 AP 6.0 / Honors 5.0 / Reg 4.0 (FR-AI-24 #6) |
| H10 | OnRamps + Honors +0.5 + repeat/forgive + recovery/pre-9 |

### Real photos + negatives

| ID | Kind | Source |
|----|------|--------|
| S11 | syllabus | `notes/qa-fixtures/ditl/ditl-pen-math-syllabus-T-04.jpg` |
| S12 | syllabus | `notes/qa-fixtures/ditl/ditl-english-syllabus-photo-T-04.jpg` |
| N01 | negative | illegible / blur soup |
| N02 | negative | wrong doc (lunch menu) |
| N03 | negative | two syllabi one photo |

## Photo variants

Clean PNG for all generated cases. Photo JPG (skew/noise/gradient) for: S01,S03,S05,S06,S08,S09,H01,H03,H05,H09. Handwritten-style font: S09 + S08.

## SRS refs

- §5.4 syllabus scheme, §5.9 scales/GPA, §5.11 forms, §5.12 FR-AI-01…24
- §6.3 credit/GPA, §6.5 syllabus
- §11.19 syllabus photo, §11.20 handbook photo
- FR-AI-13 failures, FR-AI-21 no silent renormalize / keep numeric chart
