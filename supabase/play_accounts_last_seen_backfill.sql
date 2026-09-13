-- ============================================================
-- Play: correct play_accounts.updated_at for migrated users
--
-- ROOT CAUSE (see play_transfer_data_from_old_app.sql, step 3):
-- the migration stamped updated_at = now() for every migrated
-- play_accounts row, regardless of the user's real last activity.
-- Since `now()` is constant across every statement in one Postgres
-- transaction, every row the migration touched shares the exact
-- same updated_at value -- that's the signature we use below to
-- find (only) the untouched-since-migration rows, so we never
-- overwrite a real post-migration timestamp from actual gameplay
-- (a key spend/grant already moved updated_at forward for anyone
-- who's played since).
--
-- Run the SELECTs below FIRST and eyeball them before running the
-- UPDATE further down.
-- ============================================================

-- Step 1 -- confirm the migration's timestamp signature.
-- Expect one timestamp shared by a large cluster of rows (the
-- migration batch); everything else should look like scattered,
-- genuine activity timestamps.
SELECT updated_at, count(*) AS row_count
FROM public.play_accounts
GROUP BY updated_at
ORDER BY row_count DESC
LIMIT 10;

-- Step 2 -- preview exactly what the backfill would change.
-- Uses the same real-last-seen computation as the original
-- migration (MAX(last_seen_at) per email from device_profiles).
WITH migration_ts AS (
    SELECT updated_at
    FROM public.play_accounts
    GROUP BY updated_at
    HAVING count(*) > 1
    ORDER BY count(*) DESC
    LIMIT 1
),
real_last_seen AS (
    SELECT
        lower(trim(dp.email)) AS email,
        MAX(dp.last_seen_at) AS last_seen_at
    FROM public.device_profiles dp
    WHERE dp.email IS NOT NULL
      AND trim(dp.email) <> ''
      AND dp.deleted_at IS NULL
    GROUP BY lower(trim(dp.email))
)
SELECT
    pa.email,
    pa.updated_at AS current_fake_value,
    rls.last_seen_at AS will_become
FROM public.play_accounts pa
JOIN real_last_seen rls ON rls.email = pa.email
CROSS JOIN migration_ts mt
WHERE pa.updated_at = mt.updated_at   -- only rows untouched since migration
  AND rls.last_seen_at IS NOT NULL
  AND rls.last_seen_at < mt.updated_at  -- only ever backdate, never move forward
ORDER BY rls.last_seen_at DESC;

-- Step 3 -- the actual correction. Only run after Step 2's preview
-- looks right.
BEGIN;

WITH migration_ts AS (
    SELECT updated_at
    FROM public.play_accounts
    GROUP BY updated_at
    HAVING count(*) > 1
    ORDER BY count(*) DESC
    LIMIT 1
),
real_last_seen AS (
    SELECT
        lower(trim(dp.email)) AS email,
        MAX(dp.last_seen_at) AS last_seen_at
    FROM public.device_profiles dp
    WHERE dp.email IS NOT NULL
      AND trim(dp.email) <> ''
      AND dp.deleted_at IS NULL
    GROUP BY lower(trim(dp.email))
)
UPDATE public.play_accounts pa
SET updated_at = rls.last_seen_at
FROM real_last_seen rls, migration_ts mt
WHERE pa.email = rls.email
  AND pa.updated_at = mt.updated_at
  AND rls.last_seen_at IS NOT NULL
  AND rls.last_seen_at < mt.updated_at;

COMMIT;

-- Note: play_devices.last_seen_at was NOT corrupted by the migration
-- (it already used COALESCE(dp.last_seen_at, now()) correctly) --
-- only play_accounts.updated_at needed this correction.
