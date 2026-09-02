import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface ScrollHintChevronProps {
  visible: boolean;
  onPress: () => void;
  /** Animated transform style from useScrollHint()'s hintAnimatedStyle. */
  style?: any;
}

/** Bouncing "more content below" chevron, shared by every card deck. */
export function ScrollHintChevron({ visible, onPress, style }: ScrollHintChevronProps) {
  if (!visible) return null;
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.button}>
      <Animated.View style={[styles.bubble, style]}>
        <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
  },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
