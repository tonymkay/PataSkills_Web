-- Admin delete: permanently removes an entire learner. A "learner" here
-- matches LearnerRow's grain (see PlayDashboard/src/lib/metrics.ts
-- buildLearnerRows()): either
--   (a) p_is_email = true  -- every device linked to that email, the
--       play_accounts row, and every play_purchases row for that email, or
--   (b) p_is_email = false -- a single anonymous device (no email), same
--       cleanup list as play_admin_delete_device.
-- Mirrors purge_due_play_accounts()'s per-device cleanup list
-- (play_account_deletion.sql) but runs immediately instead of after a
-- 90-day window, and additionally removes play_purchases for the email
-- case (financial records the account-deletion purge deliberately leaves
-- alone, but an admin-initiated full delete should not).

create or replace function play_admin_delete_learner(p_id text, p_is_email boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_is_email then
    delete from play_question_attempts
      where device_id in (select device_id from play_devices where email = p_id);
    delete from play_progress
      where device_id in (select device_id from play_devices where email = p_id)
         or email = p_id;
    delete from play_user_stats
      where device_id in (select device_id from play_devices where email = p_id)
         or email = p_id;
    delete from play_device_events
      where device_id in (select device_id from play_devices where email = p_id);
    delete from play_devices where email = p_id;
    delete from play_accounts where email = p_id;
    delete from play_purchases where email = p_id;
  else
    delete from play_question_attempts where device_id = p_id;
    delete from play_progress          where device_id = p_id;
    delete from play_user_stats        where device_id = p_id;
    delete from play_device_events     where device_id = p_id;
    delete from play_devices           where device_id = p_id;
  end if;
end;
$$;

grant execute on function play_admin_delete_learner(text, boolean) to service_role;
