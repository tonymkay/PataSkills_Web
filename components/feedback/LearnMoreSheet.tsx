import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  Platform,
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
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { BrandGradients, getSheetGradient } from '@/constants/gradients';
import { Button } from '@/components/ui/Button';
import { DownloadAppModal } from '@/components/ui/DownloadAppModal';
import { QuizQuestion, SignCatalogEntry } from '@/types/quiz';

const { height: SCREEN_H } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LearnMoreSheetProps {
  visible: boolean;
  question: QuizQuestion | null;
  signCatalog?: SignCatalogEntry[];
  /** True when the learner isn't premium — swaps the explanation for a paywall. */
  locked?: boolean;
  /** Called when the learner taps the watch-ad-to-unlock button (only
   *  rendered while `locked`). Resolves 'earned' if the reward landed —
   *  the caller (CardDeck) is the one that actually adds this question's
   *  id to its per-session unlocked set and flips `locked` to false on
   *  the next render; this component owns none of that state itself, so
   *  a session redo (fresh CardDeck mount) naturally re-gates every
   *  question again. Resolves 'skipped' or 'unavailable' otherwise — see
   *  lib/ads.ts's RewardOutcome. Omitted (no-op) on screens that don't
   *  wire up an ad unlock, e.g. challenge-run's LearnMoreSheet. */
  onWatchAd?: () => Promise<'earned' | 'skipped' | 'unavailable'>;
  onClose: () => void;
}

/**
 * Looks up the catalog entry for a question's correct answer via
 * pairId + signRef. Falls back to inferring signRef from correctAnswer
 * (0 -> 'A', 1 -> 'B') for twoImageChoice/imageChoice questions that
 * don't carry an explicit signRef.
 */
function resolveSignEntry(
  question: QuizQuestion,
  catalog: SignCatalogEntry[],
): SignCatalogEntry | undefined {
  if (!question.pairId) return undefined;
  const candidates = catalog.filter((s) => s.pairId === question.pairId);
  if (candidates.length === 0) return undefined;

  if (question.signRef) {
    return candidates.find((s) => s.signRef === question.signRef) ?? candidates[0];
  }

  const inferredRef = question.correctAnswer === 1 ? 'B' : 'A';
  return candidates.find((s) => s.signRef === inferredRef) ?? candidates[0];
}

export function LearnMoreSheet({ visible, question, signCatalog, locked = false, onWatchAd, onClose }: LearnMoreSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [modalRendered, setModalRendered] = useState(visible);
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  // 'idle' = default paywall CTA. 'loading' = ad in flight (Button's own
  // spinner). 'unavailable' = the ad genuinely failed to load/show or was
  // skipped — button relabels to "Try again" rather than silently doing
  // nothing. 'download' = web fallback, same as WatchAdPromptSheet — swaps
  // this whole sheet's content for DownloadAppModal rather than pretending
  // to show a rewarded ad that doesn't reliably exist on web.
  const [adState, setAdState] = useState<'idle' | 'loading' | 'unavailable' | 'download'>('idle');

  useEffect(() => {
    if (visible) {
      setModalRendered(true);
      setAdState('idle');
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

  // Web has no reliable rewarded-ad product (same reasoning as
  // WatchAdPromptSheet) — skip straight to the install prompt instead of
  // pretending to load an ad. Native: actually show the rewarded ad; on
  // 'earned' the parent's onWatchAd is what unlocks this question (see
  // the prop doc above) — this component just reflects loading/failure,
  // it never marks anything unlocked itself.
  const handleWatchAdToUnlock = async () => {
    if (Platform.OS === 'web') {
      setAdState('download');
      return;
    }
    setAdState('loading');
    const outcome = (await onWatchAd?.()) ?? 'unavailable';
    if (outcome !== 'earned') {
      setAdState('unavailable');
    }
    // On 'earned' we deliberately leave adState alone — the parent's state
    // update flips the `locked` prop to false on its next render, which
    // swaps this sheet over to the unlocked explanation content below;
    // there's no separate reward screen to show first (see prop doc).
  };

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

  // Prefer the signs catalog entry (rich, hand-authored explanation) over
  // the question's own explanation field, and only fall back to the
  // generic templated sentence when neither is available.
  const catalogEntry = signCatalog ? resolveSignEntry(question, signCatalog) : undefined;
  const explanationText =
    catalogEntry?.explanation ||
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
              {locked ? (
                <View style={styles.paywallWrap}>
                  <Image
                    source={require('@/assets/premium/crown.webp')}
                    style={styles.paywallCrown}
                    resizeMode="contain"
                  />
                  <Text style={[Typography.titleMedium, styles.paywallTitle, { color: colors.onSurface }]}>
                    Learn More is a premium feature
                  </Text>
                  <Text style={[Typography.bodyMedium, styles.paywallBody, { color: colors.onSurfaceVariant }]}>
                    Unlock full explanations for every question with Premium.
                  </Text>
                  <Button
                    label="Subscribe today"
                    variant="solid"
                    backgroundColor="#FFFFFF"
                    textColor="#000000"
                    onPress={() => {
                      onClose();
                      router.push('/subscription-plans' as any);
                    }}
                  />
                  <Button
                    label="Maybe later"
                    variant="outline"
                    textColor={colors.onSurface}
                    borderColor={colors.outlineVariant}
                    onPress={onClose}
                    style={styles.paywallSecondaryBtn}
                  />
                </View>
              ) : (
                <>
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
                </>
              )}
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
  paywallWrap: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  paywallCrown: {
    width: 72,
    height: 72,
    marginBottom: Spacing.xs,
  },
  paywallTitle: {
    fontFamily: FontFamily.extraBold,
    textAlign: 'center',
  },
  paywallBody: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  paywallSecondaryBtn: {
    marginTop: Spacing.sm,
  },
});
