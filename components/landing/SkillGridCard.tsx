import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { useTheme, Spacing, Radius, Typography } from '@/theme/tokens';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';
import { getCachedCoverImagePath } from '@/lib/curriculaCatalog';
import type { LandingSkill } from '@/constants/skills';

interface SkillGridCardProps {
  skill: LandingSkill;
  onPress: (skillId: LandingSkill['id']) => void;
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
 * constants/trackOptions.ts already uses for track images).
 */
export function SkillGridCard({ skill, onPress }: SkillGridCardProps) {
  const { colors } = useTheme();
  const coverPath = getCachedCoverImagePath(skill.id) ?? CurriculumCoverImagePaths[skill.id];
  const coverImageUrl = getPlayAssetPublicUrl(coverPath);

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
