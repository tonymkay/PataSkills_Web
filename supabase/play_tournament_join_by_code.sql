-- Challenge Corner: join-by-code + code-generating create.
-- Apply AFTER play_tournament_invites.sql.

-- Return shape changed (uuid -> table), so the old function must be dropped
-- before recreating — CREATE OR REPLACE can't change a return type.
drop function if exists public.play_create_tournament(text, text, uuid, text[], text[], text, text);

create or replace function public.play_create_tournament(
  p_device_id text,
  p_curriculum_slug text,
  p_source_challenge_id uuid default null,
  p_scout_ids text[] default '{}',
  p_scout_names text[] default '{}',
  p_topic_title text default null,
  p_curriculum_title text default null,
  p_invite_email text default null,
  p_expires_at timestamptz default null
) returns table (tournament_id uuid, invite_code text)
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_field_size int;
  v_tier text;
  v_stage_count int;
  v_code text;
  i int;
begin
  if p_source_challenge_id is not null then
    if exists (
      select 1 from public.play_tournaments
      where source_challenge_id = p_source_challenge_id
    ) then
      raise exception 'tournament already exists for this challenge';
    end if;
  end if;

  v_field_size := 1 + coalesce(array_length(p_scout_ids, 1), 0);

  if v_field_size >= 30 then
    v_tier := 'large'; v_stage_count := 4;
  elsif v_field_size >= 15 then
    v_tier := 'mid'; v_stage_count := 3;
  else
    v_tier := 'small'; v_stage_count := 2;
  end if;

  v_code := public.generate_play_invite_code();

  insert into public.play_tournaments (
    curriculum_slug, tier, status, stage_count,
    source_challenge_id, topic_title, curriculum_title,
    created_by_device_id, invite_code, invite_email, expires_at
  ) values (
    p_curriculum_slug, v_tier, 'group_stage', v_stage_count,
    p_source_challenge_id, p_topic_title, p_curriculum_title,
    p_device_id, v_code, p_invite_email,
    coalesce(p_expires_at, now() + interval '7 days')
  ) returning id into v_id;

  insert into public.play_tournament_members (tournament_id, device_id, status)
  values (v_id, p_device_id, 'active');

  for i in 1..coalesce(array_length(p_scout_ids, 1), 0) loop
    insert into public.play_tournament_members (tournament_id, device_id, status)
    values (v_id, p_scout_ids[i], 'active')
    on conflict do nothing;
  end loop;

  insert into public.play_challenges (
    curriculum_slug, seed, question_count, is_global, tournament_id,
    tournament_stage, status, created_by_device_id
  ) values (
    p_curriculum_slug,
    (random() * 2147483647)::bigint,
    10, false, v_id, 1, 'waiting', p_device_id
  );

  return query select v_id, v_code;
end;
$$;

-- ── play_join_tournament_by_code ─────────────────────────────────────────────
create or replace function public.play_join_tournament_by_code(
  p_device_id text,
  p_code text,
  p_email text default null
) returns table (result text, tournament_id uuid)
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_status text;
  v_invite_email text;
  v_expires_at timestamptz;
  v_row_count int;
begin
  select id, status, invite_email, expires_at
  into v_id, v_status, v_invite_email, v_expires_at
  from public.play_tournaments
  where invite_code = upper(trim(p_code));

  if v_id is null then
    return query select 'not_found', null::uuid;
    return;
  end if;

  if v_status in ('ended', 'cancelled') then
    return query select 'ineligible', v_id;
    return;
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    return query select 'expired', v_id;
    return;
  end if;

  if v_invite_email is not null and (p_email is null or lower(trim(p_email)) <> lower(v_invite_email)) then
    return query select 'wrong_email', v_id;
    return;
  end if;

  insert into public.play_tournament_members (tournament_id, device_id, status)
  values (v_id, p_device_id, 'active')
  on conflict (tournament_id, device_id) do nothing;
  get diagnostics v_row_count = row_count;

  if v_row_count = 0 then
    return query select 'already', v_id;
    return;
  end if;

  insert into public.play_challenge_members (challenge_id, device_id, status, joined_at)
  select c.id, p_device_id, 'joined', now()
  from public.play_challenges c
  where c.tournament_id = v_id and c.tournament_stage = (
    select current_stage from public.play_tournaments where id = v_id
  )
  on conflict do nothing;

  return query select 'joined', v_id;
end;
$$;

-- ── play_tournament_state: add invite_code to the output row ────────────────
-- Return shape changed (new trailing column), so drop first.
drop function if exists public.play_tournament_state(text, uuid);

create or replace function public.play_tournament_state(
  p_device_id text,
  p_tournament_id uuid
) returns table (
  tournament_id uuid, status text, tier text,
  current_stage int, stage_count int, curriculum_slug text,
  my_status text, my_placement int, my_reward_keys int, my_claimed boolean,
  target_text text, promoted_count bigint, promoted_photos text[],
  field_size bigint, field_photos text[],
  topic_title text, curriculum_title text, invite_code text
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
  v_invite_code text;
begin
  select t.status, t.tier, t.current_stage, t.stage_count,
         t.curriculum_slug, t.topic_title, t.curriculum_title, t.invite_code
  into v_status, v_tier, v_current_stage, v_stage_count,
       v_slug, v_topic, v_curriculum, v_invite_code
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
    v_topic, v_curriculum, v_invite_code;
end;
$$;
