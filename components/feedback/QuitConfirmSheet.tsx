import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { getSheetGradient } from '@/constants/gradients';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuitConfirmSheetProps {
  visible: boolean;
  onKeepPlaying: () => void;
  onQuit: () => void;
}

/**
 * "Are you sure?" bottom sheet shown when the learner taps the X (top-left)
 * or presses the OS back button mid-quiz — quitting loses progress and XP.
 * Same shell/gradient/safe-area treatment as FeedbackSheet & LearnMoreSheet
 * (getSheetGradient, grabber handle, insets.bottom-aware bottom padding).
 */
export function QuitConfirmSheet({ visible, onKeepPlaying, onQuit }: QuitConfirmSheetProps) {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onKeepPlaying}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, { backgroundColor: StaticColors.backdropColor }, backdropStyle]}
          onPress={onKeepPlaying}
        />

        <Animated.View style={[styles.sheetWrapper, sheetStyle]}>
          <LinearGradient
            colors={sheetGrad.colors}
            start={sheetGrad.start}
            end={sheetGrad.end}
            style={[
              styles.sheet,
              {
                borderColor: isDark ? colors.outlineVariant : '#E2E8F0',
                paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
              },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
            </View>

            <Text style={[Typography.headlineSm, styles.title, { color: colors.onSurface }]}>
              Are you sure?
            </Text>
            <Text style={[Typography.bodyMd, styles.subtitle, { color: colors.onSurfaceVariant }]}>
              If you quit, you&apos;ll lose your progress and XP.
            </Text>

            <Pressable onPress={onKeepPlaying} style={styles.keepBtn}>
              <Text style={styles.keepBtnText}>KEEP PLAYING</Text>
            </Pressable>

            <Pressable onPress={onQuit} hitSlop={8} style={styles.quitBtn}>
              <Text style={[styles.quitBtnText, { color: colors.dangerRed }]}>QUIT</Text>
            </Pressable>
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
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: Radius.full,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  keepBtn: {
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: '#F8F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    color: '#1A1D24',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  quitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  quitBtnText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
