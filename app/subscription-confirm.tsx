import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { planById } from '@/lib/premium';
import { formatUSDAmount } from '@/lib/currency';
import { purchasePlan } from '@/lib/billing';

export default function SubscriptionConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ plan?: string }>();
  const plan = planById(params.plan);
  const [busy, setBusy] = useState(false);

  const priceString = plan ? formatUSDAmount(plan.monthlyUSD, 'USD') : '$12.00';

  const onConfirm = async () => {
    if (!plan) return;
    setBusy(true);
    const result = await purchasePlan(plan.packageId);
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
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Confirm Subscription</Text>
      </View>

      <View style={styles.body}>
        {/* Main Subscription Card */}
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.surfaceContainerHigh,
            },
          ]}
        >
          <Image
            source={require('@/assets/premium/crown.webp')}
            style={styles.crownImage}
            resizeMode="contain"
          />

          <Text style={[styles.planTitle, { color: colors.onSurface }]}>
            {plan?.name || 'Unlimited'} Pass
          </Text>
          <Text style={[styles.cardPrice, { color: colors.primary }]}>
            {priceString} <Text style={[styles.pricePeriod, { color: colors.onSurfaceVariant }]}>/ month</Text>
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitRow}>
              <Check size={18} color={StaticColors.successLime} strokeWidth={2.5} />
              <Text style={[styles.benefitText, { color: colors.onSurface }]}>Unlimited sessions with 0 key limits</Text>
            </View>
            <View style={styles.benefitRow}>
              <Check size={18} color={StaticColors.successLime} strokeWidth={2.5} />
              <Text style={[styles.benefitText, { color: colors.onSurface }]}>Access to all road signs & theory questions</Text>
            </View>
            <View style={styles.benefitRow}>
              <Check size={18} color={StaticColors.successLime} strokeWidth={2.5} />
              <Text style={[styles.benefitText, { color: colors.onSurface }]}>Paid securely via Paystack Web</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer Confirm CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: colors.primary },
            (pressed || busy) && { opacity: 0.8 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={[styles.confirmButtonText, { color: colors.onPrimary }]}>
              Subscribe with Paystack
            </Text>
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
  crownImage: {
    width: 72,
    height: 72,
    marginBottom: Spacing.sm,
  },
  planTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  cardPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 40,
    marginTop: Spacing.xs,
  },
  pricePeriod: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.lg,
  },
  benefitsList: {
    width: '100%',
    gap: Spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    flex: 1,
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
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
