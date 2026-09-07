import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Toggle } from '@/components/ui/Toggle';
import { ChevronRight } from 'lucide-react-native';

/* ─── SectionHeader ─── */

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: colors.onSurfaceVariant }]}>
      {title}
    </Text>
  );
}

/* ─── SettingsRow ─── */

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Danger styling (e.g. Log out) — label rendered in the danger red. */
  danger?: boolean;
}

export function SettingsRow({ icon, label, value, onPress, danger }: SettingsRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surfaceContainerLow },
        pressed && onPress ? { opacity: 0.8 } : undefined,
      ]}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text
          style={[
            styles.rowLabel,
            { color: danger ? '#F2274C' : colors.onSurface },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress ? <ChevronRight size={18} color={colors.onSurfaceVariant} /> : null}
      </View>
    </Pressable>
  );
}

/* ─── SettingsToggleRow ─── */

interface SettingsToggleRowProps {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeColor?: string;
}

export function SettingsToggleRow({ icon, label, value, onValueChange, activeColor }: SettingsToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, { color: colors.onSurface }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} activeColor={activeColor} />
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  sectionHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.gutter,
    paddingHorizontal: Spacing.gutter,
    borderRadius: Radius.lg,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  rowLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowValue: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 150,
  },
});
