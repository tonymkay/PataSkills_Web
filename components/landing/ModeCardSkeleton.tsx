import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, Spacing, Radius } from '@/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Placeholder for ModeCard, same footprint (illustration + title/status
 * block + segmented progress row) so the list doesn't jump once real
 * track data (totals/progress) resolves and swaps in.
 */
export function ModeCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.row}>
        <Skeleton width={88} height={88} borderRadius={Radius.md} />
        <View style={styles.titleCol}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <View style={styles.progressRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} height={6} borderRadius={Radius.full} style={styles.segment} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titleCol: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: Spacing.sm,
  },
  segment: {
    flex: 1,
  },
});
