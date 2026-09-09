import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getStoredEmail } from '@/lib/email';
import { pushAllMistakesToCloud } from '@/lib/mistakes';
import { pushAllProgressToCloud } from '@/lib/progress';
import { pushXpToCloud } from '@/lib/xp';
import { pushStreakToCloud, type StreakPushStatus } from '@/lib/streak';
import { pushKeysToCloud } from '@/lib/keys';
import { flushQueuedDeviceEvents } from '@/lib/deviceAnalytics';

export interface BackupResult {
  hasEmail: boolean;
  mistakesPushed: number;
  mistakesTotal: number;
  progressSkillsPushed: number;
  progressSkillsFound: number;
  xpSynced: boolean;
  streakStatus: StreakPushStatus;
  keysSynced: boolean;
}

/**
 * Discovers every skillId this device has local progress data for, by
 * scanning AsyncStorage keys rather than relying on any fixed catalog list
 * — catches skills whose curriculum row has since been removed/renamed too.
 */
async function discoverLocalSkillIds(): Promise<string[]> {
  let keys: readonly string[] = [];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    return [];
  }
  const prefix = '@play/progress:';
  const ids = keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
  return Array.from(new Set(ids));
}

/**
 * Manual "Backup now" entry point — Settings screen only. Force-pushes
 * everything this device holds locally (mistakes, progress, XP, streak,
 * keys) straight to Supabase, regardless of whether the automatic
 * record-time sync for any of it actually succeeded. This exists because
 * "the deployed build was stale" or "record-time sync silently failed" are
 * real, recurring failure modes here — not deploy status, not whether an
 * email is linked. Mistakes, progress, XP, and streak all push device-only
 * now — see docs/sync-gaps-fix-plan.md Gaps 1 and 3. Only keys still needs
 * a linked email (play_accounts is email-keyed by design — it's the
 * account balance, not a per-device stat).
 */
export async function runManualBackup(): Promise<BackupResult> {
  const email = await getStoredEmail();
  const skillIds = await discoverLocalSkillIds();

  const [mistakesResult, progressPushed, xpSynced, streakStatus, keysSynced] = await Promise.all([
    pushAllMistakesToCloud(),
    pushAllProgressToCloud(email, skillIds),
    pushXpToCloud(),
    pushStreakToCloud(),
    pushKeysToCloud(),
  ]);

  return {
    hasEmail: !!email,
    mistakesPushed: mistakesResult.pushed,
    mistakesTotal: mistakesResult.total,
    progressSkillsPushed: progressPushed,
    progressSkillsFound: skillIds.length,
    xpSynced,
    streakStatus,
    keysSynced,
  };
}

const LAST_AUTO_BACKUP_KEY = '@play/last_auto_backup_at';
// Skip an auto-flush if the last one landed under this long ago — a flaky
// connection can flap online/offline repeatedly within seconds, and this
// keeps that from hammering Supabase with a full backup every time.
const AUTO_BACKUP_THROTTLE_MS = 2 * 60 * 1000;

async function maybeAutoBackup(): Promise<void> {
  try {
    const lastRaw = await AsyncStorage.getItem(LAST_AUTO_BACKUP_KEY);
    const last = lastRaw ? parseInt(lastRaw, 10) : 0;
    if (Date.now() - last < AUTO_BACKUP_THROTTLE_MS) return;
    await AsyncStorage.setItem(LAST_AUTO_BACKUP_KEY, String(Date.now()));
    await runManualBackup();
  } catch {}
}

// Unlike maybeAutoBackup(), queued device-analytics checkpoints (device
// tracking plan, Phase 2) aren't throttled -- they're a small, bounded
// queue of events that failed to write live, not a full re-push of every
// local data category, so there's no cost concern to rate-limiting here.
// Runs on every reconnect + once on launch, same as maybeAutoBackup.
async function maybeFlushDeviceEvents(): Promise<void> {
  try {
    await flushQueuedDeviceEvents();
  } catch {}
}

/**
 * Gap 2 (docs/sync-gaps-fix-plan.md) — the previous gap: every sync in this
 * app fires once, at the moment a local action happens, and simply drops
 * if the device is offline right then; nothing retried it until either
 * another qualifying action happened while online, or the person manually
 * tapped "Back up now." This is the actual "does it submit when I go
 * online" answer: called once from app/_layout.tsx on launch, it (a) does
 * one throttled flush immediately — covers a device that was offline last
 * session and is opened while already back online — and (b) watches for
 * the offline→online transition for as long as the app stays open, firing
 * the same throttled flush each time. Silent by design (no Alert) — this
 * is the background path; "Back up now" in Settings stays the only one
 * that reports results to the person.
 */
export function initAutoBackupOnReconnect(): () => void {
  void maybeAutoBackup();
  void maybeFlushDeviceEvents();

  let wasOffline = false;
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = !!state.isConnected && state.isInternetReachable !== false;
    if (!isOnline) {
      wasOffline = true;
      return;
    }
    if (wasOffline) {
      wasOffline = false;
      void maybeAutoBackup();
      void maybeFlushDeviceEvents();
    }
  });

  return unsubscribe;
}
