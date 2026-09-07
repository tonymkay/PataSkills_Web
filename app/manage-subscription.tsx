import React, { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Crown, Lock, HelpCircle, Sparkles } from 'lucide-react-native';
import { useTheme, Spacing, Radius, IconSize, StaticColors } from '@/theme/tokens';
import { FontFamily } from '@/constants/typography';
import { getSubscriptionInfo, type SubscriptionInfo } from '@/lib/billing';
import { getKeysState } from '@/lib/keys';
import { DownloadAppModal } from '@/components/ui/DownloadAppModal';

const FAQ_URL = 'https://www.pataskills.com/';

function ChevronPillButton({
  label,
  onPress,
  filled,
}: {
  label: string;
  onPress: () => void;
  filled?: { bg: string; text: string };
}) {
  const { colors } = useTheme();
  const bg = filled?.bg ?? 'transparent';
  const textColor = filled?.text ?? colors.onSurface;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pillBtn,
        {
          backgroundColor: bg,
          borderColor: colors.outlineVariant,
          borderWidth: filled ? 0 : 1.5,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.pillBtnText, { color: textColor }]}
      >
        {label}
      </Text>
      <ChevronRight size={IconSize.inline} color={textColor} strokeWidth={2} />
    </Pressable>
  );
}

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [premium, setPremium] = useState<boolean | null>(null);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getKeysState()
        .then((state) => setPremium(!!state.isPremium))
        .catch(() => setPremium(false));
      getSubscriptionInfo().then(setSubInfo).catch(() => {});
    }, []),
  );

  const planLabel = premium ? 'Premium' : 'Free';

  const onPlanCta = () => {
    if (premium) {
      if (Platform.OS === 'web') {
        setShowDownloadModal(true);
        return;
      }
      Linking.openURL(subInfo?.managementURL ?? 'https://play.google.com/store/account/subscriptions');
    } else {
      if (Platform.OS === 'web') {
        setShowDownloadModal(true);
        return;
      }
      router.push('/subscription-plans');
    }
  };

  const planCtaLabel = (premium ? 'Manage subscription' : 'Upgrade to Premium').toUpperCase();
  const headerTitle = premium ? 'Premium' : 'Plan';

  const dateStr = subInfo?.expiresAt
    ? new Date(subInfo.expiresAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ─── Back header ─── */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{headerTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
      >
        <View style={{ gap: Spacing.sm }}>
          {premium === null ? (
            <View style={{ height: 96 }} />
          ) : (
            <View
              style={[
                styles.planCard,
                {
                  borderColor: premium ? StaticColors.successLime : colors.outlineVariant,
                  backgroundColor: premium ? 'rgba(43,217,100,0.08)' : colors.surfaceContainerLow,
                },
              ]}
            >
              <View style={styles.planCardHeader}>
                <View
                  style={[
                    styles.planIconCircle,
                    {
                      backgroundColor: premium ? StaticColors.successLime : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  {premium ? (
                    <Crown size={24} color="#FFFFFF" strokeWidth={2} />
                  ) : (
                    <Lock size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
                  )}
                  {!premium && (
                    <Sparkles
                      size={14}
                      color={StaticColors.successLime}
                      strokeWidth={2}
                      style={{ position: 'absolute', top: -2, right: -4 }}
                    />
                  )}
                </View>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={[styles.planTitle, { color: colors.onSurface }]}>{planLabel}</Text>
                  <Text
                    style={[
                      styles.planSubtitle,
                      { color: premium ? StaticColors.successLime : colors.onSurfaceVariant },
                    ]}
                  >
                    {premium
                      ? dateStr
                        ? `Active until ${dateStr}`
                        : "You're on Premium"
                      : 'Limited access to content'}
                  </Text>
                </View>
              </View>

              <ChevronPillButton
                label={planCtaLabel}
                onPress={onPlanCta}
                filled={{ bg: StaticColors.successLime, text: '#000000' }}
              />
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

        {/* ── Help section ── */}
        <View style={{ gap: Spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Help</Text>
          <View
            style={[
              styles.helpCard,
              {
                borderColor: colors.outlineVariant,
                backgroundColor: colors.surfaceContainerLow,
              },
            ]}
          >
            <View
              style={[
                styles.helpIconCircle,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                },
              ]}
            >
              <HelpCircle size={32} color={colors.onSurfaceVariant} strokeWidth={1.5} />
            </View>
            <Text style={[styles.helpTitle, { color: colors.onSurface }]}>Have a question?</Text>
            <Text style={[styles.helpSubtitle, { color: colors.onSurfaceVariant }]}>
              {"We're here to help!"}
            </Text>
            <ChevronPillButton label="BROWSE HELP PAGES" onPress={() => Linking.openURL(FAQ_URL)} />
          </View>
        </View>
      </ScrollView>

      {/* Web-only: redirect to mobile app for subscription management */}
      <DownloadAppModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        source={premium ? 'manage_subscription' : 'subscribe'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  planCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  planIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  planSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  pillBtn: {
    height: 56,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pillBtnText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  helpCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  helpIconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  helpTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  helpSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
