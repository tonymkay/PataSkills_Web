import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const PROGRESS_STORAGE_KEY = '@play/progress';
const EMAIL_STORAGE_KEY = '@play/user_email';

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
 * Gets the current progress from AsyncStorage.
 */
export async function getLocalProgress(): Promise<ProgressState> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ProgressState;
    }
  } catch {}
  return DEFAULT_PROGRESS;
}

/**
 * Marks a topic index as completed when the user hits topicComplete screen.
 */
export async function markTopicCompleted(
  topicIndex: number,
  totalTopics: number = 46
): Promise<ProgressState> {
  const current = await getLocalProgress();
  const nextCompleted = Math.max(current.completedTopics, topicIndex + 1);

  const updated: ProgressState = {
    completedTopics: nextCompleted,
    totalTopics: Math.max(current.totalTopics, totalTopics),
    lastUpdated: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
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
 * Restores cloud progress from Supabase for a given email.
 */
export async function syncProgressWithCloud(email: string): Promise<ProgressState> {
  try {
    const { data, error } = await supabase
      .from('play_progress')
      .select('completed_topics, total_topics, updated_at')
      .eq('email', email)
      .single();

    if (!error && data) {
      const local = await getLocalProgress();
      const mergedCompleted = Math.max(local.completedTopics, data.completed_topics || 0);
      const merged: ProgressState = {
        completedTopics: mergedCompleted,
        totalTopics: data.total_topics || 34,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {}

  return await getLocalProgress();
}
