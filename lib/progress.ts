import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Track } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

const EMAIL_STORAGE_KEY = '@play/user_email';

// Both storage keys below are scoped per skill. Track ids like 'full' and
// 'reading' are reused across every skill's curriculum (true-false and
// driving-theory both declare a 'full' track, for instance), so a single
// shared key meant finishing true-false's 'full' track marked
// driving-theory's completely different 'full' track as done too, and
// PlaySession's session-resume effect jumped a learner mid-way into one
// skill's sessions using a completedTopics count earned in another skill
// entirely. `skillId` defaults to a fixed legacy bucket only for the one
// call site (LandingScreen's no-op progress prefetch) that has no skill
// context yet and never reads the result — every real read/write below
// passes a real skillId.
const LEGACY_UNSCOPED_BUCKET = 'unscoped';

// Set once, permanently, the first time markTopicCompleted() ever fires for
// any skill -- the "hit the topicComplete screen for the very first time"
// moment. From then on the app's tabbed shell ((tabs)/_layout.tsx) is used
// instead of the single-page Skills Corner flow -- see app/index.tsx's gate.
const TABS_UNLOCKED_KEY = '@play/tabs_unlocked';

/** Whether the tabbed home shell has been unlocked yet (persists forever
 *  once true -- never re-locks). */
export async function areTabsUnlocked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TABS_UNLOCKED_KEY)) === 'true';
  } catch {
    return false;
  }
}

async function unlockTabsIfNeeded(): Promise<void> {
  try {
    const already = await AsyncStorage.getItem(TABS_UNLOCKED_KEY);
    if (already !== 'true') {
      await AsyncStorage.setItem(TABS_UNLOCKED_KEY, 'true');
    }
  } catch {}
}

function progressStorageKey(skillId: CurriculumSlug | string): string {
  return `@play/progress:${skillId}`;
}

function completedTracksStorageKey(skillId: CurriculumSlug | string): string {
  return `@play/completed_tracks:${skillId}`;
}

export interface ProgressState {
  completedTopics: number;
  totalTopics: number;
  lastUpdated: string;
}

const DEFAULT_PROGRESS: ProgressState = {
  completedTopics: 0,
  totalTopics: 46,
  lastUpdated: new Date().toISOString(),
};

/**
 * Gets the current progress from AsyncStorage, scoped to one skill.
 */
export async function getLocalProgress(
  skillId: CurriculumSlug | string = LEGACY_UNSCOPED_BUCKET
): Promise<ProgressState> {
  try {
    const raw = await AsyncStorage.getItem(progressStorageKey(skillId));
    if (raw) {
      return JSON.parse(raw) as ProgressState;
    }
  } catch {}
  return DEFAULT_PROGRESS;
}

/**
 * Marks a topic index as completed when the user hits topicComplete screen,
 * within the given skill's own progress bucket.
 */
export async function markTopicCompleted(
  skillId: CurriculumSlug | string,
  topicIndex: number,
  totalTopics: number = 46
): Promise<ProgressState> {
  const current = await getLocalProgress(skillId);
  const nextCompleted = Math.max(current.completedTopics, topicIndex + 1);

  const updated: ProgressState = {
    completedTopics: nextCompleted,
    totalTopics: Math.max(current.totalTopics, totalTopics),
    lastUpdated: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(progressStorageKey(skillId), JSON.stringify(updated));
    // Reaching this point means the learner just hit the topicComplete
    // screen for real (not merely read cached progress) -- the trigger
    // moment for unlocking the tabbed home shell, see the comment above
    // TABS_UNLOCKED_KEY. A no-op after the first call, for this skill or
    // any other.
    await unlockTabsIfNeeded();
  } catch {}

  // Sync to Supabase if email is known -- scoped by (email, skill_id) so
  // this skill's row never collides with another skill's progress for the
  // same learner (see docs/progress-restore-fix-plan.md Bug B).
  try {
    const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
    if (email) {
      const tracks = await getCompletedTracks(skillId);
      await supabase.from('play_progress').upsert(
        {
          email,
          skill_id: skillId,
          completed_topics: updated.completedTopics,
          total_topics: updated.totalTopics,
          completed_tracks: tracks,
          updated_at: updated.lastUpdated,
        },
        { onConflict: 'email,skill_id' }
      );
    }
  } catch {}

  return updated;
}

/**
 * Restores cloud progress from Supabase for a given email, merged into the
 * given skill's local bucket. Kept for callers that only care about one
 * skill (e.g. right after a purchase resumes a specific skill/track) --
 * internally just filters syncAllProgressWithCloud()'s single batched
 * fetch down to this skillId, so it never does its own extra round trip.
 */
export async function syncProgressWithCloud(
  email: string,
  skillId: CurriculumSlug | string = LEGACY_UNSCOPED_BUCKET
): Promise<ProgressState> {
  const merged = await syncAllProgressWithCloud(email, [skillId]);
  return merged[skillId] ?? (await getLocalProgress(skillId));
}

/**
 * Restores cloud progress for EVERY skill in `skillIds`, in a single
 * Supabase query (`.eq('email', ...)`, no per-skill filter) rather than
 * one round trip per skill -- this is what LandingScreen's mount effect
 * calls so auto-restore-on-launch stays at one query regardless of how
 * many skills the catalog grows to (see docs/progress-restore-fix-plan.md §5.3).
 *
 * Merge is max-wins per field, never regresses: offline-first means a
 * device that's been offline for a while and has stale-looking local
 * counters should never have its own progress erased by an older cloud
 * snapshot, and vice versa -- whichever side is further along wins, per
 * skill, per field. Completed tracks are unioned for the same reason.
 * Every Supabase call here fails silently (try/catch, same pattern as
 * deviceAnalytics.ts) -- offline just means local progress is left as-is,
 * no connectivity check needed.
 */
export async function syncAllProgressWithCloud(
  email: string,
  skillIds: (CurriculumSlug | string)[]
): Promise<Record<string, ProgressState>> {
  const results: Record<string, ProgressState> = {};

  let cloudRows: {
    skill_id: string;
    completed_topics: number;
    total_topics: number;
    completed_tracks: Track[] | null;
  }[] = [];

  try {
    const { data, error } = await supabase
      .from('play_progress')
      .select('skill_id, completed_topics, total_topics, completed_tracks')
      .eq('email', email);
    if (!error && data) cloudRows = data as typeof cloudRows;
  } catch {}

  const cloudBySkill = new Map(cloudRows.map((r) => [r.skill_id, r]));

  for (const skillId of skillIds) {
    const local = await getLocalProgress(skillId);
    const cloud = cloudBySkill.get(String(skillId));

    if (!cloud) {
      results[String(skillId)] = local;
      continue;
    }

    const merged: ProgressState = {
      completedTopics: Math.max(local.completedTopics, cloud.completed_topics || 0),
      totalTopics: Math.max(local.totalTopics, cloud.total_topics || 0) || DEFAULT_PROGRESS.totalTopics,
      lastUpdated: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem(progressStorageKey(skillId), JSON.stringify(merged));
    } catch {}
    results[String(skillId)] = merged;

    // Union completed tracks the same max-wins way -- a track finished on
    // either device stays finished.
    try {
      const localTracks = await getCompletedTracks(skillId);
      const cloudTracks = cloud.completed_tracks || [];
      const unioned = Array.from(new Set([...localTracks, ...cloudTracks]));
      if (unioned.length !== localTracks.length) {
        await AsyncStorage.setItem(completedTracksStorageKey(skillId), JSON.stringify(unioned));
      }
    } catch {}
  }

  return results;
}

/**
 * Manual "Backup now" entry point (Settings). Pushes every locally recorded
 * skill's progress straight to play_progress, regardless of whether the
 * live upsert at markTopicCompleted/markTrackCompleted time actually landed
 * — recovery path for a device that's been playing while syncing was
 * broken or the build was stale. Requires email (play_progress has no
 * device_id column — see docs/progress-restore-fix-plan.md); returns 0 if
 * none is linked. Local values win outright (no merge) since this is an
 * explicit "push what's on this device" action, not a background restore.
 */
export async function pushAllProgressToCloud(
  email: string,
  skillIds: (CurriculumSlug | string)[]
): Promise<number> {
  let pushed = 0;
  for (const skillId of skillIds) {
    try {
      const local = await getLocalProgress(skillId);
      const tracks = await getCompletedTracks(skillId);
      const { error } = await supabase.from('play_progress').upsert(
        {
          email,
          skill_id: skillId,
          completed_topics: local.completedTopics,
          total_topics: local.totalTopics,
          completed_tracks: tracks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email,skill_id' }
      );
      if (!error) pushed += 1;
    } catch {}
  }
  return pushed;
}

/**
 * Which learning-mode tracks the learner has fully exhausted (hit
 * trackComplete on), scoped to one skill. Used by ModeSwitcherSheet to show
 * a real "N/6 tracks complete" count and per-row DONE state instead of
 * hardcoded/zeroed values.
 */
export async function getCompletedTracks(
  skillId: CurriculumSlug | string = LEGACY_UNSCOPED_BUCKET
): Promise<Track[]> {
  try {
    const raw = await AsyncStorage.getItem(completedTracksStorageKey(skillId));
    if (raw) {
      return JSON.parse(raw) as Track[];
    }
  } catch {}
  return [];
}

/**
 * Marks a track as fully completed within one skill. Idempotent — calling
 * this again for a track that's already recorded is a no-op (no duplicate
 * entries, no extra AsyncStorage write).
 */
export async function markTrackCompleted(
  skillId: CurriculumSlug | string,
  track: Track
): Promise<Track[]> {
  const current = await getCompletedTracks(skillId);
  if (current.includes(track)) {
    return current;
  }

  const updated = [...current, track];
  try {
    await AsyncStorage.setItem(completedTracksStorageKey(skillId), JSON.stringify(updated));
  } catch {}

  // Sync to Supabase if email is known -- same upsert shape as
  // markTopicCompleted, so a track finished on this device is visible to
  // syncAllProgressWithCloud() on any other device without a separate table.
  try {
    const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
    if (email) {
      const progress = await getLocalProgress(skillId);
      await supabase.from('play_progress').upsert(
        {
          email,
          skill_id: skillId,
          completed_topics: progress.completedTopics,
          total_topics: progress.totalTopics,
          completed_tracks: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email,skill_id' }
      );
    }
  } catch {}

  return updated;
}
