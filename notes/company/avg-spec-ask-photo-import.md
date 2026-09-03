# AVG-P2: Ask + Photo Syllabus / Rubric Import

**Date:** 2026-09-02  
**Author:** product-manager  
**Ticket:** t_38496169  
**Status:** Spec only — no app code, no Edge functions, no live Ask tools, no kelyra-qa-loop.  
**Depends on:**  
- `notes/company/avg-spec-syllabus-ia.md` (AVG-P1) — draft JSON **must** match IA fields  
- `notes/company/avg-research-syllabus-conventions.md` (AVG-R1)  
- `notes/company/avg-research-rubrics-vs-syllabus.md` (AVG-R2)  
- Live Ask patterns: `src/lib/ai/askPrompt.ts`, `askTools.ts` (`scan_answer_key` → confirm → `create_assignment`), `askToolPolicy.ts`, roster import pending→confirm on class setup  
- Live AI gateway: `invokeAi` + local `npm run ai:dev` / production Edge + `XAI_API_KEY` (no `EXPO_PUBLIC_*` tokens)

**Non-goals of this ticket:** Implementation, migrations, Edge handlers, teacher chrome wireframes (P3), family read UI (P4), Architect SQL, Security write-up (S1 reviews this artifact).

**Product law (fail-closed):**  
Nothing is a grade until the teacher **Approves**.  
Nothing is **class policy** until the teacher **Confirms** (or explicitly saves a draft syllabus).  
Ask never auto-publishes. OCR/LLM failure yields empty draft + message, not silent partial policy.

---

## 1. Product intent

Teacher may **photograph an existing syllabus or rubric** during class setup. The model proposes a **structured draft**. Teacher **edits**. Teacher **Confirms**. Only then does the draft become (or update) the class syllabus.

Primary parse target (R2 + P1): **ClassSyllabus + Categories** (grading policy / weights / class rules).  
Secondary: if the photo is a **rubric**, extract criteria as **assignment-scoring draft only** — never dump rubric levels into category weights.

Parallel live patterns:

| Live pattern | AVG photo import analogy |
|---|---|
| `scan_answer_key` → teacher confirms → `create_assignment` | `scan_class_syllabus` → teacher confirms → publish/save syllabus |
| Roster photo → `roster_imports` pending → teacher confirms names | Syllabus photo → `ask_draft` (or parked import row) → teacher confirms weights |
| Camera proposal sheet (classify job) | Optional camera-proposal entry “Import syllabus” → same draft review UI |
| Matcher never inserts a student | Parser never publishes weights |

---

## 2. Actors and privilege wall

| Actor | May capture / attach photo? | May run parse? | May edit draft? | May Confirm / publish? |
|---|---|---|---|---|
| **Teacher of this class** (taught-class seat; co-teacher later if product grants) | Yes | Yes, **this class only** | Yes | Yes |
| **Office** (superintendent / administrator) | No office-wide syllabus parse in v1 | No school-wide policy import | No | No (office does not own class grade policy in v1 — P1 §3.2 altitude) |
| **Student** | No | No write tools | No | No — Ask read-only explanations of **published** syllabus only (P4 S-A1) |
| **Parent** | No | No write tools | No | No — Ask read-only for **linked child** + published syllabus (P4 P-A1) |
| **Other teachers** | No for classes they do not teach | Denied by RLS / tool class scope | No | No |

Hard rules:

1. **No office-wide parse** — there is no “district default weights from one photo” path in v1.  
2. **No student/parent Ask write** of syllabus, weights, or rules.  
3. **Class scope required** — parse tools need `class_id` (open class or explicit) that the seat teaches.  
4. **Confirm is a teacher UI / RPC action**, not an unsupervised model side effect. Even if a future Ask tool is named `confirm_syllabus`, it must re-check taught-class + human-edited payload and still never invent weights.  
5. Teachers still **never Approve** grades from this path. Syllabus import does not touch submissions.

Capability sketch for future `askToolPolicy` (Architect finalizes names; **do not implement here**):

| Future tool | Policy sketch | Notes |
|---|---|---|
| `scan_class_syllabus` | `assignments.manage` or new `syllabus.manage`, need own/taught class | Read + write **`ask_draft` only** |
| `get_class_syllabus_draft` | same | Returns parked draft for UI |
| `discard_class_syllabus_draft` | same | Clears draft; leaves published intact |
| `confirm_class_syllabus` | same + **explicit teacher confirm** | Prefer dedicated RPC from review UI over free-form Ask chat confirm; if Ask exposes it, require structured args that match the edited form, not raw model re-output |
| Family explain tools | read-only, published only | Out of P2; P4 |

Unknown tool names → denied (existing fail-closed Ask policy).

---

## 3. Entry points (product)

All paths converge on the same draft object and review UI.

### E1 — Ask thread (primary narrative of this ticket)

1. Teacher opens `/ask` with a **taught class** active (or names the class).  
2. Attaches a photo (camera or library) of a printed syllabus / handbook page / rubric.  
3. Says what they want (“import this as Room 14 grading”) **or** Ask sees the page and offers: *Import as class syllabus*, *Treat as assignment rubric*, *Something else?*  
4. On import intent → future `scan_class_syllabus` (server-side vision) → draft lands in review.

### E2 — Class setup (chrome owned by P3; contract here)

From class setup / grade policy screen: **Import from photo** → capture → same parse → same review sheet. Does not require chatting if the teacher is already on setup.

### E3 — Header camera proposal (optional later)

Classifier may propose job `import_syllabus` when the page looks like a policy table. Teacher taps the proposal → same review. Classifier must **not** auto-run publish. No homework-capture side effects.

**Camera rule:** Class-app capture / Ask attach only. Model keys stay server-side (`invokeAi` → local `ai:dev` or Edge). Never `EXPO_PUBLIC_*` model tokens. Do not send syllabus photos through client-side vendor SDKs.

---

## 4. Sequence (happy path)

```mermaid
sequenceDiagram
  actor T as Teacher (taught class)
  participant UI as Class app (Ask or Setup)
  participant AS as assets / storage
  participant GW as AI gateway (ai:dev or Edge)
  participant DB as class_syllabi.ask_draft
  participant RV as Syllabus draft review UI
  participant RPC as Confirm RPC (future)

  T->>UI: Capture / attach photo of syllabus or rubric
  UI->>AS: Upload image (private bucket; short-lived signed URL)
  UI->>GW: invokeAi(parse-class-syllabus) JWT + class_id + imageUrl
  Note over GW: Server loads profile + taught-class check<br/>No EXPO_PUBLIC keys
  GW-->>UI: Structured SyllabusAskDraft JSON + confidences
  UI->>DB: Upsert ask_draft + source_asset_id (status stays draft)
  UI->>RV: Open review sheet (fields editable)
  T->>RV: Edit labels, weights, rules; uncheck low-confidence rows
  alt Confirm publish
    T->>RPC: Confirm with edited payload
    RPC->>DB: Validate sum≈100, keys unique, taught-class RLS
    RPC->>DB: Write categories + policies; status=published (or save draft)
    Note over RPC: Prior published replaced only on explicit confirm<br/>Family sees weights only if publish_to_family
  else Discard / cancel
    T->>RV: Discard draft
    RV->>DB: Clear ask_draft; live published unchanged
  end
```

### Failure / mixed-document path

```mermaid
sequenceDiagram
  actor T as Teacher
  participant GW as AI gateway
  participant UI as Review UI

  T->>GW: Photo (mixed syllabus + rubric page)
  GW-->>UI: document_kind=mixed + warnings[]
  Note over UI: Category weight candidates separate from<br/>rubric_criteria[]; rubric rows never pre-fill weights
  alt Parse hard-fail
    GW-->>UI: empty draft + error message
    Note over UI: No partial silent publish; no invented 40/60 defaults
  end
```

---

## 5. What is extracted: syllabus vs rubric

### 5.1 Document kind detection

| `document_kind` | Meaning | Primary extract | Must not do |
|---|---|---|---|
| `syllabus_policy` | Course/class grading contract | Categories, weights, term structure, class policies | Treat criteria rows as weights |
| `rubric` | Per-assignment scoring guide | `rubric_draft` criteria/levels | Write `syllabus_categories.weight_percent` |
| `mixed` | Both on one photo / multi-page set | Split into both sections with warnings | Merge levels into weights |
| `unknown` | Cannot classify | Empty structured fields + raw `ocr_notes` | Guess district defaults |

### 5.2 Syllabus / policy extract (ClassSyllabus)

Map onto P1 tables — **proposal only** until confirm:

| Source signal (photo) | Draft field | Live target after confirm |
|---|---|---|
| “Homework 10%, Tests 40%, …” | `categories[].label`, `weight_percent` | `syllabus_categories` |
| Category synonyms (HW, Assessments) | `key` guess via GradeKind map | `syllabus_categories.key` |
| Quarters / semesters / year language | `term_structure`, optional `terms[]` | `class_syllabi.term_structure` / terms |
| Late work, redo, makeup, drop lowest, floor, EC | `policies` + per-category `rules` | `class_syllabi.policies`, `categories.rules` |
| Letter scale 90–100 A | `grading_scale` | display jsonb |
| Title / course name line | `title` | `class_syllabi.title` |
| Formative vs summative wording | optional `group` | hint only; not separate calc in v1 |

**v1 rule kinds allowed in draft** (must match P1 §5):

- Class: `extra_credit_allowed`, `late_penalty_mode` (`none`|`manual`), `makeup_window_days`, `redo_max_percent`, `min_floor_percent`, `rounding`, `missing_as_zero`, `publish_to_family`  
- Category: `drop_lowest_n`, `replace_lowest_with_makeup` + `cap_percent`, `default_include_in_average`

Do **not** parse into v1 engine: standards-based mastery, Power Law, SIS codes, AP GPA bumps, multi-term year composite weights (store as `notes` / `deferred_signals` if seen).

### 5.3 Rubric extract (AssignmentRubric — deferred live binding)

| Source signal | Draft field | Live target in AVG v1 |
|---|---|---|
| Criteria names / rows | `rubric_draft.criteria[]` | **Not** category weights. Park as unstructured attachment + draft JSON for a **future** assignment bind, or discard |
| Performance levels / points | `levels[]` / point bands | Assignment scoring later — out of class syllabus publish |
| “Counts as project” line | optional `suggested_category_label` | Hint only on a future assignment; does **not** set class weight |
| Holistic single score scale | `rubric_type: holistic` | Same — not syllabus |

**Forbidden mapping (R2 failure mode #1):**  
“Clarity 4 pts / Organization 4 pts” → **must not** become categories Clarity 50% / Organization 50%.

### 5.4 Ambiguous numbers

| Pattern | Prefer | UI treatment |
|---|---|---|
| Table with % summing ~100 | Category weights | Pre-fill checked if confidence high |
| Rubric total points 20 | Rubric points | Rubric section only |
| “Tests worth 40 points each” | Assignment max_score hint | **Not** category weight unless % table also present |
| IB 1–7 or 4-point mastery | `deferred_signals` | Do not coerce to % weights |

---

## 6. Proposed JSON draft shape (`ask_draft`)

Stored on `class_syllabi.ask_draft` (P1) and/or returned as tool JSON. Versioned so UI can migrate.

```json
{
  "schema_version": 1,
  "draft_id": "uuid-or-client-temp",
  "class_id": "uuid",
  "created_at": "ISO-8601",
  "model_meta": {
    "gateway": "ai_dev | edge",
    "function": "parse-class-syllabus",
    "model_hint": "server-chosen; never client-supplied secret",
    "prompt_version": "syllabus-parse-v1"
  },
  "source": {
    "asset_id": "uuid | null",
    "image_count": 1,
    "page_labels": ["page-1"],
    "capture_channel": "ask_attach | setup_camera | proposal"
  },
  "document_kind": "syllabus_policy | rubric | mixed | unknown",
  "document_kind_confidence": 0.0,
  "warnings": [
    {
      "code": "mixed_document | weights_sum_off | low_ocr | rubric_not_weights | scale_non_percent | multi_column_loss | handwritten_notes | unknown_rule",
      "message": "Human-readable",
      "severity": "info | warn | block"
    }
  ],
  "title": {
    "value": "Room 14 Math — Fall 2026",
    "confidence": 0.0,
    "selected": true
  },
  "calc_mode": {
    "value": "category_weight",
    "confidence": 1.0,
    "selected": true
  },
  "term_structure": {
    "value": "quarters | semesters | year | custom | null",
    "confidence": 0.0,
    "selected": true
  },
  "active_term": {
    "value": "q1 | null",
    "confidence": 0.0,
    "selected": false
  },
  "grading_scale": {
    "value": { "A": [90, 100], "B": [80, 89], "C": [70, 79], "D": [60, 69], "F": [0, 59] },
    "confidence": 0.0,
    "selected": false
  },
  "categories": [
    {
      "temp_id": "c1",
      "label": { "value": "Tests", "confidence": 0.0, "selected": true },
      "key": { "value": "test", "confidence": 0.0, "selected": true },
      "weight_percent": { "value": 40, "confidence": 0.0, "selected": true },
      "group": { "value": "summative | formative | null", "confidence": 0.0, "selected": false },
      "default_include_in_average": { "value": false, "confidence": 0.0, "selected": true },
      "rules": {
        "drop_lowest_n": { "value": 0, "confidence": 0.0, "selected": false },
        "replace_lowest_with_makeup": {
          "value": {
            "enabled": true,
            "makeup_category_key": "test",
            "cap_percent": 85,
            "max_replacements": 1
          },
          "confidence": 0.0,
          "selected": false
        }
      },
      "source_ref": { "page": "page-1", "snippet": "Tests 40%" }
    }
  ],
  "policies": {
    "extra_credit_allowed": { "value": false, "confidence": 0.0, "selected": false },
    "late_penalty_mode": { "value": "manual", "confidence": 0.0, "selected": false },
    "makeup_window_days": { "value": null, "confidence": 0.0, "selected": false },
    "redo_max_percent": { "value": null, "confidence": 0.0, "selected": false },
    "min_floor_percent": { "value": null, "confidence": 0.0, "selected": false },
    "rounding": { "value": "nearest_whole", "confidence": 0.0, "selected": true },
    "missing_as_zero": { "value": false, "confidence": 0.0, "selected": true },
    "publish_to_family": { "value": true, "confidence": 1.0, "selected": true }
  },
  "terms": [
    {
      "key": { "value": "q1", "confidence": 0.0, "selected": false },
      "label": { "value": "Quarter 1", "confidence": 0.0, "selected": false },
      "weight_percent": { "value": null, "confidence": 0.0, "selected": false }
    }
  ],
  "rubric_draft": {
    "present": false,
    "rubric_type": "analytic | holistic | single_point | checklist | unknown | null",
    "title": null,
    "suggested_category_label": null,
    "criteria": [
      {
        "name": "Clarity",
        "description": null,
        "levels": [{ "label": "4", "points": 4, "descriptor": "..." }],
        "confidence": 0.0,
        "selected": false
      }
    ],
    "notes": "Not applied to class weights. Bind later to an assignment or discard."
  },
  "deferred_signals": [
    {
      "kind": "standards_based | total_points_mode | ap_gpa | year_composite | other",
      "text": "As printed",
      "confidence": 0.0
    }
  ],
  "ocr_notes": "Optional free text the model saw but could not structure",
  "overall_confidence": 0.0,
  "status": "proposed | teacher_edited | discarded | confirmed"
}
```

### 6.1 Field wrapper convention

Most teacher-editable facts use:

```ts
type DraftField<T> = {
  value: T;
  confidence: number; // 0..1 from model; UI may ignore after edit
  selected: boolean;  // teacher include/exclude on confirm
};
```

- **Confirm payload** = only `selected: true` fields (after teacher edits).  
- Unselected categories are dropped, not written at weight 0 unless teacher explicitly keeps a 0% inactive row (discouraged).  
- Model confidence never becomes a grade or a live policy without `selected` + Confirm.

### 6.2 Key mapping (labels → GradeKind)

Prefer existing `GRADE_KINDS` keys from `src/lib/grade/marks.ts`:

`homework`, `quiz`, `test`, `midterm`, `final`, `project`, `presentation`, `participation`, `behavior`, `other`

| Printed label (examples) | Suggested key |
|---|---|
| Homework, HW, Practice | `homework` |
| Quiz, Quizzes | `quiz` |
| Test, Tests, Unit tests, Assessments (if clearly tests) | `test` |
| Project, Projects | `project` |
| Participation, Classwork (if participation-like) | `participation` or custom + teacher pick |
| Unknown bucket | `other` or new custom key teacher edits |

Custom keys allowed per P1 (class-local). Teacher must confirm key + label. **Never** set `default_include_in_average=true` merely because key is `quiz` or `test`.

### 6.3 Weight validation (draft vs publish)

| Stage | Rule |
|---|---|
| After parse | May sum ≠ 100; warning `weights_sum_off`; do not auto-normalize silently |
| Review UI | Show running sum; block **Publish** until sum = 100 ± 0.01 **or** teacher adds explicit remainder category |
| Save draft (unpublished) | May allow incomplete weights with banner |
| Confirm publish | Hard validate per P1 §9.1 |

**No silent district defaults** (no auto 40/60). Empty parse → empty categories array.

---

## 7. Confidence, review UI, confirmation gates

### 7.1 Confidence thresholds (product defaults)

| Band | Range | UI |
|---|---|---|
| High | ≥ 0.85 | Selected on; normal ink |
| Medium | 0.55 – 0.84 | Selected on; amber highlight; “Check this” |
| Low | < 0.55 | **Selected off** by default; row expanded; must opt in |
| Document kind unknown | — | No categories pre-selected; manual entry encouraged |

`document_kind_confidence` low → force kind picker (Syllabus policy / Rubric only / Both / Cancel).

### 7.2 Review UI inventory (contract for P3)

| Element | Behavior |
|---|---|
| Photo thumb | Opens full image; multi-page strip if multiple assets |
| Kind banner | syllabus / rubric / mixed / unknown + warnings |
| Category list | Editable label, key chip, weight %, selected checkbox, confidence tint |
| Add / remove category | Always available (manual override of AI) |
| Sum meter | Live total %; error state if publish blocked |
| Rules section | Drop lowest, makeup+cap, floor, missing-as-zero, EC, late mode — each toggled; low confidence off |
| Rubric section | Collapsed “Scoring guide (not class weights)” with criteria; **no path** to copy into weights in one tap without explicit “Convert criterion to category” (discouraged; default absent in v1) |
| Family publish | `publish_to_family` default true when publishing (P1); teacher can clear |
| Primary actions | **Publish** · **Save draft** · **Discard** |
| Secondary | **Re-scan** (replaces `ask_draft` only) · **Enter manually** (empty form) |

### 7.3 Confirmation gates (ordered)

1. **AuthZ:** signed-in profile teaches `class_id` (RLS + RPC).  
2. **Human edit surface shown** — Confirm disabled until review UI mounted (no one-tap blind confirm from chat alone unless payload is the edited form snapshot).  
3. **Kind gate:** if `rubric` only → Publish class syllabus disabled; offer “Save rubric for later” or discard. if `mixed` → teacher must acknowledge split warning.  
4. **Selection gate:** ≥1 selected category with weight for Publish.  
5. **Sum gate:** weights of selected active categories = 100 ± 0.01.  
6. **Key uniqueness** within syllabus.  
7. **No quiz→include shortcut** in written payload.  
8. **Replace gate:** if a **published** syllabus already exists → destructive confirm copy: “Replace live weights for this class? Family view will update. Past approved scores stay; averages recompute.”  
9. **Draft-only path:** Save draft writes `status=draft`, never family-visible weights.  
10. **Cancel / Discard:** clears `ask_draft` (and optional unref source asset if unused); **published row untouched**.

### 7.4 Re-import

Re-scan **replaces `ask_draft` only**. Live published syllabus changes only on a new Confirm. Concurrent teacher manual edit: last Confirm wins; Architect may add `updated_at` / version token.

### 7.5 What Confirm writes

On Publish (success):

- `class_syllabi`: title, calc_mode=`category_weight`, term_structure, policies, grading_scale, `source=ask_import`, `source_asset_id`, `status=published`, `published_at`, clear or archive `ask_draft`  
- `syllabus_categories`: selected rows only  
- Optional terms rows  
- **Does not** write submissions, approved scores, or assignment `include_in_average` bulk flips  
- **Does not** create students, classes, or office policies  
- Rubric draft: either discarded, stored as attachment metadata for later assignment, or linked as non-policy JSON — **Architect**; product: not categories

---

## 8. AI gateway shape (future — do not implement)

Mirror `analyze-answer-key` / `extract-roster`:

| Layer | Behavior |
|---|---|
| Client | `invokeAi('parse-class-syllabus', { classId, imageUrl, mimeType? })` via existing gateway |
| Local dev | `npm run ai:dev` + Grok CLI OAuth (`~/.grok/auth.json`) |
| Production | Edge function, `verify_jwt=true`, secrets `XAI_API_KEY` (and/or Gemini if product standardizes vision on Edge — follow live Ask/homework vision choice; **no client keys**) |
| Auth | JWT required; load profile + grants; **taught-class check** before vision call |
| Input | Signed URL or storage path the server may fetch (existing SSRF rules from Ask image hydrate — no arbitrary SSRF) |
| Output | `SyllabusAskDraft` JSON only — no side-effect publish inside the model function |
| Metering | Existing call meter / ai-spend patterns |
| Logging | No full student roster in prompt; photo may incidentally contain student names on a syllabus header — treat as class artifact (see FERPA §10) |

Suggested Edge/AI name: `parse-class-syllabus` (vision).  
Ask tool name: `scan_class_syllabus` (orchestrates invoke + parks draft).  
Persist helper: client or RPC `upsert_syllabus_ask_draft` — still not publish.

**Prompt hard rules (for future implementer):**

- Classify document_kind first.  
- Extract category % weights only from policy tables / “final grade” sections.  
- Never map rubric criteria → weights.  
- Prefer GradeKind keys; leave confidence low on fuzzy matches.  
- Default `missing_as_zero=false`, `extra_credit_allowed=false`, `default_include_in_average=false`.  
- If weights missing, return empty categories + warning — do not invent.  
- Output schema_versioned JSON; no prose-only success.

---

## 9. Multi-page and capture quality

| Case | Product behavior |
|---|---|
| Multiple photos in one Ask turn | Parse as ordered pages; one merged draft; warnings on conflicts |
| Conflicting weights across pages | Prefer explicit “Grading” section; flag conflict; select neither high-confidence until teacher picks |
| Blurry / unreadable | `overall_confidence` low; empty or sparse draft; message “Could not read this page. Try better light or enter weights manually.” |
| Handwritten annotations on master syllabus | Prefer printed table; handwritten → low confidence / notes |
| Student-filled rubric (names/scores) | document_kind rubric; strip student-identifying annotations from structured criteria when possible; do not create grade cells |

---

## 10. FERPA / privacy notes for Security (AVG-S1)

Not a full threat model — **inputs for** `notes/company/avg-spec-security-ferpa.md`.

### 10.1 Data classes

| Data | Sensitivity | Notes |
|---|---|---|
| Syllabus photo (policy text, weights) | Low–moderate institutional | Usually not student education records; may still show room, teacher name, school header |
| Photo that includes **student roster, scores, faces, IEP flags** on the same sheet | **High** | Fail closed: parser should not OCR free-text student score tables into drafts; teacher warned if model detects “student work / grade list” |
| `ask_draft` JSON | Teacher-only | Never family-visible (P1 / P4) |
| Published weights | Intended family-visible when `publish_to_family` | Not secret (R1) |
| Model prompts / logs | Risk of prompt leakage | Do not log full image bytes in plain app logs; retain server logs per school retention policy |

### 10.2 Threats to call out in S1

1. **Stored syllabus images** — retention, who can read `source_asset_id`, delete on discard, bucket not public.  
2. **Model prompt leakage** — third-party vision provider sees the page image; DPA / no training flags as applicable; minimize multi-class batching.  
3. **Ask privilege escalation** — client must not widen tools; server policy twin (`askToolPolicy`); unknown tools denied; office cannot publish class syllabus via this path in v1.  
4. **Write-without-confirm** — vision Edge function must not UPDATE published syllabus; only draft park + Confirm RPC.  
5. **Parent/student tool surface** — no scan/confirm tools on those seats; read published only.  
6. **Cross-class IDOR** — `class_id` in body must match teaches_class; signed URL scoped.  
7. **Incidental PII** — student names on a photographed syllabus header or mixed grade printout.  
8. **Retention** — recommend: draft images deletable on Discard; published source image optional keep for audit vs delete after N days (S1 decides must-fix).  
9. **No grade side effects** — import path cannot Approve or write `approved_score`.

### 10.3 RLS sketch (for Architect + Security)

- `class_syllabi` / categories: teacher CRUD for taught class; students/parents SELECT where `status=published` AND `publish_to_family` AND enrollment/link.  
- `ask_draft` column: teacher only (exclude from family views / API serializers).  
- `source_asset_id`: teacher read; not family.  
- Confirm RPC: `security definer`, `auth.uid()` teaches class, validates payload.

---

## 11. Fail-closed matrix

| Event | System behavior |
|---|---|
| Vision timeout / 5xx | Empty draft; toast error; no publish |
| JWT missing / wrong seat | 401/403; no parse |
| Class not taught by caller | Deny |
| Parent/student calls scan tool | Tool absent / deny |
| Model returns weights summing 180% | Draft with warning; Publish blocked until edit |
| Model returns rubric as categories | Server-side schema check: if `document_kind=rubric`, strip weight writes; UI shows rubric section only |
| Model sets quiz include true by kind | Server forces `default_include_in_average` false unless explicit policy text + high confidence **and** teacher leaves selected (prefer always default false) |
| Confirm with empty categories | Reject publish |
| Discard | Published unchanged |
| Partial JSON | Treat as fail; do not merge half-fields into live row |

---

## 12. Acceptance criteria (future implementation — not this ticket)

Gate remains **AVG HOLD / CEO** (`t_eea9ba55`). When authorized:

1. Spec artifact present: this file.  
2. `parse-class-syllabus` (name TBD) server-side only; local ai:dev + Edge parity; no `EXPO_PUBLIC_` keys.  
3. Ask tool(s) registered in client + Edge `askToolPolicy` twins; parent/student/office walls tested.  
4. Draft parks on `ask_draft` (or equivalent) without publishing.  
5. Review UI enforces sum-to-100, kind split, low-confidence unchecked.  
6. Confirm RPC publishes only selected fields; replace warning if live exists.  
7. Rubric criteria never become category weights in automated mapping tests.  
8. No submission/grade writes from this path.  
9. Family serializers omit `ask_draft` and source photos.  
10. Security S1 findings addressed for v1 must-fix.  
11. Unit fixtures: clean weight table; mixed page; rubric-only; unreadable; sum ≠ 100; makeup cap text.

**Explicit non-acceptance:** shipping parse that auto-publishes; silent default weights; quiz→include shortcut; office-wide import; student/parent write tools.

---

## 13. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Park draft only on `class_syllabi.ask_draft` vs separate `syllabus_imports` table (roster_imports twin)? | Architect |
| 2 | Multi-image merge algorithm details | Architect + implementer |
| 3 | Whether Ask may call `confirm_class_syllabus` or Confirm is **setup UI only** (PM lean: **UI/RPC primary**; Ask confirms only with structured edited payload) | PM + Architect |
| 4 | Retention TTL for source photos after publish | Security S1 |
| 5 | Gemini vs xAI vision for this function in production | Architect / existing Edge convention |
| 6 | Co-teacher confirm rights | PM later; v1 = same as teaches_class |
| 7 | “Convert rubric criterion → category” escape hatch — ship or forbid in v1? | PM lean: **forbid** automated convert |

---

## 14. Downstream

| Ticket | Role |
|---|---|
| AVG-P3 | Wire Import from photo into teacher setup chrome using this review contract |
| AVG-P4 | Family never sees draft (already specified) |
| AVG-A1 `t_cb0b3bcc` | Schema + tool names + RLS from §6–8, §10.3 |
| AVG-S1 `t_60338b4e` | FERPA/security review using §10 |
| AVG-GATE | CEO go/no-go before any qa-loop |

---

## 15. Sources & decisions log

- P1 IA: propose vs confirm; `ask_draft`; fail-closed; taught-class only; rubric ≠ weights.  
- R1: category weighting primary; common rule knobs; weights parent-visible when published.  
- R2: parse ClassSyllabus first; rubric deferred; weight-vs-score failure modes.  
- Live Ask: photo → read tool → human confirm → write tool (`scan_answer_key` / `create_assignment`); policy map deny-by-default.  
- Live roster import: pending row → confirm / discard.  
- CEO: type averages → weighted final; nothing is a grade until Approve; no quiz shortcut.

**Decisions (PM):**  
1. v1 parse target = syllabus policy + categories; rubric is non-weight draft only.  
2. Confirm gates are teacher UI/RPC-first; Ask never auto-publishes.  
3. Low confidence fields default **unselected**.  
4. No silent weight normalization or district defaults.  
5. Office/student/parent cannot write syllabus via Ask in v1.  
6. Draft JSON schema_version = 1 matches P1 field names (`weight_percent`, policies, rules).

---

**RECOMMENDED NEXT ACTION:** Security review of this spec (AVG-S1) + Architect review (AVG-A1). No app code. No kelyra-qa-loop. Implementation remains CEO-gated.
