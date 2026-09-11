-- ── Expiry fix: a 'waiting' challenge past its deadline should stop being
-- treated as pending/open everywhere — for the creator's own state check,
-- for other people browsing, and for the join/start paths. Nothing was
-- flipping status to 'expired' automatically before this; deadline_at was
-- pure display data. This computes the expiry at read/write time instead
-- of relying on a cron/background job.

-- ── play_my_challenge_stories: status now reflects a passed deadline ────────
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
    case
      when c.status = 'waiting' and c.deadline_at is not null and c.deadline_at < now()
      then 'expired'
      else c.status
    end,
    m.status, m.is_creator, null::text,
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

-- ── play_open_global_challenges: exclude expired-but-uncancelled rows ───────
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
    and (c.deadline_at is null or c.deadline_at > now())
    and not exists (
      select 1 from public.play_challenge_members cm
      where cm.challenge_id = c.id and cm.device_id = p_device_id
    )
  order by c.created_at desc
  limit 20;
$$;

-- ── play_join_global_challenge: reject an expired-but-uncancelled row ───────
create or replace function public.play_join_global_challenge(
  p_device_id text,
  p_id uuid,
  p_display_name text default 'You'
) returns text
language plpgsql security definer
as $$
declare
  v_status text;
  v_deadline timestamptz;
begin
  select status, deadline_at into v_status, v_deadline from public.play_challenges where id = p_id;
  if v_status is null or v_status not in ('waiting', 'running') then
    return 'closed';
  end if;
  if v_status = 'waiting' and v_deadline is not null and v_deadline < now() then
    return 'closed';
  end if;

  insert into public.play_challenge_members (challenge_id, device_id, status, display_name, joined_at)
  values (p_id, p_device_id, 'joined', p_display_name, now())
  on conflict (challenge_id, device_id) do nothing;

  if v_status = 'running' then return 'started'; end if;
  return 'joined';
end;
$$;

-- ── play_start_challenge: an expired deadline blocks starting too ───────────
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
    and status = 'waiting'
    and (deadline_at is null or deadline_at > now());
end;
$$;
