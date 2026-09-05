import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { consumeNavDirection } from '@/lib/navDirection';

const screenWidth = Dimensions.get('window').width;

// Wrap the root of a routed screen (keys-packs, keys-confirm, how-keys-work,
// subscription-plans, subscription-confirm, premium-benefits,
// how-free-mode-works, payment-complete) with this so it slides in from the
// correct side on web — right for a forward push, left for a back
// navigation — matching the native-stack animation these screens already
// get for free on iOS/Android.
//
// Deliberately NOT using Reanimated's SlideInLeft/SlideInRight presets:
// those are built on its layout-animation system, whose web
// implementation doesn't reliably tell left and right apart — both ended
// up looking identical in testing. Driving a single translateX manually
// with useAnimatedStyle/withTiming is the well-supported cross-platform
// primitive, so direction is guaranteed correct.
//
// Native is untouched: app/_layout.tsx's Stack already animates it
// correctly there via native-stack, so hooks below are inert (translateX
// starts and stays at 0) and this renders children directly.
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const isWeb = Platform.OS === 'web';
  const [direction] = useState(() => consumeNavDirection());
  const translateX = useSharedValue(isWeb ? (direction === 'backward' ? -screenWidth : screenWidth) : 0);

  useEffect(() => {
    if (!isWeb) return;
    translateX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    // Mount-only: this is the screen's one entrance, not a value that
    // should re-run on prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!isWeb) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={[styles.flex, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
