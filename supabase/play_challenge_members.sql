-- Challenge Corner: play_challenge_members
-- Membership/participation rows for play_challenges. Mirrors the old app's
-- challenge_members schema, device-id-scoped (Play has no user accounts).

create table if not exists public.play_challenge_members (
  challenge_id uuid not null references public.play_challenges(id) on delete cascade,
  device_id text not null,
  status text not null check (status in ('invited','joined','declined','removed')),
  is_creator boolean not null default false,
  display_name text null,
  photo_url text null,
  joined_at timestamptz null,
  finished_at timestamptz null,
  time_ms int null,
  score int null,
  total int null,
  current_question_index int not null default 0,
  reward_keys int not null default 0,
  claimed boolean not null default false,
  primary key (challenge_id, device_id)
);

create index if not exists play_challenge_members_device_idx on public.play_challenge_members (device_id);
create index if not exists play_challenge_members_status_idx on public.play_challenge_members (status);

alter table public.play_challenge_members enable row level security;
