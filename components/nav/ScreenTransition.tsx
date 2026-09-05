import React, { useCallback, useRef } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { peekNavDirection, resetNavDirection } from '@/lib/navDirection';

export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const isWeb = Platform.OS === 'web';
  const translateX = useSharedValue(0);
  const { width: liveWidth } = useWindowDimensions();
  const widthRef = useRef(liveWidth);
  widthRef.current = liveWidth;

  useFocusEffect(
    useCallback(() => {
      if (!isWeb) return;
      const direction = peekNavDirection();
      resetNavDirection();
      const screenWidth = widthRef.current;
      translateX.value = direction === 'backward' ? -screenWidth : screenWidth;
      translateX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    }, [isWeb])
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
