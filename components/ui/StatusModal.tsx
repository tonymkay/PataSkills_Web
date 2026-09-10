import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X as XIcon, MinusCircle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';

export type StatusTone = 'success' | 'error' | 'neutral';

export interface StatusModalItem {
  label: string;
  value: string;
  tone: StatusTone;
  /** Re-runs just this item's push, independently of the others — a
   *  failed item can be retried without re-triggering (or risking
   *  invalidating) items that already succeeded. Omitted for items with
   *  nothing retryable (e.g. tone: 'neutral' skip states). */
  onRetry?: () => void;
  /** True while this specific item's retry is in flight — disables the
   *  retry button and swaps its label to a busy state. */
  retrying?: boolean;
}

export interface StatusModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: StatusModalItem[];
}

function toneColor(tone: StatusTone): string {
  if (tone === 'success') return StaticColors.successLime;
  if (tone === 'error') return '#F2274C';
  return '#8A93A6';
}

function ToneIcon({ tone }: { tone: StatusTone }) {
  const color = toneColor(tone);
  if (tone === 'success') return <Check size={16} color={color} strokeWidth={2.6} />;
  if (tone === 'error') return <XIcon size={16} color={color} strokeWidth={2.6} />;
  return <MinusCircle size={16} color={color} strokeWidth={2.2} />;
}

/**
 * Themed replacement for Alert.alert() when reporting a multi-part result
 * (e.g. "Back up now" in Settings) — matches the app's dark card styling,
 * FontFamily, and StaticColors instead of the OS-native alert box.
 */
export function StatusModal({ visible, onClose, title, items }: StatusModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetWrapper}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.surfaceContainerHigh,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>

            <View style={styles.itemsList}>
              {items.map((item) => (
                <View key={item.label} style={styles.itemRow}>
                  <View style={styles.itemIconWrap}>
                    <ToneIcon tone={item.tone} />
                  </View>
                  <Text style={[styles.itemLabel, { color: colors.onSurface }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.itemValue, { color: toneColor(item.tone) }]} numberOfLines={1}>
                    {item.value}
                  </Text>
                  {item.tone === 'error' && item.onRetry ? (
                    <Pressable
                      onPress={item.onRetry}
                      disabled={item.retrying}
                      hitSlop={8}
                      style={styles.retryBtn}
                    >
                      <Text style={[styles.retryBtnText, { color: colors.onSurface }]}>
                        {item.retrying ? '…' : 'Retry'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.okBtn,
                { backgroundColor: StaticColors.successLime },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={styles.okBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  destructive?: boolean;
}

/**
 * Themed replacement for Alert.alert() when confirming a single action
 * (delete account, logout, checkout error, etc). Companion to StatusModal
 * above — that one reports a multi-item result, this one asks a question.
 */
export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  destructive,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  const primaryColor = destructive ? '#F2274C' : StaticColors.successLime;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetWrapper}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.surfaceContainerHigh,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.onSurfaceVariant ?? colors.onSurface }]}>
              {message}
            </Text>

            <Pressable
              onPress={onPrimary}
              style={({ pressed }) => [
                styles.okBtn,
                { backgroundColor: primaryColor },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.okBtnText, destructive && { color: '#FFFFFF' }]}>
                {primaryLabel}
              </Text>
            </Pressable>

            {secondaryLabel ? (
              <Pressable
                onPress={onSecondary ?? onClose}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: colors.surfaceContainerHigh },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.onSurface }]}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : null}
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  message: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemsList: {
    gap: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemIconWrap: {
    width: 20,
    alignItems: 'center',
  },
  itemLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  itemValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '45%',
    textAlign: 'right',
  },
  retryBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  okBtn: {
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  okBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    letterSpacing: 0.5,
    color: '#000000',
  },
});
