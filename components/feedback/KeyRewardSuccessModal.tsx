import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';

interface KeyRewardSuccessModalProps {
  visible: boolean;
  onUnlockNextSession: () => void;
}

/**
 * Bare content (no native <Modal> wrapper). Use this when embedding the
 * reward screen inside another component's own Modal — e.g. WatchAdPromptSheet
 * swaps this in as an internal "step" so only one native Modal window is ever
 * mounted at a time. Mounting two <Modal>s and toggling them in the same tick
 * causes Android to visually squash the transition and can dismiss the second
 * modal before the user interacts with it.
 */
export function KeyRewardContent({
  onUnlockNextSession,
}: {
  onUnlockNextSession: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#14171C',
          paddingTop: Math.max(insets.top + Spacing.xl, Spacing.xl),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg),
        },
      ]}
    >
      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.onSurface || '#FFFFFF' }]}>
          Your key reward is{'\n'}ready!
        </Text>

        {/* Large Hero 1 + 3D Key */}
        <View style={styles.rewardHeroRow}>
          <Text style={[styles.rewardNumber, { color: StaticColors.achievementAmber || '#F59E0B' }]}>
            1
          </Text>
          <Image
            source={require('@/assets/premium/key.webp')}
            style={styles.keyImage}
            resizeMode="contain"
          />
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant || '#8B949E' }]}>
          Use this to unlock{'\n'}one more session
        </Text>
      </View>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <Pressable
          onPress={onUnlockNextSession}
          style={({ pressed }) => [
            styles.unlockButton,
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Text style={styles.unlockButtonText}>Unlock Next Session</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Standalone version with its own Modal wrapper — kept for any other caller
 * that wants a self-contained modal (not used by WatchAdPromptSheet anymore).
 */
export function KeyRewardSuccessModal({
  visible,
  onUnlockNextSession,
}: KeyRewardSuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onUnlockNextSession}
    >
      <KeyRewardContent onUnlockNextSession={onUnlockNextSession} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    // Content is centered as one group instead of being pushed apart with
    // space-between across the full device height — that's what made this
    // screen look overly stretched on tall phones.
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  rewardHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: Spacing.md,
  },
  rewardNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 72,
    lineHeight: 72,
  },
  keyImage: {
    width: 64,
    height: 64,
    transform: [{ rotate: '-10deg' }],
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: Spacing.lg,
    maxWidth: 260,
  },
  footer: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xxl,
  },
  unlockButton: {
    width: '100%',
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: '#A3E899',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A3E899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  unlockButtonText: {
    color: '#10141A',
    fontFamily: FontFamily.bold,
    fontSize: 18,
    letterSpacing: 0.2,
  },
});
