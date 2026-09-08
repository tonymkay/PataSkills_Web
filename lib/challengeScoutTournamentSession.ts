/**
 * Module-level singleton for a fully OFFLINE Scout-sourced tournament
 * bracket — the Tournament-tier counterpart to lib/challengeScoutSession.ts,
 * the same way lib/challengeCompanionSession.ts is the offline counterpart
 * to the online challenge session. Nothing here ever touches Supabase,
 * requires sign-in, or needs connectivity — mirrors lib/challengeScouts.ts's
 * file-header guarantee.
 *
 * SCOPE DECISION — every stage is one shared pool (mirrors the server's
 * single-pool model), but since there is only ever one real human in a
 * Scout-sourced tournament, this module only ever materializes real
 * ScoutPersona opponents for the ONE pool the player is actually in each
 * stage. Bracket-level bookkeeping (field size, tier, stage count, rewards,
 * an estimated shrinking pool for display/advancement math) is still
 * tracked in full.
 *
 * LIFECYCLE (mirrors lib/challengeScoutSession.ts's doc comment):
 *   1. app/challenge-tournament.tsx calls createLocalScoutTournament() (or
 *      createLocalScoutTournamentFromPreview()) once a fresh "Join a
 *      Tournament" entry resolves to the offline path — this seeds the
 *      stage-1 pool and auto-joins the human immediately, no separate join
 *      step.
 *   2. app/challenge-tournament-room.tsx reads getMyStagePool() and hands
 *      its scouts to lib/challengeScoutSession.ts's initScoutSession()/
 *      startScoutRace() — the actual race itself is NOT reimplemented here,
 *      it's the exact same engine a single Scout Global challenge already
 *      uses.
 *   3. Once that race ends, app/challenge-results.tsx calls
 *      recordLocalStageResult() with the finished pool's ranked players to
 *      advance (or end) the bracket — promoted scouts carry straight into
 *      the next stage's pool alongside the player (see seedStagePool).
 *   4. Final placement: app/challenge-tournament.tsx's "final_win"/
 *      "elimination" bodies read myStatus/myPlacement/myRewardKeys off
 *      getLocalTournamentState(), and claimLocalTournamentReward() grants
 *      through the same reward path Companion/Scout single races already
 *      use (lib/keys.ts's grantBonusKey).
 */
import { getDeviceId } from '@/lib/deviceId';
import { pickRandomScouts, scoutDeviceId, type ScoutPersona } from '@/lib/challengeScouts';
import { getChallengeTopics } from '@/lib/challengeQuestions';
import { getLocalProgress } from '@/lib/progress';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

export type TournamentTier = 'small' | 'mid' | 'large';
export type TournamentBracketStatus = 'group_stage' | 'knockout' | 'final' | 'ended';
export type TournamentMemberStatus = 'active' | 'eliminated' | 'placed';

const LOCAL_TOURNAMENT_ID_PREFIX = 'local-tournament-';
const LOCAL_POOL_ID_PREFIX = 'local-pool-';

export function isLocalTournamentId(tournamentId: string | null | undefined): boolean {
  return !!tournamentId && tournamentId.startsWith(LOCAL_TOURNAMENT_ID_PREFIX);
}

export interface TournamentPlan {
  tier: TournamentTier;
  stageCount: number;
  rewardFirst: number;
  rewardSecond: number;
  rewardThird: number;
  rewardFourth: number;
  rewardFifth: number;
}

export function computeTournamentPlan(fieldSize: number): TournamentPlan {
  let pool = fieldSize;
  let stages = 0;
  while (true) {
    stages += 1;
    if (pool <= 8) break;
    pool = Math.round(pool * 0.6);
  }
  if (stages <= 3) {
    return { tier: 'small', stageCount: stages, rewardFirst: 1, rewardSecond: 1, rewardThird: 1, rewardFourth: 0, rewardFifth: 0 };
  }
  if (stages <= 6) {
    return { tier: 'mid', stageCount: stages, rewardFirst: 3, rewardSecond: 2, rewardThird: 1, rewardFourth: 0, rewardFifth: 0 };
  }
  return { tier: 'large', stageCount: stages, rewardFirst: 5, rewardSecond: 4, rewardThird: 3, rewardFourth: 2, rewardFifth: 1 };
}

const FIELD_SIZE_BANDS: { min: number; max: number; weight: number }[] = [
  { min: 10, max: 24, weight: 6 },
  { min: 30, max: 45, weight: 3 },
  { min: 60, max: 75, weight: 1 },
];
function pickFieldSize(): number {
  const total = FIELD_SIZE_BANDS.reduce((sum, b) => sum + b.weight, 0);
  let r = Math.random() * total;
  for (const b of FIELD_SIZE_BANDS) {
    if (r < b.weight) return b.min + Math.floor(Math.random() * (b.max - b.min + 1));
    r -= b.weight;
  }
  return FIELD_SIZE_BANDS[0].min;
}

export async function pickHeadlineTopicTitle(slug: CurriculumSlug, curriculumTitle: string): Promise<string> {
  const topics = await getChallengeTopics(slug);
  if (topics.length === 0) return curriculumTitle;
  const progress = await getLocalProgress(slug);
  const undone: number[] = [];
  const done: number[] = [];
  for (let i = 0; i < topics.length; i++) (i >= progress.completedTopics ? undone : done).push(i);
  const pool = undone.length > 0 ? [...undone, ...undone, ...undone, ...undone, ...done] : done;
  if (pool.length === 0) return curriculumTitle;
  const idx = pool[Math.floor(Math.random() * pool.length)];
  return topics[idx]?.title ?? curriculumTitle;
}

export interface LocalStagePool {
  poolId: string;
  targetSize: number;
  scouts: ScoutPersona[];
}

function seedStagePool(pool: number, carryOverScouts: ScoutPersona[], excludeScoutIds: string[]): LocalStagePool {
  const scoutsNeeded = Math.max(0, pool - 1);
  const shortfall = Math.max(0, scoutsNeeded - carryOverScouts.length);
  const freshScouts = shortfall > 0 ? pickRandomScouts(shortfall, excludeScoutIds) : [];
  return {
    poolId: `${LOCAL_POOL_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    targetSize: pool,
    scouts: [...carryOverScouts, ...freshScouts].slice(0, scoutsNeeded),
  };
}

interface ScoutTournamentState {
  active: boolean;
  tournamentId: string | null;
  curriculumSlug: CurriculumSlug | '';
  curriculumTitle: string;
  topicTitle: string;
  fieldSize: number;
  tier: TournamentTier;
  stageCount: number;
  rewardFirst: number;
  rewardSecond: number;
  rewardThird: number;
  rewardFourth: number;
  rewardFifth: number;
  status: TournamentBracketStatus;
  currentStage: number;
  pool: LocalStagePool;
  myPoolId: string | null;
  myStatus: TournamentMemberStatus;
  myPlacement: number | null;
  myRewardKeys: number;
  myClaimed: boolean;
  usedScoutIds: string[];
}

const EMPTY_POOL: LocalStagePool = { poolId: '', targetSize: 0, scouts: [] };

const initialState: ScoutTournamentState = {
  active: false, tournamentId: null, curriculumSlug: '', curriculumTitle: '', topicTitle: '', fieldSize: 0, tier: 'small', stageCount: 1,
  rewardFirst: 0, rewardSecond: 0, rewardThird: 0, rewardFourth: 0, rewardFifth: 0, status: 'group_stage', currentStage: 1,
  pool: EMPTY_POOL, myPoolId: null, myStatus: 'active', myPlacement: null,
  myRewardKeys: 0, myClaimed: false, usedScoutIds: [],
};

let state: ScoutTournamentState = { ...initialState };
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
}
function patch(p: Partial<ScoutTournamentState>) {
  state = { ...state, ...p };
  emit();
}

export function subscribeScoutTournamentSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getScoutTournamentSessionSnapshot(): ScoutTournamentState {
  return state;
}

export interface LocalTournamentState {
  tournamentId: string;
  status: TournamentBracketStatus;
  tier: TournamentTier;
  currentStage: number;
  stageCount: number;
  curriculumSlug: string;
  curriculumTitle: string;
  topicTitle: string;
  myPoolId: string | null;
  myStatus: TournamentMemberStatus;
  myPlacement: number | null;
  myRewardKeys: number;
  myClaimed: boolean;
  targetText: string;
  fieldSize: number;
}

export async function createLocalScoutTournament(slug: CurriculumSlug): Promise<string> {
  const fieldSize = pickFieldSize();
  const catalog = await getCurriculaCatalog();
  const curriculumTitle = catalog.find((c) => c.slug === slug)?.title ?? slug;
  const topicTitle = await pickHeadlineTopicTitle(slug, curriculumTitle);
  return activateLocalTournament({ curriculumSlug: slug, curriculumTitle, topicTitle, fieldSize });
}

export interface LocalTournamentPreview {
  previewId: string;
  curriculumSlug: CurriculumSlug;
  curriculumTitle: string;
  topicTitle: string;
  fieldSize: number;
  tier: TournamentTier;
  rewardFirst: number;
}

export async function previewLocalScoutTournaments(slug: CurriculumSlug, count: number): Promise<LocalTournamentPreview[]> {
  const catalog = await getCurriculaCatalog();
  const curriculumTitle = catalog.find((c) => c.slug === slug)?.title ?? slug;
  const previews: LocalTournamentPreview[] = [];
  for (let i = 0; i < count; i++) {
    const fieldSize = pickFieldSize();
    const plan = computeTournamentPlan(fieldSize);
    const topicTitle = await pickHeadlineTopicTitle(slug, curriculumTitle);
    previews.push({
      previewId: `local-preview-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      curriculumSlug: slug,
      curriculumTitle,
      topicTitle,
      fieldSize,
      tier: plan.tier,
      rewardFirst: plan.rewardFirst,
    });
  }
  return previews;
}

export async function createLocalScoutTournamentFromPreview(preview: LocalTournamentPreview): Promise<string> {
  return activateLocalTournament({
    curriculumSlug: preview.curriculumSlug,
    curriculumTitle: preview.curriculumTitle,
    topicTitle: preview.topicTitle,
    fieldSize: preview.fieldSize,
  });
}

function activateLocalTournament(args: {
  curriculumSlug: CurriculumSlug; curriculumTitle: string; topicTitle: string; fieldSize: number;
}): string {
  const plan = computeTournamentPlan(args.fieldSize);
  const pool = seedStagePool(args.fieldSize, [], []);
  const usedScoutIds = pool.scouts.map((s) => s.id);
  const tournamentId = `${LOCAL_TOURNAMENT_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  state = {
    ...initialState,
    active: true,
    tournamentId,
    curriculumSlug: args.curriculumSlug,
    curriculumTitle: args.curriculumTitle,
    topicTitle: args.topicTitle,
    fieldSize: args.fieldSize,
    tier: plan.tier,
    stageCount: plan.stageCount,
    rewardFirst: plan.rewardFirst,
    rewardSecond: plan.rewardSecond,
    rewardThird: plan.rewardThird,
    rewardFourth: plan.rewardFourth,
    rewardFifth: plan.rewardFifth,
    status: args.fieldSize <= 8 ? 'final' : 'group_stage',
    currentStage: 1,
    pool,
    myPoolId: pool.poolId,
    usedScoutIds,
  };
  emit();
  return tournamentId;
}

function targetTextFor(status: TournamentBracketStatus, pool: LocalStagePool): string {
  if (status === 'final') return 'Finish in the top 5 to win';
  const advance = Math.round(pool.targetSize * 0.6);
  return `Top ${advance} of ${pool.targetSize} advance`;
}

export function getLocalTournamentState(): LocalTournamentState | null {
  if (!state.active || !state.tournamentId) return null;
  return {
    tournamentId: state.tournamentId,
    status: state.status,
    tier: state.tier,
    currentStage: state.currentStage,
    stageCount: state.stageCount,
    curriculumSlug: state.curriculumSlug,
    curriculumTitle: state.curriculumTitle,
    topicTitle: state.topicTitle,
    myPoolId: state.myPoolId,
    myStatus: state.myStatus,
    myPlacement: state.myPlacement,
    myRewardKeys: state.myRewardKeys,
    myClaimed: state.myClaimed,
    targetText: targetTextFor(state.status, state.pool),
    fieldSize: state.fieldSize,
  };
}

export interface LocalStagePoolInfo {
  poolId: string;
  targetSize: number;
  joinedCount: number;
  scoutNames: string[];
}

export function getLocalStagePool(): LocalStagePoolInfo | null {
  const p = state.pool;
  if (!p.poolId) return null;
  return {
    poolId: p.poolId,
    targetSize: p.targetSize,
    joinedCount: p.scouts.length + 1,
    scoutNames: p.scouts.map((s) => s.name),
  };
}

export function getMyStagePool(): LocalStagePool | null {
  return state.pool.poolId ? state.pool : null;
}

export interface StageResult {
  promoted: boolean;
  placed: boolean;
  placement: number | null;
  rewardKeys: number;
}

export async function recordLocalStageResult(
  poolPlayers: { deviceId: string; score: number; timeMs: number }[],
): Promise<StageResult> {
  const myId = await getDeviceId();
  const ranked = [...poolPlayers].sort((a, b) => (b.score - a.score) || (a.timeMs - b.timeMs));
  const myIndex = ranked.findIndex((p) => p.deviceId === myId);
  const myRank = myIndex === -1 ? ranked.length : myIndex + 1;
  const n = Math.max(1, ranked.length);

  if (state.status === 'final') {
    const placed = myRank <= 3;
    const rewardKeys = !placed ? 0 : myRank === 1 ? state.rewardFirst : myRank === 2 ? state.rewardSecond : state.rewardThird;
    patch({
      status: 'ended',
      myStatus: placed ? 'placed' : 'eliminated',
      myPlacement: placed ? myRank : null,
      myRewardKeys: rewardKeys,
    });
    return { promoted: false, placed, placement: placed ? myRank : null, rewardKeys };
  }

  const advanceCount = Math.round(n * 0.6);
  const promoted = myRank <= advanceCount;
  if (!promoted) {
    patch({ status: 'ended', myStatus: 'eliminated' });
    return { promoted: false, placed: false, placement: null, rewardKeys: 0 };
  }

  const newStage = state.currentStage + 1;
  const nextPoolSize = Math.round(n * 0.6);
  const isFinal = nextPoolSize <= 8;

  const promotedScouts = ranked
    .slice(0, advanceCount)
    .filter((p) => p.deviceId !== myId)
    .map((p) => state.pool.scouts.find((s) => scoutDeviceId(s.id) === p.deviceId))
    .filter((s): s is ScoutPersona => !!s);

  const nextPool = seedStagePool(nextPoolSize, promotedScouts, state.usedScoutIds);
  const usedScoutIds = Array.from(new Set([...state.usedScoutIds, ...nextPool.scouts.map((s) => s.id)]));

  patch({
    status: isFinal ? 'final' : 'knockout',
    currentStage: newStage,
    pool: nextPool,
    myPoolId: nextPool.poolId,
    usedScoutIds,
  });

  return { promoted: true, placed: false, placement: null, rewardKeys: 0 };
}

export function claimLocalTournamentReward(): number {
  if (state.myStatus !== 'placed' || state.myRewardKeys <= 0 || state.myClaimed) return 0;
  patch({ myClaimed: true });
  return state.myRewardKeys;
}

export function stopLocalScoutTournament(): void {
  state = { ...initialState };
  emit();
}
