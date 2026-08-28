import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { KeyRound, Lock, Medal, Share2, Sparkles, Star } from 'lucide-react-native';
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
  | 'lowKeys'
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
    title: 'Topic complete!',
    subtitle: 'Nice work. You finished this sign pair.',
    primary: 'CONTINUE',
  },
  chapterComplete: {
    icon: Medal,
    iconColor: StaticColors.runPurple,
    title: 'Chapter complete!',
    subtitle: 'You finished this chapter.',
    primary: 'CONTINUE',
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
  lowKeys: {
    icon: Lock,
    iconColor: StaticColors.runPurpleDim,
    title: "You're running low on keys",
    subtitle: 'Watch a quick ad to top up before you run out.',
    primary: 'WATCH AN AD FOR AN EXTRA KEY',
    secondary: 'MAYBE LATER',
    primaryDisabled: true,
  },
  outOfKeys: {
    icon: Lock,
    iconColor: StaticColors.runPurpleDim,
    title: "You're out of keys for today",
    subtitle: 'Buy more Keys to keep going.',
    primary: 'BUY KEYS',
    secondary: 'WAIT UNTIL TOMORROW',
    primaryDisabled: true,
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
}: SessionStateScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const config = stateCopy[kind];
  const Icon = config.icon;
  const showStats = kind === 'topicComplete' || kind === 'chapterComplete';
  const showRewardValue = kind === 'shareApp';
  const isSessionUnlocked = kind === 'sessionUnlocked';
  const isKeysReset = kind === 'keysReset';
  const isOutOfKeys = kind === 'outOfKeys';

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
        {isSessionUnlocked ? (
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
        <Text style={[Typography.scoreMainTitle, styles.title, { color: colors.onSurface }]}>
          {title || config.title}
        </Text>
        {isSessionUnlocked ? (
          <Text style={[Typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
            You have <Text style={{ color: StaticColors.tealAccent }}>{keysLeft} keys</Text> Left
          </Text>
        ) : (
          <Text style={[Typography.bodyLarge, styles.subtitle, { color: kind === 'topicComplete' ? colors.tealAccent : colors.onSurfaceVariant }]}>
            {subtitle || config.subtitle}
          </Text>
        )}

        {showStats ? (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text style={[styles.statValue, { color: '#2BD964' }]}>{totalXp}</Text>
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

      <View style={styles.actions}>
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

        {config.secondary ? (
          <Pressable
            onPress={onSecondaryPress}
            style={[styles.secondaryButton, { borderColor: colors.outlineVariant }]}
          >
            <Text style={[styles.secondaryText, { color: colors.onSurface }]}>{config.secondary}</Text>
          </Pressable>
        ) : null}

        {isOutOfKeys ? (
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
  title: {
    textAlign: 'center',
    marginTop: Spacing.md,
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
    textAlign: 'center',
    marginTop: Spacing.base,
    maxWidth: 640,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
    width: '100%',
  },
  statCard: {
    flex: 1,
    minHeight: 102,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 28,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    marginTop: Spacing.xs,
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
    gap: Spacing.gutter,
  },
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
    letterSpacing: 0,
  },
  timerText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
