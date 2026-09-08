-- Challenge Corner: play_tournament_members
-- Membership/participation rows for play_tournaments. Mirrors the old app's
-- tournament_members schema, device-id-scoped.
--
-- Apply after play_tournaments.sql.

create table if not exists public.play_tournament_members (
  tournament_id uuid not null references public.play_tournaments(id) on delete cascade,
  device_id text not null,
  status text not null check (status in ('active','eliminated','placed')),
  placement int null,
  reward_keys int not null default 0,
  claimed boolean not null default false,
  primary key (tournament_id, device_id)
);

create index if not exists play_tournament_members_device_idx on public.play_tournament_members (device_id);
create index if not exists play_tournament_members_status_idx on public.play_tournament_members (status);

alter table public.play_tournament_members enable row level security;
