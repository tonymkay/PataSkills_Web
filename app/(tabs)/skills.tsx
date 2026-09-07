import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { AppHeader } from '@/components/nav/AppHeader';
import { SkillsFlow } from '@/components/play/SkillsFlow';

/**
 * "Skills" tab — the Skills Corner grid and everything downstream of it
 * (learning-style picker, track preview, download, session), unchanged
 * in behavior from the original single-route app/index.tsx. AppHeader
 * sits above it here (Step 4 — header shown on all four tabs), so
 * SkillsFlow is rendered `embedded` to skip its own top-inset padding.
 */
export default function SkillsTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <AppHeader />
      <SkillsFlow embedded />
    </View>
  );
}
