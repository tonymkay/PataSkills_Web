import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, Spacing, Radius } from '@/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Placeholder for SkillGridCard, same footprint (48% flexBasis, square
 * aspect ratio) so the grid doesn't reflow once real cards swap in.
 * Shown while the skills catalog is still loading.
 */
export function SkillGridCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
      <Skeleton width="70%" height={16} style={styles.titleLine} />
      <View style={styles.illustrationWrap}>
        <Skeleton width={64} height={64} borderRadius={Radius.lg} />
      </View>
    </View>
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
  titleLine: {
    marginTop: Spacing.xs,
  },
  illustrationWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
});
