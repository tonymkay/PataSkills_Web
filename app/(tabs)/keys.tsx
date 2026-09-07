import { StyleSheet, Text, View, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { KeysOptionsContent } from '@/components/feedback/KeysOptionsContent';
import { FontFamily } from '@/constants/typography';
import { useKeys } from '@/hooks/useKeys';

/**
 * "Keys" tab — the standalone, always-accessible version of the
 * "Other ways to Proceed" content (buy keys, subscribe, or use the
 * free trial). Shows current key balance hero with key icon, followed by
 * regular "Unlock more sessions" label and the 3 proceed option cards.
 */
export default function KeysTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { balance, isPremium } = useKeys();

  const displayCount = isPremium ? '∞' : balance !== null ? String(balance) : '...';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Keys Count Hero */}
        <View style={styles.keysCountRow}>
          <Text style={[styles.keysCountText, { color: colors.onSurface }]}>
            {displayCount}
          </Text>
          <Image
            source={require('@/assets/premium/key.webp')}
            style={styles.keyIcon}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.heading, { color: colors.onSurface }]}>
          Unlock more sessions
        </Text>

        <KeysOptionsContent />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.base,
  },
  keysCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  keysCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 48,
    lineHeight: 54,
    textAlign: 'center',
  },
  keyIcon: {
    width: 44,
    height: 44,
  },
  heading: {
    fontFamily: FontFamily.regular,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
