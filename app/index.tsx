import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { areTabsUnlocked } from '@/lib/progress';
import { SkillsFlow } from '@/components/play/SkillsFlow';
import { useTheme } from '@/theme/ThemeContext';

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

  useEffect(() => {
    let mounted = true;
    areTabsUnlocked().then((value) => {
      if (mounted) setUnlocked(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Still checking AsyncStorage — render a plain themed background rather
  // than either branch below, so there's no flash of the wrong one.
  if (unlocked === null) {
    return <View style={{ flex: 1, backgroundColor: colors.background || '#0B0D12' }} />;
  }

  if (unlocked) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <SkillsFlow />;
}
