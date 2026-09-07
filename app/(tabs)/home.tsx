import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Typography } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { SkillProgressCard, deriveSkillProgressState } from '@/components/home/SkillProgressCard';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
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

  const loadSkills = useCallback(async () => {
    const catalogRows = await getCurriculaCatalog().catch(() => []);
    // Static LANDING_SKILLS entries first (so their display titles are
    // available even before the catalog resolves on a slow connection),
    // then any catalog-only row — same merge LandingScreen does for the
    // Skills grid, so a skill that exists purely as a play_curricula
    // insert still shows up here once it has progress.
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

    setSkills(withProgress.filter((s) => s.completedTopics > 0));
    setLoaded(true);
  }, []);

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
    // Resume straight into the session, skipping the learning-style/track
    // pickers — SkillsFlow's param-driven effect (see the comment on its
    // useEffect deps) picks this up and calls the same resume-from-
    // progress path a deep link would. 'full' matches what runDownload
    // already defaults to for an untracked resume; PlaySession still
    // resumes from the learner's actual saved topic index within it.
    router.push({ pathname: '/(tabs)/skills', params: { resume: 'true', skill: skill.slug } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loaded && skills.length === 0 ? (
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
});
