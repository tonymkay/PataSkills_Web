-- Challenge Corner: RPC functions for play_tournaments + play_tournament_members.
-- All functions are SECURITY DEFINER — same pattern as play_challenge_rpcs.sql.
-- Apply AFTER play_tournaments.sql + play_tournament_members.sql + play_challenge_rpcs.sql.

-- ── play_create_tournament ───────────────────────────────────────────────────
create or replace function public.play_create_tournament(
  p_device_id text,
  p_curriculum_slug text,
  p_source_challenge_id uuid default null,
  p_scout_ids text[] default '{}',
  p_scout_names text[] default '{}',
  p_topic_title text default null,
  p_curriculum_title text default null
) returns uuid
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_field_size int;
  v_tier text;
  v_stage_count int;
  i int;
begin
  -- Prevent duplicate tournament for the same source challenge
  if p_source_challenge_id is not null then
    if exists (
      select 1 from public.play_tournaments
      where source_challenge_id = p_source_challenge_id
    ) then
      raise exception 'tournament already exists for this challenge';
    end if;
  end if;

  -- Count the field: creator + any scouts
  v_field_size := 1 + coalesce(array_length(p_scout_ids, 1), 0);

  -- Determine tier + stage count based on field size
  if v_field_size >= 30 then
    v_tier := 'large'; v_stage_count := 4;
  elsif v_field_size >= 15 then
    v_tier := 'mid'; v_stage_count := 3;
  else
    v_tier := 'small'; v_stage_count := 2;
  end if;

  insert into public.play_tournaments (
    curriculum_slug, tier, status, stage_count,
    source_challenge_id, topic_title, curriculum_title,
    created_by_device_id
  ) values (
    p_curriculum_slug, v_tier, 'group_stage', v_stage_count,
    p_source_challenge_id, p_topic_title, p_curriculum_title,
    p_device_id
  ) returning id into v_id;

  -- Add creator as first member
  insert into public.play_tournament_members (tournament_id, device_id, status)
  values (v_id, p_device_id, 'active');

  -- Add scouts as members
  for i in 1..coalesce(array_length(p_scout_ids, 1), 0) loop
    insert into public.play_tournament_members (tournament_id, device_id, status)
    values (v_id, p_scout_ids[i], 'active')
    on conflict do nothing;
  end loop;

  -- Create stage-1 challenge
  insert into public.play_challenges (
    curriculum_slug, seed, question_count, is_global, tournament_id,
    tournament_stage, status, created_by_device_id
  ) values (
    p_curriculum_slug,
    (random() * 2147483647)::bigint,
    10, false, v_id, 1, 'waiting', p_device_id
  );

  return v_id;
end;
$$;

-- ── play_find_tournament_by_challenge ─────────────────────────────────────────
create or replace function public.play_find_tournament_by_challenge(
  p_source_challenge_id uuid
) returns uuid
language sql security definer stable
as $$
  select id from public.play_tournaments
  where source_challenge_id = p_source_challenge_id
  limit 1;
$$;

-- ── play_join_tournament ─────────────────────────────────────────────────────
create or replace function public.play_join_tournament(
  p_device_id text,
  p_tournament_id uuid
) returns text
language plpgsql security definer
as $$
declare
  v_status text;
begin
  select status into v_status from public.play_tournaments where id = p_tournament_id;
  if v_status is null or v_status in ('ended', 'cancelled') then
    return 'ineligible';
  end if;

  insert into public.play_tournament_members (tournament_id, device_id, status)
  values (p_tournament_id, p_device_id, 'active')
  on conflict (tournament_id, device_id) do nothing;

  if not found then return 'already'; end if;

  -- Also join the current stage's challenge
  insert into public.play_challenge_members (challenge_id, device_id, status, joined_at)
  select c.id, p_device_id, 'joined', now()
  from public.play_challenges c
  where c.tournament_id = p_tournament_id and c.tournament_stage = (
    select current_stage from public.play_tournaments where id = p_tournament_id
  )
  on conflict do nothing;

  return 'joined';
end;
$$;

-- ── play_tournament_state ────────────────────────────────────────────────────
create or replace function public.play_tournament_state(
  p_device_id text,
  p_tournament_id uuid
) returns table (
  tournament_id uuid, status text, tier text,
  current_stage int, stage_count int, curriculum_slug text,
  my_status text, my_placement int, my_reward_keys int, my_claimed boolean,
  target_text text, promoted_count bigint, promoted_photos text[],
  field_size bigint, field_photos text[],
  topic_title text, curriculum_title text
)
language plpgsql security definer stable
as $$
declare
  v_status text;
  v_tier text;
  v_current_stage int;
  v_stage_count int;
  v_slug text;
  v_my_status text;
  v_my_placement int;
  v_my_reward_keys int;
  v_my_claimed boolean;
  v_topic text;
  v_curriculum text;
  v_field_size bigint;
begin
  select t.status, t.tier, t.current_stage, t.stage_count,
         t.curriculum_slug, t.topic_title, t.curriculum_title
  into v_status, v_tier, v_current_stage, v_stage_count,
       v_slug, v_topic, v_curriculum
  from public.play_tournaments t where t.id = p_tournament_id;

  if v_status is null then return; end if;

  select m.status, m.placement, m.reward_keys, m.claimed
  into v_my_status, v_my_placement, v_my_reward_keys, v_my_claimed
  from public.play_tournament_members m
  where m.tournament_id = p_tournament_id and m.device_id = p_device_id;

  v_my_status := coalesce(v_my_status, 'active');
  v_my_reward_keys := coalesce(v_my_reward_keys, 0);
  v_my_claimed := coalesce(v_my_claimed, false);

  select count(*) into v_field_size
  from public.play_tournament_members
  where play_tournament_members.tournament_id = p_tournament_id;

  return query select
    p_tournament_id, v_status, v_tier,
    v_current_stage, v_stage_count, v_slug,
    v_my_status, v_my_placement, v_my_reward_keys, v_my_claimed,
    case
      when v_current_stage = v_stage_count then 'Finish in the top 3 to win'
      else 'Finish in the top ' || greatest(2, v_field_size / 2)::text || ' to proceed'
    end,
    (select count(*) from public.play_tournament_members tm
     where tm.tournament_id = p_tournament_id and tm.status = 'active'),
    (select array_agg(cm.photo_url) from (
      select cm.photo_url from public.play_challenge_members cm
      join public.play_challenges c on c.id = cm.challenge_id
      where c.tournament_id = p_tournament_id
        and c.tournament_stage = v_current_stage
        and cm.photo_url is not null
      limit 6
    ) cm),
    v_field_size,
    (select array_agg(cm2.photo_url) from (
      select cm2.photo_url from public.play_challenge_members cm2
      join public.play_challenges c2 on c2.id = cm2.challenge_id
      where c2.tournament_id = p_tournament_id and c2.tournament_stage = 1
        and cm2.photo_url is not null
      limit 6
    ) cm2),
    v_topic, v_curriculum;
end;
$$;

-- ── play_tournament_stage_state ──────────────────────────────────────────────
create or replace function public.play_tournament_stage_state(
  p_tournament_id uuid
) returns table (
  challenge_id uuid, target_size bigint, joined_count bigint,
  status text, host_device_id text,
  member_photos text[], member_device_ids text[], member_names text[]
)
language sql security definer stable
as $$
  select
    c.id,
    (select count(*) from public.play_tournament_members tm
     where tm.tournament_id = p_tournament_id and tm.status = 'active'),
    (select count(*) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined'),
    c.status,
    c.created_by_device_id,
    (select array_agg(cm.photo_url) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined'),
    (select array_agg(cm.device_id) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined'),
    (select array_agg(cm.display_name) from public.play_challenge_members cm
     where cm.challenge_id = c.id and cm.status = 'joined')
  from public.play_challenges c
  where c.tournament_id = p_tournament_id
    and c.tournament_stage = (
      select current_stage from public.play_tournaments where id = p_tournament_id
    )
  limit 1;
$$;

-- ── play_advance_tournament_stage ────────────────────────────────────────────
create or replace function public.play_advance_tournament_stage(
  p_tournament_id uuid
) returns void
language plpgsql security definer
as $$
declare
  v_current int;
  v_total int;
  v_slug text;
  v_device text;
begin
  select current_stage, stage_count, curriculum_slug, created_by_device_id
  into v_current, v_total, v_slug, v_device
  from public.play_tournaments where id = p_tournament_id and status != 'ended';

  if not found then return; end if;

  -- Eliminate bottom half of current stage
  with ranked as (
    select cm.device_id,
           row_number() over (order by cm.score desc, cm.time_ms asc) as rk,
           count(*) over () as total_finished
    from public.play_challenge_members cm
    join public.play_challenges c on c.id = cm.challenge_id
    where c.tournament_id = p_tournament_id
      and c.tournament_stage = v_current
      and cm.finished_at is not null
  )
  update public.play_tournament_members tm
  set status = 'eliminated'
  from ranked r
  where tm.tournament_id = p_tournament_id
    and tm.device_id = r.device_id
    and r.rk > greatest(2, r.total_finished / 2);

  if v_current >= v_total then
    -- Final stage done — end tournament, assign placements
    update public.play_tournaments set status = 'ended' where id = p_tournament_id;

    with final_ranked as (
      select cm.device_id,
             row_number() over (order by cm.score desc, cm.time_ms asc) as rk
      from public.play_challenge_members cm
      join public.play_challenges c on c.id = cm.challenge_id
      where c.tournament_id = p_tournament_id and c.tournament_stage = v_current
        and cm.finished_at is not null
    )
    update public.play_tournament_members tm
    set status = 'placed',
        placement = fr.rk,
        reward_keys = case when fr.rk = 1 then 5 when fr.rk = 2 then 3 when fr.rk = 3 then 1 else 0 end
    from final_ranked fr
    where tm.tournament_id = p_tournament_id and tm.device_id = fr.device_id;

    return;
  end if;

  -- Advance to next stage
  update public.play_tournaments
  set current_stage = v_current + 1,
      status = case when v_current + 1 = v_total then 'final' else 'knockout' end
  where id = p_tournament_id;

  -- Create next stage challenge
  insert into public.play_challenges (
    curriculum_slug, seed, question_count, is_global, tournament_id,
    tournament_stage, status, created_by_device_id
  ) values (
    v_slug, (random() * 2147483647)::bigint, 10, false,
    p_tournament_id, v_current + 1, 'waiting', v_device
  );
end;
$$;

-- ── play_claim_tournament_reward ─────────────────────────────────────────────
create or replace function public.play_claim_tournament_reward(
  p_device_id text,
  p_tournament_id uuid
) returns int
language plpgsql security definer
as $$
declare
  v_keys int;
begin
  select reward_keys into v_keys
  from public.play_tournament_members
  where tournament_id = p_tournament_id and device_id = p_device_id and not claimed;

  if v_keys is null or v_keys <= 0 then return 0; end if;

  update public.play_tournament_members
  set claimed = true
  where tournament_id = p_tournament_id and device_id = p_device_id;

  return v_keys;
end;
$$;
