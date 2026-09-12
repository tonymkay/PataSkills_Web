import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Sparkles, ChevronRight, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, Radius, IconSize, StaticColors } from '@/theme/tokens';
import { AppHeader } from '@/components/nav/AppHeader';
import { KeysOptionsContent } from '@/components/feedback/KeysOptionsContent';
import { Toggle } from '@/components/ui/Toggle';
import { FontFamily } from '@/constants/typography';
import { useKeys } from '@/hooks/useKeys';
import { getSubscriptionInfo, type SubscriptionInfo } from '@/lib/billing';
import { ensureNotificationPermission, scheduleResetReminder, cancelResetReminder } from '@/lib/notifications';

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
  const { balance, isPremium, resetAt, refresh } = useKeys();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Re-read the balance/premium flag from storage every time this tab
  // regains focus. useKeys() only reads AsyncStorage on its own mount, so
  // without this, restoring an account elsewhere (Settings, the landing
  // screen's restore link) leaves this already-mounted tab showing
  // whatever balance existed before the restore — storage is correct,
  // this screen just never re-reads it. See CODEBASE.md / restore sync fix.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      if (isPremium) {
        getSubscriptionInfo().then(setSubInfo).catch(() => {});
      }
    }, [isPremium]),
  );

  useEffect(() => {
    AsyncStorage.getItem('@play/timer_reminders').then((val) => {
      setRemindersEnabled(val === 'true');
    }).catch(() => {});
  }, []);

  // Live countdown tick for the "Resets in..." subtitle
  useEffect(() => {
    if (!resetAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resetAt]);

  const handleToggleReminders = async (val: boolean) => {
    setRemindersEnabled(val);
    AsyncStorage.setItem('@play/timer_reminders', val ? 'true' : 'false').catch(() => {});
    if (val) {
      const granted = await ensureNotificationPermission();
      if (granted && resetAt) {
        scheduleResetReminder(resetAt);
      }
    } else {
      cancelResetReminder();
    }
  };

  const hasSessionsLeft = balance !== null && balance > 0;
  const secondsLeft = resetAt ? Math.max(0, Math.ceil((resetAt - now) / 1000)) : 0;
  const timerHours = Math.floor(secondsLeft / 3600);
  const timerMinutes = Math.floor((secondsLeft % 3600) / 60);
  const timerText =
    timerHours > 0
      ? `Resets in ${timerHours}hours ${String(timerMinutes).padStart(2, '0')}mins`
      : `Resets in ${timerMinutes}mins`;

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
            {/* Free Trial Status Hero */}
            <Text style={[styles.heroHeading, { color: colors.onSurface }]}>
              {hasSessionsLeft ? 'You are on Free Trial' : 'You are out of Free Sessions!'}
            </Text>

            <Text style={[styles.heroSubtitle, { color: colors.tealAccent || '#2BD9C4' }]}>
              {hasSessionsLeft
                ? `${displayCount} session${balance === 1 ? '' : 's'} left today`
                : timerText}
            </Text>

            {!hasSessionsLeft && (
              <View style={styles.reminderRow}>
                <View style={styles.reminderLeft}>
                  <Bell
                    size={18}
                    color={remindersEnabled ? (colors.tealAccent || '#2BD9C4') : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.reminderLabel, { color: colors.onSurfaceVariant }]}>
                    Get Reminder when timer resets
                  </Text>
                </View>
                <Toggle
                  value={remindersEnabled}
                  onValueChange={handleToggleReminders}
                  activeColor={colors.tealAccent || '#2BD9C4'}
                />
              </View>
            )}

            <KeysOptionsContent balance={balance} isPremium={false} showTrialCard={false} />
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
  heroHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  reminderLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
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
