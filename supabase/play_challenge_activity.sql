-- One row per challenge race that actually finished or was abandoned,
-- for EVERY opponent kind (real player, scout/bot, offline companion) --
-- unlike play_challenges/play_challenge_members (real races only) and the
-- fully client-side scout/companion systems (never persisted at all until
-- now), this is the unconditional "this happened" log, same role
-- play_device_events already plays for solo topic sessions.
--
-- Written from lib/challengeActivity.ts, called from challenge-run.tsx's
-- finishRun() (outcome: 'completed') and confirmLeave() (outcome:
-- 'abandoned') -- the single choke point all three challenge types
-- (companion/scout/real) already funnel through.

create table if not exists public.play_challenge_activity (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  opponent_kind text not null check (opponent_kind in ('real', 'scout', 'companion')),
  curriculum_slug text not null,
  score int,
  total int not null,
  time_ms int,
  outcome text not null check (outcome in ('completed', 'abandoned')),
  stopped_at_question int,
  reward_keys int not null default 0,
  -- Only set when opponent_kind = 'real' -- links back to the DB-backed
  -- race in play_challenges for cross-referencing. No FK constraint:
  -- this log must never fail to write because of a challenge-table issue.
  real_challenge_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists play_challenge_activity_device_idx on public.play_challenge_activity (device_id);
create index if not exists play_challenge_activity_created_idx on public.play_challenge_activity (created_at);

alter table public.play_challenge_activity enable row level security;

-- Same anon-key access pattern as play_devices.sql / play_accounts.sql --
-- no per-user auth is enforced elsewhere in this app.
create policy "public select play_challenge_activity"
  on public.play_challenge_activity for select
  using (true);

create policy "public insert play_challenge_activity"
  on public.play_challenge_activity for insert
  with check (true);
