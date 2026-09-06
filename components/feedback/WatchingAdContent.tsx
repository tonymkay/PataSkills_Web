import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';
import { AdSenseDisplayUnit, type AdSenseStatus } from '@/components/ads/AdSenseDisplayUnit';

// Only used once an ad is confirmed filled — this is the minimum view
// time for the reward to count, not a blind wait unrelated to ad state.
const MIN_VIEW_SECONDS = 5;
// If AdSense hasn't reported filled/unfilled by this long (script
// blocked, slow network), stop waiting rather than hang indefinitely.
const LOAD_TIMEOUT_MS = 6000;
// Brief pause before completing on 'unfilled'/'error' so it doesn't read
// as an instant, jarring skip.
const NO_FILL_PAUSE_MS = 1200;

interface WatchingAdContentProps {
  /** AdSense ad-unit slot ID for this placement, from env. */
  slotId?: string;
  onComplete: () => void;
}

/**
 * FALLBACK reward content — only reached when the real full-screen
 * rewarded ad (lib/webRewardedAd.ts, Ad Placement API) reports
 * 'unavailable' (see WatchAdPromptSheet.tsx). Renders a real AdSense
 * display unit and reacts to whether it actually filled instead of
 * running a fixed countdown regardless of ad state:
 *   - 'filled'   -> ad is real, hold for MIN_VIEW_SECONDS, then reward.
 *   - 'unfilled' -> no ad served this time, reward after a short pause
 *                   rather than pretending to show one for 15s.
 *   - timeout    -> AdSense never resolved (blocked/slow) — same short
 *                   pause as unfilled.
 */
export function WatchingAdContent({ slotId, onComplete }: WatchingAdContentProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<AdSenseStatus | 'loading'>('loading');
  const [secondsLeft, setSecondsLeft] = useState(MIN_VIEW_SECONDS);

  const handleStatus = (s: AdSenseStatus) => setStatus((prev) => (prev === 'loading' ? s : prev));

  useEffect(() => {
    const timeout = setTimeout(() => handleStatus('unfilled'), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'filled') {
      const t = setTimeout(onComplete, NO_FILL_PAUSE_MS);
      return () => clearTimeout(t);
    }
    if (secondsLeft <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft, onComplete]);

  const progress = status === 'filled' ? (MIN_VIEW_SECONDS - secondsLeft) / MIN_VIEW_SECONDS : 0;
  const subtitle =
    status === 'loading'
      ? 'Loading sponsor content…'
      : status === 'filled'
        ? `Your bonus session unlocks in ${secondsLeft}s`
        : 'No sponsor available right now — unlocking your session…';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#14171C',
          paddingTop: Math.max(insets.top + Spacing.xl, Spacing.xl),
          paddingBottom: Math.max(insets.bottom + Spacing.lg, Spacing.lg),
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.onSurface || '#FFFFFF' }]}>
        Sponsor break
      </Text>
      <Text style={[styles.subtitle, { color: colors.onSurfaceVariant || '#8B949E' }]}>
        {subtitle}
      </Text>

      <View style={styles.adSlot}>
        <AdSenseDisplayUnit slotId={slotId} height={250} onStatus={handleStatus} />
      </View>

      {status === 'filled' && (
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh || '#2A2E38' }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: StaticColors.achievementAmber },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  adSlot: {
    width: '100%',
    maxWidth: 400,
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    maxWidth: 400,
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
