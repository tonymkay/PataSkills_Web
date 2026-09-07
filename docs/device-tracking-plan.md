# Device Tracking / Analytics — Implementation Plan (IMPLEMENTED)

> Status: **built and live.** `lib/deviceId.ts`, `lib/deviceAnalytics.ts`,
> `play_devices`, `play_device_events` all exist and are wired into
> `LandingScreen.tsx` / `SkillsFlow.tsx` / `PlaySession.tsx` as described
> below. As of the device↔email join fix, `lib/billing.ts` also calls
> `linkDeviceToEmail()` directly on purchase success and stamps `device_id`
> onto `play_purchases` — see `docs/progress-restore-fix-plan.md` and
> `userdata.md` §4/§5 for the durable reference on both.
> Companion specs: `userdata.md` (existing storage keys + tables), `CODEBASE.md`.

---

## 1. Why

Today, an anonymous device (no email linked yet) leaves **zero trace** in
Supabase. Every table in `userdata.md` (`play_accounts`, `play_progress`,
`play_user_stats`, `play_question_attempts`) is keyed by `email`, and email
only exists once a learner reaches checkout, Google sign-in, or account
restore. Everything before that — which is most of the funnel, including
100% of first-time visitors on the landing page — is invisible to us.

Goal: give every device a stable anonymous identity the moment it opens the
app, and log a handful of checkpoints against that identity, so we can build
a report like:

> "6 devices landed on the homepage today. Of those, 2 completed a topic.
> Here's each device's key balance, skill, and last-seen time."

---

## 2. Current state (confirmed by reading the code)

- **No device ID / fingerprint exists anywhere in `play/`.** No
  `expo-device`, `expo-application`, or UUID package in `package.json`.
- Local `AsyncStorage` already holds everything per-device (keys, progress,
  XP, streak, mistakes) — see `userdata.md` §2. This data simply never
  leaves the device unless `@play/user_email` is set.
- `LandingScreen.tsx` mounts with **no tracking call** today — it fetches
  the curricula catalog and local progress, nothing else.
- `PlaySession.tsx`'s `handleSessionComplete` already computes exactly the
  stats we need for "questions done / missed" per topic:
  `{ correctCount, totalAnswered }` — it's just not persisted anywhere
  beyond local XP/streak.

---

## 3. Device identity

New file: `lib/deviceId.ts`

- A random ID (UUID v4 shape) generated **once**, written to
  `AsyncStorage` under `@play/device_id`, and cached in memory for the
  rest of the app's life. Every later checkpoint reads this cached value —
  no repeated AsyncStorage hits.
- `getDeviceId(): Promise<string>` — returns the existing ID, or creates
  and persists one on first call.
- This is an **anonymous install ID**, not a hardware fingerprint. It:
  - Resets if the user clears app storage / uninstalls-reinstalls.
  - Resets per-browser on web (no cross-browser or incognito continuity —
    same ceiling every AsyncStorage-backed web feature already has, e.g.
    keys/progress today).
  - Is *not* tied to IMEI, advertising ID, or any OS-level identifier —
    deliberately, since those need extra native permissions/config
    (`expo-application`, App Tracking Transparency on iOS, etc.) that
    this app doesn't currently have and that raise their own consent
    requirements. Flagging this as a real trade-off, not an oversight —
    see open question in §7.
- Generation method (no new dependency): a small local `uuidv4()` using
  `Math.random()`, good enough for an anonymous analytics key. (Open
  question in §7 if you'd rather add `expo-crypto` for
  `Crypto.randomUUID()` instead.)

---

## 4. Data model (Supabase — 2 new tables)

### `play_devices` — one row per device, upserted (the "current state" table)

This IS the report table you described — `SELECT * FROM play_devices` gives
the six-devices-and-their-key-balances view directly.

| Column | Type | Notes |
|---|---|---|
| `device_id` | text, PK | from `lib/deviceId.ts` |
| `platform` | text | `ios` \| `android` \| `web` (`Platform.OS`) |
| `first_seen_at` | timestamptz | set once, on first insert |
| `last_seen_at` | timestamptz | bumped on every checkpoint |
| `landing_views_count` | integer | incremented on `landing_page_seen` |
| `sessions_count` | integer | incremented on `session_started` |
| `topics_completed_count` | integer | incremented on `topic_complete` |
| `key_balance` | integer | latest known balance snapshot |
| `is_premium` | boolean | latest known value |
| `last_skill_id` | text, nullable | curriculum slug of most recent activity |
| `last_track` | text, nullable | track of most recent activity |
| `email` | text, nullable | filled in **if/when** this device later links an email — lets you join a device's anonymous history to its account after the fact |
| `updated_at` | timestamptz | |

### `play_device_events` — append-only log (the "checkpoints" / timeline)

Backs the summary table above and answers the "was this today or
yesterday" / "how many sessions" questions with real timestamps.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `device_id` | text | FK → `play_devices.device_id` |
| `event_type` | text | `'landing_page_seen'` \| `'session_started'` \| `'topic_complete'` |
| `skill_id` | text, nullable | curriculum slug |
| `track` | text, nullable | e.g. `pairs`, `full`, `reading` |
| `topic_index` | integer, nullable | only on `topic_complete` |
| `questions_answered` | integer, nullable | `totalAnswered` from `SessionStats` — only on `topic_complete` |
| `questions_missed` | integer, nullable | `totalAnswered - correctCount` — only on `topic_complete` |
| `key_balance` | integer, nullable | snapshot at this exact checkpoint |
| `created_at` | timestamptz | defaults `now()` — this is your "time" axis |

Two tables, not one, on purpose: `play_devices` stays cheap to read for the
live dashboard/report; `play_device_events` is where all the per-question
and per-session detail and history lives, and it's what you'd query if you
ever need "show me everything device X did on 2026-09-06."

No third table for question-level detail — `topic_complete` events already
carry `questions_answered` / `questions_missed` per topic, and summing
those across a device+skill gives "progress in that skill" without needing
device-scoped per-question rows (which `play_question_attempts` doesn't
have today either — that table is email-only, same gap).

---

## 5. Instrumentation — exact touchpoints

New file: `lib/deviceAnalytics.ts` — one function per event, each does:
read `getDeviceId()` → upsert `play_devices` (bump the relevant counter +
`last_seen_at` + snapshot fields) → insert one `play_device_events` row.
Fire-and-forget (`void`, swallow errors) — same pattern every existing
`sync*ToCloud()` in `lib/keys.ts` / `lib/xp.ts` / `lib/streak.ts` already
uses, so a flaky connection never blocks gameplay.

| # | Event | Fires from | Exact hook |
|---|---|---|---|
| 1 | `landing_page_seen` | `components/landing/LandingScreen.tsx` | new `useEffect` on mount, alongside the existing catalog/progress fetch |
| 2 | `session_started` | `components/play/SkillsFlow.tsx` | end of `runDownload()`, right after `setStage('session')` succeeds (has `skillId` + `track` in scope already) |
| 3 | `topic_complete` | `components/play/PlaySession.tsx` | inside `handleSessionComplete`, alongside the existing `markTopicCompleted(...)` call — `stats.correctCount` / `stats.totalAnswered` are already right there |

Key balance is **snapshotted at each of these 3 checkpoints** (call
`getKeyBalance()` from `lib/keys.ts`, already imported nowhere new needed)
rather than logged on every single key spend/grant — that would mean an
event on every session entry anyway (keys spend on entry) and adds no
signal beyond what the 3 checkpoints already give you.

---

## 6. Interpretation — how you'd actually read this

The headline report is just:

```sql
select device_id, platform, landing_views_count, sessions_count,
       topics_completed_count, key_balance, is_premium,
       last_skill_id, last_track, last_seen_at
from play_devices
order by last_seen_at desc;
```

"Devices that landed today but never completed a topic" (drop-off view):

```sql
select * from play_devices
where last_seen_at::date = current_date
  and topics_completed_count = 0;
```

Per-device timeline ("what did this device do, and when"):

```sql
select event_type, skill_id, track, questions_answered,
       questions_missed, key_balance, created_at
from play_device_events
where device_id = '...'
order by created_at;
```

Not building an in-app admin screen as part of this pass (Supabase's own
table editor / SQL editor covers the above immediately, for free) — see
open question in §7 on whether that's wanted now or later.

---

## 7. Decisions (resolved)

1. **Scope of `landing_page_seen`: every mount, pre- and post-unlock.**
   Fires every time `LandingScreen` mounts — the first-ever pre-unlock run
   *and* every later visit to the "Skills" tab. This is also what stands
   in for "when are they online": `last_seen_at` on `play_devices` gets
   bumped on every checkpoint (landing view, session start, topic
   complete), so "is this device active" reads as "how recent is
   `last_seen_at`," not a live socket/heartbeat connection. Flagging that
   distinction explicitly — this gives you recency, not a real-time
   presence indicator. Said to be enough for your purposes (landing hit +
   topic finished + key balance, traced over time).
2. **Device ID: app-generated random UUID in `AsyncStorage`, upserted —
   no new native dependency, no store-review exposure.**
   - This is exactly what "survive and be reused as long as they return,
     unless they clear cache" describes: it persists across every normal
     app open/close, and only resets if local storage is cleared or the
     app is uninstalled/reinstalled — the same boundary every other piece
     of local state in this app already has (keys, progress, XP all reset
     on reinstall today too).
   - **Why not something that survives reinstall/uninstall too:**
     that needs a store-level identifier — iOS's IDFA (needs an App
     Tracking Transparency prompt) or Android's Advertising ID (needs a
     Data Safety disclosure and must be dropped the moment the user resets
     it in system settings). Both raise real store-review and consent
     overhead for a benefit email-linking already covers below. Not
     using either.
   - **"Same device detected twice, merge, don't assume two people":**
     handled two ways. (a) `play_devices` is keyed by `device_id` as
     primary key and every checkpoint is an *upsert*, so the same device
     session never creates a duplicate row. (b) The real "don't assume two
     people" case is one learner across multiple devices, or the same
     device across a reinstall — both surface once that device links an
     email (checkout / Google sign-in / restore, same flow as today).
     `play_devices.email` gets filled in at that point, and any reporting
     query rolls up by email when it's present, treating every device_id
     that ever shared that email as one person. Fully anonymous learners
     who never link an email and then reinstall will appear as a second,
     unmerged device — an accepted trade-off of not using GAID/IDFA.
3. **No in-app admin screen.** You already have a separate admin panel and
   will read this straight from Supabase. Skipping `app/admin/devices.tsx`
   entirely. Documenting `play_devices` / `play_device_events` thoroughly
   in `userdata.md` instead, per §8 below.

---

## 8. Implementation steps (once approved)

1. `supabase/play_devices.sql` + `supabase/play_device_events.sql` — new
   tables, RLS policies matching the existing `play_accounts.sql` pattern.
2. `lib/deviceId.ts` — new.
3. `lib/deviceAnalytics.ts` — new (`trackLandingPageSeen`,
   `trackSessionStarted`, `trackTopicComplete`).
4. Three call-site edits: `LandingScreen.tsx`, `SkillsFlow.tsx`,
   `PlaySession.tsx` (table in §5).
5. `npx tsc --noEmit` to verify.
6. Update `userdata.md` and `CODEBASE.md` with the new tables/flow.

No changes to any existing table, storage key, or user-facing UI — this is
additive only.
