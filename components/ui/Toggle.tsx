import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StaticColors } from '@/constants/colors';
import { useTheme } from '@/theme/ThemeContext';

const W = 44;
const H = 26;
const THUMB = 20;
const PAD = 3;
const ON_X = W - THUMB - PAD;

export function Toggle({
  value,
  onValueChange,
  activeColor = StaticColors.tealAccent || '#2BD9C4',
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeColor?: string;
}) {
  const { colors } = useTheme();
  const tx = useSharedValue(value ? ON_X : PAD);

  useEffect(() => {
    tx.value = withTiming(value ? ON_X : PAD, { duration: 160 });
  }, [value, tx]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <View
        style={[
          styles.track,
          {
            backgroundColor: value ? activeColor : (colors.surfaceContainerHigh || '#374151'),
          },
        ]}
      >
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
