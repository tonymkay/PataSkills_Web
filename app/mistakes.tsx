import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, IconSize, StaticColors, FontFamily } from '@/theme/tokens';
import { getSkillMistakes, type MistakeItem } from '@/lib/mistakes';
import { MistakeCard } from '@/components/reports/MistakeCard';

export default function MistakesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ skillId?: string; skillName?: string }>();
  const skillId = params.skillId || '';
  const skillName = params.skillName || 'Skill';

  const [items, setItems] = useState<MistakeItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unsolved'>('all');
  const [loading, setLoading] = useState(true);

  const loadMistakes = useCallback(async () => {
    if (!skillId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getSkillMistakes(skillId);
    setItems(list);
    setLoading(false);
  }, [skillId]);

  useFocusEffect(
    useCallback(() => {
      void loadMistakes();
    }, [loadMistakes])
  );

  const displayedItems =
    filter === 'unsolved' ? items.filter((item) => !item.solved) : items;

  const unsolvedCount = items.filter((item) => !item.solved).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ─── Top Header ─── */}
      <View style={[styles.headerRow, { borderBottomColor: colors.outlineVariant }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]} numberOfLines={1}>
            Mistake Overview
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {skillName}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ─── Filter Tabs ─── */}
      {items.length > 0 && (
        <View style={[styles.filterBar, { borderBottomColor: colors.outlineVariant }]}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[
              styles.filterTab,
              filter === 'all' && [styles.filterTabActive, { borderColor: StaticColors.tealAccent }],
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === 'all' ? StaticColors.tealAccent : colors.onSurfaceVariant },
              ]}
            >
              All ({items.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('unsolved')}
            style={[
              styles.filterTab,
              filter === 'unsolved' && [styles.filterTabActive, { borderColor: '#F2274C' }],
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === 'unsolved' ? '#F2274C' : colors.onSurfaceVariant },
              ]}
            >
              Unsolved ({unsolvedCount})
            </Text>
          </Pressable>
        </View>
      )}

      {/* ─── Content ─── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? null : displayedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle2 size={56} color={StaticColors.successLime} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              {filter === 'unsolved' && items.length > 0
                ? 'All mistakes mastered!'
                : 'No mistakes recorded yet!'}
            </Text>
            <Text style={[Typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              {filter === 'unsolved' && items.length > 0
                ? 'You have successfully answered all previous mistakes.'
                : `Questions you answer incorrectly in ${skillName} will appear here for review.`}
            </Text>
          </View>
        ) : (
          displayedItems.map((item) => <MistakeCard key={item.questionId} item={item} />)
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.marginMobile,
    borderBottomWidth: 1,
    gap: Spacing.base,
  },
  filterTab: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    marginTop: Spacing.sm,
  },
});
