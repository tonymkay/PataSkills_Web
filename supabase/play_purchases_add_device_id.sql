-- Adds a permanent device link to purchases. This is separate from
-- play_devices.email, which can be overwritten by later checkpoints if the
-- locally stored email changes/clears -- device_id on the purchase row
-- itself never changes once set, so it's the durable "which device paid
-- for this" record.
alter table play_purchases
  add column if not exists device_id text;

create index if not exists idx_play_purchases_device_id
  on play_purchases(device_id);
