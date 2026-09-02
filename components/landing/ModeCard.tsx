import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography } from '@/theme/tokens';

interface ModeCardProps {
  icon: LucideIcon;
  /** When set, this skill thumbnail (borrowed from the landing SkillCard
   * illustration) is shown instead of `icon` — used for the non-resume
   * rows so every mode reads as belonging to the same skill. */
  imageUri?: string;
  title: string;
  highlighted?: boolean;
  onPress: () => void;
}

/**
 * One learning-mode option on the mode-picker page (shown after tapping a
 * SkillCard) — bordered row card with a lucide icon and title only, no
 * secondary description (kept the list scannable). Replaces the old flat
 * pill-button list. `highlighted` marks the resume/primary option with the
 * brand-teal accent.
 */
export function ModeCard({ icon: Icon, imageUri, title, highlighted, onPress }: ModeCardProps) {
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
      <View style={[styles.iconWrap, { backgroundColor: highlighted ? teal : colors.surfaceContainerHigh }]}>
        {imageUri && !highlighted ? (
          <Image source={{ uri: imageUri }} style={styles.iconImage} resizeMode="contain" />
        ) : (
          <Icon size={20} color={highlighted ? '#10141A' : colors.onSurface} />
        )}
      </View>

      <Text style={[Typography.titleMedium, styles.title, { color: colors.onSurface }]}>
        {title}
      </Text>

      <ChevronRight size={18} color={colors.onSurfaceVariant || '#9CA3AF'} />
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
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 28,
    height: 28,
  },
  title: {
    flex: 1,
  },
});
