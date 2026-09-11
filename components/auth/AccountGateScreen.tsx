import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserRound } from 'lucide-react-native';
import { useTheme, FontFamily, Spacing, Radius } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { getTotalXp } from '@/lib/xp';
import { getStreakData } from '@/lib/streak';
import { RestoreResult } from '@/lib/restore';

interface AccountGateScreenProps {
  /** Email this device was last logged in as, read by app/_layout.tsx
   *  before deciding to render this screen at all. */
  lastEmail: string;
  /** Called once RestoreAccountModal reports a successful login. */
  onLoggedIn: () => void;
}

/**
 * Permanent hard gate for a device that has logged in before (see
 * lib/authGate.ts) and is currently logged out (@play/user_email cleared
 * by logoutAccount()). No dismiss, no skip, no guest fallback — the only
 * way past this screen is logging back in. Rendered at the top of
 * app/_layout.tsx, above the Stack, so it blocks every route including
 * deep links, not just the '/' root gate in app/index.tsx.
 *
 * The stats shown here are read-only display material from this device's
 * local cache (logoutAccount() never wipes it — see restore.ts) — they
 * are NOT re-synced or trusted as current; login is what restores real,
 * authoritative access via restoreAccountByEmail/restoreAccountWithGoogle.
 */
export function AccountGateScreen({ lastEmail, onLoggedIn }: AccountGateScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getTotalXp().then(setTotalXp).catch(() => {});
    getStreakData()
      .then((d) => setStreak(d.currentStreak))
      .catch(() => {});
  }, []);

  const displayName = lastEmail.split('@')[0] || lastEmail;

  const handleSuccess = (_result: RestoreResult) => {
    setModalVisible(false);
    onLoggedIn();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#0B0D12',
          paddingTop: Math.max(insets.top, Spacing.xl),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
        },
      ]}
    >
      <View style={styles.middle}>
        <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainerHigh || '#2A2E38' }]}>
          <UserRound size={40} color={colors.onSurface} strokeWidth={1.6} />
        </View>

        <Text style={[styles.heading, { color: colors.onSurface }]}>
          Welcome back{'\n'}{displayName}
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceContainer || '#1C2029' }]}>
            <Text style={[styles.statValue, { color: colors.tealAccent || '#2BD9C4' }]}>{totalXp}</Text>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>TOTAL XP</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceContainer || '#1C2029' }]}>
            <Text style={[styles.statValue, { color: colors.onSurface }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>DAYS STREAK</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <Button label="Log in" onPress={() => setModalVisible(true)} />
      </View>

      <RestoreAccountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleSuccess}
        currentEmail={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  statBox: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
