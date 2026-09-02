import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent, ScrollView } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

/**
 * Single-card scroll-hint logic: shows a bouncing chevron when a card's
 * content is taller than its viewport, and hides it once the user scrolls
 * past a small threshold or taps it (which scrolls to the bottom).
 *
 * Scoped to exactly one scrollable card — not index-keyed. For a deck that
 * keeps multiple slots mounted at once (see QuizCardDeck), use one instance
 * of this hook per slot, or the slot-dictionary pattern already there.
 */
export function useScrollHint() {
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const [showHint, setShowHint] = useState(false);
  const hintBounce = useSharedValue(0);

  const recomputeHint = useCallback(() => {
    const contentH = contentHeightRef.current;
    const viewportH = viewportHeightRef.current;
    setShowHint(Boolean(contentH && viewportH && contentH > viewportH + 4));
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
    recomputeHint();
  }, [recomputeHint]);

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeightRef.current = h;
    recomputeHint();
  }, [recomputeHint]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y > 12) setShowHint(false);
  }, []);

  useEffect(() => {
    if (showHint) {
      hintBounce.value = withRepeat(
        withTiming(8, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      cancelAnimation(hintBounce);
      hintBounce.value = withTiming(0, { duration: 150 });
    }
  }, [showHint, hintBounce]);

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hintBounce.value }],
  }));

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ y: contentHeightRef.current || 99999, animated: true });
    setShowHint(false);
  }, []);

  /**
   * Clear tracked heights and hide the hint. Call when the hook instance
   * is being reused for a new card (e.g. ReadingCardDeck swapping
   * currentSign) so a stale measurement from the previous card can't
   * briefly show/hide the wrong hint before the new card's onLayout fires.
   */
  const resetForNewCard = useCallback(() => {
    contentHeightRef.current = 0;
    viewportHeightRef.current = 0;
    setShowHint(false);
  }, []);

  return {
    scrollRef,
    scrollViewProps: { onLayout, onContentSizeChange, onScroll, scrollEventThrottle: 32 },
    showHint,
    hintAnimatedStyle,
    scrollToBottom,
    resetForNewCard,
  };
}
