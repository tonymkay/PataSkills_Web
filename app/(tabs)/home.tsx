import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Typography, FontFamily } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { SkillProgressCard, deriveSkillProgressState } from '@/components/home/SkillProgressCard';
import { SkillProgressCardSkeleton } from '@/components/home/SkillProgressCardSkeleton';
import { ChallengeCornerCard } from '@/components/home/ChallengeCornerCard';
import { getCurriculaCatalog, getCachedCurricula } from '@/lib/curriculaCatalog';
import { getLocalProgress } from '@/lib/progress';
import { LANDING_SKILLS } from '@/constants/skills';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

interface HomeSkillEntry {
  slug: string;
  title: string;
  completedTopics: number;
  totalTopics: number;
}

/**
 * "Home" tab. Lists a card for every skill the learner has any local
 * progress on (completedTopics > 0), across every skill in the DB-backed
 * catalog (play_curricula), not just the four static LANDING_SKILLS —
 * same source LandingScreen already uses for the Skills grid. Tapping a
 * card resumes that skill exactly where it left off; a 100%-complete
 * card instead opens Reports, since there's nothing left to resume.
 */
export default function HomeTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [skills, setSkills] = useState<HomeSkillEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const buildSkillsList = useCallback(async (catalogRows: { slug: string; title: string }[]) => {
    const staticIds = new Set(LANDING_SKILLS.map((s) => s.id));
    const candidates: { slug: string; title: string }[] = [
      ...LANDING_SKILLS.map((s) => ({
        slug: s.id,
        title: catalogRows.find((r) => r.slug === s.id)?.title ?? s.subtitle,
      })),
      ...catalogRows.filter((r) => !staticIds.has(r.slug as CurriculumSlug)).map((r) => ({ slug: r.slug, title: r.title })),
    ];

    const withProgress = await Promise.all(
      candidates.map(async (c) => {
        const progress = await getLocalProgress(c.slug);
        return { ...c, completedTopics: progress.completedTopics, totalTopics: progress.totalTopics };
      }),
    );

    return withProgress.filter((s) => s.completedTopics > 0);
  }, []);

  const loadSkills = useCallback(async () => {
    // Local-first paint: getLocalProgress is pure AsyncStorage (fast, and
    // works offline). getCurriculaCatalog() is a Supabase network call —
    // previously this whole card sat behind `await getCurriculaCatalog()`
    // before any progress was even read, which is why it sometimes never
    // showed up (or showed up late) on a slow/offline connection even
    // though the progress itself was already sitting on-device.
    // getCachedCurricula() is synchronous — whatever the catalog already
    // resolved to earlier this session (e.g. LandingScreen's own fetch),
    // or [] if nothing has landed yet. Either way we paint immediately
    // with static titles as the fallback.
    const cachedCatalog = getCachedCurricula();
    const first = await buildSkillsList(cachedCatalog);
    setSkills(first);
    setLoaded(true);

    // Now reconcile with a fresh catalog fetch in the background — picks
    // up catalog-only skills and any title changes, without having ever
    // blocked first paint on it.
    const freshCatalog = await getCurriculaCatalog().catch(() => cachedCatalog);
    if (freshCatalog !== cachedCatalog) {
      const reconciled = await buildSkillsList(freshCatalog);
      setSkills(reconciled);
    }
  }, [buildSkillsList]);

  // Refresh every time Home regains focus, not just on first mount —
  // this tab stays mounted under expo-router's <Tabs>, so a session
  // completed via the Skills tab (or resumed from a card here) needs a
  // fresh read of AsyncStorage progress each time the learner tabs back,
  // not a stale snapshot from whenever Home first mounted.
  useFocusEffect(
    useCallback(() => {
      void loadSkills();
    }, [loadSkills]),
  );

  const handleCardPress = (skill: HomeSkillEntry) => {
    const { state } = deriveSkillProgressState(skill.completedTopics, skill.totalTopics);
    if (state === 'completed') {
      router.push('/(tabs)/reports');
      return;
    }
    // Resume straight into the session in the dedicated full-screen play route
    // (outside tabs so no bottom tab bar is visible) — SkillsFlow's param-driven
    // effect picks this up and resumes the session directly.
    router.push({ pathname: '/play', params: { resume: 'true', skill: skill.slug } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ChallengeCornerCard />
        <Text style={[styles.heading, { color: colors.onSurface }]}>
          My Skills
        </Text>
        {!loaded ? (
          <>
            <SkillProgressCardSkeleton />
            <SkillProgressCardSkeleton />
          </>
        ) : skills.length === 0 ? (
          <Text style={[Typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            Finish your first topic in Skills to see your progress here.
          </Text>
        ) : (
          skills.map((skill) => (
            <SkillProgressCard
              key={skill.slug}
              title={skill.title}
              completedTopics={skill.completedTopics}
              totalTopics={skill.totalTopics}
              onPress={() => handleCardPress(skill)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  heading: {
    fontFamily: FontFamily.regular,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'left',
    marginBottom: Spacing.xs,
  },
});
