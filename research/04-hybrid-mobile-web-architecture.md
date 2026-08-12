# Hybrid mobile + web architecture for K-12 teacher platforms (2026)

**Status:** Partial  
**Date:** 2026-08-12  
**Query:** Hybrid mobile + web architectures for K-12 teacher platforms. Teachers capture metadata and student work primarily on mobile while using a web interface for reports, analytics, and creating/assigning individual (including AI-generated) learning exercises. How do the best products keep data consistent across devices?

## Executive takeaway

The best hybrid K–12 teacher products keep data consistent by:

1. Treating a **central cloud or the district SIS** as the roster source of truth.
2. Binding every capture and score to a **stable student and assignment identifier**, not a typed name.
3. Using **publication gates** plus **timestamp / non-overwrite flags** instead of merging cells live.

Teachers capture scans, photos, videos, notes, and observation metadata primarily on mobile, then use the web to generate reports, review analytics, author and assign individual learning exercises, and prompt AI to create those personalized exercises. Offline modes either synchronize a local queue when a connection appears or refuse writes that would change assignment state. Interoperable products exchange rosters and gradebook results as **separate services** so every device is looking at the same student, class, and line item.

## Capture on the phone, authoring and reports on the web

Phones are the primary capture surface for paper quizzes, observation notes, photos, and videos. Lesson-plan and learning-activity authoring, roster upload, custom student fields, report generation, quiz-grade import, the computer grading tool, assignment grade history, grade downloads, and grading-scale setup are documented as web- or computer-only, even when teachers can still enter a grade and return work on a phone. [S2][S5]

Camera-scan products add a companion site or online report pane for extra analytics, web assessments, data management, and student-list upload, so a teacher can scan on Android and review on an iPad or the website; results can still be reviewed immediately on the phone, and some scanners also accept a webcam, document camera, or computer browser rather than a native app. [S1][S6]

Portfolio posting is split by medium—files on the web, video on the app, photos on both—and assigning portfolio activities is documented from the teacher website on a computer. [S3]

Seesaw is the clear outlier: teachers create and assign activities on any device and on the web, and Gradebook is available in the iOS/Android app as well as the browser. [S4]

## Offline queues versus refused writes

Scan-and-grade apps are built to work with no internet: teachers scan, grade, and review paper quizzes on the phone, and when the app is open and a connection appears it synchronizes scanned papers to a central cloud server. Auto-sync can be turned off, a second Sync press starts a fuller reconciliation, and logout can keep local data. [S7]

Assignment and class-management products instead refuse most offline writes. Sending an assignment or assessment requires internet (an interrupted send can be saved as a draft without attachments); class edits do not appear on other devices until the device is back online; roster data from Apple School Manager auto-syncs after reconnect. Students working offline can keep collecting progress and mark activities complete or assessments turned in locally, but teachers cannot see that until the student reconnects, and students can work on downloaded files but cannot submit a hand-in, mark Done, or turn in an assessment until online. [S8]

Major LMS mobile offline modes likewise let students download attachments to view or edit offline but require internet to submit, post to a discussion, or satisfy completion rules; after reconnect, students tap to sync newer server content, and logout clears the offline cache. [S9]

## One student record, matched on SIS identifiers

Interoperable products do not invent independent rosters. A shared model of users, courses, classes, enrollments, organizations, and grades is exported by a provider—typically the SIS—and imported by the LMS or content app via CSV or REST, so districts stop generating a proprietary spreadsheet for each tool. [S19]

Each person is a single User: sourcedId is the interoperability identifier on every entity, userMasterIdentifier is a separate master person key, userIds hold other system IDs, and one user can map to multiple roles and organizations. [S20]

A parallel education data model keeps one Student with org-scoped identity codes: each system’s IDs hang off that student, school-specific attributes are scoped to the education organization, and an incoming API student record is treated as already matched to a verified unique identifier so downstream systems can join data across domains. [S21]

Classroom products then keep capture and reports on the same child by syncing class lists from the SIS/MIS, matching on SIS_ID or SourcedID rather than name, writing the observation onto that child’s profile, pushing SIS updates into connected apps, and sharing only the sections teachers should see—because every shared teacher receives summary emails. Gradebook exchange is framed as reporting results back to the student system of record instead of capturing grades in multiple systems. [S22]

## Binding mobile captures and AI exercises to the same assignment

Once coursework exists, later student work and grades stay on the same course and assignment because a StudentSubmission is created keyed by courseId, courseWorkId, submission id, and userId, with assignee mode set to the whole class or a listed set of individual student IDs. [S16]

Teachers assign selected or AI-generated activities to specific classes and individual students, then read per-student completion or score for those same items on a class assignments report, including AI-marked items and a CSV export. [S13]

A personalized AI space is authored on the web—prompt, standards, outcomes, agenda, student preview, then launch—and adapts difficulty per student while a control view shows each student’s activity and chat. [S14]

That space is attached to a class as a Google Classroom or Canvas assignment, so joins record participation and can mark the assignment complete; without an LMS, students type their name into a space code and identity is not validated. [S15]

Handwritten work captured on a phone is bound only after a teacher confirms packet splits and types each student’s name; a Canvas school-plan path instead imports from a class assignment and sends feedback back onto that original submission. [S17]

Some generators never hold a native roster at all: they produce differentiated activities on the web and hand identity off by export to Slides, Forms, Docs, or Google Classroom, and students do not work in that tool directly. [S18]

## Publication gates and grade-write conflicts

Rosters and grades travel as independent services: SIS rosters are exchanged separately from gradebook results and line items. LMS-to-SIS grade passback is a teacher-clicked or daily/weekly scheduled overwrite of published scores (name, max points, due date, mapped category, raw score, published status); ungraded items do not sync, and deletes are done in the SIS gradebook then synced. Camera-scan tools either auto-write into a mapped LMS assignment cell or require a later paste or Sync; re-sync updates students enrolled in both classes and skips others, and often only the final score is pushed. [S10]

Grade-write APIs resolve conflicts by timestamp and explicit non-overwrite flags rather than merging cells: a score POST is rejected if its timestamp is earlier than the existing result’s updated_at; flags can prevent a later tool write from clearing or replacing a human grade; a pending-manual state parks a score for teacher review instead of finalizing it. [S11]

Student-visible grades and family-visible journals stay consistent with a publication gate, not a live merge. Entered grades save as drafts until Return, then that returned grade syncs across the grading tool, Grades page, and Student work page, and students cannot edit attached files until the teacher returns the work. App observations default to not-in-journal and can be saved as user-tied drafts until a manager or approver changes status. [S12]

## Implications for Kelyra

1. **Split surfaces on purpose.** Mobile = capture (voice, camera, notes). Web = reports, analytics, authoring, assigning, AI exercise generation. Grade/return can live on both. Seesaw is the exception that does everything everywhere.
2. **Two offline policies, not one.** Capture can queue locally and sync (ZipGrade). Assignment state, hand-in, and “send” must refuse offline writes (Schoolwork, Classroom, Schoology).
3. **Never invent a roster.** Import OneRoster/Ed-Fi (sourcedId / userMasterIdentifier). Match on SIS_ID, not name. Report grades back to the SIS; do not become a second gradebook of record.
4. **Every fragment needs two keys.** `studentId` + `assignmentId` (Classroom’s courseId / courseWorkId / submission id / userId). AI spaces that only have a typed space-code name are not a record.
5. **No live cell merge.** Publication gate (draft → Return / approve) + timestamp rejection + non-overwrite of human grades + pending-manual. Do not CRDT a grade cell.
6. **Rosters and results are separate APIs.** Sync roster independently from line items. Pass back only published scores.

## Sources

- [S1] ZipGrade — https://www.zipgrade.com/
- [S2] What features are only available on the web or mobile app? | Brightwheel — https://help.mybrightwheel.com/en/articles/2303209-what-features-are-only-available-on-the-web-or-mobile-app
- [S3] How to Assign Student Portfolio Activities to Students – ClassDojo — https://help.classdojo.com/hc/en-us/articles/360009899492-How-to-Assign-Student-Portfolio-Activities-to-Students
- [S4] How to create, edit, and assign Activities in Seesaw — https://help.seesaw.me/hc/en-us/articles/17964278341005-How-to-create-edit-and-assign-Activities-in-Seesaw
- [S5] Grade & return an assignment - iPhone & iPad - Classroom Help — https://support.google.com/edu/classroom/answer/6020294?hl=en&co=GENIE.Platform%3DiOS
- [S6] Camera Scanning – Gradient Help Center — https://support.gradecam.com/hc/en-us/articles/13951300370843-Camera-Scanning
- [S7] Do I need wi-fi or an internet connection to use ZipGrade? — https://support.zipgrade.com/hc/en-us/articles/201171059-Do-I-need-wi-fi-or-an-internet-connection-to-use-ZipGrade
- [S8] Problems using Schoolwork offline — https://support.apple.com/guide/schoolwork-teacher/troubleshoot-working-offline-phx3f64d4e1c/ios
- [S9] Learning on the go with Classroom on Android — https://blog.google/products-and-platforms/products/education/offline-nbu-updates/
- [S10] OneRoster® | 1EdTech — https://www.1edtech.org/standards/oneroster
- [S11] Score API for 1EdTech Assignment and Grade Services — https://developerdocs.instructure.com/services/canvas/resources/score
- [S12] View or update your gradebook – Classroom Help — https://support.google.com/edu/classroom/answer/9199710?hl=en
- [S13] How do I make assignments for my students on Khan Academy? — https://support.khanacademy.org/hc/en-us/articles/115000772311-How-do-I-make-assignments-for-my-students-on-Khan-Academy
- [S14] Create and use Spaces with the Space creator — https://help.schoolai.com/en/articles/10270295-create-and-use-spaces-with-the-space-creator
- [S15] Getting students into Spaces — https://help.schoolai.com/en/articles/10280003-getting-students-into-spaces
- [S16] REST Resource: courses.courseWork.studentSubmissions — https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions
- [S17] How to Import and Grade Handwritten Essays with CoGrader — https://intercom.help/cograder/en/articles/9879780-how-to-import-and-grade-handwritten-essays-with-cograder
- [S18] How to get started on Diffit — https://support.diffit.me/hc/en-us/articles/21792858262157-How-to-get-started-on-Diffit
- [S19] OneRoster® | 1EdTech — https://www.1edtech.org/standards/oneroster
- [S20] IMS OneRoster Rostering Service Version 1.2 — https://www.imsglobal.org/spec/oneroster/v1p2/rostering/info
- [S21] Student Identification and Demographics Domain - Overview | Ed-Fi Alliance — https://docs.ed-fi.org/reference/data-exchange/data-standard/model-reference/student-identification-and-demographics-domain/overview/
- [S22] TeachScribe — https://teachscribe.com/

## Coverage and uncertainty

- No inspected 2026 primary page for Seesaw, Google Classroom, Canvas, or ClassDojo states a hard rule that capture is mobile-only while reports/authoring are web-only.
- Brightwheel’s web-only authoring/reports matrix is the closest published split; Brightwheel is childcare/early-ed, not a leading K–12 LMS.
- ClassDojo documents assign-from-computer; it does not explicitly say the mobile app cannot create activities.
- ZipGrade and Gradient still allow reviewing results on the capture device.
- Canvas Teacher can grade and create discussions/announcements on mobile, so Canvas does not match a hard partition.
- No inspected vendor document describes automatic merge (CRDT, OT, or field-level three-way merge) of the same grade cell edited concurrently on phone and browser.
- ZipGrade documents offline capture plus cloud reconciliation but not last-write-wins vs other conflict rules.
- Official Tapestry and Seesaw help inspected here did not document a teacher offline capture queue or phone–browser conflict policy.
- No inspected primary page documents a single closed loop in which a web-generated AI exercise, a later phone photo of paper work, and a downstream report all share the same native student–assignment identifier without an LMS object or a teacher-typed name.
- SchoolAI Space Code identity is a student-typed name, not a roster userId.
- Khanmigo Tutor Me camera upload was not re-inspected as an assignment-linked capture path.
- OneRoster/Ed-Fi specify rostering and unique student identity; they do not specify how ad-hoc spoken or photographed fragments are filed.
- TeachScribe documents UK MIS/Wonde sync and GDPR hosting, not a US SIS/OneRoster/FERPA implementation.
- No inspected source ranks products as “best” or states that all leading K-12 apps share one backend store.

### Claims dropped at verification

- FERPA school-official disclosure does not require physical/technological access controls; an effective administrative policy can suffice.
- FERPA does not say vendor-maintained mobile captures are “the same legal object a web report must show.”
