import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from './curriculum';

const STORAGE_KEY = '@play/hide_continue_prompt';

type HideMap = Partial<Record<Track, boolean>>;

async function readMap(): Promise<HideMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HideMap;
  } catch {}
  return {};
}

/**
 * Whether the "Do more questions like this?" confirmation sheet should
 * still be shown for this track. Starts true for every track; flips to
 * false, per track, once the learner checks "Don't show this again" from
 * that sheet (either the Yes or the No path).
 */
export async function shouldShowContinuePrompt(track: Track): Promise<boolean> {
  const map = await readMap();
  return !map[track];
}

/** Silences the confirmation sheet for this track going forward. */
export async function hideContinuePromptForTrack(track: Track): Promise<void> {
  const map = await readMap();
  if (map[track]) return;
  map[track] = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}
