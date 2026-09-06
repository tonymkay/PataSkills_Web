-- Universal per-track fallback illustrations, for any skill's track that
-- has no per-curriculum image of its own (curriculum JSON's tracks[].image
-- — see constants/trackOptions.ts's trackImage()) and no code-level
-- override (LandingSkill.trackImages). Table is intentionally EMPTY right
-- now: the only track art that exists (assets/driving/*.webp, uploaded to
-- track-icons/) belongs to driving-theory specifically and lives on its
-- own curriculum JSON instead, not here — seeding it here would leak
-- driving's art onto every other skill's matching track id (e.g.
-- true-false's 'reading' track). Add a row here only once you have art
-- that's genuinely meant to be shared across skills. Until then, a skill
-- with no dedicated art for a track falls through to that skill's own
-- cover image (play_curricula.cover_image_path), which is correct.
-- Read-only for anon, same shape as play_curricula — writes go through
-- the SQL editor or a service-role script, never the app.
create table if not exists play_track_defaults (
  track_id text primary key,
  image_path text not null,
  updated_at timestamptz not null default now()
);

alter table play_track_defaults enable row level security;

drop policy if exists "anon can read track defaults" on play_track_defaults;
create policy "anon can read track defaults"
  on play_track_defaults for select
  to anon
  using (true);

-- No seed rows — see comment above. If you ever add genuine universal
-- art, insert it here with:
--   insert into play_track_defaults (track_id, image_path) values
--     ('<track_id>', 'track-icons/<file>.webp')
--   on conflict (track_id) do update set image_path = excluded.image_path, updated_at = now();
--
-- Clears out the old, wrong seed rows if this file was run before today:
delete from play_track_defaults where track_id in
  ('differentiation', 'identification', 'pairs', 'names', 'meanings', 'whereUsed', 'reading');
