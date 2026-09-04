import { Platform } from 'react-native';

const TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917';
const ENV_REWARDED_ANDROID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID?.trim();
const REWARDED_UNIT_ID =
  __DEV__ || process.env.EXPO_PUBLIC_APP_ENV !== 'production'
    ? TEST_REWARDED_ANDROID
    : ENV_REWARDED_ANDROID || TEST_REWARDED_ANDROID;

export type RewardOutcome = 'earned' | 'skipped' | 'unavailable';

type AdsModule = any;
let mod: AdsModule | null = null;
let initialized = false;

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

export async function configureAds(): Promise<void> {
  const m = nativeModule();
  if (!m || initialized) return;
  try {
    await m.default().initialize();
    initialized = true;
  } catch {
    initialized = false;
  }
}

/**
 * Shows a rewarded ad for 1 bonus key session.
 * On Native Android: Uses Google Mobile Ads RewardedAd.
 * On Web: Provides smooth 3-second sponsor reward timer.
 */
export async function showRewardedForSession(): Promise<RewardOutcome> {
  const m = nativeModule();

  if (m && Platform.OS === 'android') {
    return new Promise((resolve) => {
      try {
        const { RewardedAd, RewardedAdEventType } = m;
        const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
          requestNonPersonalizedAdsOnly: true,
        });

        let earned = false;

        const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          ad.show();
        });

        const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        });

        const unsubscribeClosed = ad.addAdEventListener(RewardedAdEventType.CLOSED, async () => {
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          // Key is granted by the caller once the reward screen's CTA is
          // actually tapped, not here — granting it immediately made the
          // balance update (and the app auto-advance past the reward
          // screen) before the learner had a chance to see or tap it.
          resolve(earned ? 'earned' : 'skipped');
        });

        ad.load();
      } catch {
        resolve('unavailable');
      }
    });
  }

  // Web & Dev Fallback: quick 1.5s simulated sponsor ad
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('earned');
    }, 1500);
  });
}
