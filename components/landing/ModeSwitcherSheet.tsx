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
import { getTrackOptionsForSkill } from '@/constants/trackOptions';
import { LANDING_SKILLS } from '@/constants/skills';
import { getLocalProgress, getCompletedTracks } from '@/lib/progress';
import { Track, TrackTotals, getTrackTotals } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
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
  /** Which skill's track list to show — same skill the current session
   *  is playing through. */
  skillId: CurriculumSlug;
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
  skillId,
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
  // Real per-track question counts (from getTrackTotals()) for the "N
  // questions" label on each row. Undefined until the fetch resolves —
  // ModeCard just hides the label rather than showing a placeholder.
  const [trackTotals, setTrackTotals] = useState<Record<Track, TrackTotals> | null>(null);

  useEffect(() => {
    if (visible) {
      getLocalProgress().then(setProgress).catch(() => {});
      getCompletedTracks().then(setCompletedTracks).catch(() => {});
      getTrackTotals(skillId).then(setTrackTotals).catch(() => {});
    }
  }, [visible, skillId]);

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
  const skill = LANDING_SKILLS.find((s) => s.id === skillId) ?? LANDING_SKILLS[0];
  const trackOptions = getTrackOptionsForSkill(skill);

  // Effective completed set: persisted completedTracks, plus currentTrack
  // when trackComplete fired this render — PlaySession writes it to
  // storage in the same tick it opens this sheet, but that write is async,
  // so the very first render here can't rely on the fetch having landed
  // yet. Union avoids a "0/N" flash on the track you just finished.
  const effectiveCompleted =
    heading === 'trackComplete' && !completedTracks.includes(currentTrack)
      ? [...completedTracks, currentTrack]
      : completedTracks;
  const completedCount = trackOptions.filter((o) => effectiveCompleted.includes(o.track)).length;
  const title =
    heading === 'trackComplete'
      ? `${completedCount}/${trackOptions.length} tracks complete`
      : copy.title;

  // Current track first, same rendering as every other row — just
  // reordered and left for ModeCard to highlight.
  const current = trackOptions.find((o) => o.track === currentTrack);
  const rest = trackOptions.filter((o) => o.track !== currentTrack);
  const ordered = current ? [current, ...rest] : trackOptions;

  // Only meaningful once the current track is done (trackComplete): the
  // first not-yet-done track after it is the one we point the learner to
  // next. Harmless to compute on the 'switch' heading too — it's simply
  // never used for highlighting there, since the current row itself is
  // still the highlighted one while it's in progress.
  const nextUpTrack = ordered.find(
    (o) => o.track !== currentTrack && !effectiveCompleted.includes(o.track),
  )?.track;

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
                // (green "Done", no highlight) regardless of what the shared
                // pct happens to compute to. The 'switch' heading (mid-track,
                // not finished) shows it as the in-progress row instead,
                // using the real shared pct for its segment bar.
                const currentPct =
                  progress.totalTopics > 0 ? progress.completedTopics / progress.totalTopics : 0;
                const currentIsDone = heading === 'trackComplete';
                const rowProgress = isCurrent
                  ? currentIsDone
                    ? 1
                    : currentPct
                  : isDone
                    ? 1
                    : 0;
                const rowStatus: 'done' | 'inProgress' | 'notStarted' = isCurrent
                  ? currentIsDone
                    ? 'done'
                    : 'inProgress'
                  : isDone
                    ? 'done'
                    : 'notStarted';
                // Teal highlight marks the one row to look at next: the
                // current track while it's still in progress, or — once
                // that track is finished — the next not-yet-done track
                // after it in the list.
                const isHighlighted = isCurrent
                  ? !currentIsDone
                  : currentIsDone && option.track === nextUpTrack;
                return (
                  <View key={option.track} style={i > 0 ? styles.rowSpacing : undefined}>
                    <ModeCard
                      image={option.image}
                      title={option.label}
                      status={rowStatus}
                      highlighted={isHighlighted}
                      progress={rowProgress}
                      totalQuestions={trackTotals?.[option.track]?.totalQuestions}
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
