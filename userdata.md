# User Data Specification (`play/userdata.md`)

This document provides a comprehensive inventory of all data collected from learners within the `pataproducts/play` application, including variable names, data types/formats, local storage keys, database destinations, and collection triggers.

---

## 1. Storage Architecture Overview

The app employs an **Offline-First & Local-First** architecture:
1. **Local Storage (`AsyncStorage`):** All gameplay metrics (XP, streak, keys balance, topic progress, question mistakes) write immediately to device storage so learning continues smoothly with zero latency and offline capability.
2. **Database Mirror (`Supabase`):** When an email is linked to the session (via payment checkout, Google Sign-In, or email account restore), data is synced in the background to Supabase tables.
3. **Payment Processor (`Paystack`):** Checkout transactions pass the learner's email, monetary amount, and product identifiers to Paystack Pop.

---

## 2. Complete Inventory of User Data

| Data Field | Name in Code | Format / Type | Local Storage Key | Database Table & Column | Where / When Collected |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Email** | `email` | **String** (RFC 5322 email format) | `@play/user_email` | Primary foreign key across all Supabase tables (`play_accounts`, `play_user_stats`, `play_progress`, `play_question_attempts`, `play_purchases`) | User input on `KeysOfferScreen`, `keys-confirm`, `RestoreAccountModal`, or decoded from Google GIS ID token |
| **Total Lifetime XP** | `totalXp` | **Numerical** (Integer, e.g. `450`) | `@play/total_xp` | `play_user_stats.total_xp` | Incremented by +10 XP per correct question or topic completion |
| **Skill XP** | `skillXp` | **Numerical** (Integer, e.g. `120`) | `@play/xp:{skillId}` | Local per-skill cache | Incremented per correct question answered in that specific curriculum |
| **Key Balance** | `balance` | **Numerical** (Integer, e.g. `3`, `20`, or `999999` for Unlimited) | `@play/keys` (`balance`) | `play_accounts.balance` | Deducted (-1) on session entry; credited upon key-pack purchase or timer reset |
| **Premium / Subscription Status** | `isPremium` | **Boolean** (`true` / `false`) | `@play/keys` (`isPremium`) | `play_accounts.is_premium`, `play_purchases.is_premium` | Set to `true` when subscribing to an Unlimited plan |
| **Subscription Expiry Timestamp** | `expiresAt` | **Timestamp** (ISO 8601 string) | `@play/premium_expires_at`, `@play/keys` (`expiresAt`) | `play_accounts.expires_at`, `play_purchases.expires_at` | Calculated upon subscribing (7d, 30d, 365d); used to enforce local and server expiry |
| **Key Refill Timestamp** | `resetAt` | **Timestamp** (Epoch ms / ISO 8601 string) | `@play/keys` (`resetAt`) | `play_accounts.reset_at` | Generated the moment key balance reaches `0` (escalating timer: 5m, 2h, 8h) |
| **Reset Escalation Count** | `resetCount` | **Numerical** (Integer, e.g. `0`, `1`, `2`) | `@play/keys` (`resetCount`) | `play_accounts.reset_count` | Increments each time a free timer reset finishes |
| **Completed Topics Count** | `completedTopics` | **Numerical** (Integer, e.g. `5`) | `@play/progress:{skillId}` | `play_progress.completed_topics` | Updated when a learner finishes all questions in a session topic |
| **Total Topics in Curriculum** | `totalTopics` | **Numerical** (Integer, e.g. `46`) | `@play/progress:{skillId}` | `play_progress.total_topics` | Derived from the loaded curriculum definition |
| **Completed Tracks List** | `completedTracks` | **Array of Strings** (e.g. `["full", "reading"]`) | `@play/completed_tracks:{skillId}` | Local per-skill cache | Recorded when all topics within a specific track are finished |
| **Tabs Unlocked Gate** | `tabsUnlocked` | **Boolean as String** (`"true"`) | `@play/tabs_unlocked` | Local device state | Permanently set to `"true"` the first time any topic is completed |
| **Daily Activity Dates** | `dates` | **Array of Strings** (`YYYY-MM-DD`, e.g. `["2026-09-06", "2026-09-07"]`) | `@play/activity_dates` | `play_user_stats.last_active_date`, `play_user_stats.active_days_count` | Appended automatically on first question/session completed each day |
| **Current Streak** | `currentStreak` | **Numerical** (Integer, e.g. `4`) | Computed from `activity_dates` | Computed dynamically | Displayed in Reports tab & Streak panel |
| **Maximum Streak** | `maxStreak` | **Numerical** (Integer, e.g. `12`) | Computed from `activity_dates` | Computed dynamically | Best consecutive-day learning streak achieved |
| **Question Mistake Count** | `failCount` | **Numerical** (Integer, e.g. `3`) | `@play/mistakes:{skillId}` | `play_question_attempts.fail_count` | Incremented when a learner selects an incorrect choice |
| **Question Attempt Count** | `attemptCount` | **Numerical** (Integer, e.g. `4`) | `@play/mistakes:{skillId}` | `play_question_attempts.attempt_count` | Total times this question has been answered |
| **Question Solved Status** | `solved` | **Boolean** (`true` / `false`) | `@play/mistakes:{skillId}` | `play_question_attempts.solved` | Starts `false` on mistake; flips to `true` once later answered correctly |
| **Last Missed Timestamp** | `lastMissedAt` | **ISO 8601 String** (e.g. `"2026-09-07T08:30:00.000Z"`) | `@play/mistakes:{skillId}` | `play_question_attempts.last_missed_at` | Updated whenever an incorrect answer is recorded |
| **Paystack Reference** | `paystack_ref` | **String** (e.g. `"pataplay_178877_a1b2c3"`) | Transient URL query param | `play_purchases.paystack_ref` | Unique transaction ID generated for Paystack Pop checkout |
| **Keys Purchased** | `keys` | **Numerical** (Integer, e.g. `20`, `50`, `120`) | Transient URL query param | `play_purchases.keys` | Key count granted upon payment verification |
| **Notification Reminder** | `timer_reminders` | **Boolean as String** (`"true"` / `"false"`) | `@play/timer_reminders` | Local device state | User toggle in Settings or out-of-keys timer prompt |
| **Scheduled Reset Time** | `scheduled_reset_at` | **String (Epoch ms)** (`"1788775000000"`) | `@play/scheduled_reset_at` | Local device state | Survives app close so background/reopen checks fire accurately |
| **Last Notified Reset** | `last_notified_reset_at` | **String (Epoch ms)** (`"1788775000000"`) | `@play/last_notified_reset_at` | Local device state | Prevents duplicate notifications for the same cooldown period |
| **Display Currency** | `currency` | **String** (`"USD"` or `"KES"`) | `@play/currency` | Local device state | User selection in Settings |
| **Theme Mode** | `theme` | **String** (`"dark"`, `"light"`, or `"system"`) | `@theme_preference` | Local device state | User theme selection |

---

## 3. Remote Database (Supabase) Schema Breakdown

When an email is present, data is mirrored to the following Supabase tables:

### 1. `play_accounts`
Stores the durable account state, key balance, and premium subscription:
- `email` (text, Primary Key)
- `balance` (integer) — e.g. `3`, `20`, `999999`
- `is_premium` (boolean) — `true` for Unlimited subscriber
- `reset_at` (timestamptz) — When the next free timer reset occurs
- `reset_count` (integer) — Escalating cooldown tier counter
- `updated_at` (timestamptz)

### 2. `play_user_stats`
Stores high-level engagement and gamification metrics:
- `email` (text, Primary Key)
- `total_xp` (integer) — Lifetime accumulated XP across all curricula
- `active_days_count` (integer) — Count of distinct calendar days active
- `last_active_date` (text / date) — `YYYY-MM-DD` of most recent activity
- `updated_at` (timestamptz)

### 3. `play_progress`
Stores topic completion per learner:
- `email` (text, Primary Key / Composite)
- `completed_topics` (integer) — Highest completed topic index + 1
- `total_topics` (integer) — Total topics in curriculum
- `updated_at` (timestamptz)

### 4. `play_question_attempts`
Stores per-question learning performance for the Mistakes Review screen:
- `email` (text)
- `skill_id` (text) — Curriculum slug (e.g. `driving-theory`)
- `question_id` (text) — Unique question identifier
- `topic_index` (integer) — 0-based topic number
- `fail_count` (integer) — Number of times answered incorrectly
- `attempt_count` (integer) — Total attempts
- `solved` (boolean) — `true` if learner has since answered correctly
- `last_missed_at` (timestamptz)
- *Primary Key: (`email, question_id`)*

### 5. `play_purchases`
Stores immutable purchase records from Paystack:
- `email` (text)
- `paystack_ref` (text, Primary Key)
- `keys` (integer) — Number of keys purchased (e.g. `20`)
- `is_premium` (boolean) — `true` if this was an Unlimited subscription
- `updated_at` (timestamptz)

### 6. `help_requests`
Stores support, billing, bug, and feedback submissions from Settings → Help → Feedback Form:
- `user_id` (uuid, nullable) — Supabase Auth UID if signed in
- `name` (text) — Learner display name or email handle
- `email` (text, nullable) — Contact email for response
- `topic` (text) — Selected category (`premium`, `bug`, `billing`, `account`, `content`, `other`)
- `custom_topic` (text, nullable) — Optional short summary when topic is `other`
- `message` (text) — User message description
- `app_version` (text) — App version string (e.g. `1.0.0`)
- `created_at` (timestamptz)

---

## 4. Account Lifecycle & Data Security

- **Anonymous Mode:** Learners can use the app without entering an email. All state resides on-device in `AsyncStorage`.
- **Identity Linkage:** Entering an email on `KeysOfferScreen`, buying keys, or signing in associates the local device data with that email on Supabase.
- **Account Restore:** Entering a previously used email downloads and restores the remote key balance, premium status, and topic progress to the device (`lib/restore.ts`).
- **Logout:** Logging out in Settings clears `@play/user_email` locally so a different learner can use the device without overwriting the previous account.
