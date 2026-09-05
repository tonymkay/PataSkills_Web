# PataSkills Play — Master Codebase Documentation

> **Generated**: 2026-09-01 · **Last updated**: 2026-09-05 (full re-audit against the actual repo — the previous update, dated 2026-09-02, had drifted badly: the landing flow, keys economy, and premium/billing stack had all been rebuilt since and were undocumented) · **Scope**: Every file inside `PataProducts/play/` · **Method**: Direct inspection of every file listed in §2 — no inline comments taken on faith, no section carried over from the previous revision without re-reading the source.

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
│   │   ├── ModeCard.tsx               # One learning-mode row (illustration, title, CURRENT/DONE badge, progress bar)
│   │   ├── ModeSwitcherSheet.tsx      # Bottom sheet: switch track mid-flow, or "N/6 tracks complete" on trackComplete
│   │   ├── SkillCard.tsx              # Bordered skill card w/ progress + CTA (currently unused — see LandingScreen note)
│   │   ├── SkillGridCard.tsx          # Compact grid-cell skill card (used by LandingScreen)
│   │   └── TrackDetailScreen.tsx      # Full-page single-track preview + "Start Practice" CTA
│   ├── play/
│   │   └── PlaySession.tsx            # Session orchestrator (keys, flow states, quiz-vs-reading branch, mode switcher)
│   └── ui/
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
│   ├── skills.ts                      # LANDING_SKILLS catalog (currently one skill: driving-theory)
│   └── trackOptions.ts                # TRACK_OPTIONS — single source of truth for the learning-mode list/illustrations
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
│   └── signs.ts                       # Fetch sign assets & sign pairs from DB
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
│   └── questions.sample.json          # { questions: QuizQuestion[] (322, tagged with role), signs: SignCatalogEntry[] (92) }
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

**Track resolution:** `VALID_TRACKS = ['pairs', 'names', 'meanings', 'whereUsed', 'full', 'reading']`; `parseTrack()` validates the `?track=` param, defaulting to `'pairs'` when absent/invalid.

**Auto-start on mount:**
- `?resume=true` (returning from checkout) → `runDownload(urlTrack ?? 'pairs', deepLinked: true)`, skipping straight to a session.
- A bare `?track=` (ad link) → opens Track Detail directly (`openTrackDetail(urlTrack, 'landing')`), skipping the grid and style list but still showing the preview + CTA.
- Otherwise → starts on `LandingScreen`.

**`runDownload(track, deepLinked)`** — sets stage to `downloading`, calls `downloadSession(track, onProgress)`, enforces a **minimum 2000ms** loading time (`MIN_LOADING_MS`) even on a fast/cached response so the loading beat doesn't flash, then moves to `session` on success or leaves the error on the downloading screen for RETRY.

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
A 2-column grid of `SkillGridCard`s (compact — title + remote cover image, no progress bar, no CTA button; the whole card is the tap target) below a "Skills Corner" heading, plus a bottom "Existing user, login" link that opens `RestoreAccountModal`. Tapping any card calls `onStart()` (no track argument — the parent just advances to `LearningStyleScreen`).

**Temporary 2×2 test data:** `GRID_TEST_COUNT = 4` repeats `LANDING_SKILLS[0]` four times purely to smoke-test the grid layout with a full 2×2 — `LANDING_SKILLS` currently ships one real skill. A code comment explicitly flags this as temporary, to be removed once a second real skill exists.

A successful account restore (`onRestore(track)`) skips `LearningStyleScreen` entirely and opens `TrackDetailScreen` directly with `'pairs'` (the restoring learner already picked a track on whichever device they started on).

**`SkillCard.tsx` is currently unused** — a fuller bordered card (title, progress bar, illustration, RESUME/GET STARTED CTA) that appears to be what `LandingScreen` rendered before the grid redesign. Left in the tree; not imported anywhere as of this audit. `CarouselDots.tsx` is similarly currently unused (no pager exists to paginate) but kept for the same reason.

#### `LearningStyleScreen.tsx` — full-page track list (new)
Back-arrow header ("Choose Learning Style") + a scrollable list of every `TRACK_OPTIONS` entry as a `ModeCard` (no highlighting — nothing is "current" yet, since no track has been picked this flow). Tapping a card calls `onPreviewTrack(track)`, which the parent (`index.tsx`) wires to open `TrackDetailScreen`.

#### `TrackDetailScreen.tsx` — full-page single-track preview (new)
Replaces what an inline comment calls a former `TrackDetailSheet` (bottom sheet) — moved to a full page so mobile-browser toolbar quirks can't clip the CTA the way a fixed-position sheet could. Shows the track's title + illustration (from `TRACK_OPTIONS`) inside a bordered card, a 7-dot progress row (reusing the same shared/global `getLocalProgress()` percentage every other progress indicator in the app uses — there's still no true per-track progress here, only the one global topic counter), and a gradient "Start Practice" CTA pinned at the bottom that calls `onStartPractice(track)`.

#### `ModeCard.tsx` — shared learning-mode row
Illustration + title, optional `status` (`'current'` teal border/"CURRENT" badge, or `'done'` muted border/"✓ DONE" badge), and an optional segmented progress bar (`PROGRESS_SEGMENTS = 7`, matching the session chunk size) rendered whenever a `progress` number (0–1) is passed — used by `LearningStyleScreen` (no status/progress), and `ModeSwitcherSheet` (full status + progress logic).

#### `ModeSwitcherSheet.tsx` — mid-flow track switcher (new)
Bottom sheet with two heading states:
- **`'switch'`** — "Switch to a different learning style", reached from `PlaySession`'s continue-prompt when the current track came from a deep link.
- **`'trackComplete'`** — title is a **fraction**, `"{completedCount}/{TRACK_OPTIONS.length} tracks complete"`, reached automatically once every session in the current track is exhausted.

The current track is always reordered to the front of the list and highlighted. Per-track completion is real, persisted data — not a placeholder count:
- `lib/progress.ts`'s `getCompletedTracks()`/`markTrackCompleted()` (AsyncStorage-backed, idempotent) track which tracks have actually been exhausted, across all skills.
- `PlaySession.tsx` calls `markTrackCompleted(track)` at the exact moment a track runs out of topics (`handleNextPress`'s `!hasMoreSessions` branch) — the one place that fact is known for certain.
- The sheet unions the persisted set with the current track whenever `heading === 'trackComplete'` fires, so the just-finished track counts immediately even before its async AsyncStorage write has landed (avoids a "0/6" flash).
- Every row (not just the current one) reflects this same completed set — a previously-finished track shows a real "DONE" badge and a full progress bar, not a hardcoded 0%.

#### `SkillGridCard.tsx` (new)
Compact 2-column grid cell — centered title, remote cover illustration below, no progress/CTA (whole card is the tap target). Cover image resolved via `getPlayAssetPublicUrl(CurriculumCoverImagePaths[skill.id])`, same source as `LandingIllustration`/`SkillCard`.

#### `CarouselDots.tsx`
Animated pager dots, borrowed from PataSkillsV2's equivalent, simplified (no 5-dot windowing — this app ships only a handful of skills). **Currently unused** (see `LandingScreen` note above).

#### `LandingIllustration.tsx`
Unchanged — driving-theory cover image from Supabase Storage, built at module-load time via `getPlayAssetPublicUrl()`.

---

### 6.5 Play

#### `PlaySession.tsx` — Session Flow Orchestrator
Core key-economy state machine is unchanged in shape from the prior audit (playing → topicComplete → advanceToNextSession → sessionUnlocked/outOfKeys → keysReset → sessionUnlocked), still branches its render on `currentSession.kind` for quiz vs. reading. What's new since the last audit:

- **`markTrackCompleted(track)`** is now called the moment `!hasMoreSessions` is detected (before opening `ModeSwitcherSheet` with the `trackComplete` heading) — the persistence hook that makes `ModeSwitcherSheet`'s "N/6 tracks complete" real (see §6.4 above).
- **`deepLinked` prop** now genuinely varies per-track-detail-origin (see `index.tsx`'s `TrackDetailOrigin` tracking) rather than being a single flag for the whole app session.

---

### 6.6 UI

#### `Toggle.tsx` (new)
A small animated switch — 44×26 track, 20px thumb, slides on `withTiming`. Used exactly once currently: the "Get reminders when timer resets" toggle inside `SessionStateScreen`'s Out-of-Keys free-trial card.

---

## 7. Constants (`constants/`)

### `index.ts`
Barrel export — unchanged in role, now also re-exporting `trackOptions.ts` and `skills.ts` alongside the previously-documented modules.

### `colors.ts` / `gradients.ts` / `typography.ts` / `spacing.ts` / `icons.ts` / `curriculumAssets.ts`
Unchanged from the prior audit (see that revision for the full token tables) — `StaticColors.tealAccent` fix, `BrandGradients.discovery`, the Sora `FontFamily`/`Typography` system, `Spacing`/`Radius` scales, and `CurriculumCoverImagePaths` are all still current.

### `skills.ts` (new)
```typescript
export interface LandingSkill { id: CurriculumSlug; title: string; subtitle: string; }
export const LANDING_SKILLS: LandingSkill[] = [
  { id: 'driving-theory', title: 'Practice over 1000\nhighway code\nquestions', subtitle: 'Driving theory' },
];
```
One entry per homepage skill card. The shape exists so a second skill is just another array entry — a code comment explicitly frames this as future-proofing for when the app ships more than one skill.

### `trackOptions.ts` (new)
Single source of truth for the learning-mode list shown across `LearningStyleScreen`, `ModeSwitcherSheet`, and `TrackDetailScreen`:
```typescript
export interface TrackOption { track: Track; label: string; image: ImageSourcePropType; }
export const TRACK_OPTIONS: TrackOption[] = [
  { track: 'pairs',     label: 'Differentiate Pairs',   image: require('@/assets/driving/differenciate.webp') },
  { track: 'names',     label: 'Name a sign',           image: require('@/assets/driving/name.webp') },
  { track: 'meanings',  label: 'Meaning of Signs',      image: require('@/assets/driving/meaning.webp') },
  { track: 'whereUsed', label: 'Where signs are used',  image: require('@/assets/driving/usage.webp') },
  { track: 'reading',   label: 'Reading Only',          image: require('@/assets/driving/reading.webp') },
  { track: 'full',      label: 'Full Course',           image: { uri: getPlayAssetPublicUrl(...) } },
];
```
This **supersedes** the icon-based `TRACK_OPTIONS` array that used to live inline inside `LandingScreen.tsx` (documented in the prior audit) — that version, its `Shuffle`/`Tag`/`BookOpen`/etc. lucide icons, and its different label wording ("Challenge yourself with pairs", etc.) no longer exist anywhere in the codebase. Note the list order differs slightly from the old one too (`reading` now sits before `full`).

---

## 8. Theme (`theme/`)

Unchanged from the prior audit — `ThemeContext.tsx` (dark/light/auto, AsyncStorage-persisted, `useTheme()` hook) and `tokens.ts` (convenience re-export barrel).

---

## 9. Library / Data Layer (`lib/`)

### `supabase.ts` / `curriculum.ts` / `downloadSession.ts` / `signs.ts`
Unchanged from the prior audit — the Learning Tracks / Reading Mode work (`deriveTrack`, `hydrateSignCatalog`, track-aware `downloadSession`) documented there is still current. See that revision for the full `deriveTrack`/`TRACK_ROLE`/`TRACK_LABEL` breakdown and the download pipeline's stage weights.

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
Unchanged from the prior audit — `role`-tagged `BaseQuestion`, the `QuizQuestion` union, `OptionChoice`, and the `SignCatalogEntry` interface (92 entries in `data/questions.sample.json`) are all still current. See that revision for the full field tables.

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
            │   │   └── ModeCard (×6, TRACK_OPTIONS)
            │   ├── TrackDetailScreen
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
            │       │   └── ModeCard (×6, highlighted/DONE per real completion data)
            │       └── SessionStateScreen (various kinds)
            │           ├── outOfKeys → scrollable proceed options, Toggle (reminders)
            │           │   └── RestoreAccountModal
            │           └── WatchAdPromptSheet → KeyRewardContent
            ├── keys-packs → keys-confirm
            ├── subscription-plans → subscription-confirm
            ├── premium-benefits, how-keys-work, how-free-mode-works
            └── payment-complete
```

### Track Derivation Summary

Unchanged from the prior audit — see that revision's table (`pairs`/`names`/`meanings`/`whereUsed`/`full`/`reading`, their role filters, grouping functions, and session `kind`).

---

*End of documentation.*
