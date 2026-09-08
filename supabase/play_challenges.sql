-- Challenge Corner: play_challenges
-- New table, own namespace (play_ prefix), same DB as pataskillsv2's `challenges`
-- table but not shared with it. Columns mirror the old app's challenges schema
-- with skill_id renamed to curriculum_slug.
--
-- NOTE: tournament_id has no inline FK because play_tournaments references
-- this table too (source_challenge_id). The FK constraint is added at the end
-- of play_tournaments.sql, which must be applied after this file.

create table if not exists public.play_challenges (
  id uuid primary key default gen_random_uuid(),
  curriculum_slug text not null,
  target_topic_count int null,
  seed bigint not null,
  question_count int not null default 10,
  is_global boolean not null default false,
  tournament_id uuid null,
  tournament_stage int null,
  status text not null check (status in ('waiting','running','ended','expired','cancelled')),
  created_by_device_id text not null,
  started_at timestamptz null,
  first_finished_at timestamptz null,
  first_results_at timestamptz null,
  ended_at timestamptz null,
  deadline_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists play_challenges_status_idx on public.play_challenges (status);
create index if not exists play_challenges_created_by_idx on public.play_challenges (created_by_device_id);
create index if not exists play_challenges_tournament_idx on public.play_challenges (tournament_id);
create index if not exists play_challenges_global_waiting_idx on public.play_challenges (is_global, status);

-- RLS: mirror the old `challenges` table's policy shape once confirmed in the
-- Supabase dashboard (device-id-scoped access via SECURITY DEFINER RPCs, no
-- direct table grants to anon). Enable RLS and deny direct table access here;
-- all reads/writes go through the play_* RPC functions.
alter table public.play_challenges enable row level security;
