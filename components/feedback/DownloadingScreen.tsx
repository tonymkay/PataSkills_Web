import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily, Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { DownloadProgress } from '@/lib/downloadSession';

const LOADING_LABEL = 'Loading questions…';

interface DownloadingScreenProps {
  progress: DownloadProgress | null;
  error: string | null;
  onRetry: () => void;
}

export function BouncingDots({ color }: { color: string }) {
  const anim0 = React.useRef(new Animated.Value(0)).current;
  const anim1 = React.useRef(new Animated.Value(0)).current;
  const anim2 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    };

    const b0 = createBounce(anim0, 0);
    const b1 = createBounce(anim1, 140);
    const b2 = createBounce(anim2, 280);

    b0.start();
    b1.start();
    b2.start();

    return () => {
      b0.stop();
      b1.stop();
      b2.stop();
    };
  }, [anim0, anim1, anim2]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: anim0 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: anim1 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: anim2 }] }]} />
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
            <Text style={[Typography.headlineMd, styles.title, { color: colors.onSurface }]}>
              Couldn't load session
            </Text>
            <Text style={[Typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {error}
            </Text>
          </>
        ) : (
          <>
            <Text style={[Typography.headlineSm, styles.title, { color: colors.onSurface }]}>
              {LOADING_LABEL}
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

/**
 * Same look as DownloadingScreen's non-error state (label + bouncing dots),
 * with no progress/error/retry plumbing — used anywhere a new topic is
 * about to start and we want the same "Loading questions…" beat, even
 * when nothing is actually being fetched (e.g. advancing within an
 * already-downloaded track). Keeps that transition feeling consistent
 * whether or not there's real async work behind it.
 */
export function LoadingQuestionsScreen() {
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
        <Text style={[Typography.headlineSm, styles.title, { color: colors.onSurface }]}>
          {LOADING_LABEL}
        </Text>
        <BouncingDots color={colors.tealAccent || '#2BD9C4'} />
      </View>
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
    gap: Spacing.sm,
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
