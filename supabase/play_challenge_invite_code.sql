-- Challenge Corner: invite codes for play_challenges (manual/friend challenges).
-- Mirrors play_tournament_invites.sql + play_tournament_join_by_code.sql's
-- pattern exactly, but scoped to play_challenges instead of play_tournaments.
-- Apply AFTER play_challenge_rpcs.sql.

alter table public.play_challenges
  add column if not exists invite_code text;

create unique index if not exists play_challenges_invite_code_idx
  on public.play_challenges (invite_code)
  where invite_code is not null;

-- Same alphabet/shape as generate_play_invite_code() (6-char, uppercase, no
-- ambiguous chars) but checked against play_challenges so a collision there
-- can't block a challenge from getting a code. Left as a separate function
-- (rather than reusing generate_play_invite_code()) so neither table's
-- uniqueness check depends on the other.
create or replace function public.generate_play_challenge_invite_code()
returns text
language plpgsql
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, (floor(random() * length(v_chars)) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.play_challenges where invite_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- ── play_create_challenge: now returns the invite code too ──────────────────
-- Return shape changed (uuid -> table), so drop first.
drop function if exists public.play_create_challenge(text, text, int, boolean, timestamptz, text);

create or replace function public.play_create_challenge(
  p_device_id text,
  p_curriculum_slug text,
  p_target int default null,
  p_is_global boolean default false,
  p_deadline timestamptz default null,
  p_display_name text default 'You'
) returns table (challenge_id uuid, invite_code text)
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_seed bigint := (random() * 2147483647)::bigint;
  v_code text := public.generate_play_challenge_invite_code();
begin
  insert into public.play_challenges (
    curriculum_slug, target_topic_count, seed, is_global, status,
    created_by_device_id, deadline_at, invite_code
  ) values (
    p_curriculum_slug, p_target, v_seed, p_is_global, 'waiting',
    p_device_id, p_deadline, v_code
  ) returning id into v_id;

  insert into public.play_challenge_members (
    challenge_id, device_id, status, is_creator, display_name, joined_at
  ) values (
    v_id, p_device_id, 'joined', true, p_display_name, now()
  );

  return query select v_id, v_code;
end;
$$;

-- ── play_join_challenge_by_code ──────────────────────────────────────────────
-- Mirrors play_join_tournament_by_code's shape/results so the join screen can
-- try both lookups with the same handling logic.
create or replace function public.play_join_challenge_by_code(
  p_device_id text,
  p_code text,
  p_display_name text default 'You'
) returns table (result text, challenge_id uuid)
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_status text;
begin
  select id, status into v_id, v_status
  from public.play_challenges
  where invite_code = upper(trim(p_code));

  if v_id is null then
    return query select 'not_found', null::uuid;
    return;
  end if;

  if v_status in ('ended', 'cancelled', 'expired') then
    return query select 'ineligible', v_id;
    return;
  end if;

  if exists (
    select 1 from public.play_challenge_members
    where challenge_id = v_id and device_id = p_device_id
  ) then
    return query select 'already', v_id;
    return;
  end if;

  insert into public.play_challenge_members (challenge_id, device_id, status, display_name, joined_at)
  values (v_id, p_device_id, 'joined', p_display_name, now())
  on conflict (challenge_id, device_id) do nothing;

  if v_status = 'running' then
    return query select 'started', v_id;
    return;
  end if;

  return query select 'joined', v_id;
end;
$$;

-- ── play_cancel_challenge ────────────────────────────────────────────────────
-- Explicit "cancel for everyone" action for the creator, distinct from
-- play_leave_challenge (which only cancels as a side-effect of the creator
-- leaving). Only cancels while still 'waiting' — once running, the race is
-- already underway for other members and shouldn't be yanked away.
create or replace function public.play_cancel_challenge(
  p_device_id text,
  p_id uuid
) returns boolean
language plpgsql security definer
as $$
begin
  update public.play_challenges
  set status = 'cancelled'
  where id = p_id
    and created_by_device_id = p_device_id
    and status = 'waiting';
  return found;
end;
$$;

-- ── play_my_challenge_stories: add invite_code to the output row ────────────
drop function if exists public.play_my_challenge_stories(text);

create or replace function public.play_my_challenge_stories(p_device_id text)
returns table (
  challenge_id uuid, curriculum_slug text, target_topic_count int,
  seed bigint, question_count int, is_global boolean, is_tournament boolean,
  status text, my_status text, is_creator boolean, invited_by_name text,
  joined_count bigint, member_count bigint, deadline_at timestamptz,
  started_at timestamptz, invited_at timestamptz, ended_at timestamptz,
  my_finished boolean, my_reward_keys int, my_claimed boolean, invite_code text
)
language sql security definer stable
as $$
  select
    c.id, c.curriculum_slug, c.target_topic_count,
    c.seed, c.question_count, c.is_global, (c.tournament_id is not null),
    c.status, m.status, m.is_creator, null::text,
    (select count(*) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined'),
    (select count(*) from public.play_challenge_members cm
     where cm.challenge_id = c.id),
    c.deadline_at, c.started_at, m.joined_at, c.ended_at,
    (m.finished_at is not null), m.reward_keys, m.claimed,
    case when m.is_creator then c.invite_code else null end
  from public.play_challenges c
  join public.play_challenge_members m
    on m.challenge_id = c.id and m.device_id = p_device_id
  order by c.created_at desc
  limit 50;
$$;

-- ── play_challenge_state: add invite_code to the output row (creator-only) ──
drop function if exists public.play_challenge_state(uuid);

create or replace function public.play_challenge_state(p_id uuid, p_device_id text default null)
returns table (
  status text, started_at timestamptz, first_finished_at timestamptz,
  first_results_at timestamptz, ended_at timestamptz,
  joined_count bigint, finished_count bigint,
  device_id text, display_name text, photo_url text,
  finished_at timestamptz, time_ms int, score int, total int,
  reward_keys int, current_question_index int, invite_code text
)
language sql security definer stable
as $$
  select
    c.status, c.started_at, c.first_finished_at, c.first_results_at, c.ended_at,
    (select count(*) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined'),
    (select count(*) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.finished_at is not null),
    m.device_id, m.display_name, m.photo_url,
    m.finished_at, m.time_ms, m.score, m.total,
    m.reward_keys, m.current_question_index,
    case when p_device_id is not null and c.created_by_device_id = p_device_id
         then c.invite_code else null end
  from public.play_challenges c
  left join public.play_challenge_members m
    on m.challenge_id = c.id and m.status = 'joined'
  where c.id = p_id
  order by m.finished_at asc nulls last;
$$;
