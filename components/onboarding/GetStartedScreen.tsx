/**
 * Pre-onboarding "Get Started" screen — shown once, after the logo splash,
 * only while the learner hasn't completed onboarding yet (areTabsUnlocked()
 * === false). Tapping Get Started moves into the existing SkillsFlow
 * (Landing -> LearningStyle -> TrackDetail -> Session); it does NOT itself
 * mark onboarding done — that still only happens at first topicComplete
 * (see lib/progress.ts unlockTabsIfNeeded()).
 */
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, FontFamily, Spacing } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';
import { FlashcardStack } from './FlashcardStack';

const LOGO = require('@/assets/images/icon-dark.png');

interface GetStartedScreenProps {
  onGetStarted: () => void;
}

export function GetStartedScreen({ onGetStarted }: GetStartedScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#0B0D12',
          paddingTop: Math.max(insets.top, Spacing.xl),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
        },
      ]}
    >
      <View style={styles.top}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.heading, { color: colors.onSurface }]}>
          Learn with{'\n'}Questions
        </Text>
      </View>

      <FlashcardStack />

      <View style={styles.bottom}>
        <Button label="Get Started" onPress={onGetStarted} uppercase={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  bottom: {
    width: '100%',
  },
});
