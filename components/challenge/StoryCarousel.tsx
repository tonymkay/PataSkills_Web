/**
 * Reusable story-slide primitive: segmented progress bar across the top +
 * tap-left/right / hold-to-pause / swipe navigation, auto-advancing every
 * `durationMs`. Ported verbatim from pataskillsv2's
 * components/ui/StoryCarousel.tsx (only the import surface changed, to
 * Play's theme/tokens single import point) — this file has no app-specific
 * logic, every challenge screen (offline list, online search-found,
 * tournament searching) shares this one implementation.
 *
 * Deliberately does NOT own a header, close button, or outer chrome — every
 * consumer's differs (X vs back-arrow, title text, etc.), so that stays
 * with the caller. This component only owns the progress bar + the
 * swap-on-index content area + the gesture layer.
 */
import { useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, {
  cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme, Radius, Spacing, StaticColors } from '@/theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const HOLD_THRESHOLD_MS = 200;
const SWIPE_DISTANCE_RATIO = 0.22;
const SWIPE_VELOCITY_THRESHOLD = 700;
const DEFAULT_DURATION_MS = 8000;
const DEFAULT_CTA_ZONE_HEIGHT = 150;

export interface StoryCarouselProps<T> {
  items: T[];
  /** Per-slide auto-advance duration. */
  durationMs?: number;
  /** Height (px) reserved at the bottom for the slide's own CTA content —
   *  the tap/hold/swipe gesture zone stops above this so it never steals a
   *  tap meant for a button rendered by renderItem. */
  ctaZoneHeight?: number;
  /** Called when navigation would go past the first or last slide. The
   *  caller decides what "exit" means. */
  onExit: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  /** Controlled index, for a caller that needs to react to slide changes.
   *  Uncontrolled (internal state) if omitted. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Optional element rendered to the left of the progress bars, in the
   *  same row — e.g. a host screen's back/close button. */
  leading?: React.ReactNode;
}

export function StoryCarousel<T>({
  items,
  durationMs = DEFAULT_DURATION_MS,
  ctaZoneHeight = DEFAULT_CTA_ZONE_HEIGHT,
  onExit,
  renderItem,
  keyExtractor,
  index: controlledIndex,
  onIndexChange,
  leading,
}: StoryCarouselProps<T>) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [internalIndex, setInternalIndex] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const index = controlledIndex ?? internalIndex;
  const [held, setHeld] = useState(false);
  const progress = useSharedValue(0);
  const count = items.length;

  const goTo = (i: number) => {
    if (i < 0 || i >= count) {
      onExit();
      return;
    }
    if (onIndexChange) onIndexChange(i);
    else setInternalIndex(i);
  };

  const prevIndexRef = useRef(index);
  useEffect(() => {
    const indexChanged = prevIndexRef.current !== index;
    prevIndexRef.current = index;

    cancelAnimation(progress);
    if (indexChanged) {
      progress.value = 0;
    }

    if (held || !isFocused || count === 0) {
      return;
    }
    const remaining = Math.max(0, (1 - progress.value) * durationMs);
    progress.value = withTiming(1, { duration: remaining }, (done) => {
      if (done) runOnJS(goTo)(index + 1);
    });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, held, isFocused, count, durationMs]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelAnimation(progress), []);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const tapGesture = Gesture.Tap()
    .maxDuration(HOLD_THRESHOLD_MS)
    .maxDistance(10)
    .onEnd((e) => {
      if (e.x < SCREEN_W * 0.3) runOnJS(goTo)(index - 1);
      else if (e.x > SCREEN_W * 0.7) runOnJS(goTo)(index + 1);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(HOLD_THRESHOLD_MS)
    .onStart(() => {
      runOnJS(setHeld)(true);
    })
    .onFinalize(() => {
      runOnJS(setHeld)(false);
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(10)
    .onBegin(() => {
      runOnJS(setHeld)(true);
    })
    .onEnd((e) => {
      const dx = e.translationX;
      const isSwipe = Math.abs(dx) > SCREEN_W * SWIPE_DISTANCE_RATIO || Math.abs(e.velocityX) > SWIPE_VELOCITY_THRESHOLD;
      if (isSwipe) {
        if (dx < 0) runOnJS(goTo)(index + 1);
        else runOnJS(goTo)(index - 1);
      }
    })
    .onFinalize(() => {
      runOnJS(setHeld)(false);
    });

  const storyNavGesture = Gesture.Race(tapGesture, longPressGesture, panGesture);

  if (count === 0) return null;
  const clampedIndex = Math.min(index, count - 1);
  const activeItem = items[clampedIndex];

  return (
    <View style={{ flex: 1 }}>
      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
        {leading}
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {items.map((item, i) => (
            <View
              key={keyExtractor ? keyExtractor(item, i) : i}
              style={{ flex: 1, height: 6, borderRadius: Radius.full, backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden' }}
            >
              {i < clampedIndex && <View style={{ flex: 1, backgroundColor: StaticColors.selection.activeBorder }} />}
              {i === clampedIndex && (
                <Animated.View style={[{ height: '100%', backgroundColor: StaticColors.selection.activeBorder }, barStyle]} />
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>{renderItem(activeItem, clampedIndex)}</View>

      <GestureDetector gesture={storyNavGesture}>
        <View
          style={{
            position: 'absolute', top: headerHeight, left: 0, right: 0, bottom: ctaZoneHeight,
            zIndex: 10, elevation: 10,
          }}
        />
      </GestureDetector>
    </View>
  );
}
