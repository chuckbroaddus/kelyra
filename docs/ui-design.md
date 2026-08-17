# Kelyra UI — Facebook chrome, Amazon rows, Instagram people

**Date:** 2026-08-17
**Maps to:** `docs/vision.md`, `docs/mvp.md`, `docs/data-model.md`
**Replaces:** the 2026-08-15 “camera roll + people list” spec (three-tab desk, no hamburger, no hide-on-scroll tray, no AI tab, no camera classifier).
**This pass adds (do not rip out chrome):** teacher delete-anything, student/parent profile photos, first-class parent records, metadata Details, classifier intents **Portrait** and **Parent/contact card**, and **marquee overflow** for picture-adjacent labels (§10.18, §30). New numbered sections start at §20. Screen recipes in §13 are patched by **deltas** in §25 — do not rewrite a screen whose primary job did not change.

This is a visual and interaction redesign of existing Kelyra flows, plus four surfaces the brief named: **Profile**, **Ask** (AI chat), **Notifications**, **Search**, and the **camera-proposal** sheet — and now **Parents** (`/class/{id}/parents`, `/class/{id}/parent/{parentId}`). Matcher never inserts a student. Delete never inserts anyone. Nothing is a grade until the teacher Approves. Appearance and rotation are presentation.

Do not clone Meta blue, Instagram gradients, the Amazon smile, logos, or copy. Steal structure, motion, hierarchy, and muscle memory.

Implementation targets (do not invent new packages):

- Tokens + palettes: `src/constants/theme.ts`
- Theme runtime: `src/lib/theme/ThemeProvider.tsx` (new)
- Primitives: `src/components/ui/`
- Chrome: replace `TeacherNav.tsx` + `TeacherMenu.tsx` with `AppHeader`, `ContextMenuRow`, `FloatingTabTray`, `HamburgerDrawer`
- Screens keep their current data and actions
- Expo SDK 54, Expo Router, React Native `StyleSheet` only
- System fonts. Existing `Icon` component. `expo-symbols` is already installed if a glyph is missing from `Icon`; do not add an icon or font package

Product rules that this spec must not weaken:

- The matcher never inserts a student.
- Nothing is a grade, and no parent-facing sentence publishes, until the teacher Approves.
- Parent views never show other children, scores they were not given, or “Grok.”
- Model keys stay server-side. Ask and the camera classifier use the existing `invokeAi` gateway.

---

## 1. What I observed

Researched August 2026 from current App Store listings, official help, Amazon/Meta posts, WWDC 2025, and recent user reports. Public sources disagree on a few placements (Facebook has been A/B testing Menu). Where a source conflicts with the chrome the product owner named, **the named likes win**. Research is for craft: spacing, hide-on-scroll physics, badge anatomy, row anatomy.

### 1.1 Facebook iPhone (2026)

**Top header.** The home chrome is still a wordmark row, not a system navigation title. On Home the wordmark reads **facebook**. Switching a major bottom destination changes that title to the function’s name (Marketplace is the canonical example). Search is a magnifying glass on the right of the wordmark; tapping it pushes a **search canvas**, not an inline shrinking field. Immediately right of search sits the messages / activity icon with a **small red count badge**. The badge hides at zero.

**Hamburger / Menu.** Official iPhone help still documents **Menu** as a tab-bar destination that opens Settings, shortcuts, and the rest of the IA so the bar itself can stay short. In 2026 Facebook has also been testing a **three-line / More control next to the wordmark at the top left**; an April 2026 user report describes “the more icon next to the Facebook name at the top left corner.” The product owner wants that top-left hamburger. We take it. Menu is a **left sheet over a dimmed scrim**, not a new Settings app.

Sources: [Facebook Help — Personalize your tab bar](https://www.facebook.com/help/www/2741283262582983); [April 2026 iOS/Android tab-move report](https://www.facebook.com/groups/275424204397275/posts/1349023113704040/); [App Store — Facebook](https://apps.apple.com/us/app/facebook/id284882215).

**Bottom tray.** Home is the leftmost house and cannot be removed. Other slots are whole functions (Watch / Reels, Marketplace, Groups, Notifications). Notification **dots** sit on icons. Users can pin, auto, or hide extra shortcuts; Home and Notifications stay. The 2026 Android/iOS updates have been bouncing the bar between top and bottom; the iPhone default that teachers know is **bottom icons**.

**Hide-on-scroll.** This is current, not nostalgic. A June 2026 Facebook group thread: the menu bar “disappears as you scroll down but reappears if you slightly scroll back up.” A July 2024 Reddit thread already called auto-hide-on-scroll-down a recent Facebook feature. The top wordmark row usually stays; the tray goes.

Sources: [Facebook Help — tab bar](https://www.facebook.com/help/www/2741283262582983); [June 2026 hide-on-scroll report](https://www.facebook.com/groups/dullmensclub/posts/2361822241140970/); [r/facebook hide-on-scroll](https://www.reddit.com/r/facebook/comments/1elpaxb/the_tab_bar_auto_hides_every_time_i_scroll_down/).

**List rows.** People rows are avatar + name + one status line + chevron. That is the notification list and the friends list. We steal the row, not the social graph.

**What we do not steal.** Meta blue (`#1877F2`), the infinity logo, Messenger gradients, Reels, a public feed.

### 1.2 Instagram iPhone (2026)

**People tray.** The circular Stories / contacts tray at the top of Home **did not move** in the March 2026 nav redesign. It is a horizontal, free-scrolling row of **circles** with a first-name caption under each. Circles are the person. Tapping the circle is the action. Profile photos are uploaded square (Buffer: 320 × 320) and **masked to a circle** everywhere.

**Tab bar.** March 2026 order in the redesigned build: **Home (house, far left) · Reels · DMs · Search · Profile (far right)**. Create left the center of the bar and now lives in the top-left of Home / Profile. Profile as the trailing face is the muscle memory we want. House as the leading start is the same as Facebook.

**Rings.** Unseen-story rings, gradient strokes, and streak dots are how Instagram marks *unwatched media*. Kelyra has no stories product. We take the circle tray and **leave the rings**.

**Tab chrome.** Mid-2026 Instagram has been testing a Liquid Glass floating bar (Threads, June 2026: “Instagram has added a Liquid Glass tab bar”). It is a custom glass, not a 1:1 system `UITabBar`. The craft we take: the bar sits **over** the feed, it is not a hard edge glued to the home indicator.

Sources: [Storrito — Instagram nav, March 2026](https://storrito.com/resources/what-instagrams-navigation-redesign-actually-changed/) (Stories tray unchanged; Profile far right; Home far left); [Buffer — profile photo is a circle](https://buffer.com/resources/instagram-image-size/); [App Store — Instagram](https://apps.apple.com/us/app/instagram/id389801252).

**What we do not steal.** Gradients, story rings, Reels, likes, Close Friends, a public grid.

### 1.3 Amazon Shopping iPhone (2026)

**Header camera.** Amazon Lens is a **camera icon in the search / header cluster**. Tap → device camera (or camera roll) → the model proposes what the picture *is* → the shopper confirms by tapping a result. It does not silently order the item. App Store copy: “tap the scan icon in the search bar, take a picture of the item or its barcode.” Official how-to: Lens icon in the search bar, then Camera Search or upload. Lens Live (2025) keeps a **proposal carousel in the camera flow** so the human still picks.

Source: [About Amazon — How to use Amazon Lens](https://www.aboutamazon.com/news/retail/how-to-use-amazon-lens); [App Store — Amazon Shopping](https://apps.apple.com/us/app/amazon-shopping/id297606951).

**AI tab.** For two years Rufus was a **bottom-nav icon, typically the trailing or near-trailing slot**, that opened an agent chat. Amazon help (Canada, still indexed 2026): “Open the app and tap on the Rufus icon on the navigation bar in the bottom right corner of the screen.” On 13 May 2026 Amazon retired the Rufus *brand* and folded the agent into **Alexa for Shopping**, summoned by a cursive-A icon in the app. The interaction we steal is the older, clearer one the product owner named: **a bottom icon that opens an AI agent chat**. We do not put Ask in the Profile slot.

Sources: [About Amazon — Alexa for Shopping, 13 May 2026](https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant); [Amazon Help — About Alexa for Shopping / Rufus](https://www.amazon.com/gp/help/customer/display.html?nodeId=Tvh55TTsQ5XQSFc7Pr); [CNBC, 13 May 2026](https://www.cnbc.com/2026/05/13/amazon-ditches-rufus-ai-chatbot-in-favor-of-alexa-shopping-agent.html).

**Second header row.** Under the search cluster Amazon keeps a **context row** of departments / Your Orders filters (All, Buy Again, Not yet shipped…). It is screen-specific. The main header stays; this second row is allowed to tuck away.

**Product / order row.** Vertical lists (Your Orders, search results, Buy Again) share one anatomy that teachers already have in their thumbs:

```
[ photo 72 ]   Title
               Status line  (Arriving tomorrow / Delivered / Returning)
               Meta         (Sold by, date, price)
[ Buy it again ]  [ Track package ]  [ Return or replace ]
```

The pills sit **under** the text, wrap, and are rounded. One may be visually heavier. This copy is on every recent Your Orders card (“Buy it again”, “Track package”, “Return or replace items”, “Write a product review”).

**Two orientations.** Amazon is not one feed. **Horizontal shelves** (Continue shopping, Buy Again, inspired-by) for *people-or-things you pick by face*. **Vertical feeds** for *work you process* (orders, search hits). We classify Kelyra the same way in §7.

**Swipe-to-act.** iOS Amazon lists reveal trailing actions (remove, archive, buy again). Releasing past a threshold commits; releasing early snaps back. The same actions also exist as the pills, because plenty of people never swipe.

**Floating quick-access bar.** Amazon’s 2020 iOS redesign put a **floating Quick Access bar** above the home indicator (Home, profile/Me, Cart). That is the ancestor of the current bottom icon row. Combined with iOS 26, the modern reading is: **a floating frame over content**, not a system tab bar welded to the home indicator.

Sources: [TechCrunch — Amazon iOS Quick Access bar, 2020](https://techcrunch.com/2020/09/01/amazons-big-redesign-on-ios-to-reach-all-u-s-users-by-month-end/); [How-To Geek — hamburger / Your Orders](https://www.howtogeek.com/707823/how-to-find-your-orders-in-the-amazon-app/).

**What we do not steal.** The smile logo, Amazon orange `#FF9900`, cart, ratings stars, “Buy now.”

### 1.4 iOS 26 craft we actually implement

Apple’s current iPhone tab bar **floats above content** and can **minimize on scroll down, restore on scroll up** (`tabBarMinimizeBehavior = .onScrollDown`). WWDC25: “the tab bar on iPhone floats above the content, and can be configured to minimize on scroll.” Facebook users are already living with this physics; Instagram is painting its own glass version of it.

Kelyra is Expo / StyleSheet, not UIKit, so we **implement the physics ourselves** (see §9). We do not add a new UI library. We do not turn the tray into Apple Liquid Glass. We match the *behavior*: floating frame, hide on scroll down, show on scroll up, 180 ms, no bounce toys.

Sources: [WWDC25 — Build a UIKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/284/); [Create with Swift — tabBarMinimizeBehavior](https://www.createwithswift.com/making-the-tab-bar-collapse-while-scrolling/).

---

## 2. Design thesis

Kelyra is the teacher’s **filing app that already lives in their thumbs**. Facebook chrome (hamburger, wordmark that changes per tab, search glass, red-badge bell, house on the left, their face on the far right, a floating tray that gets out of the way). Amazon rows (photo + status + pill actions, swipe-to-act, a header camera that looks at the paper and *proposes* a job, a second context row, a trailing-left AI tab). Instagram people (a row of circles that *are* the class).

It is a real iPhone app. It follows the phone’s Light / Dark setting by default, lets the teacher pin Light or Dark, and works in portrait or landscape. It is not a website in a WebView, not a school-district portal, not a KPI dashboard, and not a classroom toy. Student screens read like a worksheet. Parent screens and anything that leaves the app read like a note home on paper.

**One filled brand button per view.** Pills on a `WorkRow` may include one visually primary pill; that is the row’s next action, not a second page-level CTA.

**Capture stays on Capture after save.** Filing a stack cannot yank the teacher into a student page.

**The header camera never files.** It proposes. The teacher confirms. The matcher still never inserts a student. Approve is still the last click on anything that becomes a grade.

---

## 3. Information architecture

### 3.1 Roles and chrome visibility

| Role | Chrome | Hidden chrome |
|---|---|---|
| Teacher (signed in) | Header + context row + floating tray + hamburger | — |
| Student (join session) | Header + context row + shorter tray + hamburger | Camera. No other students’ grades |
| Parent (invite session) | Header + context row + shorter tray + hamburger | Camera. No other children, no scores, no “Grok” |
| Signed out / `/sign-in` / `/join` (pre-session) | Wordmark only | Tray, hamburger, camera, search, bell |

`TeacherShell` today hides chrome on `/sign-in`, `/join`, `/todo`, `/parent`. That is wrong for this spec. Student and parent **get their own shorter tray**. Only `/sign-in` and the pre-session `/join` (before a name is picked) stay chrome-less.

### 3.2 Header slots (one recipe)

Every signed-in screen uses this exact header. It is not the React Navigation stack title.

```
[ ☰ 44 ]   Wordmark (flex, left)     [ camera 44 ] [ search 44 ] [ bell 44 ]
```

| Slot | Size | Who sees it | Action |
|---|---|---|---|
| Hamburger | 44 × 44, 3-line `menu` icon, `ink` | Teacher, student, parent | Opens the left drawer (§3.3) |
| Wordmark | 20 / 700 on Home, 18 / 700 on other tabs, `ink`, 1 line, truncate | Everyone signed in | Not tappable. **Text changes with the selected tray icon** (§3.5) |
| Camera | 44 × 44, `capture` icon | **Teacher only** | Opens the device camera, then `/proposal` (§14) |
| Search | 44 × 44, new `search` glyph | Teacher, student, parent | Pushes `/search` with the current context |
| Bell | 44 × 44, new `bell` glyph | Teacher, student, parent | Pushes `/notifications`. Red count badge from real data. Hidden at 0 |

Gap hamburger → wordmark: 8. Gap between trailing icons: 0 (they are 44-wide hits). Trailing cluster right-pad: 4. Header height: **56** portrait, **44** landscape phone, **56** tablet. Background `elevated`, 1 px `line` on the bottom. No shadow. The header **does not hide on scroll**.

On student / parent the camera slot is omitted; search and bell shift left to the trailing edge.

This is Facebook’s hamburger + wordmark + glass + badge, with Amazon’s camera inserted **between the wordmark and the glass**. That is the only way five trailing-or-leading hits fit without wrapping. Do not add a sixth header icon. Do not put the camera inside a search field.

### 3.3 Hamburger drawer

A left sheet. Not a settings app. Not a grid of KPI tiles.

| Token | Value |
|---|---|
| Width | `min(304, window.width - 56)` |
| Height | 100% of window |
| Scrim | Light `rgba(26, 22, 18, 0.40)` · Dark `rgba(0, 0, 0, 0.55)` |
| Enter | 220 ms ease-out, `translateX` from `−width` |
| Exit | 180 ms ease-in, same axis. Tap scrim or swipe left-to-right past 80 pt closes |
| Row height | 52 (44 min hit) |
| Row pad | 16 |
| Hairline | `line`, inset 16 |

**Teacher rows, in order**

1. Identity block (not a destination): display name or email next to the 36 photo, `meta`, **1 line, marquee** (§30). Not a bio. Do not wrap to two lines.
2. **Classes** — one row per class, checkmark on the active class. Tap sets `active_class_id` and `replace`s to `/class/{id}`. Swipe-to-delete a class row **opens** the type-the-name confirm (§20). Full-swipe does not commit.
3. **Another class** — only if they will type a name; pushes `/` with `?switch=1` and the create field focused.
4. Hairline
5. **Grade book** → `/class/{active}/gradebook?view=book`
6. **Parents** → `/class/{active}/parents`
7. **Family update** → `/class/{active}/family`
8. Hairline
9. **Appearance** — the same `AppearanceControl` as Profile (System / Light / Dark). This is one of two homes for the control. Do not also put it on the context row.
10. **Sign out** — `danger` label. Signs out, `replace`s to `/`.

**Student rows**

1. Identity: display name + class name, `meta`. **No photo in the current drawer.** Do not marquee this block — it is not picture-adjacent. (Teacher identity next to the 36 photo **does** marquee, §30.)
2. **Leave class** — clears the student session, `replace`s to `/join`.
3. **Appearance** — same control. Student follows the resolved scheme; they may pin on this device.

**Parent rows**

1. Identity: parent `display_name` (or “Parent”) + child first names, `meta`. **Current drawer has no 36 circle** (`HamburgerDrawer.tsx` is plain `Text`). Do not marquee this block in this pass. If a parent photo is added later, the name next to it marquees (§30).
2. **Children** — one row per **linked** child on this parent record (`parent_students`), not per stored device token. Each row focuses that child on `/parent`. One child: omit the section.
3. **Appearance** — same control.

Parent cannot delete a child, revoke their own invite, or edit teacher notes. Leave those controls off this drawer.

Device may still cache more than one invite token (two parents on one phone). If `tokens.length > 1` **and** they resolve to different `parent_id`s, list those parents as a quiet extra block under Children. Do not merge other families.

### 3.4 Floating tray — icons and order

**Conflict resolution (required).** Facebook puts Profile on the far right. Amazon put Rufus / Alexa on the far right. Kelyra keeps **both**: Profile stays bottom-right (Facebook); Ask sits immediately left of Profile (Amazon Rufus). Do not drop either. Do not put Ask on Profile.

Phone (`width < 720`): a **floating frame** over the content, not a system tab bar.

```
[  frame: elevated, radius 22, 1px line, light whisper shadow  ]
[  pad 6 · icons 24 · hit 48 · no labels on phone              ]
```

| Token | Portrait | Landscape phone |
|---|---|---|
| Frame height | 56 | 44 |
| Horizontal inset | 12 | `max(insets.left, insets.right, 12)` |
| Bottom inset | `8 + max(insets.bottom, 8)` | `6 + max(insets.bottom, 6)` |
| Icon | 24 | 22 |
| Hit | 48 × 48 | 44 × 44 |
| Labels | **none** (six icons will not fit labels) | none |
| Active | `brand` icon, no wash pill | same |
| Inactive | `mute` icon | same |

Content draws **under** the frame. Last-scroll padding on every tray screen = frame height + bottom inset + 12, so the last row is not trapped.

**Teacher tray (6), left → right**

| # | Icon (`Icon` name) | Header title | Route | Active when |
|---|---|---|---|---|
| 1 | `today` (house) | **Kelyra** | `/class/{activeId}` or `/` if none | `/` or `/class/{id}` and not setup / gradebook / family / student / parents / parent |
| 2 | `capture` | **Capture** | `/capture` | `/capture` (not `/proposal`) |
| 3 | `inbox` | **Inbox** | `/inbox` | `/inbox` |
| 4 | `records` | **Class** | `/class/{id}/setup` | path ends with `/setup` or `/gradebook` or `/parents` or `/parent/` |
| 5 | `ask` **(new glyph)** | **Ask** | `/ask` | `/ask` |
| 6 | `person` **(new glyph)** | **Profile** | `/profile` | `/profile` |

House is always the start. Profile is always last. Ask is always immediately left of Profile.

Family, All classes, Appearance, Sign out live in the hamburger, not the tray.

**Student tray (3)**

| # | Icon | Title | Route |
|---|---|---|---|
| 1 | `today` | **Kelyra** | `/todo` |
| 2 | `ask` | **Ask** | `/ask` |
| 3 | `person` | **Profile** | `/profile` |

**Parent tray (3)**

| # | Icon | Title | Route |
|---|---|---|---|
| 1 | `today` | **Kelyra** | `/parent` |
| 2 | `ask` | **Ask** | `/ask` |
| 3 | `person` | **Profile** | `/profile` |

### 3.5 Header title per tab

The wordmark is the Facebook title swap:

| Selected tray icon | Wordmark text |
|---|---|
| House | `Kelyra` |
| Capture | `Capture` |
| Inbox | `Inbox` |
| Class | `Class` (class home, roster, heatmap, grade book). Named class destinations keep their name: `Assignments`, `Parents`. |
| Ask | `Ask` |
| Profile | `Profile` |

Pushed screens (student record, search, notifications, proposal, family, assignment form) keep this header **and** a leading back chevron that replaces the hamburger until pop. The wordmark becomes the pushed screen’s name (`Maya Chen`, `Search`, `Notifications`, `Look at this`, `Family`, `New Assignment`). Pop restores hamburger + tab title.

### 3.6 Second header row — context menu

Amazon’s department / filter row. Sits **directly under** the pinned header. Hides and shows **with the tray**, same physics (§9). It is not a second tab bar.

Height 44. Horizontal `ScrollView`, no snap. Chips: height 32, pad 12, radius `pill`, `hitSlop` to 44. Selected: `brandSoft` fill, `brand` label. Unselected: transparent, `ink` label. Leading inset = page pad.

| Tab | Chips | Default | What they do |
|---|---|---|---|
| Home (teacher) | **Today** · **This week** · **Needs you** | Today | Filters the Home body (§13.3). Data from `loadClassOverview` + `listInbox` |
| Capture | **Photo** · **Voice** · **Pages** | Photo | Focuses the well / recorder / pager. Does not change route |
| Inbox | **Needs a name** · **Review** · **All** | All if both queues have items, else the non-empty one | Filters `listInbox` |
| Class | **Roster** · **Parents** · **Heatmap** · **Grade book** | Roster | Navigates `/setup` · `/parents` · `/gradebook?view=heatmap` · `/gradebook?view=book` |
| Ask | none | — | Empty row collapsed (height 0) |
| Profile | none | — | Collapsed. Appearance / Sign out live in the hamburger and on the page, not here |
| Student Home | **To-do** · **Done** | To-do | Filters `/todo` |
| Parent Home | none, **or** one chip per **linked child** on this parent | First linked child | Switches the bound child. Never lists other families |

On pushed screens (student record, proposal, family, search, notifications) the context row is **omitted**.

### 3.7 New surfaces (named; not yet in the repo)

| Route | File | Why it is new |
|---|---|---|
| `/profile` | `src/app/profile.tsx` | Bottom-right Profile tab |
| `/ask` | `src/app/ask.tsx` | Amazon-style AI agent chat |
| `/notifications` | `src/app/notifications.tsx` | Bell target. Not a chat product |
| `/search` | `src/app/search.tsx` | Magnifying-glass canvas |
| `/proposal` | `src/app/proposal.tsx` | Post-camera confirmation sheet |
| `/class/{id}/parents` | `src/app/class/[id]/parents.tsx` | Class parents directory |
| `/class/{id}/parent/{parentId}` | `src/app/class/[id]/parent/[parentId].tsx` | Parent person page |

`/class/[id]/assign` stays an unused placeholder. Do not add it to any chrome.

### 3.8 Web / tablet (`width >= 720`)

The floating tray is **replaced** by a slim top bar under the header, height 48, same destinations, labels visible. Ask still sits immediately left of Profile. Hide-on-scroll still applies to the **context row**. The top bar itself stays pinned (it *is* the header cluster + tabs). No left rail. Delete `teacherNav.railWidth` / `wideAt: 960`.

---

## 4. Color tokens

Two complete palettes. Same token names. Hex only. No opacity for text. Components consume tokens from `useTheme()`. Never hard-code a hex in a screen.

Type, space, and radius do not change between themes. Only color and elevation change.

These are **not** Meta blue, Instagram purple, or Amazon orange. Light is warm daylight paper + terracotta. Dark is a designed sibling.

### 4.1 Light / colorful

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `bg` | `#F7F3EC` | Screen canvas | — |
| `elevated` | `#FFFCFA` | Header, tray frame, fields, drawer | — |
| `card` | `#FFFFFF` | Cards, photo mats, table body | — |
| `ink` | `#1A1612` | Primary text | ≥ 15:1 on `bg` |
| `mute` | `#6A635B` | Meta, placeholders, section labels | ≥ 4.6:1 on `bg` |
| `line` | `#E7E0D6` | Hairlines only. Never text | — |
| `brand` | `#B03E0E` | The one next action. Focus skill | White-on-brand ≥ 4.6:1 |
| `brandSoft` | `#F8E2D4` | Selected chip, focus wash | — |
| `brandInk` | `#FFF8F3` | Text on `brand` fill | ≥ 4.6:1 |
| `good` | `#1F6B40` | Approved, done | ≥ 4.6:1 on `bg` |
| `goodSoft` | `#DCEFE4` | Approved / done wash | — |
| `warn` | `#8F5610` | Waiting | ≥ 4.6:1 on `bg` |
| `warnSoft` | `#F8E7C8` | Waiting wash | — |
| `danger` | `#B53A32` | Stop recording, thrown errors, **bell badge** | ≥ 4.6:1 on `bg` |
| `dangerSoft` | `#F8DDD9` | Stop / error wash | — |
| `focus` | `#B03E0E` | Same hex as `brand` | — |
| `wash` | `#EFE8DE` | Avatars, zebra, empty wells | — |

`brand` is the single primary action and the focus skill. The bell badge is the one place `danger` is used as chrome (Facebook-red muscle memory, our brick, not `#E41E3F`). Status copy is `mute`. Never use `danger` for “Asking AI…”.

### 4.2 Dark

An equal sibling, not an invert. Photographic work must still read. Brand is a large clay block, not a thin outline.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `bg` | `#141311` | Screen | — |
| `elevated` | `#1E1C19` | Header, tray, fields, drawer | — |
| `card` | `#26231F` | Cards, photo mats, table body | — |
| `ink` | `#F4EFE6` | Primary text | ≥ 15:1 on `bg` |
| `mute` | `#B0A79C` | Meta | ≥ 7:1 on `bg` |
| `line` | `#3D3832` | Hairlines | — |
| `brand` | `#E07A3A` | Next action | Dark-on-brand ≥ 7:1 |
| `brandSoft` | `#3C2418` | Selected chip | — |
| `brandInk` | `#1A120C` | Text on `brand` | ≥ 7:1 |
| `good` | `#5FBE82` | Approved, done | ≥ 7:1 on `bg` |
| `goodSoft` | `#1A2E22` | Wash | — |
| `warn` | `#E0A04A` | Waiting | ≥ 7:1 on `bg` |
| `warnSoft` | `#2E2416` | Wash | — |
| `danger` | `#F07A70` | Stop, errors, bell badge | ≥ 7:1 on `bg` |
| `dangerSoft` | `#331C1A` | Wash | — |
| `focus` | `#E07A3A` | Same as `brand` | — |
| `wash` | `#2A2723` | Avatars, zebra | — |

Do not introduce a third theme.

### 4.3 Photos on both canvases

Homework photos sit on `card`, 1 px `line`, radius `lg`. Never invert, recolor, or wash the photograph. No drop shadow on photos.

### 4.4 Theme resolution

Exactly three modes. Labels in the UI are these three words:

| `mode` (stored) | UI label | Behavior |
|---|---|---|
| `system` | System | Follow the OS. Default if the user has never chosen |
| `light` | Light | Pin the light palette. Ignore the OS until changed |
| `dark` | Dark | Pin the dark palette. Ignore the OS until changed |

```
resolved scheme =
  mode === 'system'
    ? (OS is dark ? 'dark' : 'light')
    : mode
```

- Persistence: AsyncStorage key `kelyra.appearance`, value `'system' | 'light' | 'dark'`. Default `'system'`.
- When `mode === 'system'` and the OS flips, the app flips on the next frame. No reload. No wrong-canvas flash.
- Pinning Light or Dark ignores the system setting until `mode` changes.
- Student and parent **follow the resolved scheme on that device**. The picker lives on teacher Profile, teacher hamburger, student hamburger, and parent hamburger — not on every operational screen.

### 4.5 ThemeProvider

New file: `src/lib/theme/ThemeProvider.tsx`.

Wrap the existing tree in `src/app/_layout.tsx` as the **outermost** provider:

```
<ThemeProvider>
  <AuthProvider>
    <NavigationTheme>
      <StatusBar />
      <AppShell>          // header + context + tray + drawer
        <Stack />
      </AppShell>
    </NavigationTheme>
  </AuthProvider>
</ThemeProvider>
```

```ts
useTheme(): {
  colors: Palette;
  scheme: 'light' | 'dark';
  mode: 'system' | 'light' | 'dark';
  setMode: (mode: Mode) => void;
}
```

Detection: native `useColorScheme()` + `Appearance.addChangeListener`. Web: `matchMedia('(prefers-color-scheme: dark)')` with a `change` listener.

Hold the splash (`expo-splash-screen` `preventAutoHideAsync`) until the stored `mode` has been read and the first scheme is applied, then `hideAsync`.

StatusBar: `scheme === 'dark'` → `style="light"`; else `style="dark"`.

React Navigation seeded from `DefaultTheme` / `DarkTheme`, then:

```
primary: colors.brand
background: colors.bg
card: colors.elevated
text: colors.ink
border: colors.line
notification: colors.danger   // badge, not brand
```

Native `TextInput` uses `keyboardAppearance={scheme}`. Web `html { color-scheme: light | dark }`.

### 4.6 First paint

`app.json` already has `"userInterfaceStyle": "automatic"`. Keep it.

Splash plugin cannot ship two canvases. Use the light canvas as the safe first frame:

```
backgroundColor: "#F7F3EC"
```

`src/app/+html.tsx` must not hard-code `#F4EFE6`. Inline a boot script **before** paint that reads `localStorage['kelyra.appearance']` (AsyncStorage’s web key) and sets `backgroundColor` / `color` / `colorScheme` to the resolved pair (`#F7F3EC`/`#1A1612` or `#141311`/`#F4EFE6`).

### 4.7 Migration from current tokens

`src/constants/theme.ts` today exports a single light table and bakes `colors.ink` into `type.*`.

- Export `palettes.light` and `palettes.dark` with the hex tables above.
- Keep the token names. Do not rename.
- `type` becomes size / weight / line / tracking / fontFamily only. Color is applied at the call site from `colors.ink` or `colors.mute`.
- `paperShadow` becomes `shadows.light` and `shadows.dark` (§5).
- `webFocus.outlineColor` reads `colors.brand` at render time.
- Replace `teacherNav` with:

```
chrome = {
  headerHeight: 56,
  headerHeightLandscape: 44,
  contextHeight: 44,
  trayHeight: 56,
  trayHeightLandscape: 44,
  trayRadius: 22,
  trayInset: 12,
  drawerWidth: 304,
  topBarAt: 720,
  topBarHeight: 48,
}
```

Delete `teacherNav.wideAt` and `railWidth`. There is no rail.

---

## 5. Type, space, radius, elevation, hits

Shared across themes. System UI only. No font files.

```
ios:     System (SF Pro)
android: Roboto
web:     -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

| Token | Size / weight / line / tracking | Use |
|---|---|---|
| `display` | 30 / 700 / 36 / −0.5 | Student / parent name, join wordmark, empty-state title |
| `title` | 22 / 700 / 28 / −0.3 | In-page titles when the stack header is hidden (join, sign-in) |
| `section` | 12 / 600 / 16 / 0.8 | Uppercase tracked section labels |
| `body` | 16 / 400 / 24 / 0 | Instructions, gaps, prompts |
| `rowTitle` | 17 / 600 / 22 / 0 | `WorkRow` / `ListRow` / tray captions’ parent names |
| `meta` | 13 / 400 / 18 / 0 | Dates, “Heard:”, hints, status lines |
| `button` | 16 / 600 / 20 / 0.2 | Button labels |
| `pill` | 14 / 600 / 18 / 0 | `WorkRow` action pills |
| `badge` | 11 / 600 / 14 / 0.3 | Status pills, tray first-names, bell count |
| `cell` | 13 / 600 / 16, tabular-nums | Grade book cells and CSV-matching marks |

Roster / people names never wrap to two lines. Picture-adjacent names and titles **marquee** (§10.18, §30). Everything else that is 1 line still truncates (wordmark, status, meta, buttons, chips).

```
space:  4, 8, 12, 16, 24, 32, 48
radius: sm 8, md 12, lg 18, tray 22, pill 999
```

Phone padding 16. Tablet / web padding 24. **Hit target ≥ 44 × 44.** Chips and pills may be 32 tall if `hitSlop` makes up the rest.

Web focus: 2 px `brand` outline, offset 2.

Hairlines: 1 px `line`. On `@3x` native, `StyleSheet.hairlineWidth` is acceptable for table grids only.

| Scheme | Tray / drawer / sticky |
|---|---|
| Light | `0 2px 12px rgba(26, 22, 18, 0.10)` (iOS: `shadowColor #1A1612`, opacity `0.10`, radius 12, offset `{0, 4}`; Android: `elevation 3`) |
| Dark | **None on cards.** Tray and drawer get a 1 px `line` only |

Press: opacity `0.88` on filled controls, `0.7` on ghosts and header icons. No springs.

---

## 6. Rotation

### 6.1 Unlock

Current blocker: `app.json` has `"orientation": "portrait"`.

```json
"orientation": "default",
"userInterfaceStyle": "automatic"
```

`"default"` = all orientations except upside-down on iPhone. Do not lock any screen. Capture and `/proposal` must rotate so a landscape worksheet can be photographed and still reach Approve / Save.

`supportsTablet: true` stays.

### 6.2 Detection

Source of truth: `useWindowDimensions()`.

```
width > height  ⇒  landscape
width <= height ⇒  portrait
```

Safe areas: `useSafeAreaInsets()`. In landscape, left/right insets apply to the header, the tray, and sticky CTAs. Never draw a photo or a primary button under the home indicator or the notch.

Rotation is live. Relayout. Do not animate the rotate. No “please rotate back” interstitial.

### 6.3 Breakpoints

| Name | Rule |
|---|---|
| `phone-portrait` | `width < 720` and `height >= width` |
| `phone-landscape` | `width >= height` and `width < 900` |
| `tablet` | `width >= 720` |

```ts
useLayout(): {
  width: number;
  height: number;
  pad: 16 | 24;
  orientation: 'portrait' | 'landscape';
  breakpoint: 'phone-portrait' | 'phone-landscape' | 'tablet';
  isPhone: boolean;
  isSplit: boolean;     // width >= 900
  showTopBar: boolean;  // width >= 720
}
```

### 6.4 Chrome in landscape

- Header 44, wordmark 16 / 700, icons 22.
- Context row 36 (chips still 32).
- Tray 44, icons only (already), horizontal inset respects notch / home indicator.
- Hide-on-scroll still works.
- Capture and `/proposal` use the wide side for the photo and keep Confirm / Save on screen (§13.4, §13.16).
- Grade book is why landscape exists (§13.7).

---

## 7. Information types → list direction

Amazon’s rule, applied to Kelyra. Classify first, then pick a primitive.

### Horizontal shelves (Instagram circles or Amazon carousel)

| Information | Primitive | Where |
|---|---|---|
| Students in the active class | `AvatarTray` | Teacher Home, teacher Class / Roster, join-name picker (circles optional; ListRow still wins for picking) |
| Parents linked to this class (have a child enrolled here) | `AvatarTray` | Class / Parents, student-page Parents section |
| A parent’s children (only if > 1) | `AvatarTray` | Parent Home, parent hamburger |
| Classmates (first name + photo/initials only) | `AvatarTray` | Student Home |
| This week’s work that needs the teacher | `WorkShelf` (compact thumbs, max 12) | Teacher Home, **Needs you** chip |

### Vertical feeds (Amazon order list)

| Information | Primitive | Where |
|---|---|---|
| Inbox captures | `WorkRow` + swipe | `/inbox` |
| A student’s homework scans | `WorkRow` + swipe | Student record |
| Practice sets | `WorkRow` | Student record, student to-do (worksheet still wins on `/todo`) |
| Notifications | `ListRow` (people-row) | `/notifications` |
| Family updates (in-app list) | `ListRow` | `/class/{id}/family` |
| Search hits | `ListRow` or `WorkRow` by type | `/search` |
| Skill / gap history | Timeline `ListRow` (date + phrase + skill). **Not** a `WorkRow` | Student record |
| Grade-book rows | `StickyTable` — **not** a `WorkRow`, **not** a feed | `/gradebook` |

The grade book stays a **sheet**. A `WorkRow` cannot express students × assignments. Landscape exists for this grid. Do not “Amazon-ify” it.

---

## 8. Status language

Never show raw enums (`draft_scored`, `note_only`, `attached`, `unassigned`, `submitted`).

| Data | Badge / phrase | Tone | Meaning |
|---|---|---|---|
| capture `unassigned` | **Needs a name** | `warn` | File it |
| capture `attached` / `draft` | **Review** | `warn` | Approve it |
| capture `approved` | **Approved** | `good` | It’s a grade |
| capture `note_only` | **Note** | `mute` / `wash` | Kept, not graded |
| practice `assigned` / `draft_scored` | **Assigned** | `warn` | Student has work |
| practice `submitted` | **Turned in** | `warn` | Teacher should look |
| practice `approved` | **Done** | `good` | Closed |
| current focus skill | **Focus** | `brand` | This week’s skill |

The loop the teacher can say out loud:

> Photo → needs a name → review → approved → practice assigned → turned in → done

`formatCell` / CSV already emit `—`, `Assigned`, `In`, a score, `Done`, `Draft`. Keep those strings in lockstep with the grid (§15). `Draft` is teacher-only and only inside the grade book.

Skill history (`humanGapStatus`) uses the same phrases: `Review`, `Approved`, `Note`, `Assigned`, `Done`, `Proficient`, `Stopped focusing`.

---

## 9. Hide-on-scroll physics

Same physics for the **floating tray** and the **context row**. The **header stays pinned**.

This matches what Facebook users describe in 2026 and what iOS 26’s `onScrollDown` does: scroll down (content moves up) → chrome leaves; scroll up → chrome returns.

### 9.1 Input

Listen to the screen’s vertical `ScrollView` / `FlatList` `onScroll` (`throttle` 16).

```
dy = contentOffset.y - lastY
```

Ignore events while `contentOffset.y < 8` (rubber-band at top always **shows** chrome).

### 9.2 Thresholds

| Gesture | Threshold | Result |
|---|---|---|
| Finger moves up, content goes down | accumulate `dy > 12` | **Hide** |
| Finger moves down, content goes up | accumulate `dy < −8` | **Show** |
| Fast flick down (`vy > 1.2` pt/ms) | any | Hide immediately |
| Fast flick up (`vy < −1.2`) | any | Show immediately |
| Release before threshold | — | Snap back to the last committed state |

Reset the accumulator on direction change.

### 9.3 Animation

- Duration **180 ms**. Easing `ease-out` (React Native `Easing.out(Easing.cubic)`).
- **No springs. No bounce. Do not use `react-native-reanimated` for this.**
- Tray: `translateY` from `0` to `trayHeight + bottomInset + 12` (slides off the bottom). Opacity 1 → 0.85.
- Context row: `translateY` from `0` to `−contextHeight` (tucks under the pinned header) + opacity 1 → 0.
- Both move **together**. Never one without the other.
- They are overlays. Hiding them must **not reflow** the scroll content (no jump).

### 9.4 What never hides

| Surface | Rule |
|---|---|
| Pinned header (hamburger · wordmark · camera · search · bell) | Always visible |
| `/proposal` confirm actions | Always visible |
| Sticky **Approve** / **Save to {Name}** / **Turn in** | Always visible. The tray may hide behind/below them; the CTA does not follow the tray |
| Live camera preview (Capture Photo chip, header-camera session) | Tray and context stay **hidden** for the whole preview so they do not fight the shutter |
| Image viewer / pinch zoom | Chrome hidden |
| Hamburger open | Tray hidden; drawer is the chrome |

On Capture, Student, and `/todo`, the sticky primary sits in a **fixed** slot just above the tray’s resting place. When the tray hides, the CTA **does not drop**. Teachers do not chase Approve.

### 9.5 Landscape

Same thresholds. Tray is shorter (44). Insets left/right still apply while hidden (the off-screen translate includes them).

---

## 10. Component specs

All primitives read `const { colors, scheme } = useTheme()`. No static `import { colors } from '@/constants/theme'` for paint.

### 10.1 `AppHeader`

New file `src/components/ui/AppHeader.tsx`. Replaces the stack header on every chrome-visible route. React Navigation `headerShown: false` on those screens.

Slots as §3.2. Back chevron (`ink`, 22) replaces hamburger on pushed routes.

Bell badge:

- Size 16 × 16 (18 if `99+`).
- Fill `danger`, label `brandInk` (light) / `#1A120C` (dark if AA needs it).
- Type `badge` 10 / 700.
- Position: top-right of the 44-hit, offset `+2, −2`.
- Cap `99+`.
- `accessibilityLabel`: `Notifications, {n} waiting` or `Notifications`.

Camera `accessibilityLabel`: `Take a photo`. Search: `Search`. Hamburger: `Open menu`.

### 10.2 `ContextMenuRow`

New file `src/components/ui/ContextMenuRow.tsx`. See §3.6. Hidden entirely when the chip list is empty.

### 10.3 `FloatingTabTray`

New file `src/components/ui/FloatingTabTray.tsx`. Replaces `TeacherNav`’s `TabBar` / `Rail`.

- `position: 'absolute'`, left/right/bottom as §3.4.
- `pointerEvents="box-none"` on the full-width wrap so content above remains tappable.
- Active icon `brand`. Inactive `mute`. No featured candy blob. No raised Capture pill.
- Inbox icon may show a count badge (`danger`, same anatomy as the bell, cap `99+`) from `countNeedsYou` (§11). House does **not** take the badge — Facebook puts activity on the bell and on Notifications, not on Home.
- `accessibilityRole="tab"`, `accessibilityState.selected`.

Web `showTopBar`: render the same destinations as a 48-pt top strip, labels on, no floating frame.

### 10.4 `HamburgerDrawer`

New file `src/components/ui/HamburgerDrawer.tsx`. Replaces `TeacherMenu.tsx` (the current component is a **right** popover — wrong axis, wrong contents).

Modal, transparent, `animationType="none"` — we own the 220 ms translate. Rows as §3.3.

### 10.5 `AvatarTray`

New file `src/components/ui/AvatarTray.tsx`. Instagram’s circle row, without rings.

```
[ circle 56 ] [ circle 56 ] [ circle 56 ] …
   Maya          Jamal         Priya
```

| Token | Value |
|---|---|
| Circle | 56 × 56, radius 28 |
| Photo | `resizeMode="cover"`, clipped to the circle. Source = signed URL of `students.photo_asset_id` or `parents.photo_asset_id` |
| No photo | existing `AvatarInitials` at 56, `wash` + `line`, initials `ink`. **No per-student colors. No story rings. No gradient stroke.** |
| Gap | 12 |
| Cell width | **68** (hit). Caption clip **64** |
| Caption | `badge` / 11 / 600, `ink`, 1 line, first name only (split on whitespace, take `[0]`). **Marquee** when it overflows the 64 clip (§30). Centered when it fits; start-aligned while crawling |
| Caption gap | 4 |
| Leading / trailing inset | page pad |
| Height | 56 + 4 + 16 = 76, plus 8 vertical pad = 84 |
| Scroll | horizontal, no paging, no snap, no auto-scroll |
| Press | opacity 0.88. Tap is the only action |

**Taps**

| Role | Tap a face | Destination |
|---|---|---|
| Teacher, students tray | That student | `/class/{id}/student/{studentId}` |
| Teacher, parents tray | That parent | `/class/{id}/parent/{parentId}` |
| Parent | Their child | Reload `/parent` for that child |
| Student | A classmate | `ClassmateSheet` — **photo or initials**, first name (**1 line, marquee** §30 under the 72), one sentence `In {className}.`, ghost **Close**. **No grades, no gaps, no notes, no photos of work, no last names unless needed to disambiguate.** If we are not ready to ship even that sheet, tap is a no-op and the tray is still shown for belonging. Prefer the sheet |

Do not add a leading “Your story” plus-circle. Do not add unseen rings.

**Unknown is not a navigation face.** The trailing empty-seat cell (§28) is opt-in (`allowUnknown`) and only legal on assignment pickers. Home, Roster, Parents, classmate, and parent-child trays stay people-only.

**Photo change does not live on the tray.** Tap always navigates (or opens the classmate sheet). Add / replace / remove is on the person page via the **Photo** pill (§21). Do not put tap-and-hold on a scrolling tray.

`TrayPerson.photoUrl` is first-class. Home, Roster, join list, parent child tray, and the student-page Parents section must pass it when `photo_asset_id` is set.

### 10.6 `WorkRow` (Amazon product row)

New file `src/components/ui/WorkRow.tsx`. The primitive for “a thing I can act on.”

```
┌──────────────────────────────────────────────┐
│ [ media 72 ]   Title                    [badge]
│                Status line
│                Meta
│ [ Primary pill ] [ Pill ] [ Pill ]
└──────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Media | 72 × 72, radius `md` (12), 1 px `line`, fill `card`. Photo `cover`. No photo: `AvatarInitials` 56 centered on `wash` |
| Title | `rowTitle` 17 / 600 / 22, `ink`, 1 line, **marquee** (§30). Student name **or** assignment title. Status and meta do **not** marquee |
| Status | `meta`, tone from §8, 1 line, truncate |
| Meta | `meta` / `mute`, 1 line, truncate. `{when} · {class or page count}` |
| Badge | existing `Badge`, top-right of the text column |
| Pills | wrap row, gap 8, top margin 10. Height 32, radius `pill`, pad 12, label `pill` 14 / 600, `hitSlop` → 44 |
| Primary pill | fill `brand`, label `brandInk`. **At most one per row** |
| Secondary pill | fill `elevated`, 1 px `line`, label `ink` |
| Ghost pill | transparent, label `mute` |
| Row pad | 12. Hairline bottom `line`, inset 16 |
| Press on media / title | opens the destination (student / capture) |
| Accessibility | each pill is its own button. Swipe actions (§10.7) must duplicate the pills |

**Do not put five filled brand buttons on a row.** If a row has more than three actions, the rest live in swipe or on the destination screen.

Used for: inbox items, student work history, practice sets on the teacher student page, Home **Needs you** expanded list. Not for the grade-book grid. Not for people-only lists (`ListRow`).

### 10.7 Swipe-to-act

Wrap `WorkRow` in a horizontal gesture (implement with `react-native` `Animated` + `PanResponder`, or the RN `Swipeable` if it is already in the tree via React Native Gesture Handler — **do not add a package**). `react-native-gesture-handler` ships with Expo; use `Swipeable` from it if already linked, else `PanResponder`.

| Token | Value |
|---|---|
| Reveal width | 80 pt per action, max 2 actions per side |
| Snap-open | release past 56 pt |
| Full-swipe auto-commit | release past `max(120, 0.4 * rowWidth)` **only for non-publishing actions** |
| Snap-back | release earlier, 160 ms ease-out |
| Action tile | full row height, label 12 / 600, icon 20, color below |

**Inbox (`unassigned`)**

| Side | Action | Tile | Commit |
|---|---|---|---|
| Trailing (swipe left) | **Assign** | `brand` fill, `brandInk` | Opens the name picker. Does **not** auto-pick a student |
| Trailing 2 | **Open** | `wash`, `ink` | Pushes the capture’s destination (inbox card expanded / student if known) |
| Leading (swipe right) | **Note only** | `wash`, `mute` | Sets `note_only` after a confirm: `Keep this as a note? It will not be a grade.` |

**Inbox (`draft` / Review)**

| Side | Action | Tile | Commit |
|---|---|---|---|
| Trailing | **Review** | `brand` | Pushes the student page. **Does not Approve** |
| Leading | **Note only** | `wash` | Confirm, then `markNoteOnly` |

**Student work history**

| Side | Action | Tile | Commit |
|---|---|---|---|
| Trailing | **Approve** | `brand` | **Opens the Approve sheet** on that capture. Never writes `approved` on release |
| Leading | **Note only** | `wash` | Confirm, then `markNoteOnly` |

**Practice set (teacher)**

| Side | Action | Commit |
|---|---|---|
| Trailing | **Open** | Scrolls to / opens the set |
| Leading | none | — |

**Hard rule.** Teacher Approve **cannot** be a silent full-swipe. Swipe **Approve** always opens the existing Approve UI so the teacher can edit the score and gaps. Full-swipe auto-commit is legal only for **Assign** (opens picker), **Open**, and **Note only** (after confirm).

**Delete is a new swipe action.** Tile: `danger` fill, light label `Delete`. Allowed on `WorkRow` (captures, practice) and `ListRow` (classes, students, parents, invites, parked roster drafts). **Full-swipe on Delete must not auto-commit** — same rule as Approve. Releasing past the full-swipe threshold **snaps open the reveal and opens the confirm sheet**. Releasing earlier snaps back. There is no undo, so the sheet must say `This cannot be undone.`

Un-filing a capture (send back to Inbox) is **not** delete. Trailing **Inbox** on the student work row, confirm `Send this back to Inbox?`, then `student_id = null`, `status = unassigned`. Delete removes the capture (§20).

Every swipe action **already exists as a pill** on the same row. VoiceOver / Switch Control users never have to swipe.

**Inbox (`unassigned` / Review) — add**

| Side | Action | Tile | Commit |
|---|---|---|---|
| Leading 2 (or trailing if Note only already took leading) | **Delete** | `danger` | Opens delete-capture confirm. Never auto-commits |

If a row already has two actions per side, **Delete** replaces the least-critical one on swipe and remains a ghost pill. Prefer: trailing Assign/Review + Open; leading Note only + Delete.

**Student work history — add**

| Side | Action | Tile | Commit |
|---|---|---|---|
| Leading 2 | **Delete** | `danger` | Opens delete-capture confirm. Inbox (return) stays a pill / the other leading slot |

**Practice set (teacher) — add**

| Side | Action | Commit |
|---|---|---|
| Leading | **Delete** | Opens delete-practice confirm |

### 10.8 `ListRow`

New file `src/components/ui/ListRow.tsx`. Facebook people row. Use for classes, roster-as-text, notifications, family invite list, join-name picker, skill-history timeline.

```
[ Avatar 36 ]   Name                         ›
                One status line
```

Height 52 / 56 with status. Avatar: photo 36 circle if `photoUrl`, else `AvatarInitials` 36. Name `rowTitle`, 1 line, **marquee** (§30). Status `meta` / `mute`, 1 line, truncate. Chevron `›` 18 / `mute` if the row goes somewhere. Hairline inset 16 + 36 + 12. Press opacity 0.88.

**Swipe-to-delete** on teacher `ListRow`s that represent something the teacher created (class, student, parent, invite, parked roster draft). Same physics as `WorkRow`. Delete tile `danger`. Full-swipe opens the confirm sheet and does **not** commit. Student / parent roles never get a delete swipe.

### 10.9 `WorkShelf`

New, Home **Needs you** only. Horizontal `ScrollView` of compact work thumbs: 72 × 72 media, caption `meta` 1 line **marquee** (§30), optional `Badge` on the corner. Cell width 80, gap 12. Tap → `/inbox` if needs-a-name, else the student page. Max 12 items from `listInbox`. Omit the shelf when empty. No decorative empty tray. No story rings.

### 10.10 Buttons

Existing `src/components/ui/Button.tsx`. Four roles stay.

| Role | Fill | Label | Height | When |
|---|---|---|---|---|
| **Primary** | `brand` | `brandInk` | 52 | The one next action |
| **Secondary** | `elevated` + 1 px `line` | `ink` | 52 | The peer that is not next |
| **Ghost** | transparent | `mute` | 44 | Quiet |
| **Danger** | `danger` | Light `#FFF8F3`. Dark `#1A120C` if contrast fails AA | 52 | Stop recording only |

One Primary per view. Label `numberOfLines={1}`. Disabled opacity 0.4, still 52 tall.

### 10.11 Media frame

Existing `PhotoFrame` + `PhotoPager` + `ImageViewer`.

| State | Treatment |
|---|---|
| Empty well | Dashed 1 px `line`, fill `wash`, title `Photograph the work`, meta `One student per photo.` |
| One page | Hero `flex: 1` on Capture / Student / Proposal. `contain` in heroes so a worksheet is not cropped to death. `cover` in `WorkRow` / shelf |
| Multi-page | Horizontal pager, `Page n of m · swipe`, 7-pt dots (`line` / `brand`) |
| Tap (not in a swipe) | `ImageViewer`. Pinch to zoom |

Frame: radius `lg`, 1 px `line`, fill `card`. No drop shadow.

Heights: compact 160; portrait hero min 220 max 420; landscape hero = the whole left pane.

### 10.12 Search field (inline)

Existing `TextField`. Height 48. Placeholder context-specific (`Find a student`). Type filters immediately. Empty: `No names match that search.` **Never** a wall of chips for an 80-name roster.

The header magnifying glass does **not** expand this field in place. It pushes `/search` (Facebook canvas).

### 10.13 Chips, Badge, Text field, Card, Avatar, Section header

Keep the existing components. Theme them from `useTheme()`. Badge mapping stays (§8). Avatar: photo `cover` clipped to the circle when `photoUrl` is set; else `wash` + `line` initials. **No color wheel. No rings.** Sizes: 28 tables, 36 `ListRow`, 56 `AvatarTray`, 72 person-page hero, 96 parent/student photo hero if the page uses a larger product-detail circle (72 is the default).

Extract a shared `Avatar` primitive (`src/components/ui/Avatar.tsx`) that `AvatarTray`, `ListRow`, `WorkRow`, and person pages all use: `{ name, photoUrl, size }`. Do not fork three circle implementations.

### 10.14 Appearance control

`src/components/ui/AppearanceControl.tsx`.

- Track: height 36, radius `md`, fill `wash`, pad 3, three equal segments.
- Selected: fill `elevated`, 1 px `line`, light whisper shadow (none in dark). Label `ink` / 600. Leading `✓` on the selected segment.
- Unselected: no fill, `mute` / 600.
- Whole control min height 44. Each segment is its own 44-pt hit.
- `accessibilityRole="tablist"` / each segment `tab`.
- `setMode(...)` immediately. No confirmation.

Homes: teacher Profile, teacher hamburger, student hamburger, parent hamburger. Not on Today’s operational list. Not on the context row.

### 10.14b `ConfirmSheet`

New file `src/components/ui/ConfirmSheet.tsx`. The only confirm for delete. Spec in §20.1. Type-the-name for class, student, parent. Simple for everything else. Full-swipe Delete opens this sheet and does not commit.

### 10.15 Grade-book and heatmap cells

Existing `StickyTable` + `Heatmap`. Theme from tokens.

Grade-book cells: `cell` / tabular, centered. Color via `cellTone`. Strings from `formatCell` only.

Heatmap: color only. No letters, no `F`, no `•`.

| Mark | Fill | Stroke |
|---|---|---|
| Focus | `brandSoft` | 1 px `brand` |
| Approved gap | `goodSoft` | none |
| None | `wash` | none |

Students are **columns** (more assignments/gaps than students). Heatmap frozen column is the gap; grade book frozen column is the assignment tree (class ▾ unit ▾ section ▾ work).

| | Frozen label | Student column |
|---|---|---|
| `phone-portrait` | 156 | 56 |
| `phone-landscape` | 176 | 64 |
| `tablet` | 200 | 72 |

Row heights: grade book 44, heatmap 44 / 48. Head: grade book 76, heatmap 80. Implemented head is `studentHead` in `src/constants/table.ts` (96 tall, **72 wide on every breakpoint**, 56 avatar). First name under that avatar is **1 line, marquee** (§30). The 56 / 64 / 72 column table above is leftover — do not grow the student clip in landscape.

`Screen scroll={false}` on the grade-book view; the table `flex: 1`.

### 10.16 Join code, Phase banner

Existing. Theme-agnostic besides tokens. Phase banner compact on Capture, Inbox, Student, Records; full on Setup, Family, Home.

### 10.17 Icon additions

Extend `src/components/ui/Icon.tsx` (custom strokes, or `expo-symbols` if a glyph is missing). **Do not add an icon pack.**

New names: `search` (glass), `bell`, `ask` (simple spark / chat-bubble — **not** a smile, **not** a Meta mark), `person` (head-and-shoulders). Existing `menu`, `capture`, `today`, `inbox`, `records`, `close` stay.

### 10.18 `MarqueeText`

New file `src/components/ui/MarqueeText.tsx`. The overflow primitive for text that sits **under or beside a picture / mark**. Full recipe: §30.

```ts
MarqueeText({
  text: string;
  style?: StyleProp<TextStyle>;  // layout → clip; type → unconstrained Texts
  align?: 'start' | 'center';    // when the string fits. Overflow always pins start
  delay?: number;                // default 1200
  paused?: boolean;              // ORed with MarqueeScrollProvider
  accessibilityLabel?: string;
  accessible?: boolean;          // default false
  fadeColor?: string;
})

MarqueeScrollProvider({ children })
useMarqueeScroll(): { paused; scrollEpoch; scrollHandlers }
marqueeMetrics(clipWidth, textWidth, speed?): { gap; distance; duration; overflowing }
```

`MarqueeText` reads `MarqueeScrollProvider` internally. Callers **spread** `scrollHandlers` on `Screen`, `AvatarTray` / `WorkShelf` / `AssignmentPicker` `ScrollView`s, and **both** `StickyTable` horizontal scrollers. There is no wrapper that clones children. `ctx.paused` is true for the pan; `scrollEpoch` increments **once** on end-drag / momentum-end — do not `setState` from `onScroll`.

`AvatarTray`, `ListRow` title, `WorkRow` title, `WorkShelf` caption, table student heads, person heroes, **teacher** hamburger identity, `ClassmateSheet` name, and `AssignmentPicker` title all use this. They do **not** set `numberOfLines={1}` on a raw `Text` for those strings. Student / parent drawer identity is not picture-adjacent today — leave it.

Do **not** use it on buttons, chips, pills, the wordmark, status/meta lines, PhaseBanner, search fields, body copy, or frozen assignment / gap labels.

---

## 11. Badge counts (real numbers)

Hide every badge at 0. Cap `99+`.

```
countNeedsYou(classId) =
    count of captures in {unassigned, attached, draft}     // existing countInbox
  + count of submissions for this class with status submitted
```

Implement as `countNeedsYou` next to `countInbox` in `src/lib/captures/api.ts` (join assignments by `class_id` for the practice half). Do not invent a notifications table.

| Surface | Number |
|---|---|
| Header bell (teacher) | `countNeedsYou(activeClassId)` |
| Inbox tray icon | same number |
| Header bell (student) | count of that student’s submissions with `status = assigned` |
| Header bell (parent) | `1` if the bound child has a `parent_sentence` **or** a practice status of assigned/done **and** `kelyra.parent.lastSeenAt` is older than the newest of those timestamps; else `0`. Persist `lastSeenAt` when `/parent` or `/notifications` focuses. Do not invent unread rows |
| House icon | never |

Notifications list rows are derived from the same queries. Tapping a row goes to an **existing** screen (student, inbox, to-do, parent). This is not a chat product.

---

## 12. Ask — AI agent chat (new surface)

Route `/ask`. File `src/app/ask.tsx`. Amazon’s “bottom icon opens an agent,” Kelyra voice.

### 12.1 What it is

A chat with the signed-in role’s assistant. Teacher voice: filing, not a toy.

Suggested empty-state chips (teacher):

- `Who still needs a name?`
- `Draft a parent sentence for {first roster name}.`
- `What gaps did I approve this week?`

Composer at the bottom: field + send. Height 48 field, send is a 44-hit `brand` arrow, disabled when empty.

Bubbles: teacher/user right, `brandSoft`; assistant left, `card` + `line`. Radius `lg`, pad 12, `body` 16. Meta timestamp `meta` under the last bubble.

### 12.2 How it calls AI

New `invokeAi` name `'ask-assistant'`. Same gateway as everything else (`src/lib/ai/invoke.ts`). **No API keys in the client.** Add the union member; implement the Edge / `ai:dev` handler as a thin wrapper around the existing adapter.

Request body:

```
{
  role: 'teacher' | 'student' | 'parent',
  classId?: string,
  studentId?: string,     // bound student for student/parent
  messages: { from: 'user' | 'assistant', text: string }[],
}
```

The server injects **only** what that role may see (below). Persist nothing as a grade.

### 12.3 What the agent is allowed to see

| Role | Allowed | Forbidden |
|---|---|---|
| Teacher | Active class roster first names, inbox counts, draft/approved gaps, focus skills, practice assigned/turned-in/done, teacher notes, parent names that exist | IEP/504 text, other teachers, raw parent emails, allergies/emergency dumps, auto-Approve, auto-delete |
| Student | Their display name, class name, assigned practice items, approved focus skill | Other students, drafts, scores, parent sentences, roster last names if we only show first names on the classmate tray — **use first name + last initial when needed to disambiguate, never another student’s gaps** |
| Parent | Their child(ren)’s name, class, approved focus, assigned/done, the published `parent_sentence`, own photo, linked-child photos, month/day birthday | Scores, photos of work, drafts, other families, “Grok”, unpublished sentence, allergies, emergency, teacher notes, student phone/email/address |

### 12.4 Hard limits

- The agent **never Approves**.
- The agent **never inserts a student**. If it wants a name filed, it tells the teacher to open Inbox.
- The agent **never invents a class**.
- The agent may **draft** a parent sentence or a gap label into the chat; writing it to the record still happens on the student page, by the teacher, via Approve / save.
- If the model is unsure: `I can’t tell from what’s saved. Open Inbox or the student’s page.`
- Empty / error: `Ask is offline. Try again in a moment.` (`mute` / `danger` respectively)
- Do not brand the bubbles “Grok.” On-screen name: **Ask**.

### 12.5 Portrait / landscape

Portrait: bubbles `flex: 1`, composer sticky above the tray slot (tray may hide; composer stays).

Landscape: same column, `maxWidth` 640, centered. Do not put the composer in a side pane.

---

## 13. Screen-by-screen

Every recipe names: job, primary action, vertical order, empty / loading / error, then portrait and landscape. Scheme is not restated — tokens handle it.

Shared:

- Loading: one `meta` line, `Loading…`. No skeleton pulse.
- Error: `body` / `danger`. One sentence. No stack traces.
- Empty: `title` or `body` / `mute`, quiet. Not an error.

Chrome (header + context + tray) as §3 unless a screen says otherwise.

---

### 13.1 `/` — Class picker — `src/app/index.tsx`

**Job.** Sign in if needed. Otherwise pick a class, or name the first one.

**Primary.** `Teacher sign in` (signed out) or `Create class` (signed in).

**Routing (unchanged).** One class and no `?switch` → `replace` to `/class/{id}`.

#### Signed out

Vertical: wordmark `Kelyra` → lead `Photograph the work. Approve the gap. Send a short practice set.` → Primary `Teacher sign in` → Ghost `Student join`.

No teacher chrome. Portrait and landscape: centered column, `maxWidth` 400.

#### Signed in, zero classes

Header title `Kelyra`. Tray House active. No camera usefulness until a class exists (camera still opens, proposal will say `Name a class first`).

Vertical: `Name your class` → field → Primary `Create class` → hamburger holds Appearance + Sign out.

#### Signed in, `?switch=1` or 2+ classes

`ListRow` per class (initials, name, no meta) → `Another class` + field + Primary `Create class`.

Portrait: `maxWidth` 480. Landscape phone: same. Tablet: left-aligned in the content well.

---

### 13.2 `/sign-in` — `src/app/sign-in.tsx`

**Job.** Teacher email + password.

**Primary.** `Sign in`. Ghost `Create account`.

No chrome. Centered column, `maxWidth` 400, both orientations.

---

### 13.3 `/class/[id]` — Home (House) — `src/app/class/[id]/index.tsx`

**Job.** What needs me, then the people. This is Home. Header title: **Kelyra**.

**Primary.** None on the page. The header camera and the Capture tab are the next actions. Do **not** put a filled `Photograph work` on Home.

**Context chips:** Today · This week · Needs you.

**Vertical order (Today — default)**

1. Pinned header `Kelyra`.
2. Context row.
3. `PhaseBanner` phase 2.
4. Lead, `mute`, one sentence. Existing three states stay (no roster / waiting / quiet).
5. **`AvatarTray`** of the roster. Tap → student page. Empty roster: omit the tray.
6. If `listInbox` is non-empty, a short **Needs you** `WorkShelf` (max 12).
7. Optional quiet `ListRow`s only if we still need a teaching cue: `Add students` → Setup, shown **only** when roster is empty.

**This week.** Same tray of people. Under it, a vertical `WorkRow` list of captures and practice submissions from the last 7 days (`approved_at` / `created_at` / `submitted_at` ≥ now − 7d). Include turned-in practice (`status = submitted`).

**Needs you.** Hide the people tray. Vertical `WorkRow` of `listInbox` + turned-in practice. This is the same pile as the bell.

**Portrait.** One column.

**Landscape / tablet.** People tray still full width (it is a horizontal shelf). The vertical list may go two-up on `tablet` only if each `WorkRow` stays ≥ 300 pt. Default: one column.

**Empty roster.** Skip tray and shelf. Quiet card: `No students yet.` Ghost `Add students` → Setup. Camera / Capture still exist.

**Loading.** `Loading…` under the lead.

**Error.** Existing error line.

The old `StickyTable` roster, the big-number “Needs you” card, and the filled `Photograph work` **go away**.

---

### 13.4 `/capture` — Capture — `src/app/capture.tsx`

**Job.** Photograph a stack, say the name, file, stay put. This is the composer. The header camera is the *classifier*; this tab is the *stack*.

**Primary.** Sticky `Save to {Name}` or `Save to Inbox` (existing `preview.button`). Hidden until there is a photo, a recording, or typed text.

**Do not change save routing.** After save: `resetSlip()`, stay on Capture, `mute` confirmation.

**Context chips:** Photo · Voice · Pages.

- **Photo** — focuses the well / shutter.
- **Voice** — focuses `Record the name`.
- **Pages** — focuses the pager + `Add a page`.

**Portrait**

```
PhaseBanner compact
Lead: Photograph one student’s work, then say the name. Incomplete is fine.

[ Photo well — flex ]
Take photo / Add a page / Choose from library / Device picker
Ask AI to guess the name     ← Ghost, only if hasMedia && !recording

Who is this?
Record the name / Stop
Typed name field
Hint
Suggested gaps (chips, read-only)

[ sticky ] Save to Maya Chen
```

When the well is empty and nothing is typed, no sticky. `Take photo` is the only Primary. The moment a page or a name exists, `Take photo` demotes to Secondary and Save is the only Primary.

**Landscape — flagship split** (`isSplit` or `phone-landscape` with `width >= 640`)

```
┌─────────────────────────────┬──────────────────────────┐
│  Photo well / live camera   │ Who is this?             │
│  (whole left pane)          │ Record / typed / hint    │
│  Shutter row under well     │ Suggested gaps           │
│                             │ [ Save to Maya Chen ]    │
└─────────────────────────────┴──────────────────────────┘
```

Left `flex: 1.2`. Right min width 280. Save pinned to the bottom of the right column. Do not force a portrait camera preview.

**Live camera.** Hide tray + context for the preview (§9.4). Header stays (teacher can cancel).

**Empty / signed out.** Existing. Tray hidden until signed in.

The header camera is **available on this tab** and hops to `/proposal` rather than appending to the stack well. That is intentional: classifier vs stack.

---

### 13.5 `/inbox` — Inbox — `src/app/inbox.tsx`

**Job.** A work queue.

**Primary.** None at page level. Each `WorkRow` carries its own pills.

**Context:** Needs a name · Review · All.

**Each item is a `WorkRow`:**

- Media: photo page 1, or initials if voice-only.
- Title: `matchedName` or `Needs a name`.
- Status: §8.
- Meta: `{when} · {page count | Voice note}`.
- Heard: folded into meta or a second status line, 1 line, truncate.
- Pills, unassigned: **Assign name** (primary) · **Open**.
- Pills, review: **Review** (primary) · **Note only**.

Assign name opens an in-row or sheet roster (`ListRow` + search if `roster.length > 8`). Never a chip wall. `attachCapture` then `push` the student page — **keep that routing**.

Swipe as §10.7.

**Portrait.** One column.

**Landscape.** Still one column. Wider photo in the 72 well is enough. Two-up only on `tablet` if each row ≥ 300.

**Empty.** `Nothing waiting. Work without a clear name lands here.`

Lead stays: `Work without a clear name waits here. Matching never creates a student.`

---

### 13.6 `/class/[id]/student/[studentId]` — Student record

**Job.** One glance at the work, then Approve. Pushed screen: hamburger becomes back. Wordmark = student name. No context row. **This pass also makes the page the student’s person record** (photo, Details, parents, delete) — Approve stays the primary job; see §25 for the header / Details / Parents / Delete deltas.

**Primary.**

- Before approve, and there is at least one gap: `Approve`.
- After approve: `Give practice`.
- `Approve & give practice` is Secondary.
- `Ask AI`, `Add gap`, `Keep as a note`, `Dismiss focus` stay ghosts / secondary as today.
- **Create parent link** is replaced by the Parents section (§22.4): Add parent, then invite.

Do not hide Approve behind a long scroll.

**Portrait**

```
Focus row
PhaseBanner compact
Lead: Look at the work, then approve. Nothing is a grade until you do.

[ Photo hero ]
Heard / note
Suggested gaps (editable before approve)
Badge
Approve / Approve & give practice / ghosts

Mark proficient / Dismiss
Parents                ← AvatarTray + Add parent (§22.4)
Skill history          ← timeline ListRows, newest first
Work                   ← WorkRows of this student’s captures, swipe §10.7 (Delete + Inbox)
Practice               ← WorkRows of sets (Open / Assign / Delete)
Delete {first}         ← last ghost, type-the-name
```

**Landscape split** (`width >= 640`): photo left, decision right, Approve pinned in the right column. History / practice / parent scroll under the split, full width.

**Empty.** `No work filed yet.` Ghost `Photograph work` → `/capture`.

**Asking AI.** `Asking AI… this can take a few seconds.` is `mute`.

Swipe Approve on a work row **opens this same decision**, already scrolled to that capture. It does not write `approved`.

---

### 13.7 `/class/[id]/gradebook` — Class / Grade book + Heatmap

**Job.** A paper mark book. Why landscape exists. Reached from the **Class** tray icon and from the hamburger.

**Header title:** `Class`.

**Context:** Roster · Heatmap · Grade book.

- **Roster** navigates to `/class/{id}/setup`.
- **Parents** navigates to `/class/{id}/parents`.
- **Heatmap** is this file with `?view=heatmap` (or in-page switch): the existing `Heatmap` fills the body.
- **Grade book** is the existing `StickyTable`.

**Primary.** None. Ghost `Export CSV` when there are columns.

**Portrait.** Table `flex: 1` (`Screen scroll={false}`). Heatmap same.

**Landscape.** Frozen name 148 / 168. Assignment columns 88 / 96. Student-column names under the 56 avatar **marquee** (§30) — do not wrap. Frozen assignment titles stay 2 lines. Header 44 in `phone-landscape`.

**Empty book.** `No columns yet. Approve work or assign practice.`

**Empty heatmap.** `Approve a gap to see who else has it.`

CSV: `formatCell` strings. Theme-independent. §15.

---

### 13.8 `/class/[id]/setup` — Class / Roster

**Job.** Name is enough. Speak, photograph the printed list, or type. Confirm every name.

**Header title:** `Class`. Context: Roster (selected) · Parents · Heatmap · Grade book.

**Primary.** Context-sensitive, one at a time: `Add N students` / `Rename {old} to {new}` / `Add {name}`.

**Vertical.** Phase 1 → lead → Join code card → parked roster-import card if any (§20) → Add students card (photo / record / type / confirm checklist) → `AvatarTray` of the roster (photos) → search + `ListRow`s if they need to open a student → last ghost **Delete class** (type-the-name).

**Portrait.** One column.

**Landscape.** Join + add-students left, tray + roster right when `isSplit`. On `phone-landscape`, one column; the printed-list camera uses the wide side. Do not stretch the join-code words to 900 pt.

The header camera on this tab still goes to `/proposal`. If the classifier says **roster**, the teacher lands on the existing confirm checklist. That is the same photo-of-list flow, just started from the camera icon.

---

### 13.9 `/class/[id]/family` — Family (hamburger only)

**Job.** Students join with two words. Parents get a link from a student’s page.

Pushed from the drawer. Wordmark `Family`. No context row. Not a tab.

**Primary.** None. Ghosts: `Copy family update`, `This week's update`, `Email this week's update`.

**Vertical.** Phase 4 → lead → Join code → Send a note home → Who to invite as `ListRow`s (name, meta = focus or `—`, chevron → student page).

Portrait / landscape: centered column, `maxWidth` 640. Tablet landscape: join + digest left, roster right.

Artifacts are theme-independent (§15).

---

### 13.10 `/class/[id]/assign` — unused

Placeholder. Do not style it into the IA. Do not link it.

---

### 13.11 `/join` — Student join — `src/app/join.tsx`

**Job.** Type two words, pick your name.

**Primary.** `Find class`. After results, the `ListRow` is the action.

No chrome until a name is picked (then `/todo` has chrome).

Vertical: `Kelyra` → `Join your class` → helper → field → Primary → `Pick your name` + `ListRow`s.

Centered column, `maxWidth` 400. **Do not stretch the join field.** Follows the device’s resolved scheme. No appearance picker on this screen.

---

### 13.12 `/todo` — Student Home — `src/app/todo.tsx`

**Job.** A worksheet. Turn in.

**Header title:** `Kelyra`. Tray House active. Context: To-do · Done.

**Primary.** Sticky `Turn in` while a set is `assigned`. After submit, no primary.

**Portrait**

```
AvatarTray of classmates     ← first names / initials only
{displayName}                (or keep it only in Profile — prefer one line under the tray: “Your practice”)
Focus · {skill}              if approved
[ worksheet cards ]
Turn in                      sticky
```

Classmate tap → `ClassmateSheet` (§10.5). No scores. No other children’s work.

**Landscape.** Same worksheet. Prompts wider (`maxWidth` 720). Answers stay **under** each prompt. Sticky `Turn in` remains a full-width bar. Tray hide-on-scroll still applies; Turn in stays.

**Empty.** `Nothing to do yet. Your teacher will assign a short set.`

Leave class lives in the hamburger and on Profile, not as a ghost on the worksheet.

---

### 13.13 `/parent` — Parent Home — `src/app/parent.tsx`

**Job.** A note home. Silence if the teacher has not approved.

**Header title:** `Kelyra`. No camera.

**Primary.** None.

If this parent record has more than one linked child: `AvatarTray` of **their** children (photos), then the selected child’s note. One child: omit the tray.

```
[ parent photo 72 ]
[ optional children tray ]
{class name}
{child name}                 display + child photo if no tray
Birthday                     month/day only, omit if unset
This week {firstName} is working on
{focus skill}                title
Practice · Assigned | Done | None yet
From the teacher             approved sentence only
```

**Empty.** `Your teacher has not shared an update yet.`

Invalid token: `This page needs an invite link from the teacher.` / `This invite is not valid.`

Centered column, `maxWidth` 480. **No photos of work. No scores. No other children. No “Grok.”**

On focus, write `kelyra.parent.lastSeenAt` so the bell can clear (§11).

---

### 13.14 `/profile` — Profile (new) — `src/app/profile.tsx`

**Job.** “This device is me.” Not a public bio. Header title: `Profile`. No context row.

**Teacher**

```
AvatarInitials 72 (initials from display name or email)
{email}
Active class · {name}        ListRow → House
Appearance                   AppearanceControl
Sign out                     ghost, danger label
```

**Student**

```
AvatarInitials 72
{displayName}
{className}
Leave class                  ghost
```

**Parent**

```
Avatar 72                    parent photo or initials
{parent display name}
Child · {name}               (one ListRow per linked child, child photo)
```

No Appearance on the **page** for student/parent — it is in their hamburger, to keep this page as short as the brief. Teacher Appearance lives here **and** in the hamburger (same control).

Portrait: centered column, `maxWidth` 480. Landscape: same, still 480, centered. No tray-fighting CTA.

Empty/error: if the session is gone, `replace` to `/` or `/join`.

---

### 13.15 `/ask` — Ask (new) — `src/app/ask.tsx`

See §12. Header title: `Ask`. No context row.

---

### 13.16 `/notifications` — Notifications (new) — `src/app/notifications.tsx`

**Job.** The bell’s list. People-row style. Not a chat.

Pushed. Wordmark `Notifications`. Back replaces hamburger. No context row.

Each row is a `ListRow`:

| Kind | Avatar | Title | Status | Goes to |
|---|---|---|---|---|
| Needs a name | photo thumb or `?` | `Needs a name` | `{when}` | `/inbox` |
| Review | student initials | student name | `Ready to review` | student page |
| Turned in | student initials | student name | `Turned in {skill}` | student page |
| Assigned practice (student) | initials | `New practice` | skill label | `/todo` |
| Published note (parent) | child’s initials | `From the teacher` | first 40 chars of sentence | `/parent` |

Sort newest first. Derived from existing tables; no new table.

**Empty.** `Nothing waiting.`

**Loading.** `Loading…`

Portrait: one column. Landscape: one column, `maxWidth` 640.

---

### 13.17 `/search` — Search (new) — `src/app/search.tsx`

Facebook’s tap-the-glass canvas.

Pushed. Wordmark `Search`. The field is **in the header cluster** (replaces the wordmark + trailing icons except Cancel). Autofocus. Placeholder depends on who opened it:

| Opened from | Placeholder | Corpus |
|---|---|---|
| Teacher Home / Class / Roster | `Find a student` | `listRoster` |
| Inbox | `Find a capture or student` | inbox titles + roster |
| Grade book | `Find a student or assignment` | roster + `assignments.title` |
| Student | `Find your practice` | that student’s sets, first-name classmates (name only) |
| Parent | `Find in this note` | the published sentence + focus + practice words. **Nothing else** |

Results: `ListRow` for people, `WorkRow` for captures / assignments. Type filters immediately. No submit button.

**Empty query.** A quiet `Type a name.` No trending, no recents wall required. Recents may be the last 5 queries in AsyncStorage `kelyra.search.recent` (strings only, no student ids leaked to parent/student).

**Empty filter.** `No names match that search.`

Portrait / landscape: one column. Keyboard open: tray hidden.

Cancel pops.

---

### 13.18 `/proposal` — Camera proposal (new) — `src/app/proposal.tsx`

Amazon-after-camera confidence. **A review sheet, not an auto-file.** See §14.

Pushed from the header camera (and from Capture only if we route the classifier that way — default is header camera only). Wordmark `Look at this`. Back discards the unsaved photo (confirm if they typed anything: `Throw away this photo?`).

---

## 14. Header camera + intent classifier

### 14.1 Flow

1. Teacher taps the header **camera**.
2. Device camera opens (`expo-image-picker` camera, or the existing `WebCameraCapture` on web). Same capture stack as `/capture`.
3. Teacher takes a picture (one page for this flow). Landscape preview must work.
4. App uploads the photo to the private bucket (existing `uploadTeacherAsset`).
5. App calls `invokeAi('classify-capture', { imageUrl, classId, rosterFirstNames })`.
6. App `push`es `/proposal` with the asset id + the model’s JSON.
7. Teacher confirms or edits. **Nothing is filed, no student is created, no class is created, no grade is written** until they tap the sheet’s primary.

If they cancel the system camera, stay put. No empty proposal.

**Talk while you shoot.** The header camera opens a **Listening** sheet first (mic on). **Take photo** keeps the clip going and opens the camera. **Voice only** throws the picture away and files from speech. **Cancel** drops the take. Proposal first transcribes the clip. It never invents a student — spoken names must match the roster.

A Grade is the job, not “homework only.” Kinds: Homework, Class participation, Presentation, Behavior. Marks: a number 0–100, **Pass**, or **Fail**. Pass/Fail never enter a numeric average.

“No grade” / “Don’t grade” / “Forget trying to grade” → skip photo evaluation, mark **Pass**.

There is no **Record the name** control. The header camera already has the mic.

| Teacher said | Vision |
|---|---|
| Job + a roster name | Skip classify. Evaluate only if they still need gaps/score. |
| Job + a spoken mark (“88”, “Pass”, “don’t grade”) | Skip classify and evaluate. Use the spoken mark. |
| “No grade” / “Don’t grade” | Skip evaluate. Mark **Pass**. |
| Name only | Classify for the job. Preselect the student if the matcher agrees. |
| Voice only, no photo | STT + interpret only. No vision. |
| Nothing useful / mic denied | Same vision path as today |

Show `Heard: {transcript}` on the proposal sheet. Copy while waiting: `Hearing what you said`, then `Studying the photo` only if a vision call is still needed.

Add `'classify-capture'` to the `invokeAi` union. Server-side only.

### 14.2 Intents

The model returns:

```
{
  intent: 'homework' | 'portrait' | 'parent_card' | 'student_card' | 'roster' | 'unsure',
  confidence: number,            // 0–1
  studentGuessId: string | null, // must be an id from the provided roster or null
  studentGuessName: string | null,
  parentGuessId: string | null,  // must be an id from this teacher's parents or null
  parentGuessName: string | null,
  draftScore: number | null,
  gaps: { label: string }[],     // 0–3
  fields: { key: string, label: string, value: string }[],  // student_card / parent_card only
  names: { name: string, confidence: number }[], // roster only
  note: string | null
}
```

`studentGuessId` that is not on the roster is discarded and treated as null. `parentGuessId` that is not this teacher’s parent is discarded. **The client never inserts a student or a parent from this payload.** Teacher confirms every name. Unrecognized printed fields become a teacher note (`fields` with `key: "notes"` or the `note` string), never a new column.

Accept the old `'metadata'` string from a stale server as `'student_card'`.

#### A. Homework / student work

- Detect that it is work.
- Guess the student from the **name on the paper** (and/or a spoken name if they also record on this sheet). Low confidence or no roster hit → student stays empty, status will be Inbox.
- Propose a draft score.
- Propose 1–3 skill gaps.
- Teacher sheet fields: student (`AvatarTray` of the roster, suggested student first, **Unknown** as the last cell — §28), score (editable), gaps (editable), then **Approve** (primary) or **Save to Inbox** / **Save as note**.
- There is **no** “Not this student” ghost. Clearing a guess is tapping **Unknown** at the far right of the tray. Unknown selected → primary is **Save to Inbox**. A real student selected → primary is **Approve**.
- Approve uses the existing `approveCapture` path. Only then does it land on the student record as a grade.
- If they have not picked a student, Approve is disabled. The primary becomes **Save to Inbox**.

#### B. Portrait (set profile photo) — **new**

- Detect a face-forward portrait / school picture, not a worksheet.
- Propose: **Set as profile for {studentGuessName}?** Student picker required if `studentGuessId` is null. Never invent a student.
- Primary **Use as profile** writes `students.photo_asset_id` (or `parents.photo_asset_id` if the teacher flips the target to a parent). Does **not** create a homework capture.
- Secondary **Save as homework instead** re-renders the homework sheet with this asset.
- Ghost **Retake**.
- If confidence is high but the guess is wrong, the picker is right there — same energy as the roster confirm.

#### C. Parent / contact card — **new**

- Detect a printed contact form, pickup card, or parent name + phone block.
- Propose a **parent** (existing `parentGuessId`, or a typed new name the teacher must confirm) plus `fields[]` mapped only onto canonical parent keys (`relationship`, `phone`, `email`, `address`, `preferred_contact`) and a child guess to **link**.
- Every field is a checkbox + editable value. Unchecked fields are dropped. Unrecognized lines become `notes`.
- Primary **Save parent** updates or (only after the teacher confirms the name) inserts `parents` + optional `parent_students`. Matcher / classifier still never inserts a student.
- If the card is clearly an IEP / 504: do **not** take this path; force note-only as in D.

#### D. Student card (form, emergency card, written birthdate / contact)

- Detect biographical / contact material about a **student**.
- Propose `fields[]` mapped only onto canonical student keys (`preferred_name`, `birthday`, `grade_or_age`, `phone`, `email`, `address`, `emergency_name`, `emergency_phone`, `allergies`, `notes`) plus a student guess.
- **Do not invent SIS / IEP / 504 columns.** Teacher checks every field. Unrecognized → `notes`.
- Confirm **writes metadata keys** on the existing student (and preferred name → `name_aliases`). Also keep the photo as a `note_only` capture on that student so the card image is filed. No analysis. No grade.
- If the photo looks like an IEP / 504: force note-only, copy `This looks private. It will be saved as a note only — we will not extract a form.` Do not write IEP fields into metadata.

#### E. Class roster / printed list

- Detect a list of names.
- Propose: add to the **active** class (if none, the sheet’s primary is **Name a class** and we do not create one silently).
- Reuse the existing photo-of-list confirm checklist (`extract-roster` / setup flow). Every name **unchecked-until-confirmed** if `confidence` is low; existing setup already starts low-confidence unchecked.
- Teacher confirms each name. Matcher / roster rules unchanged. Already-on-roster names mark `already here` and do not duplicate. Parked unconfirmed imports write `roster_imports` (`pending`) so they can be deleted later (§20).

#### F. Unsure

- Mute title: `We can’t tell what this is.`
- Body: `Pick a job. We will not guess a student.`
- Secondaries: **Homework** · **Portrait** · **Parent card** · **Student card** · **Roster** · **Note**. No student or parent pre-filled.
- Choosing one re-renders the matching sheet with empty guesses.

If `confidence < 0.45`, treat as **unsure** even if the model picked another intent.

Keep **Homework / Roster / Unsure**. Portrait and Parent card are additions. Student card is the old metadata intent with a real Details write instead of “note only forever.”

### 14.3 Proposal screen layout

**Portrait**

```
[ Photo hero — contain, tap to zoom ]
Intent line          (Homework / Portrait / Parent / Student card / Roster / Not sure)  meta
{mute confidence if unsure}

--- fields for that intent ---

[ sticky primary ]
[ secondary ]
Ghost  Retake     → reopen camera, replace the asset
```

**Landscape**

```
┌──────────────────────────┬─────────────────────────────┐
│                          │ Intent + fields             │
│  Photo hero              │                             │
│  (left pane, contain)    │ [ Approve / Save / Add N ]  │
│                          │ Retake                      │
└──────────────────────────┴─────────────────────────────┘
```

The primary **must** be reachable in landscape without rotating back. This is a flagship.

**Loading classify.** Photo visible, `Looking at the page…` `mute`. No spinner toy.

**Classify error.** `Could not read this photo.` Offer Homework / Roster / Note, same as unsure.

### 14.4 Spoken name on the proposal

A **Record the name** secondary on the homework sheet. Same recorder as Capture. Transcript goes through the existing matcher (`applyTranscriptAndMatch`). High confidence selects the student chip; low confidence does not. Still never inserts.

---

## 15. Artifacts

Anything that leaves the app is theme-independent. Always designed for a light reading surface (paper, Mail, Messages, Numbers). **Do not emit dark-mode hex into an email body, an SMS, or a CSV.**

### 15.1 Heatmap

On screen only. Color cells, never `F` / `•` / letters. Legend: Focus / Approved gap / None. Wider columns in landscape (§10.15).

### 15.2 Practice worksheet

```
{Skill label}

1. {prompt}
2. {prompt}
…
```

Numbered. Prompts are `body`. Student placeholder `Your answer`. UI title uses `practiceTitle` (strips a leading `Practice: `). Database stays `Practice: {skill}`.

### 15.3 Grade book cells and CSV

`formatCell` and `gradebookToCsv` stay in lockstep:

| Cell | String |
|---|---|
| no submission | `—` |
| `assigned` | `Assigned` |
| `submitted` | `In` |
| `approved` + score | the number, e.g. `8` |
| `approved` no score | `Done` |
| `draft_scored` | `Draft` |

CSV header: `Student,` then each `assignment.title`. File name `{class}-gradebook.csv`. Light-surface, UTF-8, no color.

### 15.4 Family digest (copy / Messages)

`buildFamilyDigest`. A letter, not a status dump.

```
{Class name}
Family update

{Student}
Working on {skill}          ← or “No focus skill yet”
Practice: assigned|done|none yet
{parent_sentence}           ← only if present
```

No scores. No photos. No other-class names. No enums. `familyPracticeWords` already emits `assigned` / `done` / `none yet`.

### 15.5 Weekly family email

`buildWeeklyFamilyDigest` + `openFamilyEmail`.

Subject: `{Class name} — this week`

Plaintext for `mailto:` and Messages. No HTML colors. No dark canvas. No “Grok”. No scores. No photos. If nobody has news: `No new notes to send home this week.`

---

## 16. Motion

Almost none.

| Motion | Spec |
|---|---|
| Hide / show tray + context | 180 ms ease-out translate + opacity (§9.3). No spring |
| Drawer | 220 ms in / 180 ms out, `translateX` |
| Swipe-to-act | finger-tracking; 160 ms snap-back; 160 ms snap-open |
| Press | opacity 0.88 filled, 0.7 ghost / header icon |
| Tab change | instant |
| Theme change | next frame |
| Rotate | relayout, no animation |
| Image viewer | existing pinch; no zoom bounce |
| Picture-adjacent overflow | `MarqueeText` (§30): hold 1200 ms, crawl 30 pt/s to the end, hold 800 ms, snap back. Full string, no `…`. No spring |

No skeleton pulse. No shimmer. No story-ring animation. No tray auto-scroll. No marquee on chrome, buttons, chips, or body copy.

`react-native-reanimated` is in the app. **Do not use it for this restyle.**

---

## 17. Copy voice

Three audiences. Ban internal enums on every surface.

| Surface | Voice | Examples | Never |
|---|---|---|---|
| **Teacher** | Short, imperative, filing | `Approve` · `Save to Maya Chen` · `Needs a name` · `Give practice` · `Look at this` · `Ask` | `draft_scored`, `unassigned`, `attachCapture`, `Grok`, `classify-capture` |
| **Student** | A worksheet | `Join your class` · `Pick your name` · `Your answer` · `Turn in` · `In Room 14 math.` | Scores, other children’s last names + gaps, `submission` |
| **Parent** | A note home | `This week Maya is working on` · `Assigned` / `Done` / `None yet` · `From the teacher` | Scores, photos, other children, `Grok`, `Inbox`, `Approve` |

Status while working (`Hearing the name…`, `Looking at the page…`, `Asking AI…`, `Saved to Maya.`) is `mute`. Errors are `danger` and name the failure in English (`Could not save capture`).

The on-screen name of the agent is **Ask**, never the model vendor.

---

## 18. Implementation map

No new npm dependencies. AsyncStorage, `useColorScheme`, `Appearance`, `useWindowDimensions`, `useSafeAreaInsets`, `expo-status-bar`, `expo-splash-screen`, `expo-image-picker`, `expo-symbols`, and `react-native-gesture-handler` (Expo default) are already available.

Do this in this order so the app never ships a half-chromed screen.

### a. Unlock orientation + splash

`app.json`: `"orientation": "default"`. Keep `"userInterfaceStyle": "automatic"`. Splash `backgroundColor` → `#F7F3EC`.

### b. Tokens + ThemeProvider + persistence

- Rewrite `src/constants/theme.ts`: both palettes, color-agnostic `type`, per-scheme `shadows`, `chrome` (no rail).
- Add `src/lib/theme/ThemeProvider.tsx` + `useTheme()`. Key `kelyra.appearance`, default `'system'`.
- Hold splash until the stored mode is read.

### c. Root layout + first paint

- `src/app/_layout.tsx`: `ThemeProvider` outermost. StatusBar + React Navigation follow `scheme`. `headerShown: false` on chrome routes; `AppShell` draws header / context / tray / drawer.
- `src/app/+html.tsx`: boot script + `color-scheme`.
- Register new stack screens: `profile`, `ask`, `notifications`, `search`, `proposal`.

### d. Icon + primitives

Extend `Icon` with `search`, `bell`, `ask`, `person`.

Theme existing primitives: `Button`, `Card`, `TextField`, `Badge`, `Chip`, `PhotoFrame`, `PhotoPager`, `AvatarInitials`, `SectionHeader`, `JoinCode`, `PhaseBanner`, `StickyTable`, `Screen` (`useLayout`, `stickyPlacement`).

Add: `AppHeader`, `ContextMenuRow`, `FloatingTabTray`, `HamburgerDrawer`, `AvatarTray`, `WorkRow` (+ swipe), `WorkShelf`, `ListRow`, `AppearanceControl`, `ClassmateSheet`, `Avatar` (shared photo/initials), `ConfirmSheet` (§20), `PhotoSheet` (§21), `DetailsRows` (§23), `UnknownMark` (§28), `MarqueeText` (§10.18, §30).

### e. Replace the desk chrome

- Delete the left-rail branch and the five-tab featured pill in `TeacherNav.tsx`. Either rewrite it as `AppShell` or replace the file.
- Delete the right-popover behavior in `TeacherMenu.tsx` (drawer supersedes it).
- Badge on the **bell** and the Inbox icon via `countNeedsYou`.
- Hide-on-scroll wired through `Screen`’s scroll callbacks.

### f. New routes (spec only — this pass is the spec; implementation follows this map)

| File | Route |
|---|---|
| `src/app/profile.tsx` | `/profile` |
| `src/app/ask.tsx` | `/ask` |
| `src/app/notifications.tsx` | `/notifications` |
| `src/app/search.tsx` | `/search` |
| `src/app/proposal.tsx` | `/proposal` |

`invokeAi` union grows `'ask-assistant' | 'classify-capture'`. Handlers live next to the existing ones in the AI gateway / Edge Functions. No `EXPO_PUBLIC_*` model keys.

### g. Screens restyle

Every screen in §13. Replace `import { colors } from '@/constants/theme'` with `useTheme()`. Replace roster `StickyTable`s and chip walls with `AvatarTray` / `ListRow` / `WorkRow`. Remove Today’s filled Capture button and the KPI “Needs you” card.

### h. Capture + proposal + student split in landscape

`capture.tsx`, `proposal.tsx`, `student/[studentId].tsx`. Sticky primary in the right column when split. Confirm save still stays on Capture; Approve still writes a grade only on Approve; proposal never auto-files.

### i. Grade book + heatmap landscape

`gradebook.tsx`, `Heatmap.tsx`, `StickyTable` widths from §10.15. Confirm CSV strings unchanged.

Stop the chrome pass here. **People / delete / metadata** continue in §26 (same file, later). Do not retune the matcher, do not add SIS/IEP columns, do not auto-Approve from Ask or from the camera. Delete never auto-creates a student.

---

## 19. Quality bar

The spec **fails** if:

- There is no hamburger, no wordmark that changes per tab, no search glass, no notification badge, no floating hide-on-scroll tray, no house tab, no profile tab.
- Ask, `WorkRow`, swipe-to-act, header-camera classification, or the hiding context row is missing.
- The Instagram circular people tray is missing for teacher, parent (when they have more than one child), or student.
- Dark is an invert, or System mode is missing.
- Landscape is a footnote.
- Approve can happen without the teacher (including a silent full-swipe).
- A full-swipe on **Delete** commits without a confirm sheet.
- The matcher can create a student from a photo, a portrait, or a contact card.
- A teacher-created object has no delete control (§20).
- Deleting a student leaves grade-book cells, parent links, or photos the teacher thinks are gone.
- Teacher-only metadata (`allergies`, `notes`, emergency, student phone/email/address) appears on `/parent` or `/todo`.
- Meta blue, Instagram gradients, or the Amazon smile were cloned.
- Tokens are vibes instead of hex and points.
- Parent or student screens leak another child, a score they were not given, or “Grok.”
- A long first name under a tray circle or a long title next to a 36 / 72 picture truncates with `…` instead of marqueeing (§30).
- A marquee runs under Reduce Motion, under VoiceOver as a moving node, off-screen on a 100-student roster, or as a nested pan that fights `AvatarTray` / sticky table heads.
- Buttons, chips, the wordmark, status/meta, or body copy marquee.

The spec **succeeds** if a teacher who uses Facebook, Instagram, and Amazon every day can hold Kelyra and already know: hamburger is the menu, house is home, circles are people (now with photos), the camera in the header will look at the paper, swipe does something (including delete → confirm), the bottom-right face is them, and the other trailing icon talks to the assistant — and an engineer can build it in one pass without asking what “delete a class” does.

---

## 20. Delete map

Every first-class thing a teacher can create is deletable from the UI. Student and parent roles **cannot** delete teacher records. Student **Leave class** (already on hamburger + Profile) only clears the device session. Parent cannot delete a child.

There is **no undo**. Confirm copy always includes `This cannot be undone.` Matcher / delete never inserts a student.

Inbox **return to unassigned** is not delete. Delete removes the capture.

### 20.1 Confirm primitive — `ConfirmSheet`

New file `src/components/ui/ConfirmSheet.tsx`. Bottom sheet (phone) / centered card max 400 (web). Not `Alert.alert` — type-the-name needs a field.

```
Title                 rowTitle
Body                  body / mute. Honest cascade. Last line: This cannot be undone.
[ optional TextField  placeholder Type {name} ]
[ Delete {thing} ]    DangerButton, disabled until the field matches (type-name) or immediately enabled (simple)
Ghost Cancel
```

| Pattern | Used for | Delete enabled when |
|---|---|---|
| **Type-the-name** | Class, student (the person), parent (the person) | Trimmed field equals `display_name` or `classes.name`, case-insensitive |
| **Simple** | One homework, one gap, one practice set, one assignment, one submission, one invite, one photo, one parked roster draft, unlink child, clear one field | Immediately. Teacher still has to tap Delete |

Full-swipe on a Delete tile **only opens this sheet**. Same rule as Approve.

Roles: if `chrome.role !== 'teacher'`, do not render Delete pills, swipes, or this sheet.

### 20.2 Object → where → confirm → what happens

| Object | Control lives | Confirm | Verb | What the teacher is promised |
|---|---|---|---|---|
| **Class** | Class / Roster (`/setup`) last pills: ghost **Delete class**. Class picker (`/` `?switch=1`) `ListRow` swipe Delete. Hamburger class row swipe Delete. Not a tray icon. | Type-the-name. Title `Delete {class name}?` Body: `This deletes the class, its homework, practice, and grade book. Students who are only in this class will be deleted. Students who are also in another class will stay on those rosters. This cannot be undone.` | Hard-delete class via `teacher_delete_class` | Gone. Land on `/` (or the next remaining class, set active). |
| **Student (the person)** | Student page last pills: ghost **Delete {first name}**. Roster `ListRow` swipe Delete. Search hit overflow. | Type-the-name. Title `Delete {display name}?` Body: `This deletes {first} from every class, including their work, grades, parent links, and photo. This cannot be undone.` | Hard-delete student | Person gone. No Inbox leftovers. No grade-book cells. Parent records stay; the link is gone. Photo asset unref-deleted. |
| **Enrollment (remove from this class)** | Student page, only if they have **another** enrollment: ghost **Remove from {class}**. Roster row overflow **Remove from class**. | Simple. `Remove {first} from {class}? Their work in this class will be deleted. They will stay in {other class}. This cannot be undone.` | Detach | If this is their last class, **do not offer Remove** — only Delete student. Last-class unenroll is a person delete. |
| **Homework / capture / voice / multi-page** | Inbox `WorkRow` swipe **Delete** + ghost pill. Student Work `WorkRow` swipe **Delete** + ghost pill. Needs-you / This-week same. | Simple. Title `Delete this work?` Show 72 thumb + date in the sheet. `This removes the photo and is not a grade. This cannot be undone.` | Hard-delete capture | Not Inbox. Gaps go. Capture-kind grade column goes if it had no other purpose. Focus retargets or clears. Profile photo that reused this asset stays. |
| **Skill gap (draft)** | Student page, each draft gap: trailing ghost **Remove** on that field row (not the whole student). | Simple. `Remove this suggested gap?` | Hard-delete `skill_gaps` row | Capture stays. Focus unchanged (drafts never hold focus). |
| **Skill gap (approved)** | Same row, **Remove**. Skill-history `ListRow` swipe Delete only when `source` is a gap (not a practice event). | Simple. `Remove this approved gap? The homework and the grade stay. If this is the focus skill, focus will move or clear.` | Hard-delete gap | Focus → next remaining approved gap, else null. `skills` row stays. Grade cell stays. |
| **Practice set** | Student Practice `WorkRow` / card: ghost **Delete set**. Swipe Delete. | Simple. Preview/discarded: `Delete this practice set?` Assigned: `Delete this practice set and its grade-book column? Students will lose the to-do. This cannot be undone.` | Hard-delete set + its assignment + submissions | Source homework stays. |
| **Assignment (column)** | Grade book: long-press / overflow on the **column header** (not the student name). Pill **Delete column** in a tiny header menu. | Simple. `Delete the column {title}? Every mark in this column goes away. This cannot be undone.` | Hard-delete assignment | Capture stays if kind = capture. Practice set discarded or deleted if unused. |
| **Submission (one cell)** | Student practice `WorkRow` ghost **Remove assignment**. Grade-book cell is **not** swipe-to-delete (too easy to nuke a mark). Cell tap → existing score sheet gets ghost **Remove**. | Simple. `Remove {first} from {title}?` | Hard-delete submission | Last cell also deletes the assignment (column disappears). |
| **Parent (the person)** | Parent page last pills: **Delete {name}**. Class / Parents `ListRow` swipe. | Type-the-name. `Delete {parent}? Their invite links die. Students stay. This cannot be undone.` | Hard-delete parent | Children stay. Links and tokens go. Photo unref-deleted. |
| **Parent ↔ child link** | Parent page children list: swipe **Unlink**. Student page Parents tray overflow / parent `ListRow` **Unlink**. | Simple. `Unlink {child} from {parent}? They will not see {child}’s note. This does not delete anyone.` | Detach `parent_students` | Both people stay. |
| **Invite link** | Parent page Invites section: `ListRow` swipe **Revoke**. Student page parent block if a URL is showing: **Revoke link**. | Simple. `Revoke this invite link? Anyone with the link will lose access.` | Hard-delete `parent_accesses` | Parent stays. |
| **Profile photo** | Photo sheet (§21) **Remove photo**. | Simple. `Remove this photo? {Name} stays.` | Detach `photo_asset_id`, unref-delete asset | Person stays. Circles fall back to initials. |
| **Metadata field** | Details edit sheet: empty the field and Save. Each Details row also has a ghost **Clear** when the value is set. | Clear from the edit sheet: **no extra confirm** (they are already editing). Clear from the row: simple `Clear {label}?` | Delete that jsonb key | Other keys stay. `focusLog` is never offered as Clear. Empty UI shows `Add {label}`, never `null`. |
| **Roster-import draft** | Class / Roster: if a `roster_imports.status = pending` row exists, a parked card above the add-students well: thumb + `{n} names waiting` + pills **Open** · **Delete**. Setup in-memory suggestions get the same **Delete** (discard without writing students). | Simple. `Throw away this list? No students will be added.` | Hard-delete `roster_imports` + unref photo | Already-confirmed students from an earlier import stay. |

### 20.3 Cascade the teacher can say out loud

- **Delete class** = this room’s work and book go away. Kids who only live here go away. Kids who also have another class stay there. Parents are not the class; leftover parents with no children sit in Parents until the teacher deletes them.
- **Delete student** = that kid is gone everywhere. Their homework is gone, not parked. Their grade cells are gone. Their photo is gone. Their parent still exists, unlinked.
- **Delete homework** = that slip is gone. Returning it to Inbox is the other button.
- **Delete an approved gap** = the label is gone; the photo and the mark stay; focus moves or clears.
- **Delete a parent** = the grown-up is gone; the kids are not.

### 20.4 After-delete navigation

| Deleted | If you were on… | Go to |
|---|---|---|
| Active class | `/class/{id}/*` | `/` or `/class/{next}` |
| Student | that student page | `/class/{id}` House |
| Capture | student page with that capture selected | same student, next capture or empty |
| Parent | that parent page | `/class/{id}/parents` |
| Last class the teacher had | anywhere | `/` create-class |

---

## 21. Profile photos (student + parent)

Instagram circle, Amazon product photo. Teacher-owned bytes in the existing `photos` bucket.

### 21.1 Primitive

Shared `Avatar` (§10.13). `AvatarTray`, `ListRow`, student header, parent hero, join-name picker, parent child tray, classmate tray: photo if `photoUrl`, else `AvatarInitials`. **No per-person colors. No story rings.**

### 21.2 Where the teacher changes a photo

**One control, two hits on the person page — not tap-and-hold.**

On `/class/{id}/student/{studentId}` and `/class/{id}/parent/{parentId}`:

- The 72 (or 96) hero circle is a button. `accessibilityLabel`: `Change photo`.
- A rounded **Photo** pill sits in the action row under the name (with Edit, Add parent / Add child, Delete).

Both open the same `PhotoSheet`:

```
Take photo
Choose from library
Use this homework as profile    ← only on the student page, only if a homework photo is in the current hero / selected WorkRow
Remove photo                    ← only if photo_asset_id is set; danger label
Cancel
```

Take / library uses existing `expo-image-picker` / `WebCameraCapture` + `uploadTeacherAsset`. Writes `students.photo_asset_id` or `parents.photo_asset_id`. Does **not** insert a `captures` row.

**Use this homework as profile** points `photo_asset_id` at the existing homework asset. The capture stays homework. Deleting the capture later must not delete a still-referenced profile asset (`docs/data-model.md` unref helper).

Do **not** silently use a homework photo as the face.

Trays and ListRows: tap navigates. No hold-to-edit (fights scroll and swipe).

### 21.3 Header-camera portrait

Classifier intent `portrait` (§14.2 B). Sheet: `This looks like a portrait — set as profile for {guessed name}?` Picker required if no roster hit. Primary **Use as profile**. Never invent a student. Optional flip: target a parent instead.

After shutter, library, homework-as-profile, or **Use as profile**, the local AI gateway (`cutout-portrait`) **removes the background** to a transparent PNG and **centers the face** in a 640 square. Upload that PNG — do not keep the original off-center JPEG. Do not send student photos through a generative image-edit model (minors; do not rewrite the face). Segmentation rembg + Grok vision box only.

While that runs, the person-page hero shows one `WorkingLine` (`Working…`). `/proposal` does the same under the portrait fields. No silent wait.

### 21.4 Who can see which photo

| Viewer | Sees |
|---|---|
| Teacher | Every student and parent photo they own |
| Parent (invite token) | That parent’s own photo + **only linked children’s** photos. Never other families. Never homework photos |
| Student | Own photo on Profile / `/todo`. Classmates tray: classmate **profile** photos or initials. Never homework, never grades |

Signed URLs for parent/student viewers: mint after token / join-code check. Do not open the `photos` bucket.

---

## 22. Parent records

A parent is a person the teacher creates, photographs, edits, and deletes — same gravity as a student. The invite token is how they open `/parent`. The token points at the **parent**, who then has children.

### 22.1 Routes

| Route | File | Wordmark | Context row |
|---|---|---|---|
| `/class/{id}/parents` | `src/app/class/[id]/parents.tsx` | `Parents` | omitted (pushed) **or** Class chips with Parents selected if reached from the Class tab |
| `/class/{id}/parent/{parentId}` | `src/app/class/[id]/parent/[parentId].tsx` | parent `display_name` | omitted (pushed) |

Also linked from: hamburger **Parents**, Class chip **Parents**, student-page Parents section, Search (`Find a parent or student` when opened from Class / Parents).

### 22.2 Class / Parents — `/class/{id}/parents`

**Job.** The grown-ups for this room.

**Who appears.** Parents who have at least one `parent_students` child **enrolled in this class**. A parent linked only to a child in another class does not show here (they still exist on that other class’s Parents screen). A parent with zero children appears on **every** class’s Parents screen in a trailing `Not linked yet` section so they are not lost.

**Vertical**

```
AvatarTray of parents (photo / initials, first name)
Add parent            field + Primary Add {name}
Ghost Photograph a contact card  → header-camera /proposal with parent_card
ListRow per parent    name · {n} children · {invite: Linked / No link}
```

Tap row or circle → parent page.

Swipe Delete → type-the-name confirm (§20).

**Empty.** `No parents yet.` Field is the next action.

**Portrait / landscape.** One column. `maxWidth` 640.

### 22.3 Parent page — Amazon product-detail

Pushed. Back replaces hamburger.

```
[ Avatar 72 ]  {display_name}          ← type.title, 1 line, marquee (§30), align start
               {relationship · n children · Invite active | No link}   mute
```

Same row as the student hero (`flexDirection: 'row'`, name in the remaining flex). Not a stacked `display` line.

Details                   tappable rows (§23)
Children                  AvatarTray of linked students. Tap → student page.
                          ListRow + Unlink swipe. Ghost Add a child → roster picker.
Invite                    ListRow per token (Created {when}). Swipe Revoke.
                          Ghost Create invite link → copy URL (existing parentInviteUrl).
Pills                     Edit · Photo · Add child · Delete
```

**Add parent from a student page:** sheet — name field, optional relationship, Primary **Add and link**. Creates `parents` + `parent_students` in one confirm. Does not invent a student.

**Link child:** roster `ListRow` picker (search if > 8). Confirm `Link {child} to {parent}? They will see {child}’s note home.` Unlink is not delete.

**Create invite:** insert `parent_accesses` with `parent_id` (and optional `student_id` hint = the student page you came from). Copy `/parent?t=`. Same share paths as today.

### 22.4 Student page — Parents section

Replace today’s single **Create parent link** ghost with:

```
SectionHeader Parents
AvatarTray of linked parents     (omit if none)
ListRow if you need overflow     name · relationship · Linked
Ghost Add parent
Ghost Create invite link         only if at least one parent exists; if several, pick which parent first
```

Old “Create parent link” with no parent person is gone. If the teacher has never added a parent, **Add parent** is the action; creating the person can optionally mint the first invite on the same sheet (`Also create a link` checkbox, default on).

### 22.5 Parent progress view `/parent`

Still a note home. Still no scores, no homework photos, no other families, no “Grok.”

**Adds**

- Parent’s own photo (or initials) above the note, 72.
- `AvatarTray` of **linked children on this parent record** (not “tokens on this phone”), when count > 1.
- Each child: photo, name (preferred if set; **1 line, marquee** §30), class, focus, practice words, published sentence.
- Birthday: **month + day only**, that child only, omit if unset. Never the year.
- Parent’s own contact (phone / email / address / preferred contact) may show in a quiet Details block — they already know it. **Never** teacher `notes`. **Never** child allergies / emergency / address / phone.

Invalid or revoked token: existing copy. After parent-delete, the token 404s the same way.

Device cache of tokens still works for two different parents on one phone (grandma + mom). Do not mix their children.

### 22.6 Auth

Stay inside current Auth. **No parent login user.** Teacher-created parent row + invite token, same as today, token → parent → children.

---

## 23. Metadata forms

`students.metadata` and `parents.metadata` get a UI. Canonical keys only — `docs/data-model.md` Metadata shapes. The app must not invent keys.

### 23.1 Person-page stack (Amazon / Facebook)

Student page and parent page share this order:

1. Photo hero + name + one status line
2. **Details** — `DetailsRows`: label left (`mute` / `meta`), value right (`ink` / `body`). Empty value: `Add {label}` in `mute`. Never `null`, never `—` for a missing phone.
3. Action pills (Edit, Photo, Add parent / Add child, Delete)
4. The rest of the page (work, practice, children, …)

`Edit` opens a sheet / pushed screen of `TextField`s, not a settings dump. One Save. Cancel pops.

### 23.2 Student fields (edit sheet, in order)

| Label in UI | Key | Control |
|---|---|---|
| Preferred name | `preferred_name` | text. On save, upsert into `name_aliases` |
| Birthday | `birthday` | system date input (`<input type="date">` on web; `TextField` + parse `YYYY-MM-DD` / `Mar 14 2017` on native). No new date-picker package |
| Grade or age | `grade_or_age` | text. Placeholder `3rd` / `8 years` |
| Phone | `phone` | telephone keyboard |
| Email | `email` | email keyboard |
| Address | `address` | multiline |
| Emergency contact | `emergency_name` | text |
| Emergency phone | `emergency_phone` | telephone |
| Allergies / health | `allergies` | multiline. Caption `Only you will see this.` |
| Notes | `notes` | multiline. Caption `Only you will see this.` |

Display name stays the hero / rename control already on Setup (not a Details row). Changing display name does not clear preferred name.

### 23.3 Parent fields (edit sheet, in order)

| Label in UI | Key | Control |
|---|---|---|
| Relationship | `relationship` | four chips: Mother · Father · Guardian · Other. Other reveals `relationship_other` text |
| Phone | `phone` | telephone |
| Email | `email` | email |
| Address | `address` | multiline |
| Preferred contact | `preferred_contact` | three chips: Call · Text · Email |
| Notes | `notes` | multiline. `Only you will see this.` |

### 23.4 Visibility

| Field | Teacher | Parent `/parent` | Student `/todo` |
|---|---|---|---|
| Child name, child photo, preferred name | yes | own children | own + classmate first name / photo |
| Child birthday | yes (full date) | month/day, own children only | no |
| Child grade/age, phone, email, address, emergency | yes | **no** | **no** |
| Child allergies, notes | yes | **no** | **no** |
| Parent name, photo, relationship, phone, email, address, preferred contact | yes | own | no |
| Parent notes | yes | **no** | **no** |
| Scores, homework photos, other families | teacher | **no** | **no** |

FERPA default: if you are unsure, it is teacher-only.

### 23.5 Classifier → fields

Header camera on a form / emergency card / parent card: proposal lists each mapped field as a checked row. Teacher unchecks garbage. Unrecognized lines one multiline **Note**. Save writes only checked canonical keys. Confirm-every-name: if the guessed person is wrong, picker. Never insert a student from the card.

---

## 24. Classifier intents (delta)

Union (also in §14.2):

```
'homework' | 'portrait' | 'parent_card' | 'student_card' | 'roster' | 'unsure'
```

| Intent | Teacher confirms | Writes |
|---|---|---|
| `homework` | student (optional), score, gaps | capture; Approve still required for a grade |
| `portrait` | person picker | `photo_asset_id` only |
| `parent_card` | parent name + each field + child to link | `parents` / metadata / `parent_students` after confirm |
| `student_card` | student + each field | `students.metadata` (+ `name_aliases`); card image as `note_only` capture |
| `roster` | every name | students + enrollments for checked names; park `roster_imports` if they leave mid-confirm |
| `unsure` | they pick a job | nothing until they pick |

Keep Homework / Roster / Unsure. Portrait and Parent card are new. `metadata` (old) aliases to `student_card`.

`confidence < 0.45` → unsure. IEP-looking pages → note-only, no new columns.

Ask (§12.3) still cannot see allergies, emergency, addresses, or raw parent emails. Teacher Ask may mention that a parent exists (`Amina is linked to Maya`) but must not dump teacher-only notes.

---

## 25. Screen-by-screen deltas

Do not rewrite a screen whose primary job did not change. Only these deltas:

### 13.1 `/` class picker

`ListRow` swipe Delete → type-the-name class confirm. Pill is unnecessary if swipe + hamburger swipe exist; still add a ghost **Delete** on the row’s destination (setup) so VoiceOver is covered.

### 13.3 House

`AvatarTray` must pass `photoUrl`. No parents tray on House (people here are the class). Needs-you / This-week `WorkRow`s gain Delete swipe (§20).

### 13.5 Inbox

Each `WorkRow`: add ghost **Delete** + leading Delete swipe. Confirm simple. Lead line stays: matching never creates a student. Delete never creates a student.

### 13.6 Student record — **primary job still Approve**; page grows a person header

Insert **above** the focus row:

```
[ Avatar 72 ]  {display_name}          ← 1 line, marquee (§30)
               {preferred name if set · birthday md if set}
[ Photo ] [ Edit ] [ Add parent ]
```

Then existing focus / photo-of-work / Approve stack (unchanged job).

Replace the Parent section with §22.4.

After Skill history, add **Details** (§23) — or put Details directly under the new header, before work. Prefer **Details under the header, before the homework hero**, so Approve still sits next to the work, not under a form.

Last pills, after practice: **Remove from {class}** (if multi-enrolled) and **Delete {first}** (type-the-name).

Work `WorkRow`: add Delete (hard-delete) **and** keep Inbox (return). Two different verbs. Delete is `danger`; Inbox is `wash`.

Practice cards: add **Delete set** / **Remove assignment** ghosts.

Gap fields: add **Remove** on each gap.

`Create parent link` without a parent person is removed.

Landscape split: person header + Details stay full width above the split; homework | Approve split unchanged.

### 13.7 Grade book

Column-header overflow **Delete column**. Cell sheet ghost **Remove** (that submission). Roster names in the frozen column show profile photo 28 if set. Student-column heads (56 avatar + first name) **marquee** the name (§30).

Context chips gain **Parents** (navigates away).

### 13.8 Setup / Roster

`AvatarTray` + `ListRow` pass `photoUrl`. Roster `ListRow` swipe: **Remove from class** or **Delete student** per §20. Parked `roster_imports` card with **Open** / **Delete**.

Last pills: **Delete class** (type-the-name).

Header camera still goes to `/proposal`; roster intent still lands on the checklist.

### 13.9 Family

`ListRow`s show child photos. Add a short **Parents** `ListRow` at the top → `/class/{id}/parents`. Invites still originate from the student or parent page, not a blast from Family.

### 13.11 `/join`

`ListRow` may show the profile photo (signed via join-code RPC). Initials if none. No metadata.

### 13.12 `/todo`

Classmate `AvatarTray` uses profile photos. Student Profile circle uses own photo. No Details, no allergies, no delete.

### 13.13 `/parent`

§22.5. Photo + linked-children tray + month/day birthday. No teacher-only fields.

### 13.14 `/profile`

Teacher: `Avatar` 72, tap or Photo pill → `PhotoSheet`. Same cutout / center / upright framing as student and parent. The face is the Profile tray icon (far right) and sits next to the account email in the hamburger. Initials until a photo is set. The name under the 72 (and the **teacher** hamburger identity next to the 36) **marquees** if it overflows (§30). Student / parent drawer identity has no photo — leave it.

Student: `Avatar` 72 with own `photoUrl` if the join RPC returns it. Still **Leave class** only.

Parent: `Avatar` 72 with **parent** photo; child rows show child photos. Still no Appearance on the page.

### 13.16 Notifications

Student rows use that student’s profile photo when present.

### 13.17 Search

Teacher corpus adds parents (`display_name`). Results: `ListRow` with photo. Placeholder from Class / Parents: `Find a student or parent`.

### 13.18 / §14 Proposal

New sheets for portrait, parent_card, student_card (§14, §24). Unsure gains those jobs.

### Picture-adjacent labels (every screen)

Do not rewrite the recipes. Anywhere a name or title sits **under or beside** an `Avatar`, homework thumb, or `AssignmentMark`, that string is `MarqueeText` (§10.18, §30) instead of `numberOfLines={1}` truncate or a 2-line wrap. Status, meta, pills, the wordmark, and body copy are unchanged.

---

## 26. Implementation map append (people / delete / metadata)

No new npm packages. Same Expo SDK 54, StyleSheet, `invokeAi`, `photos` bucket.

Hand-run SQL (no Supabase CLI):

`supabase/migrations/20260816000000_people_photos_delete.sql`

The file must: add `students.photo_asset_id`; create `parents`, `parent_students`; add `parents.photo_asset_id` + `parents.metadata`; add `parent_created_via` enum; alter `parent_accesses` (`parent_id` NOT NULL after backfill, `student_id` nullable, FK to parent CASCADE, student SET NULL); backfill one parent per existing invite; replace `parent_open`; create `roster_imports` if missing; add RLS; add teacher delete RPCs listed in `docs/data-model.md`.

### Build order

1. **SQL** — run the migration in the Supabase SQL editor. Confirm existing `/parent?t=` links still open (now via parent → children).
2. **Types** — `src/lib/supabase/types.ts`: `StudentRow.photo_asset_id`, `ParentRow`, `ParentStudentRow`, `ParentAccessRow.parent_id`, `RosterImportRow`, metadata key unions. Extend `parent_open` / `student_open_class` return shapes.
3. **ConfirmSheet + Avatar + PhotoSheet + DetailsRows** — primitives first so screens do not invent three circles.
4. **Photos API** — `src/lib/people/photos.ts`: `setProfilePhoto`, `clearProfilePhoto`, `signedProfileUrl`, unref-delete. Reuse `uploadTeacherAsset`.
5. **Delete APIs** — thin clients around the RPCs: `src/lib/classes/delete.ts`, `src/lib/students/delete.ts`, `src/lib/captures/delete.ts`, `src/lib/parents/delete.ts`. Wire swipe `autoCommit: false` + `confirm` sheet (not `Alert.alert`).
6. **Student page header** — photo, Photo pill, Details, Parents tray, Delete / Remove. Keep Approve where it is.
7. **Parents screens** — `parents.tsx`, `parent/[parentId].tsx`. Rewrite `src/lib/parents/api.ts`: `createParent`, `listParentsForClass`, `linkChild`, `unlinkChild`, `createParentInvite(parentId, studentIdHint?)`, new `parent_open` mapping.
8. **Parent + student viewers** — `/parent` photo + children; `/todo` classmate photos; join-code signed profile URLs (Edge or service-role signer after token check).
9. **Classifier** — extend `classify-capture` union + proposal sheets for `portrait` / `parent_card` / `student_card`. Preferred name → aliases.
10. **Grade book / Setup / House / Inbox / Search / hamburger** — photoUrl plumbing + the remaining delete entry points (class, column, parked roster draft).

Do not implement SIS/LMS, IEP extractors, public feeds, likes, streaks, or a parent password account.

Stop when a teacher can add a parent, put a face on Maya, fill a birthday, photograph a contact card, and delete a class without leaving ghost cells — and a parent token still only sees their own kids.

---

## 27. The working mark — the turning pencil

§16 stays in force: almost no motion, no skeleton pulse, no shimmer, no story ring, no Reanimated on chrome. **This section is the one exception.** One looping mark, used wherever the app is working and the teacher would otherwise stare at a frozen paper. Not a grey iOS spinner. Not a second brand.

Name: **the turning pencil**. Metaphor: the short classroom pencil a teacher rolls on the desk while the machine thinks. It is not writing a grade (that is Approve). It is not orbiting a face (that is a story ring). It is the thing already in their hand.

### 27.1 Visual recipe

Two sizes only. Scale the same silhouette. Do not invent 16 or 48.

| Prop `size` | Canvas | Barrel (L × T) | Use |
|---|---|---|---|
| `20` | 20 × 20 | 11 × 4 | Inline, beside mute copy (`WorkingLine`) |
| `36` | 36 × 36 | 20 × 7 | Empty-state / first-paint center |

**Color.** A real No. 2 classroom pencil, not a one-color brand blob (that read as a blunt silhouette). Same palette in light and dark so it stays a physical object on the paper or the night desk.

| Piece | Hex | Role |
|---|---|---|
| Eraser | `#E58FA0` | Pink end, left |
| Ferrule | `#C5CAD0` | Metal band |
| Ferrule lines | `#9AA1A8` | Two darker grooves |
| Barrel | `#F0C53A` | School-bus yellow |
| Facet | `#E0B22C` | Mid stripe so the barrel reads hexagonal |
| Wood | `#E6C39A` | Sharpened shoulder |
| Graphite | light `#3D3934` · dark `#D2CDC4` | Tip — never pure black (vanishes on night canvas) |

Beside-text is still `colors.mute` / `type.meta`. Never sit the pencil on a `brandSoft` disk. Never stroke a `line` circle around it.

**Geometry.** The pencil **stands up** (eraser on top, graphite down). It must never cartwheel as a long thin shaft — that read as a blunt silhouette. Pure `View`s. Let `s = size / 20`.

| Piece | Box (× `s`) | Shape |
|---|---|---|
| Eraser | `7, 0.6, 6 × 2.6` | Pink, rounded on top |
| Ferrule | `6.7, 3, 6.6 × 2.2` | Silver sleeve + two grooves |
| Barrel | `6.4, 5.1, 7.2 × 8.2` | Yellow hex, darker side facets |
| Wood | three narrowing bars `13.2` → `17.2` | Sharpened cone |
| Tip | `9.1, 17.1, 1.8 × 2.2` | Graphite point |

`overflow: 'visible'` on the group. At 20 and 36 it is a standing No. 2 pencil.

Hit target is **not** 44. This is not a button. The canvas is the size.

### 27.2 Motion recipe

What moves: the **standing colored pencil spins in the plane** like a loading spinner (`rotateZ` `0deg → 360deg` about the canvas center). It does **not** squash/`scaleX` (that was a 3D “rotate to see the other side,” not a spin). It is a short, fat No. 2 (eraser on top), never a long thin shaft.

How: React Native `Animated` + `useNativeDriver: true`. **Do not use Reanimated** (same rule as §16 / §9.3).

```
spin     0 → 1
duration 2400 ms
easing   Easing.linear
loop     Animated.loop(timing)
rotateZ  0deg → 360deg
```

First frame is face-on (eraser up, tip down) so a screenshot is clearly a yellow pencil.

Start the loop on mount; stop and drop the node on unmount. Do not run it on a screen that is not showing a wait.

**Reduce motion.** Call `AccessibilityInfo.isReduceMotionEnabled()` (React Native, already in the project). If `true`, **do not animate**. Hold at `−18deg` (a writing rest). No opacity fallback — a pulse is a flash. The static pencil plus the mute line is the mark.

If the platform cannot answer, keep the 2400 ms linear turn. It is already slow and small.

**Forbidden on this mark:** springs, `Easing.elastic`, bounce, stagger, trail, color cycle, haptics, a ring, a gradient, a grey `ActivityIndicator` as the only indicator. An `ActivityIndicator` may exist as a last-resort native fallback only if `Animated` cannot run; it must still be `colors.brand`, never system grey, and only inside `WorkingMark`.

### 27.3 When to use / when not

Show the mark when the teacher is waiting on the app or the model. Do not decorate every row.

**Use** (`WorkingLine` unless the layout is a true empty canvas, then size 36 + text below):

| Wait | When it appears | Copy |
|---|---|---|
| Initial screen load | First paint, until the first real body is ready | `Working…` |
| Asking AI | From tap until the draft lands (student **Ask AI**, Capture guess-the-name, Ask chat waiting on the assistant) | `Asking AI…` |
| Header-camera classify | Photo is up, model is reading it | `Studying the photo` |
| Hearing a name | From stop-record until the matcher returns | `Hearing the name…` |
| Uploading a photo | After shutter / picker, until the asset id is back | `Working…` |
| Saving | Only if the save is still open after **300 ms** | `Working…` |

The 300 ms gate is for save / upload only, so an 80 ms write never flashes the pencil. Initial load, Asking AI, classify, and hearing show **immediately** — those waits are expected to be long.

This supersedes §13’s bare `Loading…`, §14.3’s `Looking at the page…` / “No spinner toy”, and the proposal string `Looking at the photo. Ask is identifying what this is…`. The classifier is studying the photo. It is not “Ask.”

**Do not use**

- On every list row of a loaded list
- Inside `WorkRow` / `ListRow` thumbs while a photo decodes (the well is `wash` or the image)
- Empty states that are truly empty (`Nothing waiting.` / `No students yet.`) — quiet copy, no pencil
- Success copy (`Saved to Maya.`) and error copy (`Could not save capture`)
- Press feedback, tab change, theme change, rotate, hide-on-scroll, swipe tiles
- Header, tray, chips, or the bell
- Disabled controls that are not waiting
- Parent / student screens as decoration

One mark on a screen. If classify and upload overlap, one `WorkingLine`.

### 27.4 Copy

Visible type is `meta` / `mute`. Ellipsis on the default. No enum, no vendor, no “Grok.”

| Situation | Line |
|---|---|
| Default, first load, upload, slow save | `Working…` |
| Header camera / `/proposal` classify | `Studying the photo` |
| Model draft (student page, Capture, Ask bubble) | `Asking AI…` |
| Transcription + match | `Hearing the name…` |

Never: `Ask is identifying…`, `Looking at the page…`, `Loading…` (replace with `Working…` wherever the pencil is showing), `Classifying…`, `Please wait`.

Ask chat: the waiting state is a left bubble (`card` + `line`) containing `WorkingLine` size 20, text `Asking AI…`. Do not bounce the bubble.

`/proposal`: photo stays visible; `WorkingLine` sits under the hero (portrait) or at the top of the right pane (landscape). Text `Studying the photo`.

ConfirmSheet already flips the danger button to `Working…` when busy — leave the label; do **not** also put a pencil in that button unless the sheet wait exceeds 300 ms, in which case a size-20 mark may sit to the left of the label.

### 27.5 File

`src/components/ui/WorkingMark.tsx`

```ts
export function WorkingMark(props: {
  size?: 20 | 36;           // default 20
}): JSX.Element;

export function WorkingLine(props: {
  size?: 20 | 36;           // default 20
  text?: string;            // default 'Working…'
}): JSX.Element;
```

`WorkingMark`

- Canvas = `size`. Center the silhouette. Drive `Animated.View` rotate as §27.2.
- `accessibilityRole="progressbar"`
- `accessibilityLabel="Working"`
- `accessibilityState={{ busy: true }}`

`WorkingLine`

- Row: `flexDirection: 'row'`, `alignItems: 'center'`, gap `8`.
- `[WorkingMark] [Text]`
- Text: `type.meta`, `colors.mute`, `numberOfLines={1}`.
- The **row** is the accessible element: `accessibilityRole="progressbar"`, `accessibilityLabel` = the visible phrase with a trailing `…` stripped (`Working`, `Studying the photo`, `Asking AI`, `Hearing the name`). `accessibilityState={{ busy: true }}`.
- The inner `WorkingMark` is `accessible={false}` so VoiceOver does not say it twice.

Empty-state wrap (not a third export unless a screen wants it): column, `alignItems: 'center'`, gap `8`, vertical pad `24`, `WorkingMark` size `36`, then the same mute line.

Add `WorkingMark` / `WorkingLine` to the primitives list in §18.d when that pass is built. Screens in §13 replace the bare `Loading…` / `Asking AI…` / `Looking at the page…` status lines with `WorkingLine`. No new npm packages.

---

## 29. Assignments

A teacher-owned **column** on a class. It can exist before anyone turns work in. Visually it is a **work feed**, not a settings form.

### 29.1 Information type

| Information | Primitive | Why |
|---|---|---|
| The assignment list | `WorkRow` + swipe | Same job as Inbox: a thing I can open or delete |
| Due-soon strip | `ChipRow` | Horizontal shelf, like Amazon departments |
| Kind / weight / term / mark | `Chip` in `ChipRow` | Never a wall of `SecondaryButton`s |
| Capture picker | `AssignmentPicker` (horizontal cards) | Same muscle as `AvatarTray` |
| Category face | `AssignmentMark` | 56–72 wash well, View primitives, not emoji |

Do **not** use `ListRow` for assignments. Do **not** stack full-width kind buttons.

### 29.2 `AssignmentMark`

New file `src/components/ui/AssignmentMark.tsx`. Same well language as a `WorkRow` thumb (`wash`, `line`, radius `md`), not a circle (circles are people).

Glyphs are mute stroke, scale with `size / 56`:

| Category | Graphic |
|---|---|
| homework | Lined page (three bars) |
| quiz | Page + hollow dot |
| test / midterm / final | Two stacked pages (final/midterm wash-fill the front) |
| project | Folder tab + body |
| presentation | Rounded board + diamond |
| participation | Two small busts |
| behavior | Star (triangle pair) |
| other | 2×2 grid |

No tab icons. No color wheel. Dark mode uses `mute` / `wash` / `line`.

`WorkRow` grows an optional `lead` node that replaces the 72 media well when there is no photo.

### 29.3 List — `/class/{id}/assignments`

```
Phase banner (scrolls away)
Mute one-liner
Coming due          ← ChipRow of “Title · Aug 20” if any future due_at
Kind filter         ← ChipRow All + every GRADE_KINDS
WorkRow…
WorkRow…
[ sticky ] New assignment
```

Each `WorkRow`:

- `lead` = `AssignmentMark` 48
- Title = assignment title
- Status = kind · due
- Meta = weight summary (`Major · Quarter 2` / `15% · Semester`)
- Badge `assigned`
- Pills: **Open** · **Grade book**
- Swipe trailing **Open**, leading **Delete** (confirm sheet, no type-the-name)

Empty: `No assignments yet. Create one — the column shows up empty until work is in.`

### 29.4 Form — same component everywhere

`AssignmentForm` on `/class/{id}/assignment/new` and `/{id}`. Capture **New** uses this exact screen (`returnTo: proposal`).

Every choice row is a **horizontal `ChipRow`**. Title and custom % stay `TextField`. Due date field + chips Tomorrow / Next week / Clear. Optional **Unit** and **Section** fields (plus chips of names already used in the class) nest the grade-book tree.

**Answer key** (same form): chips **None · Photo · Typed items**. Photo of a blank worksheet runs `analyze-answer-key` and proposes editable items — teacher taps **Save assignment** to approve. A filled key is extracted, not solved. WorkRow status may include `Key · 12 items`. Capture match pre-selects the assignment when the printed page matches the stored print hash; teacher can change it. Evaluate scores against the key. Nothing is a grade until Approve.

### 29.5 Capture picker

On the Grade sheet, **Assignment** is an `AssignmentPicker`:

```
[ + New ] [ glyph  HW #17 ] [ glyph  6.1 Test ] …
              Homework          Test
```

Leading **+ New** tile. Selected card gets the brand ring (`brand` + `brandSoft`), same as an `AvatarTray` face. Scroll sideways. Do not list 12 `ListRow`s. Title under the 56 mark is **1 line, marquee** (§30) — not 2-line wrap. Meta (kind / due) stays 1 line, truncate.

Kind and Number/Pass/Fail on that sheet are also `ChipRow`s.

### 29.6 Files

```
src/components/ui/AssignmentMark.tsx
src/components/ui/AssignmentPicker.tsx
src/components/ui/AssignmentForm.tsx
src/components/ui/ChipRow.tsx
src/components/ui/WorkRow.tsx          // lead?: ReactNode
src/app/class/[id]/assignments.tsx
src/app/class/[id]/assignment/[assignmentId].tsx
src/app/proposal.tsx
```

---

## 28. Unknown — empty-seat person

**Job.** Give the teacher one circle that means “this is not a named student.” Tapping it clears a guessed or chosen name. It never inserts a student. Work stays unassigned and can wait in Inbox.

This replaces the proposal ghost **Not this student**. A ghost under the tray was easy to miss and easy to confuse with Retake / Throw away. Unknown lives **in** the Instagram circle row, as the last cell, so clearing a name is the same gesture as picking one.

### 28.1 Graphic

Not a help “?”, not a red X, not initials, not a plus-person, not a photo. A lone “?” is already how `initialsFor` draws a nameless person — in this tray it would look like a kid without a name, or like Help.

**Vacant bust.** Same 56 circle well as a roster face (`wash` fill, solid `line` 1 px — **never dashed**; Android + `borderRadius` is unreliable). Inside, hollow `mute` strokes (`s = size / 56`, stroke `max(1.5, 2s)`):

| Piece | At 56 | Shape |
|---|---|---|
| Head | 14 × 14, radius 7 | Hollow circle, no fill |
| Gap | 4 | Between head and bust |
| Bust | 26 × 12, top radii 13 | Hollow U: top-radiused, `borderBottomWidth` 0 |

The wash halo around the small outlined figure is the empty chair. Do **not** drop `Icon` `person` into the well (that reads as a tab icon). Do **not** add `'unknown'` to `IconName`.

Caption under the tray cell: **Unknown**. `badge` / 600. `mute` when idle, `brand` when selected. Never a first name, never `?`. Same `MarqueeText` as the other tray captions (§30) — the word fits, so it stays centered and still.

### 28.2 Selection

Unknown is a radio with the roster, not a toggle on the selected student.

| State | Ring | Meaning |
|---|---|---|
| `selectedId` is a student | That student’s brand ring. Unknown idle. | Named work |
| `selectedId` is null | Unknown brand ring + `brandSoft` wash | Explicitly unassigned |
| Tap Unknown | `student_id` stays / becomes `null`. Do not write a fake id. | Clears the guess |
| Tap a student | That id. Unknown idle. | Named |

Do not deselect by tapping the selected student again. The far-right Unknown cell is the only clear.

Hairline `line` rule (height 56) sits between the last student and Unknown so the last real face does not blend into the empty seat.

### 28.3 Where it appears

**Yes — assignment pickers where unassigned is legal**

| Surface | How |
|---|---|
| `/proposal` homework student tray | `AvatarTray allowUnknown` + `onUnknown`. Last cell. Scroll all the way right. |
| `WorkRow` / `Avatar` | `unknown` prop when the row is a **person slot** with no student and no photo (voice-only Inbox / Search). Never replace a homework photo. |

**No — never**

- Home / Class roster `AvatarTray` (tap navigates)
- Parents tray, parent-child tray, classmate tray
- Join-name picker (a student is choosing themselves)
- Portrait / parent card / student card / roster-import checklists (those require a real person or a confirmed name)
- Inbox **Assign name** list (that list *gives* a name; Unknown would be a no-op)
- Delete, help, add-person, or Approve

### 28.4 Copy and a11y

- Caption: `Unknown`
- VoiceOver: `Unknown. Clears the student. Work waits in Inbox.`
- Proposal helper when a student is selected: append `Not them? Scroll to Unknown.`
- Proposal helper when Unknown is selected and a name was read: `Read on the page: {name}. Pick the student — we will not invent one.`
- Proposal helper when nothing was read: `No name was clear. Unknown waits in Inbox.`
- Delete every **Not this student** string.

### 28.5 Files

```
src/components/ui/UnknownMark.tsx   // wash disk + hollow head + open shoulders
src/components/ui/Avatar.tsx        // unknown?: boolean (wins over photo/initials)
src/components/ui/AvatarTray.tsx    // allowUnknown, onUnknown
src/components/ui/WorkRow.tsx       // unknown?: boolean — photoless unassigned only
src/app/proposal.tsx                // homework tray only
```

`onUnknown` is a separate callback. Do not pass a sentinel id through `onPress` — a fake student id must never reach `attachCapture` or the matcher.

---

## 30. Marquee labels — overflow next to faces

§5 still says people names never wrap. This section **replaces truncate with a marquee** for the one class of string that sits **under or beside a picture or mark**. Everything else that is 1 line still truncates. This is not a second WorkingMark and not a story-ring. It is the Now Playing / Android ticker craft, scoped the way §1 scoped Facebook / Instagram / Amazon: steal the motion, not the chrome.

Research, August 2026:

| Source | What they do next to artwork / avatars |
|---|---|
| Instagram Stories tray, Facebook people rows, Amazon order titles | 1 line, ellipsis. That is what Kelyra shipped. We **override** it only for picture-adjacent identity |
| Android `TextView` marquee / Compose `basicMarquee` | 30 dp/s, 1200 ms delay, gap = ⅓ of the container, two copies, linear. Fade on the edge |
| iOS Music / Apple Music Now Playing | Hold at the start ~1.5–2 s, crawl at reading speed, fade, sweep-and-reset. Reduce Motion = static start. VoiceOver reads the full title |

We implement Music’s **sweep-and-reset**: hold at the start, crawl until the last glyph is visible, hold at the end, snap back to the start, repeat. One copy of the full string — never an ellipsis. We do **not** add `react-native-marquee` or `expo-linear-gradient`.

### 30.1 When it applies / when it does not

**Use `MarqueeText`**

| Surface | String | Align when it fits |
|---|---|---|
| `AvatarTray` caption | `firstName` (and `Unknown`) | center |
| Grade-book + heatmap student heads | `firstName` under the 56 avatar | center |
| `WorkShelf` caption | item title under the 72 thumb | center |
| `AssignmentPicker` title | assignment title under the 56 mark | center |
| `ListRow` title | name / row title next to 36 `Avatar` | start |
| `WorkRow` title | student or assignment title next to 72 media | start |
| Student / parent heroes | `display_name` next to 72 | start |
| `/profile`, `/parent` stacked names | name under 72 / 56 | center |
| `HamburgerDrawer` **teacher** identity | display name or email next to 36 photo | start |
| `ClassmateSheet` name | first name under 72 | center |

**Do not marquee**

Buttons, chips, context-menu pills, swipe tiles, PhaseBanner, `SectionHeader`, search fields, body / leads / confirm copy, Ask bubbles, `WorkingLine`, the header **wordmark**, `ListRow` **status**, `WorkRow` **status and meta**, AssignmentPicker **meta**, frozen grade-book assignment titles (2 lines), heatmap frozen gap labels (2 lines), `FloatingTabTray` labels.

One identity string per picture. Two tickers in one row is a carnival.

### 30.2 Motion recipe

Same dialect as §16 / §27: React Native `Animated` + `useNativeDriver: true`. **No Reanimated. No springs.**

| Token | Value |
|---|---|
| Speed | **30 pt/s** |
| Hold at start | **1200 ms** |
| Hold at end | **800 ms** |
| Easing | `Easing.linear` |
| Copies | **One.** Full string, no `…`. One line only — never wrap. Visible text is given its measured width so Yoga cannot wrap it. `numberOfLines={1}` + `ellipsizeMode="clip"` (not `tail`). Parent `overflow: hidden` clips |
| Distance | `textWidth - clipWidth` — crawl until the last glyph is in view |
| Reset | After the end hold, **snap** `setValue(0)` (no tween back) |
| Slop | Animate only if `textWidth > clipWidth + 2` (`marqueeMetrics`) |
| Fade | Optional 12 pt edge slabs during the crawl. They **lift at the end** so the last glyph is fully opaque. After the end hold the whole string fades out in 520 ms, holds blank 80 ms, then fades in at the start in 520 ms |
| Hits | Clip `pointerEvents="box-only"`. Track, texts, fades `none` |
| Driver | Native on iOS/Android. JS on web (`useNativeDriver` is false there) |
| RTL | If `I18nManager.isRTL`, crawl the other way |

```
hold 1200 ms at translateX = 0
distance = textWidth − clipWidth
duration = distance / 30 * 1000
timing → ±distance
edge fades lift; last glyph fully in
hold 800 ms
fade entire string out in 520 ms
snap offset to 0 (still invisible)
hold blank 80 ms
fade in at the start in 520 ms
repeat
```

Resume after a press / scroll pause **always** restarts at 0 + start hold.

**Centered under-icon captions** stay visually centered when the name fits (`Maya` under a 56). When it overflows, pin to the **start** of the clip for the hold so the teacher sees `Christoph`, not `istophe`. Beside-icon titles are start-aligned either way.

### 30.3 Pause table

The loop runs only when every gate is true.

| Gate | How | If false |
|---|---|---|
| Overflows | clip `onLayout` vs unconstrained copy A (`marqueeMetrics`) | Static `Text`, honor `align` |
| Reduce Motion | `AccessibilityInfo.isReduceMotionEnabled` + `reduceMotionChanged` (copy `WorkingMark`) | Static. Center if it fits, else start. No pulse |
| Screen reader | `isScreenReaderEnabled` + `screenReaderChanged` | Static (same as Reduce Motion). Moving nodes stay silent |
| Press / aiming | parent `paused` from `Pressable` children render-prop | Stop. Restart at 0 on release |
| Swipe | `ListRow` / `WorkRow` React `swiping` state (`true` on grant, `false` in `snap(0)` complete) | Same. Do not read the `Animated.Value` |
| Parent scroll | `MarqueeScrollProvider` + `useMarqueeScroll().scrollHandlers` spread on `Screen`, trays, and **both** `StickyTable` scrollers | `paused` for the whole pan. `scrollEpoch` increments **once** on end-drag / momentum-end — **not** per `onScroll` frame. Children remasure on that bump |
| Off-screen | `measureInWindow` vs window ± 8 pt, debounced on epoch / layout | Stop, `setValue(0)`. Do not spin 100 hidden loops |
| AppState | pause on `background` / `inactive`; remeasure on `active` | Stop |

Clip default `accessible={false}`. Parent `Pressable` / `Link` speaks the name (see the design’s §3.11 table). Only classmate / stacked `/parent` names set `accessible`.

The caption is **not** a `ScrollView`. No `PanResponder` inside `MarqueeText`. A nested pan would steal House / the grade-book head. The overflowing track must not steal taps on the next cell (Android).

### 30.4 Dark mode and rotation

Callers pass ink via `style` (`colors.ink`, `colors.brand` when selected, `colors.mute` for Unknown / shelf). `fadeColor` is the **surface**: `colors.bg` on rows, `colors.elevated` in the drawer and classmate sheet, `colors.wash` on table heads, `colors.brandSoft` on a selected `ListRow`.

Rotate relayouts (§6). Re-measure. Flex titles / heroes may go static. **Table student clips stay 72** — do not promise a landscape grade-book name fits. Do not animate the rotate.

### 30.5 File

`src/components/ui/MarqueeText.tsx`

```ts
export function MarqueeText(props: {
  text: string;
  style?: StyleProp<TextStyle>;
  align?: 'start' | 'center';     // default 'start'
  delay?: number;                 // default 1200
  paused?: boolean;
  accessibilityLabel?: string;
  accessible?: boolean;           // default false
  fadeColor?: string;
}): JSX.Element;

export function MarqueeScrollProvider(props: { children: ReactNode }): JSX.Element;
export function useMarqueeScroll(): {
  paused: boolean;
  scrollEpoch: number;
  scrollHandlers: Pick<ScrollViewProps, 'onScroll' | 'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollEnd'>;
};
export function marqueeMetrics(clipWidth: number, textWidth: number, speed?: number): {
  gap: number; distance: number; duration: number; overflowing: boolean;
};
```

One `MarqueeScrollProvider` next to `AppShell`. `MarqueeText` reads it. Callers spread `scrollHandlers` — they do not wrap `ScrollView`s. `Screen` composes the vertical **begin/end/momentum** handlers (chrome `onScroll` stays for hide-on-scroll and must not bump epoch). `StickyTable` **must** compose both head and body (grade book is `scroll={false}`). `scrollEpoch` increments once on lift, never per frame. No module-level epoch. Trays that spread handlers also set `scrollEventThrottle={16}`.

Call sites drop `numberOfLines={1}` on those identity strings. `AssignmentPicker` title **drops 2-line wrap** for 1-line marquee. Student / parent heroes and `/parent` child names that wrap today become 1-line marquee so they obey §5. Teacher hamburger `whoName` marquees. Student / parent drawer identity does not (no photo).

Add `MarqueeText` to the primitives list in §18.d. No new npm packages. No SQL. No AI routes. Matcher still never inserts a student. Nothing is a grade until Approve.
