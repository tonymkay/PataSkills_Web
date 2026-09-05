import React, { useEffect, useState } from 'react';
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
import { getLocalProgress, getCompletedTracks } from '@/lib/progress';
import { Track } from '@/lib/curriculum';
import { ModeCard } from './ModeCard';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ModeSwitcherHeading = 'switch' | 'trackComplete';

// Shortened from the original "Here are more ways you can learn the same
// topic." — the DONE badge + progress row on the current track's card now
// carry that meaning, so the subtitle just needs to nudge toward the list
// instead of re-explaining it.
const HEADING_COPY: Record<ModeSwitcherHeading, { title?: string; subtitle?: string }> = {
  switch: {
    title: 'Switch to a different learning style',
  },
  trackComplete: {
    subtitle: 'Pick another way to keep learning.',
  },
};

// trackComplete's title is a fraction ("N/6 tracks complete") instead of
// static copy, so the learner can see how much of the full mode set
// they've worked through — N comes from real per-track completion
// persisted in storage (lib/progress.ts), not a hardcoded value.
interface ModeSwitcherSheetProps {
  visible: boolean;
  heading: ModeSwitcherHeading;
  /** The track the learner is currently on (or just finished) — shown
   *  first in the list and highlighted, same illustration and label as
   *  every other row. */
  currentTrack: Track;
  onSelectTrack: (track: Track) => void;
  onClose: () => void;
}

/**
 * All learning modes at once (no "load more") — first item is always the
 * current mode, reordered to the front and highlighted (same image and
 * label as every other row, just a teal border/tint). Two heading states:
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
  // Shared/global progress (same source TrackDetailScreen's dots use) —
  // drives the CURRENT row's in-progress segment fill while the current
  // track is still ongoing ('switch' heading).
  const [progress, setProgress] = useState({ completedTopics: 0, totalTopics: 46 });
  // Tracks the learner has fully exhausted (persisted in AsyncStorage via
  // markTrackCompleted, written from PlaySession the moment a track runs
  // out of topics) — real source for both the header fraction and each
  // row's DONE state, refetched every time the sheet opens.
  const [completedTracks, setCompletedTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (visible) {
      getLocalProgress().then(setProgress).catch(() => {});
      getCompletedTracks().then(setCompletedTracks).catch(() => {});
    }
  }, [visible]);

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

  // Effective completed set: persisted completedTracks, plus currentTrack
  // when trackComplete fired this render — PlaySession writes it to
  // storage in the same tick it opens this sheet, but that write is async,
  // so the very first render here can't rely on the fetch having landed
  // yet. Union avoids a "0/6" flash on the track you just finished.
  const effectiveCompleted =
    heading === 'trackComplete' && !completedTracks.includes(currentTrack)
      ? [...completedTracks, currentTrack]
      : completedTracks;
  const completedCount = TRACK_OPTIONS.filter((o) => effectiveCompleted.includes(o.track)).length;
  const title =
    heading === 'trackComplete'
      ? `${completedCount}/${TRACK_OPTIONS.length} tracks complete`
      : copy.title;

  // Current track first, same rendering as every other row — just
  // reordered and left for ModeCard to highlight.
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
              {title}
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
                const isDone = !isCurrent && effectiveCompleted.includes(option.track);
                // Current row: trackComplete means we know for a fact this
                // track's sessions are exhausted, so show it as fully done
                // regardless of what the shared pct happens to compute to —
                // a "you've completed this" screen showing a partial bar
                // for the very card it's about would read as a bug. The
                // 'switch' heading (mid-track, not finished) shows the real
                // shared pct instead. Other rows use the real persisted
                // completedTracks set: full bar if done, empty if untouched.
                const currentPct =
                  progress.totalTopics > 0 ? progress.completedTopics / progress.totalTopics : 0;
                const rowProgress = isCurrent
                  ? heading === 'trackComplete'
                    ? 1
                    : currentPct
                  : isDone
                    ? 1
                    : 0;
                const rowStatus: 'current' | 'done' | undefined = isCurrent
                  ? heading === 'trackComplete'
                    ? 'done'
                    : 'current'
                  : isDone
                    ? 'done'
                    : undefined;
                return (
                  <View key={option.track} style={i > 0 ? styles.rowSpacing : undefined}>
                    <ModeCard
                      image={option.image}
                      title={option.label}
                      status={rowStatus}
                      progress={rowProgress}
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
    flexShrink: 1,
    marginTop: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  rowSpacing: {
    marginTop: Spacing.sm,
  },
});
