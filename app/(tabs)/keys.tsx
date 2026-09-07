import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { useTheme, Spacing, Radius, IconSize, StaticColors } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { KeysOptionsContent } from '@/components/feedback/KeysOptionsContent';
import { FontFamily } from '@/constants/typography';
import { useKeys } from '@/hooks/useKeys';
import { getSubscriptionInfo, type SubscriptionInfo } from '@/lib/billing';

/**
 * "Keys" tab — the standalone, always-accessible version of the
 * "Other ways to Proceed" content (buy keys, subscribe, or use the
 * free trial). When a user subscribes for Unlimited, it transforms to
 * display their active Premium status matching PataSkillsV2, featuring
 * the crown graphic, "You're on Premium", and a "Manage subscription" CTA.
 */
export default function KeysTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { balance, isPremium } = useKeys();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (isPremium) {
        getSubscriptionInfo().then(setSubInfo).catch(() => {});
      }
    }, [isPremium]),
  );

  const displayCount = balance !== null ? String(balance) : '...';

  const dateStr = subInfo?.expiresAt
    ? new Date(subInfo.expiresAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

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
        {isPremium ? (
          /* ─── Premium Subscribed State ─── */
          <View style={styles.premiumContainer}>
            <View
              style={[
                styles.premiumCard,
                {
                  borderColor: colors.outlineVariant,
                  backgroundColor: colors.surfaceContainerLow,
                },
              ]}
            >
              <Image
                source={require('@/assets/premium/crown.webp')}
                style={styles.crownArt}
                resizeMode="contain"
              />
              <Text style={[styles.premiumHeading, { color: colors.onSurface }]}>
                You&apos;re on Premium
              </Text>
              <Text style={[styles.premiumSubtitle, { color: colors.onSurfaceVariant }]}>
                {dateStr
                  ? `Your subscription is active until ${dateStr}.`
                  : 'Unlimited access to all skills and sessions'}
              </Text>

              <Pressable
                onPress={() => router.push('/manage-subscription')}
                style={({ pressed }) => [
                  styles.manageBtn,
                  {
                    borderColor: StaticColors.successLime,
                    backgroundColor: pressed ? 'rgba(43,217,100,0.12)' : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Manage subscription"
              >
                <Text style={[styles.manageBtnText, { color: StaticColors.successLime }]}>
                  Manage subscription
                </Text>
              </Pressable>
            </View>

            {/* Premium Benefits Link Row */}
            <Pressable
              onPress={() => router.push('/premium-benefits')}
              style={({ pressed }) => [
                styles.benefitsRow,
                {
                  borderColor: colors.outlineVariant,
                  backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="View Premium benefits"
            >
              <View style={styles.benefitsRowLeft}>
                <View
                  style={[
                    styles.benefitsIconWrap,
                    { backgroundColor: 'rgba(43,217,100,0.14)' },
                  ]}
                >
                  <Sparkles size={18} color={StaticColors.successLime} strokeWidth={2} />
                </View>
                <Text style={[styles.benefitsLabel, { color: colors.onSurface }]}>
                  Premium benefits
                </Text>
              </View>
              <ChevronRight size={IconSize.inline} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          /* ─── Free / Limited Keys State ─── */
          <>
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

            <Text style={[styles.keysLeftText, { color: colors.onSurfaceVariant }]}>
              {`${displayCount} ${balance === 1 ? 'key' : 'keys'} left`}
            </Text>

            <Text style={[styles.heading, { color: colors.onSurface }]}>
              Unlock more sessions
            </Text>

            <KeysOptionsContent balance={balance} isPremium={false} />
          </>
        )}
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
  /* Free State Styles */
  keysCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
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
  keysLeftText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heading: {
    fontFamily: FontFamily.regular,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  /* Premium State Styles */
  premiumContainer: {
    gap: Spacing.base,
    paddingTop: Spacing.sm,
  },
  premiumCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  crownArt: {
    width: 168,
    height: 168,
    marginBottom: Spacing.xs,
  },
  premiumHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  manageBtn: {
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    marginTop: Spacing.xs,
  },
  manageBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  benefitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  benefitsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
});
