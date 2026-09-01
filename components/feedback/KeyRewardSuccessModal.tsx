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

export function KeyRewardSuccessModal({
  visible,
  onUnlockNextSession,
}: KeyRewardSuccessModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onUnlockNextSession}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background || '#14171C',
            paddingTop: Math.max(insets.top + Spacing.xxl, Spacing.xxl * 2),
            paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.xl),
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  rewardHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: Spacing.xl,
  },
  rewardNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 100,
    lineHeight: 100,
  },
  keyImage: {
    width: 90,
    height: 90,
    transform: [{ rotate: '-10deg' }],
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    marginTop: Spacing.xl,
    maxWidth: 280,
  },
  footer: {
    width: '100%',
    paddingHorizontal: Spacing.sm,
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
