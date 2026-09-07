# PataSkills Play — Master Codebase Documentation

> **Generated from source**: 2026-09-07 · Root: `desktop/platform/PataProducts/play/`  
> Companion specs: `userdata.md` (storage keys + tables), `json-conversion.md` (content pipeline).

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

**PataSkills Play** is a mobile-first quiz app built with **Expo 54** (React Native) for iOS, Android, and web. Curriculum JSON and images load at runtime from **Supabase** (`play-assets` bucket + `play_*` tables). Questions play in a swipeable card deck. Continued play is gated by a consumable **keys** economy; checkout is **Paystack** (web iframe), not a native IAP SDK.

Live landing catalog in `constants/skills.ts` (`LANDING_SKILLS`):

| Slug | Subtitle | Notes |
|------|----------|--------|
| `driving-theory` | Driving theory | Role-tagged questions + signs catalog; JSON-declared tracks `pairs` / `names` / `meanings` / `whereUsed` / `reading` / `full` |
| `true-false` | True/False | Text questions; compulsory `full` + `reading` |
| `bible-trivia` | Bible Trivia | 237 `textChoice` questions (single-answer only) |
| `world-facts` | World Facts | Converted trivia; cover `curricula/world-facts.webp` |

`play_curricula` (active rows) is the live source of truth for slug, title, and cover path. `LANDING_SKILLS` + `CurriculumCoverImagePaths` are the instant-render fallback before that fetch warms. A skill that exists only as a DB row still type-checks (`CurriculumSlug` is `string`); `getLandingSkill()` supplies default `tracks: ['reading', 'full']`.

**Football** (`jsons/football.json`, `scripts/convert-football.mjs`, `scripts/upload-football.mjs`) is conversion/upload tooling only — it is **not** in `LANDING_SKILLS`.

### Core user flow

```
Pre-unlock (first launch until first topic complete):
  app/index.tsx RootGate → SkillsFlow
    LandingScreen → LearningStyleScreen → TrackDetailScreen → Downloading → PlaySession
    markTopicCompleted() → unlockTabsIfNeeded() → @play/tabs_unlocked = "true"

Post-unlock (every later launch):
  app/index.tsx Redirect → /(tabs)/home
    home     My Skills + SkillProgressCard resume → /play?resume=true&skill=
    skills   Skills Corner grid only; tap → /play?skill=
    keys     Key packs / subscribe / free trial  OR  Premium card → /manage-subscription
    reports  Streak, recharges, 4-day strip, league, per-skill reports → /mistakes, /leaderboard
  app/play.tsx   Full-screen SkillsFlow (standalone) — no FloatingTabBar
```

Deep links: `?track=` skips to track detail; `?resume=true` (and optional `skill` / `track`) auto-starts a session. Payment success still `navReplace`s to `/` with `resume=true` (`app/payment-complete.tsx`).

---

## 2. Directory Tree

```
play/
├── .env                         # Local env (never commit secrets). Names in §4
├── AGENTS.md / CLAUDE.md        # Expo v57 docs pin for agents
├── CODEBASE.md                  # This file
├── userdata.md                  # User-data inventory (AsyncStorage + Supabase)
├── json-conversion.md           # How source trivia JSON becomes curriculum JSON
├── app.json                     # Expo manifest
├── babel.config.js              # babel-preset-expo
├── metro.config.js              # woff/woff2 asset extensions
├── package.json
├── tsconfig.json                # strict, @/* → root; excludes supabase/functions
├── vercel.json                  # npm run build → dist/
├── README.md / LICENSE
├── pataskills-swipe-demo.html   # Standalone HTML swipe prototype
│
├── app/                         # Expo Router
│   ├── _layout.tsx              # Providers, fonts, notifications, billing expiry
│   ├── index.tsx                # RootGate (SkillsFlow vs redirect to tabs)
│   ├── play.tsx                 # Standalone SkillsFlow (no tab bar)
│   ├── +html.tsx                # Web HTML shell (fonts, AdSense, phone frame CSS)
│   ├── +not-found.tsx
│   ├── (tabs)/                  # home, skills, keys, reports + FloatingTabBar
│   ├── settings.tsx
│   ├── manage-subscription.tsx
│   ├── leaderboard.tsx
│   ├── mistakes.tsx
│   ├── help.tsx / feedback-form.tsx
│   ├── keys-packs.tsx / keys-confirm.tsx / how-keys-work.tsx
│   ├── subscription-plans.tsx / subscription-confirm.tsx
│   ├── premium-benefits.tsx / how-free-mode-works.tsx
│   ├── payment-complete.tsx
│   └── admin/signs.tsx
│
├── components/
│   ├── ads/                     # AdSenseDisplayUnit (+ .web.tsx)
│   ├── auth/                    # RestoreAccountModal, GoogleWebButton (+ .web.tsx)
│   ├── cards/                   # CardDeck, TwoImageCard, ReadingCard, ScrollHintChevron
│   ├── feedback/                # Keys/session/ad sheets, CheckButton, etc.
│   ├── home/                    # SkillProgressCard only
│   ├── landing/                 # LandingScreen, LearningStyle, TrackDetail, ModeCard, …
│   ├── nav/                     # AppHeader, FloatingTabBar, ScreenTransition
│   ├── play/                    # SkillsFlow, PlaySession
│   ├── profile/                 # Avatar, LeagueCard, LeagueSheet, LeaderboardRow
│   ├── reports/                 # StatCard, WeekCalendarRow, LeaguePanel, SkillReportCard, MistakeCard
│   ├── settings/                # SettingsRow / Toggle / SectionHeader
│   └── ui/                      # Button, Toggle, ConnectionError, DownloadAppModal
│
├── constants/                   # colors, gradients, typography, spacing, icons,
│                                # skills, trackOptions, curriculumAssets
├── theme/                       # ThemeContext, tokens barrel
├── lib/                         # See §9
├── hooks/                       # useKeys, useScrollHint
├── types/quiz.ts
├── utils/                       # groupSessions, hydrateQuestions, shuffleAnswers
├── data/questions.sample.json   # Local driving-theory sample
├── jsons/                       # Source dumps: football.json, true-false_v2.json
├── scripts/                     # Content/DB pipeline .mjs (+ output/)
├── supabase/                    # SQL + Edge Functions
├── public/                      # ads.txt, sw.js (web notifications)
├── assets/                      # fonts, images, homepage, premium, driving, profile
├── docs/                        # Feature notes
├── dist/                        # expo export -p web (artifact)
└── Inspos/                      # Design screenshots
```

---

## 3. Technology Stack & Dependencies

| Layer | Technology | Version (`package.json`) |
|-------|-----------|--------------------------|
| Framework | Expo (managed) | ~54.0.33 |
| Routing | expo-router | ~6.0.23 |
| UI | React Native / React | 0.81.5 / 19.1.0 |
| Animation | react-native-reanimated | ~4.1.1 |
| Gestures | react-native-gesture-handler | ~2.28.0 |
| Backend | @supabase/supabase-js | ^2.112.4 |
| Storage | @react-native-async-storage/async-storage | 2.2.0 |
| Images | expo-image | ~3.0.11 |
| Icons | lucide-react-native + @expo/vector-icons | — |
| Web | react-native-web | ^0.21.0 |

**Not in `package.json` (loaded optionally / at runtime):**

- **Paystack** — `js.paystack.co/v1/inline.js` injected in `lib/billing.ts`
- **AdMob** — optional `require('react-native-google-mobile-ads')` in `lib/ads.ts` (Android only)
- **AdSense / Ad Placement API** — script tags in `app/+html.tsx`; `lib/webRewardedAd.ts` wraps `window.adBreak`
- **Google Identity Services** — `components/auth/GoogleWebButton.web.tsx`
- **No RevenueCat / native IAP client** in the Expo app. Play Store subscription *management* URLs and `supabase/functions/revenuecat-webhook` exist for the Android product / V2 parity, not as an in-app SDK

### NPM scripts

| Script | Command |
|--------|---------|
| `start` / `android` / `ios` / `web` | `expo start` (+ platform) |
| `build` | `expo export -p web` |

No ESLint script. Typecheck: `npx tsc --noEmit` (Edge Functions excluded).

---

## 4. Configuration Files

### `app.json`

Name **PataSkills Play**, slug `play`, version `1.0.0`, portrait, dark `userInterfaceStyle`, scheme `pataskillsplay`. Web `output: "static"`. Android adaptive icon; predictive back disabled.

### `tsconfig.json`

Extends `expo/tsconfig.base`, `strict: true`, path `@/*` → project root. `exclude`: `node_modules`, `supabase/functions`.

### `.env` (names actually read in app source)

| Variable | Used by |
|----------|---------|
| `EXPO_PUBLIC_PATASKILLS_SUPABASE_URL` | `lib/supabase.ts`, `app/+html.tsx` cover preload |
| `EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY` | `lib/supabase.ts` |
| `EXPO_PUBLIC_PATASKILLS_PAYSTACK_PUBLIC_KEY` | `lib/billing.ts` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `GoogleWebButton.web.tsx` |
| `EXPO_PUBLIC_ADSENSE_CLIENT_ID` | `app/+html.tsx`, `AdSenseDisplayUnit.web.tsx` |
| `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` | `lib/ads.ts` (prod unit; test unit in `__DEV__` or non-production) |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | `lib/ads.ts` |
| `EXPO_PUBLIC_APP_ENV` | `lib/ads.ts` production gate |

Edge Functions use **server** secrets (`PATASKILLS_PAYSTACK_SECRET_KEY`, `RC_WEBHOOK_SECRET`, `RESEND_API_KEY`, etc.), not `EXPO_PUBLIC_*`.

Shares the PataSkills Supabase project; Play tables/bucket are independent (`play_curricula`, `play_signs`, `play_sign_pairs`, `play_accounts`, `play_purchases`, `play_progress`, `play_user_stats`, `play_question_attempts`, `play_track_defaults`, `help_requests`, bucket `play-assets`).

### `vercel.json`

`buildCommand: npm run build`, `outputDirectory: dist`, `cleanUrls: true`.

### `metro.config.js` / `babel.config.js`

WOFF/WOFF2 as assets. `babel-preset-expo` (Reanimated/worklets).

---

## 5. App Layer (`app/`)

### `_layout.tsx`

```
GestureHandlerRootView → SafeAreaProvider → ThemeProvider(defaultMode="dark")
  → RootLayoutInner: StatusBar light, NavigationDarkTheme background, Stack headerShown:false
```

On mount: hide splash when fonts load; `initNotifications()`; `configureBilling()` (local premium expiry). Native loads Sora via `useFonts(fontAssets)`; web uses `@font-face` in `+html.tsx` (empty font map). Stack animation `slide_from_right` on native, `none` on web (`ScreenTransition` handles web slides).

### `index.tsx` — RootGate

- `areTabsUnlocked()` (`@play/tabs_unlocked`)
- Locked: `<SkillsFlow />` (no tab bar)
- Unlocked: `<Redirect href="/(tabs)/home" />`
- While AsyncStorage is loading: blank themed `View` (no flash)

### `(tabs)/`

`FloatingTabBar`: Home, Skills (`Library`), Keys (`KeyRound`), Reports (`PieChart`). Spring pill. `headerShown: false`.

**`home.tsx`** — “My Skills”. Skills with `completedTopics > 0` from catalog ∪ `LANDING_SKILLS`. `SkillProgressCard`; tap in-progress → `/play?resume=true&skill=`; 100% → reports. `useFocusEffect` refresh.

**`skills.tsx`** — Grid only (`LandingScreen` under `AppHeader`). Tap → `/play?skill=`. `bottomPadding` clears the tab bar. Learning/download/quiz never run inside this tab.

**`keys.tsx`** — If `isPremium`: crown (`assets/premium/crown.webp`), “You're on Premium”, expiry or unlimited copy, **Manage subscription** → `/manage-subscription`, Premium benefits row. Else: key count hero (`assets/premium/key.webp`), “N keys left”, `KeysOptionsContent` (packs, subscribe, free trial / timer).

**`reports.tsx`** — `StatCard` max streak (`streak.webp`) + recharges (`recharge.webp`); `WeekCalendarRow` **4-day** strip (today + next three, from 7-day `streak` data); “Keys and Quest(N)” → keys tab; `LeaguePanel` (lifetime XP, trophies, `lib/leagues.ts`); `SkillReportCard` list → `/mistakes`.

### `play.tsx`

`<SkillsFlow standalone />`. Full viewport; back from learning-style returns to the skills grid.

### `settings.tsx`

- **Account**: sign-in/restore (`RestoreAccountModal`); **Manage Subscriptions** with live `Premium` / `Free` → `/manage-subscription`
- **Preferences**: Dark theme (`useTheme().setMode`), notifications (`@play/timer_reminders` + `scheduleResetReminder`), currency `USD`/`KES` (`@play/currency`)
- **Support**: Help currently opens `https://pataskills.com` (in-app `/help` + `/feedback-form` still exist as routes)
- **Legal**: privacy / terms on pataskills.com
- **Account Actions**: Log out (`logoutAccount()`) when email is set

### `manage-subscription.tsx`

Plan card (Premium vs Free upgrade). Premium + native: Play Store management URL from `getSubscriptionInfo()`. Premium or upgrade on **web**: `DownloadAppModal` (Play listing `com.pataskills.v2`). Help → public FAQ.

### `leaderboard.tsx`

From Reports → View Leaderboard. `LeagueCard` + `LeagueSheet` (11 XP bands). `lib/leaderboard.ts` mixes the signed-in learner with deterministic mock peers in-band.

### `mistakes.tsx`

`/mistakes?skillId=&skillName=`. All / Unsolved filters. `MistakeCard`.

### `help.tsx` / `feedback-form.tsx`

Topic picker (`lib/help.ts` six topics) → form → `help_requests`. Still routed; Settings Help does not currently push here.

### Monetization routes

| Route | Role |
|-------|------|
| `keys-packs` | `KEY_PACKS` 20/40/80/120 |
| `keys-confirm` | Email + `purchaseKeyPack` |
| `how-keys-work` | Explainer |
| `subscription-plans` | Weekly / Regular / Annual (`PLANS`) |
| `subscription-confirm` | Email + `purchasePlan` |
| `premium-benefits` | Free vs Premium table |
| `payment-complete` | Grants keys (`grantBonusKey`) or `setPremium(true, expiresAt)`; continue → `/` resume |
| `how-free-mode-works` | Free-trial explainer |

### `+html.tsx`

Viewport, `ScrollViewStyleReset`, Sora WOFF2+TTF `@font-face`, driving cover preload, `#root` max 430×932 (svh), AdSense `ca-pub` script when `EXPO_PUBLIC_ADSENSE_CLIENT_ID` is set, Ad Placement API snippet for `adBreak`/`adConfig`.

### `admin/signs.tsx`

Grid of `play_signs`; tap to swap `image_path`.

---

## 6. Components (`components/`)

### Ads

- `AdSenseDisplayUnit.tsx` — native stub (`null`)
- `AdSenseDisplayUnit.web.tsx` — in-page `<ins>` unit  
Used by `WatchingAdContent.tsx` (display-ad fallback). **Current out-of-keys product path does not mount this** — see WatchAdPromptSheet.

### Auth

- `RestoreAccountModal` — account view / success / email+Google restore
- `GoogleWebButton.tsx` — native empty stub
- `GoogleWebButton.web.tsx` — GIS button → `onIdToken`

### Cards

- `CardDeck.tsx` — `QuizCardDeck` vs `ReadingCardDeck`. Quiz: `recordQuestionFailure` / `recordQuestionSuccess`. Horizontal strip advance via `withTiming` (not a pan gesture)
- `TwoImageCard.tsx` — image / two-image / text layouts
- `ReadingCard.tsx` — browse-only; explanation + similar items when the source question supports them
- `ScrollHintChevron.tsx` + `useScrollHint`

### Feedback

- `KeysOfferScreen` — 20-key Paystack upsell; Maybe later / hardware back → `outOfKeys` (`BackHandler`). Key art: `assets/premium/key.webp`
- `KeysOptionsContent` — Buy keys / Subscribe / Free trial (sessions left vs countdown + reminder toggle)
- `SessionStateScreen` — topic/chapter complete, out of keys, rewards. Login link hidden after tabs unlock
- `WatchAdPromptSheet` — **Android**: `showRewardedForSession()` then reward step; grant on **Unlock** tap (`grantBonusKey`), not on ad complete. **Web**: skip ad → `DownloadAppModal` (`source="ads"`)
- `KeyRewardSuccessModal` / `KeyRewardContent`
- `WatchingAdContent` — in-page AdSense + timer; **not wired** from WatchAdPromptSheet today
- `CheckButton`, `DownloadingScreen`, `FeedbackSheet`, `FlagIcon`, `LearnMoreSheet`, `QuitConfirmSheet`

### Landing / Home

Landing lives in `components/landing/` (not `home/`):

- `LandingScreen` — 2-col Skills Corner; merges DB catalog with `LANDING_SKILLS`; `bottomPadding`
- `SkillGridCard`, `SkillCard`, `LandingIllustration`, `CarouselDots` (unused by grid)
- `LearningStyleScreen`, `ModeCard`, `TrackDetailScreen`, `ModeSwitcherSheet` (`groupTrackOptions` for `groupId`/`groupTitle`)

`components/home/SkillProgressCard.tsx` — Home tab only. `% Complete` uses `FontFamily.regular`.

### Nav

- `FloatingTabBar` — Reanimated spring pill
- `AppHeader` — initials avatar, name, gear → `/settings`
- `ScreenTransition` — web route slide; `lib/navDirection.ts`

### Play

- `SkillsFlow` — stages `landing | learning-style | track-detail | downloading | session`. `standalone` skips landing when `params.skill` is set. Exit → `/(tabs)/home` if tabs unlocked
- `PlaySession` — spend keys, decks, mode switcher, `XP_PER_CORRECT = 5`, `recordXpEarned` + `recordActivityToday` on topic complete, `markTopicCompleted` / `markTrackCompleted`

### Profile / Reports / Settings / UI

Profile: `Avatar`, `LeaderboardRow`, `LeagueCard`, `LeagueSheet` (carousel of `LEAGUES`).  
Reports: `StatCard`, `WeekCalendarRow` (4 markers), `LeaguePanel`, `SkillReportCard`, `MistakeCard`.  
Settings: `SectionHeader`, `SettingsRow`, `SettingsToggleRow`.  
UI: `Button`, `Toggle`, `ConnectionError`, **`DownloadAppModal`** (web install CTA for subscribe / manage / ads).

---

## 7. Constants (`constants/`)

- `colors.ts` / `gradients.ts` / `typography.ts` (Sora) / `spacing.ts` / `icons.ts` — design tokens; `theme/tokens.ts` re-exports
- `curriculumAssets.ts` — `CurriculumCoverImagePaths` for `driving-theory`, `true-false`, `bible-trivia`, `world-facts`; `CurriculumSlug = string`
- `skills.ts` — `LANDING_SKILLS` (four skills above) + `getLandingSkill()`
- `trackOptions.ts` — `getTrackOptionsForSkill` / `getTrackOption` / `groupTrackOptions`

**Label resolution:** skill `trackLabels` → JSON `trackDef.title` → `getCachedTrackDefaultLabel()` (`play_track_defaults`) → `DEFAULT_TRACK_LABELS`.

**Image resolution:** JSON `tracks[].image` → skill `trackImages` → `getCachedTrackDefaultUrl()` → empty `LOCAL_IMAGES` → skill cover (`getCachedCoverImagePath` then `CurriculumCoverImagePaths`). Driving track webps are **not** local `require()`s; they are uploaded to `play-assets/track-icons/` and referenced from driving-theory JSON.

---

## 8. Theme (`theme/`)

`ThemeContext.tsx` — `dark` / `light` / `system`, persisted (`@theme_preference`). Settings Dark switch maps on → `dark`, off → `light`. `tokens.ts` barrels colors/spacing/typography.

---

## 9. Library / Data Layer (`lib/`)

| File | Role |
|------|------|
| `supabase.ts` | Client singleton + public URL helper for `play-assets` |
| `curriculaCatalog.ts` | Cached `play_curricula` (`slug, title, cover_image_path` where `is_active`) |
| `trackDefaults.ts` | Cached `{ images, labels }` from `play_track_defaults` |
| `curriculum.ts` | Load JSON, `detectAvailableTracks` (JSON tracks **or** legacy roles; **always** include `full` + `reading`), `deriveTrack`, `loadCurriculumCached` |
| `downloadSession.ts` | Fetch + hydrate + `deriveTrack`; min load beat is in SkillsFlow (`MIN_LOADING_MS = 2000`) |
| `signs.ts` | `play_signs` / `play_sign_pairs` |
| `keys.ts` | Economy (below) |
| `premium.ts` | `PLANS`, `KEY_PACKS` |
| `currency.ts` | `KES_PER_USD = 129` |
| `billing.ts` | Paystack checkout, `getSubscriptionInfo`, `enforceLocalExpiry` / `configureBilling` |
| `restore.ts` | Email/Google restore; `logoutAccount` |
| `email.ts` | Validate + truncate |
| `ads.ts` | Android AdMob rewarded only; non-Android → `'unavailable'` |
| `webRewardedAd.ts` | `adBreak` rewarded; **unused by WatchAdPromptSheet** |
| `notifications.ts` | Web Notification API + `public/sw.js` |
| `progress.ts` | Per-skill topics/tracks + tabs unlock |
| `mistakes.ts` | `@play/mistakes:${skillId}` + `play_question_attempts` |
| `xp.ts` | `@play/total_xp`, `@play/xp:${skillId}`, `play_user_stats` |
| `streak.ts` | `@play/activity_dates` |
| `leagues.ts` | 11 lifetime-XP bands of 500 |
| `leaderboard.ts` | Current user + mock peers in-band |
| `help.ts` | Topics + `help_requests` insert |
| `navDirection.ts` | `navPush` / `navBack` / `navReplace` |

### Keys (`keys.ts`)

`INITIAL_KEYS = 3`. Cooldowns **5 min → 2 h → 8 h** via `resetCount`.

```ts
interface KeysState {
  balance: number;
  initialized: boolean;
  isPremium?: boolean;
  expiresAt?: string | null;
  resetAt: number | null;
  resetCount?: number;
}
```

`applyReset()` refills when `resetAt` has passed **and** drops premium when `expiresAt` is past. Every `write()` upserts `play_accounts` if `@play/user_email` is set. `getKeyBalance()` returns `999999` when premium (UI often shows `∞`). `grantBonusKey`, `setPremium(flag, expiresAt?)`, `spendKey`, `startResetTimer`.

### Billing (`billing.ts`)

Paystack amounts in **KES**. After iframe success, upserts `play_purchases` / `play_accounts` (subscription also writes `@play/premium_expires_at`) then routes to `/payment-complete` with `skill`/`track` if the funnel had them. `getSubscriptionInfo()` reads local premium + optional `play_accounts.is_premium`; `managementURL` is the Play Store subscriptions page.

### Ads (current product)

| Platform | Out of keys → Watch ad |
|----------|------------------------|
| Android + AdMob module | Real rewarded unit; grant on reward-screen CTA |
| Web | `DownloadAppModal` — no Ad Placement / simulated timer |

`WatchingAdContent` + `webRewardedAd.ts` remain in the tree as unused/alternate web ad experiments.

### Leagues (`leagues.ts`) — actual names

Quartz, Topaz, Amber, Jade, Opal, Sapphire, Ruby, Emerald, Obsidian, Diamond, Legend. **Not** Bronze/Silver/Gold. Lifetime XP, 500-XP bands, Legend open-ended.

### Progress

`@play/progress:${skillId}`, `@play/completed_tracks:${skillId}`, `@play/tabs_unlocked`. First `markTopicCompleted` unlocks tabs permanently. `unlockTabsIfNeeded` is **not** exported (internal).

---

## 10. Hooks (`hooks/`)

**`useKeys`** — `balance`, `isPremium`, `resetAt`, `isOutOfKeys` (`!isPremium && balance <= 0`). Polls while depleted (skipped if premium).

**`useScrollHint`** — content taller than viewport; bouncing chevron.

---

## 11. Types (`types/`)

`types/quiz.ts`:

- `CurriculumTrackDefinition` — `id`, `title`, `filterRole?`, `filterFormat?`, **`filterTags?`** (AND), `kind?: 'quiz' | 'reading' | 'full'`, **`groupId` / `groupTitle`**, `image?`
- `QuizQuestion` / format variants, `SignCatalogEntry`
- `Track` is defined in `lib/curriculum.ts`: `'pairs' | 'names' | 'meanings' | 'whereUsed' | 'full' | 'reading' | (string & {})`

---

## 12. Utilities (`utils/`)

- `groupSessions.ts` — `QuizPlaySession` / `ReadingPlaySession`, `chunkIntoSessions`, `chunkSignsIntoSessions`, `groupQuestionsBySession`
- `hydrateQuestions.ts` — sign keys → URLs; `deriveReadingEntriesFromQuestions` (question-shape aware)
- `shuffleAnswers.ts` — Fisher–Yates

---

## 13. Scripts (`scripts/`)

One-off Node `.mjs` (run from `play/`). Highlights:

| Script | Purpose |
|--------|---------|
| `upload-bible-trivia.mjs` / `upload-world-facts.mjs` / `upload-true-false-v2.mjs` / `upload-football.mjs` | Put converted JSON into `play-assets/curricula/` |
| `convert-true-false-v2.mjs` / `convert-football.mjs` | Source JSON → curriculum shape |
| `upload-track-icons.mjs` | Driving track art → `play-assets/track-icons/` |
| `split-identification-track.mjs` | Driving track split helper |
| `derive-signs*.mjs`, `link-signs-to-questions.mjs`, `build-signs-catalog.mjs`, `populate-pairs.mjs`, image fix/rename scripts | Signs pipeline |
| `_check_*.mjs` | Ad-hoc DB checks |

`output/` holds converted JSON, SQL, and image previews. `json-conversion.md` documents world-facts / bible-trivia / true-false rules (`single` kept; `multi` / `matching` dropped).

---

## 14. Supabase (`supabase/`)

### SQL in repo

- `play_accounts.sql` + `play_accounts_reset_count.sql` — email PK, balance, is_premium, reset_at, reset_count
- `play_purchases.sql` — `paystack_ref` PK
- `play_sign_pairs.sql`
- `play_track_defaults.sql` — nullable `image_path` / `label`; seed `full` → `"Learn Full Skill"` (images unseeded so driving art does not leak)
- `fix_play_signs_rls.sql`, `reset_signs_fresh.sql`

Other tables (`play_curricula`, `play_signs`, `play_progress`, `play_user_stats`, `play_question_attempts`, `help_requests`) are used in app code; full column inventory is in `userdata.md`.

### Edge Functions (`supabase/functions/`)

| Function | Role |
|----------|------|
| `paystack-webhook` | HMAC-SHA512 (`PATASKILLS_PAYSTACK_SECRET_KEY`); mirrors paid events to Play + V2 purchase tables |
| `revenuecat-webhook` | Play/App Store via RevenueCat; emails via Resend; updates premium rows |
| `subscription-reminders` | T-7 / T-3 renewal emails (cron + `REMINDERS_SECRET`) |

Deno; excluded from app `tsc`. Deploy with `supabase functions deploy … --no-verify-jwt`.

---

## 15. Assets (`assets/`)

| Path | Use |
|------|-----|
| `fonts/` | Sora TTF + subset WOFF2 |
| `images/` | Icons, favicon, mascot, splash |
| `homepage/` | `driving.png`, `streak.webp`, `recharge.webp`, `trophy.webp` |
| `profile/trophy.webp` | League UI |
| `premium/` | `key.webp`, `unlock.webp`, `crown.webp` |
| `driving/*.webp` | **Source files for upload**, not runtime `require()` |

---

## 16. Docs (`docs/`)

- `learning-tracks-and-reading-mode.md` — original tracks/reading spec
- `FirstUpdate.md` — early dynamic-tracks notes (some asset wiring superseded by DB/JSON — see §7)

Root: `json-conversion.md`, `userdata.md`.

---

## 17. Miscellaneous Files

- `public/ads.txt` — AdSense crawler
- `public/sw.js` — reset-reminder notifications when the tab is backgrounded
- `jsons/` — raw source exports before conversion
- `dist/` — web export artifact
- `.claude/` — Claude Code settings
- `Inspos/` — screenshots

---

## 18. Data Flow & Architecture

### Storage bucket (`play-assets/`)

```
curricula/
  driving-theory JSON (tracks + ~322 questions + signs catalog) + driving.webp
  true-false.json + true-false.webp
  bible-trivia.json + bible-trivia.webp
  world-facts.json + world-facts.webp
track-icons/   pairs, names, meanings, whereUsed, reading  (driving JSON only)
signs/         road-sign webps
```

### Landing → play → money

```
LandingScreen
  → LearningStyleScreen → TrackDetailScreen → downloadSession → PlaySession
Out of keys:
  KeysOfferScreen → SessionStateScreen (KeysOptionsContent)
    → keys-packs / subscription-plans / how-free-mode-works
    → WatchAdPromptSheet (Android AdMob | web DownloadAppModal)
Paystack → payment-complete → /?resume=true
```

### Keys

```
Start: balance 3
spendKey on session enter (no-op if premium)
balance 0 → startResetTimer (5m / 2h / 8h)
  wait | Paystack pack | Paystack Unlimited | Android rewarded +1
applyReset → balance 3, resetCount++
premium expiresAt → setPremium(false), local + play_accounts
```

### XP / mistakes / reports

`PlaySession` awards **5 XP per correct** in the completed topic (`recordXpEarned` + `recordActivityToday`). `CardDeck` writes mistakes live. Reports + leaderboard read XP, streak, leagues, mistakes counts.

### Component hierarchy (runtime)

```
RootLayout
└── Stack
    ├── index RootGate → SkillsFlow  OR  Redirect /(tabs)/home
    ├── (tabs) + FloatingTabBar
    │   ├── home: AppHeader + SkillProgressCard*
    │   ├── skills: AppHeader + LandingScreen
    │   ├── keys: AppHeader + Premium card | KeysOptionsContent
    │   └── reports: AppHeader + StatCards + WeekCalendarRow + LeaguePanel + SkillReportCard*
    ├── play: SkillsFlow standalone
    ├── settings, manage-subscription, leaderboard, mistakes
    ├── help, feedback-form
    ├── keys-* / subscription-* / payment-complete / explainers
    └── admin/signs
```

Standalone routes wrap with `ScreenTransition` on web.

### Animation (three mechanisms)

1. **Stage swap** in `SkillsFlow` — Reanimated enter/exit on `landing` / `learning-style` / `track-detail` / `downloading`
2. **PlaySession** — `topicComplete` uses the same enter/exit; `outOfKeys` is an unanimated cut
3. **CardDeck** — one horizontal strip, `withTiming` on Continue/Next (no drag)

### Known doc vs product caveats

- `userdata.md` still says +10 XP in one place; **code is +5** (`XP_PER_CORRECT`)
- Settings Help URL vs leftover `/help` routes
- `webRewardedAd` / `WatchingAdContent` / AdSense unit are **not** on the live Watch Ad path
- Football conversion is **not** a shipped landing skill
- League names in UI must match `lib/leagues.ts` (gemstone ladder), not a Bronze/Silver/Gold set

---

*End of documentation.*
