import React, { useState, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Tv, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';
import { showRewardedForSession, preloadRewarded } from '@/lib/ads';
import { grantBonusKey } from '@/lib/keys';
import { KeyRewardContent } from './KeyRewardSuccessModal';
import { DownloadAppModal } from '@/components/ui/DownloadAppModal';

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
  // Guards handleUnlockNextSession against a rapid double-tap granting the
  // key twice before onAdRewarded() has a chance to transition the screen
  // away — a ref (not state) so the very next synchronous tap is already
  // blocked, no render cycle needed.
  const grantingRef = useRef(false);
  // 'prompt' = "watch an ad?" sheet, 'reward' = key reward screen.
  // Both render inside the SAME <Modal> below — mounting separate native
  // Modals and toggling them in the same tick is what caused the reward
  // screen to look squashed/stretched and to get dismissed automatically on
  // Android (the OS was closing both modal windows at once).
  // 'download' = web-only fallback. Rewarded ads aren't a reliable web
  // product (the Ad Placement API used to require account enrollment, and
  // adBreakDone sometimes never fires — leaving the WATCH AD button spinning
  // forever with no timeout). Rather than gamble on that, web goes straight
  // to prompting an app install, same as the subscribe flow.
  // 'unavailable' = the ad genuinely failed to load/show (outcome
  // 'unavailable' from showRewardedForSession — no fill, load timeout, or
  // an AdEventType.ERROR) — previously this silently fell through to
  // onDismissToHome() same as a user-skipped ad, so a load failure looked
  // identical to "I chose not to watch it." Now it gets its own explicit
  // state with a Try Again action.
  const [step, setStep] = useState<'prompt' | 'download' | 'reward' | 'unavailable'>('prompt');

  // Reset back to the prompt step whenever the sheet is reopened.
  React.useEffect(() => {
    if (visible) {
      setStep('prompt');
      grantingRef.current = false;
      // Kick off the rewarded-ad load the moment the sheet appears rather
      // than waiting for the actual tap — gives it a head start so the
      // ad is likely already loaded by the time handleWatchAd() runs,
      // instead of racing a cold ad.load() against LOAD_TIMEOUT_MS.
      preloadRewarded();
    }
  }, [visible]);

  const handleWatchAd = async () => {
    // Rewarded ads are a native-app feature. On web, skip straight to the
    // install prompt instead of attempting the ad (see the 'download' step
    // note above for why).
    if (Platform.OS === 'web') {
      setStep('download');
      return;
    }

    setLoadingAd(true);
    const outcome = await showRewardedForSession();
    setLoadingAd(false);

    if (outcome === 'earned') {
      setStep('reward');
    } else if (outcome === 'unavailable') {
      // Genuine load/show failure, not a user choice — give an explicit
      // "try again" state instead of silently sending them to Home.
      setStep('unavailable');
    } else {
      // 'skipped' — the ad played (or opened) and the learner backed out
      // without finishing it. That's an intentional choice, so the
      // existing dismiss-to-home behavior is correct here.
      onDismissToHome();
    }
  };

  const handleUnlockNextSession = () => {
    if (grantingRef.current) return;
    grantingRef.current = true;
    // Grant the key here, on the actual tap — not the moment the ad
    // finished. Granting it earlier let the background balance-poll (see
    // useKeys) flip isOutOfKeys to false while this screen was still
    // showing, which auto-advanced the app past the reward screen before
    // the learner could tap anything.
    void grantBonusKey(1, 'ad_reward').then(() => {
      onAdRewarded();
    });
  };

  // Modal props (transparent, animationType) are kept CONSTANT across
  // steps. Changing `transparent` on an already-mounted Android <Modal>
  // tears down and recreates the native dialog, which is what was closing
  // the reward screen on its own before the user could tap anything. The
  // 'reward' step gets its full-screen opaque look from a solid background
  // on the content itself, not from the Modal's `transparent` prop.
  return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={step === 'prompt' || step === 'download' || step === 'unavailable' ? onClose : () => {}}
      >
        {step === 'reward' ? (
          <KeyRewardContent onUnlockNextSession={handleUnlockNextSession} />
        ) : step === 'download' ? (
          <DownloadAppModal visible onClose={onClose} source="ads" />
        ) : step === 'unavailable' ? (
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
                <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                  <X size={20} color={colors.onSurfaceVariant} />
                </Pressable>

                <View style={styles.iconWrap}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(242, 39, 76, 0.14)' }]}>
                    <Tv size={32} color="#F2274C" strokeWidth={2.2} />
                  </View>
                </View>

                <Text style={[styles.title, { color: colors.onSurface }]}>Ad unavailable</Text>
                <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                  No ad could be loaded right now — check your connection and try again.
                </Text>

                <Pressable
                  onPress={() => {
                    setStep('prompt');
                    void handleWatchAd();
                  }}
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
                    <Text style={styles.watchBtnText}>TRY AGAIN</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={onDismissToHome}
                  style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.dismissBtnText, { color: colors.onSurfaceVariant }]}>Go to Home</Text>
                </Pressable>
              </View>
            </View>
          </View>
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
