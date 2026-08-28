import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export type FeedbackState = 'idle' | 'correct' | 'incorrect';

interface CheckButtonProps {
  enabled: boolean;
  feedbackState: FeedbackState;
  onPress: () => void;
  label?: string;
}

export function CheckButton({
  enabled,
  feedbackState,
  onPress,
  label = 'CHECK',
}: CheckButtonProps) {
  const { colors } = useTheme();

  const feedbackOpacity = useSharedValue(0);
  const feedbackTranslateY = useSharedValue(8);
  const [lastFeedback, setLastFeedback] = React.useState<'correct' | 'incorrect'>('correct');

  // Trigger feedback banner when state changes
  useEffect(() => {
    if (feedbackState === 'correct' || feedbackState === 'incorrect') {
      setLastFeedback(feedbackState);
      feedbackOpacity.value = withTiming(1, { duration: 150 });
      feedbackTranslateY.value = withSpring(0, { damping: 14, stiffness: 220 });
    } else {
      feedbackOpacity.value = withTiming(0, { duration: 200 });
      feedbackTranslateY.value = withTiming(8, { duration: 200 });
    }
  }, [feedbackState, feedbackOpacity, feedbackTranslateY]);

  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
    transform: [{ translateY: feedbackTranslateY.value }],
  }));

  const handlePress = () => {
    if (!enabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  const activeState = feedbackState !== 'idle' ? feedbackState : lastFeedback;
  const isCorrect = activeState === 'correct';
  const feedbackText = isCorrect ? 'Correct' : 'Not Quite';
  const feedbackColor = isCorrect ? '#22C55E' : '#EF4444';

  return (
    <View style={styles.wrapper}>
      {/* Floating Popup Feedback Text */}
      <Animated.View pointerEvents="none" style={[styles.feedbackContainer, feedbackAnimatedStyle]}>
        <View
          style={[
            styles.feedbackBadge,
            { backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
          ]}
        >
          <Text style={[Typography.titleMedium, { color: feedbackColor, fontFamily: FontFamily.bold }]}>
            {feedbackText}
          </Text>
        </View>
      </Animated.View>

      {/* Main Check Button (No bounce, clean press) */}
      <Pressable
        onPress={handlePress}
        disabled={!enabled}
        style={({ pressed }) => [
          styles.button,
          enabled
            ? styles.activeButton
            : [styles.disabledButton, { backgroundColor: colors.surfaceContainerHigh || '#2A2E38' }],
          pressed && enabled ? styles.pressedButton : null,
        ]}
      >
        <Text
          style={[
            Typography.titleMedium,
            styles.buttonText,
            {
              color: enabled ? '#000000' : colors.onSurfaceVariant,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: Spacing.md,
  },
  feedbackContainer: {
    position: 'absolute',
    top: -38,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  feedbackBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  activeButton: {
    backgroundColor: '#FFFFFF',
  },
  pressedButton: {
    opacity: 0.85,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
