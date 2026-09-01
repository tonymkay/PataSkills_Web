import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { keyPackById } from '@/lib/premium';
import { formatUSDAmount, splitCurrencyAmount } from '@/lib/currency';
import { purchaseKeyPack } from '@/lib/billing';

export default function KeysConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ pack?: string }>();
  const pack = keyPackById(params.pack);
  const [busy, setBusy] = useState(false);

  if (!pack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.onSurface }}>Pack not found</Text>
      </View>
    );
  }

  const priceFormatted = formatUSDAmount(pack.priceUSD, 'USD');
  const { currency, amount } = splitCurrencyAmount(priceFormatted);

  const onConfirm = async () => {
    setBusy(true);
    const result = await purchaseKeyPack(pack.id);
    setBusy(false);
    if (result === 'error') {
      alert('Could not initiate checkout. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Confirm Purchase</Text>
      </View>

      <View style={styles.body}>
        {/* Main Confirmation Box */}
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.surfaceContainerHigh,
            },
          ]}
        >
          <Text style={[styles.cardSublabel, { color: colors.onSurfaceVariant }]}>Total Payment</Text>
          <Text style={[styles.cardPrice, { color: colors.onSurface }]}>
            {currency ? `${currency} ` : ''}{amount}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />

          <Text style={[styles.cardSublabel, { color: colors.onSurfaceVariant }]}>You Receive</Text>
          <View style={styles.rewardRow}>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.keyImage}
              resizeMode="contain"
            />
            <Text style={[styles.rewardText, { color: StaticColors.achievementAmber }]}>
              {pack.keys} Keys
            </Text>
          </View>

          <Text style={[styles.noteText, { color: colors.onSurfaceVariant }]}>
            Paid securely via Paystack Web. Unlock road signs driving sessions anytime.
          </Text>
        </View>
      </View>

      {/* Footer Confirm CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: StaticColors.achievementAmber },
            (pressed || busy) && { opacity: 0.8 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Pay with Paystack</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
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
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  confirmCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  cardSublabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 44,
    lineHeight: 52,
    marginTop: Spacing.xs,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.lg,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  keyImage: {
    width: 48,
    height: 48,
  },
  rewardText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 28,
    lineHeight: 34,
  },
  noteText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  confirmButtonText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
