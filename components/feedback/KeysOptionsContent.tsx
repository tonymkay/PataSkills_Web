import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { ChevronRight, Clock, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { Toggle } from '@/components/ui/Toggle';
import { ensureNotificationPermission, scheduleResetReminder, cancelResetReminder } from '@/lib/notifications';
import { navPush } from '@/lib/navDirection';
import { getKeysState, type KeysState } from '@/lib/keys';
import type { Track } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

interface KeysOptionsContentProps {
  /** Forwarded as ?skill=&track= through keys-packs/subscription-plans so
   *  "Continue Playing" after a purchase resumes the same skill/track. */
  skillId?: CurriculumSlug;
  track?: Track;
  /** Override the timer target — when omitted the component reads it from
   *  the keys state in AsyncStorage on mount. */
  resetAt?: number | null;
  /** Current key balance — when omitted, reads from getKeysState() on mount. */
  balance?: number | null;
  /** Whether the account has unlimited premium pass. */
  isPremium?: boolean;
  /** Whether to render the "Use Free trial" card (with its countdown +
   *  reminder toggle). Defaults to true; pass false when the host screen
   *  already renders that status/reminder UI itself (e.g. the Keys tab). */
  showTrialCard?: boolean;
  /** Optional custom buy-keys handler. Falls back to navigating to /keys-packs. */
  onBuyKeysPress?: () => void;
  /** Optional custom subscribe handler. Falls back to navigating to /subscription-plans. */
  onSubscribePress?: () => void;
}

/**
 * The three option cards from the out-of-keys flow — Buy Temporary Access
 * Keys, Subscribe for Unlimited, Use Free Trial (with live countdown and
 * reminder toggle). Extracted from SessionStateScreen so it can render both
 * inside the session's out-of-keys screen and as the standalone "Keys" tab.
 */
export function KeysOptionsContent({
  skillId,
  track,
  resetAt: resetAtProp,
  balance: balanceProp,
  isPremium: isPremiumProp,
  showTrialCard = true,
  onBuyKeysPress,
  onSubscribePress,
}: KeysOptionsContentProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedOption, setSelectedOption] = useState<'keys' | 'unlimited' | 'trial' | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [resetAt, setResetAt] = useState<number | null>(resetAtProp ?? null);
  const [balance, setBalance] = useState<number | null>(balanceProp ?? null);
  const [isPremium, setIsPremium] = useState<boolean>(isPremiumProp ?? false);

  // Read timer state + keys state + reminder pref on mount when no prop override
  useEffect(() => {
    if (resetAtProp === undefined || balanceProp === undefined || isPremiumProp === undefined) {
      getKeysState()
        .then((ks: KeysState) => {
          if (resetAtProp === undefined) setResetAt(ks.resetAt);
          if (balanceProp === undefined) setBalance(ks.isPremium ? 999999 : ks.balance);
          if (isPremiumProp === undefined) setIsPremium(!!ks.isPremium);
        })
        .catch(() => {});
    }
    AsyncStorage.getItem('@play/timer_reminders').then((val) => {
      const enabled = val === 'true';
      setRemindersEnabled(enabled);
    }).catch(() => {});
  }, [resetAtProp, balanceProp, isPremiumProp]);

  useEffect(() => {
    if (balanceProp !== undefined) setBalance(balanceProp);
  }, [balanceProp]);

  useEffect(() => {
    if (isPremiumProp !== undefined) setIsPremium(isPremiumProp);
  }, [isPremiumProp]);

  useEffect(() => {
    if (resetAtProp !== undefined) setResetAt(resetAtProp);
  }, [resetAtProp]);

  // Live countdown tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!resetAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resetAt]);

  const secondsLeft = resetAt ? Math.max(0, Math.ceil((resetAt - now) / 1000)) : 0;
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timerText =
    hours > 0
      ? `Resets in ${hours}h ${String(minutes).padStart(2, '0')}m`
      : `Resets in ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} mins`;

  const hasKeys = isPremium || (balance !== null && balance > 0);

  const trialSubtitle = hasKeys
    ? (isPremium ? 'You have unlimited sessions' : `You have ${balance} session${balance === 1 ? '' : 's'} left`)
    : (resetAt ? timerText : 'Free session timer active');

  const handleBuyKeys = () => {
    if (onBuyKeysPress) {
      onBuyKeysPress();
    } else {
      navPush(router, { pathname: '/keys-packs', params: { skill: skillId, track } });
    }
  };

  const handleSubscribe = () => {
    if (onSubscribePress) {
      onSubscribePress();
      return;
    }
    // Web subscriptions go through Paystack exactly like keys do -- no
    // platform gate needed here (previously blocked with a "download the
    // app" modal, back when web had no subscribe path of its own).
    navPush(router, { pathname: '/subscription-plans', params: { skill: skillId, track } });
  };

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

  return (
    <View style={styles.options}>
      {/* Option 1: Buy one time keys */}
      <Pressable
        onPress={() => {
          setSelectedOption('keys');
          handleBuyKeys();
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: selectedOption === 'keys' ? StaticColors.achievementAmber : colors.surfaceContainerHigh,
            borderWidth: selectedOption === 'keys' ? 2 : 1,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Buy Temporary Access Keys
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Packs of 20, 40, 80 or 120 keys
              </Text>
            </View>
          </View>
          <ChevronRight
            size={22}
            color={selectedOption === 'keys' ? StaticColors.achievementAmber : colors.onSurfaceVariant}
          />
        </View>
      </Pressable>

      {/* Option 2: Subscribe for Unlimited */}
      <Pressable
        onPress={() => {
          setSelectedOption('unlimited');
          handleSubscribe();
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: selectedOption === 'unlimited' ? StaticColors.successLime : colors.surfaceContainerHigh,
            borderWidth: selectedOption === 'unlimited' ? 2 : 1,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Image
              source={require('@/assets/premium/crown.webp')}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Subscribe for Unlimited
              </Text>
              <Text style={[styles.cardSubtitle, { color: StaticColors.successLime, fontFamily: FontFamily.semiBold }]}>
                Get full experience with premium
              </Text>
            </View>
          </View>
          <ChevronRight
            size={22}
            color={selectedOption === 'unlimited' ? StaticColors.successLime : colors.onSurfaceVariant}
          />
        </View>
      </Pressable>

      {/* Option 3: Use Free trial */}
      {showTrialCard && (
        <Pressable
          onPress={() => {
            setSelectedOption('trial');
            navPush(router, '/how-free-mode-works');
          }}
          style={({ pressed }) => [
            styles.card,
            !hasKeys && styles.trialCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: selectedOption === 'trial' ? (colors.tealAccent || '#2BD9C4') : colors.surfaceContainerHigh,
              borderWidth: selectedOption === 'trial' ? 2 : 1,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={[styles.trialIconBox, { backgroundColor: 'rgba(43, 217, 196, 0.14)' }]}>
                <Clock size={28} color={colors.tealAccent || '#2BD9C4'} strokeWidth={2.4} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Use Free trial
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.tealAccent || '#2BD9C4', fontFamily: FontFamily.semiBold }]}>
                  {trialSubtitle}
                </Text>
              </View>
            </View>
            <ChevronRight
              size={22}
              color={selectedOption === 'trial' ? (colors.tealAccent || '#2BD9C4') : colors.onSurfaceVariant}
            />
          </View>

          {/* Reminders Toggle Subrow - only shown when out of keys and cooldown timer is active */}
          {!hasKeys && (
            <View style={[styles.reminderSubrow, { borderTopColor: colors.surfaceContainerHigh }]}>
              <View style={styles.reminderLeft}>
                <Bell size={16} color={remindersEnabled ? (colors.tealAccent || '#2BD9C4') : colors.onSurfaceVariant} />
                <Text style={[styles.reminderLabel, { color: colors.onSurfaceVariant }]}>
                  Get reminders when timer resets
                </Text>
              </View>
              <Toggle
                value={remindersEnabled}
                onValueChange={handleToggleReminders}
                activeColor={colors.tealAccent || '#2BD9C4'}
              />
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    width: '100%',
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.gutter,
    borderWidth: 1,
  },
  trialCard: {
    paddingBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  cardImage: {
    width: 50,
    height: 50,
  },
  trialIconBox: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  reminderSubrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  reminderLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
});
