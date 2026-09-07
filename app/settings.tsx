import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Mail,
  Bell,
  DollarSign,
  HelpCircle,
  Info,
  Shield,
  FileText,
  LogOut,
} from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, IconSize, StaticColors } from '@/theme/tokens';
import { FontFamily } from '@/constants/typography';
import { SectionHeader, SettingsRow, SettingsToggleRow } from '@/components/settings/SettingsComponents';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { getStoredEmail, truncateEmailMiddle } from '@/lib/email';
import type { CurrencyCode } from '@/lib/currency';

const CURRENCY_STORAGE_KEY = '@play/currency';

/**
 * Settings screen — reached via the gear icon in AppHeader (all tabs).
 * Minimal, showing only what `play` actually supports today. Grouped by
 * section: Account, Preferences, Support, Legal, Account actions.
 *
 * The "Existing user, login" flow that used to live on the Landing / out-
 * of-keys screen is now accessible here (Account section) once tabs are
 * unlocked — see the tabbed-home plan §4/§5/§9 for the rationale.
 */
export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);

  useEffect(() => {
    getStoredEmail().then(setEmail).catch(() => {});
    AsyncStorage.getItem('@play/timer_reminders')
      .then((val) => setNotificationsEnabled(val === 'true'))
      .catch(() => {});
    AsyncStorage.getItem(CURRENCY_STORAGE_KEY)
      .then((val) => {
        if (val === 'KES' || val === 'USD') setCurrency(val);
      })
      .catch(() => {});
  }, []);

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem('@play/timer_reminders', val ? 'true' : 'false').catch(() => {});
  };

  const handleToggleCurrency = () => {
    const next: CurrencyCode = currency === 'USD' ? 'KES' : 'USD';
    setCurrency(next);
    AsyncStorage.setItem(CURRENCY_STORAGE_KEY, next).catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@play/user_email');
      setEmail(null);
    } catch {}
  };

  const iconColor = colors.onSurfaceVariant;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ─── Back header ─── */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Settings</Text>
        {/* Spacer to center the title */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <SettingsRow
          icon={<Mail size={IconSize.inline} color={iconColor} />}
          label={email ? truncateEmailMiddle(email) : 'Sign in / Restore account'}
          onPress={() => setRestoreModalVisible(true)}
        />

        {/* ── Preferences ── */}
        <SectionHeader title="Preferences" />
        <SettingsToggleRow
          icon={<Bell size={IconSize.inline} color={iconColor} />}
          label="Notifications"
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          activeColor={StaticColors.tealAccent}
        />
        <SettingsRow
          icon={<DollarSign size={IconSize.inline} color={iconColor} />}
          label="Currency"
          value={currency}
          onPress={handleToggleCurrency}
        />

        {/* ── Support ── */}
        <SectionHeader title="Support" />
        <SettingsRow
          icon={<HelpCircle size={IconSize.inline} color={iconColor} />}
          label="Help"
          onPress={() => Linking.openURL('mailto:support@pataskills.com')}
        />
        <SettingsRow
          icon={<Info size={IconSize.inline} color={iconColor} />}
          label="About"
          value="v1.0.0"
        />

        {/* ── Legal ── */}
        <SectionHeader title="Legal" />
        <SettingsRow
          icon={<Shield size={IconSize.inline} color={iconColor} />}
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://pataskills.com/privacy')}
        />
        <SettingsRow
          icon={<FileText size={IconSize.inline} color={iconColor} />}
          label="Terms of Service"
          onPress={() => Linking.openURL('https://pataskills.com/terms')}
        />

        {/* ── Account actions ── */}
        {email && (
          <>
            <SectionHeader title="Account Actions" />
            <SettingsRow
              icon={<LogOut size={IconSize.inline} color="#F2274C" />}
              label="Log out"
              onPress={handleLogout}
              danger
            />
          </>
        )}
      </ScrollView>

      {/* Restore/login modal — same one LandingScreen & SessionStateScreen use */}
      <RestoreAccountModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        onSuccess={(result) => {
          setEmail(result.email);
          setRestoreModalVisible(false);
        }}
        currentEmail={email}
        onLoggedOut={() => setEmail(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
  },
});
