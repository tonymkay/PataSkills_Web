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
  Moon,
  Crown,
  Trash2,
  UploadCloud,
} from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, IconSize, StaticColors } from '@/theme/tokens';
import { FontFamily } from '@/constants/typography';
import { SectionHeader, SettingsRow, SettingsToggleRow } from '@/components/settings/SettingsComponents';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { getStoredEmail, truncateEmailMiddle } from '@/lib/email';
import { logoutAccount } from '@/lib/restore';
import { deleteAccount } from '@/lib/account';
import { ensureNotificationPermission, scheduleResetReminder, cancelResetReminder } from '@/lib/notifications';
import { getKeysState } from '@/lib/keys';
import { useKeys } from '@/hooks/useKeys';
import { runManualBackup, retryBackupCategory, type BackupCategory, type BackupResult } from '@/lib/backup';
import { StatusModal, ConfirmModal, type StatusModalItem } from '@/components/ui/StatusModal';
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
  const { colors, scheme, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium, refresh: refreshKeys } = useKeys();

  const [email, setEmail] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [retryingCategory, setRetryingCategory] = useState<BackupCategory | null>(null);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

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
    if (val) {
      const granted = await ensureNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        await AsyncStorage.setItem('@play/timer_reminders', 'true').catch(() => {});
        const ks = await getKeysState();
        if (ks.resetAt) {
          scheduleResetReminder(ks.resetAt);
        }
      } else {
        setNotificationsEnabled(false);
        await AsyncStorage.setItem('@play/timer_reminders', 'false').catch(() => {});
      }
    } else {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem('@play/timer_reminders', 'false').catch(() => {});
      cancelResetReminder();
    }
  };

  const handleToggleCurrency = () => {
    const next: CurrencyCode = currency === 'USD' ? 'KES' : 'USD';
    setCurrency(next);
    AsyncStorage.setItem(CURRENCY_STORAGE_KEY, next).catch(() => {});
  };

  const handleBackupNow = async () => {
    if (backingUp) return;
    setBackingUp(true);
    try {
      const result = await runManualBackup();
      setBackupResult(result);
      setStatusModalVisible(true);
    } catch {
      // Whole run couldn't even start (e.g. no connection at all) — no
      // per-category result to show, so fall back to a single server row
      // with nothing retryable per-item (retrying the whole thing is just
      // "Back up now" again).
      setBackupResult(null);
      setStatusModalVisible(true);
    } finally {
      setBackingUp(false);
    }
  };

  // Re-runs exactly one category's push (StatusModal's per-item Retry) and
  // merges only that category's fields back into backupResult — the other
  // categories' already-shown success/failure state is untouched.
  const handleRetryCategory = async (category: BackupCategory) => {
    if (retryingCategory) return;
    setRetryingCategory(category);
    try {
      const partial = await retryBackupCategory(category);
      setBackupResult((prev) => (prev ? { ...prev, ...partial } : (partial as BackupResult)));
    } catch {
      // Leave backupResult as-is on failure — the item's tone stays
      // 'error' from whatever value it already had, still retryable.
    } finally {
      setRetryingCategory(null);
    }
  };

  const buildStatusItems = (result: BackupResult | null): StatusModalItem[] => {
    if (!result) {
      return [{ label: 'Server', value: 'Could not reach the server', tone: 'error' }];
    }
    return [
      {
        label: 'Mistakes',
        value: `${result.mistakesPushed}/${result.mistakesTotal} pushed`,
        tone: result.mistakesTotal === 0 || result.mistakesPushed === result.mistakesTotal ? 'success' : 'error',
        onRetry: () => handleRetryCategory('mistakes'),
        retrying: retryingCategory === 'mistakes',
      },
      {
        label: 'Progress',
        value: `${result.progressSkillsPushed}/${result.progressSkillsFound} skills`,
        tone:
          result.progressSkillsFound === 0 || result.progressSkillsPushed === result.progressSkillsFound
            ? 'success'
            : 'error',
        onRetry: () => handleRetryCategory('progress'),
        retrying: retryingCategory === 'progress',
      },
      {
        label: 'XP',
        value: result.xpSynced ? 'Synced' : 'Failed',
        tone: result.xpSynced ? 'success' : 'error',
        onRetry: () => handleRetryCategory('xp'),
        retrying: retryingCategory === 'xp',
      },
      {
        label: 'Streak',
        value:
          result.streakStatus === 'synced'
            ? 'Synced'
            : result.streakStatus === 'no_activity'
              ? 'No activity yet'
              : 'Failed',
        tone:
          result.streakStatus === 'synced' ? 'success' : result.streakStatus === 'no_activity' ? 'neutral' : 'error',
        onRetry: () => handleRetryCategory('streak'),
        retrying: retryingCategory === 'streak',
      },
      {
        label: 'Keys',
        value: result.keysSynced ? 'Synced' : result.hasEmail ? 'Failed' : 'Skipped (no account linked)',
        tone: result.keysSynced ? 'success' : result.hasEmail ? 'error' : 'neutral',
        onRetry: () => handleRetryCategory('keys'),
        retrying: retryingCategory === 'keys',
      },
    ];
  };

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirmVisible(false);
    try {
      await logoutAccount();
    } catch {}
    setEmail(null);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteConfirmVisible(false);
    await deleteAccount();
    setEmail(null);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
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
        <SettingsRow
          icon={<Crown size={IconSize.inline} color={iconColor} />}
          label="Manage Subscriptions"
          value={isPremium ? 'Premium' : 'Free'}
          onPress={() => router.push('/manage-subscription')}
        />

        {/* ── Preferences ── */}
        <SectionHeader title="Preferences" />
        <SettingsToggleRow
          icon={<Moon size={IconSize.inline} color={iconColor} />}
          label="Dark theme"
          value={scheme === 'dark'}
          onValueChange={(v) => setMode(v ? 'dark' : 'light')}
          activeColor={StaticColors.tealAccent}
        />
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

        {/* ── Data ── */}
        <SectionHeader title="Data" />
        <SettingsRow
          icon={<UploadCloud size={IconSize.inline} color={iconColor} />}
          label="Back up now"
          value={backingUp ? 'Syncing…' : undefined}
          onPress={handleBackupNow}
        />

        {/* ── Support ── */}
        <SectionHeader title="Support" />
        <SettingsRow
          icon={<HelpCircle size={IconSize.inline} color={iconColor} />}
          label="Help"
          onPress={() => Linking.openURL('https://pataskills.com')}
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
        <SectionHeader title="Account Actions" />
        {email && (
          <SettingsRow
            icon={<LogOut size={IconSize.inline} color="#F2274C" />}
            label="Log out"
            onPress={handleLogout}
            danger
          />
        )}
        <SettingsRow
          icon={<Trash2 size={IconSize.inline} color="#F2274C" />}
          label="Delete account"
          onPress={handleDeleteAccount}
          danger
        />
      </ScrollView>

      {/* Restore/login modal — same one LandingScreen & SessionStateScreen use */}
      <RestoreAccountModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        onSuccess={(result) => {
          setEmail(result.email);
          setRestoreModalVisible(false);
          // restoreAccountByEmail already wrote the restored balance/premium
          // flag to AsyncStorage — this screen's useKeys() instance was
          // mounted before that happened, so its own state (the "Premium"/
          // "Free" value above) is stale until told to re-read it.
          void refreshKeys();
        }}
        currentEmail={email}
        onLoggedOut={() => setEmail(null)}
      />

      <StatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        title={backupResult ? 'Backup complete' : 'Backup failed'}
        items={buildStatusItems(backupResult)}
      />

      <ConfirmModal
        visible={logoutConfirmVisible}
        onClose={() => setLogoutConfirmVisible(false)}
        title="Log out?"
        message="You can log back in any time with the same email — your progress stays saved to your account."
        primaryLabel="Log out"
        onPrimary={confirmLogout}
        secondaryLabel="Cancel"
        onSecondary={() => setLogoutConfirmVisible(false)}
        destructive
      />

      <ConfirmModal
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title="Delete account?"
        message="This permanently deletes your account. Your data is removed from this device now and fully erased from our servers after 90 days. This cannot be undone."
        primaryLabel="Delete"
        onPrimary={confirmDeleteAccount}
        secondaryLabel="Cancel"
        onSecondary={() => setDeleteConfirmVisible(false)}
        destructive
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
