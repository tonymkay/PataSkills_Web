import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, Radius, Spacing, StaticColors, FontFamily } from '@/theme/tokens';
import { Avatar } from './Avatar';
import type { LeaderboardEntry } from '@/lib/leaderboard';

const HIGHLIGHT_BG = 'rgba(43,217,100,0.15)';
const ACTIVE_BORDER = StaticColors.selection?.activeBorder || '#2BD964';

function StatusDot({ dot }: { dot: NonNullable<LeaderboardEntry['dot']> }) {
  const { colors } = useTheme();
  const color =
    dot === 'done'
      ? ACTIVE_BORDER
      : dot === 'frozen'
        ? colors.onSurfaceVariant
        : StaticColors.achievementAmber;

  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const { colors } = useTheme();
  const on = entry.isCurrentUser;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: on ? HIGHLIGHT_BG : 'transparent',
          borderColor: on ? ACTIVE_BORDER : 'transparent',
          opacity: entry.dot === 'frozen' ? 0.6 : 1,
        },
      ]}
    >
      {/* Rank */}
      <Text style={[styles.rankText, { color: on ? ACTIVE_BORDER : colors.onSurface }]}>
        {entry.rank}
      </Text>

      {/* Avatar */}
      <Avatar name={entry.name} size={42} imageUrl={entry.imageUrl} />

      {/* Name */}
      <Text style={[styles.nameText, { color: colors.onSurface }]} numberOfLines={1}>
        {entry.name}
      </Text>

      {/* Dot */}
      {entry.dot && <StatusDot dot={entry.dot} />}

      {/* XP */}
      <Text style={[styles.xpText, { color: colors.onSurfaceVariant }]}>
        {`${entry.xp}XP`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 60,
    paddingHorizontal: Spacing.gutter,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  rankText: {
    width: 24,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  nameText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
  },
  xpText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: Radius.full,
  },
});
