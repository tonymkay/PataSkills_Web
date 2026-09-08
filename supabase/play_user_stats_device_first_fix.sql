-- Corrective follow-up to play_user_stats.sql. That migration assumed a
-- fresh table (`create table if not exists`), but play_user_stats already
-- existed -- created outside this repo's tracked migrations at some
-- earlier point, email-keyed, already holding a live row. Confirmed via a
-- direct query: it has (email, total_xp, active_days_count,
-- last_active_date, updated_at) and no device_id column at all, so
-- `create table if not exists` silently no-op'd and the app's
-- device_id-keyed upserts (lib/xp.ts, lib/streak.ts) now fail outright
-- with "Could not find the 'device_id' column." The policy-already-exists
-- error on the original migration is the same root cause -- that
-- pre-existing table already had RLS policies with the same names this
-- repo's convention uses.
--
-- Safe to re-run: every step below is idempotent (IF NOT EXISTS / guarded
-- DO blocks), unlike plain CREATE POLICY, which has no IF NOT EXISTS form
-- in Postgres -- that gap is exactly what caused the original error.

alter table play_user_stats add column if not exists device_id text;

-- The existing row predates device tracking on this table -- there's no
-- way to recover which device actually wrote it, so it gets a
-- placeholder rather than staying null (device_id needs to be NOT NULL to
-- become the primary key below). This placeholder will simply never match
-- a real device's future upsert; the next time that learner's app opens,
-- the real device_id re-syncs its current local totals under itself,
-- landing as a fresh row alongside this historical one.
update play_user_stats set device_id = 'legacy-email-only-' || email
  where device_id is null and email is not null;

-- The original primary key was on `email`. Postgres refuses to drop NOT
-- NULL on a column that's still part of a primary key (error 42P16), so
-- the old PK constraint has to go first -- before touching email's
-- nullability, not after.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'play_user_stats'::regclass and contype = 'p'
  ) then
    execute (
      select 'alter table play_user_stats drop constraint ' || conname
      from pg_constraint
      where conrelid = 'play_user_stats'::regclass and contype = 'p'
    );
  end if;
end $$;

alter table play_user_stats alter column device_id set not null;
alter table play_user_stats alter column email drop not null;
alter table play_user_stats add primary key (device_id);

create index if not exists idx_play_user_stats_email on play_user_stats(email);

alter table play_user_stats enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'play_user_stats' and policyname = 'public select play_user_stats'
  ) then
    create policy "public select play_user_stats" on play_user_stats for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'play_user_stats' and policyname = 'public insert play_user_stats'
  ) then
    create policy "public insert play_user_stats" on play_user_stats for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'play_user_stats' and policyname = 'public update play_user_stats'
  ) then
    create policy "public update play_user_stats" on play_user_stats for update using (true) with check (true);
  end if;
end $$;
