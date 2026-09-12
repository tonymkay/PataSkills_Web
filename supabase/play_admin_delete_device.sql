-- Admin delete: permanently removes a single device and everything tied
-- to it by device_id. Mirrors the cleanup list in play_account_deletion.sql's
-- purge_due_play_accounts() (question_attempts, progress, user_stats,
-- device_events, devices) but scoped to ONE device_id instead of a whole
-- account purge, and does NOT touch play_accounts or play_purchases —
-- those are account/email-level and financial records respectively, not
-- device-level, and this is a single-device delete, not an account delete.

create or replace function play_admin_delete_device(p_device_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from play_question_attempts where device_id = p_device_id;
  delete from play_progress          where device_id = p_device_id;
  delete from play_user_stats        where device_id = p_device_id;
  delete from play_device_events     where device_id = p_device_id;
  delete from play_devices           where device_id = p_device_id;
end;
$$;

grant execute on function play_admin_delete_device(text) to service_role;
