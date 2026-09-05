import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { TRACK_OPTIONS } from '@/constants/trackOptions';
import { getCompletedTracks } from '@/lib/progress';
import { Track } from '@/lib/curriculum';
import { ModeCard } from './ModeCard';

// Matches LandingScreen's bottom-sheet-style width cap so this screen
// reads consistently when the flow moves from the grid into this list.
const CONTENT_MAX_WIDTH = 480;

interface LearningStyleScreenProps {
  /** Track a card was tapped for — parent opens the full-page TrackDetailScreen. */
  onPreviewTrack: (track: Track) => void;
  onBack: () => void;
}

/**
 * Full-page "Choose Learning Style" screen — reached by tapping a skill
 * card on LandingScreen. Lists every TRACK_OPTIONS entry as a ModeCard
 * row (same list ModeSwitcherSheet uses later on, just as a standalone
 * page instead of a bottom sheet). Same done/not-started treatment and
 * next-up teal highlight as ModeSwitcherSheet — here there's no "current"
 * track yet, so the highlight falls on the first not-yet-done track
 * (Differentiate Pairs, for a learner who hasn't completed anything).
 * Tapping a card hands off to the parent to open TrackDetailScreen — this
 * screen owns no preview state itself.
 */
export function LearningStyleScreen({ onPreviewTrack, onBack }: LearningStyleScreenProps) {
  const { colors } = useTheme();
  const [completedTracks, setCompletedTracks] = useState<Track[]>([]);

  useEffect(() => {
    getCompletedTracks().then(setCompletedTracks).catch(() => {});
  }, []);

  const nextUpTrack = TRACK_OPTIONS.find((o) => !completedTracks.includes(o.track))?.track;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={Spacing.sm} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.heading, { color: colors.onSurface }]}>Choose Learning Style</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.list}>
          {TRACK_OPTIONS.map((option, i) => {
            const isDone = completedTracks.includes(option.track);
            return (
              <View key={option.track} style={i > 0 ? styles.rowSpacing : undefined}>
                <ModeCard
                  image={option.image}
                  title={option.label}
                  status={isDone ? 'done' : 'notStarted'}
                  highlighted={option.track === nextUpTrack}
                  progress={isDone ? 1 : 0}
                  onPress={() => onPreviewTrack(option.track)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  containerContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerSpacer: {
    width: 22 + Spacing.xs * 2,
  },
  heading: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 20,
    textAlign: 'center',
  },
  list: {
    width: '100%',
  },
  rowSpacing: {
    marginTop: Spacing.sm,
  },
});
