-- ============================================================
-- Adds 'topic_loading_started' to play_device_events.event_type.
--
-- Fires the moment a topic's loading/download screen appears (the
-- bouncing-dots moment) -- before this, the only signal between
-- landing_page_seen and topic_complete was session_started, which
-- doesn't fire until the download finishes and play actually begins.
-- Anyone who bounced during loading was indistinguishable from someone
-- who never touched anything. This event closes that gap: comparing
-- which of the four checkpoints exist in a session window now tells you
-- bounce vs aborted-load vs abandoned-topic vs completed.
-- ============================================================

alter table play_device_events drop constraint if exists play_device_events_event_type_check;

alter table play_device_events add constraint play_device_events_event_type_check
  check (event_type in ('landing_page_seen', 'topic_loading_started', 'session_started', 'topic_complete'));
