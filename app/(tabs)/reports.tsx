import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, Typography, FontFamily, StaticColors } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { StatCard, WeekCalendarRow, LeaguePanel, SkillReportCard, type SkillReportItem, type DayMark } from '@/components/reports';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { getLocalProgress } from '@/lib/progress';
import { getKeyBalance } from '@/lib/keys';
import { getTotalXp, getSkillXp } from '@/lib/xp';
import { getStreakData } from '@/lib/streak';
import { getSkillMistakesCount } from '@/lib/mistakes';
import { LANDING_SKILLS } from '@/constants/skills';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

const streakArt = require('@/assets/homepage/streak.webp');
const rechargeArt = require('@/assets/homepage/recharge.webp');
const keyArt = require('@/assets/premium/key.webp');

/**
 * "Reports" tab — matches the layout, design system, and assets of
 * PataSkillsV2's Profile tab:
 *  - AppHeader (Avatar + learner name + settings gear)
 *  - 2-column StatCard row (Max Streak with streak.webp, Recharges with recharge.webp)
 *  - WeekCalendarRow (4-day strip with today highlighted and progress track)
 *  - "My Keys" full-width link row (key balance + How Keys Work)
 *  - LeaguePanel (amber XP + 3-tier trophy row + progress bar)
 *  - Per-skill progress report cards with XP, progress bar & Missed Questions drill-down
 */
export default function ReportsTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [keyBadge, setKeyBadge] = useState<string>('0');
  const [maxStreak, setMaxStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [weekMarks, setWeekMarks] = useState<DayMark[]>(['active', 'future', 'future', 'future', 'future', 'future', 'future']);
  const [todayIndex, setTodayIndex] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [skills, setSkills] = useState<SkillReportItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      // 1. Refresh key balance
      getKeyBalance()
        .then((balance) => setKeyBadge(balance === Infinity ? '∞' : String(balance)))
        .catch(() => {});

      // 2. Refresh streak & calendar
      getStreakData().then((data) => {
        setMaxStreak(data.maxStreak || data.currentStreak);
        // currentStreak from getStreakData() excludes today unless today's
        // session is already done. The calendar strip always shows today's
        // slot as green regardless of completion, so pad by 1 in that case
        // so the green-box count matches what's actually being displayed.
        setCurrentStreak(data.todayActive ? data.currentStreak : data.currentStreak + 1);

        const now = new Date();
        const tIdx = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        setTodayIndex(tIdx);

        const marks: DayMark[] = data.weekDays.map((active, i) => {
          if (active) return 'done';
          if (i === tIdx) return data.todayActive ? 'done' : 'active';
          if (i > tIdx) return 'future';
          return 'none';
        });
        setWeekMarks(marks);
      }).catch(() => {});

      // 3. Refresh total XP
      getTotalXp().then(setTotalXp).catch(() => {});

      // 4. Refresh skill reports
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

        const progressed = withProgress.filter((s) => s.completedTopics > 0 || s.xp > 0 || s.missedCount > 0);
        // If learner has no progress yet, show first 2 skills so cards are visible
        setSkills(progressed.length > 0 ? progressed : withProgress.slice(0, 2));
      })();
    }, []),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* Stat Cards Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<Image source={streakArt} style={styles.streakImage} contentFit="contain" />}
            value={String(maxStreak)}
            suffix="DAYS"
            label="Max Streak"
            accent={StaticColors.successLime}
          />
          <StatCard
            icon={<Image source={rechargeArt} style={styles.rechargeImage} contentFit="contain" />}
            value={keyBadge}
            label="Recharges"
            accent={StaticColors.achievementAmber}
          />
        </View>

        {/* 4-Day Calendar Strip */}
        <WeekCalendarRow week={weekMarks} todayIndex={todayIndex} currentStreak={currentStreak} />

        {/* My Keys Entry Row */}
        <Pressable
          onPress={() => router.push('/how-keys-work')}
          style={({ pressed }) => [
            styles.keysQuestRow,
            {
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLow,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.keysCount, { color: StaticColors.achievementAmber }]}>{keyBadge}</Text>
          <Image
            source={keyArt}
            style={styles.keysIcon}
            contentFit="contain"
          />
          <View style={styles.keysTextCol}>
            <Text style={[styles.keysTitle, { color: colors.onSurface }]}>My Keys</Text>
            <Text style={[styles.keysSubtitle, { color: colors.onSurfaceVariant }]}>How Keys work</Text>
          </View>
          <ChevronRight size={24} color={colors.onSurface} strokeWidth={2.6} />
        </Pressable>

        {/* XP League Panel with Trophies */}
        <LeaguePanel
          xp={totalXp}
          onViewLeaderboard={() => router.push('/leaderboard')}
        />

        {/* Per-Skill Progress & Mistake Drill-Down Cards */}
        <View style={styles.skillsSection}>
          {skills.map((item) => (
            <SkillReportCard
              key={item.slug}
              item={item}
              onOpenMistakes={() =>
                router.push({
                  pathname: '/mistakes',
                  params: { skillId: item.slug, skillName: item.title },
                })
              }
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  streakImage: {
    width: 72,
    height: 72,
  },
  rechargeImage: {
    width: 64,
    height: 64,
  },
  keysQuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  keysCount: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 36,
  },
  keysIcon: {
    width: 34,
    height: 34,
    marginLeft: Spacing.sm,
    marginRight: Spacing.md,
  },
  keysTextCol: {
    flex: 1,
    gap: 2,
  },
  keysTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  keysSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  skillsSection: {
    gap: Spacing.md,
  },
});
