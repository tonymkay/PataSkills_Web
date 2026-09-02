-- Adds reset_count to play_accounts: how many times a given account's free
-- daily reset has actually fired. Drives the escalating cooldown in
-- lib/keys.ts (resetDurationFor) — 5 min the first time, 2 hrs the second,
-- 8 hrs the third and every time after. Run this once in the Supabase SQL
-- editor; existing rows default to 0 (first-tier duration).

alter table play_accounts
  add column if not exists reset_count integer not null default 0;
