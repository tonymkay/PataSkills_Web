import { AppState, Platform } from 'react-native';

const TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917';
const ENV_REWARDED_ANDROID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID?.trim();
export const REWARDED_UNIT_ID =
  __DEV__ || process.env.EXPO_PUBLIC_APP_ENV !== 'production'
    ? TEST_REWARDED_ANDROID
    : ENV_REWARDED_ANDROID || TEST_REWARDED_ANDROID;

const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const ENV_BANNER_ANDROID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID?.trim();
export const BANNER_UNIT_ID =
  __DEV__ || process.env.EXPO_PUBLIC_APP_ENV !== 'production'
    ? TEST_BANNER_ANDROID
    : ENV_BANNER_ANDROID || TEST_BANNER_ANDROID;

const LOAD_TIMEOUT_MS = 5_000;
const OVERALL_TIMEOUT_MS = 20_000;

export type RewardOutcome = 'earned' | 'skipped' | 'unavailable';

type AdsModule = any;
let mod: AdsModule | null = null;
let initialized = false;
let activeRewarded: Promise<RewardOutcome> | null = null;

interface CancelToken {
  cancelled: boolean;
  onCancel: (() => void) | null;
}
let activeToken: CancelToken | null = null;

function nativeModule(): AdsModule | null {
  if (mod) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-google-mobile-ads');
    return mod;
  } catch {
    return null;
  }
}

export function adsAvailable(): boolean {
  return Platform.OS === 'android' && nativeModule() != null;
}

export function getAdsModule(): AdsModule | null {
  return nativeModule();
}

export async function configureAds(): Promise<void> {
  const m = nativeModule();
  if (!m || initialized || Platform.OS !== 'android') return;
  try {
    await m.default().initialize();
    initialized = true;
  } catch {
    initialized = false;
  }
}

function removeSub(sub: unknown) {
  if (typeof sub === 'function') {
    sub();
    return;
  }
  if (sub && typeof (sub as { remove?: unknown }).remove === 'function') {
    (sub as { remove: () => void }).remove();
  }
}

export function cancelActiveRewarded(): void {
  if (!activeToken) return;
  activeToken.cancelled = true;
  activeToken.onCancel?.();
}

/**
 * Shows rewarded AdMob ad for 1 bonus key session on Android.
 * On web, ads are not supported — returns 'unavailable'.
 */
export async function showRewardedForSession(): Promise<RewardOutcome> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }

  if (activeRewarded) return activeRewarded;
  const m = nativeModule();
  if (!m) return 'unavailable';

  const token: CancelToken = { cancelled: false, onCancel: null };
  activeToken = token;
  activeRewarded = showRewardedForSessionOnce(m, token).finally(() => {
    activeRewarded = null;
    if (activeToken === token) activeToken = null;
  });
  return activeRewarded;
}

export const showRewardedForKey = showRewardedForSession;

async function showRewardedForSessionOnce(m: AdsModule, token: CancelToken): Promise<RewardOutcome> {
  try {
    await configureAds();
    if (token.cancelled) return 'unavailable';

    const { RewardedAd, RewardedAdEventType, AdEventType } = m;
    const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise<RewardOutcome>((resolve) => {
      let earned = false;
      let opened = false;
      let settled = false;
      let cancelled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const subs: unknown[] = [];

      const cleanup = () => {
        timers.forEach(clearTimeout);
        subs.forEach(removeSub);
      };
      const done = (outcome: RewardOutcome) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(outcome);
      };

      token.onCancel = () => {
        cancelled = true;
        if (!opened) done('unavailable');
      };

      subs.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (cancelled) return;
          ad.show({ immersiveModeEnabled: false }).catch(() => done('unavailable'));
        }),
      );

      subs.push(
        ad.addAdEventListener(AdEventType.OPENED, () => {
          opened = true;
        }),
      );

      subs.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
          timers.push(
            setTimeout(() => {
              if (AppState.currentState === 'active') done('earned');
            }, 1500),
          );
        }),
      );

      subs.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          done(earned ? 'earned' : 'skipped');
        }),
      );

      subs.push(
        ad.addAdEventListener(AdEventType.ERROR, () => {
          done('unavailable');
        }),
      );

      subs.push(
        AppState.addEventListener('change', (state) => {
          if (state === 'active' && opened && earned) {
            timers.push(setTimeout(() => done('earned'), 750));
          }
        }),
      );

      // Load-phase timeout: if not loaded within 5s, fail fast
      timers.push(
        setTimeout(() => {
          if (!opened) done('unavailable');
        }, LOAD_TIMEOUT_MS),
      );

      // Overall safety net once opened
      timers.push(
        setTimeout(
          () => done(opened ? (earned ? 'earned' : 'skipped') : 'unavailable'),
          OVERALL_TIMEOUT_MS,
        ),
      );

      try {
        ad.load();
      } catch {
        done('unavailable');
      }
    });
  } catch {
    return 'unavailable';
  }
}
