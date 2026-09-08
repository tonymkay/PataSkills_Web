/**
 * Challenge Timer settings — per-difficulty seconds-per-question budget.
 * pataskillsv2 makes this user-editable (Settings → Challenge Timer); Play
 * skips that screen entirely (per the Challenge Corner plan §0 — no Settings
 * surface for it) and just hardcodes sane defaults. Kept as a settings
 * object + secondsForDifficulty() function (not a bare constant) so
 * challenge-run.tsx's call site ports over unchanged, and so a Settings
 * screen can be added later without touching challenge-run.tsx again.
 */
import type { ChallengeDifficulty } from '@/lib/challengeRuntime';

export type ChallengeTimerSettings = Record<ChallengeDifficulty, number>;

export const CHALLENGE_TIMER_SETTINGS: ChallengeTimerSettings = {
  easy: 20,
  medium: 14,
  hard: 8,
};

/** Shared countdown on challenge-start.tsx (old app: CHALLENGE_COUNTDOWN_SECONDS in lib/challenges.ts). */
export const CHALLENGE_COUNTDOWN_SECONDS = 8;

export async function getChallengeTimerSettings(): Promise<ChallengeTimerSettings> {
  return CHALLENGE_TIMER_SETTINGS;
}

/** Seconds-per-question for a given tier. `difficulty` is absent for run
 *  kinds with no difficulty concept (real online challenges) — those fall
 *  back to Medium. */
export function secondsForDifficulty(
  settings: ChallengeTimerSettings,
  difficulty?: ChallengeDifficulty | null,
): number {
  return settings[difficulty ?? 'medium'];
}
