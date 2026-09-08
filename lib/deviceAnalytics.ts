import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getDeviceId, getDevicePlatform } from '@/lib/deviceId';
import { getKeysState } from '@/lib/keys';

const EMAIL_STORAGE_KEY = '@play/user_email';
const QUEUE_STORAGE_KEY = '@play/device_events_queue';

type DeviceEventType =
  | 'landing_page_seen'
  | 'topic_loading_started'
  | 'session_started'
  | 'topic_complete'
  | 'paywall_seen';

// topic_loading_started deliberately has no counter column on play_devices
// -- it's a funnel/timeline signal for play_device_events, not a running
// total anyone needs at-a-glance the way landing/session/topic counts are.
const COUNT_COLUMN: Partial<Record<DeviceEventType, string>> = {
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

// A checkpoint captured while offline (or that otherwise failed to write),
// queued to AsyncStorage for a later flush. Carries everything
// writeCheckpoint needs to replay the write once connectivity is back --
// the device/key-balance snapshot is re-read fresh at flush time (not
// stored here), same as a live call would, so a queued event reflects the
// balance/email present at flush time, not at capture time.
interface QueuedCheckpoint {
  eventType: DeviceEventType;
  options: CheckpointOptions;
  queuedAt: string;
}

async function readQueue(): Promise<QueuedCheckpoint[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedCheckpoint[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedCheckpoint[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

async function enqueue(eventType: DeviceEventType, options: CheckpointOptions): Promise<void> {
  const queue = await readQueue();
  queue.push({ eventType, options, queuedAt: new Date().toISOString() });
  await writeQueue(queue);
}

// The actual Supabase write, shared by both the live path (recordCheckpoint)
// and the queue-replay path (flushQueuedDeviceEvents). Throws on failure --
// unlike the old single-function version, this one doesn't swallow errors
// itself, so each caller can decide what "failed" means for it: the live
// path queues on failure, the flush path leaves the item queued and moves
// on to the next one instead of losing the whole batch to one bad item.
async function writeCheckpoint(eventType: DeviceEventType, options: CheckpointOptions): Promise<void> {
  const [deviceId, keysState, email] = await Promise.all([
    getDeviceId(),
    getKeysState(),
    AsyncStorage.getItem(EMAIL_STORAGE_KEY),
  ]);

  const keyBalance = keysState.isPremium ? 999999 : keysState.balance;
  const now = new Date().toISOString();
  const countColumn = COUNT_COLUMN[eventType];

  let nextCount: number | undefined;
  if (countColumn) {
    const { data: existing } = await supabase
      .from('play_devices')
      .select(countColumn)
      .eq('device_id', deviceId)
      .maybeSingle<Record<string, number>>();
    nextCount = (existing?.[countColumn] ?? 0) + 1;
  }

  const { error: upsertError } = await supabase.from('play_devices').upsert(
    {
      device_id: deviceId,
      platform: getDevicePlatform(),
      last_seen_at: now,
      ...(countColumn && nextCount !== undefined ? { [countColumn]: nextCount } : {}),
      key_balance: keyBalance,
      is_premium: !!keysState.isPremium,
      ...(options.skillId ? { last_skill_id: options.skillId } : {}),
      ...(options.track ? { last_track: options.track } : {}),
      ...(email ? { email } : {}),
      updated_at: now,
    },
    { onConflict: 'device_id' },
  );
  if (upsertError) throw upsertError;

  const { error: insertError } = await supabase.from('play_device_events').insert({
    device_id: deviceId,
    event_type: eventType,
    skill_id: options.skillId ?? null,
    track: options.track ?? null,
    topic_index: options.topicIndex ?? null,
    questions_answered: options.questionsAnswered ?? null,
    questions_missed: options.questionsMissed ?? null,
    key_balance: keyBalance,
  });
  if (insertError) throw insertError;
}

// Fire-and-forget checkpoint: tries the write immediately; if it fails
// (offline, flaky connection, a dropped request, etc.) the event is
// queued to AsyncStorage instead of being silently dropped, and gets
// replayed by flushQueuedDeviceEvents() on the next reconnect. Same
// read/apply/write shape every other sync*ToCloud() in this app uses --
// a flaky connection never blocks gameplay, and now it doesn't silently
// lose the event either.
async function recordCheckpoint(
  eventType: DeviceEventType,
  options: CheckpointOptions = {},
): Promise<void> {
  try {
    await writeCheckpoint(eventType, options);
  } catch {
    await enqueue(eventType, options);
  }
}

// Replays every queued checkpoint in capture order. Each item is removed
// from the queue only once its write actually succeeds -- a failed item
// (still offline, or a real error) stays queued for the next flush rather
// than being dropped. Wired into the same offline->online transition
// listener that already drives initAutoBackupOnReconnect() (app/_layout.tsx),
// so device-analytics events and the mistakes/progress/XP/streak/keys
// backup flush on the same reconnect signal.
export async function flushQueuedDeviceEvents(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  const remaining: QueuedCheckpoint[] = [];
  for (const item of queue) {
    try {
      await writeCheckpoint(item.eventType, item.options);
    } catch {
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
}

// Called right when a payment succeeds (lib/billing.ts) or an account is
// signed in/restored (lib/restore.ts). Unlike the email field getting
// carried along inside recordCheckpoint -- which only happens on the
// *next* landing/session/topic event -- this upserts play_devices.email
// immediately, so the device<->email link doesn't depend on another
// checkpoint firing afterward.
//
// Also the reconciliation moment for Gap 3 (docs/sync-gaps-fix-plan.md):
// everything this device holds locally (mistakes, progress, XP, streak,
// keys) was device-keyed and syncing fine on its own, but nothing had
// ever pushed it specifically *under this email* until now -- an
// anonymous learner who plays for a while and then signs up would
// otherwise have their pre-signup activity stranded, visible only by
// device_id, never joined to the account they just created. Fire-and-
// forget, same fail-silently shape as every other sync call in this file
// -- never blocks the sign-in/purchase flow that called this.
export async function linkDeviceToEmail(email: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await supabase.from('play_devices').upsert(
      { device_id: deviceId, email, updated_at: new Date().toISOString() },
      { onConflict: 'device_id' },
    );
  } catch {}

  try {
    const { runManualBackup } = await import('@/lib/backup');
    void runManualBackup();
  } catch {}
}

export async function trackLandingPageSeen(): Promise<void> {
  await recordCheckpoint('landing_page_seen');
}

// Fires the moment a topic's loading/download screen appears -- the
// bouncing-dots moment, before the questions have actually arrived. See
// docs/device-tracking-plan.md's Phase 2 discussion: this is the
// checkpoint that turns "landed on homepage, then nothing" into a
// distinguishable "landed, tapped a topic, and bounced during load"
// signal, instead of both cases looking identical in play_device_events.
export async function trackTopicLoadingStarted(skillId: string, track: string): Promise<void> {
  await recordCheckpoint('topic_loading_started', { skillId, track });
}

export async function trackSessionStarted(skillId: string, track: string): Promise<void> {
  await recordCheckpoint('session_started', { skillId, track });
}

// Fires the moment a learner is blocked by the keys/premium paywall --
// either the first-look pack_20 upsell (KeysOfferScreen) or the full
// "Other ways to Proceed" screen it falls back to (SessionStateScreen
// kind="outOfKeys"), whether the cause is an exhausted key balance or an
// unreset free-trial timer. `topicIndex` doubles as the entry/advance
// distinction: null means blocked before starting anything this session
// (entry), a number means blocked mid-track moving into that topic index
// (advance) -- avoids a schema change for a dedicated reason column.
export async function trackPaywallSeen(
  skillId: string,
  track: string,
  topicIndex: number | null,
): Promise<void> {
  await recordCheckpoint('paywall_seen', {
    skillId,
    track,
    ...(topicIndex !== null ? { topicIndex } : {}),
  });
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
