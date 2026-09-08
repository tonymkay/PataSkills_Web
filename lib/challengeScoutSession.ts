/**
 * Module-level singleton for a Scout Global Challenge run — cloned from
 * lib/companionSession.ts's contract (players: NearbyPlayer[], report
 * progress/finish, get a reward back) so challenge-run.tsx/
 * challenge-results.tsx can branch on isScout exactly the way they already
 * branch on isCompanion/isNearby. The one addition is `joinTimeline`, which
 * app/scout-challenge-room.tsx animates against to reveal scout avatars on
 * a stagger instead of all at once (Companions show their whole roster
 * instantly; Scouts need to visibly "trickle in" like a real Global room).
 *
 * Lifecycle: scout-challenge-room.tsx calls initScoutSession() once a scout
 * challenge is picked (sets up the roster + join timeline, doesn't start the
 * clock). challenge-run.tsx calls startScoutRace() on mount. challenge-
 * results.tsx calls stopScoutSession() when the flow is fully done, same as
 * stopCompanionSession().
 *
 * The join timeline (see buildJoinTimeline below) is deliberately NOT
 * evenly-spaced-with-jitter — a fixed window sliced into equal steps still
 * reads as a staircase after you've watched it a few times. Each scout gets
 * an independently random offset (skewed early, occasional straggler), and
 * the window itself is redrawn per session too, so no two races feel
 * identically timed.
 */
import { getDeviceId } from '@/lib/deviceId';
import { simulateScoutRun, scoutDeviceId, isScoutId, type ScoutPersona, type ScoutRunHandle, type ScoutPlayer } from '@/lib/challengeScouts';

function rankAndReward(players: ScoutPlayer[]): ScoutPlayer[] {
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

/** Per-persona staggered arrival offset (ms from session init) — the
 *  waiting-room screen uses this to reveal avatars one by one instead of
 *  rendering the full roster immediately. The creator is always 0 (they
 *  "already created" the challenge by the time it's shown). */
export interface ScoutJoinEntry {
  deviceId: string;
  offsetMs: number;
}

export interface ScoutSessionState {
  active: boolean;
  personas: ScoutPersona[];
  players: ScoutPlayer[];
  joinTimeline: ScoutJoinEntry[];
  started: boolean;
  deviceId: string;
  /** When the first finisher opened challenge-results (ms since epoch). */
  firstResultsAt: number | null;
}

const initialState: ScoutSessionState = {
  active: false, personas: [], players: [], joinTimeline: [], started: false, deviceId: '', firstResultsAt: null,
};

let state: ScoutSessionState = { ...initialState };
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
}
function patch(p: Partial<ScoutSessionState>) {
  state = { ...state, ...p };
  emit();
}

export function subscribeScoutSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getScoutSessionSnapshot(): ScoutSessionState {
  return state;
}

let runHandles: ScoutRunHandle[] = [];
/** Tracks whether rankAndReward has already been applied for this session. */
let ranked = false;

function updatePlayer(deviceId: string, updater: (p: ScoutPlayer) => ScoutPlayer) {
  patch({ players: state.players.map((p) => (p.deviceId === deviceId ? updater(p) : p)) });
}

/** When all players are done, rank by score desc → time asc and assign
 *  rewards (3/2/1 keys for top three, only if 5+ participants) — identical
 *  policy to Companions, reused via the same rankAndReward helper. */
function maybeRankAll() {
  if (ranked) return;
  const allDone = state.players.every((p) => p.finished);
  if (!allDone) return;
  ranked = true;
  patch({ players: rankAndReward(state.players) });
}

/** Bounds for the join window — randomized per-session (see below), not a
 *  fixed constant, so back-to-back races don't all trickle in on the same
 *  rhythm. Kept well under the old fixed 9s ceiling on the low end so a
 *  small roster doesn't drag, but can run longer for a big one. */
const MIN_JOIN_WINDOW_MS = 10000;
const MAX_JOIN_WINDOW_MS = 15000;

/** Only nudges an offset that's genuinely about to collide with the one
 *  before it — small enough that natural clusters (several scouts landing
 *  within a couple hundred ms of each other, like real people) are left
 *  alone; this just stops two avatars from popping in on the exact same
 *  frame. */
const MIN_GAP_MS = 180;

/** Creator scout is offset 0 (the room already exists once shown). Every
 *  other scout gets an INDEPENDENTLY random offset — not evenly-spaced
 *  slots with a bit of jitter (that still reads as a staircase once you've
 *  seen it a few times). Each draw is skewed toward the front of the window
 *  (Math.random() ** 1.6) so most scouts join reasonably promptly and only
 *  an occasional straggler runs close to the window's edge — random, but
 *  not annoying. The window itself is redrawn every session too. */
function buildJoinTimeline(creatorDeviceId: string, otherDeviceIds: string[]): ScoutJoinEntry[] {
  const timeline: ScoutJoinEntry[] = [{ deviceId: creatorDeviceId, offsetMs: 0 }];
  if (otherDeviceIds.length === 0) return timeline;

  const windowMs = MIN_JOIN_WINDOW_MS + Math.random() * (MAX_JOIN_WINDOW_MS - MIN_JOIN_WINDOW_MS);
  const draws = otherDeviceIds
    .map((deviceId) => ({ deviceId, offsetMs: windowMs * Math.random() ** 1.6 }))
    .sort((a, b) => a.offsetMs - b.offsetMs);

  let lastOffset = 0;
  draws.forEach((d) => {
    const offsetMs = Math.max(Math.round(d.offsetMs), lastOffset + MIN_GAP_MS);
    lastOffset = offsetMs;
    timeline.push({ deviceId: d.deviceId, offsetMs });
  });
  return timeline;
}

/**
 * Sets up the roster (you + creator scout + other scouts) for a race of
 * `questionCount` questions, plus the join timeline the waiting room
 * animates against. Doesn't start the clock.
 */
export async function initScoutSession(
  creatorPersona: ScoutPersona,
  myDisplayName: string,
  questionCount: number,
  otherPersonas: ScoutPersona[] = [],
): Promise<void> {
  const myId = await getDeviceId();
  ranked = false;

  const me: ScoutPlayer = {
    deviceId: myId, displayName: myDisplayName, isCreator: false, currentQuestionIndex: 0,
    finished: false, score: 0, total: questionCount, timeMs: 0, finishOrder: null, rewardKeys: 0, isBot: false,
  };

  const creatorId = scoutDeviceId(creatorPersona.id);
  const creatorScout: ScoutPlayer = {
    deviceId: creatorId, displayName: creatorPersona.name, isCreator: true, currentQuestionIndex: 0,
    finished: false, score: 0, total: questionCount, timeMs: 0, finishOrder: null, rewardKeys: 0, isBot: true,
  };

  const otherScouts = otherPersonas.map((op) => ({
    deviceId: scoutDeviceId(op.id), displayName: op.name, isCreator: false, currentQuestionIndex: 0,
    finished: false, score: 0, total: questionCount, timeMs: 0, finishOrder: null, rewardKeys: 0, isBot: true,
  }));

  const joinTimeline = buildJoinTimeline(creatorId, otherScouts.map((s) => s.deviceId));

  patch({
    active: true,
    personas: [creatorPersona, ...otherPersonas],
    players: [me, creatorScout, ...otherScouts],
    joinTimeline,
    started: false,
    deviceId: myId,
    firstResultsAt: null,
  });
}

/** Begins simulated runs for all scouts in the session. Idempotent.
 *  `deadlineMs`, when given, is the same total race time budget the human
 *  is racing against — see simulateScoutRun's doc comment. */
export function startScoutRace(deadlineMs?: number): void {
  if (state.personas.length === 0 || state.started) return;
  patch({ started: true });

  const scoutPlayers = state.players.filter((p) => isScoutId(p.deviceId));
  const total = scoutPlayers[0]?.total ?? 0;

  runHandles = scoutPlayers.map((sp) => {
    const persona = state.personas.find((p) => scoutDeviceId(p.id) === sp.deviceId);
    if (!persona) return { cancel: () => {} };

    return simulateScoutRun(persona, total, {
      onProgress: (i, liveScore) => updatePlayer(sp.deviceId, (p) => ({ ...p, currentQuestionIndex: i, score: liveScore })),
      onFinish: (result) => {
        updatePlayer(result.deviceId, (p) => ({ ...p, ...result }));
        maybeRankAll();
      },
    }, deadlineMs);
  });
}

/** Real player: report question progress AND running score. */
export function sendScoutProgress(currentQuestionIndex: number, score: number): void {
  if (!state.deviceId) return;
  updatePlayer(state.deviceId, (p) => ({ ...p, currentQuestionIndex, score }));
}

/** Real player finished: records the result. Rewards are deferred until
 *  all players (human + scouts) are finished, then ranked by score → time. */
export function sendScoutFinish(score: number, total: number, timeMs: number): number {
  if (!state.deviceId) return 0;
  updatePlayer(state.deviceId, (p) => ({ ...p, finished: true, score, total, timeMs }));
  maybeRankAll();
  return state.players.find((p) => p.deviceId === state.deviceId)?.rewardKeys ?? 0;
}

/** Called when a finisher lands on challenge-results. Idempotent — only the
 *  first call stamps the 2-minute exit timer anchor. */
export function markScoutResultsViewed(): number | null {
  if (state.firstResultsAt !== null) return state.firstResultsAt;
  const at = Date.now();
  patch({ firstResultsAt: at });
  return at;
}

/** Tears down all scout timers and resets state. */
export function stopScoutSession(): void {
  runHandles.forEach((h) => h.cancel());
  runHandles = [];
  ranked = false;
  state = { ...initialState };
  emit();
}
