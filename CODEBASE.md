# PataSkills Play — Master Codebase Documentation

> **Generated**: 2026-09-01 · **Last updated**: 2026-09-05 (d) — this pass updates documentation to reflect the dynamic JSON-driven learning tracks system, multi-skill routing, and per-curriculum customization: **(1)** JSON-driven track definitions (`CurriculumTrackDefinition` in `types/quiz.ts`) allowing curricula to define arbitrary track IDs, custom titles, filtering rules (`filterRole`, `filterFormat`, `kind`), and custom icons directly in curriculum JSON without code changes; **(2)** Dynamic track detection (`detectAvailableTracks`/`getAvailableTracks`/`getCurriculumTrackDefs` in `lib/curriculum.ts`) supporting both custom JSON tracks and legacy question `role`/sign auto-detection with 100% backward compatibility; **(3)** Deduplicated cache (`loadCurriculumCached`) ensuring a single in-flight network promise shared across `getTrackTotals()`, `getAvailableTracks()`, and `getCurriculumTrackDefs()`; **(4)** `constants/trackOptions.ts` dynamic builders (`getTrackOptionsForSkill`, `getTrackOption`) prioritizing skill overrides → JSON `trackDef.title` → default labels; **(5)** `LearningStyleScreen`, `TrackDetailScreen`, and `ModeSwitcherSheet` updated to consume dynamic tracks and track definitions; **(6)** Multi-skill catalog in `constants/skills.ts` and deep linking in `app/index.tsx` supporting custom track IDs. · **Scope**: Every file inside `PataProducts/play/` · **Method**: Direct inspection of every file listed in §2 — verified against active source code and `tsc` typecheck.

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

**PataSkills Play** is a mobile-first quiz application built with **Expo** (React Native) targeting iOS, Android, and web. Its curriculum is **Driving Theory** — practicing highway-code questions about road-sign identification. Curriculum and sign images are fetched from a **Supabase** backend at runtime; questions are presented in a swipeable card deck; continued play is gated behind a consumable **"keys"** system.

Since the previous documentation pass, three large areas were built out that this update captures for the first time:

1. **Landing flow redesign** — the single-page track picker was replaced by a three-stage flow: a "Skills Corner" 2-column grid (`LandingScreen`) → a full-page learning-style list (`LearningStyleScreen`) → a full-page single-track preview (`TrackDetailScreen`) → download. Switching modes mid-session (after a topic completes) reuses the same track list via a bottom sheet, `ModeSwitcherSheet`.
2. **A real monetization stack** — a tiered keys economy with escalating cooldowns, a premium "Unlimited Pass" subscription, one-time key packs, rewarded-ad bonus sessions, and account restore/sync via email or Google — checkout runs through **Paystack** (web-embedded), not RevenueCat or a native IAP SDK.
3. **Learning Tracks and Reading Mode** (still current) — the same question bank filtered/regrouped client-side into **Pairs** (default) / **Names** / **Meanings** / **Where Used** / **Full course** / **Reading** (non-quiz, browse-only). See [§16 Docs](#16-docs-docs) for the original feature spec.

### Core User Flow

```
Landing Screen (skills grid)
  → Learning Style Screen (pick a track)
    → Track Detail Screen (preview + Start Practice)
      → Download Session (track-aware)
        → Play Session (Card Deck: Quiz or Reading)
          → Topic Complete
            → Next Session, or Out of Keys (buy keys / subscribe / free-trial timer / watch ad)
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
│   ├── index.tsx                      # Home page — 5-stage flow (landing/learning-style/track-detail/downloading/session)
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
│   │   ├── CardDeck.tsx               # Router: QuizCardDeck (quiz flow) or ReadingCardDeck (browse flow)
│   │   ├── ReadingCard.tsx            # Reading Mode card — sign image, name, meaning, explanation
│   │   ├── ScrollHintChevron.tsx      # Shared bouncing "more content below" chevron
│   │   └── TwoImageCard.tsx           # Individual quiz card (3 layout types)
│   ├── feedback/
│   │   ├── CheckButton.tsx            # "CHECK" / "GOT IT" button with feedback animation
│   │   ├── DownloadingScreen.tsx      # Loading screen with bouncing dots
│   │   ├── FeedbackSheet.tsx          # Correct/Not-quite bottom sheet
│   │   ├── FlagIcon.tsx               # Flag-a-question toggle button
│   │   ├── KeyRewardSuccessModal.tsx  # "+1 key" reward screen (bare content + standalone modal wrapper)
│   │   ├── LearnMoreSheet.tsx         # Explanation bottom sheet — backed by the signs catalog
│   │   ├── QuitConfirmSheet.tsx       # "Are you sure?" quit confirmation
│   │   ├── SessionStateScreen.tsx     # Multi-purpose interstitial screen, incl. scrollable Out-of-Keys screen
│   │   └── WatchAdPromptSheet.tsx     # "Watch an ad for +1 session?" sheet, chains into KeyRewardSuccessModal
│   ├── landing/
│   │   ├── CarouselDots.tsx           # Animated pager dots (currently unused by LandingScreen's grid)
│   │   ├── LandingIllustration.tsx    # Remote cover image component
│   │   ├── LandingScreen.tsx          # Entry screen — 2-column "Skills Corner" grid
│   │   ├── LearningStyleScreen.tsx    # Full-page track/mode list (reuses ModeCard)
│   │   ├── ModeCard.tsx               # One learning-mode row (illustration, title, plain-text status label, progress bar, "N questions" count)
│   │   ├── ModeSwitcherSheet.tsx      # Bottom sheet: switch track mid-flow, or "N/6 tracks complete" on trackComplete
│   │   ├── SkillCard.tsx              # Bordered skill card w/ progress + CTA (currently unused — see LandingScreen note)
│   │   ├── SkillGridCard.tsx          # Compact grid-cell skill card (used by LandingScreen)
│   │   └── TrackDetailScreen.tsx      # Full-page single-track preview + "Start Practice" CTA
│   ├── nav/
│   │   └── ScreenTransition.tsx       # Web-only slide-in wrapper for standalone app/ routes (pairs with lib/navDirection.ts)
│   ├── play/
│   │   └── PlaySession.tsx            # Session orchestrator (keys, flow states, quiz-vs-reading branch, mode switcher)
│   └── ui/
│       ├── Button.tsx                 # Shared CTA pill button (solid/gradient/outline) — every full-width button in the app
│       ├── ConnectionError.tsx        # "App can't connect" full-screen state + RELOAD button
│       └── Toggle.tsx                 # Small animated switch (used by the reminders toggle)
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
│   └── trackOptions.ts                # getTrackOptionsForSkill / getTrackOption — single source of truth for mode list & visuals
│
├── theme/
│   ├── ThemeContext.tsx                # React context: dark/light/auto theme
│   └── tokens.ts                      # Re-export barrel for design tokens
│
├── lib/
│   ├── supabase.ts                    # Supabase client singleton
│   ├── curriculum.ts                  # Fetch curriculum JSON + signs catalog; deriveTrack()
│   ├── downloadSession.ts             # Orchestrate full session download (track-aware)
│   ├── keys.ts                        # Keys balance: read/write/spend/reset/premium, escalating cooldown tiers
│   ├── premium.ts                     # PLANS (subscription tiers) + KEY_PACKS catalog & pricing display
│   ├── currency.ts                    # USD/KES conversion + formatting helpers
│   ├── billing.ts                     # Paystack web checkout — purchasePlan() / purchaseKeyPack()
│   ├── restore.ts                     # Account restore/link by email or Google, play_accounts sync
│   ├── email.ts                       # Email sanitize/validate + display truncation
│   ├── ads.ts                         # Rewarded-ad bonus session (react-native-google-mobile-ads, optional; web fallback timer)
│   ├── notifications.ts               # Browser Notification API reset-timer reminder (web only)
│   ├── progress.ts                    # Local (+cloud-synced) topic progress AND per-track completion tracking
│   ├── signs.ts                       # Fetch sign assets & sign pairs from DB
│   └── navDirection.ts                # Explicit web slide-direction flag (navPush/navBack/navReplace) for ScreenTransition
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

### `index.tsx` — Home Page / Entry Point

A **five-stage** state machine (`Stage = 'landing' | 'learning-style' | 'track-detail' | 'downloading' | 'session'`), a significant expansion from the old three-stage version:

| Stage | Component | Reached from |
|-------|-----------|---------------|
| `landing` | `LandingScreen` | Initial load, or exiting a session |
| `learning-style` | `LearningStyleScreen` | Tapping a skill card |
| `track-detail` | `TrackDetailScreen` | Picking a track on Learning Style, or a `?track=` deep link straight from Landing |
| `downloading` | `DownloadingScreen` | Tapping "Start Practice" |
| `session` | `PlaySession` | Successful download |

**Stage transitions are animated** — each stage renders inside an `Animated.View` keyed by `stage`, sliding in from the right (`stageDirection === 'forward'`) or left (`'backward'`) via Reanimated's `SlideInRight`/`SlideInLeft`, always exiting with a plain `FadeOut` (a directional slide-out would read the *previous* transition's direction, since it's stale by one render whenever direction flips).

**Track-detail origin tracking** — `TrackDetailOrigin = 'landing' | 'learning-style'` records where the preview was opened from, so the back button returns to the right place AND so starting practice from a Landing-originated deep link (no explicit style ever chosen) is flagged `deepLinked` for `PlaySession` (drives whether "Continue" always reopens the mode switcher).

**Track and skill resolution:** `VALID_TRACKS = ['pairs', 'names', 'meanings', 'whereUsed', 'full', 'reading']`; `parseTrack()` validates the `?track=` param, accepting any non-empty track string (including custom JSON-defined tracks like `?track=image-identification` or standard tracks) or returning `null`; while `parseSkill()` validates `?skill=` against `LANDING_SKILLS` (defaulting to `DEFAULT_SKILL = 'driving-theory'`).

**Auto-start on mount:**
- `?resume=true` (returning from checkout) → `runDownload(urlTrack ?? 'full', deepLinked: true, urlSkill ?? DEFAULT_SKILL)`, skipping straight to a session.
- A bare `?track=` (ad link) → opens Track Detail directly (`openTrackDetail(urlTrack, 'landing')`), skipping the grid and style list but still showing the preview + CTA.
- Otherwise → starts on `LandingScreen`.

**`runDownload(track, deepLinked, skillOverride?)`** — sets stage to `downloading`, calls `downloadSession(track, skill, onProgress)`, supports topic-level deep linking (`?topic=`) by advancing directly to the session containing that topicId, enforces a **minimum 2000ms** loading time (`MIN_LOADING_MS`) even on a fast/cached response so the loading beat doesn't flash, then moves to `session` on success or leaves the error on the downloading screen for RETRY.

**Exit** (`handleExit`) resets everything — `sessions`, `signCatalog`, `error`, `progress` — and returns to `landing`.

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
Unchanged in shape from the prior audit — routes to `ReadingCardDeck` when `props.signs` is a non-empty array, else `QuizCardDeck`. See prior structure: top bar (close/progress/keys), card viewport, bottom controls, overlay sheets for quiz mode; simpler linear `ScrollView` advance with no answer machinery for reading mode. Both now share scroll-hint logic via the `useScrollHint()` hook and `ScrollHintChevron` component (see §10/§6.2 below) rather than each deck owning its own bounce animation.

#### `ScrollHintChevron.tsx` (new)
Extracted, deck-agnostic presentational component: a small bouncing chevron pill shown when `visible`, tapping it calls `onPress` (wired to `useScrollHint()`'s `scrollToBottom`). Both `QuizCardDeck` and `ReadingCardDeck` render one instance each, driven by their own `useScrollHint()` hook instance.

#### `ReadingCard.tsx` / `TwoImageCard.tsx`
Unchanged from the prior audit — see that section's detail on layout types, gradient headers, and `RoadSignGraphic` SVG fallbacks.

---

### 6.3 Feedback

#### `SessionStateScreen.tsx` — now with a scrollable Out-of-Keys screen
Still the multi-purpose interstitial keyed by `SessionStateKind`, but the `outOfKeys` branch has changed substantially:

- **Scrollable** — the close button, title, and all three proceed options (buy keys / subscribe / free trial + reminders toggle + login link) now render inside a `ScrollView` (`styles.proceedScroll` / `proceedContent`), with the CONTINUE button pinned outside it in a fixed `actions` View. Previously this was a single fixed `View` with no scroll container, so short screens clipped content under the button — fixed 2026-09-05.
- **Three proceed options**, each a selectable card (`selectedProceedOption: 'keys' | 'unlimited' | 'trial'`):
  - **Buy one-time keys** → `handleBuyKeys()` → `onBuyKeysPress?.() ?? router.push('/keys-packs')`
  - **Subscribe for Unlimited** → `handleSubscribe()` → `onSubscribePress?.() ?? router.push('/subscription-plans')`
  - **Use Free trial** → shows a live countdown (`timerText`, ticking every second off `resetAt`) and a reminders `Toggle` that calls `ensureNotificationPermission()` + `scheduleResetReminder(resetAt)` from `lib/notifications.ts` when enabled, persisting the preference to `@play/timer_reminders`.
- **CONTINUE** routes based on `selectedProceedOption` via `handleProceedContinue()`; the `trial` option instead pushes `/how-free-mode-works`.
- **Restore/login link** at the bottom opens `RestoreAccountModal`; a successful restore calls `onPrimaryPress?.() ?? router.replace('/', { resume: 'true' })`.
- **Exit interception** — the X button no longer closes directly; it opens `WatchAdPromptSheet` (`handleAttemptExit`) offering a bonus session before letting the learner leave.

The non-`outOfKeys` branch (topicComplete/chapterComplete/sessionUnlocked/keysReset/rewardUnlocked/shareApp/rateApp) is otherwise as previously documented.

#### `WatchAdPromptSheet.tsx` (new)
Shown when the learner tries to exit while out of keys. Renders **one** native `<Modal>` whose content switches between two internal steps (`'prompt' | 'reward'`) rather than mounting/unmounting two separate Modals — doing the latter caused Android to visually squash the transition and sometimes auto-dismiss the reward screen before the user could tap anything (documented in an inline comment as a real bug fix, not a hypothetical).

- **`prompt` step** — "Watch an ad for an extra session?" with a WATCH AD button (`showRewardedForSession()` from `lib/ads.ts`) and a "Go to Home" dismiss.
- **`reward` step** — renders `KeyRewardContent` (see below). The bonus key is granted only when the learner taps "Unlock Next Session" on this screen (`grantBonusKey(1, 'ad_reward')`), deliberately **not** the moment the ad finishes — granting it earlier let `useKeys`'s background balance poll flip `isOutOfKeys` to false while this screen was still showing, auto-advancing the app past the reward screen before the learner could interact with it.

#### `KeyRewardSuccessModal.tsx` (new)
Exports two things:
- **`KeyRewardContent`** — bare content, no `<Modal>` wrapper. This is what `WatchAdPromptSheet` embeds as its `reward` step.
- **`KeyRewardSuccessModal`** — a thin wrapper that puts `KeyRewardContent` inside its own opaque `<Modal>`, kept for any caller wanting a fully self-contained modal (not used by `WatchAdPromptSheet` itself anymore).

Layout: "Your key reward is ready!" title, a large "1" + key illustration, subtitle, and an "Unlock Next Session" pill button.

#### `CheckButton.tsx` / `DownloadingScreen.tsx` / `FeedbackSheet.tsx` / `FlagIcon.tsx` / `LearnMoreSheet.tsx` / `QuitConfirmSheet.tsx`
Unchanged from the prior audit.

---

### 6.4 Landing (substantially rebuilt)

The single `LandingScreen` "skill pager + mode picker" described in the prior audit **no longer exists in that shape**. The flow is now three separate screens plus a bottom sheet, each a standalone file:

#### `LandingScreen.tsx` — "Skills Corner" grid
A 2-column grid of `SkillGridCard`s (compact — title + remote cover image, no progress bar, no CTA button; the whole card is the tap target) below a "Skills Corner" heading, mapped directly from `LANDING_SKILLS` (`driving-theory`, `world-facts`), plus a bottom "Existing user, login" link that opens `RestoreAccountModal`. Tapping any card calls `onStart(skill.id)` passing the selected `CurriculumSlug` so the parent advances to `LearningStyleScreen` with that skill's context.

A successful account restore (`onRestore(track)`) skips `LearningStyleScreen` entirely and opens `TrackDetailScreen` directly with `'full'` (the restoring learner already picked a track on whichever device they started on).

**`SkillCard.tsx` is currently unused** — a fuller bordered card (title, progress bar, illustration, RESUME/GET STARTED CTA) that appears to be what `LandingScreen` rendered before the grid redesign. Left in the tree; not imported anywhere as of this audit. `CarouselDots.tsx` is similarly currently unused (no pager exists to paginate) but kept for the same reason.

#### `LearningStyleScreen.tsx` — full-page track list (updated)
Back-arrow header ("Choose Learning Style") + a scrollable list of detected learning styles rendered as `ModeCard` rows:
- Receives `skillId: CurriculumSlug`.
- Dynamically fetches available tracks via `getAvailableTracks(skillId)` and custom track definitions via `getCurriculumTrackDefs(skillId)` (from `lib/curriculum.ts`), falling back to `skill.tracks` synchronously on mount.
- Resolves row models via `getTrackOptionsForSkill(skill, availableTracks, trackDefs)` (from `constants/trackOptions.ts`), automatically applying per-skill overrides or JSON-defined custom track titles and images.
- Implements synchronous state reconciliation on `skillId` changes (`prevSkillId !== skillId`) to reset tracks, definitions, and totals immediately, eliminating stale-track flashes when switching skills.
- Fetches real question counts from `getTrackTotals(skillId)`. `highlighted` falls on the first not-yet-done track (`nextUpTrack`, from `getCompletedTracks()`). Tapping a card calls `onPreviewTrack(track)`, opening `TrackDetailScreen`.

#### `TrackDetailScreen.tsx` — full-page single-track preview (updated)
Full-page single-track preview card + "Start Practice" CTA:
- Receives `skillId: CurriculumSlug` and `track: Track | null`.
- Concurrently fetches `getAvailableTracks(skillId)` and `getCurriculumTrackDefs(skillId)`. Looks up track visual and copy via `getTrackOption(skill, effectiveTrack, trackDefs)` (from `constants/trackOptions.ts`), honoring JSON titles/images and skill overrides.
- If a deep link specifies a track unsupported by the current curriculum (e.g. `pairs` for `world-facts`), it gracefully falls back to `availableTracks[0]`.
- Start Practice CTA `Button` shows a loading spinner (`loading={isLoadingTracks}`) until track availability is confirmed, preventing race conditions.
- Displays the 7-dot session progress row based on `getLocalProgress()`.

#### `ModeCard.tsx` — shared learning-mode row
Illustration + title, plus three independent optional pieces of state, not a single badge:
- `status?: 'done' | 'inProgress' | 'notStarted'` — plain coloured **text** next to the title (green "Done" / teal "In Progress" / grey "Not started"), not a badge. Omit to hide it entirely.
- `highlighted?: boolean` — a teal border/tint on the card itself, independent of `status`, marking the one row the learner should look at next (current track while in progress, or the next not-yet-done track once the current one finishes). Kept separate so a completed track is never highlighted just for sitting first in the list.
- `progress?: number` (0–1) — renders the segmented bar (`PROGRESS_SEGMENTS = 7`, matching the session chunk size). Omitted entirely hides the progress row.
- `totalQuestions?: number` — real per-track question count (from `getTrackTotals()`), rendered as a small "N questions" label next to the status text. Omitted (not just `0`) while the totals fetch hasn't resolved yet, so there's no "0 questions" flash.

Used by both `LearningStyleScreen` and `ModeSwitcherSheet` — same component, same rendering, each caller just supplies different values for these four props.

#### `ModeSwitcherSheet.tsx` — mid-flow track switcher (updated)
Bottom sheet with two heading states:
- **`'switch'`** — "Switch to a different learning style", reached from `PlaySession`'s continue-prompt when the current track came from a deep link.
- **`'trackComplete'`** — title is a dynamic fraction, `"{completedCount}/{trackOptions.length} tracks complete"`, reached automatically once every session in the current track is exhausted.

Builds options dynamically via `getTrackOptionsForSkill(skill, availableTracks, trackDefs)`:
- Initializes `availableTracks` with `skill.tracks` seeded with `currentTrack` so the active track is guaranteed present without initial UI flicker.
- Reconciles state when `skillId` changes (`prevSkillId !== skillId`).
- Concurrently fetches `getAvailableTracks(skillId)`, `getCurriculumTrackDefs(skillId)`, and `getTrackTotals(skillId)` when opened.
- Persisted completion from `getCompletedTracks()` is unioned with `currentTrack` when `heading === 'trackComplete'` to prevent a "0/N" flash before storage commits.
- Current track is moved to the front and highlighted. Tapping any option triggers `onSelectTrack(track)`.

#### `SkillGridCard.tsx` (new)
Compact 2-column grid cell — centered title, remote cover illustration below, no progress/CTA (whole card is the tap target). Cover image resolved via `getPlayAssetPublicUrl(CurriculumCoverImagePaths[skill.id])`, same source as `LandingIllustration`/`SkillCard`.

#### `CarouselDots.tsx`
Animated pager dots, borrowed from PataSkillsV2's equivalent, simplified (no 5-dot windowing — this app ships only a handful of skills). **Currently unused** (see `LandingScreen` note above).

#### `LandingIllustration.tsx`
Unchanged — driving-theory cover image from Supabase Storage, built at module-load time via `getPlayAssetPublicUrl()`.

---

### 6.5 Nav (new section — previously undocumented)

#### `ScreenTransition.tsx`
Web-only slide-in wrapper. Every standalone route in `app/` (the monetization funnel screens, explainers, etc.) renders its content inside this component. On native it's a pass-through (`if (!isWeb) return <>{children}</>`) — `app/_layout.tsx`'s `Stack` already does `animation: 'slide_from_right'` there. On web, `react-native-screens` doesn't animate native-stack transitions at all (screens just swap instantly), so `_layout.tsx` sets the Stack's own `animation: 'none'` for web and this component supplies the real animation instead: on focus, it reads a direction flag via `peekNavDirection()` (from `lib/navDirection.ts`), snaps `translateX` to ±the current window width, then animates back to 0 over 280ms.

Pairs with **`lib/navDirection.ts`** — an explicit, non-inferred direction flag:
- `navPush(router, href)` / `navBack(router)` / `navReplace(router, href, direction?)` — thin wrappers around `expo-router`'s `router.push`/`back`/`replace` that set the pending direction (`'forward'`/`'backward'`) before navigating. Every screen that navigates uses these instead of calling `router.*` directly, specifically so this flag is always accurate.
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
    id: 'world-facts',
    title: 'Test yourself with\n150 true or false\nworld facts',
    subtitle: 'World facts',
    tracks: ['full'],
  },
];
```
Defines each skill card shown on the homepage grid. `tracks` provides the synchronous fallback list before runtime detection resolves; `trackLabels` and `trackImages` allow individual curricula to override default track copy and illustration assets without modifying component logic.

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
- **Title resolution priority**:
  1. `skill.trackLabels?.[track]` (hardcoded app override)
  2. `customTrackDef?.title` (dynamic JSON-defined custom track title)
  3. `DEFAULT_TRACK_LABELS[track]` (standard built-in titles)
  4. Formatted fallback string
- **Default visuals**: `LOCAL_IMAGES` maps the 5 driving-theory tracks (`differenciate.webp`, `name.webp`, `meaning.webp`, `usage.webp`, `reading.webp`), while `full` reuses the skill's remote cover image (`CurriculumCoverImagePaths[skill.id]`). Supports custom JSON image references (`customTrackDef.image`).
- **Dynamic builder**: `getTrackOptionsForSkill(skill, tracks, customTrackDefs)` maps whichever tracks the caller provides, decorating them with titles and icons from custom definitions or defaults.
- **Fast lookup**: `getTrackOption(skill, track, customTrackDefs)` provides synchronous-like lookup with fallback defaults.

---

## 8. Theme (`theme/`)

Unchanged from the prior audit — `ThemeContext.tsx` (dark/light/auto, AsyncStorage-persisted, `useTheme()` hook) and `tokens.ts` (convenience re-export barrel).

---

## 9. Library / Data Layer (`lib/`)

### `supabase.ts` / `downloadSession.ts` / `signs.ts`
Unchanged from the prior audit — the Learning Tracks / Reading Mode work (`hydrateSignCatalog`, track-aware `downloadSession`) documented there is still current. `downloadSession` extracts optional `remote.tracks` and forwards them to `deriveTrack(hydrated, signCatalog, track, remote.tracks)`.

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

### `progress.ts` — Topic progress AND per-track completion (expanded)

**Topic progress** (unchanged from the prior audit): `getLocalProgress()` / `markTopicCompleted(topicIndex, totalTopics)` / `syncProgressWithCloud(email)`, backed by `@play/progress` and the `play_progress` Supabase table.

**Per-track completion (new)** — added specifically to back `ModeSwitcherSheet`'s real "N/6 tracks complete" count and per-row DONE state (previously that count was a hardcoded `1`):
```typescript
export async function getCompletedTracks(): Promise<Track[]>            // reads @play/completed_tracks
export async function markTrackCompleted(track: Track): Promise<Track[]> // idempotent append + persist
```
Local-only (AsyncStorage) — **not** synced to Supabase or `play_accounts` the way topic progress and keys are, so it won't survive a reinstall or show up cross-device. Flagged as a known gap, not yet requested to be closed.

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
    id: string;                    // Track ID (e.g., 'image-identification', 'pairs')
    title: string;                 // Display label in learning style list & track detail
    filterRole?: string;           // Filters questions by q.role
    filterFormat?: string;         // Filters questions by format
    kind?: 'quiz' | 'reading';     // Reading mode vs quiz card deck
    image?: string;                // Optional custom asset identifier
  }
  ```
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

`output/` now also contains `pairs-to-insert.json`, `questions.corrected.json`, `sign-corrections.json`, and two preview subfolders (`preview/`, `preview2/`) alongside the previously-documented artifacts.

---

## 14. Supabase (`supabase/`)

### `play_sign_pairs.sql`
Unchanged from the prior audit — `play_sign_pairs` table + 23 seeded pairs (groups A–E) for the DB-level image-resolution layer used by `lib/signs.ts`. See that revision for the full seed breakdown and the note distinguishing this from the curriculum JSON's own 46-pair/92-entry signs catalog.

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
Learning-mode illustrations referenced by `constants/trackOptions.ts`: `differenciate.webp`, `name.webp`, `meaning.webp`, `usage.webp`, `reading.webp` (the `full` track reuses the remote curriculum cover image instead of a local asset).

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
├── curricula/  driving.webp, questions.json ({ questions: [...322, role-tagged], signs: [...92 SignCatalogEntry] })
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

### Component Hierarchy (updated)

```
RootLayout
└── ThemeProvider
    └── RootLayoutInner
        └── Stack
            ├── PlayEntry (index.tsx)                       — 5-stage flow, reads ?track= / ?resume=
            │   ├── LandingScreen                            — Skills Corner grid
            │   │   ├── SkillGridCard (×N)
            │   │   └── RestoreAccountModal
            │   │       └── GoogleWebButton (.web.tsx on web)
            │   ├── LearningStyleScreen
            │   │   └── ModeCard (×N, detectAvailableTracks + trackOptions)
            │   ├── TrackDetailScreen                       — single-track preview (getTrackOption + getAvailableTracks)
            │   ├── DownloadingScreen
            │   └── PlaySession
            │       ├── CardDeck (router)
            │       │   ├── QuizCardDeck (kind === 'quiz')
            │       │   │   ├── TwoImageCard (×N) → RoadSignGraphic, FlagIcon
            │       │   │   ├── CheckButton ("CHECK"), ScrollHintChevron (useScrollHint)
            │       │   │   ├── LearnMoreSheet ← signCatalog
            │       │   │   ├── FeedbackSheet
            │       │   │   └── QuitConfirmSheet
            │       │   └── ReadingCardDeck (kind === 'reading')
            │       │       ├── ReadingCard, CheckButton ("GOT IT"), ScrollHintChevron
            │       │       └── QuitConfirmSheet
            │       ├── ModeSwitcherSheet ('switch' | 'trackComplete')
            │       │   └── ModeCard (×N, dynamic tracks, highlighted/DONE per real completion data)
            │       └── SessionStateScreen (various kinds)
            │           ├── outOfKeys → scrollable proceed options, Toggle (reminders)
            │           │   └── RestoreAccountModal
            │           └── WatchAdPromptSheet → KeyRewardContent
            ├── keys-packs → keys-confirm
            ├── subscription-plans → subscription-confirm
            ├── premium-benefits, how-keys-work, how-free-mode-works
            └── payment-complete
```

Every standalone route above (everything except the `PlayEntry` tree, which animates its own stages internally) renders its body inside `ScreenTransition` — web-only slide-in, paired with `navPush`/`navBack`/`navReplace` from `lib/navDirection.ts` (see §6.5).

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
