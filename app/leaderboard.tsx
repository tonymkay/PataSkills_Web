import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, Spacing, IconSize, FontFamily, Radius, StaticColors } from '@/theme/tokens';
import { LeagueCard, LeagueSheet } from '@/components/profile';
import { fetchLeaderboard, fetchLeagueBoard, emptyLeaderboard, type LeaderboardData, type LeagueTier } from '@/lib/leaderboard';
import { getTotalXp } from '@/lib/xp';

/**
 * Dedicated Leaderboard Screen — matches PataSkillsV2's Leaderboard screen 1:1.
 * Displays the current league tier card filled to height, signed-in learner row
 * auto-centered in view, info button opening LeagueSheet trophy carousel, and
 * tier browsing.
 */
export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [myXp, setMyXp] = useState(0);
  const [data, setData] = useState<LeaderboardData>(() => emptyLeaderboard(0));
  const [leagueSheetVisible, setLeagueSheetVisible] = useState(false);
  const [viewedLeague, setViewedLeague] = useState<LeaderboardData | null>(null);

  const loadData = useCallback(async () => {
    const xp = await getTotalXp().catch(() => 0);
    setMyXp(xp);
    const board = await fetchLeaderboard(xp);
    setData(board);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setViewedLeague(null);
      void loadData();
    }, [loadData]),
  );

  const handleViewLeague = useCallback(
    (tier: LeagueTier) => {
      fetchLeagueBoard(tier, myXp).then(setViewedLeague).catch(() => {});
    },
    [myXp],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: colors.outlineVariant,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerSide}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2.6} />
          </Pressable>
        </View>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          Leaderboard
        </Text>
        <View style={styles.headerSide} />
      </View>

      {/* Main Board Content */}
      <View style={[styles.boardWrap, { paddingBottom: Math.max(insets.bottom, Spacing.base) }]}>
        {viewedLeague ? (
          <>
            <LeagueCard
              data={viewedLeague}
              title={`${viewedLeague.tier.name} League`}
              onInfo={() => setLeagueSheetVisible(true)}
              fillHeight
            />
            <Pressable
              onPress={() => setViewedLeague(null)}
              style={styles.backToMineLink}
            >
              <Text style={[styles.backToMineText, { color: colors.primary || StaticColors.tealAccent }]}>
                Back to my board
              </Text>
            </Pressable>
          </>
        ) : (
          <LeagueCard
            data={data}
            onInfo={() => setLeagueSheetVisible(true)}
            fillHeight
          />
        )}
      </View>

      {/* League Trophy Carousel Sheet */}
      <LeagueSheet
        visible={leagueSheetVisible}
        myXp={myXp}
        onViewLeague={handleViewLeague}
        onClose={() => setLeagueSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerSide: {
    width: IconSize.header,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  boardWrap: {
    flex: 1,
    padding: Spacing.marginMobile,
    gap: Spacing.xs,
  },
  backToMineLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  backToMineText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
