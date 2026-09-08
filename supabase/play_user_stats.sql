-- New table, device_id-first (same identity model as play_devices),
-- unlike play_progress which is currently email-only -- see
-- docs/sync-gaps-fix-plan.md Gap 1/Gap 3. Backs lib/xp.ts, lib/streak.ts,
-- and lib/leaderboard.ts's read. Previously referenced by all three with
-- no migration ever created for it -- every XP/streak sync (live and the
-- manual "Back up now" push) has been silently failing via catch {} since
-- those files were written.

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

-- Same anon-key access pattern as play_devices.sql / play_accounts.sql --
-- no per-user auth is enforced elsewhere in this app.
create policy "public select play_user_stats"
  on play_user_stats for select
  using (true);

create policy "public insert play_user_stats"
  on play_user_stats for insert
  with check (true);

create policy "public update play_user_stats"
  on play_user_stats for update
  using (true)
  with check (true);
