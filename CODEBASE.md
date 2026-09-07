# PataSkills Play — Master Codebase Documentation

> **Generated**: 2026-09-01 · **Last updated**: 2026-09-07 (i) — Shipped the **Tabbed Home Shell**,
> **Progress Gate**, and full **Reports & Missed Questions System**:
> **(1) Progressive Unlock & Root Gate**: `lib/progress.ts` gained `areTabsUnlocked()` and
> `unlockTabsIfNeeded()` (`@play/tabs_unlocked`). Pre-unlock, `app/index.tsx` acts as a root gate
> rendering the classic single-route `SkillsFlow` directly without a tab bar. The moment the
> learner completes their first topic on any skill, tabs permanently unlock and subsequent launches
> redirect to `/(tabs)/home`.
> **(2) Tabbed Navigation (`app/(tabs)/`)**: Custom `FloatingTabBar` (`components/nav/FloatingTabBar.tsx`)
> with spring-animated sliding pill and Lucide icons (`Home`, `Library`, `KeyRound`, `PieChart`)
> wrapping four tabs: `home` (`SkillProgressCard` list with dynamic progress & resume actions),
> `skills` (embedded `SkillsFlow`), `keys` (`KeysOptionsContent` with buy-keys/subscribe/free-trial timer),
> and `reports` (live analytics). All four tabs display `AppHeader` (`components/nav/AppHeader.tsx`)
> with avatar initials, learner name, and gear link to `app/settings.tsx`.
> **(3) Settings & Login Migration**: "Existing user, login" is hidden once tabs are unlocked.
> Account sign-in, account restore, notifications toggle, currency toggle (`KES`/`USD`), and support/legal
> links now live in `app/settings.tsx` (`components/settings/SettingsComponents.tsx`).
> **(4) Missed Questions Tracking**: `lib/mistakes.ts` tracks every failed question per skill in
> `@play/mistakes:${skillId}` with question prompt, options, correct answer, fail count, and mastered status.
> Captured in real time in `components/cards/CardDeck.tsx`. `app/mistakes.tsx` (`components/reports/MistakeCard.tsx`)
> provides a dedicated drill-down review screen with "All" vs "Unsolved" filters.
> **(5) XP & Streak Analytics**: `lib/xp.ts` records lifetime (`@play/total_xp`) and per-skill XP (awarded
> upon topic complete in `components/play/PlaySession.tsx`). `lib/streak.ts` records practice days
> (`@play/activity_dates`), computing consecutive Day Streak and Mon–Sun weekly active flags.
> `app/(tabs)/reports.tsx` dynamically renders live Day Streak, Total XP, 7-day calendar dots,
> Bronze/Silver/Gold League tier, and per-skill cards with missed questions count.
> **(6) Bugfix**: `lib/curriculaCatalog.ts` rewritten with async IIFE to fix a `PromiseLike` typecheck error.
>
> **Last updated**: 2026-09-06 (h) — Third skill (**Bible
> Trivia**) shipped, and the `full` track's label moved from a hardcoded string to a DB-driven
> universal default, closing the gap `play_track_defaults` was reserved for. **(1)**
> `constants/skills.ts` gained a `bible-trivia` `LANDING_SKILLS` entry and
> `constants/curriculumAssets.ts` a matching `bible-trivia.webp` cover path — same shape as
> `true-false`, converted from a nested `levels/chapters/topics` source schema per
> `json-conversion.md`'s new "Bible Trivia" section (237 of 395 source questions kept; the
> `matching` question type, new in this source, was excluded for the same single-answer-engine
> reason `multi` already was). **(2)** `play_track_defaults` (§14) is no longer permanently
> empty by design — it gained a `label` column (nullable, alongside `image_path` which is now
> also nullable so a row can carry a label with no image) and a seeded `full` → `"Learn Full
> Skill"` row, replacing `constants/trackOptions.ts`'s old hardcoded
> `DEFAULT_TRACK_LABELS.full` string as the real source of truth. `lib/trackDefaults.ts`
> (§9) now caches `{ images, labels }` instead of a flat image map, exposing both
> `getCachedTrackDefaultUrl()` and a new `getCachedTrackDefaultLabel()`; its fetch was also
> rewritten from a raw `.then()` chain to an `async` IIFE to fix a pre-existing `tsc` error
> (`PromiseLike` assigned where a real `Promise` was declared) that this same pass ran into
> again in the still-outstanding `lib/curriculaCatalog.ts` (untouched — see that section's
> note). `constants/trackOptions.ts`'s `trackLabel()` now checks
> `getCachedTrackDefaultLabel(track)` between the JSON's own `customTrackDef?.title` and the
> hardcoded default, mirroring `trackImage()`'s existing DB-then-local fallback chain. **(3)**
> Storage bucket gained `curricula/bible-trivia.json` and `curricula/bible-trivia.webp`; a
> `play_curricula` row (`slug: 'bible-trivia'`) was handed to the user as SQL to run manually
> (anon key can't write that table). **Known pre-existing gap, unrelated to this pass**: a
> `world-facts` skill's JSON/cover image already exist in Storage and are documented in
> `json-conversion.md`, but `constants/skills.ts`/`curriculumAssets.ts` still only list
> `driving-theory`, `true-false`, and now `bible-trivia` — `world-facts` was left out of both
> files by whatever WIP produced `lib/curriculaCatalog.ts` (uncommitted at the time of this
> pass), not by this one. See §7, §9, §13, §14, and §18 for the corrected implementation.
>
> **Last updated**: 2026-09-06 (g) — Per-track illustration
> resolution made fully database/JSON-driven, closing the last two hardcoded-per-skill gaps.
> **(1)** `constants/trackOptions.ts`'s `trackImage()` final fallback now reads the skill's cover
> image from `lib/curriculaCatalog.ts` (DB, `play_curricula.cover_image_path`) instead of the
> local `CurriculumCoverImagePaths` constant — that constant is now only the pre-fetch,
> instant-render backup for the split second before the DB cache warms. **(2)** The five
> `assets/driving/*.webp` illustrations (`differenciate`/`name`/`meaning`/`usage`/`reading`)
> turned out to be driving-theory's own art, not generic/universal — they were uploaded to
> `play-assets/track-icons/` (`scripts/upload-track-icons.mjs`, corrected to the real track ids
> `pairs`/`names`/`meanings`/`whereUsed`/`reading` instead of a stale pre-consolidation
> `differentiation`/`identification` naming) and wired as a per-curriculum override directly on
> driving-theory's own JSON (`tracks[].image` in `curricula/questions.sample.json`) rather than
> as a shared default. **(3)** `play_track_defaults` (new table, `lib/trackDefaults.ts`,
> `supabase/play_track_defaults.sql`) is intentionally left **empty** — seeding it with driving's
> art would have leaked those images onto every other skill's matching track id (e.g.
> true-false's `reading` track), so it exists only as a place to add genuinely shared/universal
> track art in the future; until then every skill's tracks correctly fall through to that skill's
> *own* cover image. `constants/trackOptions.ts`'s `LOCAL_IMAGES` map was emptied for the same
> reason — it was flash-rendering driving's art on any skill's matching track for the instant
> before that skill's own JSON loaded. See §7, §9, and §14 for the corrected implementation.
>
> **Last updated**: 2026-09-06 (f) — `full` and `reading` are now
> compulsory: `detectAvailableTracks()` guarantees both are always selectable even if a
> curriculum's JSON `tracks` array omits them. Driving-theory's JSON un-merged
> `identification`/`differentiation` back into four independently selectable standard tracks
> (`pairs`/`names`/`meanings`/`whereUsed`) — the brief two-track merge from pass (e) below was
> reverted, since it collapsed three genuinely distinct learning styles into one. Added a
> generic `filterTags`/`question.tags` filter primitive (AND-matched) alongside
> `filterRole`/`filterFormat`, and `groupId`/`groupTitle` for visually clustering related tracks
> under one heading in `LearningStyleScreen`/`ModeSwitcherSheet` without changing how each is
> addressed (`constants/trackOptions.ts`'s `groupTrackOptions()`). Reading Mode's
> question-derived path (`deriveReadingEntriesFromQuestions()` in `utils/hydrateQuestions.ts`,
> used whenever a skill has no real `signs` catalog) is now question-shape-aware — image and
> "similar items" sections only appear when the source question's format/pairId actually
> supports them, and the question's own `explanation` merges in below the answer instead of
> being discarded (`ReadingCard.tsx` updated to match, guarding empty sections). A
> `kind: 'reading'` track can also scope itself via its own `filterRole`/`filterTags`. See §9,
> §11, and `json-conversion.md`'s "Defining Custom Learning Tracks in JSON" section.
>
> **Last updated**: 2026-09-06 (e) — `CurriculumTrackDefinition.filterRole`/`filterFormat` widened from a single string to `string | string[]` (`lib/curriculum.ts`'s `roleMatches()` now checks array membership), letting one JSON-declared track absorb several role values. Both live curricula in Supabase Storage now actually ship explicit `tracks` arrays using this: driving-theory (`differentiation`, `identification` [merges name+meaning+whereUsed], `reading`, `full`) and true-false (`full`) — previously the bucket copies were stale flat/role-only JSON despite the local repo files and app code already supporting the JSON-driven format. See §11 and §18 for the corrected type and bucket contents.
>
> **Last updated**: 2026-09-05 (d) — this pass updates documentation to reflect the dynamic JSON-driven learning tracks system, multi-skill routing, and per-curriculum customization: **(1)** JSON-driven track definitions (`CurriculumTrackDefinition` in `types/quiz.ts`) allowing curricula to define arbitrary track IDs, custom titles, filtering rules (`filterRole`, `filterFormat`, `kind`), and custom icons directly in curriculum JSON without code changes; **(2)** Dynamic track detection (`detectAvailableTracks`/`getAvailableTracks`/`getCurriculumTrackDefs` in `lib/curriculum.ts`) supporting both custom JSON tracks and legacy question `role`/sign auto-detection with 100% backward compatibility; **(3)** Deduplicated cache (`loadCurriculumCached`) ensuring a single in-flight network promise shared across `getTrackTotals()`, `getAvailableTracks()`, and `getCurriculumTrackDefs()`; **(4)** `constants/trackOptions.ts` dynamic builders (`getTrackOptionsForSkill`, `getTrackOption`) prioritizing skill overrides → JSON `trackDef.title` → default labels; **(5)** `LearningStyleScreen`, `TrackDetailScreen`, and `ModeSwitcherSheet` updated to consume dynamic tracks and track definitions; **(6)** Multi-skill catalog in `constants/skills.ts` and deep linking in `app/index.tsx` supporting custom track IDs. · **Scope**: Every file inside `PataProducts/play/` · **Method**: Direct inspection of every file listed in §2 — verified against active source code and `tsc` typecheck.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Tree](#2-directory-tree)
3. [Technology Stack & Dependencies](#3-technology-stack--dependencies)
4. [Configuration Files](#4-configuration-files)
5. [App Layer (`app/`)](#5-app-layer-app)
6. [Components (`components/`)](#6-components-components)
7. [Constants (`constants/`)](#7-constants-constants)
8. [Theme (`theme/`)](#8-theme-theme)
9. [Library / Data Layer (`lib/`)](#9-library--data-layer-lib)
10. [Hooks (`hooks/`)](#10-hooks-hooks)
11. [Types (`types/`)](#11-types-types)
12. [Utilities (`utils/`)](#12-utilities-utils)
13. [Scripts (`scripts/`)](#13-scripts-scripts)
14. [Supabase (`supabase/`)](#14-supabase-supabase)
15. [Assets (`assets/`)](#15-assets-assets)
16. [Docs (`docs/`)](#16-docs-docs)
17. [Miscellaneous Files](#17-miscellaneous-files)
18. [Data Flow & Architecture](#18-data-flow--architecture)

---

## 1. Project Overview

**PataSkills Play** is a mobile-first quiz application built with **Expo** (React Native) targeting iOS, Android, and web. It originated as a single **Driving Theory** curriculum (practicing highway-code questions about road-sign identification) and has since grown into a multi-skill catalog — `driving-theory`, `true-false`, and `bible-trivia` are all currently live (see `constants/skills.ts`'s `LANDING_SKILLS`). Curriculum and sign images are fetched from a **Supabase** backend at runtime; questions are presented in a swipeable card deck; continued play is gated behind a consumable **"keys"** system.

Since the previous documentation pass, three large areas were built out that this update captures for the first time:

1. **Landing flow redesign** — the single-page track picker was replaced by a three-stage flow: a "Skills Corner" 2-column grid (`LandingScreen`) → a full-page learning-style list (`LearningStyleScreen`) → a full-page single-track preview (`TrackDetailScreen`) → download. Switching modes mid-session (after a topic completes) reuses the same track list via a bottom sheet, `ModeSwitcherSheet`.
2. **A real monetization stack** — a tiered keys economy with escalating cooldowns, a premium "Unlimited Pass" subscription, one-time key packs, rewarded-ad bonus sessions, and account restore/sync via email or Google — checkout runs through **Paystack** (web-embedded), not RevenueCat or a native IAP SDK.
3. **Learning Tracks and Reading Mode** (still current) — the same question bank filtered/regrouped client-side into **Pairs** (default) / **Names** / **Meanings** / **Where Used** / **Full course** / **Reading** (non-quiz, browse-only). See [§16 Docs](#16-docs-docs) for the original feature spec.

### Core User Flow

```
Pre-unlock:
  app/index.tsx (RootGate)
    → SkillsFlow (LandingScreen 2-col grid → LearningStyleScreen → TrackDetailScreen → Downloading → PlaySession)
      → Topic 1 Completed!
        → unlockTabsIfNeeded() fires in lib/progress.ts permanently

Post-unlock (every future launch):
  app/index.tsx redirects to /(tabs)/home
    ├── (tabs)/home    — In-progress skill cards, percentage, direct session resume
    ├── (tabs)/skills  — Skills Corner grid, track pickers, and play sessions (embedded SkillsFlow)
    ├── (tabs)/keys    — Balance hero, key packs, subscriptions, free-trial countdown & reminder toggle
    └── (tabs)/reports — Day streak, total XP, 7-day calendar, league tier, and per-skill cards with missed questions
  app/settings.tsx     — Account restore/sign-in, notification toggle, currency toggle, legal/support links
  app/mistakes.tsx     — Drill-down per-skill mistake review (question prompt, fail count, correct answer)
```

A `?track=` URL param (ad/campaign links) skips straight to Track Detail; `?resume=true` (returning from checkout) skips straight into a session.

---

## 2. Directory Tree

```
play/
├── .env                              # Supabase + Paystack + AdMob + Google client env vars
├── .gitattributes                    # Binary-safe git config for fonts/images
├── .gitignore                        # Standard Expo ignores
├── AGENTS.md                         # AI agent instructions (Expo version pin)
├── CLAUDE.md                         # AI agent marker
├── CODEBASE.md                       # This file
├── LICENSE                           # MIT License (Expo origin)
├── README.md                         # Minimal readme
├── app.json                          # Expo app manifest
├── babel.config.js                   # Babel preset (expo)
├── metro.config.js                   # Metro bundler config (woff/woff2 support)
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript config
├── vercel.json                       # Web deployment config (Vercel)
├── pataskills-swipe-demo.html        # Standalone HTML swipe-card prototype
│
├── app/                               # Expo Router pages
│   ├── _layout.tsx                    # Root layout (providers, fonts, splash)
│   ├── index.tsx                      # Root gate (pre-unlock: SkillsFlow; post-unlock: redirect to /(tabs)/home)
│   ├── (tabs)/                        # Tabbed home shell (unlocked after first topic complete)
│   │   ├── _layout.tsx                # Tabs layout with FloatingTabBar (Home, Skills, Keys, Reports)
│   │   ├── home.tsx                   # Home tab — in-progress skill cards + direct session resume
│   │   ├── skills.tsx                 # Skills tab — embedded SkillsFlow under AppHeader
│   │   ├── keys.tsx                   # Keys tab — standalone keys balance, packs, subscriptions, free trial
│   │   └── reports.tsx                # Reports tab — Day streak, total XP, 7-day activity, league, skill cards
│   ├── settings.tsx                   # Settings screen — Account, preferences, currency, support, legal
│   ├── mistakes.tsx                   # Mistake Overview screen — per-skill missed questions list & review
│   ├── +html.tsx                      # Web-only HTML shell (fonts, viewport, CSS)
│   ├── keys-packs.tsx                 # Buy one-time keys — pack list + balance hero
│   ├── keys-confirm.tsx               # Confirm a key-pack purchase + email capture
│   ├── how-keys-work.tsx              # Explainer: keys economy
│   ├── subscription-plans.tsx         # Unlimited Pass plan list (weekly/regular/annual)
│   ├── subscription-confirm.tsx       # Confirm a subscription + email capture
│   ├── premium-benefits.tsx           # Free-vs-Premium comparison table
│   ├── payment-complete.tsx           # Post-Paystack-checkout landing (grants keys/premium)
│   ├── how-free-mode-works.tsx        # Explainer: free-trial keys/timer/ads/reminders
│   ├── +not-found.tsx                 # Default Expo Router 404 screen (unmodified boilerplate)
│   └── admin/
│       └── signs.tsx                  # Admin tool: browse & swap sign images
│
├── components/
│   ├── auth/
│   │   ├── RestoreAccountModal.tsx    # Sign-in/restore modal (Google or email) + logged-in account view
│   │   ├── GoogleWebButton.tsx        # Native stub (renders nothing — no native Google sign-in yet)
│   │   └── GoogleWebButton.web.tsx    # Real Google Identity Services button (web only)
│   ├── cards/
│   │   ├── CardDeck.tsx               # Router: QuizCardDeck (with mistake recording) or ReadingCardDeck
│   │   ├── ReadingCard.tsx            # Reading Mode card — sign image, name, meaning, explanation
│   │   ├── ScrollHintChevron.tsx      # Shared bouncing "more content below" chevron
│   │   └── TwoImageCard.tsx           # Individual quiz card (3 layout types)
│   ├── feedback/
│   │   ├── CheckButton.tsx            # "CHECK" / "GOT IT" button with feedback animation
│   │   ├── DownloadingScreen.tsx      # Loading screen with bouncing dots
│   │   ├── FeedbackSheet.tsx          # Correct/Not-quite bottom sheet
│   │   ├── FlagIcon.tsx               # Flag-a-question toggle button
│   │   ├── KeyRewardSuccessModal.tsx  # "+1 key" reward screen (bare content + standalone modal wrapper)
│   │   ├── KeysOfferScreen.tsx        # Upsell offer screen
│   │   ├── KeysOptionsContent.tsx     # Reusable 3-option card container (Buy Keys, Subscribe, Free Trial)
│   │   ├── LearnMoreSheet.tsx         # Explanation bottom sheet — backed by the signs catalog
│   │   ├── QuitConfirmSheet.tsx       # "Are you sure?" quit confirmation
│   │   ├── SessionStateScreen.tsx     # Interstitial screen (topic/chapter complete, out-of-keys, rewards)
│   │   └── WatchAdPromptSheet.tsx     # "Watch an ad for +1 session?" sheet, chains into KeyRewardSuccessModal
│   ├── home/
│   │   ├── LandingIllustration.tsx    # Remote cover image component
│   │   ├── LandingScreen.tsx          # Entry screen — 2-column "Skills Corner" grid
│   │   ├── SkillCard.tsx              # Bordered skill card w/ progress + CTA
│   │   ├── SkillGridCard.tsx          # Compact grid-cell skill card (used by LandingScreen)
│   │   └── SkillProgressCard.tsx      # In-progress skill card on Home tab (progress bar, %, CTA)
│   ├── landing/
│   │   ├── CarouselDots.tsx           # Animated pager dots (currently unused by LandingScreen's grid)
│   │   ├── LearningStyleScreen.tsx    # Full-page track/mode list (reuses ModeCard)
│   │   ├── ModeCard.tsx               # One learning-mode row (illustration, title, status, progress, count)
│   │   ├── ModeSwitcherSheet.tsx      # Bottom sheet: switch track mid-flow, or "N/6 tracks complete"
│   │   └── TrackDetailScreen.tsx      # Full-page single-track preview + "Start Practice" CTA
│   ├── nav/
│   │   ├── AppHeader.tsx              # Header shown across tabs (avatar initials, name, settings gear icon)
│   │   ├── FloatingTabBar.tsx         # Pill-animated bottom tab bar (Home, Skills, Keys, Reports)
│   │   └── ScreenTransition.tsx       # Web-only slide-in wrapper for standalone app/ routes
│   ├── play/
│   │   ├── PlaySession.tsx            # Session orchestrator (keys, flow states, XP/streak award, mode switcher)
│   │   └── SkillsFlow.tsx             # Extracted 4-stage Skills flow (Landing -> LearningStyle -> TrackDetail -> Play)
│   ├── reports/
│   │   └── MistakeCard.tsx            # Mistake card displaying question, fail count, and correct answer
│   ├── settings/
│   │   └── SettingsComponents.tsx     # SectionHeader, SettingsRow, SettingsToggleRow
│   └── ui/
│       ├── Button.tsx                 # Shared CTA pill button (solid/gradient/outline)
│       ├── ConnectionError.tsx        # "App can't connect" full-screen state + RELOAD button
│       └── Toggle.tsx                 # Small animated switch (used by reminders & notification toggles)
│
├── constants/
│   ├── index.ts                       # Barrel export for all constants
│   ├── colors.ts                      # Light/Dark/Static color palettes
│   ├── gradients.ts                   # Gradient definitions (brand, category, sheets)
│   ├── typography.ts                  # Font families, text styles, font assets
│   ├── spacing.ts                     # Spacing scale & border radius tokens
│   ├── icons.ts                       # Icon size tokens
│   ├── curriculumAssets.ts            # Static cover-image paths by curriculum slug
│   ├── skills.ts                      # LANDING_SKILLS catalog with trackLabels / trackImages overrides
│   └── trackOptions.ts                # getTrackOptionsForSkill / getTrackOption — mode list & visuals
│
├── theme/
│   ├── ThemeContext.tsx                # React context: dark/light/auto theme
│   └── tokens.ts                      # Re-export barrel for design tokens
│
├── lib/
│   ├── supabase.ts                    # Supabase client singleton
│   ├── curriculum.ts                  # Fetch curriculum JSON + signs catalog; deriveTrack()
│   ├── curriculaCatalog.ts            # DB-driven curricula catalog with cached Promise handling
│   ├── trackDefaults.ts               # DB-driven universal track icons and labels
│   ├── downloadSession.ts             # Orchestrate full session download (track-aware)
│   ├── keys.ts                        # Keys balance: read/write/spend/reset/premium, cooldown tiers
│   ├── premium.ts                     # PLANS (subscription tiers) + KEY_PACKS catalog & pricing display
│   ├── currency.ts                    # USD/KES conversion + formatting helpers
│   ├── billing.ts                     # Paystack web checkout — purchasePlan() / purchaseKeyPack()
│   ├── restore.ts                     # Account restore/link by email or Google, play_accounts sync
│   ├── email.ts                       # Email sanitize/validate + display truncation
│   ├── ads.ts                         # Rewarded-ad bonus session (optional native; web fallback timer)
│   ├── notifications.ts               # Browser Notification API reset-timer reminder (web only)
│   ├── progress.ts                    # Local (+cloud-synced) topic progress, tracks, and areTabsUnlocked() flag
│   ├── mistakes.ts                    # Missed questions recording, fail count, mastered status, cloud sync
│   ├── xp.ts                          # Lifetime & per-skill XP tracking and cloud sync
│   ├── streak.ts                      # Activity date recording, streak calculation, 7-day week calendar
│   ├── signs.ts                       # Fetch sign assets & sign pairs from DB
│   └── navDirection.ts                # Explicit web slide-direction flag (navPush/navBack/navReplace)
│
├── hooks/
│   ├── useKeys.ts                     # React hook wrapping lib/keys.ts (balance, isPremium, resetAt, isOutOfKeys)
│   └── useScrollHint.ts               # Shared "content taller than viewport" bouncing-chevron logic for card decks
│
├── types/
│   └── quiz.ts                        # QuizQuestion (+ role field), SignCatalogEntry
│
├── utils/
│   ├── groupSessions.ts               # groupQuestionsBySession, chunkIntoSessions, chunkSignsIntoSessions
│   ├── hydrateQuestions.ts            # Replace sign keys with image URLs (questions + signs catalog)
│   └── shuffleAnswers.ts              # Fisher-Yates answer randomization
│
├── scripts/                           # One-off Node data-pipeline scripts (see §13) + .gitignore + output/
│
├── supabase/                          # Standalone SQL migrations/fixes (see §14)
│
├── assets/
│   ├── fonts/                         # Sora font family (5 weights × TTF + WOFF2)
│   ├── images/                        # App icons, favicon, mascot, splash
│   ├── homepage/                      # Landing page images (driving.png, homepage.webp)
│   ├── premium/                       # key.webp, unlock.webp, crown.webp
│   └── driving/                       # Learning-mode illustrations (differenciate/name/meaning/usage/reading.webp)
│
├── docs/
│   └── learning-tracks-and-reading-mode.md   # Feature spec for Learning Tracks + Reading Mode
│
├── data/
│   └── questions.sample.json          # { tracks?: CurriculumTrackDefinition[], questions: QuizQuestion[] (322, tagged with role), signs: SignCatalogEntry[] (92) }
│
├── dist/                              # Static web export output (expo export -p web) — build artifact, not source
├── .claude/                           # Claude Code project settings
├── Inspos/                            # Design inspiration screenshots
└── _deleted_local_assets/             # Archived deleted assets
```

---

## 3. Technology Stack & Dependencies

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Expo (managed workflow) | ~54.0.33 |
| **Routing** | expo-router | ~6.0.23 |
| **UI Runtime** | React Native | 0.81.5 |
| **React** | React | 19.1.0 |
| **Animation** | react-native-reanimated | ~4.1.1 |
| **Gestures** | react-native-gesture-handler | ~2.28.0 |
| **Backend** | Supabase (hosted PostgreSQL + Storage + Auth) | ^2.112.4 |
| **Local Storage** | AsyncStorage | 2.2.0 |
| **Images** | expo-image | ~3.0.11 |
| **Gradients** | expo-linear-gradient | ^55.0.13 |
| **Haptics** | expo-haptics | ~15.0.8 |
| **Icons** | @expo/vector-icons + lucide-react-native | — |
| **SVG** | react-native-svg | ^15.15.4 |
| **Web** | react-native-web + react-dom | ^0.21.0 / 19.1.0 |
| **TypeScript** | typescript | ~5.9.2 |

**Payment/ads/notifications are deliberately NOT in `package.json`:**
- **Paystack** — loaded at runtime via a `<script>` tag injected into the web page (`lib/billing.ts`'s `loadPaystackScript()`); no npm package.
- **`react-native-google-mobile-ads`** — referenced only via a guarded `require()` inside `lib/ads.ts` (`nativeModule()`), so its absence from `package.json` doesn't break anything; `adsAvailable()` returns false and every rewarded-ad call falls back to a simulated timer. Install it and it activates automatically, no code changes needed.
- **Browser Notification API** — `lib/notifications.ts` uses the web-native `Notification` constructor directly; there is no `expo-notifications` dependency, so this reminder is web-only (native builds silently no-op).
- **No RevenueCat, no native IAP** — unlike PataSkillsV2, this app's monetization is entirely Paystack (web checkout) + Supabase, keyed by email rather than device/store account.

### NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `expo start` | Start dev server |
| `android` | `expo start --android` | Dev on Android |
| `ios` | `expo start --ios` | Dev on iOS |
| `web` | `expo start --web` | Dev on web |
| `build` | `expo export -p web` | Static web export |

There is no `lint` script and no ESLint config. Type safety is enforced via `npx tsc --noEmit` only.

---

## 4. Configuration Files

### `app.json`
Expo manifest. App name **"PataSkills Play"**, slug `play`. Portrait-only, dark `userInterfaceStyle`. Android adaptive icon with foreground/background/monochrome layers. Web output mode `static`. Deep link scheme `pataskillsplay`. Predictive back gesture disabled on Android.

### `tsconfig.json`
Extends `expo/tsconfig.base`. Strict mode. Path alias `@/*` → project root.

### `babel.config.js` / `metro.config.js`
`babel-preset-expo` (bundles the reanimated/worklets transform). Metro adds `woff`/`woff2` to asset extensions for the subsetted web fonts.

### `.env`
Environment variables actually referenced in source (confirmed via `process.env` grep):
- `EXPO_PUBLIC_PATASKILLS_SUPABASE_URL`, `EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY` — Supabase project
- `EXPO_PUBLIC_PATASKILLS_PAYSTACK_PUBLIC_KEY` — Paystack public key (falls back to `pk_test_placeholder` if unset)
- `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` — production AdMob rewarded ad unit ID (falls back to Google's test unit ID outside production)
- `EXPO_PUBLIC_APP_ENV` — gates test vs. production ad unit selection
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Google Identity Services client ID (web sign-in)

Shares its Supabase project with PataSkillsV2 but uses independent tables (`play_curricula`, `play_signs`, `play_sign_pairs`, `play_accounts`, `play_purchases`) and storage bucket (`play-assets`).

### `.gitattributes`
Marks binary asset formats as `binary` to prevent Git line-ending corruption on Windows.

### `vercel.json`
Web deployment configuration for hosting the static export on Vercel.

---

## 5. App Layer (`app/`)

### `_layout.tsx` — Root Layout

```
GestureHandlerRootView
  └── SafeAreaProvider
        └── ThemeProvider (defaultMode="dark")
              └── RootLayoutInner
                    ├── StatusBar (light style)
                    └── Stack (headerShown: false)
```

Loads the Sora font family via `useFonts()` (empty map on web — fonts are already `@font-face`-declared in `+html.tsx`), hides the splash screen once loaded, renders the `Stack` navigator on the theme background.

---

### `index.tsx` — Root Gate

`app/index.tsx` functions as the **Root Gate** for the entire application:
- On mount, checks `areTabsUnlocked()` in `lib/progress.ts` (`@play/tabs_unlocked`).
- **Pre-unlock (New Learners)**: Renders `SkillsFlow` directly without a bottom tab bar, preserving the original single-route entry flow. The learner picks a skill, chooses a track, and plays through the first topic. The instant `markTopicCompleted()` fires for topic 0 on any skill, `unlockTabsIfNeeded()` sets `@play/tabs_unlocked = 'true'` permanently.
- **Post-unlock (Returning Learners)**: Subsequent app launches immediately `<Redirect href="/(tabs)/home" />` into the tabbed shell.

---

### `app/(tabs)/` — Tabbed Home Shell (New)

The tabbed shell unlocked once the learner completes their first topic. Defined in `app/(tabs)/_layout.tsx`, using a custom `FloatingTabBar` (`components/nav/FloatingTabBar.tsx`) with spring-animated sliding pill and Lucide icons:

#### `(tabs)/_layout.tsx`
Renders `<Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>` for the four routes: `home`, `skills`, `keys`, and `reports`.

#### `(tabs)/home.tsx` — Home Tab
- Lists all skills where the learner has made progress (`completedTopics > 0`), loaded from the DB catalog (`play_curricula`) merged with static `LANDING_SKILLS`.
- Each in-progress skill renders a `SkillProgressCard` (`components/home/SkillProgressCard.tsx`) showing display title, topic count, percentage progress bar, and dynamic action button (`CONTINUE` or `START`).
- Tapping an in-progress card navigates straight to `/(tabs)/skills?resume=true&skill=<slug>`, jumping directly back into the session without re-showing track pickers. If a skill is 100% complete, tapping opens `/(tabs)/reports`.
- Uses `useFocusEffect` to refresh local progress every time the learner tabs back to Home.

#### `(tabs)/skills.tsx` — Skills Tab
- Renders the full 4-stage `SkillsFlow` component (`components/play/SkillsFlow.tsx`) embedded beneath `AppHeader`.
- Learners can browse the 2-column Skills Corner grid, select alternative learning tracks on `LearningStyleScreen`, preview track details on `TrackDetailScreen`, and initiate practice sessions.

#### `(tabs)/keys.tsx` — Keys Tab
- The standalone, permanent home for key management.
- Renders `AppHeader` followed by `KeysOptionsContent` (`components/feedback/KeysOptionsContent.tsx`), offering:
  1. **Buy Temporary Access Keys** (packs of 20/40/80/120) → `/keys-packs`
  2. **Subscribe for Unlimited** (Weekly/Monthly/Annual) → `/subscription-plans`
  3. **Use Free Trial** with live countdown ticker and notifications reminder toggle.

#### `(tabs)/reports.tsx` — Reports Tab
- Full live learner analytics dashboard:
  - **Day Streak Stat Card**: Real consecutive active days calculated by `lib/streak.ts`.
  - **Total XP Stat Card**: Real lifetime accumulated XP from `lib/xp.ts`.
  - **7-Day Calendar Strip**: Real active days for the current Monday–Sunday week with green illuminated dots.
  - **Keys Balance Row**: Live key balance with shortcut to `/(tabs)/keys`.
  - **League Tier Panel**: Dynamic Bronze (<250 XP), Silver (250–749 XP), or Gold (750+ XP) tier with progress bar towards the next league.
  - **Per-Skill Report Cards**: Each active skill shows its completion percentage, per-skill earned XP, topic tally, and a "Missed Questions" badge (e.g. `2 Missed`) linking to `app/mistakes.tsx`.

---

### `settings.tsx` — Settings Screen (New)

Accessed via the gear icon on `AppHeader` across all tabs:
- **Account Section**: Displays logged-in email or "Sign in / Restore account" linking to `RestoreAccountModal`. Once logged in, shows a red "Log out" button.
- **Preferences Section**:
  - Notifications toggle (backed by `@play/timer_reminders`).
  - Currency toggle switching between `KES` and `USD` (backed by `@play/currency`).
- **Support Section**: Help (mailto `support@pataskills.com`) and About version info.
- **Legal Section**: Links to Privacy Policy and Terms of Service.

---

### `mistakes.tsx` — Mistake Overview Screen (New)

Reached from the "Missed Questions" button on any skill card in the Reports tab (`/mistakes?skillId=<slug>&skillName=<title>`):
- Filter tabs: **All ({count})** vs **Unsolved ({count})**.
- Reads from `lib/mistakes.ts` (`getSkillMistakes(skillId)`).
- Renders a list of `MistakeCard` components (`components/reports/MistakeCard.tsx`) displaying question number, question prompt, `N MISTAKES` badge, highlighted correct answer banner, and a "Mastered" chip if resolved on a retry attempt.
- Empty state: "No mistakes recorded yet! Great job."

---

### `+html.tsx` — Web HTML Shell

Unchanged from the prior audit. Server-side-only; generates the static `<html>` wrapper at build/export time:
1. Viewport meta (`width=device-width`, `viewport-fit=cover`)
2. `ScrollViewStyleReset` (disables page-level bounce so RN ScrollViews behave)
3. Preloads all 5 Sora WOFF2 weights
4. Preloads the driving-theory cover illustration
5. `@font-face` declarations (WOFF2 primary, TTF fallback, `font-display: swap`)
6. Phone-width constraint on `#root` (`max-width: 430px`, `max-height: 932px`, dark backdrop) — phone frame on desktop, full-bleed on real phones.

---

### `admin/signs.tsx` — Admin Sign Browser

Unchanged. `/admin/signs` route; grid of every `play_signs` row with image, derived meaning, and question-reference count. Tapping a sign opens a swap modal that updates `image_path` directly in `play_signs` — propagates everywhere since images are resolved at session-download time. `deriveMeaningsByKey()` / `pickMeaning()` derive human labels from "What is this sign called?" questions by majority vote.

---

### The Monetization Routes (all new since the last audit)

These eight files form the keys/premium purchase funnel. All share the same visual shell (header with back arrow + title, `ScrollView` body, footer CTA) and read pricing from `lib/premium.ts` / `lib/currency.ts`.

#### `keys-packs.tsx` — Buy one-time keys
Shows the current balance (`getKeyBalance()`, displaying `∞` if premium) as a hero number, then lists `KEY_PACKS` (20/40/80/120, one marked `popular`) as tappable cards priced via `formatUSDAmount`. Tapping a pack pushes `/keys-confirm?pack=<id>`. A bottom link opens `/how-keys-work`.

#### `keys-confirm.tsx` — Confirm key purchase
Reads `?pack=`, shows total price + keys received, prompts for a receipt/restoration email (pre-filled from `@play/user_email` if set, validated via `sanitizeAndValidateEmail`), and on confirm calls `purchaseKeyPack(pack.id, email)` from `lib/billing.ts`, which opens the Paystack checkout.

#### `how-keys-work.tsx` — Explainer
Four static info rows (Unlock, Buy pack, Never expire, Unlimited skips keys) + a "GET UNLIMITED PASS" CTA to `/subscription-plans`. Purely informational, no state.

#### `subscription-plans.tsx` — Unlimited Pass plans
Lists `PLANS` (Weekly / Regular / Annual, Regular marked `popular`) via `planDisplay()`. Tapping a plan pushes `/subscription-confirm?plan=<id>`. Bottom link opens `/premium-benefits`.

#### `subscription-confirm.tsx` — Confirm subscription
Reads `?plan=`, shows price/term/savings note, the same email-capture pattern as `keys-confirm.tsx`, a static 3-item benefits list, and on confirm calls `purchasePlan(plan.packageId, email)`.

#### `premium-benefits.tsx` — Free vs Premium
A static 6-row comparison table (Check/X icons) ending in a "VIEW SUBSCRIPTION PLANS" CTA. No state, no data fetching.

#### `payment-complete.tsx` — Post-checkout landing
Reached via Paystack's redirect (`router.replace('/payment-complete', { type, count, reference, email })`). On mount: if `type === 'keys'` (or a bare `count` param with no type), calls `grantBonusKey(keysCount, 'key_pack_purchase', paystackRef)`; otherwise calls `setPremium(true)`. Shows a success screen with the reward preview and a "CONTINUE PLAYING" button that does `router.replace('/', { resume: 'true' })` — this is what re-enters `index.tsx`'s auto-start-on-resume branch.

**Note — grant-then-navigate is separated from Paystack's own callback:** the actual grant happens here, not inside `billing.ts`'s Paystack callback, so a page reload/close mid-checkout doesn't lose the redirect target; Paystack's callback only does `router.replace('/payment-complete', {...})`, and this screen is the one source of truth for actually crediting the account.

#### `how-free-mode-works.tsx` — Explainer
Four static info rows describing the free-trial keys system (3 sessions per reset, automatic refill timer, ad bonus sessions, reset alerts) + a "GOT IT, CONTINUE" button (`router.replace('/')`).

---

## 6. Components (`components/`)

### 6.1 Auth (new section)

#### `RestoreAccountModal.tsx`
A modal with three mutually-exclusive views, chosen by state:

1. **Account view** (`showAccountView`, shown when `currentEmail` is set and the user hasn't tapped "Use a different account") — shows the linked email, a LOG OUT button (`logoutAccount()` from `lib/restore.ts`), and a "Use a different account" link that flips to the sign-in form.
2. **Success view** (after a restore completes) — checkmark, the restored email in a badge, and either "Unlimited Pass Active" (crown) or "`{keys}` Keys Available" (key icon) depending on `restoreSuccess.isPremium`, with a "CONTINUE AS THIS ACCOUNT" button that fires `onSuccess(restoreSuccess)`.
3. **Sign-in form** (default) — a `GoogleWebButton` (real on web, a no-op stub on native), an "or with email" divider, an email `TextInput`, and a "RESTORE ACCOUNT" button that calls `restoreAccountByEmail()`.

All three flows funnel into `restoreAccountByEmail` / `restoreAccountWithGoogle` from `lib/restore.ts`.

#### `GoogleWebButton.tsx` / `GoogleWebButton.web.tsx`
Platform-split component. The default (`.tsx`, used on native) renders an empty `<View />` — **native Google sign-in is not implemented**. The `.web.tsx` variant loads Google Identity Services (`accounts.google.com/gsi/client`) at runtime and renders the real button, calling `onIdToken(idToken)` on success.

---

### 6.2 Cards

#### `CardDeck.tsx` — Router + Two Deck Implementations
Routes to `ReadingCardDeck` when `props.signs` is a non-empty array, else `QuizCardDeck`. Receives `skillId` and `topicIndex`. In `QuizCardDeck`:
- Top bar (close/progress/keys), card viewport, bottom controls, and overlay sheets.
- **Missed Questions Tracking**: In `handleCheck()`, whenever an answer check fails (`!isCorrect`), it calls `recordQuestionFailure(skillId, topicIndex, currentCard)` from `lib/mistakes.ts` to log the failure, prompt, choices, and right answer. If answered correctly on a subsequent retry, calls `recordQuestionSuccess(skillId, currentCard.id)` to mark it mastered.
- Shares scroll-hint logic via `useScrollHint()` and `ScrollHintChevron`.

#### `ScrollHintChevron.tsx`
Extracted, deck-agnostic presentational component: a small bouncing chevron pill shown when `visible`, tapping it calls `onPress` (wired to `useScrollHint()`'s `scrollToBottom`). Both `QuizCardDeck` and `ReadingCardDeck` render one instance each, driven by their own `useScrollHint()` hook instance.

#### `ReadingCard.tsx` / `TwoImageCard.tsx`
Unchanged from the prior audit — see that section's detail on layout types, gradient headers, and `RoadSignGraphic` SVG fallbacks.

---

### 6.3 Feedback

#### `KeysOptionsContent.tsx` (New)
Extracted, reusable presentation component containing the three proceed options:
1. **Buy Temporary Access Keys** (packs of 20, 40, 80, 120 keys) → `/keys-packs`
2. **Subscribe for Unlimited** → `/subscription-plans`
3. **Use Free Trial** with live ticking countdown and reminders `Toggle` (scheduled via `lib/notifications.ts` and saved to `@play/timer_reminders`).
Rendered both inside `SessionStateScreen`'s `outOfKeys` flow and as the standalone `app/(tabs)/keys.tsx` tab.

#### `SessionStateScreen.tsx` — Interstitial screen
The multi-purpose interstitial keyed by `SessionStateKind`:
- In the `outOfKeys` flow, renders the option cards and an exit interceptor leading to `WatchAdPromptSheet`.
- Gated login link: the "Existing user, login" link at the bottom is hidden once tabs are unlocked (`areTabsUnlocked()`), since login and restore are centrally managed in Settings.

#### `WatchAdPromptSheet.tsx`
Shown when the learner tries to exit while out of keys. Renders **one** native `<Modal>` whose content switches between two internal steps (`'prompt' | 'reward'`).

#### `KeyRewardSuccessModal.tsx`
Exports `KeyRewardContent` and `KeyRewardSuccessModal`.

#### `CheckButton.tsx` / `DownloadingScreen.tsx` / `FeedbackSheet.tsx` / `FlagIcon.tsx` / `LearnMoreSheet.tsx` / `QuitConfirmSheet.tsx`
Unchanged from the prior audit.

---

### 6.4 Landing & Home

#### `SkillProgressCard.tsx` (New)
Rendered on the Home tab (`app/(tabs)/home.tsx`) for every skill with local progress:
- Displays skill title, topic completion count (`N/Total topics`), and a progress bar with percentage.
- Dynamic CTA: `CONTINUE` for in-progress skills (resumes straight into session), `START` for not started, or `REVIEW` for 100% completed (routes to Reports tab).

#### `LandingScreen.tsx` — "Skills Corner" grid
A 2-column grid of `SkillGridCard`s below a "Skills Corner" heading, mapped directly from `LANDING_SKILLS`.
- Gated login link: the bottom "Existing user, login" link is hidden once tabs are unlocked, as account management moves to Settings.

#### `LearningStyleScreen.tsx` — full-page track list
Back-arrow header ("Choose Learning Style") + a scrollable list of detected learning styles rendered as `ModeCard` rows.

#### `TrackDetailScreen.tsx` — full-page single-track preview
Full-page single-track preview card + "Start Practice" CTA.

#### `ModeCard.tsx` — shared learning-mode row
Illustration + title, plus status, highlight, progress segments, and total question count.

#### `ModeSwitcherSheet.tsx` — mid-flow track switcher
Bottom sheet with `'switch'` and `'trackComplete'` heading states.

#### `SkillGridCard.tsx` / `CarouselDots.tsx` / `LandingIllustration.tsx`
Unchanged.

---

### 6.5 Nav

#### `FloatingTabBar.tsx` (New)
Pill-style bottom tab bar borrowed from PataSkillsV2, adapted for `play`'s tokens and `lucide-react-native`:
- Renders 4 tabs: `home` (`Home`), `skills` (`Library`), `keys` (`KeyRound`), `reports` (`PieChart`).
- Features a spring-animated sliding pill indicator that smoothly glides underneath whichever tab is selected using Reanimated `withSpring`.
- Completely theme-aware using `selectionActiveTint` and `selectionActiveBorder`.

#### `AppHeader.tsx` (New)
Header shown at the top of all four tabs once tabs are unlocked:
- Deterministic initial avatar circle (hash-mapped to a stable color palette).
- Learner display name (derived from linked email or defaulting to "Learner").
- Settings gear button navigating directly to `/settings`.

#### `ScreenTransition.tsx`
Web-only slide-in wrapper for standalone routes in `app/`. Pairs with `lib/navDirection.ts`.

---

### 6.6 Play

#### `SkillsFlow.tsx` (New)
Extracted, self-contained 4-stage Skills flow:
- Contains `LandingScreen` (grid) → `LearningStyleScreen` → `TrackDetailScreen` → `DownloadingScreen` → `PlaySession`.
- Rendered pre-unlock directly by `app/index.tsx` (no tabs), and post-unlock embedded under `app/(tabs)/skills.tsx` (with `embedded` prop to align top safe-area padding under `AppHeader`).

#### `PlaySession.tsx` — Session Flow Orchestrator
Core key-economy state machine:
- Passes `skillId` and `sessionIndex` down to `CardDeck`.
- **XP & Streak Award**: When a topic finishes (`handleSessionComplete`), calculates `earnedXp = stats.correctCount * XP_PER_CORRECT` (5 XP per correct answer) and invokes `recordXpEarned(skillId, earnedXp)` (`lib/xp.ts`) and `recordActivityToday()` (`lib/streak.ts`).
- Calls `markTopicCompleted(skillId, sessionIndex, sessions.length)` which triggers `unlockTabsIfNeeded()` on the first topic completed.
- Calls `markTrackCompleted(track)` when all sessions in a track are finished.

---

### 6.7 Reports (New)

#### `MistakeCard.tsx`
Rendered on `app/mistakes.tsx` to review failed questions:
- Displays question number and prompt.
- `N MISTAKES` badge pill with red accent tint.
- Correct answer banner with teal highlight.
- "Mastered" chip if the learner subsequently got the question right on retry.

---

### 6.8 Settings (New)

#### `SettingsComponents.tsx`
Three presentational components used by `app/settings.tsx`:
- **`SectionHeader`**: Uppercase category label (Account, Preferences, Support, Legal, Actions).
- **`SettingsRow`**: Icon + label + optional value text + chevron right, with optional `danger` styling.
- **`SettingsToggleRow`**: Icon + label + `Toggle` switch for preferences.

---
- Explicit-over-inferred is a deliberate choice, per an inline comment: the browser's `popstate` event doesn't fire reliably for `router.back()`, since expo-router doesn't guarantee it calls the real `history.back()` versus just updating navigation state.
- `peekNavDirection()` is a **read-only** peek (not read-and-clear) specifically to survive React Strict Mode's double-invoked render — a destructive read-and-clear would have the first invocation see the real direction and the second see it already cleared, silently collapsing every back-navigation to the forward animation. `resetNavDirection()` (called from `ScreenTransition`'s focus effect, which settles after Strict Mode's double-invoke) resets it to `'forward'` post-commit so an unrelated remount doesn't inherit a stale direction.

---

### 6.6 Play

#### `PlaySession.tsx` — Session Flow Orchestrator
Core key-economy state machine is unchanged in shape from the prior audit (playing → topicComplete → advanceToNextSession → sessionUnlocked/outOfKeys → keysReset → sessionUnlocked), still branches its render on `currentSession.kind` for quiz vs. reading. What's new since the last audit:

- **`markTrackCompleted(track)`** is now called the moment `!hasMoreSessions` is detected (before opening `ModeSwitcherSheet` with the `trackComplete` heading) — the persistence hook that makes `ModeSwitcherSheet`'s "N/6 tracks complete" real (see §6.4 above).
- **`deepLinked` prop** now genuinely varies per-track-detail-origin (see `index.tsx`'s `TrackDetailOrigin` tracking) rather than being a single flag for the whole app session.

---

### 6.7 UI

#### `Button.tsx` (previously undocumented)
Single shared CTA pill button for the whole app — `variant: 'solid' | 'gradient' | 'outline'`, uppercase by default, `loading`/`disabled` states (spinner replaces label). An inline comment is explicit about why this exists: it's what let "Start Practice" drift out of sync with every other button's casing/color before this was extracted, so every full-width button in the app should render through this rather than a one-off `Pressable`+`Text`/`LinearGradient` combo. Used throughout `TrackDetailScreen` and the monetization routes (`subscription-confirm.tsx`, `premium-benefits.tsx`, etc.).

#### `ConnectionError.tsx` (previously undocumented)
Full-screen "App can't connect" state — icon ring (`WifiOff`), title, subtitle, and a RELOAD button that calls the caller-supplied `onReload`. Meant to be rendered inside any screen wherever a required network request fails (fetching packs, confirming a purchase, checking key balance).

#### `Toggle.tsx`
A small animated switch — 44×26 track, 20px thumb, slides on `withTiming`. Used exactly once currently: the "Get reminders when timer resets" toggle inside `SessionStateScreen`'s Out-of-Keys free-trial card.

---

## 7. Constants (`constants/`)

### `index.ts`
Barrel export — unchanged in role, now also re-exporting `trackOptions.ts` and `skills.ts` alongside the previously-documented modules.

### `colors.ts` / `gradients.ts` / `typography.ts` / `spacing.ts` / `icons.ts` / `curriculumAssets.ts`
Unchanged from the prior audit (see that revision for the full token tables) — `StaticColors.tealAccent` fix, `BrandGradients.discovery`, the Sora `FontFamily`/`Typography` system, `Spacing`/`Radius` scales, and `CurriculumCoverImagePaths` are all still current.

### `skills.ts` (updated)
```typescript
export type SimpleTrack = 'reading' | 'full';

export interface LandingSkill {
  id: CurriculumSlug;
  title: string;
  subtitle: string;
  tracks: SimpleTrack[];
  trackLabels?: Partial<Record<Track, string>>;
  trackImages?: Partial<Record<Track, ImageSourcePropType>>;
}

export const LANDING_SKILLS: LandingSkill[] = [
  {
    id: 'driving-theory',
    title: 'Practice over 1000\nhighway code\nquestions',
    subtitle: 'Driving theory',
    tracks: ['reading', 'full'],
  },
  {
    id: 'true-false',
    title: 'Test yourself with\n150 true or false\nquestions',
    subtitle: 'True/False',
    tracks: ['reading', 'full'],
  },
  {
    id: 'bible-trivia',
    title: 'Test yourself with\n237 Bible trivia\nquestions',
    subtitle: 'Bible Trivia',
    tracks: ['reading', 'full'],
  },
];
```
Defines each skill card shown on the homepage grid. `tracks` provides the synchronous fallback list before runtime detection resolves; `trackLabels` and `trackImages` allow individual curricula to override default track copy and illustration assets without modifying component logic. **`bible-trivia` (new, 2026-09-06)** — converted from a nested `levels/chapters/topics` source export via `json-conversion.md`'s "Bible Trivia" section; 237 of 395 source questions kept (`single`-type only — `multi` and the new `matching` type excluded, same single-answer-engine reasoning as `true-false`'s own conversion). No custom `tracks` declared in its JSON, same as `true-false` — it relies entirely on the compulsory `full`/`reading` synthesis in `detectAvailableTracks()` (§9).

### `trackOptions.ts` (updated)
Single source of truth for the learning-mode list and illustrations shown across `LearningStyleScreen`, `ModeSwitcherSheet`, and `TrackDetailScreen`:
```typescript
export interface TrackOption {
  track: Track;
  label: string;
  image: ImageSourcePropType;
}

export function getTrackOptionsForSkill(
  skill: LandingSkill,
  tracks: Track[],
  customTrackDefs?: CurriculumTrackDefinition[]
): TrackOption[];

export function getTrackOption(
  skill: LandingSkill,
  track: Track,
  customTrackDefs?: CurriculumTrackDefinition[]
): TrackOption;
```
- **Title resolution priority** (mirrors `trackImage()`'s DB-then-local chain below, added
  2026-09-06 (h)):
  1. `skill.trackLabels?.[track]` (hardcoded app override)
  2. `customTrackDef?.title` (dynamic JSON-defined custom track title)
  3. `getCachedTrackDefaultLabel(track)` — `play_track_defaults.label` (§14), e.g. `full` →
     `"Learn Full Skill"`. Real source of truth for any label shared across every skill; a DB
     edit changes it everywhere with no redeploy.
  4. `DEFAULT_TRACK_LABELS[track]` (hardcoded last-resort — only fires for the instant before
     step 3's fetch resolves, or if a track has no DB row at all)
  5. Formatted fallback string
- **Default visuals**: `LOCAL_IMAGES` is intentionally **empty** — the only local track webps that exist (`assets/driving/*.webp`) are driving-theory's own art, not universal, and now live as a per-curriculum override on driving-theory's own JSON instead (see §14). `trackImage()`'s resolution order is: (1) `customTrackDef.image` (curriculum-JSON per-track override, e.g. driving-theory's), (2) `skill.trackImages?.[track]` (code-level per-skill override), (3) `play_track_defaults` DB row for that track id (`lib/trackDefaults.ts`, `getCachedTrackDefaultUrl()`) — currently empty, reserved for genuinely shared/universal art, (4) `LOCAL_IMAGES[track]` — currently empty, instant-render backup only, (5) the skill's own cover image, itself DB-first: `lib/curriculaCatalog.ts`'s cached `play_curricula.cover_image_path` if warm, else the local `CurriculumCoverImagePaths` constant as a pre-fetch backup. `full` has no dedicated icon by design and always resolves via step (5).
- **Dynamic builder**: `getTrackOptionsForSkill(skill, tracks, customTrackDefs)` maps whichever tracks the caller provides, decorating them with titles and icons from custom definitions or defaults.
- **Fast lookup**: `getTrackOption(skill, track, customTrackDefs)` provides synchronous-like lookup with fallback defaults.

---

## 8. Theme (`theme/`)

Unchanged from the prior audit — `ThemeContext.tsx` (dark/light/auto, AsyncStorage-persisted, `useTheme()` hook) and `tokens.ts` (convenience re-export barrel).

---

## 9. Library / Data Layer (`lib/`)

### `supabase.ts` / `downloadSession.ts` / `signs.ts`
Unchanged from the prior audit — the Learning Tracks / Reading Mode work (`hydrateSignCatalog`, track-aware `downloadSession`) documented there is still current. `downloadSession` extracts optional `remote.tracks` and forwards them to `deriveTrack(hydrated, signCatalog, track, remote.tracks)`.

### `curriculaCatalog.ts` (updated 2026-09-07) — DB-driven skill catalog
Module-level cache (shared in-flight promise, same shape as `trackDefaults.ts`) over `play_curricula`. `getCurriculaCatalog()` fetches `{ slug, title, cover_image_path }` for every active row, once per app session. `getCachedCurricula()` is a synchronous read of whatever's resolved so far (`[]` before the first fetch lands). `getCachedCoverImagePath(slug)` is what `constants/trackOptions.ts`'s `trackImage()` calls for its final fallback (see §7) — every skill's existence, display name, and cover image now genuinely lives in this table, not in a local constants file; adding or renaming a skill is a DB edit only. `LandingScreen` kicks off the fetch first in the normal user flow, but any screen that might render before it (a `?track=` deep link landing straight on `TrackDetailScreen`) also calls `getCurriculaCatalog()` itself — the shared in-flight promise means this is still only one network round trip. **Fixed 2026-09-07**: Query fetch rewritten with an `async` IIFE to return a true `Promise<CurriculumCatalogRow[]>` resolving the prior `PromiseLike` typecheck error.

### `trackDefaults.ts` (updated 2026-09-06 (h)) — DB-driven universal track icons AND labels
Same shared-promise cache pattern as `curriculaCatalog.ts`, over `play_track_defaults` (see §14), now selecting `{ track_id, image_path, label }` instead of image-only. The cache shape changed from a flat `Record<string, string>` to `{ images: Record<string, string>, labels: Record<string, string> }`, with two synchronous readers: `getCachedTrackDefaultUrl(trackId)` (unchanged signature, still what `trackImage()` calls) and the new `getCachedTrackDefaultLabel(trackId)` (what `trackLabel()` now calls — see §7). A row with no `image_path` simply doesn't populate `images` for that track id; same for a row with no `label`. The fetch is still kicked off at module-import time so it's usually warm before first render.

**Fixed a pre-existing `tsc` error in the same pass**: the fetch used to assign a raw `supabase.from(...).select(...).then(...)` chain directly to the `Promise<T>`-typed `inflight` variable, which doesn't type-check — `supabase-js`'s query builder is only a `PromiseLike`, not a real `Promise` (missing `.catch`/`.finally`/`Symbol.toStringTag`). Rewritten as an `async` IIFE (`inflight = (async () => { ... })()`) so the assignment is a genuine `Promise<TrackDefaultsCache>`. The exact same bug pattern still exists in `lib/curriculaCatalog.ts` (untouched this pass — out of scope, that file belongs to separate uncommitted WIP) and shows up as the only remaining `tsc --noEmit` error after this change.

**No longer permanently empty**: `image_path` and `label` are independently nullable, so a row can carry either alone. As of this pass there's exactly one seeded row — `full` → `label: 'Learn Full Skill'`, no `image_path` — see §14 for the seed SQL and the reasoning for why images stay unseeded while labels don't.

### `curriculum.ts` — Dynamic Track Detection, Cached Fetching, and Session Derivation
Core curriculum orchestration layer:
- **JSON-Defined Custom Tracks**: `RemoteCurriculum` parses an optional `tracks?: CurriculumTrackDefinition[]` header. When present, tracks and their filtering logic are driven entirely by the curriculum JSON.
- **Dynamic Track Availability**: `detectAvailableTracks(questions, signs, customTrackDefs?): Track[]`:
  - If `customTrackDefs` is defined, each custom definition is checked against questions (`filterRole`, `filterFormat`) or signs (`kind === 'reading'`).
  - If omitted, falls back to legacy auto-detection: `full` is universal, `reading` is included if signs exist (`signs.length > 0`), and each role track is included only if questions contain that role.
- **Deduplicated Cache**: `loadCurriculumCached(slug)` stores in-flight and resolved promises in `curriculumCache`. When screens request `getTrackTotals(slug)`, `getAvailableTracks(slug)`, and `getCurriculumTrackDefs(slug)` on mount, they share a single network round-trip.
- **`getCurriculumTrackDefs(slug)`**: Returns custom track definitions from the curriculum JSON (or undefined if legacy).
- **`getAvailableTracks(slug)`**: Asynchronous per-skill track detection, backed by `loadCurriculumCached`.
- **`getTrackTotals(slug)`**: Computes `totalQuestions` and `totalSessions` per track (for both custom and standard tracks), cached in `trackTotalsCache`.
- **`deriveTrack(questions, signs, track, customTrackDefs?)`**: Builds hydrated `PlaySession[]` for gameplay:
  - If a matching `CurriculumTrackDefinition` exists, filters questions by `filterRole` or `filterFormat`, or chunks signs if `kind === 'reading'`.
  - Otherwise dispatches via standard logic (`full` via `deriveFullSessions()`, `reading` via sign chunking, or legacy role matching `q.role === TRACK_ROLE[track]`).

### `navDirection.ts` (previously undocumented — see §6.5 for the full writeup, paired with `components/nav/ScreenTransition.tsx`)

### `keys.ts` — Keys Economy (rebuilt since the prior audit)

The keys system was substantially reworked — the flat "4 keys / 4-minute reset" model documented previously no longer exists.

**`INITIAL_KEYS = 3`** (was 4).

**Escalating reset cooldown** — `RESET_DURATIONS_MS = [5 min, 2 hrs, 8 hrs]`; `resetDurationFor(resetCount)` picks the tier by how many times the free-trial reset has actually completed for this device (capped at the last tier), so repeat depletion gets progressively slower rather than always refilling in a flat window.

**`KeysState`** (changed):
```typescript
{
  balance: number;
  initialized: boolean;
  isPremium?: boolean;      // NEW — premium subscribers bypass the whole system
  resetAt: number | null;
  resetCount?: number;      // NEW — drives the escalating tier
}
```

**Cloud sync on every write** — `write(state)` best-effort upserts to `play_accounts` (keyed by the locally-stored `@play/user_email`, if any) after every local AsyncStorage write, so the balance survives logout/login and reinstalls once a device has ever linked an email. Failure here never blocks gameplay (the local write already succeeded).

**New functions:**
| Function | Purpose |
|----------|---------|
| `grantBonusKey(count, reason?, ref?)` | Adds `count` keys and clears any pending `resetAt` — used by both the rewarded-ad flow and post-purchase key-pack grants |
| `setPremium(isPremium)` | Flips the premium flag — used by `payment-complete.tsx` after a subscription purchase |

**`getKeyBalance()`** now returns `999999` for premium accounts (used as the practical "unlimited" display value, e.g. `keys-packs.tsx` renders it as `∞`).

`applyReset()` and `startResetTimer()` follow the same "timer is the sole source of truth" pattern as before, just parameterized on the new escalating duration and never firing for premium accounts.

### `premium.ts` (new)
Defines the two purchasable catalogs:
- **`PLANS`** — Weekly ($4), Regular ($12/mo, `popular`), Annual ($129.60, i.e. $10.80/mo effective). `planDisplay(plan, currency)` formats price/term/savings-note text per plan shape.
- **`KEY_PACKS`** — 20 ($2), 40 ($4, `popular`), 80 ($8), 120 ($12). `keyPackById(id)` looks one up (defaults to the 40-pack).

### `currency.ts` (new)
`KES_PER_USD = 129` fixed rate. `usdToKES()`, `formatUSDAmount(amount, currency)`, `formatPrice(amountKES, currency)`, and `splitCurrencyAmount(priceString)` (splits a formatted string like `"$4.00"` into `{ currency: '$', amount: '4.00' }` for layouts that style the symbol separately from the number).

### `billing.ts` (new) — Paystack checkout
**`billingAvailable()`** always returns `true` (no platform gating — Paystack is web-only by nature but this app is Expo-web-capable everywhere).

**`loadPaystackScript()`** injects `https://js.paystack.co/v1/inline.js` once (memoized promise), no-ops on non-web (`typeof window === 'undefined'`).

**`openCheckout(amountKES, email, label, kind, productId, keysCount?, expiresAt?)`** — builds a unique reference (`pataplay_{timestamp}_{random}`), opens `PaystackPop.setup({...}).openIframe()`, resolves the reference on `callback` or `null` on `onClose`. Falls back to returning the reference directly (skipping the actual iframe) when `PaystackPop` isn't available — e.g. mid-script-load or non-web.

**`purchasePlan(packageId, email)`** / **`purchaseKeyPack(packId, email)`** — both: persist the email locally first, compute the KES amount, open checkout, best-effort upsert a `play_purchases` row keyed by the Paystack reference, then `router.replace('/payment-complete', {...})` with the purchase details as params. Return `'purchased' | 'cancelled' | 'unavailable' | 'error'`.

### `restore.ts` (new) — Account restore/link
**`restoreAccountByEmail(rawEmail)`** — the core restore flow:
1. Validates the email (`sanitizeAndValidateEmail`).
2. If a `play_accounts` row already exists for that email, it is the **sole source of truth** from then on — overwrites local state unconditionally (`applyRestoredState`), never merges with whatever balance happens to be sitting on the device. An inline comment is explicit that merging here is exactly the bug this design avoids (a re-login could otherwise re-grant already-spent keys).
3. Otherwise (first time this email has ever been seen), seeds the account from historical `play_purchases` rows (summing `keys`, OR-ing `is_premium`), defaulting to `INITIAL_KEYS` if none exist, and immediately persists that seed to `play_accounts` so this branch can never fire again for the email.
4. Calls `syncProgressWithCloud(email)` (from `lib/progress.ts`) in both branches.

**`restoreAccountWithGoogle(idToken)`** — `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`, then delegates to `restoreAccountByEmail` with the resulting email.

**`logoutAccount()`** — signs out of Supabase auth and clears the locally-stored email, deliberately leaving local keys/progress caches alone (they're already synced to the cloud record; clearing them would just reset the device to defaults until the next sync).

### `email.ts` (new)
`sanitizeAndValidateEmail(raw)` — trims, lowercases, strips zero-width characters, RFC-shaped regex check, username-length and TLD checks, returns `{ valid, email, error? }`. `truncateEmailMiddle(email, prefixLength = 6)` — shortens for display (`tonymk...@gmail.com`), leaves short emails untouched.

### `ads.ts` (new) — Rewarded bonus sessions
`showRewardedForSession()`:
- **Android with the native module present** — loads and shows a real `RewardedAd` via `react-native-google-mobile-ads` (test unit ID outside production, or `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` in production), resolves `'earned'` only if the `EARNED_REWARD` event actually fired before close, `'skipped'` otherwise, `'unavailable'` on any load error.
- **Everywhere else (web, dev, or native module absent)** — resolves `'earned'` after a simulated 1.5s delay.

`adsAvailable()` — `Platform.OS === 'android' && nativeModule() != null` (the module is loaded via a try/catch'd `require()`, so its absence is silent). `configureAds()` — best-effort one-time `initialize()` call.

### `notifications.ts` (new) — Web reset reminders
Uses the browser's native `Notification` API directly (`ensureNotificationPermission()` calls `Notification.requestPermission()`; `scheduleResetReminder(resetAt)` sets a `setTimeout` for the exact refill moment and fires a notification with a click-to-focus handler; `cancelResetReminder()` clears it). Entirely web-scoped — native builds have no equivalent (no `expo-notifications` dependency), so the reminders toggle is effectively a no-op on native today.

### `progress.ts` — Topic progress, tab unlock gate, and track completion (expanded)

- **Topic progress**: `getLocalProgress(skillId)` / `markTopicCompleted(skillId, topicIndex, totalTopics)` / `syncProgressWithCloud(email, skillId)`. Progress is stored per-skill in `@play/progress:${skillId}`.
- **Tabbed Home Unlock Gate (new 2026-09-07)**:
  - `areTabsUnlocked(): Promise<boolean>`: Reads `@play/tabs_unlocked`.
  - `unlockTabsIfNeeded(): Promise<void>`: Fired inside `markTopicCompleted()` the moment a learner hits `topicComplete` for topic 0 on any skill. Sets `@play/tabs_unlocked = 'true'` permanently.
  - `lockTabs(): Promise<void>`: Debug utility to reset the gate.
- **Per-track completion**:
  - `getCompletedTracks(skillId)` reads `@play/completed_tracks:${skillId}`.
  - `markTrackCompleted(skillId, track)` records track completion.

### `mistakes.ts` (new 2026-09-07) — Missed Questions Tracking
Tracks every question the learner fails during card deck quiz sessions:
- **`QuestionAttempt`**: `{ skillId, topicIndex, questionId, questionText, options, correctAnswerText, failCount, attemptCount, solved, lastMissedAt }`.
- **`recordQuestionFailure(skillId, topicIndex, question)`**: Increments `failCount` and `attemptCount`, sets `solved: false`, and updates `@play/mistakes:${skillId}`. Best-effort mirrors to Supabase `play_question_attempts` when user email is linked.
- **`recordQuestionSuccess(skillId, questionId)`**: When a previously-missed question is answered correctly on retry, sets `solved: true`.
- **`getSkillMistakes(skillId)`**: Returns formatted `MistakeItem[]` sorted by mistake count.
- **`getSkillMistakesCount(skillId)`**: Returns count of unique missed questions for the skill.

### `xp.ts` (new 2026-09-07) — Experience Points Tracking
- **`recordXpEarned(skillId, amount)`**: Adds `amount` (5 XP per correct answer) to both the skill bucket (`@play/xp:${skillId}`) and lifetime total (`@play/total_xp`). Best-effort syncs to Supabase `play_user_stats`.
- **`getSkillXp(skillId)`**: Reads per-skill earned XP.
- **`getTotalXp()`**: Reads lifetime accumulated XP.

### `streak.ts` (new 2026-09-07) — Practice Streaks & Weekly Calendar
- **`recordActivityToday()`**: Logs today's date (`YYYY-MM-DD`) into `@play/activity_dates`.
- **`getStreakData()`**: Returns `{ currentStreak, maxStreak, todayActive, weekDays }`. `weekDays` is an array of 7 booleans (Monday through Sunday) indicating active practice days in the current week.

---

## 10. Hooks (`hooks/`)

### `useKeys.ts` — expanded for premium
Wraps `lib/keys.ts`. Return shape now includes `isPremium: boolean` (mirrors `KeysState.isPremium`) and `balance` reports `999999` for premium accounts rather than the raw stored value. `isOutOfKeys` is `!isPremium && balance !== null && balance <= 0` — premium accounts can never be "out of keys". The 1-second poll-while-depleted behavior is unchanged, just now also skipped entirely while `isPremium`.

### `useScrollHint.ts` (new)
Extracted single-card scroll-hint logic, shared by both `QuizCardDeck` and `ReadingCardDeck` (one hook instance per visible card slot) rather than each deck reimplementing its own bounce animation:
- Tracks content height vs. viewport height via `onLayout`/`onContentSizeChange`, shows the hint when content exceeds viewport by >4px.
- Hides on scroll past a 12px threshold, or on tap (`scrollToBottom()`).
- `resetForNewCard()` clears tracked measurements — needed when a hook instance is reused for a new card (e.g. `ReadingCardDeck` swapping `currentSign`) so a stale measurement from the previous card can't flash the wrong hint state before the new card's `onLayout` fires.
- Returns `{ scrollRef, scrollViewProps, showHint, hintAnimatedStyle, scrollToBottom, resetForNewCard }` — `scrollViewProps` spreads directly onto the card's `ScrollView`.

---

## 11. Types (`types/`)

### `quiz.ts`
Core data types:
- **`CurriculumTrackDefinition`**: Dynamic track schema declared in curriculum JSON files:
  ```typescript
  export interface CurriculumTrackDefinition {
    id: string;                          // Track ID (e.g., 'differentiation', 'identification')
    title: string;                       // Display label in learning style list & track detail
    filterRole?: string | string[];      // Filters questions by q.role — an array lets one track absorb several role values (e.g. driving-theory's 'identification' track covers name+meaning+whereUsed in a single JSON-declared track, no code change)
    filterFormat?: string | string[];    // Filters questions by format — same array support
    kind?: 'quiz' | 'reading' | 'full';  // 'quiz' (default, role/format-filtered), 'reading' (chunked signs catalog), or 'full' (all questions, standard session grouping)
    image?: string;                      // Optional custom asset identifier
  }
  ```
  Matching (`roleMatches()` in `lib/curriculum.ts`) checks array membership when `filterRole`/`filterFormat` is an array, or strict equality when it's a single string — so existing single-string track definitions keep working unchanged.
- **`Track`**: `StandardTrack | (string & {})` — union of canonical standard tracks (`'pairs' | 'names' | 'meanings' | 'whereUsed' | 'full' | 'reading'`) and arbitrary custom track strings.
- **`BaseQuestion.role`**: Widened from strict 4-value union to `string` allowing custom roles (e.g., `"explainer"`, `"pair"`, `"name"`).
- `QuizQuestion` union, `OptionChoice`, and `SignCatalogEntry` interface are all still current.

---

## 12. Utilities (`utils/`)

### `groupSessions.ts` / `hydrateQuestions.ts` / `shuffleAnswers.ts`
Unchanged from the prior audit — the `QuizPlaySession`/`ReadingPlaySession` discriminated union, `chunkIntoSessions`/`chunkSignsIntoSessions`, `hydrateSignCatalog`, and Fisher-Yates answer shuffling are all still current. See that revision for full detail.

---

## 13. Scripts (`scripts/`)

One-off Node.js (`.mjs`) data-pipeline / DB-setup scripts, run from `play/`. Beyond the scripts already documented in the prior audit (`derive-signs-from-bucket.mjs`, `derive-signs.mjs`, `fix-image-cache-headers.mjs`, `link-signs-to-questions.mjs`, `build-signs-catalog.mjs`), the directory has grown considerably and now also contains (file inventory only — not individually re-audited line-by-line this pass, since none of them touch the app code documented above):

`add-role.mjs`, `apply-sign-corrections.mjs`, `dl-by-image-path.mjs`, `fix-bump-image-path.mjs`, `list-low-confidence-images.mjs`, `list-orphaned-signs.mjs`, `populate-pairs.mjs`, `rename-orphaned-signs.mjs`, `rename-used-signs-descriptive.mjs`, `upload-corrected-curriculum.mjs`, `_check_bump.mjs`, `_dl_preview3.ps1`, plus a `.gitignore` scoped to this folder.

**`upload-bible-trivia.mjs` (new, 2026-09-06)** — one-off uploader for the Bible Trivia conversion: uploads `scripts/_bible-trivia-payload.json` to `play-assets/curricula/bible-trivia.json` (`upsert: true`) and lists `play-assets/curricula/` afterward so a run confirms both the JSON and the (separately, manually uploaded) `bible-trivia.webp` cover landed. Does not touch `play_curricula` — same anon-key RLS restriction as `upload-corrected-curriculum.mjs`, so the insert SQL is handed to the user to run manually instead. `_bible-trivia-payload.json` itself (237 questions, `signs: []`) is the converted output — see `json-conversion.md`'s "Bible Trivia" section for the source schema and conversion rules.

`output/` now also contains `pairs-to-insert.json`, `questions.corrected.json`, `sign-corrections.json`, and two preview subfolders (`preview/`, `preview2/`) alongside the previously-documented artifacts.

---

## 14. Supabase (`supabase/`)

### `play_sign_pairs.sql`
Unchanged from the prior audit — `play_sign_pairs` table + 23 seeded pairs (groups A–E) for the DB-level image-resolution layer used by `lib/signs.ts`. See that revision for the full seed breakdown and the note distinguishing this from the curriculum JSON's own 46-pair/92-entry signs catalog.

### `play_track_defaults.sql` (updated 2026-09-06 (h)) — universal per-track fallback icons AND labels
Defines `play_track_defaults (track_id TEXT PRIMARY KEY, image_path TEXT, label TEXT, updated_at TIMESTAMPTZ)`, anon-select-only RLS, read by `lib/trackDefaults.ts` (see §9). **Both `image_path` and `label` are nullable** — a row can carry either alone, so a label-only default (no universal art to go with it) doesn't force a fake image row. The file is idempotent against a DB that already ran an earlier version: `alter table ... add column if not exists label`, `alter table ... alter column image_path drop not null`.

**Images stay unseeded, for the same reason as before**: it went through a wrong-then-corrected-then-emptied sequence worth recording: first seeded with `differentiation`/`identification`/`reading` (a stale pre-consolidation naming that no curriculum ever actually emits), corrected to the real track ids (`pairs`/`names`/`meanings`/`whereUsed`/`reading`), then emptied entirely once it became clear the only art available (`assets/driving/*.webp`) was driving-theory's own, not universal — seeding it would leak that art onto every other skill's matching track id (e.g. true-false's `reading` track would render driving's reading icon). The file's own `delete from ... where track_id in (...)` statement still cleans up either prior image seed if re-run against an already-migrated DB.

**Labels have no such restriction, and are now seeded**: unlike per-skill art, a label like `full` → `"Learn Full Skill"` means the same thing for every skill by construction — there's no equivalent "leaking driving-theory's label onto true-false" risk, since the id itself (`full`, `reading`) already only exists as a universal concept. One seeded row as of this pass:
```sql
insert into play_track_defaults (track_id, label) values
  ('full', 'Learn Full Skill')
on conflict (track_id) do update set label = excluded.label, updated_at = now();
```
This replaces `constants/trackOptions.ts`'s old hardcoded `DEFAULT_TRACK_LABELS.full` string as the real source of truth (see §7/§9) — changing it going forward is `update play_track_defaults set label = '...' where track_id = 'full';`, no code change or redeploy.

Uploaded via `scripts/upload-track-icons.mjs` to `play-assets/track-icons/` regardless of whether the DB table references them — driving-theory's own curriculum JSON references the uploaded files directly (see §18's storage bucket listing).

### `play_accounts.sql` (new)
Defines the `play_accounts` table — the durable, email-keyed source of truth for the keys/premium economy once a device has ever linked an email:
```sql
play_accounts (
  email        TEXT PRIMARY KEY,
  balance      INTEGER,
  is_premium   BOOLEAN,
  reset_at     TIMESTAMPTZ,
  reset_count  INTEGER,
  updated_at   TIMESTAMPTZ
)
```
Written to by `lib/keys.ts`'s `write()` (every local keys-state change) and read/seeded by `lib/restore.ts`.

### `play_accounts_reset_count.sql` (new)
A follow-on migration adding the `reset_count` column to `play_accounts` (the escalating-cooldown tier tracker) — implies `play_accounts` shipped once without it and was altered in place.

### `play_purchases.sql` (new)
Defines `play_purchases` — one row per completed Paystack transaction (`email`, `paystack_ref`, `keys`, `is_premium`, `updated_at`), upserted by `lib/billing.ts` on purchase and summed by `lib/restore.ts` when seeding a brand-new `play_accounts` row from purchase history.

### `fix_play_signs_rls.sql` / `reset_signs_fresh.sql` (new)
Standalone fix/reset scripts for `play_signs` row-level-security policy and data — one-off maintenance SQL, not part of the app's runtime schema definition.

---

## 15. Assets (`assets/`)

Unchanged categories from the prior audit (`fonts/`, `images/`, `homepage/`) plus:

### `premium/`
| File | Purpose |
|------|---------|
| `key.webp` | Key icon — keys economy UI throughout (balance heroes, reward screens, pack cards) |
| `unlock.webp` | Unlock illustration for the session-unlocked screen |
| `crown.webp` | Crown icon — Unlimited Pass / premium UI throughout |

### `driving/` (new)
Source files for driving-theory's own track illustrations: `differenciate.webp`, `name.webp`, `meaning.webp`, `usage.webp`, `reading.webp`. **Not referenced directly by app code** (`constants/trackOptions.ts`'s `LOCAL_IMAGES` is empty — see §7) — these are the originals `scripts/upload-track-icons.mjs` uploads to `play-assets/track-icons/`, which driving-theory's own curriculum JSON then links to via `tracks[].image` (see §14, §18). Kept here as the source-of-truth files for re-uploading, not as a runtime `require()` target. `full` reuses the remote curriculum cover image instead of a dedicated icon, by design.

---

## 16. Docs (`docs/`)

### `learning-tracks-and-reading-mode.md`
Unchanged from the prior audit — the original feature spec for Learning Tracks + Reading Mode, all 8 implementation steps complete as previously recorded. **No equivalent written spec exists yet for the monetization stack** (keys rework, premium/billing, ads, restore) documented in this update — that work was reconstructed entirely from source, same method noted at the top of this file.

---

## 17. Miscellaneous Files

### `pataskills-swipe-demo.html` / `Inspos/` / `AGENTS.md` / `LICENSE`
Unchanged from the prior audit.

### `dist/` (new, not previously listed)
Static web export output (`expo export -p web`) — a build artifact directory, not source. Not documented further here since its contents are fully derived from `app/`, `components/`, etc.

### `.claude/` (new, not previously listed)
Claude Code project-level settings for this repo.

---

## 18. Data Flow & Architecture

### Database Schema (Supabase) — expanded

```
┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│  play_curricula  │  │  play_signs   │  │ play_sign_pairs │  │    play_accounts      │  │  play_purchases   │
├─────────────────┤  ├──────────────┤  ├─────────────────┤  ├──────────────────────┤  ├──────────────────┤
│ slug            │  │ id (uuid)    │  │ pair_id (PK)    │  │ email (PK)            │  │ paystack_ref (PK) │
│ title           │  │ key          │  │ key_a → signs   │  │ balance               │  │ email             │
│ cover_image_path│  │ name         │  │ key_b → signs   │  │ is_premium            │  │ keys              │
│ json_path       │  │ image_path   │  └─────────────────┘  │ reset_at              │  │ is_premium        │
│ is_active       │  │ created_at   │                       │ reset_count           │  │ updated_at        │
└─────────────────┘  └──────────────┘                       │ updated_at            │  └──────────────────┘
                                                              └──────────────────────┘
                                          (play_progress table also exists — per-email
                                           completed_topics/total_topics, synced by lib/progress.ts)

Storage Bucket: play-assets/
├── curricula/questions.sample.json  (driving-theory, json_path in play_curricula)
│     { tracks: [pairs (filterRole: "pair", image: .../track-icons/pairs.webp), names
│       (filterRole: "name", image: .../track-icons/names.webp), meanings (filterRole:
│       "meaning", image: .../track-icons/meanings.webp), whereUsed (filterRole: "whereUsed",
│       image: .../track-icons/whereUsed.webp), reading (kind: "reading", image:
│       .../track-icons/reading.webp), full (kind: "full", no image — reuses cover_image_path)],
│       questions: [...322, role-tagged], signs: [...92 SignCatalogEntry] }
├── curricula/true-false.json  (true-false, json_path in play_curricula)
│     { tracks: [full (kind: "full"), reading (kind: "reading")], questions: [...150,
│       true/false, no role], signs: [] }
├── curricula/bible-trivia.json  (new, 2026-09-06 — bible-trivia, json_path in play_curricula
│     once the handed-off insert SQL is run)
│     { questions: [...237, textChoice, no role, no tracks header — relies on compulsory
│       full/reading synthesis], signs: [] }
├── curricula/bible-trivia.webp  (new, 2026-09-06 — cover image, uploaded directly by the user,
│     not via a script)
├── track-icons/  (new) pairs.webp, names.webp, meanings.webp, whereUsed.webp, reading.webp
│     — driving-theory's own per-track art (assets/driving/*.webp source files, uploaded by
│     scripts/upload-track-icons.mjs). Referenced directly from driving-theory's JSON above,
│     NOT from play_track_defaults (that table's image_path column is intentionally still
│     empty for every row, even though it now has a labels-only 'full' row — see §14) — these
│     files existing in storage doesn't by itself make them "universal", only driving-theory's
│     JSON linking to them does.
└── signs/      give_way.webp, stop.webp, ... (60+ sign images)
```

`play_accounts` is the durable cross-device source of truth for keys/premium once an email is linked; `play_purchases` is an append-only transaction log used only to seed a brand-new `play_accounts` row the first time an email is ever restored.

### Landing → Session Flow (rebuilt)

```
LandingScreen (Skills Corner grid)
        │ tap a skill card                              ?track= deep link
        ▼                                                          │
LearningStyleScreen (full-page track list)                         │
        │ tap a track                                              │
        ▼                                                          ▼
              TrackDetailScreen (preview + Start Practice) ◄────────┘
                        │ Start Practice
                        ▼
              downloadSession(track)  ── min. 2000ms loading beat
                        │
                        ▼
                  PlaySession
                        │ topic exhausted in current track
                        ▼
              ModeSwitcherSheet ('trackComplete') ── markTrackCompleted(track)
                        │ pick a different track           OR out of keys
                        ▼                                          ▼
              downloadSession(newTrack)                 SessionStateScreen (outOfKeys, scrollable)
                                                                    │
                                        ┌───────────────┬───────────┴──────────┬───────────────┐
                                        ▼               ▼                      ▼               ▼
                                  keys-packs      subscription-plans    how-free-mode-works  WatchAdPromptSheet
                                        │               │                                       │
                                        ▼               ▼                                       ▼
                                  keys-confirm   subscription-confirm                    KeyRewardContent
                                        │               │                             (grantBonusKey on tap)
                                        └───────┬───────┘
                                                ▼
                                      lib/billing.ts → Paystack checkout
                                                │
                                                ▼
                                      payment-complete (grantBonusKey / setPremium)
                                                │
                                                ▼
                              router.replace('/', { resume: 'true' }) → auto-resumes session
```

### Keys Economy Flow (rebuilt — escalating cooldown + premium bypass)

```
App Start: AsyncStorage → KeysState { balance: 3, resetAt: null, isPremium: false, resetCount: 0 }
                │
                ▼
         Enter/advance Session ── spendKey() → balance: 2, 1, 0   (no-op if isPremium: balance stays 999999)
                │ (balance hits 0)
                ▼
         Out of Keys screen (scrollable) shown ── startResetTimer()
                │        resetAt = now + resetDurationFor(resetCount)   [5min → 2hr → 8hr, capped]
                │
       ┌────────┼─────────────────┬────────────────────┐
       ▼        ▼                 ▼                     ▼
  Buy keys  Subscribe      Watch a rewarded ad     Wait for timer
  (Paystack) (Paystack)   (+1 via grantBonusKey,   (useKeys polls 1s;
       │        │          tap-gated, see          applyReset() fires
       ▼        ▼          WatchAdPromptSheet)      once resetAt passes)
  payment-complete.tsx                                    │
   grantBonusKey /                                         ▼
   setPremium(true)                              balance: 3, resetAt: null,
       │                                          resetCount: +1 (next cooldown
       ▼                                          tier escalates)
  resume session
```

### Component Hierarchy (updated 2026-09-07)

```
RootLayout (_layout.tsx)
└── ThemeProvider
    └── RootLayoutInner
        └── Stack
            ├── RootGate (index.tsx) — checks areTabsUnlocked()
            │   ├── [Pre-unlock]: SkillsFlow
            │   │   ├── LandingScreen (Skills Corner grid)
            │   │   │   └── SkillGridCard (×N)
            │   │   ├── LearningStyleScreen (ModeCard ×N)
            │   │   ├── TrackDetailScreen
            │   │   ├── DownloadingScreen
            │   │   └── PlaySession
            │   │       ├── CardDeck (QuizCardDeck / ReadingCardDeck)
            │   │       │   ├── TwoImageCard / ReadingCard
            │   │       │   ├── CheckButton, ScrollHintChevron
            │   │       │   ├── LearnMoreSheet, FeedbackSheet, QuitConfirmSheet
            │   │       │   └── [Mistakes Hook]: recordQuestionFailure / recordQuestionSuccess
            │   │       ├── ModeSwitcherSheet
            │   │       └── SessionStateScreen
            │   │           ├── outOfKeys → KeysOptionsContent
            │   │           └── WatchAdPromptSheet → KeyRewardContent
            │   │
            │   └── [Post-unlock]: Redirect → /(tabs)/home
            │
            ├── TabsLayout (app/(tabs)/_layout.tsx)
            │   ├── FloatingTabBar (animated sliding pill: Home, Skills, Keys, Reports)
            │   ├── HomeTab (home.tsx)
            │   │   ├── AppHeader
            │   │   └── SkillProgressCard (×N, resume actions)
            │   ├── SkillsTab (skills.tsx)
            │   │   ├── AppHeader
            │   │   └── SkillsFlow (embedded)
            │   ├── KeysTab (keys.tsx)
            │   │   ├── AppHeader
            │   │   └── KeysOptionsContent (buy keys / subscribe / free-trial timer)
            │   └── ReportsTab (reports.tsx)
            │       ├── AppHeader
            │       ├── StatRow (Day Streak + Total XP)
            │       ├── WeekCalendarRow (7-day Mon–Sun illuminated dots)
            │       ├── KeysRow (Balance shortcut)
            │       ├── LeaguePanel (Bronze/Silver/Gold tier + progress bar)
            │       └── SkillReportCards (percentage, XP badge, N Missed button)
            │
            ├── SettingsScreen (app/settings.tsx)
            │   ├── AppHeader / Back Header
            │   ├── SectionHeader, SettingsRow, SettingsToggleRow
            │   └── RestoreAccountModal
            │
            ├── MistakesScreen (app/mistakes.tsx)
            │   ├── Back Header + Filter Tabs (All vs Unsolved)
            │   └── MistakeCard (×N, question, mistake count, correct answer, mastered chip)
            │
            ├── keys-packs → keys-confirm
            ├── subscription-plans → subscription-confirm
            ├── premium-benefits, how-keys-work, how-free-mode-works
            └── payment-complete
```

Every standalone route outside the tab shell renders its body inside `ScreenTransition` — web-only slide-in, paired with `navPush`/`navBack`/`navReplace` from `lib/navDirection.ts` (see §6.5).

### Progress, Analytics & Mistakes Feedback Loop (New 2026-09-07)

```
                       ┌─────────────────────────────────────┐
                       │        PlaySession (Gameplay)       │
                       └──────────────────┬──────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     CardDeck: Check Answer                        SessionStateScreen: Topic Complete
  (records attempts in real-time)                     (advances topic / calculates XP)
                  │                                               │
       ┌──────────┴──────────┐                         ┌──────────┴──────────┐
       ▼                     ▼                         ▼                     ▼
Wrong Answer           Correct Answer             recordXpEarned()    recordActivityToday()
recordQuestionFailure recordQuestionSuccess      (adds 5 XP / correct) (adds YYYY-MM-DD to
(increments failCount (marks solved: true)             │               @play/activity_dates)
 in @play/mistakes)          │                         ▼                     │
       │                     │                  @play/total_xp &             ▼
       └──────────┬──────────┘                  @play/xp:${skill}       currentStreak &
                  │                                    │                7-day week dots
                  ▼                                    │                     │
           app/mistakes.tsx                            └──────────┬──────────┘
       (Mistake Overview drill-down)                              │
                                                                  ▼
                                                        app/(tabs)/reports.tsx
                                                    (Live Streak, XP, League, Reports)
```

### Track Derivation Summary

Unchanged from the prior audit — see that revision's table (`pairs`/`names`/`meanings`/`whereUsed`/`full`/`reading`, their role filters, grouping functions, and session `kind`).

---

### Animation Patterns (three different mechanisms, all called "swipe" colloquially)

The app has three genuinely different ways something slides across the screen. They're easy to conflate because they all look like a horizontal swipe, but the underlying mechanics — and what triggers them — are not the same.

**1. Stage transitions (`index.tsx`) — mount/unmount slide, web-only outer wrapper**
`LandingScreen` ↔ `LearningStyleScreen` ↔ `TrackDetailScreen` ↔ `DownloadingScreen` are separate components swapped via the `stage` state machine. Each non-`session` stage renders inside one shared `<Animated.View key={stage} entering={SlideInRight/SlideInLeft.duration(280)} exiting={FadeOut.duration(180)}>`. `stageDirection` ('forward'/'backward') decides which edge the new screen enters from. Because the `key` changes, React actually tears down the old component and mounts a new one — the slide is that new component's Reanimated *entrance* animation, playing once, unattended, no gesture involved. Separately, the whole `index.tsx` tree is also wrapped in `<ScreenTransition>` (`components/nav/ScreenTransition.tsx`) — a **web-only** page-level slide keyed to actual route focus (`useFocusEffect`), used for the standalone routes like `/subscription-plans` ↔ `/subscription-confirm`. It's a no-op on native. The two wrappers are independent; PlaySession is deliberately rendered *outside* the inner keyed `Animated.View` (see comment in `index.tsx`) so browser back-nav into `/` doesn't double-animate.

**2. `PlaySession`'s own internal states — same mount/unmount pattern, but inconsistently applied**
`flowState === 'topicComplete'` uses the identical pattern to #1: wrapped in its own `<Animated.View entering={SlideInRight/SlideInLeft} exiting={FadeOut}>`, direction driven by a local `screenDirection`. But `flowState === 'outOfKeys'` renders `<SessionStateScreen kind="outOfKeys" .../>` with **no Animated.View wrapper at all** — it's a hard, unanimated cut. This is the one state in the whole flow that never got an entrance animation (noted 2026-09-05; not fixed, just documented — the topicComplete slide was flagged as visually "cropped inside its view" on desktop vs. the stage-transition version, which needs a look before touching either).

**3. `CardDeck.tsx` question-to-question advance — one continuous strip, not swap-based, not gesture-driven**
Both `QuizCardDeck` and `ReadingCardDeck` keep every question/sign card pre-rendered side-by-side in one long horizontal strip (`stripX` shared value, `Animated.View` with `translateX`). Advancing (tapping Continue on the FeedbackSheet, or Next in reading mode) calls `triggerAdvance()`, which runs one scripted `withTiming(targetX, { duration: 320, easing: Easing.out(Easing.cubic) })` to shift the whole strip one card-width left. Nothing mounts or unmounts — the strip itself never resets — and there is **no drag/pan gesture anywhere in this file** despite it visually reading as a "swipe": the "swipe" is entirely the scripted animation firing off a button tap, same as #1/#2. It only ever goes one direction (left) since there's no going back through questions.

**In short:** #1 and #2's `topicComplete` case are the same trick (component swap + Reanimated enter/exit), #2's `outOfKeys` case is a plain unanimated cut, and #3 is a single strip sliding via `withTiming` rather than any component being swapped or dragged.

---

*End of documentation.*
