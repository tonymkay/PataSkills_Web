import { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { areTabsUnlocked } from '@/lib/progress';
import { SkillsFlow } from '@/components/play/SkillsFlow';
import { GetStartedScreen } from '@/components/onboarding/GetStartedScreen';
import { useTheme } from '@/theme/ThemeContext';

const LOGO = require('@/assets/images/icon-dark.png');

/**
 * Root gate. Pre-unlock, this renders the Skills Corner flow directly (no
 * tab bar), matching the app's original single-route behavior exactly.
 * Once a learner hits topicComplete for the first time on any skill (see
 * unlockTabsIfNeeded() in lib/progress.ts), every future launch redirects
 * straight into the tabbed shell's Home tab instead. This flag never
 * re-locks — see the routing restructure section of the tabbed-home plan.
 */
export default function RootGate() {
  const { colors } = useTheme();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  // Gates GetStartedScreen -> SkillsFlow, pre-unlock only. Local to this
  // mount — SkillsFlow's own stage transitions never navigate away from
  // '/', so this doesn't need to survive a remount.
  const [getStartedTapped, setGetStartedTapped] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      areTabsUnlocked().then((value) => {
        if (mounted) setUnlocked(value);
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  // Still checking AsyncStorage — logo + theme background only, same
  // splash shown on every cold launch regardless of unlock state.
  if (unlocked === null) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background || '#0B0D12' }]}>
        <Image source={LOGO} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
  }

  if (unlocked) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (!getStartedTapped) {
    return <GetStartedScreen onGetStarted={() => setGetStartedTapped(true)} />;
  }

  return <SkillsFlow isOnboarding />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
});
