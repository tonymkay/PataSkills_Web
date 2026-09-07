-- One row per anonymous device (lib/deviceId.ts), upserted on every
-- checkpoint. This is the "current state" summary table for the device
-- tracking feature -- see docs/device-tracking-plan.md and userdata.md.
-- device_id is an app-generated random UUID stored in AsyncStorage; it is
-- NOT a hardware fingerprint, IDFA, or Android Advertising ID, so it
-- resets on reinstall / cleared app storage. `email` is filled in once
-- this device links an account (checkout / Google sign-in / restore) --
-- use it to roll multiple device_ids up to one learner in reporting.

create table if not exists play_devices (
  device_id text primary key,
  platform text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_views_count integer not null default 0,
  sessions_count integer not null default 0,
  topics_completed_count integer not null default 0,
  key_balance integer,
  is_premium boolean not null default false,
  last_skill_id text,
  last_track text,
  email text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_play_devices_email on play_devices(email);
create index if not exists idx_play_devices_last_seen on play_devices(last_seen_at);

alter table play_devices enable row level security;

-- Same anon-key access pattern as play_accounts.sql / play_purchases.sql --
-- no per-user auth is enforced elsewhere in this app.
create policy "public select play_devices"
  on play_devices for select
  using (true);

create policy "public insert play_devices"
  on play_devices for insert
  with check (true);

create policy "public update play_devices"
  on play_devices for update
  using (true)
  with check (true);
