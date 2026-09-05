import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, BrandGradients } from '@/theme/tokens';
import { getTrackOptionsForSkill } from '@/constants/trackOptions';
import { LANDING_SKILLS } from '@/constants/skills';
import { getLocalProgress } from '@/lib/progress';
import { Track } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import { Button } from '@/components/ui/Button';

// Matches the session chunk size in utils/groupSessions.ts (chunkIntoSessions
// / chunkSignsIntoSessions both slice into groups of 7) — the number of
// questions the learner will actually see once they tap Start Practice.
const QUESTIONS_PER_SESSION = 7;

// Matches LearningStyleScreen's width cap so the flow reads consistently
// end to end (landing grid -> learning-style list -> this page).
const CONTENT_MAX_WIDTH = 480;

interface TrackDetailScreenProps {
  /** Which skill this preview belongs to — resolves the right title,
   *  subtitle, and cover illustration. */
  skillId: CurriculumSlug;
  track: Track | null;
  onStartPractice: (track: Track) => void;
  onBack: () => void;
}

/**
 * Full-page single-track preview (title, progress, source skill,
 * illustration) with "Start Practice" as the CTA — reached by picking a
 * style on LearningStyleScreen or via a ?track= deep link straight from
 * LandingScreen. Was previously a bottom sheet (TrackDetailSheet); moved to
 * a real page with the preview as a plain card so mobile-browser toolbar
 * quirks can't clip the CTA the way a fixed-position sheet could.
 */
export function TrackDetailScreen({ skillId, track, onStartPractice, onBack }: TrackDetailScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState({ completedTopics: 0, totalTopics: 46 });

  useEffect(() => {
    getLocalProgress().then(setProgress).catch(() => {});
  }, []);

  if (!track) return null;

  const skill = LANDING_SKILLS.find((s) => s.id === skillId) ?? LANDING_SKILLS[0];
  const trackOptions = getTrackOptionsForSkill(skill);
  const option = trackOptions.find((o) => o.track === track) ?? trackOptions[0];
  const skillSubtitle = skill.subtitle;
  const pct = progress.totalTopics > 0 ? progress.completedTopics / progress.totalTopics : 0;
  const filledDots = Math.min(QUESTIONS_PER_SESSION, Math.round(pct * QUESTIONS_PER_SESSION));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHigh },
          ]}
        >
          <Text style={[styles.title, { color: colors.onSurface }]}>{option.label}</Text>

          <Text style={[styles.subtitle, { color: colors.tealAccent || '#2BD9C4' }]}>
            {skillSubtitle}
          </Text>

          <View style={styles.illustrationWrap}>
            <Image source={option.image} style={styles.illustration} resizeMode="contain" />
          </View>

          <View style={styles.dotsRow}>
            {Array.from({ length: QUESTIONS_PER_SESSION }).map((_, i) =>
              i < filledDots ? (
                <LinearGradient
                  key={i}
                  colors={BrandGradients.discovery.colors}
                  start={BrandGradients.discovery.start}
                  end={BrandGradients.discovery.end}
                  style={styles.dot}
                />
              ) : (
                <View key={i} style={[styles.dot, { backgroundColor: colors.surfaceContainerHigh }]} />
              ),
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Button
          label="Start Practice"
          onPress={() => onStartPractice(track)}
          variant="gradient"
          gradientColors={BrandGradients.discovery.colors}
          gradientStart={{ x: 0, y: 0 }}
          gradientEnd={{ x: 1, y: 1 }}
          textColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.gutter,
  },
  backButton: {
    padding: Spacing.xs,
  },
  scroll: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  illustration: {
    width: 220,
    height: 220,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 28,
    height: 8,
    borderRadius: Radius.full,
  },
  ctaContainer: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
  },
});
