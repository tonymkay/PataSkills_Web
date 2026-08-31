import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, BackHandler, Image, LayoutChangeEvent, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { BrandGradients } from '@/constants/gradients';
import { QuizQuestion } from '@/types/quiz';
import { TwoImageCard } from '@/components/cards/TwoImageCard';
import { CheckButton, FeedbackState } from '@/components/feedback/CheckButton';
import { LearnMoreSheet } from '@/components/feedback/LearnMoreSheet';
import { FeedbackSheet, FeedbackSheetState } from '@/components/feedback/FeedbackSheet';
import { QuitConfirmSheet } from '@/components/feedback/QuitConfirmSheet';

const XP_PER_CORRECT = 10;

const DECK_PAD = Spacing.marginMobile;
const GAP = 16;
const DURATION = 320;

interface CardDeckProps {
  questions: QuizQuestion[];
  keyBalance?: number;
  onSessionComplete?: (stats: { totalAnswered: number; correctCount: number }) => void;
  onFinish?: (stats: { totalAnswered: number; correctCount: number }) => void;
  onClose?: () => void;
}

export function CardDeck({
  questions: initialQuestions,
  keyBalance,
  onSessionComplete,
  onFinish,
  onClose,
}: CardDeckProps) {
  const { colors, mode } = useTheme();

  // Card width is measured from the actual rendered viewport, not derived
  // from window/frame constants — this is what makes it correct regardless
  // of the web aspect-ratio letterbox, resizes, or native screen size.
  const [viewportWidth, setViewportWidth] = useState(0);
  const handleViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportWidth(e.nativeEvent.layout.width);
  }, []);
  const cardWidth = viewportWidth;
  const stride = cardWidth + GAP;

  // Queue state
  const [deck, setDeck] = useState<QuizQuestion[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [evaluatedResult, setEvaluatedResult] = useState<'right' | 'wrong' | null>(null);
  const [feedbackSheetState, setFeedbackSheetState] = useState<FeedbackSheetState>(null);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount] = useState(initialQuestions.length);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Continuous strip translation. NEVER RESETS.
  const stripX = useSharedValue(0);
  // Fill of the currently-active progress segment: 10% unanswered, 80% once
  // marked correct, eased to 100% as the card slides away on advance.
  const activeFillAnim = useSharedValue(10);

  const currentCard = deck[currentIndex] || null;
  const isFinished = currentIndex >= deck.length;

  // Called on JS thread exactly when native timing completes
  const handleTransitionEnd = useCallback((isCorrect: boolean, nextIdx: number) => {
    if (isCorrect) {
      const updatedCorrect = correctCount + 1;
      setCorrectCount(updatedCorrect);
      if (nextIdx >= deck.length) {
        const stats = { totalAnswered: totalCount, correctCount: updatedCorrect };
        onSessionComplete?.(stats);
        onFinish?.(stats);
      }
    } else {
      // Requeue wrong card at the end of the queue
      if (currentCard) {
        setDeck((prev) => [...prev, currentCard]);
      }
    }

    setCurrentIndex(nextIdx);
    setSelectedOption(null);
    setFeedbackState('idle');
    setEvaluatedResult(null);
    setIsTransitioning(false);
    // New active segment starts fresh — snap (no ease) so it doesn't visibly
    // rewind from the 100% the just-completed segment settled at.
    activeFillAnim.value = 10;
  }, [correctCount, deck.length, currentCard, onSessionComplete, onFinish, totalCount, activeFillAnim]);

  // Trigger synchronized horizontal slide
  const triggerAdvance = useCallback((isCorrect: boolean) => {
    if (isTransitioning || !currentCard) return;
    setIsTransitioning(true);

    // Ease the active segment the rest of the way to full, timed to land
    // right as the card finishes sliding out.
    activeFillAnim.value = withTiming(100, {
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
    });

    try {
      Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch {}

    const nextIndex = currentIndex + 1;
    const targetX = -(nextIndex * stride);

    // Slide strip continuously forward to the next index
    stripX.value = withTiming(
      targetX,
      {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(handleTransitionEnd)(isCorrect, nextIndex);
        }
      }
    );
  }, [currentIndex, isTransitioning, currentCard, stripX, activeFillAnim, handleTransitionEnd, stride]);

  // Check button handler — opens the feedback sheet instead of auto-advancing.
  const handleCheck = () => {
    if (selectedOption === null || !currentCard || isTransitioning) return;

    const isCorrect = selectedOption === currentCard.correctAnswer;
    setFeedbackState(isCorrect ? 'correct' : 'incorrect');
    setEvaluatedResult(isCorrect ? 'right' : 'wrong');
    setFeedbackSheetState(isCorrect ? 'correct' : 'notquite');
    if (isCorrect) {
      activeFillAnim.value = withTiming(80, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
  };

  // Feedback sheet: Continue only shows for correct answers, advances the deck.
  const handleSheetContinue = () => {
    setFeedbackSheetState(null);
    triggerAdvance(true);
  };

  // Feedback sheet: Try again dismisses the sheet and lets the learner retry
  // the same card (no requeue, no advance).
  const handleSheetTryAgain = () => {
    setFeedbackSheetState(null);
    setSelectedOption(null);
    setFeedbackState('idle');
    setEvaluatedResult(null);
  };

  // Android hardware back: same "are you sure?" confirm as the X button,
  // never exits the session directly (mirrors PataSkillsV2 run/[skillId].tsx).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setQuitOpen(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  // Flag toggle handler
  const handleToggleFlag = (id: string, flagged: boolean) => {
    setFlaggedIds((prev) => ({
      ...prev,
      [id]: flagged,
    }));
  };

  // Animated strip style
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stripX.value }],
  }));

  // Animated width for the currently-active progress segment
  const activeFillStyle = useAnimatedStyle(() => ({
    width: `${activeFillAnim.value}%`,
  }));

  if (isFinished || !currentCard) {
    return null;
  }

  const segmentCount = Math.min(totalCount, 8);
  const filledSegments = Math.round((correctCount / totalCount) * segmentCount);
  const activeSegmentIndex = filledSegments;

  return (
    <View style={styles.deckContainer}>
      {/* 1. Top Bar */}
      <View style={styles.topbar}>
        <Pressable
          onPress={() => setQuitOpen(true)}
          hitSlop={12}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>

        <View style={styles.segmentsRow}>
          {Array.from({ length: segmentCount }).map((_, index) => {
            const isDone = index < filledSegments;
            const isActive = index === activeSegmentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.segmentPill,
                  {
                    backgroundColor: mode === 'dark' ? '#2A2E38' : '#E2E8F0',
                  },
                ]}
              >
                {isDone && (
                  <LinearGradient
                    colors={BrandGradients.discovery.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.segmentFill}
                  />
                )}
                {isActive && !isDone && (
                  <Animated.View style={[styles.segmentFillAnimated, activeFillStyle]}>
                    <LinearGradient
                      colors={BrandGradients.discovery.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.keyBadge}>
          {keyBalance !== undefined ? (
            <>
              <Text style={[styles.keyCount, { color: colors.onSurface }]}>{keyBalance}</Text>
              <Image source={require('@/assets/premium/key.webp')} style={styles.keyIcon} />
            </>
          ) : (
            <Text style={{ fontSize: 18 }}>⚡</Text>
          )}
        </View>
      </View>

      {/* 2. Card Viewport: Continuous horizontal track */}
      <View style={styles.cardViewport} onLayout={handleViewportLayout}>
        {cardWidth > 0 && (
        <Animated.View style={[styles.cardStrip, stripStyle]}>
          {deck.map((question, idx) => {
            const isCurrent = idx === currentIndex;
            const shouldRender = idx >= currentIndex - 1 && idx <= currentIndex + 2;
            
            return (
              <View
                key={`${question.id}-${idx}`}
                style={[
                  styles.cardSlot,
                  {
                    width: cardWidth,
                    marginRight: GAP,
                  },
                ]}
              >
                {shouldRender ? (
                  <ScrollView
                    style={styles.cardSlotScroll}
                    contentContainerStyle={styles.cardSlotScrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <TwoImageCard
                      question={question}
                      selectedOption={isCurrent ? selectedOption : null}
                      onSelectOption={isCurrent && !isTransitioning ? setSelectedOption : () => {}}
                      onOpenLearnMore={isCurrent ? () => setIsLearnMoreOpen(true) : () => {}}
                      onToggleFlag={(flagged) => handleToggleFlag(question.id, flagged)}
                      isFlagged={Boolean(flaggedIds[question.id])}
                      evaluatedResult={isCurrent ? evaluatedResult : null}
                    />
                  </ScrollView>
                ) : null}
              </View>
            );
          })}
        </Animated.View>
        )}
      </View>

      {/* 3. Bottom Controls Area */}
      <View style={styles.controlsArea}>
        <CheckButton
          enabled={selectedOption !== null && !isTransitioning}
          feedbackState="idle"
          onPress={handleCheck}
        />
        <Text style={[Typography.bodySmall, styles.hintText, { color: colors.onSurfaceVariant }]}>
          Pick an answer and hit Check
        </Text>
      </View>

      {/* 4. Dismissible Learn More Explanation Sheet */}
      <LearnMoreSheet
        visible={isLearnMoreOpen}
        question={currentCard}
        onClose={() => setIsLearnMoreOpen(false)}
      />

      {/* 5. Feedback Sheet: correct/not-quite pill + XP, flag, try again/continue */}
      <FeedbackSheet
        state={feedbackSheetState}
        xp={XP_PER_CORRECT}
        isFlagged={Boolean(flaggedIds[currentCard.id])}
        onToggleFlag={(flagged) => handleToggleFlag(currentCard.id, flagged)}
        onTryAgain={handleSheetTryAgain}
        onContinue={handleSheetContinue}
      />

      {/* 6. Quit confirm — closing the deck mid-session loses progress + XP */}
      <QuitConfirmSheet
        visible={quitOpen}
        onKeepPlaying={() => setQuitOpen(false)}
        onQuit={() => {
          setQuitOpen(false);
          onClose?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  deckContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: DECK_PAD,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 6,
  },
  segmentPill: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  segmentFillAnimated: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  keyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 28,
    justifyContent: 'center',
  },
  keyCount: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  keyIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  cardViewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  cardStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
  cardSlot: {
    flexShrink: 0,
    height: '100%',
  },
  cardSlotScroll: {
    flex: 1,
  },
  cardSlotScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  controlsArea: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  hintText: {
    fontFamily: FontFamily.medium,
    marginTop: Spacing.xs,
    fontSize: 12,
    opacity: 0.75,
  },
});
