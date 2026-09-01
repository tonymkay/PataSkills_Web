import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { KEY_PACKS, type KeyPack } from '@/lib/premium';
import { formatUSDAmount } from '@/lib/currency';
import { getKeyBalance } from '@/lib/keys';

export default function KeysPacksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    getKeyBalance().then((b) => setBalance(Number.isFinite(b) ? b : null)).catch(() => {});
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          {balance === null ? 'Buy Keys' : `${balance} Keys left`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Balance Hero */}
        <View style={styles.balanceHero}>
          <View style={styles.heroRow}>
            <Text style={[styles.balanceNumber, { color: StaticColors.achievementAmber }]}>
              {balance !== null ? (balance >= 99999 ? '∞' : balance) : '...'}
            </Text>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.heroKeyImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.balanceSubtitle, { color: colors.onSurfaceVariant }]}>
            Keys left in balance
          </Text>
        </View>

        {/* Key Packs List */}
        <View style={styles.packsList}>
          {KEY_PACKS.map((pack: KeyPack) => (
            <Pressable
              key={pack.id}
              onPress={() => router.push({ pathname: '/keys-confirm', params: { pack: pack.id } })}
              style={({ pressed }) => [
                styles.packCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: pack.popular ? StaticColors.achievementAmber : colors.surfaceContainerHigh,
                  borderWidth: pack.popular ? 1.8 : 1,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.packLeft}>
                <Image
                  source={require('@/assets/premium/key.webp')}
                  style={styles.cardKeyIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.packKeysText, { color: colors.onSurface }]}>
                  {pack.keys} Keys
                </Text>
                {pack.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: StaticColors.achievementAmber }]}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.packPriceText, { color: colors.onSurface }]}>
                {formatUSDAmount(pack.priceUSD, 'USD')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Centered Underlined Bottom Link */}
        <Pressable
          onPress={() => router.push('/how-keys-work')}
          style={({ pressed }) => [styles.bottomLink, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.bottomLinkText, { color: colors.onSurfaceVariant }]}>
            How Keys work
          </Text>
        </Pressable>
      </ScrollView>
    </View>
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
  },
  balanceHero: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  balanceNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 56,
    lineHeight: 64,
  },
  heroKeyImage: {
    width: 64,
    height: 64,
  },
  balanceSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  packsList: {
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.gutter,
  },
  packLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardKeyIcon: {
    width: 32,
    height: 32,
  },
  packKeysText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  popularBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  popularBadgeText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  packPriceText: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  bottomLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  bottomLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
