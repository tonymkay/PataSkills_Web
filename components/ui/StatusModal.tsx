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
