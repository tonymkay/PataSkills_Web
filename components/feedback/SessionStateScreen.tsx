import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { KeyRound, Lock, Medal, Share2, Sparkles, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { FontFamily, Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';

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
    icon: Sparkles,
    iconColor: StaticColors.runPurple,
    title: 'Great Progress!',
    subtitle: 'Nice work. You finished this sign pair.',
    primary: 'NEXT SESSION',
    secondary: 'REDO SESSION',
  },
  chapterComplete: {
    icon: Medal,
    iconColor: StaticColors.runPurple,
    title: 'Great Progress!',
    subtitle: 'You finished this chapter.',
    primary: 'NEXT SESSION',
    secondary: 'REDO SESSION',
  },
  sessionUnlocked: {
    icon: KeyRound, // unused — sessionUnlocked renders the unlock.webp image instead
    iconColor: StaticColors.successLime,
    title: 'You have unlocked\nNext Session!',
    subtitle: '',
    primary: 'START SESSION',
  },
  keysReset: {
    icon: KeyRound, // unused — keysReset renders the key.webp image + count instead
    iconColor: StaticColors.achievementAmber,
    title: 'You have new Keys!',
    subtitle: 'Keys Added',
    primary: 'UNLOCK NEXT SESSION',
  },
  rewardUnlocked: {
    icon: KeyRound,
    iconColor: StaticColors.successLime,
    title: 'Reward unlocked!',
    subtitle: 'You earned 1 key, enough for one more session. Nice.',
    primary: 'COLLECT',
  },
  outOfKeys: {
    icon: Lock,
    iconColor: StaticColors.runPurpleDim,
    title: 'Choose how to\nproceed',
    subtitle: '',
    primary: '',
    secondary: 'WAIT UNTIL TOMORROW',
  },
  shareApp: {
    icon: Share2,
    iconColor: '#2BD964',
    title: 'Share App with friends',
    subtitle: 'Recommend PataSkills to your friends and get 1 key.',
    primary: 'SHARE WITH FRIENDS',
    secondary: 'MAYBE LATER',
    primaryDisabled: true,
  },
  rateApp: {
    icon: Star,
    iconColor: StaticColors.achievementAmber,
    title: 'Enjoying PataSkills?',
    subtitle: 'Rate the app to help us keep improving.',
    primary: 'RATE THE APP',
    secondary: 'MAYBE LATER',
  },
};

export function SessionStateScreen({
  kind,
  title,
  subtitle,
  totalXp = 0,
  scoreText = '0/0',
  keysLeft = 0,
  resetAt = null,
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
  const showStats = kind === 'topicComplete' || kind === 'chapterComplete';
  const showRewardValue = kind === 'shareApp';
  const isSessionUnlocked = kind === 'sessionUnlocked';
  const isKeysReset = kind === 'keysReset';
  const isOutOfKeys = kind === 'outOfKeys';
  const useTrophy = showStats;

  // Default actions if not explicitly passed
  const handleBuyKeys = onBuyKeysPress || (() => router.push('/keys-packs'));
  const handleSubscribe = onSubscribePress || (() => router.push('/subscription-plans'));

  // The timer is the source of truth: tick a clock reading and derive the
  // remaining time from the real `resetAt` timestamp each render, rather
  // than counting down a locally-invented duration.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOutOfKeys || !resetAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOutOfKeys, resetAt]);

  const secondsLeft = resetAt ? Math.max(0, Math.ceil((resetAt - now) / 1000)) : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerText = `Resets in ${minutes}:${String(seconds).padStart(2, '0')} mins`;

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
          {/* Header Title */}
          <Text style={[styles.proceedTitle, { color: colors.onSurface }]}>
            {title || config.title}
          </Text>

          {/* Options List */}
          <View style={styles.proceedOptions}>
            {/* Option 1: Buy one time keys */}
            <Pressable
              onPress={handleBuyKeys}
              style={({ pressed }) => [
                styles.proceedRow,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Image
                source={require('@/assets/premium/key.webp')}
                style={styles.proceedImage}
                resizeMode="contain"
              />
              <Text style={[styles.proceedOptionText, { color: colors.onSurface }]}>
                Buy one time{'\n'}keys
              </Text>
            </Pressable>

            {/* Option 2: Subscribe for unlimited */}
            <Pressable
              onPress={handleSubscribe}
              style={({ pressed }) => [
                styles.proceedRow,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Image
                source={require('@/assets/premium/crown.webp')}
                style={styles.proceedImage}
                resizeMode="contain"
              />
              <Text style={[styles.proceedOptionText, { color: colors.onSurface }]}>
                Subscribe for{'\n'}unlimited
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actions}>
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

          {resetAt ? (
            <Text style={[styles.timerText, { color: colors.tealAccent }]}>
              {timerText}
            </Text>
          ) : null}
        </View>
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
              <Text style={[styles.statValue, { color: colors.onSurface }]}>{scoreText}</Text>
              <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>SCORE</Text>
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
        ) : config.primary ? (
          <Pressable
            onPress={config.primaryDisabled ? undefined : onPrimaryPress}
            disabled={config.primaryDisabled}
            style={[
              styles.primaryButton,
              config.primaryDisabled && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryText}>{config.primary}</Text>
          </Pressable>
        ) : null}

        {/* Secondary */}
        {config.secondary ? (
          <Pressable
            onPress={onSecondaryPress}
            style={[
              styles.secondaryButton,
              useTrophy
                ? {
                    borderColor: colors.outlineVariant,
                    backgroundColor: colors.surfaceContainerLow,
                  }
                : { borderColor: colors.outlineVariant },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.onSurface }]}>
              {config.secondary}
            </Text>
          </Pressable>
        ) : null}

        {isOutOfKeys && resetAt ? (
          <Text style={[styles.timerText, { color: colors.tealAccent }]}>{timerText}</Text>
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
    justifyContent: 'center',
  },
  /* Proceed / Out of Keys Screen */
  proceedContent: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  proceedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'left',
    marginBottom: Spacing.xxl,
  },
  proceedOptions: {
    gap: Spacing.xl,
  },
  proceedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
  },
  proceedImage: {
    width: 76,
    height: 76,
  },
  proceedOptionText: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
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
    lineHeight: 42,
  },
  statLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  rewardBox: {
    width: '100%',
    minHeight: 132,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  rewardNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 58,
    lineHeight: 64,
  },
  actions: {
    gap: Spacing.sm,
  },
  /* Green gradient primary (topic/chapter complete) */
  gradientButton: {
    minHeight: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  gradientButtonText: {
    color: '#1A1D24',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  /* White primary (other states) */
  primaryButton: {
    minHeight: 56,
    borderRadius: Radius.full,
    backgroundColor: '#F8F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryText: {
    color: '#1A1D24',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  secondaryText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    lineHeight: 19,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  timerText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
