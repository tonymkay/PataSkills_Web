-- ==============================================================================
-- RESET PLAY SIGNS & PAIR MAPPINGS (FRESH START)
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Clear all sign pair references
delete from play_sign_pairs;

-- 2. Clear all signs from play_signs table
delete from play_signs;

-- 3. Verify RLS and full access policies exist on play_signs and play_sign_pairs
alter table if exists play_signs enable row level security;
drop policy if exists "allow all on play_signs" on play_signs;
create policy "allow all on play_signs"
  on play_signs for all to anon, authenticated
  using (true) with check (true);

alter table if exists play_sign_pairs enable row level security;
drop policy if exists "allow all on play_sign_pairs" on play_sign_pairs;
create policy "allow all on play_sign_pairs"
  on play_sign_pairs for all to anon, authenticated
  using (true) with check (true);

-- 4. Confirm tables are cleared
select count(*) as remaining_signs from play_signs;
select count(*) as remaining_pairs from play_sign_pairs;
