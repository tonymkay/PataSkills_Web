import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { X, Clock, RefreshCw, Tv, Bell, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';

interface FreeModeInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onProceed: () => void;
}

export function FreeModeInfoModal({ visible, onClose, onProceed }: FreeModeInfoModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainer || '#1C2029',
              borderColor: colors.surfaceContainerHigh || '#2A2E38',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(43, 217, 196, 0.14)' }]}>
                <Clock size={22} color={colors.tealAccent || '#2BD9C4'} strokeWidth={2.4} />
              </View>
              <Text style={[styles.title, { color: colors.onSurface }]}>
                How Free Mode Works
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Section 1: Free Mode Reset */}
            <View style={styles.infoRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(43, 217, 100, 0.12)' }]}>
                <RefreshCw size={18} color={StaticColors.successLime} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                  3 Sessions Every Reset
                </Text>
                <Text style={[styles.infoDesc, { color: colors.onSurfaceVariant }]}>
                  You receive 3 free practice topics. When used up, a cooldown timer begins automatically.
                </Text>
              </View>
            </View>

            {/* Section 2: Reset Time */}
            <View style={styles.infoRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(43, 217, 196, 0.12)' }]}>
                <Clock size={18} color={colors.tealAccent || '#2BD9C4'} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                  Automatic Refill Timer
                </Text>
                <Text style={[styles.infoDesc, { color: colors.onSurfaceVariant }]}>
                  Your 3 keys refill as soon as the timer reaches zero. No manual restart needed.
                </Text>
              </View>
            </View>

            {/* Section 3: Ads on Free Mode */}
            <View style={styles.infoRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Tv size={18} color={StaticColors.achievementAmber} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                  Extra Sessions via Ads
                </Text>
                <Text style={[styles.infoDesc, { color: colors.onSurfaceVariant }]}>
                  Don't want to wait? You can watch a short sponsor video anytime for an instant +1 bonus session.
                </Text>
              </View>
            </View>

            {/* Section 4: Reminders */}
            <View style={styles.infoRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Bell size={18} color="#60A5FA" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                  Instant Reset Alerts
                </Text>
                <Text style={[styles.infoDesc, { color: colors.onSurfaceVariant }]}>
                  Enable notification reminders to get notified the exact minute your 3 sessions refill.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action CTA */}
          <Pressable
            onPress={onProceed}
            style={({ pressed }) => [
              styles.proceedBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.proceedBtnText}>GOT IT, CONTINUE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scroll: {
    marginVertical: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    marginBottom: 2,
  },
  infoDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  proceedBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  proceedBtnText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
