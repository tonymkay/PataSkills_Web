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

      <Text style={[Typography.titleMedium, styles.title, { color: colors.onSurface }]}>
        {title}
      </Text>
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
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    minHeight: 92,
  },
  illustration: {
    width: 72,
    height: 72,
  },
  title: {
    flex: 1,
    fontSize: 18,
  },
});
