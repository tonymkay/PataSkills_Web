-- Universal per-track fallback illustrations AND labels, for any skill's
-- track that has no per-curriculum override of its own (curriculum
-- JSON's tracks[].image/title, or code-level LandingSkill.trackImages/
-- trackLabels — see constants/trackOptions.ts's trackImage()/trackLabel()).
-- image_path stays EMPTY for most rows on purpose: the only track art
-- that exists (assets/driving/*.webp, uploaded to track-icons/) belongs
-- to driving-theory specifically and lives on its own curriculum JSON
-- instead, not here — seeding it here would leak driving's art onto
-- every other skill's matching track id (e.g. true-false's 'reading'
-- track). Add an image_path only once you have art that's genuinely
-- meant to be shared across skills; until then a skill with no dedicated
-- art for a track falls through to that skill's own cover image
-- (play_curricula.cover_image_path), which is correct.
-- label has no such restriction — 'full'/'reading' are universal track
-- ids meaning the same thing for every skill, so one shared label per
-- id is exactly right (see the seed insert below).
-- Read-only for anon, same shape as play_curricula — writes go through
-- the SQL editor or a service-role script, never the app.
-- image_path is nullable: a row can carry a label-only default (e.g.
-- 'full') with no image override, so image resolution still falls
-- through to the skill's own cover image as before.
create table if not exists play_track_defaults (
  track_id text primary key,
  image_path text,
  label text,
  updated_at timestamptz not null default now()
);

-- If the table already exists from before these columns were added:
alter table play_track_defaults add column if not exists label text;
alter table play_track_defaults alter column image_path drop not null;

alter table play_track_defaults enable row level security;

drop policy if exists "anon can read track defaults" on play_track_defaults;
create policy "anon can read track defaults"
  on play_track_defaults for select
  to anon
  using (true);

-- No image-only seed rows — see comment above. If you ever add genuine
-- universal art, insert it here with:
--   insert into play_track_defaults (track_id, image_path) values
--     ('<track_id>', 'track-icons/<file>.webp')
--   on conflict (track_id) do update set image_path = excluded.image_path, updated_at = now();
--
-- Clears out the old, wrong seed rows if this file was run before today:
delete from play_track_defaults where track_id in
  ('differentiation', 'identification', 'pairs', 'names', 'meanings', 'whereUsed', 'reading');

-- Universal label for the 'full' track, shared by every skill that
-- doesn't declare its own tracks[].title override in its curriculum
-- JSON (currently: all three skills). This replaces the old hardcoded
-- DEFAULT_TRACK_LABELS.full string in constants/trackOptions.ts — that
-- constant still exists as a last-resort fallback for the instant before
-- this row's fetch resolves, but this row is the real source of truth.
insert into play_track_defaults (track_id, label) values
  ('full', 'Learn Full Skill')
on conflict (track_id) do update set label = excluded.label, updated_at = now();
