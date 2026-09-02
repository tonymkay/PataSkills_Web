import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image, Platform } from 'react-native';
import { KeyRound, Lock, Medal, Share2, Sparkles, Star, ChevronRight, Clock, Bell, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily, Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { Toggle } from '@/components/ui/Toggle';
import { ensureNotificationPermission, scheduleResetReminder, cancelResetReminder } from '@/lib/notifications';
import { truncateEmailMiddle } from '@/lib/email';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { WatchAdPromptSheet } from '@/components/feedback/WatchAdPromptSheet';

export type SessionStateKind =
  | 'topicComplete'
  | 'chapterComplete'
  | 'sessionUnlocked'
  | 'keysReset'
  | 'rewardUnlocked'
  | 'outOfKeys'
  | 'shareApp'
  | 'rateApp';

interface SessionStateScreenProps {
  kind: SessionStateKind;
  title?: string;
  subtitle?: string;
  totalXp?: number;
  scoreText?: string;
  progressText?: string;
  /** sessionUnlocked only: keys remaining, highlighted in the subtitle.
   *  keysReset also uses this for the "N keys added" count. */
  keysLeft?: number;
  /** outOfKeys only: epoch ms when the key balance refills. The countdown
   *  is derived from this real timestamp — it's the source of truth, not
   *  just a display value. */
  resetAt?: number | null;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onBuyKeysPress?: () => void;
  onSubscribePress?: () => void;
}

const stateCopy: Record<
  SessionStateKind,
  {
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    iconColor: string;
    title: string;
    subtitle: string;
    primary: string;
    secondary?: string;
    primaryDisabled?: boolean;
  }
> = {
  topicComplete: {
    icon: Medal,
    iconColor: StaticColors.successLime,
    title: 'Great Progress!',
    subtitle: '',
    primary: 'NEXT SESSION',
    secondary: 'REDO SESSION',
  },
  chapterComplete: {
    icon: Medal,
    iconColor: StaticColors.successLime,
    title: 'Chapter Completed!',
    subtitle: 'Great Job, keep up the good work',
    primary: 'CONTINUE',
  },
  sessionUnlocked: {
    icon: Lock,
    iconColor: StaticColors.tealAccent,
    title: 'Session Unlocked!',
    subtitle: '',
    primary: 'START SESSION',
  },
  keysReset: {
    icon: Lock,
    iconColor: StaticColors.achievementAmber,
    title: 'You have new Keys!',
    subtitle: 'Keys Added',
    primary: 'UNLOCK NEXT SESSION',
  },
  rewardUnlocked: {
    icon: KeyRound,
    iconColor: StaticColors.achievementAmber,
    title: 'Reward Unlocked!',
    subtitle: 'Earned 1 Key for Completing Section',
    primary: 'CLAIM REWARD',
  },
  outOfKeys: {
    icon: Lock,
    iconColor: StaticColors.achievementAmber,
    title: 'Choose how to proceed',
    subtitle: 'Packs of 20, 40, 80 or 120 keys',
    primary: 'CONTINUE',
    secondary: 'WAIT UNTIL TOMORROW',
  },
  shareApp: {
    icon: Share2,
    iconColor: StaticColors.achievementAmber,
    title: 'Share the app to keep learning',
    subtitle: 'Share with friends to instantly unlock the next session and earn bonus keys.',
    primary: 'SHARE APP',
    secondary: 'WAIT UNTIL TOMORROW',
  },
  rateApp: {
    icon: Star,
    iconColor: StaticColors.achievementAmber,
    title: 'Rate the app to keep learning',
    subtitle: 'Leave a quick rating on the store to unlock the next session immediately.',
    primary: 'RATE APP',
    secondary: 'WAIT UNTIL TOMORROW',
  },
};

export function SessionStateScreen({
  kind,
  title,
  subtitle,
  totalXp = 0,
  scoreText = '0/0',
  progressText,
  keysLeft = 0,
  resetAt,
  onPrimaryPress,
  onSecondaryPress,
  onBuyKeysPress,
  onSubscribePress,
}: SessionStateScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const config = stateCopy[kind];
  const Icon = config.icon;

  const [selectedProceedOption, setSelectedProceedOption] = useState<'keys' | 'unlimited' | 'trial' | null>('keys');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [watchAdSheetVisible, setWatchAdSheetVisible] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@play/user_email').then((email) => {
      if (email) setLinkedEmail(email);
    }).catch(() => {});
  }, []);

  const handleRestoreSuccess = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      router.replace({ pathname: '/', params: { resume: 'true' } });
    }
  };

  const handleAdRewarded = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      router.replace({ pathname: '/', params: { resume: 'true' } });
    }
  };

  const handleDismissToHome = () => {
    setWatchAdSheetVisible(false);
    onSecondaryPress?.();
  };

  const handleAttemptExit = () => {
    setWatchAdSheetVisible(true);
  };

  useEffect(() => {
    AsyncStorage.getItem('@play/timer_reminders').then((val) => {
      const enabled = val === 'true';
      setRemindersEnabled(enabled);
      if (enabled && resetAt) {
        scheduleResetReminder(resetAt);
      }
    }).catch(() => {});
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

  const isOutOfKeys = kind === 'outOfKeys';
  const showStats = kind === 'topicComplete' || kind === 'chapterComplete';
  const showRewardValue = kind === 'rewardUnlocked';
  const isSessionUnlocked = kind === 'sessionUnlocked';
  const isKeysReset = kind === 'keysReset';
  const useTrophy = kind === 'topicComplete' || kind === 'chapterComplete';

  const handleBuyKeys = () => {
    if (onBuyKeysPress) {
      onBuyKeysPress();
    } else {
      router.push('/keys-packs');
    }
  };

  const handleSubscribe = () => {
    if (onSubscribePress) {
      onSubscribePress();
    } else {
      router.push('/subscription-plans');
    }
  };

  const handleProceedContinue = () => {
    if (selectedProceedOption === 'keys') {
      handleBuyKeys();
    } else if (selectedProceedOption === 'unlimited') {
      handleSubscribe();
    } else if (selectedProceedOption === 'trial') {
      router.push('/how-free-mode-works');
    }
  };

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOutOfKeys || !resetAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOutOfKeys, resetAt]);

  const secondsLeft = resetAt ? Math.max(0, Math.ceil((resetAt - now) / 1000)) : 0;
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timerText =
    hours > 0
      ? `Resets in ${hours}h ${String(minutes).padStart(2, '0')}m`
      : `Resets in ${minutes}:${String(seconds).padStart(2, '0')} mins`;

  if (isOutOfKeys) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background || '#1A1D24',
            paddingTop: Math.max(insets.top, Spacing.xl),
            paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
          },
        ]}
      >
        <View style={styles.proceedContent}>
          {/* Dismiss Button — top-left, above the title */}
          <Pressable onPress={handleAttemptExit} hitSlop={12} style={styles.proceedCloseBtnTopLeft}>
            <X size={22} color={colors.onSurfaceVariant} />
          </Pressable>

          {/* Title */}
          <Text style={[styles.proceedTitle, { color: colors.onSurface }]}>
            {title || config.title}
          </Text>

          {/* Options List */}
          <View style={styles.proceedOptions}>
            {/* Option 1: Buy one time keys */}
            <Pressable
              onPress={() => setSelectedProceedOption('keys')}
              style={({ pressed }) => [
                styles.proceedCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: selectedProceedOption === 'keys' ? StaticColors.achievementAmber : colors.surfaceContainerHigh,
                  borderWidth: selectedProceedOption === 'keys' ? 2 : 1,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.proceedCardRow}>
                <View style={styles.proceedCardLeft}>
                  <Image
                    source={require('@/assets/premium/key.webp')}
                    style={styles.proceedCardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.proceedCardTextWrap}>
                    <Text style={[styles.proceedCardTitle, { color: colors.onSurface }]}>
                      Buy one-time keys
                    </Text>
                    <Text
                      style={[
                        styles.proceedCardSubtitle,
                        { color: selectedProceedOption === 'keys' ? StaticColors.achievementAmber : colors.onSurfaceVariant },
                      ]}
                    >
                      Packs of 20, 40, 80 or 120 keys
                    </Text>
                  </View>
                </View>
                <ChevronRight
                  size={22}
                  color={selectedProceedOption === 'keys' ? StaticColors.achievementAmber : colors.onSurfaceVariant}
                />
              </View>
            </Pressable>

            {/* Option 2: Subscribe for Unlimited (Green Highlight) */}
            <Pressable
              onPress={() => setSelectedProceedOption('unlimited')}
              style={({ pressed }) => [
                styles.proceedCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: selectedProceedOption === 'unlimited' ? StaticColors.successLime : colors.surfaceContainerHigh,
                  borderWidth: selectedProceedOption === 'unlimited' ? 2 : 1,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.proceedCardRow}>
                <View style={styles.proceedCardLeft}>
                  <Image
                    source={require('@/assets/premium/crown.webp')}
                    style={styles.proceedCardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.proceedCardTextWrap}>
                    <Text style={[styles.proceedCardTitle, { color: colors.onSurface }]}>
                      Subscribe for Unlimited
                    </Text>
                    <Text
                      style={[
                        styles.proceedCardSubtitle,
                        { color: selectedProceedOption === 'unlimited' ? StaticColors.successLime : colors.onSurfaceVariant },
                      ]}
                    >
                      Get full experience with premium
                    </Text>
                  </View>
                </View>
                <ChevronRight
                  size={22}
                  color={selectedProceedOption === 'unlimited' ? StaticColors.successLime : colors.onSurfaceVariant}
                />
              </View>
            </Pressable>

            {/* Option 3: Use Free trial */}
            <Pressable
              onPress={() => setSelectedProceedOption('trial')}
              style={({ pressed }) => [
                styles.proceedCard,
                styles.trialCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: selectedProceedOption === 'trial' ? (colors.tealAccent || '#2BD9C4') : colors.surfaceContainerHigh,
                  borderWidth: selectedProceedOption === 'trial' ? 2 : 1,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.proceedCardRow}>
                <View style={styles.proceedCardLeft}>
                  <View style={[styles.trialIconBox, { backgroundColor: 'rgba(43, 217, 196, 0.14)' }]}>
                    <Clock size={28} color={colors.tealAccent || '#2BD9C4'} strokeWidth={2.4} />
                  </View>
                  <View style={styles.proceedCardTextWrap}>
                    <Text style={[styles.proceedCardTitle, { color: colors.onSurface }]}>
                      Use Free trial
                    </Text>
                    <Text style={[styles.proceedCardSubtitle, { color: colors.tealAccent || '#2BD9C4', fontFamily: FontFamily.semiBold }]}>
                      {resetAt ? timerText : 'Free session timer active'}
                    </Text>
                  </View>
                </View>
                <ChevronRight
                  size={22}
                  color={selectedProceedOption === 'trial' ? (colors.tealAccent || '#2BD9C4') : colors.onSurfaceVariant}
                />
              </View>

              {/* Reminders Toggle Subrow inside Free Trial card */}
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
            </Pressable>

            {/* Existing user, login link */}
            <Pressable
              onPress={() => setRestoreModalVisible(true)}
              hitSlop={10}
              style={styles.restoreAccountLinkWrap}
            >
              <Text style={[styles.restoreAccountLinkText, { color: colors.onSurfaceVariant }]}>
                {linkedEmail ? `Logged in as ${truncateEmailMiddle(linkedEmail)}` : 'Existing user, login'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Single Continue Button (Like CheckButton) */}
        <View style={styles.actions}>
          <Pressable
            disabled={!selectedProceedOption}
            onPress={handleProceedContinue}
            style={({ pressed }) => [
              styles.continueCheckBtn,
              selectedProceedOption
                ? styles.continueCheckBtnActive
                : styles.continueCheckBtnDisabled,
              pressed && selectedProceedOption ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : null,
            ]}
          >
            <Text
              style={[
                styles.continueCheckBtnText,
                selectedProceedOption
                  ? styles.continueCheckBtnTextActive
                  : styles.continueCheckBtnTextDisabled,
              ]}
            >
              CONTINUE
            </Text>
          </Pressable>
        </View>

        {/* Restore Account Modal */}
        <RestoreAccountModal
          visible={restoreModalVisible}
          onClose={() => setRestoreModalVisible(false)}
          onSuccess={(result) => {
            setLinkedEmail(result.email);
            handleRestoreSuccess();
          }}
          currentEmail={linkedEmail}
          onLoggedOut={() => setLinkedEmail(null)}
        />

        {/* Rewarded Ad Exit Prompt Bottom Sheet */}
        <WatchAdPromptSheet
          visible={watchAdSheetVisible}
          onClose={() => setWatchAdSheetVisible(false)}
          onAdRewarded={handleAdRewarded}
          onDismissToHome={handleDismissToHome}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#1A1D24',
          paddingTop: Math.max(insets.top, Spacing.lg),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
        },
      ]}
    >
      <View style={styles.content}>
        {/* Hero Image / Icon */}
        {useTrophy ? (
          <Image
            source={require('@/assets/homepage/trophy.webp')}
            style={styles.trophyImage}
            resizeMode="contain"
          />
        ) : isSessionUnlocked ? (
          <Image
            source={require('@/assets/premium/unlock.webp')}
            style={styles.unlockImage}
            resizeMode="contain"
          />
        ) : isKeysReset ? (
          <View style={styles.keysRow}>
            <Text style={[styles.keysNumber, { color: StaticColors.achievementAmber }]}>{keysLeft}</Text>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.keyImage}
              resizeMode="contain"
            />
          </View>
        ) : (
          <Icon size={64} color={config.iconColor} strokeWidth={2.5} />
        )}

        {/* Title */}
        <Text style={[styles.title, { color: colors.onSurface }]}>
          {title || config.title}
        </Text>

        {/* Subtitle */}
        {isSessionUnlocked ? (
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            You have <Text style={{ color: colors.tealAccent }}>{keysLeft} keys</Text> Left
          </Text>
        ) : (
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {subtitle || config.subtitle}
          </Text>
        )}

        {/* Stats Cards */}
        {showStats ? (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text style={[styles.statValue, { color: StaticColors.successLime }]}>{totalXp}</Text>
              <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>TOTAL XP</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text style={styles.statValue}>
                {(() => {
                  const text = progressText || scoreText;
                  const slashIndex = text.indexOf('/');
                  if (slashIndex === -1) {
                    return <Text style={{ color: colors.onSurface }}>{text}</Text>;
                  }
                  return (
                    <>
                      <Text style={[styles.statValueMain, { color: StaticColors.achievementAmber }]}>
                        {text.slice(0, slashIndex)}
                      </Text>
                      <Text style={[styles.statValueSub, { color: colors.onSurfaceVariant }]}>
                        {text.slice(slashIndex)}
                      </Text>
                    </>
                  );
                })()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>TOPICS DONE</Text>
            </View>
          </View>
        ) : null}

        {showRewardValue ? (
          <View
            style={[
              styles.rewardBox,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.rewardNumber, { color: colors.onSurface }]}>1</Text>
            <KeyRound size={58} color={StaticColors.achievementAmber} strokeWidth={2.8} />
          </View>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Primary — green gradient for topic/chapter, white for others */}
        {useTrophy ? (
          <Pressable
            onPress={config.primaryDisabled ? undefined : onPrimaryPress}
            disabled={config.primaryDisabled}
            style={[config.primaryDisabled && styles.disabledButton]}
          >
            <LinearGradient
              colors={['#2BD964', '#93F205']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>
                {config.primary}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={config.primaryDisabled ? undefined : onPrimaryPress}
            disabled={config.primaryDisabled}
            style={[styles.primaryButton, config.primaryDisabled && styles.disabledButton]}
          >
            <Text style={styles.primaryText}>
              {config.primary}
            </Text>
          </Pressable>
        )}

        {/* Secondary — Redo or Wait */}
        {config.secondary ? (
          <Pressable
            onPress={onSecondaryPress}
            style={[styles.secondaryButton, { borderColor: colors.outlineVariant }]}
          >
            <Text style={[styles.secondaryText, { color: colors.onSurfaceVariant }]}>
              {config.secondary}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    width: '100%',
  },
  /* Proceed / Out of Keys Screen */
  proceedContent: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  proceedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.xl,
  },
  proceedCloseBtnTopLeft: {
    alignSelf: 'flex-start',
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  proceedOptions: {
    width: '100%',
    gap: Spacing.md,
  },
  proceedCard: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.gutter,
    borderWidth: 1,
  },
  trialCard: {
    paddingBottom: Spacing.sm,
  },
  proceedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proceedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  proceedCardImage: {
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
  proceedCardTextWrap: {
    flex: 1,
    gap: 2,
  },
  proceedCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  proceedCardSubtitle: {
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

  /* Bottom Continue Button (Like CheckButton) */
  continueCheckBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueCheckBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  continueCheckBtnDisabled: {
    backgroundColor: '#2A2E38',
  },
  continueCheckBtnText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  continueCheckBtnTextActive: {
    color: '#000000',
  },
  continueCheckBtnTextDisabled: {
    color: '#6B7280',
  },

  trophyImage: {
    width: 120,
    height: 120,
    marginBottom: Spacing.base,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: Spacing.gutter,
  },
  unlockImage: {
    width: 160,
    height: 160,
  },
  keysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  keysNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 72,
    lineHeight: 84,
  },
  keyImage: {
    width: 90,
    height: 90,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.base,
    maxWidth: 640,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
  },
  statCard: {
    flex: 1,
    minHeight: 102,
    borderRadius: Radius.md,
    padding: Spacing.gutter,
    justifyContent: 'flex-end',
  },
  statValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 36,
    lineHeight: 40,
  },
  statValueMain: {
    fontFamily: FontFamily.extraBold,
    fontSize: 36,
    lineHeight: 40,
  },
  statValueSub: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 24,
    opacity: 0.6,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  rewardNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 38,
  },
  actions: {
    gap: Spacing.sm,
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  gradientButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.4,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  timerText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  restoreAccountLinkWrap: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  restoreAccountLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
