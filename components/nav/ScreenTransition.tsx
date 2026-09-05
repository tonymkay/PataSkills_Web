import React, { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, { SlideInRight, SlideInLeft, FadeOut } from 'react-native-reanimated';
import { consumeNavDirection } from '@/lib/navDirection';

// Wrap the root of a routed screen (keys-packs, keys-confirm, how-keys-work,
// subscription-plans, subscription-confirm, premium-benefits,
// how-free-mode-works, payment-complete) with this so it slides in from the
// correct side on web — right for a forward push, left for a back
// navigation — matching the native-stack animation these screens already
// get for free on iOS/Android.
//
// Native is untouched: app/_layout.tsx's Stack already animates it
// correctly there, so this just passes children through to avoid a double
// animation.
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const [direction] = useState(() => consumeNavDirection());

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={styles.flex}
      entering={direction === 'backward' ? SlideInLeft.duration(280) : SlideInRight.duration(280)}
      exiting={FadeOut.duration(180)}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
