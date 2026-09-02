import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Tv, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';
import { showRewardedForSession } from '@/lib/ads';
import { KeyRewardContent } from './KeyRewardSuccessModal';

interface WatchAdPromptSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdRewarded: () => void;
  onDismissToHome: () => void;
}

export function WatchAdPromptSheet({
  visible,
  onClose,
  onAdRewarded,
  onDismissToHome,
}: WatchAdPromptSheetProps) {
  const { colors } = useTheme();
  const [loadingAd, setLoadingAd] = useState(false);
  // 'prompt' = "watch an ad?" sheet, 'reward' = key reward screen.
  // Both render inside the SAME <Modal> below — mounting two separate native
  // Modals and toggling them in the same tick is what caused the reward
  // screen to look squashed/stretched and to get dismissed automatically on
  // Android (the OS was closing both modal windows at once).
  const [step, setStep] = useState<'prompt' | 'reward'>('prompt');

  // Reset back to the prompt step whenever the sheet is reopened.
  React.useEffect(() => {
    if (visible) setStep('prompt');
  }, [visible]);

  const handleWatchAd = async () => {
    setLoadingAd(true);
    const outcome = await showRewardedForSession();
    setLoadingAd(false);

    if (outcome === 'earned') {
      setStep('reward');
    } else {
      onDismissToHome();
    }
  };

  const handleUnlockNextSession = () => {
    onAdRewarded();
  };

  return (
    <Modal
      visible={visible}
      transparent={step === 'prompt'}
      animationType={step === 'prompt' ? 'slide' : 'fade'}
      onRequestClose={step === 'prompt' ? onClose : undefined}
    >
      {step === 'reward' ? (
        <KeyRewardContent onUnlockNextSession={handleUnlockNextSession} />
      ) : (
      <View style={styles.backdrop}>
        <View style={styles.sheetWrapper}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceContainer || '#1C2029',
              borderColor: colors.surfaceContainerHigh || '#2A2E38',
            },
          ]}
        >
          {/* Close button — dismisses the sheet only, cancels the exit intent */}
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <X size={20} color={colors.onSurfaceVariant} />
          </Pressable>

          {/* Hero Icon */}
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
              <Tv size={32} color={StaticColors.achievementAmber} strokeWidth={2.2} />
            </View>
            <View style={styles.sparkleBadge}>
              <Sparkles size={14} color="#000" />
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Watch an ad for an extra session?
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Get 1 instant bonus session right now without waiting for the cooldown timer.
          </Text>

          {/* Primary Action */}
          <Pressable
            onPress={handleWatchAd}
            disabled={loadingAd}
            style={({ pressed }) => [
              styles.watchBtn,
              { backgroundColor: StaticColors.achievementAmber },
              (pressed || loadingAd) && { opacity: 0.85 },
            ]}
          >
            {loadingAd ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.watchBtnText}>WATCH AD (+1 SESSION)</Text>
            )}
          </Pressable>

          {/* Secondary Action */}
          <Pressable
            onPress={onDismissToHome}
            style={({ pressed }) => [
              styles.dismissBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.dismissBtnText, { color: colors.onSurfaceVariant }]}>
              Go to Home
            </Text>
          </Pressable>
        </View>
        </View>
      </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
    padding: Spacing.xs,
  },
  iconWrap: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: StaticColors.successLime,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  watchBtn: {
    width: '100%',
    height: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  watchBtnText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: Spacing.xs,
  },
  dismissBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
