-- ============================================================
-- Adds 'paywall_seen' to play_device_events.event_type.
--
-- Fires the moment a learner is blocked by the keys/premium paywall --
-- either the first-look pack_20 upsell (KeysOfferScreen) or the full
-- "Other ways to Proceed" screen it falls back to (SessionStateScreen
-- kind="outOfKeys") -- whether that's because they ran out of keys or
-- because the free-trial timer hasn't reset yet. Before this, a session
-- that hit the paywall had zero trace of it: it looked identical to a
-- bounce, an aborted load, or an abandoned topic, when the real reason
-- they stopped was "blocked by the paywall", not "lost interest".
-- ============================================================

alter table play_device_events drop constraint if exists play_device_events_event_type_check;

alter table play_device_events add constraint play_device_events_event_type_check
  check (event_type in ('landing_page_seen', 'topic_loading_started', 'session_started', 'topic_complete', 'paywall_seen'));
