-- Allows play_device_events to log admin-initiated switch/merge actions
-- from the dashboard, alongside the existing app-generated event types.
alter table play_device_events drop constraint if exists play_device_events_event_type_check;
alter table play_device_events add constraint play_device_events_event_type_check
  check (event_type in (
    'landing_page_seen','topic_loading_started','session_started','topic_complete',
    'paywall_seen','purchase_interested','purchase_success','admin_switch_device','admin_merge_devices'
  ));
