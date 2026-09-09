/**
 * Play online challenges — device-id RPCs on play_* tables.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import { grantBonusKey } from '@/lib/keys';

export type ChallengeStatus = 'waiting' | 'running' | 'ended' | 'expired' | 'cancelled';
export type ChallengeMemberStatus = 'invited' | 'joined' | 'declined' | 'removed';

export interface ChallengeStory {
  challengeId: string;
  curriculumSlug: string;
  targetTopicCount: number | null;
  seed: number;
  questionCount: number;
  isGlobal: boolean;
  isTournament: boolean;
  status: ChallengeStatus;
  myStatus: ChallengeMemberStatus;
  isCreator: boolean;
  invitedByName: string | null;
  joinedCount: number;
  memberCount: number;
  deadlineAt: Date | null;
  startedAt: Date | null;
  invitedAt: Date | null;
  endedAt: Date | null;
  myFinished: boolean;
  myRewardKeys: number;
  myClaimed: boolean;
  /** Only populated for the creator's own device — the code they can share
   *  so friends can join via joinChallengeByCode(). Null for everyone else
   *  and for challenges that predate the invite-code migration. */
  inviteCode: string | null;
}

export interface ChallengeMember {
  deviceId: string;
  displayName: string | null;
  photoUrl: string | null;
  status: ChallengeMemberStatus;
}

export interface ChallengeState {
  status: ChallengeStatus;
  startedAt: Date | null;
  firstFinishedAt: Date | null;
  firstResultsAt: Date | null;
  endedAt: Date | null;
  joinedCount: number;
  finishedCount: number;
  players: {
    deviceId: string | null;
    displayName: string | null;
    photoUrl: string | null;
    finishedAt: Date | null;
    timeMs: number | null;
    score: number | null;
    total: number | null;
    rewardKeys: number;
    currentQuestionIndex: number;
  }[];
}

export interface OpenGlobalChallenge {
  challengeId: string;
  curriculumSlug: string;
  creatorName: string | null;
  joinedCount: number;
  deadlineAt: Date | null;
}

const toDate = (v: unknown): Date | null => (v ? new Date(String(v)) : null);

export async function createChallenge(opts: {
  curriculumSlug: string;
  targetTopicCount?: number | null;
  isGlobal?: boolean;
  deadlineAt?: Date | null;
  displayName?: string;
}): Promise<{ challengeId: string; inviteCode: string | null } | null> {
  if (!isSupabaseConfigured) return null;
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('play_create_challenge', {
    p_device_id: deviceId,
    p_curriculum_slug: opts.curriculumSlug,
    p_target: opts.targetTopicCount ?? null,
    p_is_global: opts.isGlobal ?? false,
    p_deadline: opts.deadlineAt?.toISOString() ?? null,
    p_display_name: opts.displayName ?? 'You',
  });
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row?.challenge_id) return null;
  return {
    challengeId: String(row.challenge_id),
    inviteCode: (row.invite_code as string | null) ?? null,
  };
}

export type JoinChallengeByCodeResult = 'joined' | 'started' | 'already' | 'not_found' | 'ineligible';

/** Redeems a private-challenge invite code — the friend-invite counterpart
 *  to joinTournamentByCode(). On 'joined'/'started'/'already' the
 *  challengeId is real and the caller should route into the waiting room
 *  (challenge-online.tsx with a challengeId param) with it. */
export async function joinChallengeByCode(
  code: string,
  displayName = 'You',
): Promise<{ result: JoinChallengeByCodeResult; challengeId: string | null }> {
  if (!isSupabaseConfigured) return { result: 'not_found', challengeId: null };
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('play_join_challenge_by_code', {
    p_device_id: deviceId,
    p_code: code,
    p_display_name: displayName,
  });
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return { result: 'not_found', challengeId: null };
  return {
    result: (row.result as JoinChallengeByCodeResult) ?? 'not_found',
    challengeId: row.challenge_id ? String(row.challenge_id) : null,
  };
}

/** Creator-only — cancels a still-waiting challenge for every member. */
export async function cancelChallenge(challengeId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('play_cancel_challenge', {
    p_device_id: deviceId,
    p_id: challengeId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getMyChallengeStories(): Promise<ChallengeStory[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const deviceId = await getDeviceId();
    const { data } = await supabase.rpc('play_my_challenge_stories', { p_device_id: deviceId });
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      challengeId: String(r.challenge_id),
      curriculumSlug: String(r.curriculum_slug ?? ''),
      targetTopicCount: (r.target_topic_count as number | null) ?? null,
      seed: (r.seed as number | null) ?? 0,
      questionCount: (r.question_count as number | null) ?? 10,
      isGlobal: Boolean(r.is_global),
      isTournament: Boolean(r.is_tournament),
      status: (r.status as ChallengeStatus) ?? 'waiting',
      myStatus: (r.my_status as ChallengeMemberStatus) ?? 'invited',
      isCreator: Boolean(r.is_creator),
      invitedByName: (r.invited_by_name as string | null) ?? null,
      joinedCount: (r.joined_count as number | null) ?? 0,
      memberCount: (r.member_count as number | null) ?? 0,
      deadlineAt: toDate(r.deadline_at),
      startedAt: toDate(r.started_at),
      invitedAt: toDate(r.invited_at),
      endedAt: toDate(r.ended_at),
      myFinished: Boolean(r.my_finished),
      myRewardKeys: (r.my_reward_keys as number | null) ?? 0,
      myClaimed: Boolean(r.my_claimed),
      inviteCode: (r.invite_code as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function joinGlobalChallenge(challengeId: string, displayName = 'You'): Promise<'joined' | 'started' | 'closed'> {
  if (!isSupabaseConfigured) return 'closed';
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('play_join_global_challenge', {
    p_device_id: deviceId,
    p_id: challengeId,
    p_display_name: displayName,
  });
  if (error) throw new Error(error.message);
  return (data as 'joined' | 'started' | 'closed') ?? 'closed';
}

export async function startChallenge(challengeId: string): Promise<ChallengeState | null> {
  if (!isSupabaseConfigured) return null;
  const deviceId = await getDeviceId();
  const { error } = await supabase.rpc('play_start_challenge', {
    p_device_id: deviceId,
    p_id: challengeId,
  });
  if (error) throw new Error(error.message);
  return getChallengeState(challengeId);
}

export async function leaveChallenge(challengeId: string): Promise<'left' | 'cancelled'> {
  if (!isSupabaseConfigured) return 'left';
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('play_leave_challenge', {
    p_device_id: deviceId,
    p_id: challengeId,
  });
  if (error) throw new Error(error.message);
  return (data as 'left' | 'cancelled') ?? 'left';
}

export async function markChallengeAbsent(challengeId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const deviceId = await getDeviceId();
    const { data } = await supabase.rpc('play_mark_challenge_absent', {
      p_device_id: deviceId,
      p_id: challengeId,
    });
    return Boolean(data);
  } catch {
    return false;
  }
}

export function subscribeToChallengeStatus(challengeId: string, onRunning: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  const channel = supabase
    .channel(`play_challenge_status_${challengeId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'play_challenges', filter: `id=eq.${challengeId}` },
      (payload) => {
        if ((payload.new as { status?: string } | null)?.status === 'running') onRunning();
      },
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function submitChallengeResult(
  challengeId: string,
  result: { timeMs: number; score: number; total: number },
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const deviceId = await getDeviceId();
  const { error } = await supabase.rpc('play_submit_challenge_result', {
    p_device_id: deviceId,
    p_id: challengeId,
    p_time_ms: Math.max(0, Math.round(result.timeMs)),
    p_score: result.score,
    p_total: result.total,
  });
  if (error) throw new Error(error.message);
}

export async function updateChallengeProgress(challengeId: string, questionIndex: number): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const deviceId = await getDeviceId();
    await supabase.rpc('play_update_challenge_progress', {
      p_device_id: deviceId,
      p_id: challengeId,
      p_index: questionIndex,
    });
  } catch { /* best-effort */ }
}

export async function markChallengeResultsViewed(challengeId: string): Promise<Date | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const deviceId = await getDeviceId();
    const { data } = await supabase.rpc('play_mark_challenge_results_viewed', {
      p_device_id: deviceId,
      p_id: challengeId,
    });
    return data ? new Date(String(data)) : null;
  } catch {
    return null;
  }
}

export async function endChallenge(challengeId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const deviceId = await getDeviceId();
  const { error } = await supabase.rpc('play_end_challenge', {
    p_device_id: deviceId,
    p_id: challengeId,
  });
  if (error) throw new Error(error.message);
}

export async function claimChallengeReward(challengeId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  try {
    const deviceId = await getDeviceId();
    const { data, error } = await supabase.rpc('play_claim_challenge_reward', {
      p_device_id: deviceId,
      p_id: challengeId,
    });
    const keys = typeof data === 'number' ? data : 0;
    if (error || keys <= 0) return 0;
    await grantBonusKey(keys, 'challenge_reward_online', challengeId);
    return keys;
  } catch {
    return 0;
  }
}

export async function getChallengeMembers(challengeId: string): Promise<ChallengeMember[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const deviceId = await getDeviceId();
    const { data } = await supabase.rpc('play_challenge_members_list', {
      p_device_id: deviceId,
      p_id: challengeId,
    });
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      deviceId: String(r.device_id ?? ''),
      displayName: (r.display_name as string | null) ?? null,
      photoUrl: (r.photo_url as string | null) ?? null,
      status: (r.status as ChallengeMemberStatus) ?? 'invited',
    }));
  } catch {
    return [];
  }
}

export async function getChallengeState(challengeId: string): Promise<ChallengeState | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.rpc('play_challenge_state', { p_id: challengeId });
    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return null;
    const head = rows[0];
    return {
      status: (head.status as ChallengeStatus) ?? 'waiting',
      startedAt: toDate(head.started_at),
      firstFinishedAt: toDate(head.first_finished_at),
      firstResultsAt: toDate(head.first_results_at),
      endedAt: toDate(head.ended_at),
      joinedCount: (head.joined_count as number | null) ?? 0,
      finishedCount: (head.finished_count as number | null) ?? 0,
      players: rows.filter((r) => r.device_id !== null).map((r) => ({
        deviceId: (r.device_id as string | null) ?? null,
        displayName: (r.display_name as string | null) ?? null,
        photoUrl: (r.photo_url as string | null) ?? null,
        finishedAt: toDate(r.finished_at),
        timeMs: (r.time_ms as number | null) ?? null,
        score: (r.score as number | null) ?? null,
        total: (r.total as number | null) ?? null,
        rewardKeys: (r.reward_keys as number | null) ?? 0,
        currentQuestionIndex: (r.current_question_index as number | null) ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

export async function getOpenGlobalChallenges(): Promise<OpenGlobalChallenge[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const deviceId = await getDeviceId();
    const { data } = await supabase.rpc('play_open_global_challenges', { p_device_id: deviceId });
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      challengeId: String(r.challenge_id),
      curriculumSlug: String(r.curriculum_slug ?? ''),
      creatorName: (r.creator_name as string | null) ?? null,
      joinedCount: (r.joined_count as number | null) ?? 0,
      deadlineAt: toDate(r.deadline_at),
    }));
  } catch {
    return [];
  }
}
