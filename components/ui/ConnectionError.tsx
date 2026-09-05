import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';

const DIAMOND = 130;

/**
 * "App can't connect" — render this inside a screen wherever a network
 * request is required but failed (fetching packs, confirming a purchase,
 * checking key balance, etc). `onReload` should re-run whatever fetch
 * failed. Fills its parent; render inside a normal screen container.
 */
export function ConnectionError({ onReload }: { onReload: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View
          style={[
            styles.iconRing,
            { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
          ]}
        >
          <WifiOff size={DIAMOND * 0.45} color={StaticColors.selection.activeBorder} strokeWidth={1.75} />
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>App can&apos;t connect</Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Try checking your internet or reloading the page. If it keeps happening, come back in a bit.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable
          onPress={onReload}
          style={({ pressed }) => [
            styles.reloadButton,
            { backgroundColor: StaticColors.selection.activeBorder },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.reloadButtonText}>RELOAD</Text>
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
  reloadButton: {
    height: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadButtonText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#000',
    letterSpacing: 0.5,
  },
});
