import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, Radius, Spacing, FontFamily } from '@/theme/tokens';

export function StatCard({
  icon,
  value,
  suffix,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  suffix?: string;
  label: string;
  accent: string;
}) {
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
      <View style={styles.topRow}>
        <Text style={[styles.number, { color: accent }]}>
          {value}
        </Text>
        {suffix ? (
          <Text style={[styles.suffix, { color: accent }]}>
            {suffix}
          </Text>
        ) : null}
      </View>
      <View style={styles.iconWrap}>
        {icon}
      </View>
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 170,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing.gutter,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minHeight: 34,
  },
  number: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  suffix: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    marginLeft: Spacing.xs,
  },
  iconWrap: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    textAlign: 'center',
  },
});
