-- Fix: joining with an invite code always failed with "Something went wrong".
--
-- Root cause: both join RPCs declare OUT columns named challenge_id /
-- tournament_id via `returns table (...)`. Inside plpgsql those become
-- variables, so any unqualified reference to a column with the same name
-- (`where challenge_id = ...`, `on conflict (tournament_id, device_id)`)
-- raises `column reference "..." is ambiguous` the moment a code actually
-- matches a row. The client caught that throw and showed the generic error.
--
-- `#variable_conflict use_column` makes column names win over the OUT
-- variables. Safe to re-run. Apply in the Supabase SQL editor.

create or replace function public.play_join_challenge_by_code(
  p_device_id text,
  p_code text,
  p_display_name text default 'You'
) returns table (result text, challenge_id uuid)
language plpgsql security definer
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_status text;
  v_deadline timestamptz;
begin
  select c.id, c.status, c.deadline_at into v_id, v_status, v_deadline
  from public.play_challenges c
  where c.invite_code = upper(trim(p_code));

  if v_id is null then
    return query select 'not_found', null::uuid;
    return;
  end if;

  if v_status in ('ended', 'cancelled', 'expired')
     or (v_status = 'waiting' and v_deadline is not null and v_deadline < now()) then
    return query select 'ineligible', v_id;
    return;
  end if;

  if exists (
    select 1 from public.play_challenge_members m
    where m.challenge_id = v_id and m.device_id = p_device_id
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

create or replace function public.play_join_tournament_by_code(
  p_device_id text,
  p_code text,
  p_email text default null
) returns table (result text, tournament_id uuid)
language plpgsql security definer
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_status text;
  v_invite_email text;
  v_expires_at timestamptz;
  v_row_count int;
begin
  select t.id, t.status, t.invite_email, t.expires_at
  into v_id, v_status, v_invite_email, v_expires_at
  from public.play_tournaments t
  where t.invite_code = upper(trim(p_code));

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
    select t.current_stage from public.play_tournaments t where t.id = v_id
  )
  on conflict do nothing;

  return query select 'joined', v_id;
end;
$$;
