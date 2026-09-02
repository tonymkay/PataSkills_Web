import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, Typography, FontFamily } from '@/theme/tokens';
import { LandingIllustration } from './LandingIllustration';
import type { LandingSkill } from '@/constants/skills';

interface SkillCardProps {
  skill: LandingSkill;
  completedTopics: number;
  totalTopics: number;
  onPress: () => void;
}

/**
 * One skill's homepage card — bordered container (borrowed from
 * PataSkillsV2's components/home/SkillHeroPager.tsx card shape) holding the
 * title, progress, and illustration that used to sit directly on the
 * landing screen. Tapping it opens the track/mode picker for this skill.
 */
export function SkillCard({ skill, completedTopics, totalTopics, onPress }: SkillCardProps) {
  const { colors } = useTheme();
  const progressFraction = totalTopics > 0 ? completedTopics / totalTopics : 0;
  const progressPercent = Math.min(100, Math.round(progressFraction * 100));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surfaceContainerLow,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text style={[Typography.headlineXl, styles.title, { color: colors.onSurface }]}>
        {skill.title}
      </Text>

      {completedTopics > 0 ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressSegment, { backgroundColor: '#2B303C' }]}>
            <View
              style={{
                height: '100%',
                width: `${Math.max(4, progressPercent)}%`,
                borderRadius: Radius.full,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#2BD964', '#2BD9C4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </View>
        </View>
      ) : null}

      <Text
        style={[
          Typography.bodyLg,
          styles.subtitle,
          {
            color: colors.tealAccent || '#2BD9C4',
            marginTop: completedTopics > 0 ? Spacing.sm : Spacing.md,
          },
        ]}
      >
        {completedTopics > 0 ? `${completedTopics}/${totalTopics} topics done` : skill.subtitle}
      </Text>

      <View style={styles.illustrationWrap}>
        <LandingIllustration />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 2,
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.gutter,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    lineHeight: 38,
  },
  progressTrack: {
    flexDirection: 'row',
    width: '56%',
    marginTop: Spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 5.5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  illustrationWrap: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
