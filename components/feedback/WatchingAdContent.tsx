import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';
import { AdSenseDisplayUnit } from '@/components/ads/AdSenseDisplayUnit';

const WATCH_SECONDS = 15;

interface WatchingAdContentProps {
  /** AdSense ad-unit slot ID for this placement, from env — passed down
   *  rather than read here so this component works the same whether the
   *  slot is configured or not (falls back to a plain sponsor countdown). */
  slotId?: string;
  onComplete: () => void;
}

/**
 * Bare content (no Modal wrapper) — the web equivalent of the native
 * AdMob rewarded-video wait, shown as WatchAdPromptSheet's 'watching'
 * step. A real AdSense unit renders above a mandatory countdown; the
 * reward only unlocks once the countdown finishes, same as a rewarded
 * video only paying out on completion. If no ad slot is configured yet
 * (EXPO_PUBLIC_ADSENSE_REWARD_SLOT_ID unset) or an ad blocker stops the
 * ad from rendering, the countdown still runs on its own — the learner
 * always reaches the reward, just without an ad filling the space.
 */
export function WatchingAdContent({ slotId, onComplete }: WatchingAdContentProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [secondsLeft, setSecondsLeft] = useState(WATCH_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onComplete]);

  const progress = (WATCH_SECONDS - secondsLeft) / WATCH_SECONDS;

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
        Your bonus session unlocks in {secondsLeft}s
      </Text>

      <View style={styles.adSlot}>
        <AdSenseDisplayUnit slotId={slotId} height={250} />
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh || '#2A2E38' }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: StaticColors.achievementAmber },
          ]}
        />
      </View>
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
