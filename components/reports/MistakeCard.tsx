import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, StaticColors, FontFamily } from '@/theme/tokens';
import type { MistakeItem } from '@/lib/mistakes';

interface MistakeCardProps {
  item: MistakeItem;
}

export function MistakeCard({ item }: MistakeCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLow,
          borderColor: item.solved ? (colors.outlineVariant || '#2B313E') : '#422428',
        },
      ]}
    >
      {/* Header: Question number + Solved / Mistake status */}
      <View style={styles.headerRow}>
        <View style={styles.qNumRow}>
          <Text style={[styles.qNumText, { color: colors.onSurfaceVariant }]}>
            Question {item.number}
          </Text>
          {item.solved && (
            <View style={styles.solvedBadge}>
              <CheckCircle2 size={13} color={StaticColors.successLime} />
              <Text style={styles.solvedText}>Mastered</Text>
            </View>
          )}
        </View>

        <View style={[styles.mistakeBadge, { backgroundColor: 'rgba(242, 39, 76, 0.14)' }]}>
          <Text style={styles.mistakeBadgeText}>
            {item.mistakeCount} {item.mistakeCount === 1 ? 'MISTAKE' : 'MISTAKES'}
          </Text>
        </View>
      </View>

      {/* Question prompt */}
      <Text style={[styles.questionText, { color: colors.onSurface }]}>
        {item.question}
      </Text>

      {/* Correct answer section */}
      <View
        style={[
          styles.answerBanner,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        <Text style={[styles.answerLabel, { color: colors.onSurfaceVariant }]}>
          Correct answer:
        </Text>
        <Text style={[styles.answerValue, { color: StaticColors.tealAccent }]}>
          {item.correctAnswer}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  qNumText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(43, 217, 196, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  solvedText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: StaticColors.successLime,
  },
  mistakeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  mistakeBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#F2274C',
    letterSpacing: 0.4,
  },
  questionText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  answerBanner: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  answerLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  answerValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
});
