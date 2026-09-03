import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { useTheme, Spacing, Radius, Typography } from '@/theme/tokens';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';
import type { LandingSkill } from '@/constants/skills';

interface SkillGridCardProps {
  skill: LandingSkill;
  onPress: () => void;
}

/**
 * Compact 2-column grid card for the "Skills Corner"-style homepage
 * redesign — title centered up top, remote cover illustration centered
 * below. No progress bar, no CTA button: the whole card is the tap
 * target (mirrors how the reference design's cards work). Cover image is
 * fetched from Supabase Storage via curriculumAssets.ts, same source
 * SkillCard/LandingIllustration already use — nothing bundled locally.
 */
export function SkillGridCard({ skill, onPress }: SkillGridCardProps) {
  const { colors } = useTheme();
  const coverImageUrl = getPlayAssetPublicUrl(CurriculumCoverImagePaths[skill.id]);

  return (
    <Pressable
      onPress={onPress}
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
