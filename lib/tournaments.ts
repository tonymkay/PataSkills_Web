/**
 * Play tournaments — device-id RPCs on play_* tables.
 * Mirrors lib/challenges.ts: play_-prefixed RPCs, device-identity,
 * best-effort reads, throwing writes.
 *
 * Lifecycle: group_stage → knockout (0+ rounds) → final → ended.
 * getTournamentState() lazily ticks play_advance_tournament_stage on
 * every poll — same lazy-expiry pattern as challenge_state, no cron needed.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import { grantBonusKey } from '@/lib/keys';
import { getCachedTitle } from '@/lib/curriculaCatalog';
import { pickHeadlineTopicTitle } from '@/lib/challengeScoutTournamentSession';

export type TournamentTier = 'small' | 'mid' | 'large';
export type TournamentStatus = 'group_stage' | 'knockout' | 'final' | 'ended' | 'cancelled';
export type TournamentMemberStatus = 'active' | 'eliminated' | 'placed';

export interface TournamentState {
  tournamentId: string;
  status: TournamentStatus;
  tier: TournamentTier;
  currentStage: number;
  stageCount: number;
  curriculumSlug: string;
  myStatus: TournamentMemberStatus;
  myPlacement: number | null;
  myRewardKeys: number;
  myClaimed: boolean;
  targetText: string;
  promotedCount: number;
  promotedPhotos: string[];
  fieldSize: number;
  fieldPhotos: string[];
  topicTitle: string | null;
  curriculumTitle: string | null;
}

export interface TournamentStageState {
  challengeId: string;
  targetSize: number;
  joinedCount: number;
  status: string;
  hostDeviceId: string | null;
  memberPhotos: string[];
  memberDeviceIds: string[];
  memberNames: string[];
}

const toDate = (v: unknown): Date | null => (v ? new Date(String(v)) : null);

/**
 * Create a tournament. p_source_challenge_id is the just-finished Global
 * challenge — omit for a pure Scout-sourced ("vs bots") tournament.
 * scoutIds/scoutNames fill the field alongside this device.
 */
export async function createTournament(opts: {
  curriculumSlug: string;
  sourceChallengeId?: string | null;
  scoutIds?: string[];
  scoutNames?: string[];
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const deviceId = await getDeviceId();
  const curriculumTitle = getCachedTitle(opts.curriculumSlug) ?? opts.curriculumSlug;
  const topicTitle = await pickHeadlineTopicTitle(opts.curriculumSlug, curriculumTitle);
  const { data, error } = await supabase.rpc('play_create_tournament', {
    p_device_id: deviceId,
    p_curriculum_slug: opts.curriculumSlug,
    p_source_challenge_id: opts.sourceChallengeId ?? null,
    p_scout_ids: opts.scoutIds ?? [],
    p_scout_names: opts.scoutNames ?? [],
    p_topic_title: topicTitle,
    p_curriculum_title: curriculumTitle,
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

/** Lookup fallback for createTournament()'s "already exists" race. */
export async function findTournamentByChallenge(sourceChallengeId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc('play_find_tournament_by_challenge', {
      p_source_challenge_id: sourceChallengeId,
    });
    if (error) return null;
    return (data as string | null) ?? null;
  } catch {
    return null;
  }
}

/** Join the current stage's single shared pool. */
export async function joinTournament(
  tournamentId: string,
): Promise<'joined' | 'already' | 'ineligible'> {
  if (!isSupabaseConfigured) return 'ineligible';
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('play_join_tournament', {
    p_device_id: deviceId,
    p_tournament_id: tournamentId,
  });
  if (error) throw new Error(error.message);
  return (data as 'joined' | 'already' | 'ineligible') ?? 'ineligible';
}

/** Story-shell poll — lazily advances the bracket server-side on every call. */
export async function getTournamentState(tournamentId: string): Promise<TournamentState | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const deviceId = await getDeviceId();
    const { data } = await supabase.rpc('play_tournament_state', {
      p_device_id: deviceId,
      p_tournament_id: tournamentId,
    });
    const row = ((data ?? []) as Record<string, unknown>[])[0];
    if (!row) return null;
    return {
      tournamentId: String(row.tournament_id),
      status: (row.status as TournamentStatus) ?? 'group_stage',
      tier: (row.tier as TournamentTier) ?? 'small',
      currentStage: (row.current_stage as number | null) ?? 1,
      stageCount: (row.stage_count as number | null) ?? 1,
      curriculumSlug: String(row.curriculum_slug ?? ''),
      myStatus: (row.my_status as TournamentMemberStatus) ?? 'active',
      myPlacement: (row.my_placement as number | null) ?? null,
      myRewardKeys: (row.my_reward_keys as number | null) ?? 0,
      myClaimed: Boolean(row.my_claimed),
      targetText: String(row.target_text ?? ''),
      promotedCount: (row.promoted_count as number | null) ?? 0,
      promotedPhotos: Array.isArray(row.promoted_photos) ? (row.promoted_photos as string[]) : [],
      fieldSize: (row.field_size as number | null) ?? 0,
      fieldPhotos: Array.isArray(row.field_photos) ? (row.field_photos as string[]) : [],
      topicTitle: (row.topic_title as string | null) ?? null,
      curriculumTitle: (row.curriculum_title as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Waiting-room poll — the current stage's single shared-pool challenge. */
export async function getTournamentStageState(tournamentId: string): Promise<TournamentStageState | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.rpc('play_tournament_stage_state', { p_tournament_id: tournamentId });
    const row = ((data ?? []) as Record<string, unknown>[])[0];
    if (!row) return null;
    return {
      challengeId: String(row.challenge_id),
      targetSize: (row.target_size as number | null) ?? 0,
      joinedCount: (row.joined_count as number | null) ?? 0,
      status: String(row.status ?? 'waiting'),
      hostDeviceId: (row.host_device_id as string | null) ?? null,
      memberPhotos: Array.isArray(row.member_photos) ? (row.member_photos as string[]) : [],
      memberDeviceIds: Array.isArray(row.member_device_ids) ? (row.member_device_ids as string[]) : [],
      memberNames: Array.isArray(row.member_names) ? (row.member_names as string[]) : [],
    };
  } catch {
    return null;
  }
}

/** Tick the bracket forward after a stage ends. Best-effort —
 *  getTournamentState() lazily ticks this anyway on the next poll. */
export async function advanceTournamentStage(tournamentId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.rpc('play_advance_tournament_stage', { p_tournament_id: tournamentId });
  } catch {
    // best-effort
  }
}

/** Claim podium keys (0 = nothing to claim). Grants locally on success. */
export async function claimTournamentReward(tournamentId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  try {
    const deviceId = await getDeviceId();
    const { data, error } = await supabase.rpc('play_claim_tournament_reward', {
      p_device_id: deviceId,
      p_tournament_id: tournamentId,
    });
    const keys = typeof data === 'number' ? data : 0;
    if (error || keys <= 0) return 0;
    await grantBonusKey(keys, 'tournament_reward_online', tournamentId);
    return keys;
  } catch {
    return 0;
  }
}
