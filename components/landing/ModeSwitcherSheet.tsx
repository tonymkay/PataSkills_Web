import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { getSheetGradient } from '@/constants/gradients';
import { StaticColors } from '@/constants/colors';
import { TRACK_OPTIONS } from '@/constants/trackOptions';
import { Track } from '@/lib/curriculum';
import { ModeCard } from './ModeCard';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ModeSwitcherHeading = 'switch' | 'trackComplete';

const HEADING_COPY: Record<ModeSwitcherHeading, { title: string; subtitle?: string }> = {
  switch: {
    title: 'Switch to a different learning style',
  },
  trackComplete: {
    title: "You've completed this track!",
    subtitle: 'Here are more ways you can learn the same topic.',
  },
};

interface ModeSwitcherSheetProps {
  visible: boolean;
  heading: ModeSwitcherHeading;
  /** The track the learner is currently on (or just finished) — shown
   *  first in the list, relabeled "Continue in ..." mode. */
  currentTrack: Track;
  onSelectTrack: (track: Track) => void;
  onClose: () => void;
}

/**
 * All learning modes at once (no "load more") — first item is always the
 * current mode, relabeled "Continue in {mode}". Two heading states:
 * reached from "No, I'd like to switch" on ContinuePromptSheet ("switch"),
 * or reached directly when the learner has exhausted every topic in the
 * current mode ("trackComplete") — the confirmation sheet is skipped
 * entirely in that case.
 */
export function ModeSwitcherSheet({
  visible,
  heading,
  currentTrack,
  onSelectTrack,
  onClose,
}: ModeSwitcherSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 600, {
      duration: visible ? 320 : 180,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: visible ? 220 : 150 });
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  const sheetGrad = getSheetGradient(isDark);
  const copy = HEADING_COPY[heading];

  // Current track first (relabeled), the rest in their normal order.
  const current = TRACK_OPTIONS.find((o) => o.track === currentTrack);
  const rest = TRACK_OPTIONS.filter((o) => o.track !== currentTrack);
  const ordered = current ? [current, ...rest] : TRACK_OPTIONS;

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

            <Text style={[Typography.headlineSm, styles.title, { color: colors.onSurface }]}>
              {copy.title}
            </Text>
            {copy.subtitle ? (
              <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>{copy.subtitle}</Text>
            ) : null}

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {ordered.map((option, i) => {
                const isCurrent = option.track === currentTrack;
                return (
                  <View key={option.track} style={i > 0 ? styles.rowSpacing : undefined}>
                    <ModeCard
                      icon={option.icon}
                      title={isCurrent ? `Continue in ${option.label.toLowerCase()}` : option.label}
                      highlighted={isCurrent}
                      onPress={() => onSelectTrack(option.track)}
                    />
                  </View>
                );
              })}
            </ScrollView>
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
  },
  sheet: {
    width: '100%',
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
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: Radius.full,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  list: {
    marginTop: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  rowSpacing: {
    marginTop: Spacing.sm,
  },
});
