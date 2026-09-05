import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, Typography, BrandGradients, StaticColors } from '@/theme/tokens';

// Matches the session chunk size in utils/groupSessions.ts (chunkIntoSessions
// / chunkSignsIntoSessions both slice into groups of 7) — same segment count
// TrackDetailScreen's dots use, so the two progress indicators read the
// same way wherever the learner sees them.
const PROGRESS_SEGMENTS = 7;

interface ModeCardProps {
  /** Illustration from assets/driving/ (or a remote hero image for tracks
   *  with no local asset, e.g. 'full'). Always shown as-is — no icon
   *  swap for either status, just a border/tint change. */
  image: ImageSourcePropType;
  title: string;
  /** Plain coloured text, not a badge: 'done' → green "Done", 'inProgress'
   *  → teal "In Progress", 'notStarted' → grey "Not started". Omit to hide
   *  the label entirely. */
  status?: 'done' | 'inProgress' | 'notStarted';
  /** Teal border/tint marking the one row the learner should look at
   *  next — the current track while still in progress, or (once that
   *  track is finished) the next not-yet-done track in the list. Kept
   *  separate from `status` so a completed track is never highlighted
   *  just for sitting first in the list. */
  highlighted?: boolean;
  /** 0–1 completion, rendered as filled/unfilled segments under the title.
   *  Omit to hide the progress row entirely. */
  progress?: number;
  /** Real total question count for this track (from getTrackTotals()).
   *  Shown as a small "N questions" label next to the status text.
   *  Omit while the totals fetch hasn't resolved yet — no placeholder. */
  totalQuestions?: number;
  onPress: () => void;
}

/**
 * One learning-mode row in ModeSwitcherSheet — illustration + title, no
 * chevron, plus an optional segmented progress row underneath and a
 * plain-text status label (done/in progress/not started). `highlighted`
 * marks the row (always sorted first if it's the current track) with a
 * brand-teal border/tint to flag it as the next thing to do. The
 * illustration and label are otherwise identical to every other row.
 */
export function ModeCard({ image, title, status, highlighted, progress, totalQuestions, onPress }: ModeCardProps) {
  const { colors } = useTheme();
  const teal = colors.tealAccent || '#2BD9C4';
  const isDone = status === 'done';
  const filledSegments = progress !== undefined
    ? Math.min(PROGRESS_SEGMENTS, Math.round(progress * PROGRESS_SEGMENTS))
    : 0;

  const statusLabel =
    status === 'done' ? 'Done' : status === 'inProgress' ? 'In Progress' : status === 'notStarted' ? 'Not started' : null;
  const statusColor =
    status === 'done' ? StaticColors.successLime : status === 'inProgress' ? teal : colors.onSurfaceVariant;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: highlighted ? teal : colors.outlineVariant,
          backgroundColor: highlighted
            ? 'rgba(43,217,196,0.10)'
            : isDone
              ? colors.surfaceContainer
              : colors.surfaceContainerLow,
          opacity: isDone ? 0.7 : 1,
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.row}>
        <Image source={image} style={styles.illustration} resizeMode="contain" />

        <View style={styles.titleRow}>
          <Text style={[Typography.titleMedium, styles.title, { color: colors.onSurface }]}>
            {title}
          </Text>
          {statusLabel ? (
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          ) : null}
          {totalQuestions !== undefined ? (
            <Text style={[styles.questionCountText, { color: colors.onSurfaceVariant }]}>
              {totalQuestions} question{totalQuestions === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </View>

      {progress !== undefined && (
        <View style={styles.progressRow}>
          {Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) =>
            i < filledSegments ? (
              <LinearGradient
                key={i}
                colors={BrandGradients.discovery.colors}
                start={BrandGradients.discovery.start}
                end={BrandGradients.discovery.end}
                style={styles.segment}
              />
            ) : (
              <View key={i} style={[styles.segment, { backgroundColor: colors.surfaceContainerHigh }]} />
            ),
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  illustration: {
    width: 88,
    height: 88,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 18,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  questionCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: Radius.full,
  },
});

