import React, { useEffect } from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Spacing, Radius } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { getSheetGradient } from '@/constants/gradients';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max height as a fraction of viewport height, e.g. 0.6 for 60%. Web only —
   * native sheets stay content-sized (scroll internally if children are tall). */
  maxHeightPercent?: number;
  /** Dismiss on backdrop tap. Defaults to true. */
  dismissOnBackdropPress?: boolean;
  showHandle?: boolean;
}

/**
 * Shared bottom-sheet primitive — the shell/animation/safe-area treatment
 * from QuitConfirmSheet / FeedbackSheet / LearnMoreSheet, extracted so every
 * sheet in the app (challenge results, select-a-skill, etc.) gets the same
 * rounded top corners, backdrop, and mobile/web width+height handling
 * instead of each screen rolling its own.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeightPercent = 0.6,
  dismissOnBackdropPress = true,
  showHandle = true,
}: BottomSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 400, {
      duration: visible ? 320 : 180,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: visible ? 220 : 150 });
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  const sheetGrad = getSheetGradient(isDark);
  // Web has no OS-driven viewport clamp, so a tall sheet can otherwise run
  // past the screen — clamp it explicitly there. Native lets content define
  // height (it's already constrained by the device viewport).
  const webMaxHeight = Platform.OS === 'web' ? Dimensions.get('window').height * maxHeightPercent : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, { backgroundColor: StaticColors.backdropColor }, backdropStyle]}
          onPress={dismissOnBackdropPress ? onClose : undefined}
        />

        <Animated.View style={[styles.sheetWrapper, sheetStyle]}>
          <LinearGradient
            colors={sheetGrad.colors}
            start={sheetGrad.start}
            end={sheetGrad.end}
            style={[
              styles.sheet,
              webMaxHeight ? { maxHeight: webMaxHeight } : null,
              { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md) },
            ]}
          >
            {showHandle && (
              <View style={styles.handleRow}>
                <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
              </View>
            )}
            <View style={styles.contentClamp}>{children}</View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 30,
    elevation: 30,
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    overflow: 'hidden',
  },
  contentClamp: {
    flexShrink: 1,
    minHeight: 0,
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: Spacing.xl,
    height: Spacing.xs,
    borderRadius: Radius.full,
  },
});
