import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { useTheme, Spacing, Radius, Typography, StaticColors } from '@/theme/tokens';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';
import { getCachedCoverImagePath } from '@/lib/curriculaCatalog';
import type { LandingSkill } from '@/constants/skills';
import { deriveSkillProgressState } from '@/components/home/SkillProgressCard';

const GRID_SEGMENT_COUNT = 10;

interface SkillGridCardProps {
  skill: LandingSkill;
  onPress: (skillId: LandingSkill['id']) => void;
  /** Same completedTopics/totalTopics shape lib/progress.ts's
   *  getLocalProgress() returns for this skill — passed down by
   *  LandingScreen so this card shows the SAME progress as the Home
   *  tab's SkillProgressCard for the same skill (Step 15/16: they were
   *  previously out of sync/decorative). Omitted or completedTopics=0
   *  renders no indicator — a skill that hasn't been started yet stays
   *  exactly as before. */
  progress?: { completedTopics: number; totalTopics: number };
}

/**
 * Compact 2-column grid card for the "Skills Corner"-style homepage
 * redesign — title centered up top, remote cover illustration centered
 * below. No progress bar, no CTA button: the whole card is the tap
 * target (mirrors how the reference design's cards work). Cover image
 * path comes from play_curricula.cover_image_path (lib/curriculaCatalog.ts)
 * first — the live source of truth, and the only source for a skill added
 * purely via a DB row — falling back to the static curriculumAssets.ts map
 * for the instant before that cache is warm (same pattern
 * constants/trackOptions.ts already uses for track images). A skill that's
 * actually in progress shows a slim one-row segment bar under the title,
 * driven by the same deriveSkillProgressState() the Home tab card uses —
 * see the `progress` prop doc above.
 */
export function SkillGridCard({ skill, onPress, progress }: SkillGridCardProps) {
  const { colors } = useTheme();
  const coverPath = getCachedCoverImagePath(skill.id) ?? CurriculumCoverImagePaths[skill.id];
  const coverImageUrl = getPlayAssetPublicUrl(coverPath);

  const hasStarted = !!progress && progress.completedTopics > 0;
  const { state, percent } = hasStarted
    ? deriveSkillProgressState(progress!.completedTopics, progress!.totalTopics)
    : { state: 'not-started' as const, percent: 0 };
  const accent =
    state === 'completed'
      ? StaticColors.tealAccent
      : state === 'in-progress'
        ? StaticColors.successLime
        : colors.onSurfaceVariant;
  const filledSegments = Math.round((percent / 100) * GRID_SEGMENT_COUNT);

  return (
    <Pressable
      onPress={() => onPress(skill.id)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceContainerLow },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text
        style={[Typography.titleMedium, styles.title, { color: colors.onSurface }]}
        numberOfLines={2}
      >
        {skill.subtitle}
      </Text>

      <View style={styles.illustrationWrap}>
        <Image source={{ uri: coverImageUrl }} style={styles.illustration} resizeMode="contain" />
      </View>

      {hasStarted && (
        <View style={styles.segmentRow}>
          {Array.from({ length: GRID_SEGMENT_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                { backgroundColor: i < filledSegments ? accent : colors.outlineVariant },
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    aspectRatio: 1,
    borderRadius: Radius.xl,
    padding: Spacing.gutter,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    lineHeight: 22,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 2,
    width: '100%',
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minWidth: 0,
    height: 3,
    borderRadius: Radius.sm,
  },
  illustrationWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
});
