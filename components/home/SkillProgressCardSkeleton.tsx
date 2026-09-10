import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, Spacing, Radius } from '@/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';

const ARROW_BTN_SIZE = 36;

/**
 * Placeholder for SkillProgressCard, same footprint (status label row +
 * arrow button, title, segmented progress row) so Home doesn't jump once
 * real local progress resolves and swaps in. Home shows at most 2 of
 * these while loading.
 */
export function SkillProgressCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
      <View style={styles.topRow}>
        <Skeleton width={90} height={14} />
        <Skeleton width={ARROW_BTN_SIZE} height={ARROW_BTN_SIZE} borderRadius={Radius.full} />
      </View>

      <Skeleton width="55%" height={22} style={styles.title} />

      <View style={styles.segmentRow}>
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} height={4} borderRadius={Radius.sm} style={styles.segment} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.gutter,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: Spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.md,
  },
  segment: {
    flex: 1,
  },
});
