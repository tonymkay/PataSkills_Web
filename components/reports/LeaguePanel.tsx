import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, Radius, Spacing, StaticColors, FontFamily } from '@/theme/tokens';
import { LEAGUES, leagueIndexFor } from '@/lib/leagues';

const trophyArt = require('@/assets/profile/trophy.webp');

function ProgressBar({ value, accent = StaticColors.achievementAmber }: { value: number; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)' }]}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: accent }]} />
    </View>
  );
}

export function LeaguePanel({ xp, onViewLeaderboard }: { xp: number; onViewLeaderboard?: () => void }) {
  const { colors } = useTheme();
  const index = leagueIndexFor(xp);
  const current = LEAGUES[index] || LEAGUES[0];

  let nextIdx = index + 1;
  let previousIdx = index - 1;
  if (previousIdx < 0) {
    nextIdx = index + 1;
    previousIdx = index + 2;
  } else if (nextIdx > LEAGUES.length - 1) {
    nextIdx = index - 1;
    previousIdx = index - 2;
  }
  const next = LEAGUES[nextIdx];
  const previous = LEAGUES[previousIdx];
  const bandProgress = current.max ? (xp - current.min) / (current.max - current.min) : 1;

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surfaceContainerLow,
        },
      ]}
    >
      <Text style={[styles.xpText, { color: StaticColors.achievementAmber }]}>
        {xp} XP
      </Text>

      <View style={styles.trophiesRow}>
        {/* Current League Trophy (Full Color) */}
        <View style={styles.trophyCol}>
          <Image source={trophyArt} style={styles.trophyLarge} contentFit="contain" />
          <Text style={[styles.leagueLabel, { color: colors.onSurface }]} numberOfLines={1}>
            {current.name}
          </Text>
        </View>

        {/* Next League Trophy (Tinted) */}
        {next && (
          <View style={styles.trophyCol}>
            <Image source={trophyArt} style={styles.trophySmall} contentFit="contain" tintColor={colors.outlineVariant} />
            <Text style={[styles.leagueLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              {next.name}
            </Text>
          </View>
        )}

        {/* Previous League Trophy (Tinted) */}
        {previous && (
          <View style={styles.trophyCol}>
            <Image source={trophyArt} style={styles.trophySmall} contentFit="contain" tintColor={colors.outlineVariant} />
            <Text style={[styles.leagueLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              {previous.name}
            </Text>
          </View>
        )}
      </View>

      <ProgressBar value={bandProgress} />

      {onViewLeaderboard && (
        <Pressable
          onPress={onViewLeaderboard}
          style={({ pressed }) => [
            styles.leaderboardBtn,
            { backgroundColor: colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)' },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.leaderboardBtnText, { color: colors.onSurfaceVariant }]}>
            View Leaderboard
          </Text>
          <ChevronRight size={22} color={colors.onSurface} strokeWidth={2.6} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  xpText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  trophiesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  trophyCol: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  trophyLarge: {
    width: 54,
    height: 54,
  },
  trophySmall: {
    width: 46,
    height: 46,
  },
  leagueLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  progressTrack: {
    height: 9,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  leaderboardBtn: {
    height: 60,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  leaderboardBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
});
