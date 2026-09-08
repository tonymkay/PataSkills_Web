import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';

const EMAIL_STORAGE_KEY = '@play/user_email';
const ACTIVITY_DATES_KEY = '@play/activity_dates';

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  todayActive: boolean;
  /** 7 booleans corresponding to Monday through Sunday of current week */
  weekDays: boolean[];
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function readDates(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_DATES_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

/**
 * Records that the learner was active today (completed questions/session).
 */
export async function recordActivityToday(): Promise<void> {
  const todayStr = formatDateString(new Date());
  const dates = await readDates();

  if (!dates.includes(todayStr)) {
    const updated = [...dates, todayStr].sort();
    try {
      await AsyncStorage.setItem(ACTIVITY_DATES_KEY, JSON.stringify(updated));
    } catch {}

    // Cloud sync streak summary, device-keyed (email carried along if linked)
    void syncStreakToCloud(updated);
  }
}

/**
 * Computes the streak and current week active days.
 */
export async function getStreakData(): Promise<StreakData> {
  const datesList = await readDates();
  const dateSet = new Set(datesList);

  const now = new Date();
  const todayStr = formatDateString(now);
  const todayActive = dateSet.has(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(now);

  // If not active today, check if active yesterday to continue streak
  if (!todayActive) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (dateSet.has(formatDateString(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate max streak
  let maxStreak = 0;
  let tempStreak = 0;
  let prevTimestamp: number | null = null;

  const sortedDates = Array.from(dateSet).sort();
  for (const ds of sortedDates) {
    const [y, m, d] = ds.split('-').map(Number);
    const ts = new Date(y, m - 1, d).getTime();
    if (prevTimestamp === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((ts - prevTimestamp) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    prevTimestamp = ts;
    if (tempStreak > maxStreak) maxStreak = tempStreak;
  }
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  // Calculate current Monday-Sunday week active days
  // JS getDay(): 0 is Sunday, 1 is Monday...
  const currentDayOfWeek = now.getDay();
  // Distance from Monday (0 if Monday, 6 if Sunday)
  const mondayDiff = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayDiff);

  const weekDays: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDays.push(dateSet.has(formatDateString(day)));
  }

  return {
    currentStreak,
    maxStreak,
    todayActive,
    weekDays,
  };
}

async function syncStreakToCloud(dates: string[]): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);

    const { error } = await supabase.from('play_user_stats').upsert(
      {
        device_id: deviceId,
        ...(email ? { email } : {}),
        active_days_count: dates.length,
        last_active_date: dates[dates.length - 1],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Manual "Backup now" entry point (Settings). Re-pushes the current
 * activity-dates summary regardless of whether the live sync at
 * recordActivityToday time succeeded. Device-keyed, so it works with or
 * without a linked email — see docs/sync-gaps-fix-plan.md Gap 1. Still
 * returns false if there's no activity recorded yet (nothing to push).
 */
export async function pushStreakToCloud(): Promise<boolean> {
  const dates = await readDates();
  if (dates.length === 0) return false;
  return syncStreakToCloud(dates);
}
