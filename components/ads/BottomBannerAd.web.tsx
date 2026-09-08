/**
 * Web build of components/ads/BottomBannerAd.tsx. AdMob is native-only —
 * Metro picks this file over BottomBannerAd.tsx automatically for web
 * builds (platform-specific extension), so this file must never import
 * react-native-google-mobile-ads, directly or indirectly. Callers render
 * <BottomBannerAd /> unconditionally across screens; this just renders
 * nothing on web instead of every call site needing its own check.
 */
export function BottomBannerAd(_props: { size?: 'BANNER' | 'LARGE_BANNER' }) {
  return null;
}
