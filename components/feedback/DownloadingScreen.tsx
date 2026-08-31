import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily, Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { DownloadProgress, DownloadStage } from '@/lib/downloadSession';

// User-facing copy only — deliberately says nothing about "downloading" or
// "images"; this same screen still covers the curriculum/signs/pairs/
// hydrating stages under the hood, but the learner just sees that things
// are getting ready, not implementation detail.
const STAGE_LABEL: Record<DownloadStage, string> = {
  curriculum: 'Preparing your questions…',
  signs: 'Getting everything ready…',
  pairs: 'Almost there…',
  hydrating: 'Preparing your session…',
};

interface DownloadingScreenProps {
  progress: DownloadProgress | null;
  error: string | null;
  onRetry: () => void;
}

// Three dots bouncing in a staggered wave — communicates "something is
// happening" without implying a measurable, watchable percentage.
function BouncingDots({ color }: { color: string }) {
  const dot0 = useSharedValue(0);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);

  useEffect(() => {
    const bounce = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-8, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        )
      );
    dot0.value = bounce(0);
    dot1.value = bounce(120);
    dot2.value = bounce(240);
  }, [dot0, dot1, dot2]);

  const style0 = useAnimatedStyle(() => ({ transform: [{ translateY: dot0.value }] }));
  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, style0]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, style1]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, style2]} />
    </View>
  );
}

export function DownloadingScreen({ progress, error, onRetry }: DownloadingScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#1A1D24',
          paddingTop: Math.max(insets.top, Spacing.lg),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
        },
      ]}
    >
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={[Typography.scoreMainTitle, styles.title, { color: colors.onSurface }]}>
              Couldn't download session
            </Text>
            <Text style={[Typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {error}
            </Text>
          </>
        ) : (
          <>
            <Text style={[Typography.scoreMainTitle, styles.title, { color: colors.onSurface }]}>
              {STAGE_LABEL[progress?.stage ?? 'curriculum']}
            </Text>
            <BouncingDots color={colors.tealAccent || '#2BD9C4'} />
          </>
        )}
      </View>

      {error ? (
        <View style={styles.actions}>
          <Pressable onPress={onRetry} style={styles.primaryButton}>
            <Text style={styles.primaryText}>RETRY</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.base,
    maxWidth: 640,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {
    gap: Spacing.gutter,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: Radius.full,
    backgroundColor: '#F8F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primaryText: {
    color: '#1A1D24',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
