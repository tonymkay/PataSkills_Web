import React, { useCallback } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { peekNavDirection, resetNavDirection } from '@/lib/navDirection';

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
// correctly there via native-stack, so the effect below is inert on native
// (translateX starts and stays at 0) and this renders children directly.
//
// Driven by FOCUS, not mount: expo-router's native-stack (react-navigation
// under the hood) does not unmount a screen when you navigate away from it —
// the previous screen stays alive underneath and just loses focus. So going
// "back" to it is not a fresh mount, and a mount-only effect (useState
// initializer / useEffect([])) never fires again for it — that was the bug:
// forward always remounted a brand-new screen and animated correctly, back
// silently animated nothing (or reused stale state), which read as "the same
// as forward" / "back never changes". useFocusEffect fires on every focus,
// mount or not, so both directions are driven identically and correctly.
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const isWeb = Platform.OS === 'web';
  const translateX = useSharedValue(0);
  // Read live, not via a module-scope Dimensions.get() snapshot: on the
  // very first screen the app loads (app/index.tsx), this module can
  // evaluate before the web view has committed layout, so a one-time
  // Dimensions.get('window').width can be 0/stale — the slide then runs
  // from 0 to 0 and is invisible. Every screen reached by navigating (not
  // loaded first) mounts after hydration, so the static value happened to
  // be correct there, masking the bug. useWindowDimensions re-renders with
  // the real width once layout is known, on every screen including this one.
  const { width: screenWidth } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      if (!isWeb) return;
      const direction = peekNavDirection();
      resetNavDirection();
      translateX.value = direction === 'backward' ? -screenWidth : screenWidth;
      translateX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      // No cleanup needed: nothing to tear down between focus/blur here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isWeb, screenWidth])
  );

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
