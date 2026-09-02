import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, FontFamily } from '@/theme/tokens';

interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlighted?: boolean;
  onPress: () => void;
}

/**
 * One learning-mode option on the mode-picker page (shown after tapping a
 * SkillCard) — bordered row card with a lucide icon, title, and short
 * description. Replaces the old flat pill-button list. `highlighted` marks
 * the resume/primary option with the brand-teal accent.
 */
export function ModeCard({ icon: Icon, title, description, highlighted, onPress }: ModeCardProps) {
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
        <Icon size={20} color={highlighted ? '#10141A' : colors.onSurface} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[Typography.titleMedium, styles.title, { color: colors.onSurface }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.onSurfaceVariant || '#9CA3AF' }]}>
          {description}
        </Text>
      </View>

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
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
