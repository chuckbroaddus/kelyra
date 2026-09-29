# Student collectible reward assets — evidence brief

**Card:** t_73bb40d1  
**Date:** 2026-09-28 (session date)  
**Author:** research-feedback  
**Status:** Evidence only. No design, no pick, no decision.  
**Audience:** Chief of Staff, who staffs one decider.

Every claim from outside the repo is tagged: **Fact** (official page read this session), **Secondary**, **Estimate**, **Assumption**, or **Opinion**. A claim without a tag is from the Kelyra repo.

## What was asked

CEO asked for research on a reward system of collectible digital assets that teachers and school administration gift, that students own, that students would want, that are educational, visually and audibly appealing, with rarity rankings, plus a possible friend-to-friend trade, including whether AI changes the form. Also a feasibility and cost read (AI credits, storage, bandwidth, device processing) and where a cost sweet spot might sit. This note catalogs options and constraints. It does not choose one.

## Repo facts that bound the brief

- Target user in `docs/vision.md` is one elementary or middle-school teacher, about 50–100 students across sections. Students and parents get a one-screen progress view. Phone is for teacher capture. Web is for review, assign, and the grade book.
- Explicit MVP non-goal in `docs/vision.md`: "Weekly parent emails, SMS, points, streaks, or leaderboards." Also: "Training models on student work."
- `docs/data-model.md`: no tables yet for points/streaks. "Do not add per-student color, story rings, likes, or a public feed." Existing `assets` rows are photos and audio for captures and profiles, not collectibles. Student access is a join-code session, not a durable wallet account.
- Company rule: all TTS goes through profile `grok-tts` only (`notes/company/KELYRA_BOT_OPERATING_PRINCIPLES.md`).

This brief does not override those lines. A decider would have to change vision and schema on purpose.

## Option classes found (not a menu to pick from)

These are shapes that already exist in official pages, plus the cost shapes the published prices imply. They are not proposals.

### 1. Behavior points the adult redeems

ClassDojo's official Points page describes points as a way for the teacher to track positive feedback on custom skills, aligned with PBIS and SEL, with reports and timestamps. **Fact.** [1] The home-rewards page says parents customize redeemable rewards, and names "mobile games and monster flair" as examples. **Fact.** [2] ClassDojo's privacy page says children cannot start or use an account without an adult, kids communicate only with people they already know, and teachers or parents approve activities. The same page states ClassDojo claims COPPA, FERPA, and GDPR compliance, and that student information is not shared with advertisers. **Fact** (their claim, read on their page). [3]

What this is not, on the pages read: a portable object the student keeps, a rarity rank, or a peer trade.

### 2. In-game collection with rarity, bought with play tokens

Blooket's help center, read this session, is the closest official classroom collectible.

- Rarity labels on the Blooks page: Common, Uncommon, Rare, Epic, Legendary, Chroma, Unique, Mystical. A Blook Score reflects variety and rarity. Duplicates do not count toward the score. Same rarity can have different values. **Fact.** [4]
- Students open packs in a Market using tokens earned through gameplay. The page says "no real money required." Packs have a "Show Drop Rates" control. A note says longer unlock animations usually mean a rarer Blook. A Weekly Shop rotates banners, titles, and parts. **Fact.** [5]
- Students can sell a Blook back for tokens. The help page says sold Blooks cannot be recovered. **Fact.** [4]
- Help-center search for "trade blooks" on this session returned sell, custom-blook, and collection articles, not a friend-to-friend trade article. **Fact** about that search result. It is not proof that peer trade does not exist. [6]

Unofficial drop-rate wikis were not used. No official page read this session states numeric drop rates in prose; the product points users at an in-app "Show Drop Rates" control. [5]

### 3. Curriculum game with pets and rewards, parent-paid extras

Prodigy's official Math page says the game is grades 1 to 8, curriculum-aligned, and that educational content (questions, in-game videos, math manipulatives) is free. **Fact.** [7] The game-portal page names "Featured Pets" and "Wizards. Pets. Elements. Items. Battles." **Fact.** [8] The homepage says optional parent memberships keep the teacher tools free. **Fact.** [9]

No official Prodigy page read this session published a rarity ladder or a student-to-student trade. Fan wikis that list rarity colors were not treated as fact.

### 4. Session cash for powerups, not a kept collection

Gimkit's homepage says students earn in-game cash by answering correctly, an incorrect answer costs cash, and students spend that cash on upgrades and powerups. **Fact.** [10] The page read does not describe a durable collectible the student owns after the kit, or a trade.

### 5. Verifiable achievement credential the learner can move

1EdTech Open Badges 3.0, on the official standards page: a visual token plus metadata for one achievement (who earned it, who issued it, criteria, optional evidence). The credential is specific to one earner, digitally signed as a W3C Verifiable Credential, and can be a PNG or SVG with the data inside. Badge Connect supports learner-initiated transfer and "personal self-sovereignty" over the learner's credential data, including wallet choice. **Fact.** [11]

This is the official "student owns a proof of achievement and can take it elsewhere" shape. The page read does not describe rarity ranks, audio, or a trading-card economy.

### 6. Paid random packs (regulatory pattern, not a school-gift pattern)

The FTC's 17 January 2025 business-guidance post on the HoYoverse / Genshin Impact settlement says the complaint alleged: loot boxes ("mystery prizes awarded by luck") sold via layered virtual currency; odds not clear up front; the game directed at children without the COPPA notice and parental consent the FTC says was required; a proposed order to pay $20 million, stop selling loot boxes to kids under 16 without parental consent, and offer a direct U.S.-dollar price for loot boxes rather than only through virtual currency. The post says the order still needed a federal judge. **Fact** about what the FTC published. [12]

COPPA, on the FTC rule page: requirements apply to operators of sites or online services directed to children under 13, and to operators with actual knowledge they are collecting personal information online from a child under 13. **Fact.** [13]

Teacher-gifted, non-random awards are not the fact pattern in that FTC post. Paid or token-paid randomized drops are. This note does not collapse those two.

## Platform rules that change the design space

Not a legal opinion. Questions for the decider to send to counsel if a build is considered.

**Apple App Store Review Guidelines, page read this session.** [14]

- Kids Category apps "must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate." Kids Category apps "may not send personally identifiable information or device information to third parties," and should not include third-party analytics or third-party advertising, with narrow exceptions that still bar identifiable information about children. **Fact.**
- If a feature is unlocked by purchase (subscriptions, in-game currencies, premium content), it must use in-app purchase. "Apps offering 'loot boxes' or other mechanisms that provide randomized virtual items for purchase must disclose the odds of receiving each type of item to customers prior to purchase." **Fact.**
- "Apps may enable gifting of items that are eligible for in-app purchase to others. Such gifts may only be refunded to the original purchaser and may not be exchanged." **Fact.** That sentence is about IAP-eligible gifts, not about a free school catalog. It is still the official line on exchanging gifted purchased items.
- Apps may use in-app purchase to sell NFT-related services (minting, listing, transferring). Users may view their own NFTs "provided that NFT ownership does not unlock features or functionality within the app." **Fact.**

Kelyra is not, on any page read this session, an App Store Kids Category app. Whether a future student collectible surface would be treated as child-directed is a legal question, not a finding.

**Google Play Families policy, page read this session.** [15]

- If children are in the target audience and the app lets users share or exchange information, that must be disclosed in the content-rating questionnaire. **Fact.**
- Social features that let child users exchange freeform media or information need an in-app safety reminder and a way for adults to manage the feature. "You must require adult action before enabling features that allow children to exchange personal information." **Fact.**
- Apps whose main focus is chatting with strangers or anonymous chat must not target children. **Fact.**

A roster-only trade of an asset id is not the same sentence as open chat. It can still be a "social feature" under the policy's own definition (functionality that lets users share or communicate). That classification is for counsel, not this note.

**FERPA, U.S. Department of Education student-privacy FAQ.** [16]

"Education records" are records directly related to a student and maintained by a school or a party acting for the school. The FAQ says they include grades, transcripts, class lists, schedules, K-12 health records, and discipline files, and may be recorded in any way, including computer media. Source cited on the page: 34 CFR § 99.2. **Fact.**

A collectible that records an achievement and is stored by a vendor for the school can fall inside that definition. Whether a purely cosmetic object with no achievement link does is not answered by the page read. Flag, do not conclude.

**Student Privacy Pledge.** The Future of Privacy Forum page says the Pledge was retired as of 25 April 2025, that signatories remain bound for data collected while they were signatories, and that schools' duty to vet vendors was always more than checking a pledge. It points schools at state contract requirements and the Student Data Privacy Consortium's National Data Protection Agreement. **Fact.** [17]

## Cost anchors (official unit prices)

Read on xAI's models page this session. **Fact.** [18]

| Meter | Published price |
|---|---|
| grok-imagine-image | $0.02 / image |
| grok-imagine-image-2.0 | $0.04 / image |
| grok-imagine-image-quality | $0.05 / image |
| grok-imagine-video | $0.050 / second |
| grok-imagine-video-1.5 | $0.080 / second |
| Text to speech | $15.00 / 1M characters |

xAI's image guide says image generation is a flat fee per image regardless of prompt length, and that an edit is billed for both the input image and the output image. **Fact.** [19] Company TTS still has to go through `grok-tts`, not a side API call from another role.

OpenAI's API pricing page prices GPT-Image-2 in tokens (image output $30 / 1M tokens, image input $8 / 1M tokens), not as a flat per-image fee. **Fact.** [20] No token-count-per-image was on the page read, so this note does not convert that to a per-card dollar figure.

Supabase pricing page, read this session. **Fact.** [21]

- Pro file storage: 100 GB included, then $0.0213 per GB.
- Pro egress: 250 GB, then $0.09 per GB. Cached egress: 250 GB, then $0.03 per GB.
- Pro includes a Smart CDN. Free plan is a basic CDN, 1 GB storage, 5 GB egress.
- Image transformations: 100 origin images included, then $5 per 1,000 origin images.

### Worked bands

Volumes below are **Assumption** (one class of 50 students, 36 weeks, two gifts a week, a 200-card shared catalog, ~200 KB still, ~150-character sting). Unit prices are **Fact** [18]. Products are **Estimate**.

| Band | What is generated | AI $ (xAI list) | Storage / egress shape |
|---|---|---|---|
| Shared still catalog | 200 images × $0.04 | $8 once | One file per card, reused. 200 × 200 KB ≈ 40 MB. **Estimate.** Egress is views of shared files, and Pro cached egress is the cheap meter [21]. |
| Shared still + short sting | 200 × 150 characters = 30,000 characters | $0.45 TTS once, on top of the $8 | Audio files are small relative to the 100 GB included storage. **Estimate.** Must be produced via `grok-tts`. |
| Unique still per gift | 50 × 2 × 36 = 3,600 images × $0.04 | $144 per class per school year | 3,600 × 200 KB ≈ 720 MB per class per year if each image is kept. **Estimate.** Twenty classes ≈ 14 GB/year of stills, still inside 100 GB included, before video. **Estimate.** |
| Unique 5-second video per gift | 3,600 × 5 × $0.08 | $1,440 per class per school year | File size per second was not on the xAI page. Do not invent it. Egress would be the meter to watch, not the $0.0213 storage rate. **Estimate** on the generation bill only. |
| Unique sting per gift | 3,600 × 150 characters | $8.10 TTS per class per year | Cheap next to images. **Estimate.** |

Device processing: no official page read this session gives a school-phone GPU budget. **Gap.** A decoded still plus a short audio file is the same class of media the app already shows for photos and voice. **Assumption**, from the existing capture model in `docs/vision.md`, not from a benchmark. Real-time 3D, and on-device image generation, were not costed because no official device or model-size page was read.

Network: a trade that moves a database pointer to a shared catalog file does not copy bytes. A trade that duplicates the file does. **Assumption** about architecture, not a design.

## What "students own them" meant on the pages read

| Shape | What the official page actually says | Portable off the vendor? |
|---|---|---|
| Blooket inventory | Collection, score, sell-back for tokens; sold items cannot be recovered [4][5] | Not stated on the pages read |
| ClassDojo points | Adult awards and redeems [1][2] | No, on the pages read |
| Open Badges 3.0 | Signed credential, learner-initiated transfer, wallet choice [11] | Yes, that is the point of the spec |
| Apple NFT view | May view own NFTs if ownership does not unlock app features; NFT services sold via IAP [14] | Wallet, under those rules |
| Kelyra today | Join-code session; assets are capture/profile media | No collectible record exists |

"Own" in a school app can mean three different things the pages do not treat as the same: an account inventory, a signed credential the learner can export, or a crypto token. Only the second has an education standard written for it. [11]

## AI, as a cost and a privacy fact, not a feature pick

xAI Imagine can generate a still from a prompt and edit from up to five reference images. **Fact.** [19] That is enough, on the pricing page, to make a shared house style cheap ($8–$10 for a 200-card still catalog at the $0.04 tier) and to make a unique image on every gift a per-class annual line ($144 at the assumed volume). **Estimate.** [18]

Sending a student's name, photo, or schoolwork into a third-party image or voice API is a personal-information question under COPPA if the operator is child-directed or has actual knowledge, [13] and under Apple's Kids Category rule against sending PII to third parties if that category applies. [14] `docs/vision.md` already forbids training models on student work. A shared catalog prompted with no student data is a different data flow from a per-child generation. This note does not decide which flow is allowed.

Audio appeal, on the published meter, is the cheap half. A short sting is cents. Video is dollars per gift. **Estimate.** [18]

## Where the numbers bunch (observation, not a choice)

**Opinion**, grounded in the prices above: the steep parts of this idea are not storage. Storage at $0.0213/GB is small next to unique video generation and next to uncached egress if every view re-downloads a large unique file. [18][21] The flat part is a shared catalog of stills plus short audio, gifted as a record, with rarity as a published tier or edition count rather than a paid random drop. The regulatory hot part, on the FTC page, is randomized packs sold to children through virtual currency. [12] Peer trade adds a social-feature and education-record question even when the bytes do not move. [15][16]

That is a map of the cost and constraint surface. It is not a recommendation to build the flat part.

## Gaps (no source this session)

- No official Blooket page confirming or denying friend-to-friend trade.
- No official Prodigy rarity table.
- No measured file size for xAI video.
- No school-device benchmark for 3D or on-device generation.
- Classcraft's site did not load (blocked as a private address). No claim about that product.
- No counsel read. COPPA, FERPA, Apple, and Google lines above are the pages, not an opinion that Kelyra is or is not covered.

## Handoff

Chief of Staff staffs one decider. Research does not staff product, design, legal, finance, or strategy.

Questions the decider would need, still unanswered here:

1. Is this inside or outside the current MVP non-goal on points, streaks, and leaderboards?
2. Is "own" an in-app inventory, an exportable credential, or something else?
3. Is rarity a published tier the teacher assigns, or a random drop?
4. Is trade in scope for a first cut, and if so only inside a roster with an adult gate?
5. May any generation prompt contain student personal information?

## Sources

[1] ClassDojo, Points. https://www.classdojo.com/points/  
[2] ClassDojo, Rewards. https://www.classdojo.com/homeRewards/  
[3] ClassDojo, Privacy & Security. https://www.classdojo.com/privacycenter/  
[4] Blooket Help, Blooks Page Overview. https://help.blooket.com/hc/en-us/articles/31594738856983-Blooks-Page-Overview  
[5] Blooket Help, How to Collect Blooks. https://help.blooket.com/hc/en-us/articles/16310759040151-How-to-Collect-Blooks  
[6] Blooket Help search, "trade blooks". https://help.blooket.com/hc/en-us/search?query=trade%20blooks  
[7] Prodigy Math. https://www.prodigygame.com/main-en/prodigy-math  
[8] Prodigy game portal. https://www.prodigygame.com/main-en/game-portal  
[9] Prodigy homepage. https://www.prodigygame.com/main-en/  
[10] Gimkit. https://gimkit.com/  
[11] 1EdTech, Open Badges. https://www.1edtech.org/standards/open-badges  
[12] FTC, 17 January 2025, HoYoverse settlement guidance. https://www.ftc.gov/business-guidance/blog/2025/01/level-tips-businesses-ftcs-settlement-genshin-impact-developer-hoyoverse  
[13] FTC, COPPA rule page. https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa  
[14] Apple, App Store Review Guidelines (Kids Category 1.3; Payments 3.1.1, including loot boxes, IAP gifts, NFTs). https://developer.apple.com/app-store/review/guidelines/  
[15] Google Play, Families Policies. https://support.google.com/googleplay/android-developer/answer/9893335  
[16] U.S. Department of Education, Student Privacy, "What is an education record?" https://studentprivacy.ed.gov/faq/what-education-record  
[17] Future of Privacy Forum, Student Privacy Pledge retirement. https://fpf.org/student-privacy-pledge/  
[18] xAI, Models (Imagine and Voice pricing). https://docs.x.ai/docs/models  
[19] xAI, Imagine Overview. https://docs.x.ai/docs/guides/image-generation  
[20] OpenAI, API Pricing. https://openai.com/api/pricing/  
[21] Supabase, Pricing. https://supabase.com/pricing
