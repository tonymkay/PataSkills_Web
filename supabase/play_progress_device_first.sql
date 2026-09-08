-- Gap 3 (docs/sync-gaps-fix-plan.md): play_progress was email-only keyed
-- (primary key (email, skill_id), email not null), so an anonymous device
-- -- the common case pre-signup -- could never get progress backed up at
-- all; lib/backup.ts had to skip pushAllProgressToCloud() entirely when no
-- email was linked. Confirmed 0 live rows in this table (PlayDashboard's
-- docs/plan.md §9), so this changes the primary key outright rather than
-- doing a data-preserving multi-step migration -- there is nothing to
-- preserve yet.

alter table play_progress drop constraint if exists play_progress_pkey;

alter table play_progress add column if not exists device_id text;

-- Backfill safety net only -- irrelevant today (0 rows) but keeps this
-- migration re-runnable/safe if it's ever applied against a non-empty
-- table later.
update play_progress set device_id = 'legacy-unknown' where device_id is null;

alter table play_progress alter column device_id set not null;
alter table play_progress alter column email drop not null;
alter table play_progress add primary key (device_id, skill_id);

create index if not exists idx_play_progress_email on play_progress(email);
create index if not exists idx_play_progress_device on play_progress(device_id);
