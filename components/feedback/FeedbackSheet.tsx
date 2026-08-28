import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { BrandGradients } from '@/constants/gradients';

/** The two visible faces of the feedback sheet (null = hidden). */
export type FeedbackSheetState = 'correct' | 'notquite' | null;

const GREEN = '#22C55E';
const AMBER = StaticColors.achievementAmber;

interface FeedbackSheetProps {
  state: FeedbackSheetState;
  xp: number;
  isFlagged?: boolean;
  onToggleFlag?: (flagged: boolean) => void;
  onTryAgain: () => void;
  onContinue: () => void;
  /** One-attempt mode: no XP, no "Try again" — Not quite goes straight to Continue. */
  assessment?: boolean;
}

export function FeedbackSheet({
  state,
  xp,
  isFlagged = false,
  onToggleFlag,
  onTryAgain,
  onContinue,
  assessment = false,
}: FeedbackSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const visible = state !== null;
  const y = useSharedValue(400);

  useEffect(() => {
    y.value = withTiming(visible ? 0 : 400, {
      duration: visible ? 320 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  if (!visible) return null;

  const isCorrect = state === 'correct';
  const accent = isCorrect ? GREEN : AMBER;
  const bg = isCorrect ? colors.correctBg : colors.categoryOrangeBg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.sheetWrapper,
          sheetStyle,
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: bg,
              paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
            },
          ]}
        >
        {/* Grabber */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
        </View>

        {/* Status row: pill (with XP count) + flag */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.pill,
              {
                borderColor: accent,
                backgroundColor: isCorrect
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(245,158,11,0.14)',
              },
            ]}
          >
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={accent}
            />
            <Text style={[Typography.titleMedium, { color: accent, marginLeft: 6 }]}>
              {isCorrect ? 'Correct' : 'Not Quite'}
            </Text>
            {isCorrect && !assessment && (
              <Text style={[Typography.labelLarge, { color: accent, marginLeft: Spacing.sm }]}>
                +{xp} XP
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => onToggleFlag?.(!isFlagged)}
            hitSlop={10}
            style={[
              styles.flagButton,
              {
                backgroundColor: isFlagged
                  ? 'rgba(242,113,39,0.15)'
                  : colors.surfaceContainerHigh,
                borderColor: isFlagged ? StaticColors.achievementAmber : colors.outlineVariant,
              },
            ]}
          >
            <Ionicons
              name={isFlagged ? 'flag' : 'flag-outline'}
              size={16}
              color={isFlagged ? StaticColors.achievementAmber : colors.onSurfaceVariant}
            />
          </Pressable>
        </View>

        {/* Action button */}
        {isCorrect || assessment ? (
          <Pressable onPress={onContinue} style={styles.ctaWrapper}>
            <LinearGradient
              colors={BrandGradients.discovery.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>CONTINUE</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={onTryAgain}
            style={[
              styles.ctaOutline,
              { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Text style={[styles.ctaOutlineText, { color: colors.onSurface }]}>TRY AGAIN</Text>
          </Pressable>
        )}
        </View>
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
    zIndex: 20,
    elevation: 20,
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
    gap: Spacing.gutter,
  },
  handleRow: {
    alignItems: 'center',
  },
  handle: {
    width: Spacing.xl,
    height: Spacing.xs,
    borderRadius: Radius.full,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.gutter,
  },
  flagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#0B3B31',
  },
  ctaOutline: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOutlineText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
  },
});
