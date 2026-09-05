import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, Clock, Tv, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navBack } from '@/lib/navDirection';
import { Button } from '@/components/ui/Button';

interface InfoItem {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
}

export default function HowFreeModeWorksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const teal = colors.tealAccent || '#2BD9C4';

  const items: InfoItem[] = [
    {
      icon: <RefreshCw size={22} color={StaticColors.successLime} strokeWidth={2} />,
      iconBg: 'rgba(43, 217, 100, 0.12)',
      title: '3 Sessions Every Reset',
      body: 'You receive 3 free practice topics. When used up, a cooldown timer begins automatically.',
    },
    {
      icon: <Clock size={22} color={teal} strokeWidth={2} />,
      iconBg: 'rgba(43, 217, 196, 0.12)',
      title: 'Automatic Refill Timer',
      body: 'Your 3 keys refill as soon as the timer reaches zero. No manual restart needed.',
    },
    {
      icon: <Tv size={22} color={StaticColors.achievementAmber} strokeWidth={2} />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      title: 'Extra Sessions via Ads',
      body: "Don't want to wait? You can watch a short sponsor video anytime for an instant +1 bonus session.",
    },
    {
      icon: <Bell size={22} color="#60A5FA" strokeWidth={2} />,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      title: 'Instant Reset Alerts',
      body: 'Enable notification reminders to get notified the exact minute your 3 sessions refill.',
    },
  ];

  const handleContinue = () => {
    // navBack (pop), not navReplace — this screen was reached via navPush
    // on top of the live session/outOfKeys screen, so popping back reuses
    // that already-mounted '/' instance (session state, ?track= param,
    // etc. all intact) and gets the same single ScreenTransition slide as
    // every other back-nav. navReplace('/') was minting a brand-new '/'
    // instance instead — dropping straight back to the landing stage.
    navBack(router);
  };

  return (
    <ScreenTransition>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navBack(router)} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>How Free Mode works</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIconBox, { backgroundColor: 'rgba(43, 217, 196, 0.14)' }]}>
            <Clock size={40} color={teal} strokeWidth={2.2} />
          </View>
        </View>

        {/* Info Rows List */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHigh }]}>
          {items.map((item, idx) => (
            <View key={item.title}>
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                  {item.icon}
                </View>
                <View style={styles.textBox}>
                  <Text style={[styles.itemTitle, { color: colors.onSurface }]}>{item.title}</Text>
                  <Text style={[styles.itemBody, { color: colors.onSurfaceVariant }]}>{item.body}</Text>
                </View>
              </View>
              {idx < items.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />
              )}
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <Button
          label="Got It, Continue"
          onPress={handleContinue}
          backgroundColor="#FFFFFF"
          textColor="#000"
        />
      </ScrollView>
    </View>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    gap: Spacing.gutter,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  heroIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBox: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  itemBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.md,
  },
});