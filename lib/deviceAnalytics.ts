import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getDeviceId, getDevicePlatform } from '@/lib/deviceId';
import { getKeysState } from '@/lib/keys';

const EMAIL_STORAGE_KEY = '@play/user_email';

type DeviceEventType = 'landing_page_seen' | 'session_started' | 'topic_complete';

const COUNT_COLUMN: Record<DeviceEventType, string> = {
  landing_page_seen: 'landing_views_count',
  session_started: 'sessions_count',
  topic_complete: 'topics_completed_count',
};

interface CheckpointOptions {
  skillId?: string;
  track?: string;
  topicIndex?: number;
  questionsAnswered?: number;
  questionsMissed?: number;
}

// Fire-and-forget checkpoint: upserts play_devices' running counters +
// last-seen/skill/track/balance snapshot, then appends one
// play_device_events row. Same read/apply/write + swallow-errors shape
// every other sync*ToCloud() in this app already uses (keys.ts, xp.ts,
// streak.ts) -- a flaky connection never blocks gameplay.
async function recordCheckpoint(
  eventType: DeviceEventType,
  options: CheckpointOptions = {},
): Promise<void> {
  try {
    const [deviceId, keysState, email] = await Promise.all([
      getDeviceId(),
      getKeysState(),
      AsyncStorage.getItem(EMAIL_STORAGE_KEY),
    ]);

    const keyBalance = keysState.isPremium ? 999999 : keysState.balance;
    const now = new Date().toISOString();
    const countColumn = COUNT_COLUMN[eventType];

    const { data: existing } = await supabase
      .from('play_devices')
      .select(countColumn)
      .eq('device_id', deviceId)
      .maybeSingle<Record<string, number>>();

    const nextCount = (existing?.[countColumn] ?? 0) + 1;

    await supabase.from('play_devices').upsert(
      {
        device_id: deviceId,
        platform: getDevicePlatform(),
        last_seen_at: now,
        [countColumn]: nextCount,
        key_balance: keyBalance,
        is_premium: !!keysState.isPremium,
        ...(options.skillId ? { last_skill_id: options.skillId } : {}),
        ...(options.track ? { last_track: options.track } : {}),
        ...(email ? { email } : {}),
        updated_at: now,
      },
      { onConflict: 'device_id' },
    );

    await supabase.from('play_device_events').insert({
      device_id: deviceId,
      event_type: eventType,
      skill_id: options.skillId ?? null,
      track: options.track ?? null,
      topic_index: options.topicIndex ?? null,
      questions_answered: options.questionsAnswered ?? null,
      questions_missed: options.questionsMissed ?? null,
      key_balance: keyBalance,
    });
  } catch {}
}

// Direct join, called right when a payment succeeds (see lib/billing.ts).
// Unlike the email field getting carried along inside recordCheckpoint --
// which only happens on the *next* landing/session/topic event -- this
// upserts play_devices.email immediately, so the device<->email link
// doesn't depend on another checkpoint firing afterward.
export async function linkDeviceToEmail(email: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await supabase.from('play_devices').upsert(
      { device_id: deviceId, email, updated_at: new Date().toISOString() },
      { onConflict: 'device_id' },
    );
  } catch {}
}

export async function trackLandingPageSeen(): Promise<void> {
  await recordCheckpoint('landing_page_seen');
}

export async function trackSessionStarted(skillId: string, track: string): Promise<void> {
  await recordCheckpoint('session_started', { skillId, track });
}

export async function trackTopicComplete(
  skillId: string,
  track: string,
  topicIndex: number,
  stats: { correctCount: number; totalAnswered: number },
): Promise<void> {
  await recordCheckpoint('topic_complete', {
    skillId,
    track,
    topicIndex,
    questionsAnswered: stats.totalAnswered,
    questionsMissed: Math.max(0, stats.totalAnswered - stats.correctCount),
  });
}
