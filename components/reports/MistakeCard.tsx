import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, Radius, Spacing, StaticColors, FontFamily } from '@/theme/tokens';
import type { MistakeItem } from '@/lib/mistakes';

export interface MistakeCardProps {
  item: MistakeItem;
}

function MistakeCountBadge({ count }: { count: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.badgeWrap}>
      <View style={[styles.badgeLine, { backgroundColor: colors.outlineVariant }]} />
      <View
        style={[
          styles.badgePill,
          { backgroundColor: StaticColors.wrongChipBg },
        ]}
      >
        <Text style={[styles.badgeText, { color: StaticColors.wrongChipLetterBg }]}>
          {`${count} MISTAKE${count === 1 ? '' : 'S'}`}
        </Text>
      </View>
    </View>
  );
}

function MistakeAnswerBody({ item }: { item: MistakeItem }) {
  const { colors } = useTheme();

  return (
    <View style={styles.answerWrap}>
      <Text style={[styles.answerLabel, { color: colors.onSurfaceVariant }]}>
        Correct answer is:
      </Text>
      <Text style={[styles.answerText, { color: colors.primary || StaticColors.tealAccent }]}>
        {item.correctAnswer}
      </Text>
    </View>
  );
}

/**
 * One missed question card — matches PataSkillsV2's MistakeCard 1:1.
 */
export function MistakeCard({ item }: MistakeCardProps) {
  const { colors } = useTheme();

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
      <Text style={[styles.questionNum, { color: StaticColors.wrongChipBg }]}>
        {`Question ${item.number}`}
      </Text>
      <Text style={[styles.questionPrompt, { color: colors.onSurface }]} numberOfLines={3}>
        {item.question}
      </Text>

      <MistakeCountBadge count={item.mistakeCount} />
      <MistakeAnswerBody item={item} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  questionNum: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  questionPrompt: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  badgeWrap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  badgeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    marginTop: -0.5,
  },
  badgePill: {
    alignSelf: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  answerWrap: {
    gap: 4,
    alignSelf: 'stretch',
  },
  answerLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  answerText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
