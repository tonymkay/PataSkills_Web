import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { BrandGradients, getSheetGradient } from '@/constants/gradients';
import { QuizQuestion } from '@/types/quiz';

const { height: SCREEN_H } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LearnMoreSheetProps {
  visible: boolean;
  question: QuizQuestion | null;
  onClose: () => void;
}

export function LearnMoreSheet({ visible, question, onClose }: LearnMoreSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [modalRendered, setModalRendered] = useState(visible);
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setModalRendered(true);
      backdropOpacity.value = withTiming(1, { duration: 220 });
      translateY.value = withTiming(0, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 160 });
      translateY.value = withTiming(
        SCREEN_H,
        {
          duration: 220,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setModalRendered)(false);
          }
        }
      );
    }
  }, [visible, translateY, backdropOpacity]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!modalRendered && !visible) return null;
  if (!question) return null;

  // Determine correct answer text / label
  let correctAnswerDisplay = '';
  if (
    question.format === 'twoImageChoice' ||
    question.format === 'imageChoice' ||
    (Array.isArray(question.images) && question.images.length >= 2)
  ) {
    const label = question.labels?.[question.correctAnswer] ?? (question.correctAnswer === 0 ? 'A' : 'B');
    correctAnswerDisplay = `Sign ${label}`;
  } else if (Array.isArray(question.answers) && question.answers.length > question.correctAnswer) {
    correctAnswerDisplay = question.answers[question.correctAnswer];
  } else {
    correctAnswerDisplay = `Option ${question.correctAnswer + 1}`;
  }

  const explanationText =
    question.explanation ||
    `The correct answer is ${correctAnswerDisplay}. This regulation applies to maintain safe road traffic priority and awareness in this section.`;

  const sheetGrad = getSheetGradient(isDark);

  return (
    <Modal
      visible={modalRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Animated Dimming Backdrop */}
        <AnimatedPressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: StaticColors.backdropColor || 'rgba(0,0,0,0.5)' },
            backdropAnimatedStyle,
          ]}
          onPress={onClose}
        />

        {/* Animated Sheet Anchored to True Bottom */}
        <Animated.View
          style={[
            styles.sheetWrapper,
            sheetAnimatedStyle,
          ]}
        >
          <LinearGradient
            colors={sheetGrad.colors}
            start={sheetGrad.start}
            end={sheetGrad.end}
            style={[
              styles.sheetContainer,
              {
                borderColor: isDark ? colors.outlineVariant : '#E2E8F0',
                paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
              },
            ]}
          >
            {/* Grabber Handle */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
                ]}
              />
            </View>

            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleGroup}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(7, 183, 169, 0.15)' }]}>
                  <Ionicons name="bulb-outline" size={20} color={colors.tealAccent || '#07B7A9'} />
                </View>
                <Text style={[Typography.titleMedium, { color: colors.onSurface, marginLeft: Spacing.sm, fontWeight: '800' }]}>
                  Learn More
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={[
                  styles.closeButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Scrollable Content (No text clipping/cropping) */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              nestedScrollEnabled={true}
            >
              {/* Question summary text */}
              <Text style={[Typography.titleSmall, styles.questionPreview, { color: colors.onSurface }]}>
                {question.question}
              </Text>

              {/* Correct Answer Card */}
              <View
                style={[
                  styles.answerCard,
                  {
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#F0FDF4',
                    borderColor: '#22C55E',
                  },
                ]}
              >
                <View style={styles.answerHeader}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={[Typography.labelMedium, { color: '#16A34A', fontWeight: '800', marginLeft: 6 }]}>
                    Correct Answer
                  </Text>
                </View>
                <Text style={[Typography.bodyLarge, styles.answerValueText, { color: colors.onSurface }]}>
                  {correctAnswerDisplay}
                </Text>
              </View>

              {/* Explanation Card */}
              <View
                style={[
                  styles.explanationCard,
                  {
                    backgroundColor: isDark ? (colors.surfaceContainerLow || '#1E232D') : '#F8FAFC',
                    borderColor: isDark ? colors.outlineVariant : '#E2E8F0',
                  },
                ]}
              >
                <Text style={[Typography.labelSmall, styles.explanationHeading, { color: colors.onSurfaceVariant }]}>
                  WHY IS THIS CORRECT?
                </Text>
                <Text style={[Typography.bodyMedium, styles.explanationBody, { color: colors.onSurface }]}>
                  {explanationText}
                </Text>
              </View>

              {/* Got It Action Button */}
              <Pressable onPress={onClose} style={styles.gotItButtonWrapper}>
                <LinearGradient
                  colors={BrandGradients.discovery.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gotItGradient}
                >
                  <Text style={[Typography.labelLarge, styles.gotItButtonText]}>
                    GOT IT
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
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
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  sheetContainer: {
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
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: Radius.full,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    maxHeight: SCREEN_H * 0.65,
  },
  scrollContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  questionPreview: {
    fontFamily: FontFamily.bold,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  answerCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  answerValueText: {
    fontFamily: FontFamily.extraBold,
    marginTop: 2,
    lineHeight: 22,
  },
  explanationCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  explanationHeading: {
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  explanationBody: {
    fontFamily: FontFamily.regular,
    lineHeight: 22,
  },
  gotItButtonWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  gotItGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItButtonText: {
    color: '#0B3B31',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
  },
});
