import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily, Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { DownloadProgress, DownloadStage } from '@/lib/downloadSession';

const STAGE_LABEL: Record<DownloadStage, string> = {
  curriculum: 'Downloading questions…',
  signs: 'Downloading sign images…',
  pairs: 'Downloading sign pairs…',
  hydrating: 'Preparing your session…',
};

interface DownloadingScreenProps {
  progress: DownloadProgress | null;
  error: string | null;
  onRetry: () => void;
}

export function DownloadingScreen({ progress, error, onRetry }: DownloadingScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pct = Math.round((progress?.fraction ?? 0) * 100);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#1A1D24',
          paddingTop: Math.max(insets.top, Spacing.lg),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
        },
      ]}
    >
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={[Typography.scoreMainTitle, styles.title, { color: colors.onSurface }]}>
              Couldn't download session
            </Text>
            <Text style={[Typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {error}
            </Text>
          </>
        ) : (
          <>
            <Text style={[Typography.scoreMainTitle, styles.title, { color: colors.onSurface }]}>
              {STAGE_LABEL[progress?.stage ?? 'curriculum']}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%`, backgroundColor: colors.tealAccent || '#2BD9C4' },
                ]}
              />
            </View>
            <Text style={[Typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {pct}%
            </Text>
          </>
        )}
      </View>

      {error ? (
        <View style={styles.actions}>
          <Pressable onPress={onRetry} style={styles.primaryButton}>
            <Text style={styles.primaryText}>RETRY</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.base,
    maxWidth: 640,
  },
  progressTrack: {
    width: '80%',
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  actions: {
    gap: Spacing.gutter,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: Radius.full,
    backgroundColor: '#F8F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primaryText: {
    color: '#1A1D24',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
