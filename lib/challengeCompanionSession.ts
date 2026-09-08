/**
 * Module-level singleton for a Companion Challenge run — the offline
 * "race a bot" session state for Play's challenge-offline.tsx.
 * Ported from pataskillsv2's lib/companionSession.ts. Same shape/lifecycle
 * contract: challenge-offline.tsx calls initCompanionSession() once a
 * persona is picked (sets up the roster, doesn't start the clock).
 * challenge-run.tsx calls startCompanionRace() on mount. challenge-results.tsx
 * (or a leave/back handler) calls stopCompanionSession() when done.
 *
 * Dropped vs the old app: setCompanionPromoCooldown() calls — that was a
 * cross-feature promo nudge (lib/companionPromo.ts) with no Play equivalent
 * and no spec requirement here, so this is a straight omission, not a port.
 */
import { getDeviceId } from '@/lib/deviceId';
import {
  simulateCompanionRun,
  companionDeviceId,
  isCompanionId,
  type CompanionPersona,
  type CompanionRunHandle,
  type CompanionPlayer,
} from '@/lib/challengeCompanions';

function rankAndReward(players: CompanionPlayer[]): CompanionPlayer[] {
  const ranked = [...players].sort((a, b) => (b.score - a.score) || (a.timeMs - b.timeMs));
  const rewardForRank = [3, 2, 1];
  const rewardMap = new Map<string, { finishOrder: number; rewardKeys: number }>();
  ranked.forEach((p, i) => {
    rewardMap.set(p.deviceId, {
      finishOrder: i + 1,
      rewardKeys: players.length >= 5 && i < 3 ? rewardForRank[i] : 0,
    });
  });
  return players.map((p) => ({ ...p, ...rewardMap.get(p.deviceId)! }));
}

export interface CompanionSessionState {
  active: boolean;
  personas: CompanionPersona[];
  players: CompanionPlayer[];
  started: boolean;
  deviceId: string;
  /** When the first finisher opened challenge-results (ms since epoch). */
  firstResultsAt: number | null;
}

const initialState: CompanionSessionState = {
  active: false, personas: [], players: [], started: false, deviceId: '', firstResultsAt: null,
};

let state: CompanionSessionState = { ...initialState };
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
}
function patch(p: Partial<CompanionSessionState>) {
  state = { ...state, ...p };
  emit();
}

export function subscribeCompanionSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getCompanionSessionSnapshot(): CompanionSessionState {
  return state;
}

let runHandles: CompanionRunHandle[] = [];
/** Tracks whether rankAndReward has already been applied for this session.
 *  Once all players finish, we rank once and then stop re-ranking. */
let ranked = false;

function updatePlayer(deviceId: string, updater: (p: CompanionPlayer) => CompanionPlayer) {
  patch({ players: state.players.map((p) => (p.deviceId === deviceId ? updater(p) : p)) });
}

/** When all players are done, rank by score desc → time asc and assign
 *  rewards (3/2/1 keys for top three, only if 5+ participants). */
function maybeRankAll() {
  if (ranked) return;
  const allDone = state.players.every((p) => p.finished);
  if (!allDone) return;
  ranked = true;
  patch({ players: rankAndReward(state.players) });
}

/**
 * Sets up the roster (you + creator bot + other bots) for a race of
 * `questionCount` questions. Doesn't start the clock.
 */
export async function initCompanionSession(
  persona: CompanionPersona,
  myDisplayName: string,
  questionCount: number,
  otherPersonas: CompanionPersona[] = [],
): Promise<void> {
  const myId = await getDeviceId();
  ranked = false;

  const me: CompanionPlayer = {
    deviceId: myId, displayName: myDisplayName, isCreator: true, currentQuestionIndex: 0,
    finished: false, score: 0, total: questionCount, timeMs: 0, finishOrder: null, rewardKeys: 0, isBot: false,
  };

  const creatorBot: CompanionPlayer = {
    deviceId: companionDeviceId(persona.id), displayName: persona.name, isCreator: false, currentQuestionIndex: 0,
    finished: false, score: 0, total: questionCount, timeMs: 0, finishOrder: null, rewardKeys: 0, isBot: true,
  };

  const otherBots = otherPersonas.map((op) => ({
    deviceId: companionDeviceId(op.id), displayName: op.name, isCreator: false, currentQuestionIndex: 0,
    finished: false, score: 0, total: questionCount, timeMs: 0, finishOrder: null, rewardKeys: 0, isBot: true,
  }));

  patch({
    active: true,
    personas: [persona, ...otherPersonas],
    players: [me, creatorBot, ...otherBots],
    started: false,
    deviceId: myId,
    firstResultsAt: null,
  });
}

/** Begins simulated runs for all bots in the session. Idempotent.
 *  `deadlineMs`, when given, is the same total race time budget the human
 *  is racing against — see simulateCompanionRun's doc comment. Without it
 *  bots never time out the way the human can. */
export function startCompanionRace(deadlineMs?: number): void {
  if (state.personas.length === 0 || state.started) return;
  patch({ started: true });

  const bots = state.players.filter((p) => isCompanionId(p.deviceId));
  const total = bots[0]?.total ?? 0;

  runHandles = bots.map((bot) => {
    const persona = state.personas.find((p) => companionDeviceId(p.id) === bot.deviceId);
    if (!persona) return { cancel: () => {} };

    return simulateCompanionRun(persona, total, {
      onProgress: (i, liveScore) => updatePlayer(bot.deviceId, (p) => ({ ...p, currentQuestionIndex: i, score: liveScore })),
      onFinish: (result) => {
        // Record the bot as finished — rewards deferred until all done.
        updatePlayer(result.deviceId, (p) => ({ ...p, ...result }));
        maybeRankAll();
      },
    }, deadlineMs);
  });
}

/** Real player: report question progress AND running score (mirrors
 *  sendNearbyProgress) — the live score is what lets the leaderboard
 *  re-rank by points while the race is still going, not just at the end. */
export function sendCompanionProgress(currentQuestionIndex: number, score: number): void {
  if (!state.deviceId) return;
  updatePlayer(state.deviceId, (p) => ({ ...p, currentQuestionIndex, score }));
}

/** Real player finished: records the result. Rewards are deferred until
 *  all players (human + bots) are finished, then ranked by score → time. */
export function sendCompanionFinish(score: number, total: number, timeMs: number): number {
  if (!state.deviceId) return 0;
  updatePlayer(state.deviceId, (p) => ({ ...p, finished: true, score, total, timeMs }));
  maybeRankAll();
  // Return the reward (0 if ranking hasn't happened yet or threshold not met).
  return state.players.find((p) => p.deviceId === state.deviceId)?.rewardKeys ?? 0;
}

/** Called when a finisher lands on challenge-results. Idempotent — only the
 *  first call stamps the 2-minute exit timer anchor. */
export function markCompanionResultsViewed(): number | null {
  if (state.firstResultsAt !== null) return state.firstResultsAt;
  const at = Date.now();
  patch({ firstResultsAt: at });
  return at;
}

/** Tears down all bot timers and resets state. */
export function stopCompanionSession(): void {
  runHandles.forEach((h) => h.cancel());
  runHandles = [];
  ranked = false;
  state = { ...initialState };
  emit();
}
