# Cross-Device Progress Restore — Fix Plan (IMPLEMENTED)

> Status: **built and live.** `play_progress` (composite key `email,
> skill_id`, with `completed_tracks` jsonb) has been created and the
> migration run. `lib/progress.ts` and `LandingScreen.tsx` were updated per
> §2-§4 below. Decisions taken on the open questions in §5: completed
> tracks ARE restored (folded into the same table/query, no extra round
> trip); merge is max-wins on every field, never regresses either side
> (offline-first priority); auto-restore batches every skill into ONE
> query via `syncAllProgressWithCloud()` rather than one per skill.
> See `userdata.md` §3/§4 for the durable reference.
> Related: `docs/device-tracking-plan.md`, `userdata.md`.

---

## 1. The two bugs

**Bug A — `play_progress` table doesn't exist.**
`syncProgressWithCloud()` in `lib/progress.ts` queries a Supabase table
called `play_progress` that was never created. The query fails with
`PGRST205`, gets swallowed by a `catch {}`, and the function silently
falls back to local-only progress. Net effect: logging in on a new device
restores keys/premium (via `play_accounts`, which does exist) but **not**
progress — the learner starts every skill back at 0.

**Bug B — no skill scoping, even once the table exists.**
`markTopicCompleted()` writes one row per **email** to `play_progress`,
with no `skill_id` column. Progress in `driving-theory` and progress in
`true-false` would collide and overwrite each other the moment more than
one skill is in play for the same learner. Everything else in this
codebase (`play_devices` events, `AsyncStorage` keys) is already scoped
per-skill; this table needs to match.


## 2. Fix — new table, properly scoped

New file: `supabase/play_progress.sql`

| Column | Type | Notes |
|---|---|---|
| `email` | text | part of composite PK |
| `skill_id` | text | part of composite PK — curriculum slug |
| `completed_topics` | integer | |
| `total_topics` | integer | |
| `updated_at` | timestamptz | |

Primary key: `(email, skill_id)`. One row per learner per skill — mirrors
how `AsyncStorage`'s `@play/progress:{skillId}` is already scoped, so the
cloud shape matches the local shape exactly (straightforward merge, no
translation layer).

RLS: same "allow all to anon/authenticated" policy as `play_accounts.sql`
and `play_purchases.sql` — this app has no server-side auth gate today,
so matching the existing pattern rather than introducing a new one.

Also add `track_progress` (jsonb or a second small table) **only if** you
want completed-tracks (`markTrackCompleted` / `@play/completed_tracks:{skillId}`)
to restore too — right now that's local-only and not in scope of the bug
just found. Flagging as a **decision needed**, not assuming either way —
see §5.

## 3. Code changes

**`lib/progress.ts`**
- `markTopicCompleted()`: upsert to `play_progress` with `onConflict:
  'email,skill_id'` instead of `'email'`, and include `skill_id` in the
  row.
- `syncProgressWithCloud(email, skillId)`: filter the select by
  `.eq('skill_id', skillId)` too, not just email. Comment noting the
  table-doesn't-exist workaround gets deleted — it's the reason this was
  a no-op.

**`lib/restore.ts`**
- No change needed — `restoreAccountByEmail()` already calls
  `syncProgressWithCloud(email)` with a default `skillId` param. Once that
  function is fixed, this path starts working, but only restores
  whichever single skill's bucket happens to be active at call time (see
  §4 for why that's not enough on its own).

## 4. Auto-restore on mount ("if there's internet")

Today, `syncProgressWithCloud()` only runs inside the manual
`restoreAccountByEmail()` flow (Settings → restore / Google sign-in) — it
does not run just because a device already has `@play/user_email` stored
and opens the app. That's the second half of what you asked for.

**Where to hook it:** `LandingScreen.tsx`'s existing mount `useEffect`
already reads `@play/user_email` (see the linked-email check at line
~76). Right after that read, if an email is found *and* every known skill
slug (from `getCurriculaCatalog()`, already fetched in the same
component) should have its cloud progress pulled and merged into local
storage — looping `syncProgressWithCloud(email, slug)` per skill, not
just the default bucket.

**"If there is internet":** every Supabase call here already fails silently
(wrapped in `try/catch`, same pattern as `deviceAnalytics.ts`) — offline
just means the merge no-ops and local progress is shown as-is. No new
connectivity check needed; the existing fire-and-forget pattern already
degrades correctly.

## 5. Open questions (need your call before building)

1. **Completed tracks (`markTrackCompleted`)** — restore these too, or
   leave local-only for now? Affects whether §2's table needs a second
   column/table.
2. **Merge direction on conflict** — `syncProgressWithCloud` currently
   takes `max(local, cloud)` per skill (never regresses). Keep that, or
   should cloud always win (e.g. if they intentionally reset progress on
   one device and it should propagate)?
3. **Per-skill loop cost** — auto-restore-on-mount means one Supabase
   query per known skill, every landing-page mount, for logged-in
   devices. Fine at current skill count; flagging in case the catalog
   grows a lot and you'd rather batch it into one query
   (`.in('skill_id', allSlugs)`) instead of N.

## 6. Implementation steps (once approved)

1. `supabase/play_progress.sql` — new table + RLS, per §2.
2. Edit `lib/progress.ts` — scope `markTopicCompleted` and
   `syncProgressWithCloud` by `skill_id` (§3).
3. Edit `LandingScreen.tsx`'s mount effect — loop cloud sync across all
   catalog skills when an email is present (§4).
4. `npx tsc --noEmit` to verify.
5. Manual test: complete a topic on device A under an email, log into
   that email on a fresh device/simulator, confirm progress appears
   without visiting Settings → Restore.
6. Update `userdata.md` with the new table.
