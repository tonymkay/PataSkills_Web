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
 * landing screen. The "Get started" button opens the track/mode picker for
 * this skill — the card itself isn't tappable, so there's one clear target.
 */
export function SkillCard({ skill, completedTopics, totalTopics, onPress }: SkillCardProps) {
  const { colors } = useTheme();
  const progressFraction = totalTopics > 0 ? completedTopics / totalTopics : 0;
  const progressPercent = Math.min(100, Math.round(progressFraction * 100));

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surfaceContainerLow,
        },
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

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.ctaBtn,
          { backgroundColor: colors.tealAccent || '#2BD9C4' },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <Text style={styles.ctaBtnText}>{completedTopics > 0 ? 'RESUME SESSION' : 'GET STARTED'}</Text>
      </Pressable>
    </View>
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
  ctaBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
