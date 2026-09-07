import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Zap, KeyRound, Trophy, ChevronRight, BarChart3, AlertCircle } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, IconSize, StaticColors } from '@/theme/tokens';
import { FontFamily } from '@/constants/typography';
import { AppHeader } from '@/components/nav/AppHeader';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { getLocalProgress } from '@/lib/progress';
import { getKeyBalance } from '@/lib/keys';
import { getTotalXp, getSkillXp } from '@/lib/xp';
import { getStreakData } from '@/lib/streak';
import { getSkillMistakesCount } from '@/lib/mistakes';
import { LANDING_SKILLS } from '@/constants/skills';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

// Days-of-week labels for the calendar strip (Mon to Sun)
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

interface SkillReportEntry {
  slug: string;
  title: string;
  completedTopics: number;
  totalTopics: number;
  xp: number;
  missedCount: number;
}

/**
 * "Reports" tab — displays live learner analytics:
 * - Day Streak & Total XP stat cards
 * - 7-day Monday–Sunday activity calendar
 * - Keys balance linking to the Keys tab
 * - League Tier panel based on XP
 * - Per-skill progress report cards with XP and Missed Questions drill-down
 */
export default function ReportsTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [keyBalance, setKeyBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weekDays, setWeekDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [totalXp, setTotalXp] = useState(0);
  const [skills, setSkills] = useState<SkillReportEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      // Refresh key balance
      getKeyBalance().then(setKeyBalance).catch(() => {});

      // Refresh streak and week activity
      getStreakData().then((data) => {
        setStreak(data.currentStreak);
        setWeekDays(data.weekDays);
      }).catch(() => {});

      // Refresh total XP
      getTotalXp().then(setTotalXp).catch(() => {});

      // Refresh skill reports
      (async () => {
        const catalogRows = await getCurriculaCatalog().catch(() => []);
        const staticIds = new Set(LANDING_SKILLS.map((s) => s.id));
        const candidates: { slug: string; title: string }[] = [
          ...LANDING_SKILLS.map((s) => ({
            slug: s.id,
            title: catalogRows.find((r) => r.slug === s.id)?.title ?? s.subtitle,
          })),
          ...catalogRows
            .filter((r) => !staticIds.has(r.slug as CurriculumSlug))
            .map((r) => ({ slug: r.slug, title: r.title })),
        ];

        const withProgress = await Promise.all(
          candidates.map(async (c) => {
            const [progress, xp, missedCount] = await Promise.all([
              getLocalProgress(c.slug),
              getSkillXp(c.slug),
              getSkillMistakesCount(c.slug),
            ]);
            return {
              ...c,
              completedTopics: progress.completedTopics,
              totalTopics: progress.totalTopics,
              xp,
              missedCount,
            };
          }),
        );

        // Show skills with progress or with XP/misses recorded
        setSkills(withProgress.filter((s) => s.completedTopics > 0 || s.xp > 0 || s.missedCount > 0));
      })();
    }, []),
  );

  const pctFor = (s: SkillReportEntry) =>
    s.totalTopics > 0 ? Math.min(100, Math.round((s.completedTopics / s.totalTopics) * 100)) : 0;

  // League tier based on XP
  const leagueTier = totalXp >= 750 ? 'Gold' : totalXp >= 250 ? 'Silver' : 'Bronze';
  const tierColor = totalXp >= 750 ? StaticColors.achievementAmber : totalXp >= 250 ? '#C0C0C0' : '#CD7F32';
  const targetXp = totalXp >= 750 ? 1500 : totalXp >= 250 ? 750 : 250;
  const leaguePct = Math.min(100, Math.round((totalXp / targetXp) * 100));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Two stat cards side-by-side ─── */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Flame size={28} color={StaticColors.achievementAmber} />
            <Text style={[styles.statNumber, { color: colors.onSurface }]}>{streak}</Text>
            <Text style={[styles.statCaption, { color: colors.onSurfaceVariant }]}>
              {streak === 1 ? 'Day Streak' : 'Day Streak'}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Zap size={28} color={StaticColors.successLime} />
            <Text style={[styles.statNumber, { color: colors.onSurface }]}>{totalXp}</Text>
            <Text style={[styles.statCaption, { color: colors.onSurfaceVariant }]}>Total XP</Text>
          </View>
        </View>

        {/* ─── 7-day calendar strip ─── */}
        <View style={[styles.weekRow, { backgroundColor: colors.surfaceContainerLow }]}>
          {DAY_LABELS.map((day, i) => {
            const isActive = weekDays[i];
            return (
              <View key={i} style={styles.dayCell}>
                <Text style={[styles.dayLabel, { color: colors.onSurfaceVariant }]}>{day}</Text>
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: isActive ? StaticColors.successLime : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isActive ? StaticColors.successLime : colors.outlineVariant,
                      borderWidth: isActive ? 0 : 1,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* ─── Keys balance row ─── */}
        <Pressable
          onPress={() => router.push('/(tabs)/keys')}
          style={({ pressed }) => [
            styles.keysRow,
            { backgroundColor: colors.surfaceContainerLow },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.keysLeft}>
            <KeyRound size={IconSize.header} color={StaticColors.achievementAmber} />
            <Text style={[Typography.titleMedium, { color: colors.onSurface }]}>
              {keyBalance} Keys
            </Text>
          </View>
          <ChevronRight size={20} color={colors.onSurfaceVariant} />
        </Pressable>

        {/* ─── League / XP panel ─── */}
        <View style={[styles.leaguePanel, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <View style={styles.leagueHeader}>
            <Trophy size={24} color={tierColor} />
            <Text style={[Typography.titleMedium, { color: colors.onSurface, marginLeft: Spacing.base }]}>
              {leagueTier} League
            </Text>
            <Text style={[Typography.labelSmall, { color: tierColor, marginLeft: 'auto' }]}>
              {totalXp} / {targetXp} XP
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.outlineVariant, marginVertical: Spacing.xs }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${leaguePct}%`,
                  backgroundColor: tierColor,
                },
              ]}
            />
          </View>

          <Text style={[Typography.bodySmall, { color: colors.onSurfaceVariant }]}>
            {totalXp >= 750
              ? 'You have reached the premier Gold tier!'
              : `Earn ${targetXp - totalXp} more XP to advance to ${leagueTier === 'Bronze' ? 'Silver' : 'Gold'} league.`}
          </Text>
        </View>

        {/* ─── Per-skill report cards ─── */}
        {skills.length > 0 && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>
              Skill Reports
            </Text>
            {skills.map((skill) => {
              const pct = pctFor(skill);
              return (
                <View
                  key={skill.slug}
                  style={[styles.reportCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}
                >
                  <View style={styles.reportCardTop}>
                    <BarChart3 size={20} color={StaticColors.tealAccent} />
                    <Text style={[Typography.titleMedium, { color: colors.onSurface, flex: 1, marginLeft: Spacing.base }]} numberOfLines={1}>
                      {skill.title}
                    </Text>
                    <Text style={[styles.skillXpBadge, { color: StaticColors.achievementAmber }]}>
                      {skill.xp} XP
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={[styles.progressTrack, { backgroundColor: colors.outlineVariant }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: pct >= 100 ? StaticColors.tealAccent : StaticColors.successLime,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.reportCardStats}>
                    <Text style={[Typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                      {skill.completedTopics}/{skill.totalTopics} topics ({pct}%)
                    </Text>
                    <Pressable
                      style={[
                        styles.missedBtn,
                        skill.missedCount > 0 && { borderColor: 'rgba(242, 39, 76, 0.4)' },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/mistakes',
                          params: { skillId: skill.slug, skillName: skill.title },
                        })
                      }
                    >
                      <AlertCircle
                        size={14}
                        color={skill.missedCount > 0 ? '#F2274C' : colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          Typography.labelSmall,
                          {
                            color: skill.missedCount > 0 ? '#F2274C' : colors.onSurfaceVariant,
                            marginLeft: 4,
                          },
                        ]}
                      >
                        {skill.missedCount > 0
                          ? `${skill.missedCount} Missed`
                          : 'Mistakes'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {skills.length === 0 && (
          <View style={styles.emptyState}>
            <BarChart3 size={48} color={colors.outlineVariant} />
            <Text style={[Typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.md }]}>
              Complete sessions in Skills to see your reports and mistakes here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const DAY_DOT_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  /* ─── Stat cards ─── */
  statRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  statCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },

  /* ─── 7-day calendar strip ─── */
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  dayCell: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  dayDot: {
    width: DAY_DOT_SIZE,
    height: DAY_DOT_SIZE,
    borderRadius: DAY_DOT_SIZE / 2,
  },

  /* ─── Keys balance row ─── */
  keysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  keysLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },

  /* ─── League / XP panel ─── */
  leaguePanel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ─── Skill reports ─── */
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },
  reportCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  reportCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillXpBadge: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  reportCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  /* ─── Empty state ─── */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
});
