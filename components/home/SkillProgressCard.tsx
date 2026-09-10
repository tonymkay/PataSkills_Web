import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, FontFamily, StaticColors } from '@/theme/tokens';

export type SkillProgressState = 'not-started' | 'in-progress' | 'completed';

export interface SkillProgressCardProps {
  title: string;
  completedTopics: number;
  totalTopics: number;
  onPress: () => void;
}

const SEGMENT_COUNT = 20;
const ARROW_BTN_SIZE = 36;

/** Derives the card's state + percent straight from raw progress counts —
 *  kept as its own function so Home's list-building code and this file
 *  agree on exactly the same thresholds. */
export function deriveSkillProgressState(
  completedTopics: number,
  totalTopics: number,
): { state: SkillProgressState; percent: number } {
  const percent = totalTopics > 0 ? Math.min(100, Math.round((completedTopics / totalTopics) * 100)) : 0;
  if (percent <= 0) return { state: 'not-started', percent: 0 };
  if (percent >= 100) return { state: 'completed', percent: 100 };
  return { state: 'in-progress', percent };
}

/**
 * One per-skill card on the Home tab — status label, skill name, and a
 * segmented progress bar, in one of three states (design spec: gray "Not
 * Started" / green "N% Complete" / teal "100% Complete"). Tapping
 * resumes that skill exactly where the learner left off (or, at 100%,
 * the caller is expected to route to Reports instead — this component
 * only renders and reports the tap, it doesn't know about tabs/routing).
 */
export function SkillProgressCard({ title, completedTopics, totalTopics, onPress }: SkillProgressCardProps) {
  const { colors } = useTheme();
  const { state, percent } = deriveSkillProgressState(completedTopics, totalTopics);

  const accent =
    state === 'completed'
      ? StaticColors.tealAccent
      : state === 'in-progress'
        ? StaticColors.successLime
        : colors.onSurfaceVariant;

  const statusLabel =
    state === 'completed' ? '100% Complete' : state === 'in-progress' ? `${percent}% Complete` : 'Not Started';

  const filledSegments = Math.round((percent / 100) * SEGMENT_COUNT);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[Typography.labelLarge, styles.statusLabel, { color: accent }]}>{statusLabel}</Text>
        <View style={styles.arrowBtn}>
          <ArrowUpRight size={18} color="#1A1A1A" strokeWidth={2.4} />
        </View>
      </View>

      <Text style={[Typography.headlineMedium, styles.title, { color: colors.onSurface }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.segmentRow}>
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < filledSegments ? accent : colors.outlineVariant },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.gutter,
  },
  statusLabel: {
    fontFamily: FontFamily.regular,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: ARROW_BTN_SIZE,
    height: ARROW_BTN_SIZE,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minWidth: 0,
    height: 4,
    borderRadius: Radius.sm,
  },
});
