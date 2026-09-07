-- Per-skill learner progress, keyed by (email, skill_id) so multiple
-- skills for the same learner don't collide (see docs/progress-restore-fix-plan.md
-- Bug B). Also carries completed_tracks so a single per-email fetch
-- restores both counters and track state in one round trip -- no separate
-- table/query needed for tracks.
create table if not exists play_progress (
  email text not null,
  skill_id text not null,
  completed_topics integer not null default 0,
  total_topics integer not null default 46,
  completed_tracks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (email, skill_id)
);

-- Batched restore reads all of a learner's skills in one query
-- (.eq('email', ...), no skill filter) -- this index makes that cheap.
create index if not exists idx_play_progress_email on play_progress(email);

alter table play_progress enable row level security;

-- Matches play_accounts.sql / play_purchases.sql -- no per-user auth
-- enforced elsewhere in this app.
create policy "public select play_progress"
  on play_progress for select
  using (true);

create policy "public insert play_progress"
  on play_progress for insert
  with check (true);

create policy "public update play_progress"
  on play_progress for update
  using (true)
  with check (true);
