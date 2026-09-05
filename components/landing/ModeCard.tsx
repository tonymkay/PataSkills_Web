import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, Typography, BrandGradients } from '@/theme/tokens';

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
  /** 'current': teal border/tint + "CURRENT" badge (still in progress).
   *  'done': muted border + "DONE" badge (this track is finished). */
  status?: 'current' | 'done';
  /** 0–1 completion, rendered as filled/unfilled segments under the title.
   *  Omit to hide the progress row entirely. */
  progress?: number;
  onPress: () => void;
}

/**
 * One learning-mode row in ModeSwitcherSheet — illustration + title, no
 * chevron, plus an optional segmented progress row underneath. `status`
 * marks the current mode (always sorted first by the sheet): 'current'
 * keeps the brand-teal treatment for a track still in progress, 'done'
 * grays it out once every topic in it has been completed. The
 * illustration and label are otherwise identical to every other row.
 */
export function ModeCard({ image, title, status, progress, onPress }: ModeCardProps) {
  const { colors } = useTheme();
  const teal = colors.tealAccent || '#2BD9C4';
  const isDone = status === 'done';
  const isCurrent = status === 'current';
  const filledSegments = progress !== undefined
    ? Math.min(PROGRESS_SEGMENTS, Math.round(progress * PROGRESS_SEGMENTS))
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: isCurrent ? teal : colors.outlineVariant,
          backgroundColor: isCurrent
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
          {isCurrent ? (
            <View style={[styles.badge, { backgroundColor: teal }]}>
              <Text style={styles.badgeText}>CURRENT</Text>
            </View>
          ) : isDone ? (
            <View style={[styles.badge, { backgroundColor: colors.outlineVariant }]}>
              <Text style={[styles.badgeText, { color: colors.onSurfaceVariant }]}>✓ DONE</Text>
            </View>
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
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#0B3B31',
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

