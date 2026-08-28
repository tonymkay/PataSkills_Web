import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Spacing } from '@/constants/spacing';

interface FlagIconProps {
  isFlagged?: boolean;
  onToggle?: (flagged: boolean) => void;
  size?: number;
}

export function FlagIcon({ isFlagged = false, onToggle, size = 20 }: FlagIconProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    onToggle?.(!isFlagged);
  };

  const activeColor = colors.warningOrange || '#F59E0B';
  const inactiveColor = colors.onSurfaceVariant;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[
        styles.container,
        {
          backgroundColor: isFlagged ? 'rgba(242, 113, 39, 0.15)' : colors.surfaceContainerHigh,
          borderColor: isFlagged ? activeColor : colors.outlineVariant,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isFlagged ? 'Flagged question' : 'Flag question'}
    >
      <Ionicons
        name={isFlagged ? 'flag' : 'flag-outline'}
        size={size}
        color={isFlagged ? activeColor : inactiveColor}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
