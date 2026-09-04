# Diary + Ledger Research Note (DIARY-R1 / Refresh of DR-8)
**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to PM child  
**Citations:** Primary sources from ed.gov/FERPA, Jupiter SIS, Google Play Teacher Notes, Pulse Connect taxonomy, Google KMS docs, School Pathways help.

## Executive Summary
The original DR-8 concluded against making a diary/ledger the home screen. CEO direction (2026-09-03) shifts to dedicated surfaces for **private Diary** (owner-only, encrypted, rich media + STT) and **immutable-ish Activity Ledger** (auto-captured Kelyra actions for discrepancy defense). These are distinct from SIS archival/compliance layers and from public discipline systems.

**v1 Recommendation (MVP cut):** 
- Diary: Text + STT entry, basic photo/video attach (owner-only store), simple search.
- Ledger: Auto-log of assign/grade/syllabus/lesson actions with timestamp, actor, target; basic filter/sort by date/action/student (no student mixing).
- Later: Advanced encryption (envelope), full STT/NL "add entry for today", immutable ledger with hash chain, advanced UX search.

Gaps: Few pure private diary products; most "anecdotal" tools blur into behavior tracking or lack encryption. Legal risk high if discipline notes leak into education records.

## 1. Competitors & School Products
### Private / Anecdotal Teacher Notes
- **Teacher Notes (In Pocket Solutions, Google Play, updated Jul 2026)**: Mobile/Chromebook app for anecdotal student + parent logs. Features: frequent comments list, positive/needs improvement flags, PDF reports, email summaries, Dropbox/Drive backup. Free tier: 1 class/40 students/10 notes; Premium: 20 classes/200 students/400 notes. Data encrypted in transit. Privacy policy exists but no on-device encryption advertised. Supports photos? (reviews request it). Used for parent communication tracking. (Source: play.google.com/store/apps/details?id=com.apps.ips.teachernotes3)
- Similar: Many teachers use general tools (Evernote, Day One, Google Keep) for private notes, but lack school-specific STT, student linking without mixing, or FERPA-aware separation.

### SIS Activity / Audit Logs (Ledger-like)
- **Jupiter SIS**: Built-in Behavior Tracking, Discipline Logs, Merit Points, Audit Log ("who entered/changed roll"), Discipline Reports/Stats. Learning logs/activity tracking. Exports include behavior. Strong on compliance/audit but not private owner-only diary. (jupitered.com/SIS_public.php)
- **School Pathways / PLS**: Learning Logs for educational activities (logged by student/parent/teacher), Activity Box (green/red for daily engagement), detailed per-day activity views. Separate from gradebook. (help.schoolpathways.com)
- **PowerSchool, Infinite Campus, Skyward**: Standard SIS archival (attendance, grades, demographics). Not designed for relational/formative teacher observations (Hattie 2009 variables). (pulseconnect.us article)

### Student Support vs SIS Gap (Pulse Connect taxonomy, 2026)
- SIS = archival/compliance layer (auditor questions, seat time, GPA).
- Student Support Platforms = relational/formative (teacher observations, "why" behind data, voice notes on the walk to car).
- Gap: Teachers maintain Google Sheets or private notes because no dedicated surface captures live relational data without laundering into compliance forms. (pulseconnect.us/articles/student-support-platform-vs-student-information-system)

No dominant "private encrypted diary + ledger" product in K-12; most either public behavior systems or general note apps.

## 2. Encryption Models & Subpoena/Admin Access
- **On-device only**: Data never leaves device (e.g., device encryption + local DB). Strongest privacy (subpoena requires physical device + unlock). Drawbacks: no sync across devices, no server search/STT, loss on device failure. Rare in collaborative edtech.
- **Envelope encryption** (recommended for sync use): Data encrypted with per-record DEK; DEK wrapped by KEK (stored in KMS, never leaves secure boundary). Server stores ciphertext + wrapped DEK. Access requires KEK unwrap (policy-controlled). Google Cloud KMS default for scale. Allows search if metadata unencrypted or client-side. (docs.cloud.google.com/kms/docs/envelope-encryption; hexnode.com/blogs)
- **RLS-only (Supabase/Postgres style)**: Row-level policies enforce owner access at query time. Simple but admins/DBA or subpoena can bypass via direct DB access or elevated roles. Not true encryption at rest for subpoena defense.
- **Honest assessment**: Even "private" on-device or envelope can be compelled (court order to provider or user). Admin (principal) access depends on role policies; owner-only means teacher/staff/parent silos. Mixing Saydee vs Sydnee violates constraint. Discipline notes in education records are FERPA-protected but discoverable.

**Recommendation**: Envelope + RLS for v1+; on-device for ultra-sensitive future. Document "who can read" matrix (owner, subpoena, emergency safety exception).

## 3. Discipline-Note Legal/HR Risk
- FERPA protects education records (including disciplinary if maintained by institution). Private teacher notes may qualify as "education records" if shared or institutionally maintained → subject to parent access, amendment requests, disclosure logs.
- Exceptions: Safety emergencies, legitimate educational interest (other school officials), transfer to new school, parents of dependents, law enforcement records (separate from education records). (studentprivacy.ed.gov/ferpa; ed.gov/media/document/faqs-ferpa-102031.pdf; edutranscript.com/blog/ferpa-disciplinary-records-complete-guide.html)
- Risks: 
  - Principal/HR subpoena or internal review of "private" files containing student names.
  - Permanent reputational harm to minors (vs juvenile expungement).
  - K-12 vs higher-ed double standard (colleges can disclose more to victims/community).
  - Never design Office-visible student discipline as the diary (constraint).
- Mitigation: Strict owner-only, separate stores per hat (teacher/staff/parent), clear labeling "personal reflection only — not official record", no auto-sharing.

## 4. Search/Filter/Sort UX, STT, NL Entry vs Auto-Capture
- **UX Patterns** (from note apps + SIS): 
  - Filter by date range, student (single), action type, positive/negative flag, search text/tags.
  - Sort: chronological, relevance, flagged items first.
  - List views with quick preview; detail modal with media.
  - Common in Teacher Notes, Jupiter discipline logs.
- **STT / NL "add a diary entry for today: …"**: Common in modern note apps (voice-to-text + AI summary). Integrate Grok-like for natural language parsing into structured entry (date, tags, media). Avoid hallucinated facts.
- **Ledger auto-capture**: From existing RPCs/actions (assign, grade, syllabus update, lesson plan). Immutable-ish (append-only log with timestamp, actor hat, target IDs). Searchable by student/action without exposing full diary.
- Distinction: Diary = manual/private reflection; Ledger = system-generated audit trail for discrepancy defense (e.g., "why was this grade changed?").

## 5. Updated Conclusions vs Original DR-8
- Original: Do not make all-in-one diary the home screen (too much surface area, privacy mixing risk).
- Refresh: Dedicated tabs/surfaces (Diary | Ledger) are viable as separate features. Diary fills relational gap identified in Pulse taxonomy; Ledger provides compliance-grade audit without turning every action into public behavior log.
- v1 cut prioritizes privacy silos + basic capture over full encryption or advanced NL. PM stories can reference this note directly.
- Open gaps: Real-world subpoena cases for teacher private notes (sparse public data); STT accuracy in noisy classroom vs quiet home; cross-hat sharing (never mix children).

## Recommended Feature Cut for v1 vs Later
**v1 (MVP)**:
- Diary: Text entry, STT button, basic photo attach, owner-only, per-hat stores, simple date/text search.
- Ledger: Auto-log Kelyra actions (assign/grade/etc.), timestamp/actor/target, filter by date/action, export for defense.
- No discipline framing; no admin read; no student mixing.

**Later**:
- Envelope encryption + key rotation.
- Video/notes with on-device processing.
- Advanced NL parsing, tags, reminders.
- Hash-chained immutable ledger.
- Integration with existing Kelyra RPCs for auto-capture.

**Handoff to PM**: This note + citations ready for story writing. No re-research needed. CoS can ARM-grant product-manager child.

**Files/Areas touched**: notes/company/diary-ledger-research.md (new)

**Verification**: All claims backed by extracted sources; no invention. Constraints followed (no code, no implementation).

**OPEN ISSUES**: Need primary sources on real teacher usage of private notes vs SIS (anecdotal only here); exact Supabase RLS subpoena exposure in education context.

**RECOMMENDED NEXT ACTION**: CoS ARM-grants product-manager child for story decomposition.