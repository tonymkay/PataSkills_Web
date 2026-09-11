import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';

const EMAIL_STORAGE_KEY = '@play/user_email';
const TOTAL_XP_STORAGE_KEY = '@play/total_xp';

function skillXpKey(skillId: string): string {
  return `@play/xp:${skillId}`;
}

export async function getSkillXp(skillId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(skillXpKey(skillId));
    if (raw) return parseInt(raw, 10) || 0;
  } catch {}
  return 0;
}

export async function getTotalXp(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(TOTAL_XP_STORAGE_KEY);
    if (raw) return parseInt(raw, 10) || 0;
  } catch {}
  return 0;
}

/**
 * Records XP earned from completing questions or sessions.
 * Accumulates both skill-specific XP and overall lifetime XP.
 */
export async function recordXpEarned(
  skillId: string,
  amount: number
): Promise<{ skillXp: number; totalXp: number }> {
  if (amount <= 0) {
    const currentSkillXp = await getSkillXp(skillId);
    const currentTotalXp = await getTotalXp();
    return { skillXp: currentSkillXp, totalXp: currentTotalXp };
  }

  const prevSkill = await getSkillXp(skillId);
  const nextSkill = prevSkill + amount;

  const prevTotal = await getTotalXp();
  const nextTotal = prevTotal + amount;

  try {
    await AsyncStorage.setItem(skillXpKey(skillId), String(nextSkill));
    await AsyncStorage.setItem(TOTAL_XP_STORAGE_KEY, String(nextTotal));
  } catch {}

  // Sync to Supabase, device-keyed (email carried along if linked)
  void syncXpToCloud(nextTotal);

  return { skillXp: nextSkill, totalXp: nextTotal };
}

async function syncXpToCloud(totalXp: number): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);

    const { error } = await supabase.from('play_user_stats').upsert(
      {
        device_id: deviceId,
        ...(email ? { email } : {}),
        total_xp: totalXp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' }
    );
    if (error) {
      // Was previously swallowed entirely — "Failed" in the backup summary
      // gave no way to tell RLS denial from a schema mismatch from
      // anything else. Now visible in device logs.
      console.warn('[xp] play_user_stats upsert failed:', error);
    }
    return !error;
  } catch {
    return false;
  }
}

/**
 * Manual "Backup now" entry point (Settings). Re-pushes current lifetime XP
 * regardless of whether the live sync at recordXpEarned time succeeded.
 * Device-keyed, so it works with or without a linked email — see
 * docs/sync-gaps-fix-plan.md Gap 1.
 */
export async function pushXpToCloud(): Promise<boolean> {
  const totalXp = await getTotalXp();
  return syncXpToCloud(totalXp);
}
