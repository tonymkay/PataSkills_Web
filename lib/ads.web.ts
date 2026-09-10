// Web stub for lib/ads.ts.
//
// Why this file exists: react-native-google-mobile-ads' BannerAd.js
// unconditionally imports react-native/Libraries/Utilities/codegenNativeComponent,
// a native-only RN internal. Metro statically bundles every import it finds in
// the module graph before any runtime Platform.OS guard in lib/ads.ts ever
// executes, so on web the bundler dies trying to resolve that internal.
//
// Metro's platform-extension resolution picks this .web.ts file over ads.ts
// automatically when bundling for web (same pattern as billing.web.ts for
// the native billing SDK), so this file must never import
// 'react-native-google-mobile-ads', directly or indirectly.

export type RewardOutcome = 'earned' | 'skipped' | 'unavailable';

// No web ad units — ads are Android-only. Kept as empty strings so any
// code that reads these constants (rather than checking adsAvailable()
// first) doesn't crash.
export const REWARDED_UNIT_ID = '';
export const BANNER_UNIT_ID = '';

export function adsAvailable(): boolean {
  return false;
}

export function getAdsModule(): null {
  return null;
}

export async function configureAds(): Promise<void> {
  // No-op on web.
}

export function cancelActiveRewarded(): void {
  // No-op on web — there is never an active rewarded ad to cancel.
}

export async function showRewardedForSession(): Promise<RewardOutcome> {
  return 'unavailable';
}

export const showRewardedForKey = showRewardedForSession;
