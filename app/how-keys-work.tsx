import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Unlock, ShoppingBag, Snowflake, Crown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navPush, navBack } from '@/lib/navDirection';
import { Button } from '@/components/ui/Button';

interface InfoItem {
  icon: React.ReactNode;
  title: string;
  body: string;
}

export default function HowKeysWorkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const items: InfoItem[] = [
    {
      icon: <Unlock size={22} color={StaticColors.achievementAmber} strokeWidth={2} />,
      title: 'Keys unlock sessions',
      body: 'Every road signs session you start costs 1 key. Keys refill after cooldown when your balance runs out.',
    },
    {
      icon: <ShoppingBag size={22} color={StaticColors.achievementAmber} strokeWidth={2} />,
      title: 'Buy a key pack',
      body: 'Need more keys? Pick a pack of 20, 40, 80, or 120 keys — credited instantly to your account.',
    },
    {
      icon: <Snowflake size={22} color={StaticColors.achievementAmber} strokeWidth={2} />,
      title: 'Keys never expire',
      body: 'Purchased keys stay in your balance permanently until you use them.',
    },
    {
      icon: <Crown size={22} color={StaticColors.achievementAmber} strokeWidth={2} />,
      title: 'Unlimited skips keys entirely',
      body: 'Subscribe to the Unlimited Pass to practice without any key limits or waiting cooldowns.',
    },
  ];

  return (
    <ScreenTransition>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navBack(router)} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>How Keys work</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Key Hero Art */}
        <View style={styles.heroSection}>
          <Image
            source={require('@/assets/premium/key.webp')}
            style={styles.heroKeyImage}
            resizeMode="contain"
          />
        </View>

        {/* Info Rows List */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHigh }]}>
          {items.map((item, idx) => (
            <View key={item.title}>
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
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
          label="Get Unlimited Pass"
          onPress={() => navPush(router, '/subscription-plans')}
          backgroundColor={StaticColors.achievementAmber}
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
  heroKeyImage: {
    width: 96,
    height: 96,
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