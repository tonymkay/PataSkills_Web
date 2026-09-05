import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileQuestion } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';

const DIAMOND = 130;

/**
 * Route-not-matched screen — mainly hit on web (stale/bad links to
 * play.pataskills.com). Mirrors ConnectionError's visual style.
 */
export default function NotFoundScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      <View style={styles.body}>
        <View
          style={[
            styles.iconRing,
            { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
          ]}
        >
          <FileQuestion size={DIAMOND * 0.45} color={StaticColors.selection.activeBorder} strokeWidth={1.75} />
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>Page not found</Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          That link doesn&apos;t lead anywhere. Head back home and pick up where you left off.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.lg) }]}>
        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.homeButton,
            { backgroundColor: StaticColors.selection.activeBorder },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.homeButtonText}>GO HOME</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gutter,
    paddingHorizontal: Spacing.marginMobile,
  },
  iconRing: {
    width: DIAMOND,
    height: DIAMOND,
    borderRadius: DIAMOND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
  },
  homeButton: {
    height: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#000',
    letterSpacing: 0.5,
  },
});
