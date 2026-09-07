import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, Radius, Spacing, StaticColors, FontFamily } from '@/theme/tokens';

export interface SkillReportItem {
  slug: string;
  title: string;
  completedTopics: number;
  totalTopics: number;
  xp: number;
  missedCount: number;
}

function ProgressBar({ value, accent }: { value: number; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)' }]}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: accent }]} />
    </View>
  );
}

export function SkillReportCard({
  item,
  onOpenMistakes,
}: {
  item: SkillReportItem;
  onOpenMistakes: () => void;
}) {
  const { colors } = useTheme();
  const ratio = item.totalTopics > 0 ? Math.min(1, item.completedTopics / item.totalTopics) : 0;
  const levelLabel =
    item.completedTopics >= item.totalTopics && item.totalTopics > 0
      ? 'Completed'
      : item.totalTopics > 0
        ? `Topic ${item.completedTopics} of ${item.totalTopics}`
        : 'Overall progress';

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
      {/* Title & XP Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.xpText, { color: StaticColors.achievementAmber }]}>
          {item.xp} XP
        </Text>
      </View>

      {/* Level Label & Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={[styles.levelLabel, { color: colors.onSurfaceVariant }]}>
          {levelLabel}
        </Text>
        <View style={styles.progressBarRow}>
          <View style={styles.barWrap}>
            <ProgressBar value={ratio} accent={colors.tealAccent || StaticColors.tealAccent} />
          </View>
          <Text style={[styles.pctText, { color: colors.onSurfaceVariant }]}>
            {Math.round(ratio * 100)}%
          </Text>
        </View>
      </View>

      {/* Missed Questions Row */}
      <Pressable
        onPress={onOpenMistakes}
        style={({ pressed }) => [
          styles.mistakesBtn,
          { backgroundColor: colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)' },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.mistakesBtnText, { color: colors.onSurface }]}>
          Missed Questions
        </Text>
        {item.missedCount > 0 && (
          <View style={styles.missedBadge}>
            <Text style={styles.missedBadgeText}>{item.missedCount}</Text>
          </View>
        )}
        <ChevronRight size={22} color={colors.onSurface} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  xpText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  progressSection: {
    gap: Spacing.sm,
  },
  levelLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
  },
  barWrap: {
    flex: 1,
  },
  progressTrack: {
    height: 9,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  pctText: {
    width: 44,
    textAlign: 'right',
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  mistakesBtn: {
    height: 60,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mistakesBtnText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  missedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: '#F2274C',
  },
  missedBadgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
});
