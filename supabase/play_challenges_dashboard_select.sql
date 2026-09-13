-- ============================================================
-- Play Dashboard: read-only visibility into Challenge Corner data
--
-- play_challenges / play_challenge_members / play_tournaments /
-- play_tournament_members were built RLS-enabled with NO select
-- policy at all -- by design, every read/write in the app itself
-- goes through SECURITY DEFINER RPCs (play_my_challenge_stories,
-- play_challenge_state, play_tournament_state, etc.), so the anon
-- key was never meant to read these tables directly.
--
-- PlayDashboard is a separate, read-only reporting tool that also
-- only holds the anon key (see PlayDashboard/src/lib/supabase.ts --
-- "no service role, no writes anywhere in this codebase"), same
-- pattern already relied on for play_devices/play_accounts/
-- play_purchases/play_progress. It needs plain SELECT on these four
-- tables to show a learner's challenge/tournament history. This does
-- NOT add INSERT/UPDATE/DELETE policies -- those stay fully locked
-- to the SECURITY DEFINER RPCs, so the app's existing write-path
-- security is unaffected.
-- ============================================================

drop policy if exists "public select play_challenges" on public.play_challenges;
create policy "public select play_challenges"
  on public.play_challenges for select
  using (true);

drop policy if exists "public select play_challenge_members" on public.play_challenge_members;
create policy "public select play_challenge_members"
  on public.play_challenge_members for select
  using (true);

drop policy if exists "public select play_tournaments" on public.play_tournaments;
create policy "public select play_tournaments"
  on public.play_tournaments for select
  using (true);

drop policy if exists "public select play_tournament_members" on public.play_tournament_members;
create policy "public select play_tournament_members"
  on public.play_tournament_members for select
  using (true);
