/**
 * Real, full-screen web rewarded ads via Google's Ad Placement API
 * (adBreak/adConfig globals — see app/+html.tsx for the setup snippet
 * that wires them to the same adsbygoogle.js tag AdSense already uses).
 * This is the actual product behind full-page, closable rewarded ad
 * creatives on web — not a plain in-page <ins> display unit.
 *
 * Note: Ad Placement API traffic requires the AdSense account to be
 * enrolled for it (Google's "Ads for games"/H5 games ad formats program,
 * separate from standard AdSense approval). Until that's enrolled,
 * window.adBreak may exist but never call beforeReward for any request —
 * every call below correctly resolves 'unavailable' in that case, it's
 * on the Google account side, not this code.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (config: AdBreakConfig) => void;
    adConfig?: (config: Record<string, unknown>) => void;
  }
}

interface AdBreakConfig {
  type: 'reward';
  name: string;
  beforeReward?: (showAdFn: () => void) => void;
  afterAd?: () => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (placementInfo: unknown) => void;
}

export type WebRewardOutcome = 'earned' | 'skipped' | 'unavailable';

/**
 * Requests one rewarded ad placement. Must be called synchronously from
 * inside a user-gesture handler (a button press) — the Ad Placement API
 * requires showAdFn() to fire as part of a direct user action, so no
 * awaiting anything before this call in the caller.
 *
 * Resolves once adBreakDone fires, which Google guarantees happens
 * exactly once per adBreak() call regardless of outcome — no manual
 * timeout needed. 'unavailable' covers both "API not present" (script
 * blocked/not loaded) and "no ad was offered" (beforeReward never fired,
 * e.g. account not enrolled or no fill for this request).
 */
export function showWebRewardedAd(name: string): Promise<WebRewardOutcome> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.adBreak !== 'function') {
      resolve('unavailable');
      return;
    }

    let adWasOffered = false;
    let viewed = false;

    window.adBreak({
      type: 'reward',
      name,
      beforeReward: (showAdFn) => {
        adWasOffered = true;
        showAdFn();
      },
      adViewed: () => {
        viewed = true;
      },
      adDismissed: () => {
        viewed = false;
      },
      adBreakDone: () => {
        resolve(!adWasOffered ? 'unavailable' : viewed ? 'earned' : 'skipped');
      },
    });
  });
}
