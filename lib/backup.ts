import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredEmail } from '@/lib/email';
import { pushAllMistakesToCloud } from '@/lib/mistakes';
import { pushAllProgressToCloud } from '@/lib/progress';
import { pushXpToCloud } from '@/lib/xp';
import { pushStreakToCloud } from '@/lib/streak';
import { pushKeysToCloud } from '@/lib/keys';

export interface BackupResult {
  hasEmail: boolean;
  mistakesPushed: number;
  mistakesTotal: number;
  progressSkillsPushed: number;
  progressSkillsFound: number;
  xpSynced: boolean;
  streakSynced: boolean;
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
 * email is linked. Mistakes push works device-only (no email needed);
 * progress/XP/streak/keys need a linked email since those tables are
 * email-keyed today.
 */
export async function runManualBackup(): Promise<BackupResult> {
  const email = await getStoredEmail();
  const skillIds = await discoverLocalSkillIds();

  const [mistakesResult, progressPushed, xpSynced, streakSynced, keysSynced] = await Promise.all([
    pushAllMistakesToCloud(),
    email ? pushAllProgressToCloud(email, skillIds) : Promise.resolve(0),
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
    streakSynced,
    keysSynced,
  };
}
