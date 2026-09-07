import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { Smartphone, X, Crown, Tv, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pataskills.v2';

export interface DownloadAppModalProps {
  visible: boolean;
  onClose: () => void;
  source?: 'subscribe' | 'manage_subscription' | 'ads' | 'default';
  title?: string;
  subtitle?: string;
}

export function DownloadAppModal({
  visible,
  onClose,
  source = 'default',
  title: customTitle,
  subtitle: customSubtitle,
}: DownloadAppModalProps) {
  const { colors } = useTheme();

  let title = customTitle;
  let subtitle = customSubtitle;
  let actionText = 'GET IT ON GOOGLE PLAY';

  if (!title) {
    if (source === 'subscribe') {
      title = 'Subscribe on Mobile';
      subtitle =
        'Unlimited subscriptions are available on the mobile app. Install the mobile app to subscribe and unlock unlimited sessions.';
      actionText = 'INSTALL MOBILE APP';
    } else if (source === 'manage_subscription') {
      title = 'Manage Subscriptions';
      subtitle =
        'Install the mobile app to manage your subscriptions through Google Play.';
      actionText = 'OPEN GOOGLE PLAY';
    } else if (source === 'ads') {
      title = 'Ads Available on Mobile';
      subtitle =
        'Rewarded ads are only available on mobile. Download the app to watch ads and earn instant free sessions!';
      actionText = 'DOWNLOAD THE APP';
    } else {
      title = 'Get the Mobile App';
      subtitle =
        'For the best experience, download the PataSkills app on Google Play.';
      actionText = 'GET IT ON GOOGLE PLAY';
    }
  }

  const handleOpenStore = () => {
    Linking.openURL(PLAY_STORE_URL);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetWrapper}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainer || '#1C2029',
                borderColor: colors.surfaceContainerHigh || '#2A2E38',
              },
            ]}
          >
            {/* Close button */}
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.onSurfaceVariant} />
            </Pressable>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      source === 'ads'
                        ? 'rgba(245, 158, 11, 0.14)'
                        : 'rgba(43, 217, 100, 0.14)',
                  },
                ]}
              >
                {source === 'ads' ? (
                  <Tv size={32} color={StaticColors.achievementAmber} strokeWidth={2.2} />
                ) : source === 'subscribe' ? (
                  <Crown size={32} color={StaticColors.successLime} strokeWidth={2.2} />
                ) : (
                  <Smartphone size={32} color={StaticColors.successLime} strokeWidth={2.2} />
                )}
              </View>
            </View>

            {/* Title & Description */}
            <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {subtitle}
            </Text>

            {/* Primary Action Button */}
            <Pressable
              onPress={handleOpenStore}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor:
                    source === 'ads'
                      ? StaticColors.achievementAmber
                      : StaticColors.successLime,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: source === 'ads' ? '#000000' : '#000000' },
                ]}
              >
                {actionText}
              </Text>
              <ArrowRight size={18} color="#000000" strokeWidth={2.4} />
            </Pressable>

            {/* Dismiss Link */}
            <Pressable onPress={onClose} hitSlop={10} style={styles.dismissBtn}>
              <Text style={[styles.dismissText, { color: colors.onSurfaceVariant }]}>
                Maybe later
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.marginMobile,
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconWrap: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  primaryBtn: {
    height: 52,
    borderRadius: Radius.full,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  dismissText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textAlign: 'center',
  },
});
