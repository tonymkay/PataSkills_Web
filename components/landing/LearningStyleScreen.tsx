import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { getTrackOptionsForSkill, groupTrackOptions } from '@/constants/trackOptions';
import { getLandingSkill } from '@/constants/skills';
import { getCompletedTracks, getTrackProgress } from '@/lib/progress';
import { Track, TrackTotals, getTrackTotals, getAvailableTracks, getCurriculumTrackDefs } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import type { CurriculumTrackDefinition } from '@/types/quiz';
import { ModeCard } from './ModeCard';
import { ModeCardSkeleton } from './ModeCardSkeleton';
import { OnboardingStepper } from './OnboardingStepper';

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
  /** True only on the first-run onboarding funnel — shows the 3-step
   *  OnboardingStepper above the heading. See LandingScreen's same prop. */
  isOnboarding?: boolean;
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
export function LearningStyleScreen({ skillId, onPreviewTrack, onBack, isOnboarding }: LearningStyleScreenProps) {
  const { colors } = useTheme();
  const skill = getLandingSkill(skillId);
  const [completedTracks, setCompletedTracks] = useState<Track[]>([]);
  // Real per-track fraction (completedSessions/totalSessions), keyed by
  // track — distinct from `completedTracks`'s binary done/not-done and
  // from the skill-wide progress Home/Reports show. A track's own
  // progress only moves when a session in THAT track finishes (see
  // markTrackTopicCompleted in lib/progress.ts).
  const [trackProgress, setTrackProgress] = useState<Record<string, number>>({});
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
  // True only until this skill's track data (totals/progress/available
  // tracks/custom defs) has resolved at least once — gates the skeleton
  // list below. Reset on skill change so switching skills re-shows it
  // rather than flashing stale rows from the previous skill.
  const [loading, setLoading] = useState(true);

  if (prevSkillId !== skillId) {
    setPrevSkillId(skillId);
    setAvailableTracks(skill.tracks);
    setTrackTotals(null);
    setTrackDefs(undefined);
    setTrackProgress({});
    setLoading(true);
  }

  const trackOptions = getTrackOptionsForSkill(skill, availableTracks, trackDefs);

  useEffect(() => {
    getCompletedTracks(skillId).then(setCompletedTracks).catch(() => {});
    getTrackTotals(skillId).then(setTrackTotals).catch(() => {});
    getAvailableTracks(skillId).then(setAvailableTracks).catch(() => {});
    getCurriculumTrackDefs(skillId).then(setTrackDefs).catch(() => {}).finally(() => setLoading(false));
  }, [skillId]);

  // Per-track fraction, once this skill's real track list is known —
  // one getTrackProgress() call per track, same pattern LandingScreen's
  // refreshProgress() uses for skill-level progress.
  useEffect(() => {
    if (trackOptions.length === 0) return;
    Promise.all(
      trackOptions.map((o) =>
        getTrackProgress(skillId, o.track).then((p) => [o.track, p] as const)
      )
    )
      .then((entries) => {
        setTrackProgress(
          Object.fromEntries(
            entries.map(([track, p]) => [
              track,
              p.totalSessions > 0 ? Math.min(1, p.completedSessions / p.totalSessions) : 0,
            ])
          )
        );
      })
      .catch(() => {});
  }, [skillId, trackOptions.map((o) => o.track).join(',')]);

  const nextUpTrack = trackOptions.find((o) => !completedTracks.includes(o.track))?.track;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {isOnboarding && (
          <View style={styles.stepperWrap}>
            <OnboardingStepper index={1} />
          </View>
        )}

        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={Spacing.sm} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.heading, { color: colors.onSurface }]}>Choose Learning Style</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.list}>
          {loading ? (
            Array.from({ length: skill.tracks.length || 4 }).map((_, i) => (
              <View key={i}>
                {i > 0 && (
                  <View style={styles.connector}>
                    <View style={[styles.connectorLine, { backgroundColor: colors.outlineVariant }]} />
                  </View>
                )}
                <ModeCardSkeleton />
              </View>
            ))
          ) : (
            groupTrackOptions(trackOptions).map((group, groupIdx) => (
            <View key={group.groupTitle ?? `g${groupIdx}`} style={groupIdx > 0 ? styles.groupSpacing : undefined}>
              {/* Connecting line between this group and the previous one,
                  matching the skeleton's flat connector-per-item loop —
                  most tracks are ungrouped (singleton groups), so without
                  this the line only ever appeared inside a named group. */}
              {groupIdx > 0 && !group.groupTitle && (
                <View style={styles.connector}>
                  <View style={[styles.connectorLine, { backgroundColor: colors.outlineVariant }]} />
                </View>
              )}
              {group.groupTitle ? (
                <Text style={[styles.groupHeading, { color: colors.onSurfaceVariant }]}>{group.groupTitle}</Text>
              ) : null}
              {group.options.map((option, i) => {
                const isDone = completedTracks.includes(option.track);
                return (
                  <View key={option.track}>
                    {/* Connecting line between cards (Brilliant-style) */}
                    {i > 0 && (
                      <View style={styles.connector}>
                        <View style={[styles.connectorLine, { backgroundColor: colors.outlineVariant }]} />
                      </View>
                    )}
                    <ModeCard
                      image={option.image}
                      title={option.label}
                      status={
                        isDone ? 'done' : (trackProgress[option.track] ?? 0) > 0 ? 'inProgress' : 'notStarted'
                      }
                      highlighted={option.track === nextUpTrack}
                      progress={isDone ? 1 : (trackProgress[option.track] ?? 0)}
                      totalQuestions={trackTotals?.[option.track]?.totalQuestions}
                      onPress={() => onPreviewTrack(option.track)}
                    />
                  </View>
                );
              })}
            </View>
            ))
          )}
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
  stepperWrap: {
    marginBottom: Spacing.lg,
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
  connector: {
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    // Extended by 8px (4px each end) and pulled back with a negative
    // margin so the line tucks well under the adjacent ModeCard's 2px
    // border instead of stopping at the card's rounded corner — the
    // previous 2px overlap still left a visible gap where the straight
    // line met the curved edge, so this doubles it.
    height: Spacing.md + 8,
    marginVertical: -4,
  },
  groupSpacing: {
    marginTop: Spacing.lg,
  },
  groupHeading: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
});
