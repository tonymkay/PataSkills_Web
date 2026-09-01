# PataSkills Play — Master Codebase Documentation

> **Generated**: 2026-09-01 · **Scope**: Every file inside `PataProducts/play/` · **Method**: Pure code analysis — existing inline comments were deliberately ignored.

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
16. [Miscellaneous Files](#16-miscellaneous-files)
17. [Data Flow & Architecture](#17-data-flow--architecture)

---

## 1. Project Overview

**PataSkills Play** is a mobile-first quiz application built with **Expo** (React Native) that targets iOS, Android, and the web. Its current curriculum is **Driving Theory** — users practice highway-code questions involving road sign identification. The app fetches its curriculum and sign images from a **Supabase** backend at runtime, presents questions in a swipeable card deck, and gates continued play behind a consumable **"keys"** system persisted in AsyncStorage.

### Core User Flow

```
Landing Screen → Download Session → Play Session (Card Deck) → Topic Complete → Next Session / Out of Keys
```

---

## 2. Directory Tree

```
play/
├── .env                              # Supabase connection credentials
├── .gitattributes                    # Binary-safe git config for fonts/images
├── .gitignore                        # Standard Expo ignores
├── AGENTS.md                         # AI agent instructions (Expo version pin)
├── CLAUDE.md                         # AI agent marker
├── LICENSE                           # MIT License (Expo origin)
├── README.md                         # Minimal readme
├── app.json                          # Expo app manifest
├── babel.config.js                   # Babel preset (expo)
├── metro.config.js                   # Metro bundler config (woff/woff2 support)
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript config
├── pataskills-swipe-demo.html        # Standalone HTML swipe-card prototype
│
├── app/                              # Expo Router pages
│   ├── _layout.tsx                   # Root layout (providers, fonts, splash)
│   ├── index.tsx                     # Home page (stage machine: landing/download/session)
│   ├── +html.tsx                     # Web-only HTML shell (fonts, viewport, CSS)
│   └── admin/
│       └── signs.tsx                 # Admin tool: browse & swap sign images
│
├── components/
│   ├── cards/
│   │   ├── CardDeck.tsx              # Horizontal card strip with progress bar
│   │   └── TwoImageCard.tsx          # Individual quiz card (3 layout types)
│   ├── feedback/
│   │   ├── CheckButton.tsx           # "CHECK" button with feedback animation
│   │   ├── DownloadingScreen.tsx     # Loading screen with bouncing dots
│   │   ├── FeedbackSheet.tsx         # Correct/Not-quite bottom sheet
│   │   ├── FlagIcon.tsx              # Flag-a-question toggle button
│   │   ├── LearnMoreSheet.tsx        # Explanation bottom sheet
│   │   ├── QuitConfirmSheet.tsx      # "Are you sure?" quit confirmation
│   │   └── SessionStateScreen.tsx    # Multi-purpose interstitial screen
│   ├── landing/
│   │   ├── LandingScreen.tsx         # Start screen with illustration
│   │   └── LandingIllustration.tsx   # Remote cover image component
│   └── play/
│       └── PlaySession.tsx           # Session orchestrator (keys, flow states)
│
├── constants/
│   ├── index.ts                      # Barrel export for all constants
│   ├── colors.ts                     # Light/Dark/Static color palettes
│   ├── gradients.ts                  # Gradient definitions (brand, category, sheets)
│   ├── typography.ts                 # Font families, text styles, font assets
│   ├── spacing.ts                    # Spacing scale & border radius tokens
│   ├── icons.ts                      # Icon size tokens
│   └── curriculumAssets.ts           # Static cover-image paths by curriculum slug
│
├── theme/
│   ├── ThemeContext.tsx               # React context: dark/light/auto theme
│   └── tokens.ts                     # Re-export barrel for design tokens
│
├── lib/
│   ├── supabase.ts                   # Supabase client singleton
│   ├── curriculum.ts                 # Fetch curriculum JSON from Supabase
│   ├── downloadSession.ts            # Orchestrate full session download
│   ├── keys.ts                       # Keys balance: read/write/spend/reset
│   └── signs.ts                      # Fetch sign assets & sign pairs from DB
│
├── hooks/
│   └── useKeys.ts                    # React hook wrapping lib/keys.ts
│
├── types/
│   └── quiz.ts                       # TypeScript interfaces for quiz questions
│
├── utils/
│   ├── groupSessions.ts              # Group questions into sessions by pairId
│   ├── hydrateQuestions.ts           # Replace sign keys with image URLs
│   └── shuffleAnswers.ts            # Fisher-Yates answer randomization
│
├── scripts/
│   ├── derive-signs-from-bucket.mjs  # List bucket files → play_signs SQL
│   ├── derive-signs.mjs              # Derive sign names from curriculum JSON
│   ├── fix-image-cache-headers.mjs   # Re-upload signs with 1-year cache headers
│   ├── link-signs-to-questions.mjs   # Fuzzy-match signs → rewrite curriculum JSON
│   └── output/                       # Script output artifacts (JSON, SQL)
│
├── supabase/
│   └── play_sign_pairs.sql           # CREATE TABLE + seed data for sign pairs
│
├── assets/
│   ├── fonts/                        # Sora font family (5 weights × TTF + WOFF2)
│   ├── images/                       # App icons, favicon, mascot, splash
│   ├── homepage/                     # Landing page images (driving.png, homepage.webp)
│   └── premium/                      # Key & unlock illustrations (key.webp, unlock.webp)
│
├── Inspos/                           # Design inspiration screenshots
├── data/                             # Empty directory (placeholder)
└── _deleted_local_assets/            # Archived deleted assets
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
| **Backend** | Supabase (hosted PostgreSQL + Storage) | ^2.112.4 |
| **Local Storage** | AsyncStorage | 2.2.0 |
| **Images** | expo-image | ~3.0.11 |
| **Gradients** | expo-linear-gradient | ^55.0.13 |
| **Haptics** | expo-haptics | ~15.0.8 |
| **Icons** | @expo/vector-icons (Ionicons) + lucide-react-native | — |
| **SVG** | react-native-svg | ^15.15.4 |
| **Web** | react-native-web + react-dom | ^0.21.0 / 19.1.0 |
| **TypeScript** | typescript | ~5.9.2 |

### NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `expo start` | Start dev server |
| `android` | `expo start --android` | Dev on Android |
| `ios` | `expo start --ios` | Dev on iOS |
| `web` | `expo start --web` | Dev on web |
| `build` | `expo export -p web` | Static web export |

---

## 4. Configuration Files

### `app.json`

Expo manifest. App name is **"PataSkills Play"**, slug is `play`. Portrait-only orientation. Dark `userInterfaceStyle`. Custom Android adaptive icon with foreground/background/monochrome layers. Web output mode is `static`. Deep link scheme: `pataskillsplay`. Predictive back gesture is disabled on Android.

### `tsconfig.json`

Extends `expo/tsconfig.base`. Strict mode enabled. Path alias `@/*` maps to the project root (`./`), enabling imports like `@/components/...`.

### `babel.config.js`

Uses `babel-preset-expo` with caching. The Expo preset already bundles the reanimated/worklets transform, so no additional plugins are needed.

### `metro.config.js`

Extends Expo's default Metro config. Adds `woff` and `woff2` to the asset extensions list so Metro can resolve the subsetted web font files referenced in `+html.tsx`.

### `.env`

Two environment variables:
- `EXPO_PUBLIC_PATASKILLS_SUPABASE_URL` — The Supabase project URL
- `EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY` — The Supabase anonymous (public) API key

This project shares its Supabase project with the main PataSkills V2 app but uses its own independent tables (`play_curricula`, `play_signs`, `play_sign_pairs`) and storage bucket (`play-assets`).

### `.gitattributes`

Marks all binary asset formats (woff2, woff, ttf, otf, png, jpg, webp, gif, ico, svg, mp4, mp3, pdf) as `binary` to prevent Git line-ending corruption on Windows.

---

## 5. App Layer (`app/`)

### `_layout.tsx` — Root Layout

The root of the Expo Router tree. Sets up the full provider hierarchy:

```
GestureHandlerRootView
  └── SafeAreaProvider
        └── ThemeProvider (defaultMode="dark")
              └── RootLayoutInner
                    ├── StatusBar (light style)
                    └── Stack (headerShown: false)
```

**`RootLayoutInner`** does the following:
1. Loads the Sora font family via `useFonts()`. On web, it passes an empty map because the fonts are already declared as `@font-face` rules in `+html.tsx`, so a second JS-driven fetch is unnecessary.
2. Hides the native splash screen once fonts are loaded.
3. Renders a full-screen `View` with the theme's background color, containing the `Stack` navigator with no visible headers.

---

### `index.tsx` — Home Page / Entry Point

The main screen. Implements a simple **three-stage state machine**:

| Stage | Component Rendered | Description |
|-------|--------------------|-------------|
| `landing` | `LandingScreen` | Start screen with "START PRACTICE" button |
| `downloading` | `DownloadingScreen` | Shows loading animation while fetching data |
| `session` | `PlaySession` | Active quiz session |

**State:**
- `stage` — Current stage (`'landing' | 'downloading' | 'session'`)
- `progress` — Download progress info (stage + fraction)
- `error` — Error message from failed download, or null
- `questions` — Hydrated `QuizQuestion[]` array for the session

**Flow:**
1. User taps "Start Practice" → stage becomes `downloading`
2. `downloadSession()` is called with a progress callback
3. On success → questions are stored, stage becomes `session`
4. On error → error message is shown with a RETRY button
5. On exit from session → everything resets to `landing`

---

### `+html.tsx` — Web HTML Shell

A server-side-only component that generates the static HTML wrapper for the web build. It does **not** run in the browser — it produces the `<html>` document at build/export time.

**Responsibilities:**

1. **Viewport meta tag** — Sets `width=device-width`, `viewport-fit=cover`, disables shrink-to-fit.

2. **ScrollView reset** — Uses Expo Router's `ScrollViewStyleReset` to disable page-level bounce/scroll so RN's own ScrollViews work correctly.

3. **Font preloading** — Emits `<link rel="preload">` tags for all 5 Sora WOFF2 weights so browsers start fetching them in parallel with the JS bundle instead of discovering them late.

4. **Cover image preloading** — Preloads the driving-theory cover illustration from Supabase Storage.

5. **@font-face declarations** — Generates CSS `@font-face` rules for all 5 weights (Sora-Regular through Sora-ExtraBold), with WOFF2 as the primary source and TTF as fallback. Uses `font-display: swap`.

6. **Phone-width constraint** — CSS on `#root`:
   - `max-width: 430px` (phone width cap)
   - `max-height: 932px` (phone height cap)
   - `height: 100dvh` with `100vh` fallback
   - Auto horizontal centering
   - Dark backdrop (`#0B0D12`) on html/body

   This creates the "phone frame on desktop, full-bleed on mobile" behavior. On real phones (≤430px wide), both caps are slack and the app is 100% full-bleed.

---

### `admin/signs.tsx` — Admin Sign Browser

A development/admin tool at the `/admin/signs` route. Displays all sign images from the `play_signs` table in a grid. Each sign card shows:
- The sign image (from Supabase Storage public URL)
- Its human-readable meaning (derived from the curriculum's "What is this sign called?" questions)
- How many questions reference it

**Key feature — Image Swap:** Tapping a sign opens a modal with all available signs. Selecting a replacement updates that sign's `image_path` in the `play_signs` table. Changes propagate everywhere instantly since the app resolves sign images at session-download time.

**`deriveMeaningsByKey()`** — Fetches the active curriculum JSON, scans for questions containing "this sign called", extracts the correct answer text, and groups these meanings by sign key. This gives human-readable labels instead of raw filenames.

**`pickMeaning()`** — Given multiple possible names for a sign, returns the most frequently occurring one (majority vote).

---

## 6. Components (`components/`)

### 6.1 Cards

#### `CardDeck.tsx` — The Quiz Engine

The core interactive component. Renders a **horizontal strip of quiz cards** that slide left as the user progresses. This is the main gameplay UI.

**Props:**
| Prop | Type | Purpose |
|------|------|---------|
| `questions` | `QuizQuestion[]` | The full question set for this session |
| `keyBalance` | `number?` | Current key count to display |
| `onSessionComplete` | `(stats) => void` | Fires when all original questions are answered correctly |
| `onFinish` | `(stats) => void` | Same timing as onSessionComplete |
| `onClose` | `() => void` | Exit the session |

**Layout (top to bottom):**

1. **Top Bar** — Close (X) button, segmented progress bar (up to 8 segments with animated gradient fill), key balance badge.

2. **Card Viewport** — A clipping container holding the horizontal card strip. Width is measured from the actual rendered layout (not hardcoded). Only cards within a ±2 window of the current index are rendered for performance.

3. **Bottom Controls** — The CHECK button and a hint label.

4. **Overlay Sheets** — LearnMoreSheet, FeedbackSheet, QuitConfirmSheet are rendered as siblings.

**Key Mechanics:**

- **Continuous strip translation** — `stripX` is a Reanimated shared value that never resets. Each advance animates it further left by one card width + gap (16px). Duration is 320ms with cubic easing.

- **Answer shuffling** — Each question's answers are shuffled (Fisher-Yates) when initially placed into the deck and again when requeued after a wrong answer. This prevents position memorization.

- **Wrong answer requeue** — Incorrectly answered questions are appended to the end of the deck with freshly shuffled answers. Only correct answers advance progress.

- **Progress segments** — The bar has `min(totalCount, 8)` segments. Completed segments show a full gradient fill. The active segment animates: starts at 10% → jumps to 80% on correct answer → eases to 100% as the card slides out.

- **Scroll hint** — A bouncing chevron appears at the bottom of a card when its content exceeds the viewport height. Pressing it scrolls to the bottom. It auto-hides when the user scrolls past 12px.

- **Haptic feedback** — `Haptics.notificationAsync()` fires on correct (Success) and incorrect (Warning) answers.

- **Android back button** — Intercepted via `BackHandler` to show the quit confirmation sheet instead of immediately exiting.

- **XP** — 10 XP per correct answer (constant `XP_PER_CORRECT`).

---

#### `TwoImageCard.tsx` — Quiz Card Component

Renders a single quiz question card. Despite the name, it handles **three distinct layout types**:

**`resolveQuestionType(question)`** determines the layout:

| Type | Condition | Layout |
|------|-----------|--------|
| `two_image` | Format is `twoImageChoice`/`imageChoice`, or `images[]` has ≥2 entries | Two side-by-side image panels with A/B labels |
| `single_image` | Format is `singleImageChoice`/`imageTextChoice`, or `image` is truthy | Road sign image at top, stacked text answer options below |
| `text_only` | Everything else | Question text only, stacked text answer options |

**Structure:**

1. **Gradient Header** — A `LinearGradient` with the question text. Color varies by layout type:
   - `single_image`: soft green mint (`#A7F3D0` → `#86EFAC`)
   - `two_image`: teal mint (`#5EEAD4` → `#2DD4BF`)
   - `text_only`: cyan-mint (`#5EEAD4` → `#38BDF8`)

   For `single_image`, the sign image appears above the question text inside the gradient.

2. **Card Body** — Answer options area:
   - **Two-image**: Side-by-side `Pressable` cards, each containing a `RoadSignGraphic` and a large letter label. Selection/evaluation states change background and border colors.
   - **Text/single-image**: Vertically stacked `Pressable` rows with text labels.

3. **Card Footer** — "Learn More" button (opens explanation sheet) and a Flag toggle button.

**Visual feedback states for options:**
- **Default** — Neutral green-tinted background
- **Selected** — Teal border + tint
- **Correct** — Green border + tint
- **Wrong** — Amber/orange border + tint

**`RoadSignGraphic`** — Renders either a remote `Image` (via `expo-image` with disk caching) or, when no image source is available, an inline SVG fallback of a generic road sign (yield, children crossing, or pedestrian crossing). The SVG signs include pole, border, and silhouette details.

**`QuizCard`** is exported as an alias for `TwoImageCard`.

---

### 6.2 Feedback

#### `CheckButton.tsx`

A full-width rounded button labeled "CHECK" (customizable via `label` prop).

**States:**
- **Disabled** — Dark, muted, non-interactive. Shows when no answer is selected.
- **Enabled** — White background, black text. Triggers haptic feedback on press.

**Floating feedback badge** — An animated pill that appears above the button showing "Correct" (green) or "Not Quite" (red). Fades in with a spring animation on state change, fades out on reset.

**Type `FeedbackState`** = `'idle' | 'correct' | 'incorrect'`

---

#### `DownloadingScreen.tsx`

Shown during the session download phase. Has two visual states:

1. **Loading** — Displays "Loading questions…" with three bouncing dots animated in a staggered wave pattern (each dot bounces with a 120ms delay offset). Uses Reanimated's `withRepeat` + `withSequence` + `withDelay`.

2. **Error** — Displays "Couldn't download session" with the error message and a full-width "RETRY" button.

Uses safe area insets for top/bottom padding.

---

#### `FeedbackSheet.tsx`

A bottom sheet modal that appears after the user checks their answer.

**Type `FeedbackSheetState`** = `'correct' | 'notquite' | null`

**Layout:**
- Grabber handle at top
- Status row: A bordered pill showing "Correct ✓" (green) or "Not Quite ✗" (amber), plus XP count for correct answers, plus a flag toggle button
- Action button:
  - Correct → "CONTINUE" with brand gradient fill → advances the deck
  - Not quite → "TRY AGAIN" with outline style → dismisses sheet, resets selection, lets user retry the same card

**Animation:** Slides up from below (translateY 400 → 0) with cubic easing, 320ms open / 180ms close.

**Assessment mode** (`assessment` prop) — Disables XP display and "Try Again"; incorrect answers go straight to CONTINUE.

---

#### `FlagIcon.tsx`

A circular toggle button for flagging/unflagging a question. Uses `Ionicons` flag/flag-outline icons. Flagged state shows an orange tint background and amber border. Triggers light haptic feedback on toggle.

---

#### `LearnMoreSheet.tsx`

A bottom sheet modal showing the explanation for the current question.

**Layout:**
- Dimming backdrop (pressable to close)
- Gradient background (theme-adaptive via `getSheetGradient`)
- Grabber handle
- Header: lightbulb icon badge + "Learn More" title + close button
- Scrollable content (capped at 65% screen height):
  - Question text preview
  - "Correct Answer" card (green border, checkmark icon, answer text)
  - "Why Is This Correct?" explanation card
  - "GOT IT" button with brand gradient

**Answer display logic:** For two-image questions, shows "Sign A" or "Sign B". For text questions, shows the actual answer string. Falls back to "Option N" if neither works.

**Animation:** Full slide-up animation with backdrop fade. Uses Reanimated `withTiming` for both the sheet translateY and backdrop opacity. The modal's `visible` state and the actual React render state are decoupled — the modal stays rendered during the exit animation and unmounts only after the slide-down completes (via `runOnJS`).

---

#### `QuitConfirmSheet.tsx`

"Are you sure?" bottom sheet shown when the user taps X or presses the Android back button mid-session.

**Content:**
- "Are you sure?" heading
- "If you quit, you'll lose your progress and XP." subtitle
- "KEEP PLAYING" — white primary button → dismisses sheet
- "QUIT" — red text button → exits the session

Same animation pattern as FeedbackSheet (slide up + backdrop fade). Uses `getSheetGradient` for the sheet background.

---

#### `SessionStateScreen.tsx`

A versatile full-screen interstitial used for multiple game-state transitions. Configured by a `kind` prop that selects from a predefined copy table.

**`SessionStateKind` values:**

| Kind | Icon | Title | Primary CTA | Secondary CTA |
|------|------|-------|-------------|---------------|
| `topicComplete` | Sparkles (purple) | "Topic complete!" | CONTINUE | — |
| `chapterComplete` | Medal (purple) | "Chapter complete!" | CONTINUE | — |
| `sessionUnlocked` | unlock.webp image | "You have unlocked Next Session!" | START SESSION | — |
| `keysReset` | key.webp + count | "You have new Keys!" | UNLOCK NEXT SESSION | — |
| `rewardUnlocked` | KeyRound (lime) | "Reward unlocked!" | COLLECT | — |
| `outOfKeys` | Lock (purple dim) | "You're out of keys for today" | BUY KEYS (disabled) | WAIT UNTIL TOMORROW |
| `shareApp` | Share2 (green) | "Share App with friends" | SHARE WITH FRIENDS (disabled) | MAYBE LATER |
| `rateApp` | Star (amber) | "Enjoying PataSkills?" | RATE THE APP | MAYBE LATER |

**Conditional sections:**
- **Stats row** — Shown for `topicComplete` / `chapterComplete`. Two cards: Total XP (green) and Score (e.g. "7/10").
- **Keys display** — `sessionUnlocked` renders the `unlock.webp` image. `keysReset` renders a large key count number next to the `key.webp` image.
- **Countdown timer** — `outOfKeys` shows a live "Resets in M:SS mins" countdown derived from the `resetAt` timestamp. Ticks every second via `setInterval`.
- **Reward box** — `shareApp` renders a large "1" + key icon.

All titles, subtitles, and CTA labels can be overridden via props.

---

### 6.3 Landing

#### `LandingScreen.tsx`

The first screen users see. Vertically organized:

1. **Top section** — Large headline "Practice over 1000 highway code questions" + progress bar (single segment, gradient-filled) + "Driving theory" subtitle in teal.

2. **Middle section** — `LandingIllustration` component + page dots (currently just one dot since there's only one slide in the `SLIDES` array — the structure supports multiple slides for future expansion).

3. **Bottom section** — Full-width "START PRACTICE" button (white background, dark text, extra bold).

The `SLIDES` array is structured for potential multi-slide onboarding but currently contains only one entry.

---

#### `LandingIllustration.tsx`

Renders the driving-theory cover image from Supabase Storage. Builds the URL at module-load time using `getPlayAssetPublicUrl()` with the path from `CurriculumCoverImagePaths['driving-theory']`. Displays as a 260×220 `Image` with `contain` resize mode.

---

### 6.4 Play

#### `PlaySession.tsx` — Session Flow Orchestrator

The brain of the gameplay loop. Manages the **multi-session, key-gated flow** between question sets.

**Flow State Machine:**

```
                ┌─────────────┐
                │   playing   │ ← CardDeck is active
                └──────┬──────┘
                       │ onSessionComplete
                       ▼
              ┌────────────────┐
              │  topicComplete  │ ← Score + XP summary
              └───────┬────────┘
                      │ CONTINUE
                      ▼
            ┌─────────────────────┐
            │ advanceToNextSession │
            └────┬───────────┬────┘
                 │           │
          has keys?      no keys
                 │           │
                 ▼           ▼
        ┌──────────────┐  ┌───────────┐
        │sessionUnlocked│  │ outOfKeys │
        └───────┬──────┘  └─────┬─────┘
                │               │ timer expires
         START SESSION          ▼
                │         ┌───────────┐
                ▼         │ keysReset │
           ┌────────┐    └─────┬─────┘
           │playing  │         │ UNLOCK
           └────────┘         ▼
                        ┌──────────────┐
                        │sessionUnlocked│
                        └──────────────┘
```

**Key mechanics:**

- **Session grouping** — Questions are grouped by `pairId` into `PlaySession[]` via `groupQuestionsBySession()`. Each session is a set of questions about one sign pair.

- **Key spending** — One key is consumed when entering each session. The first session auto-spends on mount. Subsequent sessions spend on advance.

- **Out-of-keys handling** — Two sub-reasons tracked:
  - `'entry'` — User was blocked before starting the current session. On refill, spend a key and start the same session.
  - `'advance'` — User finished a session but was blocked advancing to the next. On refill, advance the session index.

- **Reset timer** — Starts only when the out-of-keys screen is actually displayed (not when balance hits 0). When the timer fires (balance refills via `useKeys` polling), the flow auto-transitions to `keysReset`.

- **All complete** — When there are no more sessions, shows `topicComplete` with "All caught up!" and cumulative XP.

- **Startup guard** — A `useRef` flag (`hasAttemptedStartRef`) ensures the initial key-spend effect fires exactly once, preventing multiple spends if `isOutOfKeys` toggles.

---

## 7. Constants (`constants/`)

### `index.ts` — Barrel Export

Re-exports everything from the other constant modules: `LightColors`, `DarkColors`, `StaticColors`, `AppColors`, `Typography`, `FontFamily`, `fontAssets`, `Spacing`, `Radius`, `IconSize`, and all gradient exports.

---

### `colors.ts` — Color Palettes

Defines **three color systems**:

#### `LightColors` (77 tokens)
Full Material Design 3-style color palette for light mode. Includes:
- Primary/Secondary/Tertiary/Error with on/container/onContainer variants
- Surface hierarchy: dim → bright, containerLowest through containerHighest
- Outline + outlineVariant
- Fixed color variants (primary/secondary/tertiary)
- Grey scale (50–800)
- Semantic colors: correct/wrong backgrounds/borders, category tints
- Selection states (rest/active bg/border/text/tint)
- Glass surface (frosted card effect, 93% white opacity)

#### `DarkColors` (same 77 tokens)
Full dark-mode counterpart. Base color is `#1A1D24`. All tokens mirror `LightColors` keys for type safety.

#### Shared accents (both themes)
`actionBlue` (#0CC8F2), `successLime` (#93F205), `dangerRed` (#F2274C), `warningOrange` (#F27127), `tealAccent` (#07B7A9), white, black.

#### `StaticColors` (theme-independent)
A large collection of fixed colors used across both themes:
- **Glass card system** — `dark` and `light` sub-objects with `bgActive`, `bgPassive`, `borderActive`, `borderPassive`, `text` for a two-layer frosted-glass card effect.
- Achievement colors (amber, lime)
- Timer colors (green → orange → red)
- Confetti colors (7 colors)
- Map colors (grass, road, building, route, junction)
- Selection system V2 (rest/active states)
- Various UI-specific tokens (toast, badges, stamps, buttons)
- Avatar palette (6 bright colors)

**Type `AppColors`** = `Record<keyof typeof LightColors, string>` — ensures Dark and Light palettes have identical keys.

---

### `gradients.ts` — Gradient Definitions

Defines all gradient configurations used throughout the app.

**`SkillCardGradients`** — 3 alternating card gradients: teal, royal blue, purple. Each includes `colors`, `start`/`end` points, `circleColor`, and `btnColor`.

**`BrandGradients`** — Named brand gradients:
- `primaryStreakH` / `primaryStreakD` — Cyan-to-green (horizontal / diagonal)
- `primaryQFH` — Gold-to-orange
- `discovery` — Green (#2BD964) to teal (#07B7A9), diagonal. The primary brand gradient.

**Theme-adaptive gradient functions:**
- `getSheetGradient(isDark)` — Returns subtle blue wash for bottom sheets
- `getBottomFade(isDark)` — 3-stop fade for content scrolling under pinned elements
- `getKeysHeaderFade(isDark)` — Warm gold tint for keys/shop screen
- `getTealTabFade(isDark)` — Strong teal fade for Skills tab
- `getGreenTabFade(isDark)` — Strong green fade for skill overview
- `getCategoryCardGradient(index, isDark)` — Cycling faint wash (teal/blue/purple/amber)
- `getCategoryGradient(category, isDark)` — Category-specific gradients (modelTown/questions/signs)

**Other gradients:**
- `PlanSelectedFill` / `PlanSelectedFillLight` — Solid brand fill for selected plan cards
- `PremiumHighlight` — Faint teal-green wash for premium column
- `HomeBottomGlow` / `TealBottomGlow` — Soft pooling glows
- `TabScrim` — Scrim behind floating tab bar
- `SelectionGlow` / `SelectionGlowLight` — Diagonal sweep for selected items

**Category icon/text color functions:**
- `getCategoryIconColor(category, isDark)`
- `getCategoryTextColor(category, isDark)`

---

### `typography.ts` — Type System

**`FontFamily`** — 5 weight constants mapping to Sora font family names:
- `regular` → "Sora-Regular" (400)
- `medium` → "Sora-Medium" (500)
- `semiBold` → "Sora-SemiBold" (600)
- `bold` → "Sora-Bold" (700)
- `extraBold` → "Sora-ExtraBold" (800)

**`Typography`** — A `Record<string, TextStyle>` with 50+ named text styles. Key styles include:

| Style | Weight | Size | Use |
|-------|--------|------|-----|
| `displayLg` | ExtraBold | 40px | Large display text |
| `headlineXl` | Bold | 32px | Main headlines |
| `headlineLg` | Bold | 26px | Section headlines |
| `titleLarge` | ExtraBold | 18px | Card titles |
| `titleMedium` | Bold | 16px | Sub-titles |
| `bodyLarge` | Regular | 16px | Body text |
| `bodyMedium` | Regular | 15px | Default body |
| `bodySmall` | Regular | 13px | Small text |
| `labelLarge` | Bold | 15px | Button labels |
| `buttonText` | ExtraBold | 16px | UPPERCASE buttons |
| `scoreMainTitle` | Bold | 32px | Score screen titles |
| `scoreNumber` | ExtraBold | 56px | Large score display |
| `pointsText` | ExtraBold | 42px | XP points |

**`fontAssets`** — Maps each `FontFamily` value to a `require()` call for the TTF file. Used by `useFonts()` on native.

**`fontAssetsWebWoff2`** — Maps each `FontFamily` value to a `require()` call for the subsetted WOFF2 file (ASCII-only, ~82% smaller than TTF). These are required from this client-side file (not just from `+html.tsx`) to ensure Metro includes them in the web bundle.

---

### `spacing.ts` — Spacing & Radius Tokens

**`Spacing`** scale:

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `base` | 8px |
| `sm` | 12px |
| `gutter` | 16px |
| `marginMobile` | 20px |
| `md` | 24px |
| `lg` | 32px |
| `xl` | 40px |
| `xxl` | 64px |

**`Radius`** scale:

| Token | Value |
|-------|-------|
| `sm` | 4px |
| `default` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `full` | 9999px |

---

### `icons.ts` — Icon Size Tokens

| Token | Value | Use |
|-------|-------|-----|
| `tab` | 24 | Tab bar icons |
| `header` | 24 | Header icons |
| `inline` | 20 | Inline/body icons |
| `feature` | 48 | Feature highlight icons |
| `hero` | 64 | Hero/showcase icons |

---

### `curriculumAssets.ts` — Curriculum Cover Images

Maps curriculum slugs to their cover image paths in Supabase Storage:

```typescript
{ 'driving-theory': 'curricula/driving.webp' }
```

These paths are static (not fetched from DB) so the resulting public URL is knowable at build time, enabling `<link rel="preload">` in the web shell and instant display on the landing screen.

**Type `CurriculumSlug`** = `'driving-theory'` (currently the only curriculum).

---

## 8. Theme (`theme/`)

### `ThemeContext.tsx`

A React Context providing theme state to the entire app.

**Types:**
- `ThemeScheme` = `'dark' | 'light'` — The resolved active scheme
- `ThemeMode` = `'auto' | 'light' | 'dark'` — User preference

**`ThemeProvider`:**
- Defaults to `dark` mode
- Reads persisted mode from AsyncStorage key `pataskills_theme_mode` on mount
- In `auto` mode, follows the system color scheme via `useColorScheme()`
- `setMode()` updates state and persists to AsyncStorage
- Provides a memoized context value containing:
  - `scheme` — Resolved theme scheme
  - `isDark` — Boolean shorthand
  - `colors` — The active `AppColors` palette (`DarkColors` or `LightColors`)
  - `staticColors` — The theme-independent `StaticColors` object
  - `mode` — Current user preference
  - `setMode` — Setter function

**`useTheme()`** — Hook that reads the context. Throws if used outside `ThemeProvider`.

---

### `tokens.ts`

A convenience re-export barrel so components can import design tokens from a single path:

```typescript
import { useTheme, Spacing, Radius, Typography, FontFamily, IconSize, BrandGradients, SelectionGlow } from '@/theme/tokens';
```

---

## 9. Library / Data Layer (`lib/`)

### `supabase.ts` — Client Singleton

Creates and exports a Supabase client instance using the environment variables from `.env`.

**Configuration:**
- Auth storage uses AsyncStorage (only when `typeof window !== 'undefined'` — during static web export on Node, AsyncStorage is disabled to prevent crashes)
- `autoRefreshToken` and `persistSession` are browser-only
- `detectSessionInUrl` is disabled

**`isSupabaseConfigured`** — A boolean guard that checks the URL and key aren't empty or placeholder values.

**`getPlayAssetPublicUrl(path)`** — Resolves a storage path in the `play-assets` bucket to its full public URL. This is a deterministic string operation (no network call) — it just constructs the URL from the project URL.

---

### `curriculum.ts` — Curriculum Loader

**`loadRemoteCurriculum(slug)`:**
1. Queries `play_curricula` table for the active row matching the given slug (defaults to `'driving-theory'`)
2. Resolves the `json_path` to a public storage URL
3. Fetches the JSON file
4. Validates it's a non-empty array
5. Resolves the cover image URL if `cover_image_path` exists
6. Returns `{ title, coverImageUrl, questions }`

No caching, no local fallback. Throws on any failure — error handling is the caller's responsibility.

**Interface `CurriculumRow`** — DB shape: `slug`, `title`, `cover_image_path`, `json_path`.

**Interface `RemoteCurriculum`** — Return shape: `title`, `coverImageUrl`, `questions: QuizQuestion[]`.

---

### `downloadSession.ts` — Download Orchestrator

Runs the complete download pipeline triggered by "Start Practice":

**Stages and weights:**

| Stage | Weight | Action |
|-------|--------|--------|
| `curriculum` | 35% | `loadRemoteCurriculum()` |
| `signs` | 35% | `loadSignAssets()` |
| `pairs` | 20% | `loadSignPairs(assets)` |
| `hydrating` | 10% | `hydrateQuestionsList(questions, assets, pairs)` |

Curriculum and sign assets load **in parallel** (`Promise.all`). Sign pairs depend on assets. Hydration depends on all three.

**Progress reporting:** Calls `onProgress` with `{ stage, fraction }` at each stage boundary. `fraction` is 0–1 cumulative.

**Return type `DownloadResult`** = `{ questions: QuizQuestion[] }` on success or `{ error: string }` on failure. Never throws — all errors are caught and returned as human-readable strings.

---

### `keys.ts` — Keys Economy

Implements the consumable "keys" system that gates session access. State is persisted in AsyncStorage under `@play/keys`.

**Constants:**
- `INITIAL_KEYS` = 4
- `KEYS_RESET_DURATION_MS` = 240,000 (4 minutes — testing value, will become a daily window)

**State shape (`KeysState`):**
```typescript
{ balance: number, initialized: boolean, resetAt: number | null }
```

**Core functions:**

| Function | Purpose |
|----------|---------|
| `getKeysState()` | Reads state, initializes on first run, auto-applies reset if timer expired |
| `getKeyBalance()` | Returns just the current balance number |
| `spendKey()` | Decrements balance by 1. Returns new balance, or `null` if already at 0 |
| `startResetTimer()` | Sets `resetAt` to `now + KEYS_RESET_DURATION_MS`. Idempotent — does nothing if timer is already running |

**`applyReset(state)`** — Pure function: if `balance <= 0` and `resetAt` has passed, returns a fresh state with `INITIAL_KEYS` balance and null `resetAt`. Otherwise returns state unchanged.

---

### `signs.ts` — Sign Data

**`loadSignAssets()`:**
1. Fetches all rows from `play_signs` table (columns: `key`, `image_path`)
2. For each row, resolves `image_path` to a public URL via `supabase.storage.from('play-assets').getPublicUrl()`
3. Returns `Record<string, string>` mapping sign key → public image URL
4. Throws if no rows or any URL resolution fails

**`loadSignPairs(assets)`:**
1. Fetches all rows from `play_sign_pairs` table (columns: `pair_id`, `key_a`, `key_b`)
2. For each pair, resolves `key_a` and `key_b` against the provided assets map
3. Returns `Record<string, SignPair>` mapping pair_id → `{ keyA, keyB, urlA, urlB }`
4. Throws if any pair references a key not found in assets (data integrity error)

**Interface `SignPair`** — `{ keyA: string, keyB: string, urlA: string, urlB: string }`

---

## 10. Hooks (`hooks/`)

### `useKeys.ts`

A React hook wrapping `lib/keys.ts` for use in components.

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| `balance` | `number \| null` | Current key count (null while loading) |
| `resetAt` | `number \| null` | Epoch ms when keys refill |
| `ready` | `boolean` | True once initial state is loaded |
| `spendKey` | `() => Promise<number \| null>` | Spend one key, returns remaining or null |
| `startResetTimer` | `() => Promise<void>` | Start the refill countdown |
| `isOutOfKeys` | `boolean` | True when balance is 0 or less |

**Auto-refresh:** When balance is 0 and a reset timer is active, the hook polls `getKeysState()` every 1 second via `setInterval`. This makes the refill happen automatically when `resetAt` passes, without requiring user action.

---

## 11. Types (`types/`)

### `quiz.ts`

**`QuestionFormat`** — Union type:
- `'imageChoice'` — Two images, pick one
- `'twoImageChoice'` — Same as imageChoice (alias)
- `'imageTextChoice'` — One image, text answer options
- `'singleImageChoice'` — One image, text answer options
- `'textChoice'` — Pure text, no images
- `string` — Extensible fallback

**`QuizImageSource`** = `ImageSourcePropType | string | null | undefined`

**`BaseQuestion`:**
```typescript
{
  id: string
  pairId?: string          // Groups questions into sign-pair sessions
  section?: string         // Human-readable section label
  difficulty?: 'easy' | 'medium' | 'hard' | string
  sequence?: number
  format: QuestionFormat
  question: string         // The question text
  correctAnswer: number    // 0-indexed position of correct answer
  explanation?: string     // Optional explanation text
  isFlagged?: boolean
}
```

**Specialized interfaces** extend `BaseQuestion`:
- `ImageChoiceQuestion` — adds `images: QuizImageSource[]` and `labels?: string[]`
- `SingleImageQuestion` — adds `image?: QuizImageSource`, `signRef?: string`, `answers: string[]`
- `TextChoiceQuestion` — adds `answers: string[]`

**`QuizQuestion`** — The actual type used throughout the app. A union of `BaseQuestion` with all optional fields from the specialized interfaces: `images?`, `labels?`, `answers?`, `image?`, `signRef?`.

**`OptionChoice`** — `{ id: number, label: string, text?: string, imageUrl?: QuizImageSource }`

---

## 12. Utilities (`utils/`)

### `groupSessions.ts`

**`groupQuestionsBySession(questions)`:**
- Groups a flat question array into `PlaySession[]` by `pairId` (falls back to `id` if no `pairId`)
- Preserves insertion order (first-seen pairId determines session order)
- Each `PlaySession` has: `pairId`, `title` (from `section` field of first question), `questions`

---

### `hydrateQuestions.ts`

**`hydrateQuestion(question, assets, pairs)`:**

Takes a raw curriculum question and replaces sign key references with actual image URLs.

Resolution logic (in priority order):

1. **Pair-based resolution** — If the question has a `pairId` and a matching pair exists:
   - `twoImageChoice`/`imageChoice` format: Sets `images[0]` and `images[1]` from the pair's URL A/B (preserving any existing non-null values)
   - `signRef` is `'A'` or `'B'`: Sets `image` from the corresponding pair URL
   - `singleImageChoice`/`imageTextChoice` without signRef: Uses pair URL A or B based on `correctAnswer`

2. **Keyword fallback** — For `singleImageChoice`/`imageTextChoice` questions that still have no image after pair resolution: scans the question text and answer strings for sign key matches (e.g., if the key "pedestrian" appears in the question, assigns that sign's URL)

**`hydrateQuestionsList()`** — Maps `hydrateQuestion` over an array of questions.

---

### `shuffleAnswers.ts`

**`shuffleAnswers(question)`:**

Returns a copy of the question with answer positions randomized using Fisher-Yates shuffle. `correctAnswer` is remapped to the new position.

Two paths:

1. **Image questions** (`images[]` with ≥2 entries): Shuffles the image array. Labels (`A`/`B`) stay fixed to their positions while images move under them.

2. **Text questions** (`answers[]` with ≥2 entries): Shuffles the text answer strings.

Returns the question unchanged if neither condition applies.

---

## 13. Scripts (`scripts/`)

One-off Node.js scripts (`.mjs`) for data pipeline / database setup. All run from the `play/` directory.

### `derive-signs-from-bucket.mjs`

**Purpose:** Generates a sign inventory from the Supabase Storage bucket, not from curriculum data.

**Process:**
1. Lists all image files in `play-assets/signs/` folder
2. Derives a display name from each filename (e.g., `give_way.webp` → "Give Way")
3. Flags placeholder-looking filenames (matching patterns like `image1`, `*raw`, `untitled*`)
4. Flags duplicate names (different files that cleaned to the same display name)
5. Writes `signs-derived.json` (review data) and `play_signs.sql` (CREATE TABLE + INSERT statements)

### `derive-signs.mjs`

**Purpose:** Derives sign names from the curriculum JSON itself by finding "What is this sign called?" questions and extracting the correct answer.

**Process:**
1. Fetches the active curriculum JSON from Supabase
2. Groups questions by `pairId`, finds image URLs from `imageChoice` questions
3. For each `signRef` question, resolves its image URL from the pair
4. Extracts names from "What is this sign called?" correct answers
5. Produces deduped sign list, flags conflicts (same image, different names) and missing names
6. Writes `signs-derived.json` and `play_signs.sql`

### `fix-image-cache-headers.mjs`

**Purpose:** Re-uploads all sign images with `Cache-Control: max-age=31536000` (1 year).

Supabase Storage sets cache headers at upload time (default 1 hour), and the dashboard upload UI doesn't expose this option. This script downloads each file's bytes and re-uploads them to the same path with the long cache header and `upsert: true`.

**Requires service-role key** (passed as shell env var, never committed). Idempotent.

### `link-signs-to-questions.mjs`

**Purpose:** Builds the question → sign linkage by fuzzy-matching.

**Process:**
1. Loads all `play_signs` rows
2. Loads the curriculum JSON
3. Derives sign names from "What is this sign called?" answers (same as `derive-signs.mjs`)
4. Fuzzy-matches each derived name against `play_signs.name` using word-overlap scoring
5. Rewrites the curriculum JSON: replaces `images[]` and `image` values with `play_signs.key` references
6. Writes `sign-mapping-report.json` (match confidence data) and `questions.linked.json` (migrated curriculum)

Uses a 0.5 confidence threshold — anything below is flagged for manual review.

### `output/`

Contains generated artifacts:
- `signs-derived.json` — Sign inventory with flags
- `play_signs.sql` — CREATE TABLE + INSERT statements for play_signs
- `enable-signs-update.sql` — RLS policy allowing anon UPDATE on play_signs (for admin swap tool)
- `sign-mapping-report.json` — Fuzzy match results
- `questions.linked.json` — Migrated curriculum with sign key references
- `questions.reverted.json` — Backup of pre-migration curriculum
- `pairs-to-insert.json` — Sign pair data for seeding

---

## 14. Supabase (`supabase/`)

### `play_sign_pairs.sql`

Creates the `play_sign_pairs` table and seeds it with 23 sign pair entries.

**Schema:**
```sql
play_sign_pairs (
  pair_id TEXT PRIMARY KEY,     -- e.g. 'A1', 'B3', 'E4'
  key_a   TEXT NOT NULL,        -- play_signs.key for image A
  key_b   TEXT NOT NULL         -- play_signs.key for image B
)
```

Row-level security is enabled with a public read policy.

**Seed data** (23 pairs across 5 groups A–E):

| Group | Pairs | Example |
|-------|-------|---------|
| A (1 pair) | A1 | give_way vs stop |
| B (6 pairs) | B1–B6 | pedestrian vs children_crossing, bump vs uneven_surface, etc. |
| C (6 pairs) | C1–C6 | no_entry vs no_vehicles, no_u_turn vs mandatory_u, etc. |
| D (6 pairs) | D1–D6 | 30_max vs 30_end, one_way vs two_way_crosses_one_way, etc. |
| E (4 pairs) | E1–E4 | sharp_bend_right vs double_bend, lane_ends_merge vs keep_left, etc. |

Uses `ON CONFLICT DO UPDATE` for idempotent re-runs.

---

## 15. Assets (`assets/`)

### `fonts/`
Sora font family, 5 weights, in two formats each:
- **TTF** (full, ~57KB each): `Sora-Regular.ttf`, `Sora-Medium.ttf`, `Sora-SemiBold.ttf`, `Sora-Bold.ttf`, `Sora-ExtraBold.ttf`
- **WOFF2** (ASCII subset, ~10KB each): `Sora-Regular-subset.woff2`, etc.

WOFF2 files are generated by glyphhanger + fonttools, stripped to ASCII range only (~82% size reduction).

### `images/`
| File | Purpose |
|------|---------|
| `icon.png` | App icon (light) |
| `icon-dark.png` | App icon (dark) |
| `favicon.png` | Web favicon |
| `splash-icon.png` | Splash screen icon |
| `mascot.png` | PataSkills mascot |
| `android-icon-foreground.png` | Android adaptive icon foreground |
| `android-icon-background.png` | Android adaptive icon background |
| `android-icon-monochrome.png` | Android monochrome icon |

### `homepage/`
| File | Purpose |
|------|---------|
| `driving.png` | Large driving illustration |
| `homepage.webp` | Homepage banner |

### `premium/`
| File | Purpose |
|------|---------|
| `key.webp` | Key icon for keys economy UI |
| `unlock.webp` | Unlock illustration for session-unlocked screen |

---

## 16. Miscellaneous Files

### `pataskills-swipe-demo.html`

A **standalone HTML/CSS/JS prototype** of the swipe-card quiz mechanic. Self-contained (no dependencies). Uses emoji animals instead of road signs.

**Features:**
- Stacked card deck with depth perspective (scale + translateY)
- Drag-to-swipe with rotation, RIGHT/WRONG stamps that fade in based on drag distance
- A/B option selection + Check button
- Correct answers are "mastered" (removed), wrong answers go to the back of the queue
- Segmented progress bar
- "All caught up!" completion screen with restart

This was the design prototype used to validate the card-deck interaction pattern before building the React Native version.

### `Inspos/`
9 screenshots (PNG) dated 2026-08-27, serving as design inspiration/reference material.

### `AGENTS.md`
Instructs AI coding agents to read Expo v57 docs before writing code (version pin).

### `LICENSE`
MIT License, originally from Expo's template.

---

## 17. Data Flow & Architecture

### Database Schema (Supabase)

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  play_curricula  │     │  play_signs   │     │ play_sign_pairs │
├─────────────────┤     ├──────────────┤     ├─────────────────┤
│ slug            │     │ id (uuid)    │     │ pair_id (PK)    │
│ title           │     │ key          │     │ key_a → signs   │
│ cover_image_path│     │ name         │     │ key_b → signs   │
│ json_path       │     │ image_path   │     └─────────────────┘
│ is_active       │     │ created_at   │
└─────────────────┘     └──────────────┘

Storage Bucket: play-assets/
├── curricula/
│   ├── driving.webp        (cover image)
│   └── questions.json      (curriculum JSON)
└── signs/
    ├── give_way.webp
    ├── stop.webp
    └── ... (60+ sign images)
```

### Session Download Pipeline

```
User taps "Start Practice"
         │
         ▼
┌─ downloadSession() ─────────────────────────────────┐
│                                                      │
│  ┌──────────────────┐  ┌────────────────────┐       │
│  │loadRemoteCurriculum│ │ loadSignAssets()   │       │
│  │                  │  │ (play_signs → URLs) │       │
│  │ play_curricula → │  └────────┬───────────┘       │
│  │ fetch JSON       │           │                    │
│  └────────┬─────────┘           │                    │
│           │                     │                    │
│           └──────┬──────────────┘                    │
│                  │ (parallel)                        │
│                  ▼                                   │
│         ┌────────────────────┐                       │
│         │ loadSignPairs()    │                       │
│         │ (play_sign_pairs   │                       │
│         │  + assets map)     │                       │
│         └────────┬───────────┘                       │
│                  │                                   │
│                  ▼                                   │
│         ┌────────────────────┐                       │
│         │hydrateQuestionsList│                       │
│         │ (replace sign keys │                       │
│         │  with image URLs)  │                       │
│         └────────┬───────────┘                       │
│                  │                                   │
└──────────────────┼───────────────────────────────────┘
                   │
                   ▼
          QuizQuestion[] ready for CardDeck
```

### Keys Economy Flow

```
App Start: AsyncStorage → KeysState { balance: 4, resetAt: null }
                │
                ▼
         ┌──────────────┐
         │ Enter Session │ ← spendKey() → balance: 3
         └──────┬───────┘
                │ (complete session)
                ▼
         ┌──────────────┐
         │ Next Session  │ ← spendKey() → balance: 2, 1, 0
         └──────┬───────┘
                │ (balance hits 0)
                ▼
         ┌──────────────────┐
         │  Out of Keys     │ ← startResetTimer() → resetAt = now + 4min
         │  Screen shown    │
         └──────┬───────────┘
                │ (useKeys polls every 1s)
                │ (applyReset detects resetAt passed)
                ▼
         ┌──────────────────┐
         │  Keys Reset      │ → balance: 4, resetAt: null
         │  "You have new   │
         │   Keys!" screen  │
         └──────────────────┘
```

### Component Hierarchy

```
RootLayout
└── ThemeProvider
    └── RootLayoutInner
        └── Stack
            └── PlayEntry (index.tsx)
                ├── LandingScreen
                │   └── LandingIllustration
                ├── DownloadingScreen
                │   └── BouncingDots
                └── PlaySession
                    ├── CardDeck
                    │   ├── TwoImageCard (×N)
                    │   │   ├── RoadSignGraphic
                    │   │   └── FlagIcon
                    │   ├── CheckButton
                    │   ├── LearnMoreSheet
                    │   ├── FeedbackSheet
                    │   └── QuitConfirmSheet
                    └── SessionStateScreen (various kinds)
```

---

*End of documentation.*
