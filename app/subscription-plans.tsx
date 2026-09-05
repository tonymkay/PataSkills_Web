import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { PLANS, planDisplay, type Plan } from '@/lib/premium';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navPush, navBack } from '@/lib/navDirection';

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // See keys-packs.tsx's identical params — same skill/track handoff,
  // forwarded onward to subscription-confirm below.
  const params = useLocalSearchParams<{ skill?: string; track?: string }>();

  return (
    <ScreenTransition>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navBack(router)} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          Unlimited Pass
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Crown Hero */}
        <View style={styles.heroSection}>
          <Image
            source={require('@/assets/premium/crown.webp')}
            style={styles.heroCrownImage}
            resizeMode="contain"
          />
          <Text style={[styles.heroTitle, { color: colors.onSurface }]}>
            Practice Without Limits
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
            Unlock infinite road signs sessions with zero key cooldowns
          </Text>
        </View>

        {/* Subscription Plans List */}
        <View style={styles.plansList}>
          {PLANS.map((plan: Plan) => {
            const display = planDisplay(plan, 'USD');
            const isPopular = !!plan.popular;

            return (
              <Pressable
                key={plan.id}
                onPress={() => navPush(router, { pathname: '/subscription-confirm', params: { plan: plan.id, skill: params.skill, track: params.track } })}
                style={({ pressed }) => [
                  styles.planCard,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: isPopular ? StaticColors.successLime : colors.surfaceContainerHigh,
                    borderWidth: isPopular ? 1.8 : 1,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: StaticColors.successLime }]}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planContent}>
                  <View style={styles.planLeft}>
                    <Text style={[styles.planName, { color: colors.onSurface }]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planTerm, { color: colors.onSurfaceVariant }]}>
                      {display.term}
                    </Text>
                    {display.note && (
                      <Text style={[styles.planNote, { color: StaticColors.successLime }]}>
                        {display.note}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.planPrice, { color: colors.onSurface }]}>
                    {display.price}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Centered Underlined Bottom Link */}
        <Pressable
          onPress={() => navPush(router, '/premium-benefits')}
          style={({ pressed }) => [styles.bottomLink, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.bottomLinkText, { color: colors.onSurfaceVariant }]}>
            Benefits of premium
          </Text>
        </Pressable>
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
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  heroCrownImage: {
    width: 88,
    height: 88,
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  plansList: {
    gap: Spacing.md,
    marginTop: Spacing.base,
  },
  planCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.gutter,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -11,
    left: Spacing.gutter,
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
  planContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  planLeft: {
    flex: 1,
    gap: 2,
  },
  planName: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  planTerm: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  planNote: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  planPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
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
