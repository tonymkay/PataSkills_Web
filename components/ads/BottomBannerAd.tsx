/**
 * Fixed-size AdMob bottom banner — ported from pataskillsv2's
 * components/ads/BottomBannerAd.tsx. Renders nothing — no placeholder, no
 * loading state — unless ALL of: the caller isn't Premium, the `ads_live`
 * kill-switch is on, and the ad actually loads. Silent-fail by design.
 *
 * Native-only file (see BottomBannerAd.web.tsx for the web stub). Does NOT
 * statically import react-native-google-mobile-ads — pulled lazily via
 * lib/ads.ts's getAdsModule(), same guarded pattern the rewarded-ad path
 * in this app already uses.
 *
 * Usage: <BottomBannerAd /> for the default 320x50 BANNER, or
 * <BottomBannerAd size="LARGE_BANNER" /> for 320x100.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { adsAvailable, getAdsModule, BANNER_UNIT_ID } from '@/lib/ads';
import { refreshAdsLive } from '@/lib/adSettings';
import { getKeysState } from '@/lib/keys';
import { Spacing } from '@/constants';

export function BottomBannerAd({ size = 'BANNER' }: { size?: 'BANNER' | 'LARGE_BANNER' }) {
  const [eligible, setEligible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!adsAvailable()) return;
      const live = await refreshAdsLive();
      if (cancelled || !live) return;
      const premium = await getKeysState()
        .then((s) => !!s.isPremium)
        .catch(() => true); // fail closed: no ad if unsure
      if (!cancelled && !premium) setEligible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Renders NOTHING at all until eligible — callers should not add their
  // own spacing around this; any spacing baked into the caller's JSX would
  // linger even with ads off, defeating the point of the kill-switch.
  if (!eligible) return null;

  const m = getAdsModule();
  if (!m) return null; // native module unavailable — silent-fail
  const { BannerAd, BannerAdSize } = m;

  const nativeSize = size === 'LARGE_BANNER' ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER;
  const { width, height } = size === 'LARGE_BANNER' ? { width: 320, height: 100 } : { width: 320, height: 50 };

  return (
    <View style={{ width, height: loaded ? height : 0, alignSelf: 'center', alignItems: 'center', overflow: 'hidden', paddingBottom: loaded ? Spacing.md : 0 }}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={nativeSize}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}
