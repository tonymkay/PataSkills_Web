BEGIN;

-- ============================================================
-- PataSkills V2
-- OLD DATABASE -> PLAY / NEW DATABASE MIGRATION
--
-- Safe migration:
--   1. Email
--   2. Keys
--   3. Global XP
--   4. Premium
--   5. Percentage-based skill progress ONLY when the old
--      skill name exactly matches a new curriculum title
--   6. Maximum streak
--
-- Intentionally NOT migrated:
--   - old question attempts / missed questions
--   - old per-skill XP (does not exist reliably in old DB)
--   - old chapter/topic identities
--   - old streak charges
--
-- Existing play_* table structures are NOT altered.
-- ============================================================


-- ============================================================
-- 1. NEW TABLE: maximum historical streak
-- ============================================================

CREATE TABLE IF NOT EXISTS public.play_user_streaks (
    email TEXT PRIMARY KEY,
    max_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. BUILD ONE OLD-PROFILE ROW PER EMAIL
--
-- If a user has multiple old device profiles, use the highest
-- values for things that represent account-level progress.
-- ============================================================

CREATE TEMP TABLE migration_old_users ON COMMIT DROP AS
SELECT
    lower(trim(dp.email)) AS email,

    MAX(COALESCE(dp.key_balance, 0)) AS key_balance,

    MAX(COALESCE(dp.total_points, 0)) AS total_xp,

    BOOL_OR(
        COALESCE(dp.is_premium, false)
        OR COALESCE(dp.premium_permanent, false)
        OR COALESCE(dp.premium_override, false)
    ) AS is_premium,

    MAX(COALESCE(dp.streak_max, 0)) AS max_streak

FROM public.device_profiles dp
WHERE dp.email IS NOT NULL
  AND trim(dp.email) <> ''
  AND dp.deleted_at IS NULL
GROUP BY lower(trim(dp.email));


-- ============================================================
-- 3. CREATE / UPDATE PLAY ACCOUNT
--
-- play_accounts is keyed directly by email.
-- ============================================================

INSERT INTO public.play_accounts (
    email,
    balance,
    is_premium,
    updated_at
)
SELECT
    email,
    key_balance,
    is_premium,
    now()
FROM migration_old_users
ON CONFLICT (email)
DO UPDATE SET
    balance = GREATEST(
        COALESCE(public.play_accounts.balance, 0),
        EXCLUDED.balance
    ),
    is_premium =
        public.play_accounts.is_premium
        OR EXCLUDED.is_premium,
    updated_at = now();


-- ============================================================
-- 4. TRANSFER OLD DEVICES
--
-- This preserves the old device_id where possible.
-- The new app can subsequently associate a newly-created
-- device with the same email during account restoration.
-- ============================================================

INSERT INTO public.play_devices (
    device_id,
    email,
    first_seen_at,
    is_premium,
    key_balance,
    last_seen_at,
    platform,
    updated_at
)
SELECT
    dp.device_id,
    lower(trim(dp.email)),
    COALESCE(dp.first_seen_at, now()),
    (
        COALESCE(dp.is_premium, false)
        OR COALESCE(dp.premium_permanent, false)
        OR COALESCE(dp.premium_override, false)
    ),
    COALESCE(dp.key_balance, 0),
    COALESCE(dp.last_seen_at, now()),
    dp.os,
    now()
FROM public.device_profiles dp
WHERE dp.email IS NOT NULL
  AND trim(dp.email) <> ''
  AND dp.deleted_at IS NULL
ON CONFLICT (device_id)
DO UPDATE SET
    email = EXCLUDED.email,
    is_premium =
        public.play_devices.is_premium
        OR EXCLUDED.is_premium,
    key_balance = GREATEST(
        COALESCE(public.play_devices.key_balance, 0),
        COALESCE(EXCLUDED.key_balance, 0)
    ),
    updated_at = now();


-- ============================================================
-- 5. TRANSFER GLOBAL XP
--
-- play_user_stats is device-based, so populate it for every
-- old device belonging to the email.
-- ============================================================

INSERT INTO public.play_user_stats (
    device_id,
    email,
    total_xp,
    updated_at
)
SELECT
    dp.device_id,
    lower(trim(dp.email)),
    COALESCE(dp.total_points, 0),
    now()
FROM public.device_profiles dp
WHERE dp.email IS NOT NULL
  AND trim(dp.email) <> ''
  AND dp.deleted_at IS NULL
ON CONFLICT (device_id)
DO UPDATE SET
    email = EXCLUDED.email,
    total_xp = GREATEST(
        COALESCE(public.play_user_stats.total_xp, 0),
        COALESCE(EXCLUDED.total_xp, 0)
    ),
    updated_at = now();


-- ============================================================
-- 6. TRANSFER MAXIMUM STREAK
--
-- Kept separate because play_* currently has no max-streak
-- column.
-- ============================================================

INSERT INTO public.play_user_streaks (
    email,
    max_streak,
    updated_at
)
SELECT
    email,
    max_streak,
    now()
FROM migration_old_users
ON CONFLICT (email)
DO UPDATE SET
    max_streak = GREATEST(
        COALESCE(public.play_user_streaks.max_streak, 0),
        EXCLUDED.max_streak
    ),
    updated_at = now();


-- ============================================================
-- 7. SAFE SKILL PROGRESS MIGRATION
--
-- IMPORTANT:
-- We DO NOT copy old completed_topics directly into the new
-- curriculum.
--
-- Instead:
--
--     old completed_topics / old topic_count
--                         =
--                     old percentage
--
-- Then that percentage is applied to the NEW curriculum's
-- total_topics.
--
-- This only happens when:
--
--     lower(old skill name) = lower(new curriculum title)
--
-- If there is no exact name match, NOTHING is migrated for
-- that skill.
--
-- This avoids inventing a skill mapping.
-- ============================================================

WITH matched_progress AS (
    SELECT
        dp.device_id,
        lower(trim(dp.email)) AS email,

        pc.slug AS new_skill_id,
        pc.title AS new_skill_title,

        COALESCE(pc_total.total_topics, 46) AS new_total_topics,

        sp.completed_topics,

        -- Old skill's topic count.
        -- If unavailable/zero, percentage cannot be trusted.
        s.topic_count AS old_total_topics,

        CASE
            WHEN COALESCE(s.topic_count, 0) > 0
            THEN LEAST(
                1.0,
                GREATEST(
                    0.0,
                    sp.completed_topics::numeric
                    / s.topic_count::numeric
                )
            )
            ELSE NULL
        END AS progress_ratio

    FROM public.skill_progress sp

    JOIN public.device_profiles dp
        ON dp.device_id = sp.device_id

    JOIN public.skills s
        ON s.id::text = sp.skill_id::text

    JOIN public.play_curricula pc
        ON lower(trim(pc.title)) = lower(trim(s.name))

    LEFT JOIN LATERAL (
        SELECT
            pc_data.total_topics
        FROM (
            SELECT
                pc.slug,
                46::integer AS total_topics
        ) pc_data
        WHERE pc_data.slug = pc.slug
    ) pc_total
        ON true

    WHERE dp.email IS NOT NULL
      AND trim(dp.email) <> ''
      AND dp.deleted_at IS NULL
      AND COALESCE(s.topic_count, 0) > 0
)

INSERT INTO public.play_progress (
    device_id,
    email,
    skill_id,
    completed_topics,
    completed_tracks,
    total_topics,
    updated_at
)
SELECT
    device_id,
    email,
    new_skill_id,

    LEAST(
        new_total_topics,
        GREATEST(
            0,
            ROUND(progress_ratio * new_total_topics)::integer
        )
    ) AS completed_topics,

    '[]'::jsonb,

    new_total_topics,

    now()

FROM matched_progress

WHERE progress_ratio IS NOT NULL
  AND progress_ratio > 0

ON CONFLICT (device_id, skill_id)
DO UPDATE SET
    email = EXCLUDED.email,

    completed_topics = GREATEST(
        COALESCE(public.play_progress.completed_topics, 0),
        EXCLUDED.completed_topics
    ),

    total_topics = EXCLUDED.total_topics,

    updated_at = now();


COMMIT;