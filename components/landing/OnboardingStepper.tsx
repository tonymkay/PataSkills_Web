import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, BrandGradients } from '@/theme/tokens';

const TOTAL_STEPS = 3;

/** One segment's track + animated gradient fill (borrowed from
 *  pataskillsv2's app/onboarding ProgressStepper — same withTiming fill
 *  animation, simplified to a binary filled/unfilled state since each
 *  step here is a whole screen, not a per-question answer). */
function Segment({ filled }: { filled: boolean }) {
  const { colors } = useTheme();
  const w = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    w.value = withTiming(filled ? 1 : 0, { duration: 350 });
  }, [filled, w]);

  const animStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View
      style={{
        flex: 1,
        height: Spacing.xs,
        borderRadius: Radius.full,
        backgroundColor: colors.surfaceContainerHigh,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: Radius.full }, animStyle]}>
        <LinearGradient
          colors={BrandGradients.discovery.colors}
          start={BrandGradients.discovery.start}
          end={BrandGradients.discovery.end}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * First-run-only step indicator for the Skills Corner funnel: Choose a
 * skill (0) -> Choose Learning Style (1) -> Differentiate Pairs/track
 * detail (2). Rendered by SkillsFlow's three onboarding-stage screens
 * only when `isOnboarding` is true (see app/index.tsx's root gate) —
 * returning users past the first unlock never see it. `index` is the
 * current step (0-based); every step up to and including it renders
 * filled.
 */
export function OnboardingStepper({ index, total = TOTAL_STEPS }: { index: number; total?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.xs, width: '100%' }}>
      {Array.from({ length: total }).map((_, i) => (
        <Segment key={i} filled={i <= index} />
      ))}
    </View>
  );
}
