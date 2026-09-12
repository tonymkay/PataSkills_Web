import * as Updates from 'expo-updates';

/**
 * Thin wrapper over expo-updates for a manual "Check for updates" action.
 * OTA only runs in release-style builds (preview/production) — in Expo Go /
 * a dev client `Updates.isEnabled` is false and we report that instead of
 * erroring. Mirrors PataSkillsV2's lib/appUpdates.ts byte-for-byte so the
 * two apps' update UX stays identical.
 */

export type UpdateResult =
  | { status: 'disabled' }
  | { status: 'upToDate' }
  | { status: 'downloaded' } // fetched and ready; caller should offer a restart
  | { status: 'offline' } // no connectivity — caller shows plain status text, no popup
  | { status: 'error'; message: string };

/** Loose match on common "can't reach the network" error text across
 *  platforms/SDK versions, so a plain offline device doesn't get treated as
 *  a real bug worth surfacing a debug popup for. */
function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /network|offline|internet|host|timed? ?out|failed to fetch|unreachable/i.test(msg);
}

/** Check for a newer update and, if found, download it. Does NOT restart.
 *  `onDownloading`, if given, fires the instant an update is confirmed
 *  available — right before the (potentially slow) download starts — so a
 *  caller can switch on a loading indicator only while a real download is
 *  happening, not during the quick up-to-date check. */
export async function checkAndFetchUpdate(onDownloading?: () => void): Promise<UpdateResult> {
  if (!Updates.isEnabled || __DEV__) return { status: 'disabled' };
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return { status: 'upToDate' };
    onDownloading?.();
    await Updates.fetchUpdateAsync();
    return { status: 'downloaded' };
  } catch (e) {
    if (isNetworkError(e)) return { status: 'offline' };
    return { status: 'error', message: e instanceof Error ? e.message : 'Update check failed' };
  }
}

/** Restart the app to apply the downloaded update. */
export async function applyUpdate(): Promise<void> {
  await Updates.reloadAsync();
}

/** Short id of the running update (for display / support). */
export function currentUpdateLabel(): string {
  if (!Updates.isEnabled) return 'Development build';
  return Updates.updateId ? Updates.updateId.slice(0, 8) : 'Embedded';
}
