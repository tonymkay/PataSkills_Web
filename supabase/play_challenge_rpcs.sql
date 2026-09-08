-- Challenge Corner: RPC functions for play_challenges + play_challenge_members.
-- All functions are SECURITY DEFINER so the client (anon role) never touches the
-- tables directly — RLS stays deny-all, same pattern as the old app.
-- Apply AFTER play_challenges.sql + play_challenge_members.sql.

-- ── play_create_challenge ────────────────────────────────────────────────────
create or replace function public.play_create_challenge(
  p_device_id text,
  p_curriculum_slug text,
  p_target int default null,
  p_is_global boolean default false,
  p_deadline timestamptz default null,
  p_display_name text default 'You'
) returns uuid
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_seed bigint := (random() * 2147483647)::bigint;
begin
  insert into public.play_challenges (
    curriculum_slug, target_topic_count, seed, is_global, status,
    created_by_device_id, deadline_at
  ) values (
    p_curriculum_slug, p_target, v_seed, p_is_global, 'waiting',
    p_device_id, p_deadline
  ) returning id into v_id;

  insert into public.play_challenge_members (
    challenge_id, device_id, status, is_creator, display_name, joined_at
  ) values (
    v_id, p_device_id, 'joined', true, p_display_name, now()
  );

  return v_id;
end;
$$;

-- ── play_my_challenge_stories ────────────────────────────────────────────────
create or replace function public.play_my_challenge_stories(p_device_id text)
returns table (
  challenge_id uuid, curriculum_slug text, target_topic_count int,
  seed bigint, question_count int, is_global boolean, is_tournament boolean,
  status text, my_status text, is_creator boolean, invited_by_name text,
  joined_count bigint, member_count bigint, deadline_at timestamptz,
  started_at timestamptz, invited_at timestamptz, ended_at timestamptz,
  my_finished boolean, my_reward_keys int, my_claimed boolean
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
    (m.finished_at is not null), m.reward_keys, m.claimed
  from public.play_challenges c
  join public.play_challenge_members m
    on m.challenge_id = c.id and m.device_id = p_device_id
  order by c.created_at desc
  limit 50;
$$;

-- ── play_join_global_challenge ───────────────────────────────────────────────
create or replace function public.play_join_global_challenge(
  p_device_id text,
  p_id uuid,
  p_display_name text default 'You'
) returns text
language plpgsql security definer
as $$
declare
  v_status text;
begin
  select status into v_status from public.play_challenges where id = p_id;
  if v_status is null or v_status not in ('waiting', 'running') then
    return 'closed';
  end if;

  insert into public.play_challenge_members (challenge_id, device_id, status, display_name, joined_at)
  values (p_id, p_device_id, 'joined', p_display_name, now())
  on conflict (challenge_id, device_id) do nothing;

  if v_status = 'running' then return 'started'; end if;
  return 'joined';
end;
$$;

-- ── play_start_challenge ─────────────────────────────────────────────────────
create or replace function public.play_start_challenge(
  p_device_id text,
  p_id uuid
) returns void
language plpgsql security definer
as $$
begin
  update public.play_challenges
  set status = 'running', started_at = now()
  where id = p_id
    and created_by_device_id = p_device_id
    and status = 'waiting';
end;
$$;

-- ── play_leave_challenge ─────────────────────────────────────────────────────
create or replace function public.play_leave_challenge(
  p_device_id text,
  p_id uuid
) returns text
language plpgsql security definer
as $$
declare
  v_is_creator boolean;
begin
  select is_creator into v_is_creator
  from public.play_challenge_members
  where challenge_id = p_id and device_id = p_device_id;

  if v_is_creator then
    update public.play_challenges set status = 'cancelled' where id = p_id;
    return 'cancelled';
  else
    update public.play_challenge_members
    set status = 'removed'
    where challenge_id = p_id and device_id = p_device_id;
    return 'left';
  end if;
end;
$$;

-- ── play_mark_challenge_absent ───────────────────────────────────────────────
create or replace function public.play_mark_challenge_absent(
  p_device_id text,
  p_id uuid
) returns boolean
language plpgsql security definer
as $$
begin
  update public.play_challenge_members
  set status = 'removed'
  where challenge_id = p_id and device_id = p_device_id and status = 'joined' and finished_at is null;
  return found;
end;
$$;

-- ── play_submit_challenge_result ─────────────────────────────────────────────
create or replace function public.play_submit_challenge_result(
  p_device_id text,
  p_id uuid,
  p_time_ms int,
  p_score int,
  p_total int
) returns void
language plpgsql security definer
as $$
begin
  update public.play_challenge_members
  set finished_at = now(), time_ms = p_time_ms, score = p_score, total = p_total
  where challenge_id = p_id and device_id = p_device_id;

  -- Mark first_finished / first_results if this is the first finisher
  update public.play_challenges
  set first_finished_at = coalesce(first_finished_at, now()),
      first_results_at = coalesce(first_results_at, now())
  where id = p_id;
end;
$$;

-- ── play_update_challenge_progress ───────────────────────────────────────────
create or replace function public.play_update_challenge_progress(
  p_device_id text,
  p_id uuid,
  p_index int
) returns void
language plpgsql security definer
as $$
begin
  update public.play_challenge_members
  set current_question_index = p_index
  where challenge_id = p_id and device_id = p_device_id;
end;
$$;

-- ── play_mark_challenge_results_viewed ───────────────────────────────────────
create or replace function public.play_mark_challenge_results_viewed(
  p_device_id text,
  p_id uuid
) returns timestamptz
language plpgsql security definer
as $$
begin
  update public.play_challenges
  set first_results_at = coalesce(first_results_at, now())
  where id = p_id;
  return now();
end;
$$;

-- ── play_end_challenge ───────────────────────────────────────────────────────
create or replace function public.play_end_challenge(
  p_device_id text,
  p_id uuid
) returns void
language plpgsql security definer
as $$
begin
  update public.play_challenges
  set status = 'ended', ended_at = now()
  where id = p_id and created_by_device_id = p_device_id;
end;
$$;

-- ── play_claim_challenge_reward ──────────────────────────────────────────────
create or replace function public.play_claim_challenge_reward(
  p_device_id text,
  p_id uuid
) returns int
language plpgsql security definer
as $$
declare
  v_keys int := 0;
  v_rank int;
begin
  -- Already claimed?
  if exists (
    select 1 from public.play_challenge_members
    where challenge_id = p_id and device_id = p_device_id and claimed
  ) then return 0; end if;

  -- Rank by score desc, time asc among finished members
  select rk into v_rank from (
    select device_id,
           row_number() over (order by score desc, time_ms asc) as rk
    from public.play_challenge_members
    where challenge_id = p_id and finished_at is not null
  ) ranked where device_id = p_device_id;

  if v_rank is null then return 0; end if;
  v_keys := case when v_rank = 1 then 5 when v_rank = 2 then 3 when v_rank = 3 then 1 else 0 end;

  update public.play_challenge_members
  set reward_keys = v_keys, claimed = true
  where challenge_id = p_id and device_id = p_device_id;

  return v_keys;
end;
$$;

-- ── play_challenge_members_list ──────────────────────────────────────────────
create or replace function public.play_challenge_members_list(
  p_device_id text,
  p_id uuid
) returns table (device_id text, display_name text, photo_url text, status text)
language sql security definer stable
as $$
  select m.device_id, m.display_name, m.photo_url, m.status
  from public.play_challenge_members m
  where m.challenge_id = p_id
  order by m.is_creator desc, m.joined_at asc;
$$;

-- ── play_challenge_state ─────────────────────────────────────────────────────
create or replace function public.play_challenge_state(p_id uuid)
returns table (
  status text, started_at timestamptz, first_finished_at timestamptz,
  first_results_at timestamptz, ended_at timestamptz,
  joined_count bigint, finished_count bigint,
  device_id text, display_name text, photo_url text,
  finished_at timestamptz, time_ms int, score int, total int,
  reward_keys int, current_question_index int
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
    m.reward_keys, m.current_question_index
  from public.play_challenges c
  left join public.play_challenge_members m
    on m.challenge_id = c.id and m.status = 'joined'
  where c.id = p_id
  order by m.finished_at asc nulls last;
$$;

-- ── play_open_global_challenges ──────────────────────────────────────────────
create or replace function public.play_open_global_challenges(p_device_id text)
returns table (
  challenge_id uuid, curriculum_slug text, creator_name text,
  joined_count bigint, deadline_at timestamptz
)
language sql security definer stable
as $$
  select
    c.id, c.curriculum_slug,
    (select cm.display_name from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.is_creator limit 1),
    (select count(*) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined'),
    c.deadline_at
  from public.play_challenges c
  where c.is_global
    and c.status in ('waiting', 'running')
    and c.tournament_id is null
    and not exists (
      select 1 from public.play_challenge_members cm
      where cm.challenge_id = c.id and cm.device_id = p_device_id
    )
  order by c.created_at desc
  limit 20;
$$;
