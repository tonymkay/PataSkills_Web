import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Typography } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { KeysOptionsContent } from '@/components/feedback/KeysOptionsContent';
import { FontFamily } from '@/constants/typography';

/**
 * "Keys" tab — the standalone, always-accessible version of the
 * "Other ways to Proceed" content (buy keys, subscribe, or use the
 * free trial). Previously only reachable by running out of keys
 * mid-session, now a permanent tab. The three option cards are
 * rendered by KeysOptionsContent (shared with SessionStateScreen's
 * outOfKeys screen, so both call sites stay visually in sync).
 */
export default function KeysTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: colors.onSurface }]}>
          Get More Keys
        </Text>
        <Text style={[Typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: Spacing.md }]}>
          Unlock more sessions by purchasing keys, subscribing for unlimited access, or using the free trial timer.
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
    paddingBottom: Spacing.xxl,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: Spacing.base,
  },
});
