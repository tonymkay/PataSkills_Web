import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Info } from 'lucide-react-native';
import { useTheme, Radius, Spacing, FontFamily } from '@/theme/tokens';
import { LeaderboardRow } from './LeaderboardRow';
import type { LeaderboardData } from '@/lib/leaderboard';

const ROW_HEIGHT = 60;
const ROW_GAP = Spacing.xs;
const VISIBLE_ROWS = 3;
const LIST_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT + (VISIBLE_ROWS - 1) * ROW_GAP + Spacing.xs * 2;

export function LeagueCard({
  data,
  onInfo,
  title,
  emptyLabel = 'No learners in this league yet.',
  fillHeight = false,
}: {
  data: LeaderboardData;
  onInfo?: () => void;
  title?: string;
  emptyLabel?: string;
  fillHeight?: boolean;
}) {
  const { colors } = useTheme();
  const entries = data.entries;
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);

  const displayTitle = title || (data.tier ? `${data.tier.name} League` : 'Leaderboard');

  const scrollToMe = () => {
    if (didInitialScroll.current) return;
    const myIndex = entries.findIndex((e) => e.isCurrentUser);
    if (myIndex < 0) return;
    didInitialScroll.current = true;
    const offset = Math.max(0, (myIndex - 1) * (ROW_HEIGHT + ROW_GAP));
    scrollRef.current?.scrollTo({ y: offset, animated: false });
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surfaceContainerLow,
          flex: fillHeight ? 1 : undefined,
        },
      ]}
    >
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.06)' },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.onSurface }]} numberOfLines={1}>
          {displayTitle}
        </Text>
        {onInfo && (
          <Pressable onPress={onInfo} hitSlop={12} style={styles.infoBtn}>
            <Info size={24} color={colors.onSurface} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      {/* Rows List */}
      {entries.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          {emptyLabel}
        </Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={fillHeight ? styles.fillList : { height: LIST_HEIGHT }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={entries.length > VISIBLE_ROWS}
          onContentSizeChange={scrollToMe}
        >
          {entries.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  headerBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  infoBtn: {
    padding: Spacing.xs,
  },
  fillList: {
    flex: 1,
  },
  listContent: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.gutter,
    gap: ROW_GAP,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
});
