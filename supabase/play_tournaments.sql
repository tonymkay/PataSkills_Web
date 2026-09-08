-- Challenge Corner: play_tournaments
-- New table, own namespace (play_ prefix). Mirrors the old app's tournaments
-- schema. source_challenge_id references play_challenges (created earlier in
-- play_challenges.sql), and this file closes the loop by adding the
-- play_challenges.tournament_id -> play_tournaments(id) FK now that both
-- tables exist.
--
-- Apply play_challenges.sql BEFORE this file.

create table if not exists public.play_tournaments (
  id uuid primary key default gen_random_uuid(),
  curriculum_slug text not null,
  tier text not null check (tier in ('small','mid','large')),
  status text not null check (status in ('group_stage','knockout','final','ended','cancelled')),
  current_stage int not null default 1,
  stage_count int not null,
  source_challenge_id uuid null references public.play_challenges(id),
  topic_title text null,
  curriculum_title text null,
  created_by_device_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists play_tournaments_status_idx on public.play_tournaments (status);
create index if not exists play_tournaments_source_challenge_idx on public.play_tournaments (source_challenge_id);

alter table public.play_tournaments enable row level security;

-- Close the circular FK from play_challenges.tournament_id now that
-- play_tournaments exists. Safe to re-run: drops+recreates the constraint.
alter table public.play_challenges
  drop constraint if exists play_challenges_tournament_id_fkey;

alter table public.play_challenges
  add constraint play_challenges_tournament_id_fkey
  foreign key (tournament_id) references public.play_tournaments(id);
