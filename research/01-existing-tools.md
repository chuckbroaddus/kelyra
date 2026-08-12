# K-12 AI classroom tools (2026) — landscape for Kelyra

**Status:** Partial (24/24 verified claims retained; see coverage gaps)  
**Date:** 2026-08-12  
**Query:** Competitive analysis of AI classroom and personalized-learning tools for K-12 teachers, prioritized for Kelyra’s voice/photo/NL intake, incremental student metadata, grade book, individualized practice, and parent-facing incentives.

## Executive takeaway

2026 classroom AI is split.

- MagicSchool, Brisk Teaching, Khanmigo, SchoolAI, Diffit, and CoGrader mainly cut retyping around **lessons, feedback, and grading**.
- Automatic **name-to-record filing of ad-hoc notes** lives in smaller voice-observation apps (Voice Assess, Pulse Connect, Teachers Tally).
- **Gradebooks, individual exercise assignment, and parent-facing incentives** are more mature in Seesaw, Google Classroom, ClassDojo, and Khan Academy than in the generative-AI suites.
- Individual-teacher SKUs among the named AI vendors are mostly free or low-cost monthly plans, and those vendors generally claim FERPA compliance.

No primary page inspected shows MagicSchool, Brisk, Khanmigo, SchoolAI, Diffit, or CoGrader as **one product** that combines teacher voice dictation, photo-of-documents, natural-language prompts, and mobile capture of homework plus student metadata.

## Voice, photo, and natural-language intake

CoGrader lets teachers photograph handwritten essays on a phone, upload a multi-student scanner PDF that it tries to split by student, or upload PDF/JPG/PNG files, then grade the set against a rubric and export a gradebook CSV without retyping the papers. [S1] Brisk Teaching converts uploaded photos of handwritten assignments, whiteboard shots, textbook pages, and diagrams into feedback, notes, lessons, or slides, and works over images, PDFs, and more. [S2] Khanmigo’s Tutor Me chat accepts PNG/JPEG via file, URL, or in-browser camera—including handwritten math, diagrams, phone photos, and scans—but the native Khan Academy app does not support image input, and this path is learner/tutor problem help rather than teacher homework-metadata intake. [S3]

Diffit generates differentiated materials from a natural-language topic, standard, or prompt, or from pasted text, an uploaded PDF, or a URL/video transcript, then lets teachers refine the result by telling Diffit Chat what they need (PDF attach limits: 200,000 characters on premium, 40,000 on basic). [S4] SchoolAI lets teachers upload supporting documentation when generating paperwork in Build Your Own Tool, and lets students upload drafts, notes, and projects into Spaces so Dot can review that work instead of the teacher re-entering it. [S5] Snorkl captures student voice plus whiteboard drawings so AI can give feedback and teachers can see reasoning without transcribing spoken or drawn work. [S6]

## Incremental metadata and automatic record placement

Automatic placement of incomplete, spoken observations is the exception. Voice Assess matches spoken names to the class list, saves each note automatically, and can split one recording into separate student notes. [S7] Pulse Connect turns a form-free spoken observation into a structured note, identifies the student, and attaches the full text, tags, and timestamp to the relevant record—including observations that are still incomplete. [S8] Teachers Tally analyzes transcribed voice memos to identify the student referred to and assigns those insights to the corresponding pupil profile. [S9]

Mainstream student-record tools stay incremental but manual. Otus stores running notes on a student profile (up to 1,000 characters) only after the teacher opens that student or checks student boxes. [S10] Brightwheel staff must select the student(s) before adding notes, photos, or skills. [S11] Parent Portal supports voice, photo, and video micro-observations that attach to a child’s profile through teacher tagging, not by auto-filing incomplete fields from a freeform capture. [S12]

## Gradebooks, individual assignments, and incentives

Seesaw’s Gradebook is a school/district web tab with Activities View and Standards View; students and families cannot see it, and teachers share a copied progress report via Message to Family or export CSV. [S13] Teachers assign Activities from the web to selected classes, student groups, and/or individual students with start and due dates; students open them from the class Activities tab, and families see only their child’s approved response. [S14] Google Classroom has a teacher-only Grades page—downloadable as Google Sheets or CSV, with overall grades next to names when Total points or Weighted by category is used—and lets teachers post an assignment to individual students (unless posting to multiple classes; max 100) or student groups from the Classwork create flow. [S15]

ClassDojo incentives are teacher-awarded skill points that can be shared with families as all points, only positive ones, or none; parents view Point Reports on the web for the past two weeks, while month/year reports require ClassDojo Plus on the app. [S16] Teachers assign Portfolio activities from the class web Portfolios tab to the whole class or selected students; work appears immediately in each student’s To-Dos. [S17] Khan Academy teachers assign articles, videos, exercises, quizzes, unit tests, course challenges, and Khanmigo Activities to selected students from the Teacher Dashboard; Reimagined classrooms use Gems and teacher-set Gem Challenges, individual assignments feed Daily and Weekly Missions, and assignment scores download as CSV. [S18]

## Individual-teacher pricing and FERPA

Among the named AI classroom vendors, individual teachers can usually start free; paid self-serve tiers sit in a narrow monthly band, SchoolAI is the outlier with no individual paid SKU, and FERPA claims are standard, sometimes paired with a school-official role or SOC 2.

| Tool | Individual teacher plans | FERPA / compliance |
| --- | --- | --- |
| MagicSchool | Forever Free $0; Plus $8.33 USD/user/month billed annually or $12.99 USD/month | iKeepSafe FERPA Certified; school official; plans marked FERPA, COPPA, SOC-2, GDPR, Ed Law 2-D [S19] |
| Brisk Teaching | Free Forever (20+ essential tools, 14-day premium trial); Educator Pro ($14.99 listed June 2026, billing period not stated on the product page) | FERPA and COPPA compliant; School Official when providing products to schools [S20] |
| Khanmigo / Khan Academy | Teacher tools free; consumer/family $4/month or $44/year; Districts Enterprise Starter $10/student/year | Enterprise Starter described as SOC-audited, FERPA and COPPA compliant [S21] |
| SchoolAI | No self-serve individual paid plan; Free trial with no expiration and 5 Space launches/year (Pro and Scale only via school/district) | FERPA, COPPA, and SOC 2 Type 2 on every plan; 1EdTech certified; Free-trial DPA via Terms of Service [S22] |
| Diffit | Premium $14.99/month or $149.99/year, credit card only | FERPA and COPPA compliant; does not collect student data [S23] |
| CoGrader | Starter free (100 student submissions/month); Standard $15/month billed annually or $19/month | FERPA/COPPA aligned; FERPA school official; SOC 2 Type 1; NIST 1.1; student data not used to train models [S24] |

Classroom student Khanmigo access is available through school or district implementations.

## Implications for Kelyra

1. **The wedge is auto-filing, not generation.** Lesson/feedback/grading generation is crowded. Almost nobody in the named AI suites auto-places incomplete spoken or photographed fragments onto the correct student record.
2. **Closest analogs are small voice-observation apps**, not MagicSchool-class products. Study Voice Assess, Pulse Connect, and Teachers Tally for name-matching, split-recording, and incomplete-note UX.
3. **Capture and records are still two products.** Photo/PDF intake (CoGrader, Brisk) does not imply roster routing. Voice observation apps do not imply gradebook + individualized practice.
4. **Gradebook + individual assign is table stakes** if Kelyra wants to replace daily workflow. Seesaw, Google Classroom, and Khan Academy already do per-student assignment and teacher-only grades.
5. **Incentives are a different product category** (ClassDojo points; Khan Gems). Academic gradebooks are usually hidden from families.
6. **Pricing room exists around $8–$15/month** for individual teachers, with a free tier expected. FERPA/COPPA (and preferably school-official + SOC 2) is required language, not a differentiator.

## Sources

- [S1] How to Import and Grade Handwritten Essays with CoGrader — https://intercom.help/cograder/en/articles/9879780-how-to-import-and-grade-handwritten-essays-with-cograder
- [S2] Upload Photos to Create Lesson Content and Generate Feedback — https://www.briskteaching.com/post/upload-photos-to-create-lesson-content-and-generate-feedback
- [S3] What kind of images can I upload to Khanmigo? — https://support.khanacademy.org/hc/en-us/articles/36868912022541-What-kind-of-images-can-I-upload-to-Khanmigo
- [S4] FAQ — Diffit — https://web.diffit.me/faq
- [S5] Use the Build Your Own Tool — https://help.schoolai.com/en/articles/11526179-use-the-build-your-own-tool
- [S6] Snorkl — https://snorkl.app/
- [S7] Voice Assess — App Store — https://apps.apple.com/us/app/voice-assess/id6761962537
- [S8] Voice Reporting for Teachers — https://www.pulseconnect.us/articles/voice-reporting-for-teachers-k12
- [S9] Teachers Tally — https://teacherstally.com/
- [S10] Notes and Report Card Comments \| Otus Help Center — https://help.otus.com/en/articles/894773-notes-and-report-card-comments
- [S11] Learning: Log Observations \| Brightwheel Help Center — https://help.mybrightwheel.com/en/articles/6968971-learning-log-observations
- [S12] How Micro Observations Eliminate Last-Minute Report Panic — https://parentportal.com/blog/view/20260802/how-micro-observations-eliminate-last-minute-report-panic/
- [S13] Getting started with Gradebook – Seesaw Help Center — https://help.seesaw.me/hc/en-us/articles/360059017052-Getting-started-with-Gradebook
- [S14] How to create, edit, and assign Activities in Seesaw — https://help.seesaw.me/hc/en-us/articles/17964278341005-How-to-create-edit-and-assign-Activities-in-Seesaw
- [S15] View or update your gradebook – Classroom Help — https://support.google.com/edu/classroom/answer/9199710?hl=en
- [S16] View Your Child’s Point Report – ClassDojo Help Center — https://help.classdojo.com/hc/en-us/articles/360027931771-View-Your-Child-s-Point-Report
- [S17] How to Assign Student Portfolio Activities to Students – ClassDojo — https://help.classdojo.com/hc/en-us/articles/360009899492-How-to-Assign-Student-Portfolio-Activities-to-Students
- [S18] How do I make assignments for my students on Khan Academy? — https://support.khanacademy.org/hc/en-us/articles/115000772311-How-do-I-make-assignments-for-my-students-on-Khan-Academy
- [S19] MagicSchool Pricing & Plans — https://www.magicschool.ai/pricing
- [S20] FAQs \| Brisk Teaching — https://www.briskteaching.com/faq
- [S21] Khanmigo pricing — https://www.khanmigo.ai/pricing
- [S22] Understanding the New SchoolAI Free Plan — https://schoolai.com/blog/understanding-the-new-free-plan
- [S23] Individual Teacher Subscription — Diffit — https://web.diffit.me/individual-teacher-subscription
- [S24] Affordable AI Grading Plans for Teachers \| CoGrader — https://cograder.com/pricing/

## Coverage and uncertainty

- No primary page inspected shows MagicSchool, Brisk, Khanmigo, SchoolAI, Diffit, or CoGrader as one product combining teacher voice dictation, photo-of-documents, NL prompts, and mobile capture of homework plus student metadata.
- MagicSchool public pages emphasize Raina chat, tool attachment fields, Studio Mode, and Enterprise handbook/curriculum upload — not teacher voice or camera capture of homework.
- Khanmigo image/camera upload is documented for Tutor Me (problem help), not teacher batch homework or grade-book metadata.
- Voice in inspected sources is often student-facing (Snorkl; third-party MagicSchool speech-to-text mentions), not teacher dictation of scores or roster metadata.
- Teachers Tally’s live homepage did not yield a full text extract; the auto-assignment claim is from search-indexed copy, so name-matching vs. prior student selection is not fully verified.
- Hey Jotty’s Nov 2025 Reddit post described auto-saving observations to student profiles, but current heyjotty.com describes a general life-admin product, not student records.
- No primary documentation found that MagicSchool, Brisk, SchoolAI, Khanmigo, Google Classroom, or Canvas automatically files incomplete ad-hoc student metadata onto the correct student record.
- Tapestry public guides describe “select child” before adding an observation; a newer auto-routing feature was not inspected.
- No ClassDojo help page inspected described an academic gradebook; documented reports are behavior/skill point reports.
- Google Classroom guardian email summaries do not include grades and are not a points/rewards system.
- Seesaw star ratings are not visible to students or families, so they are not a parent-facing incentive.
- Khan Academy parent-dashboard details were not successfully retrieved from a primary parent-help page.
- IXL virtual awards exist, but a complete official gradebook and individual-assign help page was not fully retrieved, so IXL is omitted.
- Brisk Educator Pro’s $14.99 figure appears on a June 2026 blog, not the checkout-facing product page; billing period is unpublished there.
- Except for MagicSchool’s iKeepSafe FERPA listing, FERPA postures are vendor self-statements. Signed DPAs, SOC reports, and independent legal determinations were not reviewed.
- Whether individual (non-district) teacher accounts have the same FERPA “school official” contractual posture as institution-licensed accounts is often unspecified.
- SchoolAI Pro/Scale and most district tiers are quote-based with no public individual-teacher dollar amount.
- Khanmigo’s published FERPA/COPPA language is on Khan Academy Districts pages; the consumer $4 plan’s FERPA coverage for classroom student records is not independently spelled out on the teacher pricing page.
- Other 2026 K-12 AI tools (Curipod, Class Companion, Mizou) were not priced from primary pages in this pass.
