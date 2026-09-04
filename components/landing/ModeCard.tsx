import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, type ImageSourcePropType } from 'react-native';
import { useTheme, Spacing, Radius, Typography } from '@/theme/tokens';

interface ModeCardProps {
  /** Illustration from assets/driving/ (or a remote hero image for tracks
   *  with no local asset, e.g. 'full'). Always shown as-is — no icon
   *  swap for the highlighted state, just a border/tint change. */
  image: ImageSourcePropType;
  title: string;
  highlighted?: boolean;
  onPress: () => void;
}

/**
 * One learning-mode row in ModeSwitcherSheet — illustration + title, no
 * chevron. `highlighted` marks the current mode (always sorted first by
 * the sheet) with the brand-teal border/tint; the illustration and label
 * are otherwise identical to every other row.
 */
export function ModeCard({ image, title, highlighted, onPress }: ModeCardProps) {
  const { colors } = useTheme();
  const teal = colors.tealAccent || '#2BD9C4';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: highlighted ? teal : colors.outlineVariant,
          backgroundColor: highlighted ? 'rgba(43,217,196,0.10)' : colors.surfaceContainerLow,
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Image source={image} style={styles.illustration} resizeMode="contain" />

      <View style={styles.titleRow}>
        <Text style={[Typography.titleMedium, styles.title, { color: colors.onSurface }]}>
          {title}
        </Text>
        {highlighted ? (
          <View style={[styles.currentBadge, { backgroundColor: teal }]}>
            <Text style={styles.currentBadgeText}>CURRENT</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  illustration: {
    width: 88,
    height: 88,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 18,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#0B3B31',
  },
});
