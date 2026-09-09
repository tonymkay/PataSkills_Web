# PataSkills Play — Master Codebase Documentation

> **Generated from source**: 2026-09-08 · Updated 2026-09-10: challenge/friend-invite codes (`play_challenge_invite_code.sql`), creator waiting-room (invite code + cancel-for-everyone) reusing `challenge-online.tsx`, `challenge-tournament-join.tsx` documented (was missing), pending-challenge guard on `challenge-create.tsx` · Root: `desktop/platform/PataProducts/play/`  
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
  app/index.tsx RootGate → logo splash (icon-dark.png + theme bg, every cold launch)
    → GetStartedScreen ("Learn with Questions" + decorative FlashcardStack) → Get Started
    → SkillsFlow isOnboarding
        LandingScreen → LearningStyleScreen → TrackDetailScreen → Downloading → PlaySession
        topicComplete: Continue kept, REDO SESSION replaced by underlined "Go to home page"
        markTopicCompleted() → unlockTabsIfNeeded() → @play/tabs_unlocked = "true"

Post-unlock (every later launch):
  app/index.tsx Redirect → /(tabs)/home
    home     My Skills + SkillProgressCard resume → /play?resume=true&skill=
             ChallengeCornerCard → /challenge-corner
    skills   Skills Corner grid only; tap → /play?skill=
    keys     Key packs / subscribe / free trial  OR  Premium card → /manage-subscription
    reports  Streak, recharges, 4-day strip, league, per-skill reports → /mistakes, /leaderboard
  app/play.tsx   Full-screen SkillsFlow (standalone) — no FloatingTabBar

Challenge Corner (reward-driven side loop):
  /challenge-corner → Add | Join with a Code | Online | Offline | Tournaments
    /challenge-create        → create challenge (global or private+code) → /challenge-online (waiting room, as creator)
    /challenge-tournament-join → code entry → tries challenge code, then tournament code → /challenge-online or /challenge-tournament-room
    /challenge-online     → search → waiting (roster; creator sees invite code + cancel-for-everyone) → /challenge-start → run → results → reward
    /challenge-offline    → companion carousel → join → /challenge-start → run → results → reward
    /challenge-tournament → search → found → join → /challenge-tournament-room → start → run → results → promotion/elimination/win
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
│   ├── challenge-corner.tsx          # Challenge Corner menu (5 rows)
│   ├── challenge-create.tsx          # Create a challenge form (global or private+invite-code)
│   ├── challenge-tournament-join.tsx # Code entry — tries a challenge code, then a tournament code
│   ├── challenge-offline.tsx         # Offline companion challenge carousel
│   ├── challenge-online.tsx          # Online challenge search + waiting room (also the creator's room for private/global challenges)
│   ├── challenge-scout-room.tsx      # Scout waiting room (globe pulse + join reveal)
│   ├── challenge-tournament.tsx      # Tournament story (search → found → promotion/elimination/win)
│   ├── challenge-tournament-room.tsx # Tournament stage waiting room
│   ├── challenge-start.tsx           # Pre-race countdown screen
│   ├── challenge-run.tsx             # Active challenge race
│   ├── challenge-results.tsx         # Post-race scoreboard
│   ├── challenge-reward.tsx          # Key reward claim
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
│   ├── ads/                     # AdSenseDisplayUnit (+ .web.tsx), BottomBannerAd
│   ├── auth/                    # RestoreAccountModal, GoogleWebButton (+ .web.tsx)
│   ├── cards/                   # CardDeck, TwoImageCard, ReadingCard, ScrollHintChevron
│   ├── challenge/               # StoryCarousel, AvatarStack
│   ├── feedback/                # Keys/session/ad sheets, CheckButton, etc.
│   ├── home/                    # SkillProgressCard, ChallengeCornerCard
│   ├── landing/                 # LandingScreen, LearningStyle, TrackDetail, ModeCard, …
│   ├── nav/                     # AppHeader, FloatingTabBar, ScreenTransition
│   ├── onboarding/               # GetStartedScreen, FlashcardStack (pre-onboarding, RootGate only)
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
├── hooks/                       # useKeys, useScrollHint, useChallengeSearch, useChallengeCompanionSession,
│                                # useChallengeScoutSession, useOnline
├── types/quiz.ts
├── utils/                       # groupSessions, hydrateQuestions, shuffleAnswers
├── data/questions.sample.json   # Local driving-theory sample
├── jsons/                       # Source dumps: football.json, true-false_v2.json
├── scripts/                     # Content/DB pipeline .mjs (+ output/)
├── supabase/                    # SQL + Edge Functions + play_*_rpcs.sql
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

Shares the PataSkills Supabase project; Play tables/bucket are independent (`play_curricula`, `play_signs`, `play_sign_pairs`, `play_accounts`, `play_purchases`, `play_progress`, `play_user_stats`, `play_question_attempts`, `play_track_defaults`, `play_devices`, `play_device_events`, `help_requests`, bucket `play-assets`).

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

- While AsyncStorage is loading (`areTabsUnlocked()`, `@play/tabs_unlocked`): logo splash — `assets/images/icon-dark.png` + theme background, no copy, shown on every cold launch regardless of unlock state
- Unlocked: `<Redirect href="/(tabs)/home" />`
- Locked, `Get Started` not yet tapped this mount: `<GetStartedScreen onGetStarted={...} />` (`components/onboarding/`) — logo, "Learn with Questions" heading, decorative `FlashcardStack`, `Get Started` CTA
- Locked, tapped: `<SkillsFlow isOnboarding />` (no tab bar) — `isOnboarding` forwards through `PlaySession` to `SessionStateScreen`'s `topicComplete` screen, swapping `REDO SESSION` for an underlined "Go to home page" link (`onSecondaryPress` → `onExit`). Onboarding completion itself is unchanged — still `markTopicCompleted()` → `unlockTabsIfNeeded()` on first topic complete, not tied to Get Started or the splash

### `(tabs)/`

`FloatingTabBar`: Home, Skills (`Library`), Keys (`KeyRound`), Reports (`PieChart`). Spring pill. `headerShown: false`.

**`home.tsx`** — "My Skills". Skills with `completedTopics > 0` from catalog ∪ `LANDING_SKILLS`. `SkillProgressCard`; tap in-progress → `/play?resume=true&skill=`; 100% → reports. `ChallengeCornerCard` links to `/challenge-corner`. `useFocusEffect` refresh.

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

### Challenge Corner screens

| Route | File | Role |
|-------|------|------|
| `/challenge-corner` | `challenge-corner.tsx` | Static 5-row menu: Add, Join with a Code, Online Challenge, Offline Challenge, Tournaments. No Live row. |
| `/challenge-create` | `challenge-create.tsx` | Create Challenge form: curriculum picker, topic, deadline, Global toggle (on = anyone can browse/join in `challenge-online`'s search; off = private, joinable only via invite code). Calls `createChallenge()` from `lib/challenges.ts`, which now returns `{ challengeId, inviteCode }`. On success routes straight into `/challenge-online?challengeId=…` — the creator lands in the same waiting room a joiner would. If this device already has a `status='waiting'` challenge it created (`getMyChallengeStories()`), the Create button swaps to "Check your challenge" and routes there instead of allowing a second create. |
| `/challenge-tournament-join` | `challenge-tournament-join.tsx` | Single code-entry screen for both invite types. Tries `joinChallengeByCode()` first (no email needed); on a genuine "no such code" miss, falls back to `joinTournamentByCode()` (may prompt for the invite email). Routes to `/challenge-online` or `/challenge-tournament-room` depending on which matched. Reached from the Challenge Corner "Join with a Code" row. |
| `/challenge-offline` | `challenge-offline.tsx` | Companion-owned offline races. `StoryCarousel` of `CompanionChallenge` cards, join → FlagPulse waiting room → `initCompanionSession` → `challenge-start`. |
| `/challenge-online` | `challenge-online.tsx` | Online challenge search **and** the shared waiting room for both browsed-into and directly-created challenges (a `challengeId` param skips straight to the waiting phase). `useChallengeSearch` hook polls for open global challenges + scout gap-filler injection while browsing. Waiting phase: AvatarStack roster + realtime handoff to `challenge-start`. If the current device is the challenge's creator (`getMyChallengeStories()`), also shows the invite code (`Share.share()` to send it) and a "Cancel for everyone" button (`cancelChallenge()`) — exiting the screen normally does *not* cancel a creator's own challenge, only that explicit button does. Offline fallback to `/challenge-offline`. |
| `/challenge-scout-room` | `challenge-scout-room.tsx` | Scout waiting room. GlobePulse animation, trickle-reveal of scout joins via `initScoutSession` timeline, auto-handoff to `/challenge-start` after last join + buffer. |
| `/challenge-tournament` | `challenge-tournament.tsx` | Tournament story screen. Searching (TournamentSearchPulse) → Found (avatars + reward preview) → Join → promotion/elimination/final_win bodies. Supports both online (`getTournamentState`) and offline (`getLocalTournamentState`). Auto-search timer with 5–20s random delay. |
| `/challenge-tournament-room` | `challenge-tournament-room.tsx` | Tournament stage waiting room. TrophyPulse animation, scout join reveal (local) or poll stage state (online). Auto-proceeds to `/challenge-start`. |
| `/challenge-start` | `challenge-start.tsx` | Pre-race countdown. Receives `pendingChallengeRun` from `lib/challengeRuntime.ts`. |
| `/challenge-run` | `challenge-run.tsx` | Active challenge race. Timer, question deck, live progress tracking via `updateChallengeProgress`. |
| `/challenge-results` | `challenge-results.tsx` | Post-race scoreboard. Rank, score, time. Continue to tournament next stage or reward claim. |
| `/challenge-reward` | `challenge-reward.tsx` | Key reward claim screen. Calls `claimChallengeReward` or `claimTournamentReward`. |

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
- `SessionStateScreen` — topic/chapter complete, out of keys, rewards. Login link hidden after tabs unlock. `isOnboarding` prop (topicComplete only): replaces `REDO SESSION` with an underlined "Go to home page" link — no redo/retake offered during the pre-unlock onboarding run
- `WatchAdPromptSheet` — **Android**: `showRewardedForSession()` then reward step; grant on **Unlock** tap (`grantBonusKey`), not on ad complete. **Web**: skip ad → `DownloadAppModal` (`source="ads"`)
- `KeyRewardSuccessModal` / `KeyRewardContent`
- `WatchingAdContent` — in-page AdSense + timer; **not wired** from WatchAdPromptSheet today
- `CheckButton`, `DownloadingScreen`, `FeedbackSheet`, `FlagIcon`, `LearnMoreSheet`, `QuitConfirmSheet`

### Challenge

- `StoryCarousel.tsx` — Horizontal swipeable story cards for challenge browsing (offline/online/tournament). `useIsFocused` from `@react-navigation/native` (not `expo-router`, which doesn't export it — that mismatch previously crashed with no error boundary; both are now in place, see `AppErrorBoundary.tsx`).
- `AvatarStack.tsx` — Overlapping avatar row with `+N` overflow. Used in challenge/tournament waiting rooms.

### Landing / Home

Landing lives in `components/landing/` (not `home/`):

- `LandingScreen` — 2-col Skills Corner; merges DB catalog with `LANDING_SKILLS`; `bottomPadding`
- `SkillGridCard`, `SkillCard`, `LandingIllustration`, `CarouselDots` (unused by grid)
- `LearningStyleScreen`, `ModeCard`, `TrackDetailScreen`, `ModeSwitcherSheet` (`groupTrackOptions` for `groupId`/`groupTitle`)

`components/home/SkillProgressCard.tsx` — Home tab only. `% Complete` uses `FontFamily.regular`.

`components/home/ChallengeCornerCard.tsx` — Home tab card linking to `/challenge-corner`. Horizontal gradient pill (`#CDECB1 → #8AD68E`), key icon, "Join Challenges / for **Extra Keys**" (orange highlight), chevron.

### Onboarding

`components/onboarding/` — pre-unlock only, rendered from `app/index.tsx` RootGate before `SkillsFlow`:

- `GetStartedScreen.tsx` — logo (`assets/images/icon-dark.png`) + "Learn with Questions" heading + `FlashcardStack` + `Get Started` button (`Button`, `uppercase={false}`). `onGetStarted` just advances RootGate's local stage into `SkillsFlow`; does not itself touch `@play/tabs_unlocked`.
- `FlashcardStack.tsx` — 3 hardcoded decorative cards (teal/green/orange gradients), no images/sourced content. Center card static; side cards start stacked exactly behind it and animate outward on mount via Reanimated (`withDelay` 400ms + `withTiming` 1100ms, ease-out — deliberately slow, not snappy).

### Nav

- `FloatingTabBar` — Reanimated spring pill
- `AppHeader` — initials avatar, name, gear → `/settings`
- `ScreenTransition` — web route slide; `lib/navDirection.ts`

### Play

- `SkillsFlow` — stages `landing | learning-style | track-detail | downloading | session`. `standalone` skips landing when `params.skill` is set. `isOnboarding` prop (default `false`) forwards to `PlaySession`. Exit → `/(tabs)/home` if tabs unlocked
- `PlaySession` — spend keys, decks, mode switcher, `XP_PER_CORRECT = 5`, `recordXpEarned` + `recordActivityToday` on topic complete, `markTopicCompleted` / `markTrackCompleted`. `isOnboarding` prop forwards to `SessionStateScreen` and, on `topicComplete`, swaps `onSecondaryPress` from `handleRedoSession` to `onExit`

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
| `billing.ts` | Paystack checkout, `getSubscriptionInfo`, `enforceLocalExpiry` / `configureBilling`; on success also calls `linkDeviceToEmail()` and stamps `device_id` on `play_purchases` |
| `restore.ts` | Email/Google restore; `logoutAccount` |
| `email.ts` | Validate + truncate |
| `ads.ts` | Android AdMob rewarded only; non-Android → `'unavailable'` |
| `adSettings.ts` | Ad frequency/cooldown config for challenge screens |
| `webRewardedAd.ts` | `adBreak` rewarded; **unused by WatchAdPromptSheet** |
| `notifications.ts` | Web Notification API + `public/sw.js` |
| `progress.ts` | Per-skill topics/tracks + tabs unlock; `play_progress` keyed `(email, skill_id)`; `syncAllProgressWithCloud()` batches every skill into one query, max-wins merge, called from `LandingScreen`'s mount effect when an email is already linked |
| `mistakes.ts` | `@play/mistakes:${skillId}` + `play_question_attempts` |
| `xp.ts` | `@play/total_xp`, `@play/xp:${skillId}`, `play_user_stats` |
| `streak.ts` | `@play/activity_dates` |
| `leagues.ts` | 11 lifetime-XP bands of 500 |
| `leaderboard.ts` | Current user + mock peers in-band |
| `help.ts` | Topics + `help_requests` insert |
| `deviceId.ts` | Anonymous per-device UUID, persisted in `AsyncStorage` -- not a hardware fingerprint/IDFA/GAID; see `userdata.md` §5 |
| `deviceAnalytics.ts` | Anonymous pre-email checkpoints (`landing_page_seen` / `topic_loading_started` / `session_started` / `topic_complete` / `paywall_seen`) -> `play_devices` + `play_device_events`; offline queue (`AsyncStorage`) when writes fail, flushed on reconnect via `backup.ts`'s NetInfo listener; see `userdata.md` §5 and `docs/device-tracking-plan.md` |
| `navDirection.ts` | `navPush` / `navBack` / `navReplace` |
| **`challenges.ts`** | **Online + private challenges — device-id RPCs on `play_challenges` / `play_challenge_members`. Create (returns `{ challengeId, inviteCode }`), join by global browse or by `joinChallengeByCode()`, start, leave, `cancelChallenge()` (creator-only, cancels for everyone while still waiting), submit results, claim rewards, subscribe to status changes, get open global challenges.** |
| **`tournaments.ts`** | **Tournaments — device-id RPCs on `play_tournaments` / `play_tournament_members`. Create (returns `{ tournamentId, inviteCode }`), join, `joinTournamentByCode()` (optional email lock), poll state (lazy bracket advance), claim podium rewards. `play_`-prefixed RPCs mirror `challenges.ts`'s invite-code pattern.** |
| **`challengeCompanions.ts`** | **Offline companion challenge generation. Deterministic persona pool, topic-weighted matchmaking, 3-challenge batches per `StoryCarousel` page.** |
| **`challengeCompanionSession.ts`** | **Module-level singleton for an active companion race session. Init/start/stop lifecycle, simulated opponent progress, join timeline for waiting-room reveals.** |
| **`challengeScouts.ts`** | **Scout persona pool + generation. `generateScoutChallenge()` picks a curriculum topic, assigns scout opponents with randomized difficulty. `pickRandomScouts()` for field-fill.** |
| **`challengeScoutSession.ts`** | **Module-level singleton for an active scout race session. Same init/start/stop pattern as companion session but for scout opponents.** |
| **`challengeScoutTournamentSession.ts`** | **Fully OFFLINE scout-sourced tournament bracket. `createLocalScoutTournament()`, stage pool management, `recordLocalStageResult()` for bracket advancement, `claimLocalTournamentReward()`. `pickHeadlineTopicTitle()` shared by both online and offline tournament creation.** |
| **`challengeQuestions.ts`** | **`buildChallengeQuestions()` — loads curriculum JSON, filters by topic index, shuffles with seed for deterministic question sets across all challenge participants.** |
| **`challengeRuntime.ts`** | **`setPendingChallengeRun()` / `getFinishedChallengeRun()` — bridge between waiting rooms and the race screen. Stores questions, origin, difficulty, curriculum info.** |
| **`challengeTimerSettings.ts`** | **Per-question timer config for challenge races. Difficulty-based defaults.** |

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

`@play/progress:${skillId}`, `@play/completed_tracks:${skillId}`, `@play/tabs_unlocked`. First `markTopicCompleted` unlocks tabs permanently. `unlockTabsIfNeeded` is **not** exported (internal). Both `markTopicCompleted` and `markTrackCompleted` upsert `play_progress` (composite key `email, skill_id`, includes `completed_tracks` jsonb) when an email is linked. Cross-device restore goes through `syncAllProgressWithCloud(email, skillIds[])` — one query for every skill, max-wins merge on topics and a union on tracks, never regresses either side. `syncProgressWithCloud(email, skillId)` still exists as a single-skill wrapper around it (used by `restore.ts`). `LandingScreen` calls the batched version automatically on mount once the catalog resolves, if `@play/user_email` is already set — this is the auto-restore-on-launch path, no explicit connectivity check (fails silently offline like everything else).

---

## 10. Hooks (`hooks/`)

**`useKeys`** — `balance`, `isPremium`, `resetAt`, `isOutOfKeys` (`!isPremium && balance <= 0`). Polls while depleted (skipped if premium).

**`useScrollHint`** — content taller than viewport; bouncing chevron.

**`useChallengeSearch`** — Polls `getOpenGlobalChallenges()` on interval. Injects scout gap-filler challenges when no real ones appear after a configurable delay. Returns `{ challenges, loading, refresh }` for the online challenge screen.

**`useChallengeCompanionSession`** — Subscribes to `challengeCompanionSession`'s module-level state changes. Returns snapshot of active session for UI rendering.

**`useChallengeScoutSession`** — Subscribes to `challengeScoutSession`'s module-level state changes. Returns snapshot.

**`useOnline`** — Simple connectivity check hook (`NetInfo`). Returns `isOnline` boolean used by challenge screens to decide online vs offline paths.

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
- `play_devices.sql` / `play_device_events.sql` — anonymous pre-email device tracking (device state + append-only checkpoint log); see `userdata.md` §5
- `play_device_events_add_loading_started.sql` — adds `topic_loading_started` to the `event_type` check constraint
- `play_device_events_add_paywall_seen.sql` — adds `paywall_seen` to the `event_type` check constraint
- `fix_play_signs_rls.sql`, `reset_signs_fresh.sql`

#### Challenge Corner tables + RPCs

| SQL file | Purpose |
|----------|--------|
| `play_challenges.sql` | `play_challenges` table — uuid PK, `curriculum_slug`, `seed`, `question_count`, `is_global`, `tournament_id` FK, `status` check, `deadline_at`, `invite_code` (added by `play_challenge_invite_code.sql`). RLS enabled, deny-all direct access. |
| `play_challenge_members.sql` | `play_challenge_members` table — composite PK `(challenge_id, device_id)`, `status`, `is_creator`, `display_name`, `score`/`time_ms`/`finished_at`, `reward_keys`, `claimed`. |
| `play_tournaments.sql` | `play_tournaments` table — uuid PK, `curriculum_slug`, `tier` (small/mid/large), `status` (group_stage/knockout/final/ended/cancelled), `current_stage`, `stage_count`, `source_challenge_id` FK, `topic_title`, `curriculum_title`. Closes circular FK from `play_challenges.tournament_id`. |
| `play_tournament_members.sql` | `play_tournament_members` table — composite PK `(tournament_id, device_id)`, `status` (active/eliminated/placed), `placement`, `reward_keys`, `claimed`. |
| `play_tournament_invites.sql` | Adds `invite_code` / `invite_email` / `expires_at` to `play_tournaments` + `generate_play_invite_code()` (6-char, uppercase, no ambiguous chars, retries on collision against `play_tournaments`). |
| `play_tournament_join_by_code.sql` | Redefines `play_create_tournament` to return `(tournament_id, invite_code)`; adds `play_join_tournament_by_code` (code + optional email-lock check → joins current stage's pool); redefines `play_tournament_state` to include `invite_code`. |
| `play_challenge_invite_code.sql` | Friend-challenge counterpart to the two files above, scoped to `play_challenges` instead of `play_tournaments`. Adds `invite_code` column + `generate_play_challenge_invite_code()` (own collision check, independent of the tournament codes). Redefines `play_create_challenge` to return `(challenge_id, invite_code)`. Adds `play_join_challenge_by_code` (mirrors `play_join_tournament_by_code`'s result shape: `joined` / `started` / `already` / `not_found` / `ineligible`). Adds `play_cancel_challenge` (creator-only, only while `status='waiting'`, sets `status='cancelled'` — distinct from `play_leave_challenge`, which only cancels as a side-effect of the creator leaving). Redefines `play_my_challenge_stories` and `play_challenge_state` to surface `invite_code` (creator-only in both — null for other members). |
| `play_challenge_rpcs.sql` | **14 SECURITY DEFINER RPC functions** for challenges: `play_create_challenge`, `play_my_challenge_stories`, `play_join_global_challenge`, `play_start_challenge`, `play_leave_challenge`, `play_mark_challenge_absent`, `play_submit_challenge_result`, `play_update_challenge_progress`, `play_mark_challenge_results_viewed`, `play_end_challenge`, `play_claim_challenge_reward`, `play_challenge_members_list`, `play_challenge_state`, `play_open_global_challenges`. (`play_create_challenge`, `play_my_challenge_stories`, `play_challenge_state` are since redefined by `play_challenge_invite_code.sql` — apply that file after this one.) |
| `play_tournament_rpcs.sql` | **7 SECURITY DEFINER RPC functions** for tournaments: `play_create_tournament` (field size → tier/stage calc, creates stage-1 challenge), `play_find_tournament_by_challenge`, `play_join_tournament`, `play_tournament_state` (lazy bracket read), `play_tournament_stage_state`, `play_advance_tournament_stage` (eliminate bottom half, create next stage challenge or assign final placements), `play_claim_tournament_reward`. (`play_create_tournament` and `play_tournament_state` are since redefined by `play_tournament_join_by_code.sql`.) |

All RPC functions use `SECURITY DEFINER` — the client (`anon` role) never touches the tables directly. Same pattern as every other `play_*` table.

Other tables (`play_curricula`, `play_signs`, `play_progress`, `play_user_stats`, `play_question_attempts`, `play_devices`, `play_device_events`, `help_requests`) are used in app code; full column inventory is in `userdata.md`.

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
    ├── index RootGate → logo splash → GetStartedScreen → SkillsFlow isOnboarding  OR  Redirect /(tabs)/home
    ├── (tabs) + FloatingTabBar
    │   ├── home: AppHeader + SkillProgressCard* + ChallengeCornerCard
    │   ├── skills: AppHeader + LandingScreen
    │   ├── keys: AppHeader + Premium card | KeysOptionsContent
    │   └── reports: AppHeader + StatCards + WeekCalendarRow + LeaguePanel + SkillReportCard*
    ├── play: SkillsFlow standalone
    ├── challenge-corner → challenge-create | challenge-online | challenge-offline | challenge-tournament
    │   ├── challenge-scout-room → challenge-start → challenge-run → challenge-results → challenge-reward
    │   ├── challenge-tournament → challenge-tournament-room → challenge-start → ...
    │   └── (all challenge screens share the same run→results→reward tail)
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

### Challenge Corner data flow

```
challenge-corner (menu)
  ├── Add → challenge-create → createChallenge() RPC (global or private+code) → challenge-online (waiting room, as creator)
  ├── Join with a Code → challenge-tournament-join → joinChallengeByCode() then joinTournamentByCode()
  │     → challenge-online (challengeId) OR challenge-tournament-room (tournamentId)
  ├── Online → challenge-online → useChallengeSearch (poll + scout gap-filler)
  │     → waiting room (roster; creator: invite code + cancel-for-everyone)
  │     → challenge-scout-room (scout join reveal, when a scout gap-filler was injected) → challenge-start → challenge-run
  │     → challenge-results → challenge-reward (claimChallengeReward)
  ├── Offline → challenge-offline → generateCompanionChallenges()
  │     → initCompanionSession → challenge-start → challenge-run
  │     → challenge-results → challenge-reward
  └── Tournaments → challenge-tournament
        → searching (TournamentSearchPulse, 5-20s auto-found)
        → ready (Join Tournament)
        → challenge-tournament-room (TrophyPulse, scout/online join reveal)
        → challenge-start → challenge-run → challenge-results
        → back to challenge-tournament (promotion → Continue / elimination → Got It / final_win → Collect Reward)

Offline tournaments use challengeScoutTournamentSession.ts (module-level singleton).
Online tournaments use lib/tournaments.ts RPCs → play_tournaments / play_tournament_members.
Both share the same challenge-run engine (challengeRuntime.ts bridge).

Invite codes are two independent namespaces (play_challenges.invite_code vs
play_tournaments.invite_code) — challenge-tournament-join.tsx tries the
challenge lookup first (no email prompt) and only falls back to the
tournament lookup on a genuine "no such code" miss.
```

### Known doc vs product caveats

- `userdata.md` still says +10 XP in one place; **code is +5** (`XP_PER_CORRECT`)
- Settings Help URL vs leftover `/help` routes
- `webRewardedAd` / `WatchingAdContent` / AdSense unit are **not** on the live Watch Ad path
- Football conversion is **not** a shipped landing skill
- League names in UI must match `lib/leagues.ts` (gemstone ladder), not a Bronze/Silver/Gold set
- `play_challenge_invite_code.sql` is written to the repo but **not yet applied** to the live Supabase project as of 2026-09-10 — `createChallenge()`, `joinChallengeByCode()`, `cancelChallenge()`, and the invite-code UI in `challenge-online.tsx` / `challenge-create.tsx` will not work until it's run

---

*End of documentation.*
