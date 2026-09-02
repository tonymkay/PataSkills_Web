import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Radius, Spacing } from '@/constants/spacing';
import { useTheme } from '@/theme/ThemeContext';

const DOT = Spacing.base; // 8
const GAP = Spacing.sm; // 12
const STEP = DOT + GAP;

/**
 * Carousel dots for the homepage skill pager (borrowed from PataSkillsV2's
 * components/home/CarouselDots.tsx). Simplified — no 5-dot windowing, since
 * this app ships a handful of skills at most for the foreseeable future;
 * add windowing back here if that stops being true. The active dot slides
 * to the focused index; inactive dots are static.
 */
export function CarouselDots({ total, index }: { total: number; index: number }) {
  const { colors } = useTheme();
  if (total < 1) return null;

  const tx = useSharedValue(index * STEP);
  useEffect(() => {
    tx.value = withTiming(index * STEP, { duration: 260 });
  }, [index, tx]);
  const activeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <View style={{ width: total * DOT + (total - 1) * GAP, height: DOT, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', gap: GAP, position: 'absolute' }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              width: DOT,
              height: DOT,
              borderRadius: Radius.full,
              backgroundColor: colors.surfaceContainerHigh,
            }}
          />
        ))}
      </View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: DOT,
            height: DOT,
            borderRadius: Radius.full,
            backgroundColor: colors.tealAccent || '#2BD9C4',
          },
          activeStyle,
        ]}
      />
    </View>
  );
}
