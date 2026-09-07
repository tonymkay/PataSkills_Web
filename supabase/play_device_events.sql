-- Append-only checkpoint log backing play_devices -- one row per
-- landing_page_seen / session_started / topic_complete event. This is the
-- timeline: "was this today or yesterday," per-device activity feed, and
-- the source rows that questions_answered/questions_missed roll up from.
-- See docs/device-tracking-plan.md and userdata.md.

create table if not exists play_device_events (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references play_devices(device_id),
  event_type text not null check (
    event_type in ('landing_page_seen', 'session_started', 'topic_complete')
  ),
  skill_id text,
  track text,
  topic_index integer,
  questions_answered integer,
  questions_missed integer,
  key_balance integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_play_device_events_device on play_device_events(device_id, created_at);
create index if not exists idx_play_device_events_type on play_device_events(event_type, created_at);

alter table play_device_events enable row level security;

create policy "public select play_device_events"
  on play_device_events for select
  using (true);

create policy "public insert play_device_events"
  on play_device_events for insert
  with check (true);
