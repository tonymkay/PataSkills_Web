import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme, Radius, Spacing, FontFamily, StaticColors } from '@/theme/tokens';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

// The visible strip is always 4 slots wide, with today resting in slot 3
// (relIndex 2 below). We render a wider buffer — 3 extra days on each side
// — so dragging past the visible 4 reveals real neighboring days sliding
// in, instead of jumping. relIndex range: -3..6 (10 cells total).
const REL_INDICES = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;
const BUFFER_COUNT = REL_INDICES.length;
const VISIBLE_COUNT = 4;
const MAX_OFFSET = 3;

function mod7(n: number): number {
  return ((n % 7) + 7) % 7;
}

export type DayMark = 'done' | 'active' | 'future' | 'none';

interface WeekCalendarRowProps {
  week: DayMark[];
  todayIndex: number;
  currentStreak: number;
}

export function WeekCalendarRow({ week, todayIndex, currentStreak }: WeekCalendarRowProps) {
  const { colors } = useTheme();

  const [containerWidth, setContainerWidth] = useState(0);
  const [committedOffset, setCommittedOffset] = useState(0);

  const slotWidth = containerWidth / VISIBLE_COUNT;
  // Pixel position of the sliding row at rest for a given committed offset.
  // offset -3 (fully scrolled back) -> row's leftmost cell (relIndex -3)
  // aligns with the viewport, i.e. translateX = 0. offset +3 -> row shifted
  // so relIndex 6 sits at the right edge.
  const basePxFor = (offset: number) => -(offset + MAX_OFFSET) * slotWidth;

  const translateX = useRef(new Animated.Value(0)).current;
  const hasInitialized = useRef(false);
  const gestureStartPx = useRef(0);
  const latestPx = useRef(0);

  if (slotWidth > 0 && !hasInitialized.current) {
    hasInitialized.current = true;
    const startPx = basePxFor(committedOffset);
    translateX.setValue(startPx);
    latestPx.current = startPx;
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderGrant: () => {
        gestureStartPx.current = latestPx.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (slotWidth <= 0) return;
        const minPx = -(BUFFER_COUNT - VISIBLE_COUNT) * slotWidth;
        const maxPx = 0;
        const nextPx = Math.min(maxPx, Math.max(minPx, gestureStartPx.current + gestureState.dx));
        latestPx.current = nextPx;
        translateX.setValue(nextPx);
      },
      onPanResponderRelease: () => {
        if (slotWidth <= 0) return;
        const raw = Math.round(-latestPx.current / slotWidth) - MAX_OFFSET;
        const nextOffset = Math.min(MAX_OFFSET, Math.max(-MAX_OFFSET, raw));
        const settledPx = basePxFor(nextOffset);
        latestPx.current = settledPx;
        setCommittedOffset(nextOffset);
        Animated.spring(translateX, {
          toValue: settledPx,
          useNativeDriver: true,
          bounciness: 6,
        }).start();
      },
      onPanResponderTerminate: () => {
        if (slotWidth <= 0) return;
        const settledPx = basePxFor(committedOffset);
        latestPx.current = settledPx;
        Animated.spring(translateX, {
          toValue: settledPx,
          useNativeDriver: true,
          bounciness: 6,
        }).start();
      },
    }),
  ).current;

  const highlightColor = colors.secondary || StaticColors.successLime;
  const onHighlightColor = colors.onSecondary || '#000000';
  const trackBg = colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)';

  // Streak-pattern illusion only applies to the baseline 4 slots (relIndex
  // 0..3) and only while resting at the default position (committedOffset
  // 0). Everywhere else — scrolled away, or outside the baseline range —
  // shows real recorded status. A real 4+ day streak already shows as
  // 'done' in the real data for the day just outside the baseline window,
  // so no separate "left cap" decoration is needed anymore.
  const activeCount = Math.min(Math.max(currentStreak, 0), 3);

  const cells = REL_INDICES.map((relIndex) => {
    const dayIdx = mod7(todayIndex - 2 + relIndex);
    const mark: DayMark = week[dayIdx] ?? 'future';
    const isBaselineSlot = relIndex >= 0 && relIndex <= 3;

    let isGreen: boolean;
    if (committedOffset === 0 && isBaselineSlot) {
      isGreen = relIndex === 2 ? activeCount >= 1 : relIndex === 1 ? activeCount >= 2 : relIndex === 0 ? activeCount >= 3 : false;
    } else {
      isGreen = mark === 'done';
    }

    return {
      key: `${dayIdx}-${relIndex}`,
      label: DAY_LABELS[(dayIdx + 1) % 7],
      isGreen,
    };
  });

  const rowWidth = slotWidth * BUFFER_COUNT;

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.stripWrap} {...panResponder.panHandlers}>
        {slotWidth > 0 && (
          <Animated.View style={[styles.slideRow, { width: rowWidth, transform: [{ translateX }] }]}>
            {cells.map((cell) => (
              <View key={cell.key} style={[styles.cell, { width: slotWidth }]}>
                <View style={[styles.trackSegment, { backgroundColor: cell.isGreen ? highlightColor : trackBg }]} />
                <View
                  style={[
                    styles.markerBox,
                    { backgroundColor: cell.isGreen ? highlightColor : trackBg },
                  ]}
                >
                  <CalendarDays
                    size={22}
                    color={cell.isGreen ? onHighlightColor : colors.onSurfaceVariant}
                    strokeWidth={2.2}
                  />
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      {/* Day Labels Row — slides in sync with the boxes above */}
      <View style={styles.labelsClip}>
        {slotWidth > 0 && (
          <Animated.View style={[styles.slideRow, { width: rowWidth, transform: [{ translateX }] }]}>
            {cells.map((cell) => (
              <View key={cell.key} style={[styles.labelCell, { width: slotWidth }]}>
                <Text style={[styles.dayLabel, { color: colors.onSurfaceVariant }]}>{cell.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  stripWrap: {
    height: 46,
    overflow: 'hidden',
  },
  slideRow: {
    flexDirection: 'row',
    height: '100%',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackSegment: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -4,
    height: 8,
    borderRadius: Radius.full,
  },
  markerBox: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelsClip: {
    overflow: 'hidden',
  },
  labelCell: {
    alignItems: 'center',
  },
  dayLabel: {
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
