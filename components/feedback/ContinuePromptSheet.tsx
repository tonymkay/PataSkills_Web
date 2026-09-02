import React, { useEffect, useState } from 'react';
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
import { getSheetGradient, BrandGradients } from '@/constants/gradients';
import { StaticColors } from '@/constants/colors';
import { Toggle } from '@/components/ui/Toggle';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ContinuePromptSheetProps {
  visible: boolean;
  /** Label of the mode the learner just finished a topic in, e.g. "reading
   *  mode" — used to phrase the heading naturally when provided. */
  onYesContinue: (dontShowAgain: boolean) => void;
  onNoSwitch: (dontShowAgain: boolean) => void;
}

/**
 * Shown right after a topic completes (on top of the topicComplete /
 * "Great Progress!" screen) — asks whether to keep going in the current
 * learning mode or switch to a different one. A "Don't show this again"
 * checkbox is remembered per-mode; checking it does NOT close the sheet by
 * itself — the learner still picks Yes or No, that choice is just the last
 * time they'll be asked for this mode.
 */
export function ContinuePromptSheet({ visible, onYesContinue, onNoSwitch }: ContinuePromptSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 400, {
      duration: visible ? 320 : 180,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: visible ? 220 : 150 });
    if (visible) setDontShowAgain(false);
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
      onRequestClose={() => onYesContinue(dontShowAgain)}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <AnimatedPressable style={[StyleSheet.absoluteFill, { backgroundColor: StaticColors.backdropColor }, backdropStyle]} />

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
              Do more questions like this?
            </Text>

            <Pressable onPress={() => onYesContinue(dontShowAgain)} style={styles.yesBtnWrap}>
              <LinearGradient
                colors={BrandGradients.discovery.colors}
                start={BrandGradients.discovery.start}
                end={BrandGradients.discovery.end}
                style={styles.yesBtn}
              >
                <Text style={styles.yesBtnText}>YES, CONTINUE</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => onNoSwitch(dontShowAgain)}
              style={[styles.noBtn, { borderColor: colors.outlineVariant }]}
            >
              <Text style={[styles.noBtnText, { color: colors.onSurfaceVariant }]}>
                NO, I&apos;D LIKE TO SWITCH
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDontShowAgain((v) => !v)}
              style={styles.dontShowRow}
              hitSlop={6}
            >
              <Text style={[styles.dontShowLabel, { color: colors.onSurfaceVariant }]}>
                Don&apos;t show this again
              </Text>
              <Toggle value={dontShowAgain} onValueChange={setDontShowAgain} />
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
    zIndex: 40,
    elevation: 40,
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
    marginBottom: Spacing.md,
  },
  yesBtnWrap: {
    marginBottom: Spacing.sm,
  },
  yesBtn: {
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesBtnText: {
    color: '#0B0D12',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  noBtn: {
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBtnText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  dontShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  dontShowLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
});
