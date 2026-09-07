import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme, Radius, Spacing, FontFamily, StaticColors } from '@/theme/tokens';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function activeWeekLabels(todayIndex: number) {
  const todayJsIndex = (todayIndex + 1) % 7;
  return Array.from({ length: 4 }, (_, i) => DAY_LABELS[(todayJsIndex + i) % 7]);
}

export type DayMark = 'done' | 'active' | 'future' | 'none';

interface WeekCalendarRowProps {
  week: DayMark[];
  todayIndex: number;
}

export function WeekCalendarRow({ week, todayIndex }: WeekCalendarRowProps) {
  const { colors } = useTheme();
  const labels = activeWeekLabels(todayIndex);
  const fourMarks: DayMark[] = Array.from({ length: 4 }, (_, i) => week[Math.min(6, todayIndex + i)] ?? 'future');

  const highlightColor = colors.secondary || StaticColors.successLime;
  const onHighlightColor = colors.onSecondary || '#000000';

  return (
    <View style={styles.container}>
      <View style={styles.stripWrap}>
        {/* Background track line */}
        <View
          style={[
            styles.track,
            { backgroundColor: colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)' },
          ]}
        >
          <View style={[styles.trackFill, { backgroundColor: highlightColor }]} />
        </View>

        {/* 4 Day Markers */}
        <View style={styles.markersRow}>
          {fourMarks.map((mark, i) => {
            const isActive = i === 0;
            const isDone = mark === 'done';
            const isHighlighted = isActive || isDone;

            return (
              <View key={`${labels[i]}-${i}`} style={styles.markerCell}>
                <View
                  style={[
                    styles.markerBox,
                    {
                      backgroundColor: isHighlighted
                        ? highlightColor
                        : (colors.surfaceContainerHigh || 'rgba(255, 255, 255, 0.08)'),
                    },
                  ]}
                >
                  <CalendarDays
                    size={22}
                    color={isHighlighted ? onHighlightColor : colors.onSurfaceVariant}
                    strokeWidth={2.2}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Day Labels Row */}
      <View style={styles.labelsRow}>
        {labels.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={[styles.dayLabel, { color: colors.onSurfaceVariant }]}
          >
            {label}
          </Text>
        ))}
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
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -4,
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  trackFill: {
    width: '30%',
    height: '100%',
  },
  markersRow: {
    flexDirection: 'row',
  },
  markerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  markerBox: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
