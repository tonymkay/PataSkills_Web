import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, Spacing, IconSize, FontFamily } from '@/theme/tokens';
import { getSkillMistakes, type MistakeItem } from '@/lib/mistakes';
import { MistakeCard } from '@/components/reports/MistakeCard';

/**
 * Mistake Overview Screen — matches PataSkillsV2's Mistakes screen 1:1.
 * Header with ChevronLeft and centered "Mistake Overview", clean scrollable list
 * of MistakeCard items, and friendly empty state.
 */
export default function MistakesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { skillId, skillName } = useLocalSearchParams<{ skillId?: string; skillName?: string }>();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MistakeItem[]>([]);

  const load = useCallback(async () => {
    if (!skillId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const mistakes = await getSkillMistakes(skillId);
    setItems(mistakes);
    setLoading(false);
  }, [skillId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
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
          Mistake Overview
        </Text>
        <View style={styles.headerSide} />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              No mistakes yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              {`Missed questions for ${skillName || 'this skill'} will show up here.`}
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {items.map((item) => (
              <MistakeCard key={item.questionId || item.number} item={item} />
            ))}
          </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingBox: {
    paddingTop: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    paddingTop: Spacing.xxl * 1.5,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 20,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  listWrap: {
    gap: Spacing.md,
  },
});
