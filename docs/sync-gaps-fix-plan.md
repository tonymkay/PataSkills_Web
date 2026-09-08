# Sync gaps — fix plan

> Status: **plan only, not yet built.** Written after auditing the Aug-shipped
> backup feature (`a7e3e36`) against live schema + the actual sync code.
> Four real gaps found, in priority order below.

---

## Gap 1 — `play_user_stats` table doesn't exist
`lib/xp.ts` and `lib/streak.ts` both upsert to `play_user_stats`. No `.sql`
migration for it exists anywhere in the repo (confirmed via `git grep`).
Every XP/streak sync — live and the new manual "Back up now" — has been
silently failing via `catch {}` since the day these were written.
`lib/leaderboard.ts` also reads from this same missing table, so the
leaderboard is blank/broken for the same reason. PlayDashboard's own
`docs/plan.md` §9 already flagged this from the dashboard side.

**Fix:** new migration `play_user_stats.sql`, built device_id-first (see
Gap 3 — same identity model as `play_devices`/`play_purchases`, not the
email-only model `play_progress` currently uses):

```sql
create table if not exists play_user_stats (
  device_id text primary key,
  email text,
  total_xp integer not null default 0,
  active_days_count integer not null default 0,
  last_active_date text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_play_user_stats_email on play_user_stats(email);
alter table play_user_stats enable row level security;
create policy "public select play_user_stats" on play_user_stats for select using (true);
create policy "public insert play_user_stats" on play_user_stats for insert with check (true);
create policy "public update play_user_stats" on play_user_stats for update using (true) with check (true);
```

Rewrite `syncXpToCloud`/`syncStreakToCloud` (and their `push*ToCloud`
wrappers) and `leaderboard.ts`'s read to key on `device_id` (always
available, matches `question_attempts`) with `email` carried along as an
extra column, not the primary key. This is what unblocks XP/streak for
**every** device, not just email-linked ones — see Gap 3, same fix.

---

## Gap 2 — No "back online" trigger, only "at record time"
Confirmed via `git grep -i "NetInfo\|isConnected"` — zero matches. Every
`sync*ToCloud()` call (`mistakes.ts`, `xp.ts`, `streak.ts`,
`deviceAnalytics.ts`, `keys.ts`'s `write()`) fires once, at the moment the
local action happens, wrapped in `catch {}`. If the device is offline at
that exact instant, that attempt is simply dropped — nothing retries it
until either (a) another qualifying action happens while online, or (b)
the user manually taps "Back up now." A learner who does a whole session
offline and then reopens the app with signal gets nothing pushed
automatically.

**Fix:**
1. Add `@react-native-community/netinfo`.
2. In `app/_layout.tsx`, add a listener: on transition from offline →
   online, call `runManualBackup()` silently (no `Alert`, swallow the
   result) — reuses the exact function already built for the Settings
   button, no new sync logic needed.
3. Throttle it (e.g. `AsyncStorage` timestamp, skip if last auto-flush was
   under ~2 minutes ago) so a flaky connection doesn't hammer Supabase with
   repeated full backups.

This directly answers "does data get submitted when I go online" — right
now the honest answer is *no, not automatically*; this closes that.

---

## Gap 3 — Device ↔ email fragmentation (the "device id fix")
Today the tables split into two incompatible identity models:

| Table | Keyed by | Works for anonymous devices? |
|---|---|---|
| `play_devices` | `device_id` (email optional column) | Yes |
| `question_attempts` (mistakes) | `device_id` | Yes |
| `play_purchases` | `email` (+ `device_id` column added later, unindexed into the key) | No — purchase itself still email-gated for the buyer record |
| `play_progress` | `(email, skill_id)` **only** | **No** |
| `play_user_stats` (new, Gap 1) | currently planned as `email` in the code | **No**, unless fixed here |

Because `play_progress`/`play_user_stats` are email-only, everything in
`lib/backup.ts` currently does `email ? push... : skip` — an anonymous
learner (the common case pre-signup) gets **zero** progress/XP/streak
backup no matter what, silently. This is the actual "device and email
can't communicate" problem.

**Fix — migrate progress + stats to the `play_devices` pattern:**
1. `alter table play_progress add column if not exists device_id text;`
   `create index ... on play_progress(device_id);` — additive, no data
   loss. Change the upsert conflict target from `email,skill_id` to
   `device_id,skill_id` for the primary write path, and start writing
   `device_id` on every `markTopicCompleted`/`markTrackCompleted` call
   (it's already available via `lib/deviceId.ts`, same as every other
   sync call in this file's sibling modules).
2. Build `play_user_stats` device_id-first from day one (Gap 1's SQL
   already does this).
3. Update `lib/progress.ts`'s three sync paths
   (`markTopicCompleted`, `markTrackCompleted`, `pushAllProgressToCloud`)
   to always write by `device_id`, and additionally write by `email` when
   one is linked — mirrors `deviceAnalytics.ts`'s existing
   `...(email ? { email } : {})` spread pattern exactly.
4. **Reconciliation on link:** `deviceAnalytics.ts` already has
   `linkDeviceToEmail()`, called right when an account links. Add one call
   right after it succeeds: `void runManualBackup()` — this immediately
   pushes everything the device already has locally under the
   newly-linked email, instead of waiting for the next natural sync event.
   This is the actual "device and email communicate" moment — closes the
   gap where a learner plays anonymously for a while, *then* signs up, and
   their pre-signup progress silently never makes it to the account.

`syncAllProgressWithCloud` (the restore-on-launch path) should also start
querying `.or(email.eq...,device_id.eq...)` instead of `.eq('email', ...)`
only, so a returning anonymous device sees its own prior progress even
before any email is linked.

---

## Gap 4 — `pushKeysToCloud()` reports success it never checked
`lib/keys.ts`'s `write()` swallows its own Supabase error in `catch {}`
with no return value; `pushKeysToCloud()` calls `write()` then
unconditionally returns `true` (as long as an email exists). The Backup
alert's "Keys: synced" line can be wrong.

**Fix:** give `write()` a boolean return (`true`/`false` on the Supabase
leg specifically, independent of the local `AsyncStorage` write which
should keep swallowing errors as-is — local write must never block
gameplay). `pushKeysToCloud()` returns that value instead of a hardcoded
`true`.

---

## Build order
1. **Gap 1** (new table) — unblocks XP/streak/leaderboard outright, zero
   risk, additive only.
2. **Gap 4** (keys honesty fix) — smallest change, no schema.
3. **Gap 3** (device_id-first progress/stats + reconciliation on link) —
   depends on Gap 1's table shape; this is the one that actually answers
   "device and email communicate."
4. **Gap 2** (NetInfo online-trigger) — layered on top last, since it just
   calls the now-fixed `runManualBackup()`.

Each phase is independently shippable/testable — recommend one commit per
gap, same granularity as `a7e3e36`.
