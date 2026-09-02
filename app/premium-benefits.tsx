import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';

interface BenefitItem {
  feature: string;
  free: boolean;
  premium: boolean;
}

export default function PremiumBenefitsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const benefits: BenefitItem[] = [
    { feature: 'Daily road signs sessions', free: true, premium: true },
    { feature: 'Access all driving theory questions', free: true, premium: true },
    { feature: 'Unlimited sessions (0 key cooldown)', free: false, premium: true },
    { feature: 'Unlimited session retries & redos', free: false, premium: true },
    { feature: 'Jump ahead to any section', free: false, premium: true },
    { feature: 'Ad-free seamless learning', free: false, premium: true },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Benefits of premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Crown Hero Art */}
        <View style={styles.heroSection}>
          <Image
            source={require('@/assets/premium/crown.webp')}
            style={styles.heroCrownImage}
            resizeMode="contain"
          />
        </View>

        {/* Benefits Comparison Table */}
        <View
          style={[
            styles.tableCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.surfaceContainerHigh,
            },
          ]}
        >
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCol, { color: colors.onSurface, flex: 1 }]}>
              Benefits
            </Text>
            <Text style={[styles.tableHeaderCol, { color: colors.onSurfaceVariant, width: 64, textAlign: 'center' }]}>
              Free
            </Text>
            <Text style={[styles.tableHeaderCol, { color: StaticColors.successLime, width: 80, textAlign: 'center' }]}>
              Premium
            </Text>
          </View>

          <View style={[styles.tableDivider, { backgroundColor: colors.surfaceContainerHigh }]} />

          {/* Table Rows */}
          {benefits.map((b, idx) => (
            <View key={b.feature}>
              <View style={styles.tableRow}>
                <Text style={[styles.featureText, { color: colors.onSurface }]}>
                  {b.feature}
                </Text>
                
                <View style={styles.colCellFree}>
                  {b.free ? (
                    <Check size={18} color={colors.onSurfaceVariant} strokeWidth={2.5} />
                  ) : (
                    <X size={18} color="rgba(255,255,255,0.2)" strokeWidth={2} />
                  )}
                </View>

                <View style={styles.colCellPrem}>
                  {b.premium ? (
                    <Check size={20} color={StaticColors.successLime} strokeWidth={2.8} />
                  ) : (
                    <X size={18} color="rgba(255,255,255,0.2)" strokeWidth={2} />
                  )}
                </View>
              </View>
              {idx < benefits.length - 1 && (
                <View style={[styles.rowDivider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
              )}
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <Pressable
          onPress={() => router.push('/subscription-plans')}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: StaticColors.successLime },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.ctaButtonText}>VIEW SUBSCRIPTION PLANS</Text>
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
    gap: Spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  heroCrownImage: {
    width: 96,
    height: 96,
  },
  tableCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.gutter,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  tableHeaderCol: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  tableDivider: {
    height: 1,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  colCellFree: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colCellPrem: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  ctaButton: {
    minHeight: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  ctaButtonText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
