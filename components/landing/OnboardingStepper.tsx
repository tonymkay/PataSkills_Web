import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, BrandGradients } from '@/theme/tokens';

const TOTAL_STEPS = 3;

/** How long a segment takes to animate between fill states. Each
 *  onboarding screen waits this long after its primary action is tapped
 *  before actually advancing, so the fill visibly completes before the
 *  screen transitions away — keep the two in sync. */
export const STEPPER_FILL_DURATION = 350;

/** Baseline fill for the current (not-yet-completed) step — a sliver of
 *  progress so it reads as "you are here", distinct from an untouched
 *  future step sitting at 0%. */
const ACTIVE_BASELINE = 0.1;

/** One segment's track + animated gradient fill (borrowed from
 *  pataskillsv2's app/onboarding ProgressStepper — same withTiming fill
 *  animation). `value` is 0–1; the shared value is seeded directly from
 *  it on mount (no animate-in), so a fresh screen shows its completed/
 *  baseline segments instantly and only animates when `value` changes
 *  on an already-mounted instance (i.e. the active segment filling to
 *  100% right before the screen advances). */
function Segment({ value }: { value: number }) {
  const { colors } = useTheme();
  const w = useSharedValue(value);

  useEffect(() => {
    w.value = withTiming(value, { duration: STEPPER_FILL_DURATION });
  }, [value, w]);

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
 * returning users past the first unlock never see it.
 *
 * `index` is the current step (0-based). Steps before it render fully
 * filled (completed). The step at `index` sits at a 10% baseline until
 * the host screen flips `activating` true — the moment its card/CTA is
 * tapped — at which point it animates to 100%; the host then advances to
 * the next stage, whose own mount starts its own current step back at
 * the 10% baseline. Steps after `index` stay empty.
 */
export function OnboardingStepper({
  index,
  activating = false,
  total = TOTAL_STEPS,
}: {
  index: number;
  /** True for the moment between the primary action being tapped and
   *  the host screen actually advancing — fills the current segment to
   *  100% instead of the 10% baseline. */
  activating?: boolean;
  total?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.xs, width: '100%' }}>
      {Array.from({ length: total }).map((_, i) => {
        const value = i < index ? 1 : i === index ? (activating ? 1 : ACTIVE_BASELINE) : 0;
        return <Segment key={i} value={value} />;
      })}
    </View>
  );
}
