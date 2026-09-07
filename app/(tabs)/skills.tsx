import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { AppHeader } from '@/components/nav/AppHeader';
import { LandingScreen } from '@/components/landing/LandingScreen';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import type { Track } from '@/lib/curriculum';

/**
 * "Skills" tab — displays strictly the 2-column grid ("Skills Corner").
 * Tapping any skill or restoring progress navigates to `/play`
 * (a dedicated full-screen route outside the tab shell), ensuring no
 * bottom tab bar obstructs gameplay, quizzes, or payment buttons.
 */
export default function SkillsTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleStart = (skillId: CurriculumSlug) => {
    router.push({ pathname: '/play', params: { skill: skillId } });
  };

  const handleRestore = (track: Track) => {
    router.push({ pathname: '/play', params: { track } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <AppHeader />
      <LandingScreen
        onStart={handleStart}
        onRestore={handleRestore}
        bottomPadding={Math.max(insets.bottom, 16) + 80}
      />
    </View>
  );
}

