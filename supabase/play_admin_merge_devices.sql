-- Admin merge: folds an old device's balances/xp/streak/progress onto a
-- new device, then retires the old device so it stops appearing as a
-- separate learner. GREATEST/OR everywhere a merge could otherwise move a
-- number backward; any play_progress row only the OLD device has is
-- copied onto the new device rather than dropped.

create or replace function play_merge_devices(p_old_device_id text, p_new_device_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_email text;
begin
  select email into v_new_email from play_devices where device_id = p_new_device_id;

  -- 1. Fold play_devices fields onto the new device row.
  update play_devices new_d
  set key_balance = greatest(coalesce(new_d.key_balance, 0), coalesce(old_d.key_balance, 0)),
      is_premium = new_d.is_premium or old_d.is_premium,
      landing_views_count = new_d.landing_views_count + old_d.landing_views_count,
      sessions_count = new_d.sessions_count + old_d.sessions_count,
      topics_completed_count = new_d.topics_completed_count + old_d.topics_completed_count,
      updated_at = now()
  from play_devices old_d
  where old_d.device_id = p_old_device_id
    and new_d.device_id = p_new_device_id;

  -- 2. Fold play_user_stats.
  update play_user_stats new_s
  set total_xp = greatest(new_s.total_xp, old_s.total_xp),
      active_days_count = greatest(new_s.active_days_count, old_s.active_days_count),
      updated_at = now()
  from play_user_stats old_s
  where old_s.device_id = p_old_device_id
    and new_s.device_id = p_new_device_id;

  -- 3. Fold play_accounts balance if this email already has an account.
  if v_new_email is not null then
    update play_accounts
    set balance = greatest(balance, (select coalesce(key_balance, 0) from play_devices where device_id = p_old_device_id)),
        updated_at = now()
    where email = v_new_email;
  end if;

  -- 4. Progress: copy any (old_device, skill) row the new device doesn't
  --    already have, taking the greater of completed_topics on conflict.
  insert into play_progress (device_id, email, skill_id, completed_topics, total_topics, completed_tracks, updated_at)
  select p_new_device_id, coalesce(v_new_email, op.email), op.skill_id, op.completed_topics, op.total_topics, op.completed_tracks, now()
  from play_progress op
  where op.device_id = p_old_device_id
  on conflict (device_id, skill_id) do update
    set completed_topics = greatest(play_progress.completed_topics, excluded.completed_topics),
        total_topics = greatest(play_progress.total_topics, excluded.total_topics),
        completed_tracks = (
          select jsonb_agg(distinct t) from jsonb_array_elements_text(play_progress.completed_tracks || excluded.completed_tracks) t
        ),
        updated_at = now();

  -- 5. Re-point device_events and question_attempts so the old device's
  --    history stays attached to a learner instead of being orphaned.
  update play_device_events set device_id = p_new_device_id where device_id = p_old_device_id;
  update play_question_attempts set device_id = p_new_device_id where device_id = p_old_device_id;

  -- 6. Retire the old device row so it stops appearing as a separate
  --    learner -- delete outright rather than null the email, since its
  --    events/progress have already been re-pointed above.
  delete from play_progress where device_id = p_old_device_id;
  delete from play_user_stats where device_id = p_old_device_id;
  delete from play_devices where device_id = p_old_device_id;
end;
$$;

grant execute on function play_merge_devices(text, text) to service_role;
