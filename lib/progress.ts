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
  } catch {}

  // Sync to Supabase if email is known
  try {
    const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
    if (email) {
      await supabase.from('play_progress').upsert(
        {
          email,
          completed_topics: updated.completedTopics,
          total_topics: updated.totalTopics,
          updated_at: updated.lastUpdated,
        },
        { onConflict: 'email' }
      );
    }
  } catch {}

  return updated;
}

/**
 * Restores cloud progress from Supabase for a given email, merged into the
 * given skill's local bucket. Note: `play_progress` doesn't currently exist
 * as a Supabase table (confirmed via a PGRST205 error), so this silently
 * no-ops today — kept scoped per-skill so it's correct the moment that
 * table (and a skill column on it) gets added.
 */
export async function syncProgressWithCloud(
  email: string,
  skillId: CurriculumSlug | string = LEGACY_UNSCOPED_BUCKET
): Promise<ProgressState> {
  try {
    const { data, error } = await supabase
      .from('play_progress')
      .select('completed_topics, total_topics, updated_at')
      .eq('email', email)
      .single();

    if (!error && data) {
      const local = await getLocalProgress(skillId);
      const mergedCompleted = Math.max(local.completedTopics, data.completed_topics || 0);
      const merged: ProgressState = {
        completedTopics: mergedCompleted,
        totalTopics: data.total_topics || 34,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(progressStorageKey(skillId), JSON.stringify(merged));
      return merged;
    }
  } catch {}

  return await getLocalProgress(skillId);
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

  return updated;
}
