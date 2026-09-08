-- ============================================================
-- Adds 'purchase_interested' and 'purchase_success' to
-- play_device_events.event_type, plus a nullable product_id column.
--
-- purchase_interested fires the moment a learner has entered a valid
-- email and tapped "Pay with Paystack" (keys-confirm.tsx / 
-- subscription-confirm.tsx -- same screens on web and app) -- before
-- checkout even opens. This is the "interested" signal: it fires
-- whether or not they go on to complete or cancel the payment, and
-- fires again every time they re-attempt, since play_device_events is
-- append-only (no dedup needed to see "interested a 2nd/3rd time").
--
-- purchase_success fires right after Paystack's checkout callback
-- confirms payment (lib/billing.ts openCheckout() resolving with a
-- reference) -- same moment the app already grants keys/premium
-- client-side, before any webhook involvement.
--
-- product_id carries the exact package: a keys pack id (e.g. 'pack_20')
-- or a subscription plan's packageId (e.g. 'plan_monthly') -- both
-- already exist in billing.ts's openCheckout() call today, just not
-- persisted anywhere per-event until now.
-- ============================================================

alter table play_device_events drop constraint if exists play_device_events_event_type_check;

alter table play_device_events add constraint play_device_events_event_type_check
  check (event_type in ('landing_page_seen', 'topic_loading_started', 'session_started', 'topic_complete', 'paywall_seen', 'purchase_interested', 'purchase_success'));

alter table play_device_events add column if not exists product_id text;
