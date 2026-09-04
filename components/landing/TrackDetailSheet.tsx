import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, BrandGradients, StaticColors } from '@/theme/tokens';
import { getSheetGradient } from '@/constants/gradients';
import { TRACK_OPTIONS } from '@/constants/trackOptions';
import { LANDING_SKILLS } from '@/constants/skills';
import { getLocalProgress } from '@/lib/progress';
import { Track } from '@/lib/curriculum';

// Matches the session chunk size in utils/groupSessions.ts (chunkIntoSessions
// / chunkSignsIntoSessions both slice into groups of 7) — the number of
// questions the learner will actually see once they tap Start Practice.
const QUESTIONS_PER_SESSION = 7;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TrackDetailSheetProps {
  /** Which track's detail to show — null hides the sheet. */
  track: Track | null;
  onStartPractice: (track: Track) => void;
  onClose: () => void;
}

/**
 * Bottom sheet shown after picking a learning style on LearningStyleScreen —
 * a single-track preview (title, progress, source skill, illustration) with
 * "Start Practice" as the CTA. Same modal/backdrop/safe-area chrome as
 * ModeSwitcherSheet; same gradient CTA treatment as FeedbackSheet's
 * "CONTINUE" button. Reuses the illustration and label already defined in
 * TRACK_OPTIONS (constants/trackOptions.ts) — no new assets needed.
 */
export function TrackDetailSheet({ track, onStartPractice, onClose }: TrackDetailSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const visible = track !== null;
  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);
  const [progress, setProgress] = useState({ completedTopics: 0, totalTopics: 46 });

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 600, {
      duration: visible ? 320 : 180,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: visible ? 220 : 150 });
  }, [visible, translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      getLocalProgress().then(setProgress).catch(() => {});
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!track) return null;

  const option = TRACK_OPTIONS.find((o) => o.track === track) ?? TRACK_OPTIONS[0];
  const skillSubtitle = LANDING_SKILLS[0].subtitle;
  const pct = progress.totalTopics > 0 ? progress.completedTopics / progress.totalTopics : 0;
  const filledDots = Math.min(QUESTIONS_PER_SESSION, Math.round(pct * QUESTIONS_PER_SESSION));

  const sheetGrad = getSheetGradient(isDark);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, { backgroundColor: StaticColors.backdropColor }, backdropStyle]}
          onPress={onClose}
        />

        <Animated.View style={[styles.sheetWrapper, sheetStyle]}>
          <LinearGradient
            colors={sheetGrad.colors}
            start={sheetGrad.start}
            end={sheetGrad.end}
            style={[
              styles.sheet,
              {
                borderColor: isDark ? colors.outlineVariant : '#E2E8F0',
                paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
              },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
            </View>

            <Text style={[styles.title, { color: colors.onSurface }]}>{option.label}</Text>

            <Text style={[styles.subtitle, { color: colors.tealAccent || '#2BD9C4' }]}>
              {skillSubtitle}
            </Text>

            <View style={styles.illustrationWrap}>
              <Image source={option.image} style={styles.illustration} resizeMode="contain" />
            </View>

            <View style={styles.dotsRow}>
              {Array.from({ length: QUESTIONS_PER_SESSION }).map((_, i) =>
                i < filledDots ? (
                  <LinearGradient
                    key={i}
                    colors={BrandGradients.discovery.colors}
                    start={BrandGradients.discovery.start}
                    end={BrandGradients.discovery.end}
                    style={styles.dot}
                  />
                ) : (
                  <View key={i} style={[styles.dot, { backgroundColor: colors.surfaceContainerHigh }]} />
                ),
              )}
            </View>

            <Pressable onPress={() => onStartPractice(track)} style={styles.ctaWrapper}>
              <LinearGradient
                colors={BrandGradients.discovery.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Start Practice</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 40,
    elevation: 40,
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  sheet: {
    width: '100%',
    flexShrink: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: Radius.full,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 28,
    height: 8,
    borderRadius: Radius.full,
  },
  subtitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  illustration: {
    width: 220,
    height: 220,
  },
  ctaWrapper: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#0B3B31',
  },
});
