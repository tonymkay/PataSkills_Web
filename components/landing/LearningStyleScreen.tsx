import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { getTrackOptionsForSkill } from '@/constants/trackOptions';
import { LANDING_SKILLS } from '@/constants/skills';
import { getCompletedTracks } from '@/lib/progress';
import { Track, TrackTotals, getTrackTotals, getAvailableTracks, getCurriculumTrackDefs } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import type { CurriculumTrackDefinition } from '@/types/quiz';
import { ModeCard } from './ModeCard';

// Matches LandingScreen's bottom-sheet-style width cap so this screen
// reads consistently when the flow moves from the grid into this list.
const CONTENT_MAX_WIDTH = 480;

interface LearningStyleScreenProps {
  /** Which skill's track list to show — set by whichever LandingScreen
   *  card was tapped. */
  skillId: CurriculumSlug;
  /** Track a card was tapped for — parent opens the full-page TrackDetailScreen. */
  onPreviewTrack: (track: Track) => void;
  onBack: () => void;
}

/**
 * Full-page "Choose Learning Style" screen — reached by tapping a skill
 * card on LandingScreen. Lists only the tracks that skill actually
 * supports (constants/skills.ts's `tracks` field, resolved via
 * getTrackOptionsForSkill) as a ModeCard row each — same list
 * ModeSwitcherSheet uses later on, just as a standalone page instead of a
 * bottom sheet. Same done/not-started treatment and next-up teal
 * highlight as ModeSwitcherSheet — here there's no "current" track yet,
 * so the highlight falls on the first not-yet-done track. Tapping a card
 * hands off to the parent to open TrackDetailScreen — this screen owns no
 * preview state itself.
 */
export function LearningStyleScreen({ skillId, onPreviewTrack, onBack }: LearningStyleScreenProps) {
  const { colors } = useTheme();
  const skill = LANDING_SKILLS.find((s) => s.id === skillId) ?? LANDING_SKILLS[0];
  const [completedTracks, setCompletedTracks] = useState<Track[]>([]);
  // Real per-track question counts for the "N questions" label on each
  // row — same source and shape as ModeSwitcherSheet uses.
  const [trackTotals, setTrackTotals] = useState<Record<Track, TrackTotals> | null>(null);
  // Custom track definitions declared in curriculum JSON (if any)
  const [trackDefs, setTrackDefs] = useState<CurriculumTrackDefinition[] | undefined>();
  // Fallback to the skill's static tracks until the live per-curriculum
  // detection resolves — avoids a flash of an empty list, and is already
  // the right answer for skills with no role-tagged questions to detect
  // (world-facts).
  const [prevSkillId, setPrevSkillId] = useState(skillId);
  const [availableTracks, setAvailableTracks] = useState<Track[]>(skill.tracks);

  if (prevSkillId !== skillId) {
    setPrevSkillId(skillId);
    setAvailableTracks(skill.tracks);
    setTrackTotals(null);
    setTrackDefs(undefined);
  }

  const trackOptions = getTrackOptionsForSkill(skill, availableTracks, trackDefs);

  useEffect(() => {
    getCompletedTracks().then(setCompletedTracks).catch(() => {});
    getTrackTotals(skillId).then(setTrackTotals).catch(() => {});
    getAvailableTracks(skillId).then(setAvailableTracks).catch(() => {});
    getCurriculumTrackDefs(skillId).then(setTrackDefs).catch(() => {});
  }, [skillId]);

  const nextUpTrack = trackOptions.find((o) => !completedTracks.includes(o.track))?.track;

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
          {trackOptions.map((option, i) => {
            const isDone = completedTracks.includes(option.track);
            return (
              <View key={option.track} style={i > 0 ? styles.rowSpacing : undefined}>
                <ModeCard
                  image={option.image}
                  title={option.label}
                  status={isDone ? 'done' : 'notStarted'}
                  highlighted={option.track === nextUpTrack}
                  progress={isDone ? 1 : 0}
                  totalQuestions={trackTotals?.[option.track]?.totalQuestions}
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
