-- Step 1: play_sign_pairs — DB home for the two-image "which sign is which"
-- pairing data that currently lives in constants/signs.ts's SignPairs table.
-- Small, stable, mostly-static reference data — same shape as play_signs.

create table if not exists play_sign_pairs (
  pair_id text primary key,
  key_a text not null,
  key_b text not null
);

alter table play_sign_pairs enable row level security;

create policy "public read play_sign_pairs"
  on play_sign_pairs
  for select
  using (true);

-- Data migrated verbatim from constants/signs.ts SignPairs (key_a/key_b are
-- the SignAssets keys each pair's A/B previously resolved to).
insert into play_sign_pairs (pair_id, key_a, key_b) values
  ('A1', 'give_way', 'stop'),
  ('B1', 'pedestrian', 'children_crossing'),
  ('B2', 'pedestrian2', 'no_pedestrians'),
  ('B3', 'cyclists_ahead', 'no_cycling'),
  ('B4', 'level_crossing_barrier', 'without_a_gate'),
  ('B5', 'roundabout_ahead', 'mini_roundabout'),
  ('B6', 'bump', 'uneven_surface'),
  ('C1', 'no_entry', 'no_vehicles'),
  ('C2', 'no_parking', 'no_stopping'),
  ('C3', 'no_u_turn', 'mandatory_u'),
  ('C4', 'no_overtaking', 'end_of_no_overtaking'),
  ('C5', 'turn_left', 'turn_left_ahead'),
  ('C6', 'turn_right_mandatory', 'no_right_turn'),
  ('D1', '30_max', '30_end'),
  ('D2', 'max_speed', 'recommended_speed'),
  ('D3', 'one_way', 'two_way_crosses_one_way'),
  ('D4', 'end_of_dual_carriage', 'two_way_straight_ahead'),
  ('D5', 'narrow_road', 'road_narrows_both_ends'),
  ('D6', 'crossroads', 'staggered_junction'),
  ('E1', 'sharp_bend_right', 'double_bend'),
  ('E2', 'parking_zone', 'parking_verge'),
  ('E3', 'stop_police', 'stop_police2'),
  ('E4', 'lane_ends_merge', 'keep_left')
on conflict (pair_id) do update
  set key_a = excluded.key_a,
      key_b = excluded.key_b;
