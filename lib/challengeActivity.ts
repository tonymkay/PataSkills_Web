/**
 * Challenge Corner activity log — one unconditional row per race that
 * finishes or is abandoned, for every opponent kind (real player, scout
 * bot, offline companion). Unlike play_challenges/play_challenge_members
 * (real races only) this fires regardless of who the opponent was, so a
 * learner's stats aren't blind to their scout/companion practice races.
 *
 * Fire-and-forget, same shape as updateChallengeProgress() in
 * lib/challenges.ts -- a logging failure must never interrupt or block
 * the actual race, so every error is swallowed here.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';

export type ChallengeOpponentKind = 'real' | 'scout' | 'companion';
export type ChallengeActivityOutcome = 'completed' | 'abandoned';

export interface ChallengeActivityEntry {
  opponentKind: ChallengeOpponentKind;
  curriculumSlug: string;
  total: number;
  outcome: ChallengeActivityOutcome;
  /** Null for 'abandoned' -- there's no final score for a race that was
   *  quit before finishing. */
  score?: number | null;
  timeMs?: number | null;
  /** Which question they were on when they quit -- 'completed' races
   *  don't need this, only 'abandoned' ones. */
  stoppedAtQuestion?: number | null;
  /** Keys actually granted for this race (0 if none/lost). */
  rewardKeys?: number;
  /** Only meaningful when opponentKind is 'real' -- links back to the
   *  real play_challenges row for cross-referencing. */
  realChallengeId?: string | null;
}

export async function logChallengeActivity(entry: ChallengeActivityEntry): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const deviceId = await getDeviceId();
    await supabase.from('play_challenge_activity').insert({
      device_id: deviceId,
      opponent_kind: entry.opponentKind,
      curriculum_slug: entry.curriculumSlug,
      score: entry.score ?? null,
      total: entry.total,
      time_ms: entry.timeMs ?? null,
      outcome: entry.outcome,
      stopped_at_question: entry.stoppedAtQuestion ?? null,
      reward_keys: entry.rewardKeys ?? 0,
      real_challenge_id: entry.realChallengeId ?? null,
    });
  } catch {
    // best-effort -- never let logging interrupt the actual race
  }
}
