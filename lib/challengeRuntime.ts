/**
 * In-memory handoff between the challenge screens (corner → countdown → run
 * → results → reward), ported from pataskillsv2's lib/challengeRuntime.ts.
 * Question sets are too big for router params, so the initiating screen
 * stashes the run here and the next screen picks it up. Cleared on
 * completion; a cold navigation with nothing pending safely bails out.
 *
 * Adapted for Play: skillId/skillName → curriculumSlug/curriculumTitle,
 * Question → QuizQuestion (Play's question model is always single-choice,
 * so no generic multi-format Answer/QuestionRenderer machinery is needed
 * here), and `kind`/`topicByQuestion` (practice-mistakes concepts that
 * don't exist in Play) are dropped.
 */
import type { QuizQuestion } from '@/types/quiz';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface PendingChallengeRun {
  /** Server challenge id — absent for Offline (Companion) races, which
   *  never touch the DB. */
  challengeId?: string;
  /** True for a fully-offline Companion race (lib/challengeCompanionSession.ts)
   *  — a locally-simulated bot opponent instead of a real player. */
  isCompanion?: boolean;
  /** True for a fully-offline Scout race (lib/challengeScoutSession.ts) — a
   *  Global challenge seated with locally-simulated players instead of real
   *  ones while a real match is still being found. Mutually exclusive with
   *  isCompanion. */
  isScout?: boolean;
  /** Drives the per-question timer budget (lib/challengeTimerSettings.ts).
   *  Set from the companion/scout persona's own difficulty at creation
   *  time; Global runs have no difficulty concept and leave this unset,
   *  which challenge-run.tsx treats as 'medium'. */
  difficulty?: ChallengeDifficulty;
  curriculumSlug: string;
  curriculumTitle: string;
  /** Server wall-clock ms when the race was started (real online challenges
   *  only — absent for Companion/Scout, which have no shared server clock).
   *  challenge-start.tsx anchors its countdown to this instead of counting
   *  down locally from mount time, so every participant hits zero at the
   *  same instant. */
  startedAtMs?: number;
  /** Set when this run is one stage-match of a Tournament — challenge-
   *  results.tsx uses these to poll tournament state / route into
   *  challenge-tournament.tsx instead of the normal exit path. */
  tournamentId?: string;
  tournamentStage?: number;
  /** Present once buildChallengeQuestions() has actually run and resolved.
   *  Empty ([]) on first handoff from the joining screen — challenge-start.tsx
   *  fills this in during the "Starting in N" countdown by building from
   *  the recipe fields below, via setPendingChallengeRunQuestions(). */
  questions: QuizQuestion[];
  /** Recipe buildChallengeQuestions() needs — set by the joining screen
   *  alongside an empty `questions`, consumed by challenge-start.tsx.
   *  Absent once `questions` has been filled in for real (online/tournament
   *  runs that already had questions built pre-refactor keep these unset). */
  seed?: number;
  questionCount?: number;
  topicIndex?: number | null;
  /** Where to exit back to once everything is done. */
  origin: 'challenge-corner' | 'home';
}

export interface FinishedChallengeRun extends PendingChallengeRun {
  timeMs: number;
  score: number;
  total: number;
  /** Per-question outcome, aligned with `questions`. */
  correct: boolean[];
}

let pending: PendingChallengeRun | null = null;
let finished: FinishedChallengeRun | null = null;

export function setPendingChallengeRun(run: PendingChallengeRun): void {
  pending = run;
  finished = null;
}
export function getPendingChallengeRun(): PendingChallengeRun | null {
  return pending;
}
/** Fills in the real question set once challenge-start.tsx has built it
 *  from the pending run's recipe fields (seed/questionCount/topicIndex).
 *  No-ops if there's no pending run (e.g. the user backed out mid-prep). */
export function setPendingChallengeRunQuestions(questions: QuizQuestion[]): void {
  if (!pending) return;
  pending = { ...pending, questions };
}
export function setFinishedChallengeRun(run: FinishedChallengeRun): void {
  finished = run;
  pending = null;
}
export function getFinishedChallengeRun(): FinishedChallengeRun | null {
  return finished;
}
export function clearChallengeRun(): void {
  pending = null;
  finished = null;
}

/** Handoff from challenge-results.tsx → challenge-reward.tsx (non-tournament
 *  runs only — tournaments route back into challenge-tournament.tsx instead,
 *  which already owns the promotion/elimination state). */
export interface ChallengeRewardSummary {
  score: number;
  total: number;
  rewardKeys: number;
  activityLabel: string;
  /** Present for real online challenges — challenge-reward.tsx claims via
   *  the server RPC instead of a local grantBonusKey. Absent for
   *  Companion/Scout runs. */
  challengeId?: string;
  /** Threaded from the finished run's own `origin` — challenge-reward.tsx's
   *  Finish button routes to /challenge-corner only when this is
   *  'challenge-corner', and falls back to /home otherwise. */
  origin?: PendingChallengeRun['origin'];
}

let rewardSummary: ChallengeRewardSummary | null = null;

export function setChallengeRewardSummary(summary: ChallengeRewardSummary): void {
  rewardSummary = summary;
}
export function getChallengeRewardSummary(): ChallengeRewardSummary | null {
  return rewardSummary;
}
export function clearChallengeRewardSummary(): void {
  rewardSummary = null;
}
